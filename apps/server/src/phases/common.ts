// apps/server/src/phases/common.ts

/**
 * Common utilities for phase management
 *
 * This module provides shared functionality used by phase handlers across
 * all game modes. It extracts common patterns to reduce duplication and
 * ensure consistent behavior.
 */

import type { Server } from 'socket.io';
import type { Instance, GamePhase, RankingEntry } from '../types.js';
import type { PhaseContext } from './types.js';
import { log } from '../utils.js';
import { compressIfNeeded } from '../compression.js';
import { checkLobbyTimer } from '../instance.js';
import { shouldCompress } from '../gameModes/index.js';

// ============================================
// IO INSTANCE MANAGEMENT
// ============================================

let ioInstance: Server | null = null;

/**
 * Set the Socket.io server instance
 */
export function setIoInstance(io: Server): void {
  ioInstance = io;
}

/**
 * Get the Socket.io server instance
 */
export function getIoInstance(): Server | null {
  return ioInstance;
}

// ============================================
// PHASE TIMING (Anti-Cheat)
// ============================================

interface PhaseTimings {
  phaseStartedAt: number;
  phaseEndsAt: number;
}

const instanceTimings = new Map<string, PhaseTimings>();

/**
 * Set phase timing for anti-cheat validation
 */
export function setPhaseTimings(instanceId: string, duration: number): void {
  instanceTimings.set(instanceId, {
    phaseStartedAt: Date.now(),
    phaseEndsAt: Date.now() + duration,
  });
}

/**
 * Checks if an action is within the valid time window
 */
export function isWithinPhaseTime(instanceId: string, gracePeriodMs = 2000): boolean {
  const timings = instanceTimings.get(instanceId);
  if (!timings) return false;

  const now = Date.now();
  return now <= timings.phaseEndsAt + gracePeriodMs;
}

/**
 * Returns the phase timings (for anti-bot checks)
 */
export function getPhaseTimings(instanceId: string): PhaseTimings | undefined {
  return instanceTimings.get(instanceId);
}

/**
 * Clear phase timings for an instance
 */
export function clearPhaseTimings(instanceId: string): void {
  instanceTimings.delete(instanceId);
}

// ============================================
// SOCKET EMISSION HELPERS
// ============================================

/**
 * Emit an event to all players and spectators in an instance
 */
export function emitToInstance(instance: Instance, event: string, data: unknown): void {
  if (!ioInstance) return;

  // Emit to all players
  for (const player of instance.players.values()) {
    ioInstance.to(player.socketId).emit(event, data);
  }
  // Emit to all spectators
  for (const spectator of instance.spectators.values()) {
    ioInstance.to(spectator.socketId).emit(event, data);
  }
}

/**
 * Emit an event to a specific player
 */
export function emitToPlayer(playerId: string, instance: Instance, event: string, data: unknown): void {
  if (!ioInstance) return;

  const player = instance.players.get(playerId) ?? instance.spectators.get(playerId);
  if (player) {
    ioInstance.to(player.socketId).emit(event, data);
  }
}

// ============================================
// PHASE TRANSITION HELPERS
// ============================================

/**
 * Create a phase context for handlers
 */
export function createPhaseContext(transitionTo: (instance: Instance, phase: GamePhase) => void): PhaseContext {
  if (!ioInstance) {
    throw new Error('IO instance not set');
  }

  return {
    io: ioInstance,
    emitToInstance,
    setPhaseTimings,
    transitionTo,
    resetForNextRound,
  };
}

/**
 * Reset instance for next round
 */
export function resetForNextRound(instance: Instance): void {
  // Clear game state
  instance.submissions = [];
  instance.votes = [];
  instance.prompt = undefined;
  instance.promptIndices = undefined;

  // Move spectators back to players
  for (const [id, spectator] of instance.spectators) {
    instance.players.set(id, spectator);
  }
  instance.spectators.clear();

  log('Phase', `Instance ${instance.id} reset for next round with ${instance.players.size} players`);
}

