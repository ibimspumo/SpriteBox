// apps/server/src/phases/types.ts

/**
 * PhaseManager Interface
 *
 * Defines the contract for managing game phases in different game modes.
 * Each game mode can have its own PhaseManager implementation that determines
 * which phases are available, their order, timing, AND the actual handler logic.
 *
 * This interface combines configuration (getPhases, getTimerDuration) with
 * runtime logic (handlePhase, initializeGame) to keep all mode-specific
 * behavior in one place.
 */

import type { Server } from 'socket.io';
import type { Instance, GamePhase } from '../types.js';
import type { GameModeConfig } from '../gameModes/types.js';

/**
 * Context passed to phase handlers with all dependencies they need
 */
export interface PhaseContext {
  /** Socket.io server instance for emitting events */
  io: Server;
  /** Emit event to all players in the instance */
  emitToInstance: (instance: Instance, event: string, data: unknown) => void;
  /** Set phase timing for anti-cheat validation */
  setPhaseTimings: (instanceId: string, duration: number) => void;
  /** Transition to a new phase */
  transitionTo: (instance: Instance, phase: GamePhase) => void;
  /** Reset instance for next round */
  resetForNextRound: (instance: Instance) => void;
}

/**
 * Result of handling a phase
 */
export interface PhaseHandleResult {
  /** Whether the phase was handled successfully */
  handled: boolean;
  /** Error message if handling failed */
  error?: string;
}

/**
 * PhaseManager interface for handling game phase logic
 */
export interface PhaseManager {
  // ============================================
  // CONFIGURATION METHODS (existing)
  // ============================================

  /**
   * Get the game mode config this manager uses
   */
  getConfig(): GameModeConfig;

  /**
   * Get the list of phases for this game mode (in order)
   */
  getPhases(): GamePhase[];

  /**
   * Check if a phase is valid for this game mode
   */
  hasPhase(phase: GamePhase): boolean;

  /**
   * Get the next phase after the current one
   * Returns 'lobby' if at the end of the phase sequence
   */
  getNextPhase(currentPhase: GamePhase): GamePhase;

  /**
   * Get the timer duration for a phase in milliseconds
   * Returns null if the phase has no timer (unlimited)
   */
  getTimerDuration(phase: GamePhase): number | null;

  /**
   * Check if a transition from current phase to target phase is valid
   */
  canTransitionTo(instance: Instance, toPhase: GamePhase): boolean;

  /**
   * Get the phase that should come after drawing
   * (voting, results, or custom phase depending on mode)
   */
  getPhaseAfterDrawing(instance: Instance): GamePhase;

  /**
   * Get the phase that should come after voting
   * (finale, results, or custom phase depending on mode)
   */
  getPhaseAfterVoting(instance: Instance): GamePhase;

  /**
   * Check if this game mode has voting
   */
  hasVoting(): boolean;

  /**
   * Check if this game mode has finale
   */
  hasFinale(): boolean;

  /**
   * Calculate the number of voting rounds for a given submission count
   */
  calculateVotingRounds(submissionCount: number): number;

  /**
   * Calculate the number of finalists for a given submission count
   */
  calculateFinalistCount(submissionCount: number): number;

  // ============================================
  // HANDLER METHODS (new)
  // ============================================

  /**
   * Initialize the game state for this mode
   * Called when the game starts (before countdown)
   * @returns true if the mode handles its own initialization
   */
  initializeGame?(instance: Instance, ctx: PhaseContext): boolean;

  /**
   * Get the first phase after countdown for this mode
   * Returns null to use default behavior
   */
  getPhaseAfterCountdown?(instance: Instance): GamePhase | null;

  /**
   * Handle a specific phase
   * @returns PhaseHandleResult with handled=true if this manager handled the phase
   */
  handlePhase?(instance: Instance, phase: GamePhase, ctx: PhaseContext): PhaseHandleResult;

  /**
   * Handle submission for this game mode
   * @returns true if the submission was handled by this manager
   */
  handleSubmission?(
    instance: Instance,
    playerId: string,
    pixels: string,
    ctx: PhaseContext
  ): boolean;

  /**
   * Cleanup game state when returning to lobby
   */
  cleanup?(instance: Instance): void;
}
