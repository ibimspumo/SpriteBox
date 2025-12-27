// apps/server/src/phases.ts
//
// Phase Router - Thin dispatcher that delegates to game-mode-specific PhaseManagers
//
// This module acts as the central router for phase transitions. All mode-specific
// logic is handled by the individual PhaseManager strategies. This file should
// only contain:
// 1. Router logic (transitionTo)
// 2. Entry points (startGame)
// 3. Exported utilities for socket handlers
//

import type { Server } from 'socket.io';
import type { Instance, GamePhase } from './types.js';
import { TIMERS } from './constants.js';
import { log } from './utils.js';
import { checkLobbyTimer, cleanupInstance } from './instance.js';
import { getPhaseManager } from './phases/index.js';
import type { PhaseContext } from './phases/types.js';
import { StandardPhaseManager } from './phases/strategies/StandardPhaseManager.js';
import { CopyCatPhaseManager } from './phases/strategies/CopyCatPhaseManager.js';
import { PixelGuesserPhaseManager } from './phases/strategies/PixelGuesserPhaseManager.js';
import { CopyCatRoyalePhaseManager } from './phases/strategies/CopyCatRoyalePhaseManager.js';

// IO instance (set by index.ts)
let io: Server | null = null;

// ============================================
// PHASE TIMING (Anti-Cheat) - Shared across modes
// ============================================

interface PhaseTimings {
  phaseStartedAt: number;
  phaseEndsAt: number;
}

const instanceTimings = new Map<string, PhaseTimings>();

