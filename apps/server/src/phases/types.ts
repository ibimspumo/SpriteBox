// apps/server/src/phases/types.ts

/**
 * PhaseManager Interface
 *
 * Defines the contract for managing game phases in different game modes.
 * Each game mode can have its own PhaseManager implementation that determines
 * which phases are available, their order, and timing.
 */

import type { Instance, GamePhase } from '../types.js';
import type { GameModeConfig } from '../gameModes/types.js';

/**
 * PhaseManager interface for handling game phase logic
 */
export interface PhaseManager {
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
}
