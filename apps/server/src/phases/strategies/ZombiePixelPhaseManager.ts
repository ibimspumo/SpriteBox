// apps/server/src/phases/strategies/ZombiePixelPhaseManager.ts

/**
 * ZombiePixelPhaseManager - Manages phases for Zombie Pixel game mode
 *
 * Phase flow: lobby -> countdown -> active -> results -> lobby
 *
 * The 'active' phase is unique - it runs a real-time game loop
 * at 20 ticks per second for movement and collision detection.
 * This phase handles bot movements, player infections, and win conditions.
 */

import type { PhaseManager } from '../types.js';
import type { Instance, GamePhase } from '../../types.js';
import type { GameModeConfig } from '../../gameModes/types.js';

/** Default active phase duration in milliseconds (60 seconds) */
const DEFAULT_ACTIVE_DURATION = 60_000;

export class ZombiePixelPhaseManager implements PhaseManager {
  constructor(private config: GameModeConfig) {}

  /**
   * Get the game mode configuration
   */
  getConfig(): GameModeConfig {
    return this.config;
  }

  /**
   * Get the ordered list of phases for this mode
   */
  getPhases(): GamePhase[] {
    return this.config.phases;
  }

  /**
   * Check if a phase is valid for Zombie Pixel mode
   */
  hasPhase(phase: GamePhase): boolean {
    return this.config.phases.includes(phase);
  }

  /**
   * Get the next phase in the sequence
   * Returns 'lobby' if at the end of the phase sequence
   */
  getNextPhase(currentPhase: GamePhase): GamePhase {
    const phases = this.config.phases;
    const currentIndex = phases.indexOf(currentPhase);

    // If not found or at last phase, return to lobby
    if (currentIndex === -1 || currentIndex >= phases.length - 1) {
      return 'lobby';
    }

    return phases[currentIndex + 1];
  }

  /**
   * Get the timer duration for a phase in milliseconds
   * Returns null if the phase has no timer (unlimited)
   */
  getTimerDuration(phase: GamePhase): number | null {
    switch (phase) {
      case 'lobby':
        return this.config.timers.lobby;
      case 'countdown':
        return this.config.timers.countdown;
      case 'active':
        return this.config.timers.active ?? DEFAULT_ACTIVE_DURATION;
      case 'results':
        return this.config.timers.results;
      default:
        return null;
    }
  }

  /**
   * Check if a transition to the target phase is valid
   */
  canTransitionTo(_instance: Instance, toPhase: GamePhase): boolean {
    return this.hasPhase(toPhase);
  }

  /**
   * Get the phase after drawing
   * Note: Zombie Pixel doesn't use a drawing phase, but this returns 'results'
   * for interface compliance
   */
  getPhaseAfterDrawing(_instance: Instance): GamePhase {
    return 'results';
  }

  /**
   * Get the phase after voting
   * Note: Zombie Pixel doesn't use voting, but this returns 'results'
   * for interface compliance
   */
  getPhaseAfterVoting(_instance: Instance): GamePhase {
    return 'results';
  }

  /**
   * Check if this game mode has voting
   * Zombie Pixel has no voting - winners are determined by survival
   */
  hasVoting(): boolean {
    return false;
  }

  /**
   * Check if this game mode has a finale phase
   * Zombie Pixel has no finale - the active phase ends in results
   */
  hasFinale(): boolean {
    return false;
  }

  /**
   * Calculate voting rounds (not applicable for Zombie Pixel)
   */
  calculateVotingRounds(_submissionCount: number): number {
    return 0;
  }

  /**
   * Calculate finalist count (not applicable for Zombie Pixel)
   */
  calculateFinalistCount(_submissionCount: number): number {
    return 0;
  }
}
