// apps/server/src/copycatRoyale.ts

/**
 * CopyCat Royale Game Logic
 *
 * Handles the CopyCat Royale battle royale mode:
 * - Elimination bracket calculation
 * - Image pool management
 * - Accuracy calculation
 * - Round results and eliminations
 * - Winner determination
 */

import crypto from 'node:crypto';
import type {
  Instance,
  CopyCatRoyaleState,
  RoyalePoolImage,
  EliminationBracket,
  RoyalePlayerStatus,
  RoyalePlayerSubmission,
  RoyaleRoundResult,
  RoyalePlayerRoundResult,
  RoyaleFinalRanking,
  User,
} from './types.js';
import { log } from './utils.js';

// Constants
const MIN_PIXELS_FOR_VALID_SUBMISSION = 5;
const TOTAL_PIXELS = 64; // 8x8 grid

/**
 * Initialize CopyCat Royale state for an instance
 */
export function initializeCopyCatRoyaleState(instance: Instance): void {
  const playerCount = instance.players.size;
  const bracket = calculateEliminationBracket(playerCount);

  instance.copyCatRoyale = {
    imagePool: [],
    usedImageIds: new Set(),
    currentReferenceImage: null,
    eliminationBracket: bracket,
    currentRound: 0, // 0 = initial drawing round
    roundResults: new Map(),
    playerStatus: new Map(),
    isFinale: false,
    drawStartTime: undefined,
  };

  // Initialize player status for all players
  for (const [playerId] of instance.players) {
    instance.copyCatRoyale.playerStatus.set(playerId, {
      isEliminated: false,
      eliminatedInRound: null,
      totalAccuracy: 0,
      roundsPlayed: 0,
      submissions: new Map(),
    });
  }

  log('CopyCatRoyale', `Initialized state for instance ${instance.id} with ${playerCount} players, ${bracket.length} rounds planned`);
}

/**
 * Calculate the elimination bracket based on player count
 * Goal: Reduce to 3 players, then 2, then 1 (winner)
 * Max 10 total rounds, with approximately 40-50% elimination per round
 */
export function calculateEliminationBracket(playerCount: number): EliminationBracket[] {
  const brackets: EliminationBracket[] = [];
  const targetBeforeFinale = 3;
  const maxRoundsBeforeFinale = 8;

  // Calculate how many rounds we need before finale
  let bestRounds = 1;
  for (let r = 1; r <= maxRoundsBeforeFinale; r++) {
    const endPlayers = Math.ceil(playerCount * Math.pow(0.5, r));
    if (endPlayers <= targetBeforeFinale) {
      bestRounds = r;
      break;
    }
  }

  // Distribute eliminations across rounds
  let currentPlayers = playerCount;
  for (let round = 1; round <= bestRounds; round++) {
    const isLastRoundBeforeFinale = round === bestRounds;

    let targetEnd: number;
    if (isLastRoundBeforeFinale) {
      targetEnd = 3; // Must end at 3
    } else {
      // Approximately 45% elimination per round
      const eliminationRate = 0.45;
      targetEnd = Math.max(3, Math.ceil(currentPlayers * (1 - eliminationRate)));
    }

    brackets.push({
      round,
      playersStart: currentPlayers,
      playersEnd: targetEnd,
      eliminateCount: currentPlayers - targetEnd,
    });

    currentPlayers = targetEnd;
  }

  // Add finale rounds (3 → 2 → 1)
  const finaleRound1 = brackets.length + 1;
  brackets.push({
    round: finaleRound1,
    playersStart: 3,
    playersEnd: 2,
    eliminateCount: 1,
  });

  brackets.push({
    round: finaleRound1 + 1,
    playersStart: 2,
    playersEnd: 1,
    eliminateCount: 1,
  });

  return brackets;
}

/**
 * Add an image to the pool (from initial drawing phase)
 */
export function addToImagePool(
  instance: Instance,
  playerId: string,
  pixels: string,
  creatorName: string
): void {
  if (!instance.copyCatRoyale) return;

  const imageId = `${playerId}_${Date.now()}`;
  const poolImage: RoyalePoolImage = {
    id: imageId,
    pixels,
    creatorId: playerId,
    creatorName,
  };

  instance.copyCatRoyale.imagePool.push(poolImage);
  log('CopyCatRoyale', `Added image to pool from ${creatorName}, pool size: ${instance.copyCatRoyale.imagePool.length}`);
}

/**
 * Get a random unused image from the pool
 */
