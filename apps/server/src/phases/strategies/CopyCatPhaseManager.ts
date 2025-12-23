// apps/server/src/phases/strategies/CopyCatPhaseManager.ts

/**
 * CopyCatPhaseManager - Phase manager for CopyCat 1v1 mode
 *
 * Handles the CopyCat phase flow:
 * lobby → countdown → memorize → drawing → copycat-result → lobby
 *
 * This mode has no voting - just direct comparison of accuracy.
 */

import type { PhaseManager } from '../types.js';
import type { Instance, GamePhase } from '../../types.js';
import type { GameModeConfig } from '../../gameModes/types.js';

export class CopyCatPhaseManager implements PhaseManager {
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
      case 'memorize':
        return this.config.timers.memorize ?? 5_000;
      case 'drawing':
        return this.config.timers.drawing;
      case 'copycat-result':
        return this.config.timers.copycatResult ?? 10_000;
      default:
        return null;
    }
  }

  canTransitionTo(_instance: Instance, toPhase: GamePhase): boolean {
    return this.hasPhase(toPhase);
  }

  getPhaseAfterDrawing(_instance: Instance): GamePhase {
    // CopyCat always goes to result after drawing
    return 'copycat-result';
  }

  getPhaseAfterVoting(_instance: Instance): GamePhase {
    // CopyCat has no voting, go back to lobby
    return 'lobby';
  }

  hasVoting(): boolean {
    return false; // CopyCat has no voting
  }

  hasFinale(): boolean {
    return false; // CopyCat has no finale
  }

  calculateVotingRounds(_submissionCount: number): number {
    return 0; // No voting rounds
  }

  calculateFinalistCount(_submissionCount: number): number {
    return 0; // No finalists
  }
}