function setPhaseTimings(instanceId: string, duration: number): void {
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

export function setPhaseIo(ioInstance: Server): void {
  io = ioInstance;
}

// ============================================
// PHASE CONTEXT FACTORY
// ============================================

/**
 * Create a phase context for handlers
 */
function createPhaseContext(): PhaseContext {
  if (!io) {
    throw new Error('IO instance not set');
  }

  return {
    io,
    emitToInstance,
    setPhaseTimings,
    transitionTo,
    resetForNextRound,
  };
}

// ============================================
// VOTING STATE ACCESS (for socket handlers)
// ============================================

/**
 * Get voting state for an instance (used by socket handlers)
 */
export function getVotingState(instanceId: string) {
  return StandardPhaseManager.getVotingState(instanceId);
}

/**
 * Checks if all votes are in and triggers early phase end if so
 * Returns true if early end was triggered
 */
export function checkAndTriggerEarlyVotingEnd(instanceId: string, instance: Instance): boolean {
  const manager = getPhaseManager(instance);
  if (!(manager instanceof StandardPhaseManager)) {
    return false;
  }

  const ctx = createPhaseContext();
  return StandardPhaseManager.checkAndTriggerEarlyVotingEnd(instanceId, instance, manager, ctx);
}

/**
 * Checks if all finale votes are in and triggers early phase end
 */
export function checkAndTriggerEarlyFinaleEnd(instanceId: string, instance: Instance, totalVoters: number): boolean {
  const manager = getPhaseManager(instance);
  if (!(manager instanceof StandardPhaseManager)) {
    return false;
  }

  const ctx = createPhaseContext();
  return StandardPhaseManager.checkAndTriggerEarlyFinaleEnd(instanceId, instance, totalVoters, manager, ctx);
}

// ============================================
// MAIN ENTRY POINTS
// ============================================

/**
 * Starts the game for an instance
 */
export function startGame(instance: Instance): void {
  clearTimeout(instance.lobbyTimer);
  instance.lobbyTimer = undefined;

  log('Phase', `Starting game for instance ${instance.id} with ${instance.players.size} players [${instance.gameMode}]`);

  const manager = getPhaseManager(instance);
  const ctx = createPhaseContext();

  // Let the phase manager initialize game state
  if (manager.initializeGame) {
    const success = manager.initializeGame(instance, ctx);
    if (!success) {
      log('Phase', `Failed to initialize game for ${instance.gameMode}`);
      return;
    }
  }

  // CopyCat Solo skips countdown - go directly to memorize
  if (instance.gameMode === 'copy-cat-solo') {
    transitionTo(instance, 'memorize');
    return;
  }

  // All other modes start with countdown
  transitionTo(instance, 'countdown');
}

/**
 * Transitions to a new phase
 */
export function transitionTo(instance: Instance, phase: GamePhase): void {
  instance.phase = phase;
  instance.lastActivity = Date.now();

  clearTimeout(instance.phaseTimer);

  log('Phase', `Instance ${instance.id} -> ${phase}`);

  const manager = getPhaseManager(instance);
  const ctx = createPhaseContext();

  // Try to let the phase manager handle the phase
  if (manager.handlePhase) {
    const result = manager.handlePhase(instance, phase, ctx);
    if (result.handled) {
      return;
    }
  }

  // Fall back to common phase handlers
  switch (phase) {
    case 'lobby':
      handleLobby(instance);
      break;
    case 'countdown':
      handleCountdown(instance, manager, ctx);
      break;
    default:
      log('Phase', `Unknown phase ${phase} for mode ${instance.gameMode}`);
      break;
  }
}

// ============================================
// COMMON PHASE HANDLERS
// ============================================

/**
 * Lobby phase (common to all modes)
 */
function handleLobby(instance: Instance): void {
  emitToInstance(instance, 'phase-changed', {
    phase: 'lobby',
    message: 'Waiting for next round',
  });

  // Check timer - important after round reset when players are already present
  checkLobbyTimer(instance);
}

/**
 * Countdown phase (common to all modes)
 */
function handleCountdown(instance: Instance, manager: ReturnType<typeof getPhaseManager>, _ctx: PhaseContext): void {
  const duration = manager.getTimerDuration('countdown') ?? TIMERS.COUNTDOWN;

  emitToInstance(instance, 'phase-changed', {
    phase: 'countdown',
    prompt: instance.prompt,
    promptIndices: instance.promptIndices,
    duration,
    startsAt: Date.now() + duration,
  });

  instance.phaseTimer = setTimeout(() => {
    // Ask the manager what phase comes after countdown
    const nextPhase = manager.getPhaseAfterCountdown?.(instance);
    if (nextPhase) {
      transitionTo(instance, nextPhase);
    } else {
      // Fallback to drawing for modes that don't implement getPhaseAfterCountdown
      transitionTo(instance, 'drawing');
    }
  }, duration);
}

/**
 * Reset for next round (common utility)
 */
function resetForNextRound(instance: Instance): void {
  instance.submissions = [];
  instance.votes = [];
  instance.prompt = undefined;
  instance.promptIndices = undefined;

  // For private instances: check if host is still present
  if (instance.type === 'private' && instance.hostId) {
    const hostStillPresent = instance.players.has(instance.hostId) || instance.spectators.has(instance.hostId);

    if (!hostStillPresent) {
      log('Phase', `Host left private instance ${instance.id}, closing room`);

      // Notify all players that the instance is closing
      emitToInstance(instance, 'instance-closing', { reason: 'host-left' });

      // Clean up the instance
      cleanupInstance(instance);
      return;
    }
  }

  // Clean up manager state
  const manager = getPhaseManager(instance);
  if (manager.cleanup) {
    manager.cleanup(instance);
  }

  // Move spectators back to players
  for (const [id, spectator] of instance.spectators) {
    instance.players.set(id, spectator);
  }
  instance.spectators.clear();

  log('Phase', `Instance ${instance.id} reset for next round with ${instance.players.size} players`);
}

/**
 * Helper function: Send event to all in the instance
 */
function emitToInstance(instance: Instance, event: string, data: unknown): void {
  if (io) {
    io.to(instance.id).emit(event, data);
  }
}

// ============================================
// SOCKET HANDLER EXPORTS
// These delegate to the appropriate PhaseManagers
// ============================================

/**
 * Handle a CopyCat submission
 * Called from socket handler
 */
export function handleCopyCatSubmission(
  instance: Instance,
  playerId: string,
  pixels: string
): { success: boolean; error?: string; allSubmitted?: boolean } {
  const manager = getPhaseManager(instance);

  if (!(manager instanceof CopyCatPhaseManager)) {
    return { success: false, error: 'Not a CopyCat game' };
  }

  const ctx = createPhaseContext();
  const success = manager.handleSubmission(instance, playerId, pixels, ctx);

  if (!success) {
    return { success: false, error: 'Failed to process submission' };
  }

  return { success: true };
}

/**
 * Handle a CopyCat rematch vote
 * Called from socket handler
 */
export function handleCopyCatRematchVote(
  instance: Instance,
  playerId: string,
  wantsRematch: boolean
): void {
  const manager = getPhaseManager(instance);

  if (!(manager instanceof CopyCatPhaseManager)) {
    log('Phase', `Ignoring rematch vote - not a CopyCat game`);
    return;
  }

  const ctx = createPhaseContext();
  manager.handleRematchVote(instance, playerId, wantsRematch, ctx);
}

/**
 * Handle PixelGuesser drawing update from artist
 * Called from socket handler
 */
export function handlePixelGuesserDrawUpdate(
  instance: Instance,
  playerId: string,
  pixels: string
): { success: boolean; error?: string } {
  const manager = getPhaseManager(instance);

  if (!(manager instanceof PixelGuesserPhaseManager)) {
    return { success: false, error: 'Not a PixelGuesser game' };
  }

  const ctx = createPhaseContext();
  const success = manager.handleDrawUpdate(instance, playerId, pixels, ctx);

  if (!success) {
    return { success: false, error: 'Failed to update drawing' };
  }

  return { success: true };
}

/**
 * Handle PixelGuesser guess from a player
 * Called from socket handler
 */
export function handlePixelGuesserGuess(
  instance: Instance,
  playerId: string,
  guessText: string
): {
  success: boolean;
  correct: boolean;
  close: boolean;
  points: number;
  error?: string;
} {
  const manager = getPhaseManager(instance);

  if (!(manager instanceof PixelGuesserPhaseManager)) {
    return { success: false, correct: false, close: false, points: 0, error: 'Not a PixelGuesser game' };
  }

  const ctx = createPhaseContext();
  return manager.handleGuess(instance, playerId, guessText, ctx);
}

/**
 * Handle a CopyCat Royale submission
 * Called from socket handler
 */
export function handleRoyaleSubmission(
  instance: Instance,
  playerId: string,
  pixels: string
): { success: boolean; error?: string; allSubmitted?: boolean } {
  const manager = getPhaseManager(instance);

  if (!(manager instanceof CopyCatRoyalePhaseManager)) {
    return { success: false, error: 'Not a CopyCat Royale game' };
  }

  const ctx = createPhaseContext();
  const success = manager.handleSubmission(instance, playerId, pixels, ctx);

  if (!success) {
    return { success: false, error: 'Failed to process submission' };
  }

  return { success: true };
}