// ============================================
// RESULTS HANDLING
// ============================================

/**
 * Create rankings from submissions (for modes without Elo voting)
 */
export function createSimpleRankings(instance: Instance): RankingEntry[] {
  const rankings: RankingEntry[] = [];

  for (let i = 0; i < instance.submissions.length; i++) {
    const submission = instance.submissions[i];
    const player = instance.players.get(submission.playerId) ?? instance.spectators.get(submission.playerId);

    if (player) {
      rankings.push({
        place: i + 1,
        playerId: submission.playerId,
        user: player.user,
        pixels: submission.pixels,
        finalVotes: 0,
        elo: 1000, // Default Elo
      });
    }
  }

  return rankings;
}

/**
 * Handle the results phase (common to multiple modes)
 */
export function handleResultsPhase(
  instance: Instance,
  rankings: RankingEntry[],
  duration: number,
  transitionTo: (instance: Instance, phase: GamePhase) => void
): void {
  const playerCount = instance.players.size + instance.spectators.size;

  // Use compression for large galleries
  const useCompression = shouldCompress(instance, playerCount);
  const compressedRankings = useCompression
    ? compressIfNeeded(rankings, playerCount)
    : { compressed: false, data: '' };

  emitToInstance(instance, 'game-results', {
    prompt: instance.prompt,
    promptIndices: instance.promptIndices,
    rankings: useCompression ? [] : rankings,
    compressedRankings: compressedRankings.compressed ? compressedRankings.data : undefined,
    totalParticipants: rankings.length,
  });

  // Move non-submitters back to players
  for (const [id, spectator] of instance.spectators) {
    instance.players.set(id, spectator);
  }
  instance.spectators.clear();

  instance.phaseTimer = setTimeout(() => {
    resetForNextRound(instance);
    transitionTo(instance, 'lobby');
  }, duration);
}

// ============================================
// MODE DETECTION HELPERS
// ============================================

/**
 * Check if this is a CopyCat mode (including solo)
 */
export function isCopyCatMode(instance: Instance): boolean {
  return instance.gameMode === 'copy-cat' || instance.gameMode === 'copy-cat-solo';
}

/**
 * Check if this is CopyCat Solo mode (single player)
 */
export function isCopyCatSoloMode(instance: Instance): boolean {
  return instance.gameMode === 'copy-cat-solo';
}

/**
 * Check if this is ZombiePixel mode
 */
export function isZombiePixelMode(instance: Instance): boolean {
  return instance.gameMode === 'zombie-pixel';
}

/**
 * Check if this is PixelGuesser mode
 */
export function isPixelGuesserMode(instance: Instance): boolean {
  return instance.gameMode === 'pixel-guesser';
}

/**
 * Check if this is CopyCat Royale mode
 */
export function isCopyCatRoyaleMode(instance: Instance): boolean {
  return instance.gameMode === 'copycat-royale';
}

// ============================================
// LOBBY HELPERS
// ============================================

/**
 * Handle the lobby phase (common to all modes)
 */
export function handleLobbyPhase(instance: Instance): void {
  emitToInstance(instance, 'phase-changed', {
    phase: 'lobby',
    message: 'Waiting for next round',
  });

  // Check timer - important after round reset when players are already present
  checkLobbyTimer(instance);
}

// ============================================
// COUNTDOWN HELPERS
// ============================================

/**
 * Handle the countdown phase (common to all modes)
 */
export function handleCountdownPhase(
  instance: Instance,
  duration: number,
  onCountdownEnd: () => void
): void {
  emitToInstance(instance, 'phase-changed', {
    phase: 'countdown',
    prompt: instance.prompt,
    promptIndices: instance.promptIndices,
    duration,
    startsAt: Date.now() + duration,
  });

  instance.phaseTimer = setTimeout(onCountdownEnd, duration);
}