export function getRandomPoolImage(instance: Instance): RoyalePoolImage | null {
  if (!instance.copyCatRoyale) return null;

  const { imagePool, usedImageIds } = instance.copyCatRoyale;
  const unused = imagePool.filter((img) => !usedImageIds.has(img.id));

  if (unused.length === 0) {
    // If all images used, reset (shouldn't happen normally)
    instance.copyCatRoyale.usedImageIds.clear();
    if (imagePool.length === 0) return null;
    const index = crypto.randomInt(0, imagePool.length);
    const selected = imagePool[index];
    instance.copyCatRoyale.usedImageIds.add(selected.id);
    instance.copyCatRoyale.currentReferenceImage = selected;
    return selected;
  }

  const index = crypto.randomInt(0, unused.length);
  const selected = unused[index];
  instance.copyCatRoyale.usedImageIds.add(selected.id);
  instance.copyCatRoyale.currentReferenceImage = selected;

  log('CopyCatRoyale', `Selected reference image from ${selected.creatorName}`);
  return selected;
}

/**
 * Calculate accuracy between two pixel strings
 */
export function calculateAccuracy(
  playerPixels: string,
  referencePixels: string
): { accuracy: number; matchingPixels: number } {
  const player = playerPixels.toUpperCase().padEnd(TOTAL_PIXELS, '1');
  const reference = referencePixels.toUpperCase().padEnd(TOTAL_PIXELS, '1');

  let matchingPixels = 0;
  for (let i = 0; i < TOTAL_PIXELS; i++) {
    if (player[i] === reference[i]) {
      matchingPixels++;
    }
  }

  const accuracy = Math.round((matchingPixels / TOTAL_PIXELS) * 100);
  return { accuracy, matchingPixels };
}

/**
 * Count non-background pixels in a drawing
 */
export function countNonBackgroundPixels(pixels: string, backgroundColor = '1'): number {
  let count = 0;
  const normalized = pixels.toUpperCase();
  for (let i = 0; i < normalized.length && i < TOTAL_PIXELS; i++) {
    if (normalized[i] !== backgroundColor.toUpperCase()) {
      count++;
    }
  }
  return count;
}

/**
 * Check if a submission is valid (has minimum pixels)
 */
export function isValidSubmission(pixels: string): boolean {
  const nonBgPixels = countNonBackgroundPixels(pixels);
  return nonBgPixels >= MIN_PIXELS_FOR_VALID_SUBMISSION;
}

/**
 * Record a player's submission for the current round
 */
export function recordRoyaleSubmission(
  instance: Instance,
  playerId: string,
  pixels: string
): RoyalePlayerSubmission | null {
  if (!instance.copyCatRoyale) return null;

  const { currentRound, playerStatus, currentReferenceImage } = instance.copyCatRoyale;
  const status = playerStatus.get(playerId);

  if (!status || status.isEliminated) {
    log('CopyCatRoyale', `Player ${playerId} cannot submit - eliminated or not found`);
    return null;
  }

  // Check if already submitted for this round
  if (status.submissions.has(currentRound)) {
    log('CopyCatRoyale', `Player ${playerId} already submitted for round ${currentRound}`);
    return null;
  }

  // For initial drawing (round 0), just record without accuracy
  if (currentRound === 0) {
    const submission: RoyalePlayerSubmission = {
      pixels,
      accuracy: 0,
      matchingPixels: 0,
      submitTime: Date.now(),
    };
    status.submissions.set(currentRound, submission);
    return submission;
  }

  // For copy rounds, calculate accuracy
  if (!currentReferenceImage) {
    log('CopyCatRoyale', 'No reference image for accuracy calculation');
    return null;
  }

  // Check minimum pixels
  if (!isValidSubmission(pixels)) {
    // Submission with 0% accuracy for not meeting minimum
    const submission: RoyalePlayerSubmission = {
      pixels,
      accuracy: 0,
      matchingPixels: 0,
      submitTime: Date.now(),
    };
    status.submissions.set(currentRound, submission);
    status.roundsPlayed++;
    log('CopyCatRoyale', `Player ${playerId} submitted with insufficient pixels - 0% accuracy`);
    return submission;
  }

  const { accuracy, matchingPixels } = calculateAccuracy(pixels, currentReferenceImage.pixels);

  const submission: RoyalePlayerSubmission = {
    pixels,
    accuracy,
    matchingPixels,
    submitTime: Date.now(),
  };

  status.submissions.set(currentRound, submission);
  status.totalAccuracy += accuracy;
  status.roundsPlayed++;

  log('CopyCatRoyale', `Player ${playerId} submitted round ${currentRound}: ${accuracy}% accuracy`);
  return submission;
}

