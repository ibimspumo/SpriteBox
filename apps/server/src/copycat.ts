// apps/server/src/copycat.ts

/**
 * CopyCat Game Logic
 *
 * Handles the CopyCat game mode specifics:
 * - Loading reference images from gallery
 * - Comparing player drawings to reference
 * - Calculating accuracy scores
 * - Determining winners
 */

import crypto from 'node:crypto';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import type {
  Instance,
  CopyCatState,
  CopyCatPlayerResult,
  CopyCatResultEntry,
  User,
} from './types.js';
import { log } from './utils.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Reference image gallery
interface CopyCatImage {
  id: string;
  name: string;
  pixels: string;
}

interface CopyCatGallery {
  images: CopyCatImage[];
  version: number;
  description: string;
}

let gallery: CopyCatGallery | null = null;

/**
 * Load the CopyCat image gallery from JSON file
 */
export function loadCopyCatGallery(): CopyCatGallery {
  if (gallery) {
    return gallery;
  }

  try {
    const galleryPath = join(__dirname, '../data/copycat_images.json');
    const data = readFileSync(galleryPath, 'utf-8');
    gallery = JSON.parse(data) as CopyCatGallery;
    log('CopyCat', `Loaded ${gallery.images.length} reference images`);
    return gallery;
  } catch (error) {
    log('CopyCat', `Failed to load gallery: ${error}`);
    // Return empty gallery as fallback
    gallery = {
      images: [],
      version: 1,
      description: 'Empty gallery (failed to load)',
    };
    return gallery;
  }
}

/**
 * Get a random reference image from the gallery
 */
export function getRandomReferenceImage(): CopyCatImage {
  const g = loadCopyCatGallery();

  if (g.images.length === 0) {
    // Return a simple pattern if no images available
    return {
      id: 'fallback',
      name: 'Fallback Pattern',
      pixels: '1111111111111111111111111111111111111111111111111111111111111111',
    };
  }

  const index = crypto.randomInt(0, g.images.length);
  return g.images[index];
}

/**
 * Initialize CopyCat state for an instance
 */
export function initializeCopyCatState(instance: Instance): void {
  const refImage = getRandomReferenceImage();

  instance.copyCat = {
    referenceImage: refImage.pixels,
    referenceImageId: refImage.id,
    playerResults: new Map(),
    drawStartTime: undefined,
    rematchVotes: new Map(),
  };

  log('CopyCat', `Initialized state for instance ${instance.id}, image: ${refImage.id}`);
}

/**
 * Re-initialize CopyCat state for a rematch (keeps players, new image)
 */
export function reinitializeCopyCatStateForRematch(instance: Instance): void {
  const refImage = getRandomReferenceImage();

  instance.copyCat = {
    referenceImage: refImage.pixels,
    referenceImageId: refImage.id,
    playerResults: new Map(),
    drawStartTime: undefined,
    rematchVotes: new Map(),
  };

  log('CopyCat', `Re-initialized for rematch: ${instance.id}, new image: ${refImage.id}`);
}

/**
 * Record a rematch vote from a player
 */
export function recordRematchVote(
  instance: Instance,
  playerId: string,
  wantsRematch: boolean
): { allVoted: boolean; bothWantRematch: boolean } {
  if (!instance.copyCat) {
    return { allVoted: false, bothWantRematch: false };
  }

  // Prevent double voting - first vote counts
  if (instance.copyCat.rematchVotes.has(playerId)) {
    const allVoted = instance.copyCat.rematchVotes.size >= instance.players.size;
    const bothWantRematch = allVoted && Array.from(instance.copyCat.rematchVotes.values()).every(v => v);
    return { allVoted, bothWantRematch };
  }

  instance.copyCat.rematchVotes.set(playerId, wantsRematch);
  log('CopyCat', `Player ${playerId} voted for rematch: ${wantsRematch}`);

  const playerCount = instance.players.size;
  const voteCount = instance.copyCat.rematchVotes.size;
  const allVoted = voteCount >= playerCount;

  // Check if both want rematch
  let bothWantRematch = false;
  if (allVoted) {
    bothWantRematch = Array.from(instance.copyCat.rematchVotes.values()).every(v => v);
  }

  return { allVoted, bothWantRematch };
}

/**
 * Get rematch votes for broadcasting
 */
