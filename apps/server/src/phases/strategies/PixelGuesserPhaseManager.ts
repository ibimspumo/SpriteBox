// apps/server/src/phases/strategies/PixelGuesserPhaseManager.ts

/**
 * PixelGuesserPhaseManager - Phase manager for Pixel Guesser (Pictionary) mode
 *
 * Handles the PixelGuesser phase flow:
 * lobby → countdown → guessing → reveal → (next round) → ... → results
 *
 * The 'guessing' phase combines drawing (by artist) and guessing (by others).
 * Each player takes a turn being the artist, so there are N rounds where N = players.
 *
 * This mode has no voting - points are earned by fast correct guesses.
 */

import type { PhaseManager } from '../types.js';
import type { Instance, GamePhase } from '../../types.js';
import type { GameModeConfig } from '../../gameModes/types.js';

export class PixelGuesserPhaseManager implements PhaseManager {
  constructor(private config: GameModeConfig) {}

  getConfig(): GameModeConfig {
    return this.config;
  }

  getPhases(): GamePhase[] {
    return this.config.phases;
  }

  hasPhase(phase: GamePhase): boolean {
    return this.config.phases.includes(phase);
  }

  getNextPhase(currentPhase: GamePhase): GamePhase {
    const phases = this.config.phases;
    const currentIndex = phases.indexOf(currentPhase);

    // If not found or at last phase, return to lobby
    if (currentIndex === -1 || currentIndex >= phases.length - 1) {
      return 'lobby';
    }

    return phases[currentIndex + 1];
  }

  getTimerDuration(phase: GamePhase): number | null {
    switch (phase) {
      case 'lobby':
        return this.config.timers.lobby;
      case 'countdown':
        return this.config.timers.countdown;
      case 'guessing':
        return this.config.timers.guessing ?? 45_000;
      case 'reveal':
        return this.config.timers.reveal ?? 5_000;
      case 'results':
        return this.config.timers.results;
      default:
        return null;
    }
  }

  canTransitionTo(_instance: Instance, toPhase: GamePhase): boolean {
    return this.hasPhase(toPhase);
  }

  /**
   * After reveal, check if there are more rounds.
   * Returns 'countdown' if more rounds remain, 'results' if game is over.
   */
  getPhaseAfterReveal(instance: Instance): GamePhase {
    const state = instance.pixelGuesser;
    if (!state) {
      return 'results';
    }

    // More rounds remaining?
    if (state.currentRound < state.totalRounds) {
      return 'countdown';
    }

    return 'results';
  }

  getPhaseAfterDrawing(_instance: Instance): GamePhase {
    // PixelGuesser doesn't have a separate drawing phase
    // Drawing is combined into 'guessing' phase
    return 'reveal';
  }

  getPhaseAfterVoting(_instance: Instance): GamePhase {
    // PixelGuesser has no voting
    return 'results';
  }

  hasVoting(): boolean {
    return false; // PixelGuesser has no voting
  }

  hasFinale(): boolean {
    return false; // PixelGuesser has no finale
  }

  calculateVotingRounds(_submissionCount: number): number {
    return 0; // No voting rounds
  }

  calculateFinalistCount(_submissionCount: number): number {
    return 0; // No finalists
  }
}