/**
 * Get the count of active (non-eliminated) players
 */
export function getActivePlayerCount(instance: Instance): number {
  if (!instance.copyCatRoyale) return 0;

  let count = 0;
  for (const status of instance.copyCatRoyale.playerStatus.values()) {
    if (!status.isEliminated) {
      count++;
    }
  }
  return count;
}

/**
 * Get the current round's bracket info
 */
export function getCurrentBracket(instance: Instance): EliminationBracket | null {
  if (!instance.copyCatRoyale) return null;

  const { currentRound, eliminationBracket } = instance.copyCatRoyale;
  // Round 0 is initial drawing, bracket rounds start at 1
  const bracketIndex = currentRound - 1;

  if (bracketIndex < 0 || bracketIndex >= eliminationBracket.length) {
    return null;
  }

  return eliminationBracket[bracketIndex];
}

/**
 * Calculate round results and determine eliminations
 */
export function calculateRoundResults(instance: Instance): RoyaleRoundResult | null {
  if (!instance.copyCatRoyale) return null;

  const { currentRound, playerStatus, currentReferenceImage } = instance.copyCatRoyale;

  if (!currentReferenceImage) {
    log('CopyCatRoyale', 'Cannot calculate results - no reference image');
    return null;
  }

  const bracket = getCurrentBracket(instance);
  if (!bracket) {
    log('CopyCatRoyale', 'Cannot calculate results - no bracket for current round');
    return null;
  }

  // Gather results for active players
  const results: RoyalePlayerRoundResult[] = [];

  for (const [playerId, status] of playerStatus) {
    if (status.isEliminated) continue;

    const player = instance.players.get(playerId) || instance.spectators.get(playerId);
    if (!player) continue;

    const submission = status.submissions.get(currentRound);

    // Players who didn't submit get 0% accuracy
    const accuracy = submission?.accuracy ?? 0;
    const matchingPixels = submission?.matchingPixels ?? 0;
    const pixels = submission?.pixels ?? '';
    const submitTime = submission?.submitTime ?? Date.now();

    results.push({
      playerId,
      user: player.user,
      pixels,
      accuracy,
      matchingPixels,
      submitTime,
      wasEliminated: false, // Will be set below
    });
  }

  // Sort by accuracy (highest first), then by submit time (earlier is better for ties)
  results.sort((a, b) => {
    if (b.accuracy !== a.accuracy) {
      return b.accuracy - a.accuracy;
    }
    return a.submitTime - b.submitTime;
  });

  // Determine who gets eliminated
  const eliminateCount = Math.min(bracket.eliminateCount, results.length - 1);
  const eliminatedIds: string[] = [];

  // Eliminate from the bottom
  for (let i = results.length - 1; i >= results.length - eliminateCount; i--) {
    if (i >= 0) {
      results[i].wasEliminated = true;
      results[i].finalRank = results.length - eliminatedIds.length;
      eliminatedIds.push(results[i].playerId);
    }
  }

  // Update player status for eliminated players
  const totalPlayers = instance.copyCatRoyale.playerStatus.size;
  for (const playerId of eliminatedIds) {
    const status = playerStatus.get(playerId);
    if (status) {
      status.isEliminated = true;
      status.eliminatedInRound = currentRound;
    }
  }

  // Calculate elimination threshold (accuracy of the last surviving player)
  const survivingCount = results.length - eliminateCount;
  const threshold = survivingCount > 0 ? results[survivingCount - 1]?.accuracy ?? 0 : 0;

  const roundResult: RoyaleRoundResult = {
    round: currentRound,
    referenceImage: currentReferenceImage,
    results,
    eliminated: eliminatedIds,
  };

  instance.copyCatRoyale.roundResults.set(currentRound, roundResult);

  log('CopyCatRoyale', `Round ${currentRound} results: ${results.length} players, ${eliminatedIds.length} eliminated`);

  return roundResult;
}

/**
 * Check if the game is over (only 1 player remaining)
 */
export function isGameOver(instance: Instance): boolean {
  const activeCount = getActivePlayerCount(instance);
  return activeCount <= 1;
}

/**
 * Check if we're in finale (3 or fewer players)
 */
export function isInFinale(instance: Instance): boolean {
  const activeCount = getActivePlayerCount(instance);
  return activeCount <= 3;
}

/**
 * Get the winner (if game is over)
 */