export function getRematchVotes(instance: Instance): { playerId: string; wantsRematch: boolean }[] {
  if (!instance.copyCat) return [];

  return Array.from(instance.copyCat.rematchVotes.entries()).map(([playerId, wantsRematch]) => ({
    playerId,
    wantsRematch,
  }));
}

/**
 * Calculate accuracy between player drawing and reference image
 */
export function calculateAccuracy(playerPixels: string, referencePixels: string): {
  accuracy: number;
  matchingPixels: number;
  totalPixels: number;
} {
  const totalPixels = 64; // 8x8 grid

  // Normalize to same length (should both be 64)
  const player = playerPixels.toUpperCase().padEnd(64, '1');
  const reference = referencePixels.toUpperCase().padEnd(64, '1');

  let matchingPixels = 0;
  for (let i = 0; i < totalPixels; i++) {
    if (player[i] === reference[i]) {
      matchingPixels++;
    }
  }

  const accuracy = Math.round((matchingPixels / totalPixels) * 100);

  return {
    accuracy,
    matchingPixels,
    totalPixels,
  };
}

/**
 * Record a player's submission in CopyCat mode
 */
export function recordCopyCatSubmission(
  instance: Instance,
  playerId: string,
  pixels: string
): CopyCatPlayerResult | null {
  if (!instance.copyCat) {
    log('CopyCat', `No CopyCat state for instance ${instance.id}`);
    return null;
  }

  const { accuracy, matchingPixels, totalPixels } = calculateAccuracy(
    pixels,
    instance.copyCat.referenceImage
  );

  const result: CopyCatPlayerResult = {
    playerId,
    pixels,
    accuracy,
    matchingPixels,
    totalPixels,
    submitTime: Date.now(),
  };

  instance.copyCat.playerResults.set(playerId, result);
  log('CopyCat', `Player ${playerId} submitted: ${accuracy}% accuracy`);

  return result;
}

/**
 * Get CopyCat results for an instance
 */
export function getCopyCatResults(instance: Instance): {
  results: CopyCatResultEntry[];
  winner: CopyCatResultEntry | null;
  isDraw: boolean;
} {
  if (!instance.copyCat) {
    return { results: [], winner: null, isDraw: false };
  }

  const entries: CopyCatResultEntry[] = [];

  for (const [playerId, result] of instance.copyCat.playerResults) {
    const player = instance.players.get(playerId);
    if (!player) continue;

    entries.push({
      playerId,
      user: player.user,
      pixels: result.pixels,
      accuracy: result.accuracy,
      matchingPixels: result.matchingPixels,
      submitTime: result.submitTime,
    });
  }

  // Sort by accuracy (highest first), then by submit time (earliest first for tie-breaking)
  entries.sort((a, b) => {
    if (b.accuracy !== a.accuracy) {
      return b.accuracy - a.accuracy;
    }
    return a.submitTime - b.submitTime; // Earlier submission wins tie
  });

  // Determine winner
  if (entries.length < 2) {
    return { results: entries, winner: entries[0] || null, isDraw: false };
  }

  const first = entries[0];
  const second = entries[1];

  // Check for draw (same accuracy)
  const isDraw = first.accuracy === second.accuracy;

  return {
    results: entries,
    winner: isDraw ? null : first,
    isDraw,
  };
}

/**
 * Check if both players have submitted in CopyCat mode
 */
export function allCopyCatSubmissionsIn(instance: Instance): boolean {
  if (!instance.copyCat) return false;

  const playerCount = instance.players.size;
  const submissionCount = instance.copyCat.playerResults.size;

  return submissionCount >= playerCount;
}

/**
 * Get reference image for client display
 */
export function getReferenceImage(instance: Instance): string | null {
  return instance.copyCat?.referenceImage ?? null;
}

/**
 * Clean up CopyCat state after game ends
 */
export function cleanupCopyCatState(instance: Instance): void {
  instance.copyCat = undefined;
}

/**
 * Get all images from the gallery (for dev tools)
 */
export function getAllGalleryImages(): CopyCatImage[] {
  const g = loadCopyCatGallery();
  return g.images;
}

/**
 * Add a new image to the gallery (for dev tools - in-memory only)
 */
export function addGalleryImage(image: CopyCatImage): void {
  const g = loadCopyCatGallery();
  g.images.push(image);
  log('CopyCat', `Added image to gallery: ${image.id}`);
}