export function getWinner(instance: Instance): { playerId: string; user: User } | null {
  if (!instance.copyCatRoyale) return null;

  for (const [playerId, status] of instance.copyCatRoyale.playerStatus) {
    if (!status.isEliminated) {
      const player = instance.players.get(playerId) || instance.spectators.get(playerId);
      if (player) {
        return { playerId, user: player.user };
      }
    }
  }

  return null;
}

/**
 * Get all surviving player IDs
 */
export function getSurvivingPlayerIds(instance: Instance): string[] {
  if (!instance.copyCatRoyale) return [];

  const surviving: string[] = [];
  for (const [playerId, status] of instance.copyCatRoyale.playerStatus) {
    if (!status.isEliminated) {
      surviving.push(playerId);
    }
  }
  return surviving;
}

/**
 * Get final rankings for all players
 */
export function getFinalRankings(instance: Instance): RoyaleFinalRanking[] {
  if (!instance.copyCatRoyale) return [];

  const rankings: RoyaleFinalRanking[] = [];
  const { playerStatus } = instance.copyCatRoyale;

  for (const [playerId, status] of playerStatus) {
    const player = instance.players.get(playerId) || instance.spectators.get(playerId);
    if (!player) continue;

    const avgAccuracy = status.roundsPlayed > 0 ? status.totalAccuracy / status.roundsPlayed : 0;

    rankings.push({
      playerId,
      user: player.user,
      finalRank: 0, // Will be calculated below
      eliminatedInRound: status.eliminatedInRound,
      averageAccuracy: Math.round(avgAccuracy * 100) / 100,
      totalRoundsPlayed: status.roundsPlayed,
    });
  }

  // Sort: non-eliminated first (winner), then by elimination round (later = better)
  rankings.sort((a, b) => {
    // Winner (not eliminated) comes first
    if (a.eliminatedInRound === null && b.eliminatedInRound !== null) return -1;
    if (a.eliminatedInRound !== null && b.eliminatedInRound === null) return 1;

    // Both eliminated: later round = better rank
    if (a.eliminatedInRound !== null && b.eliminatedInRound !== null) {
      return b.eliminatedInRound - a.eliminatedInRound;
    }

    // Both not eliminated (shouldn't happen, but fallback to accuracy)
    return b.averageAccuracy - a.averageAccuracy;
  });

  // Assign final ranks
  rankings.forEach((r, index) => {
    r.finalRank = index + 1;
  });

  return rankings;
}

/**
 * Advance to the next round
 */
export function advanceRound(instance: Instance): void {
  if (!instance.copyCatRoyale) return;

  instance.copyCatRoyale.currentRound++;
  instance.copyCatRoyale.currentReferenceImage = null;
  instance.copyCatRoyale.isFinale = isInFinale(instance);

  log('CopyCatRoyale', `Advanced to round ${instance.copyCatRoyale.currentRound}, finale: ${instance.copyCatRoyale.isFinale}`);
}

/**
 * Check if all active players have submitted for the current round
 */
export function allActivePlayersSubmitted(instance: Instance): boolean {
  if (!instance.copyCatRoyale) return false;

  const { currentRound, playerStatus } = instance.copyCatRoyale;

  for (const [, status] of playerStatus) {
    if (status.isEliminated) continue;
    if (!status.submissions.has(currentRound)) {
      return false;
    }
  }

  return true;
}

/**
 * Get the estimated total rounds based on current player count
 */
export function getEstimatedTotalRounds(instance: Instance): number {
  if (!instance.copyCatRoyale) return 0;
  return instance.copyCatRoyale.eliminationBracket.length;
}

/**
 * Get the current reference image
 */
export function getCurrentReferenceImage(instance: Instance): RoyalePoolImage | null {
  return instance.copyCatRoyale?.currentReferenceImage ?? null;
}

/**
 * Clean up CopyCat Royale state
 */
export function cleanupCopyCatRoyaleState(instance: Instance): void {
  instance.copyCatRoyale = undefined;
  log('CopyCatRoyale', `Cleaned up state for instance ${instance.id}`);
}

/**
 * Check if this is CopyCat Royale mode
 */
export function isCopyCatRoyaleMode(instance: Instance): boolean {
  return instance.gameMode === 'copycat-royale';
}

/**
 * Get player's last submission pixels for the winner display
 */
export function getPlayerLastSubmission(instance: Instance, playerId: string): string | null {
  if (!instance.copyCatRoyale) return null;

  const status = instance.copyCatRoyale.playerStatus.get(playerId);
  if (!status) return null;

  // Get the last submission
  const lastRound = Math.max(...Array.from(status.submissions.keys()));
  const submission = status.submissions.get(lastRound);
  return submission?.pixels ?? null;
}
