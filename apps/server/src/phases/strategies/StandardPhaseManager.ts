// apps/server/src/phases/strategies/StandardPhaseManager.ts

/**
 * StandardPhaseManager - Default implementation for standard game modes
 *
 * Handles the standard phase flow:
 * lobby → countdown → drawing → voting → finale → results → lobby
 *
 * This is used for 'pixel-battle' and similar modes with Elo voting.
 */

import type { PhaseManager } from '../types.js';
import type { Instance, GamePhase } from '../../types.js';
import type { GameModeConfig } from '../../gameModes/types.js';

export class StandardPhaseManager implements PhaseManager {
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
      case 'drawing':
        return this.config.timers.drawing;
      case 'voting':
        return this.config.timers.votingRound;
      case 'finale':
        return this.config.timers.finale;
      case 'results':
        return this.config.timers.results;
      default:
        return null;
    }
  }

  canTransitionTo(_instance: Instance, toPhase: GamePhase): boolean {
    // For standard flow, any phase in the config is valid
    return this.hasPhase(toPhase);
  }

  getPhaseAfterDrawing(instance: Instance): GamePhase {
    // Need at least 2 submissions for voting
    if (instance.submissions.length < 2) {
      return 'results';
    }

    // If voting is enabled, go to voting
    if (this.hasVoting()) {
      return 'voting';
    }

    // Otherwise skip to results
    return 'results';
  }

  getPhaseAfterVoting(_instance: Instance): GamePhase {
    // If finale is enabled, go to finale
    if (this.hasFinale()) {
      return 'finale';
    }

    // Otherwise skip to results
    return 'results';
  }

  hasVoting(): boolean {
    return this.config.voting !== null && this.config.voting.type !== 'none';
  }

  hasFinale(): boolean {
    return this.config.voting?.finale?.enabled ?? false;
  }

  calculateVotingRounds(submissionCount: number): number {
    if (!this.config.voting?.rounds) {
      return 3; // Default fallback
    }

    return this.config.voting.rounds.calculateRounds(submissionCount);
  }

  calculateFinalistCount(submissionCount: number): number {
    if (!this.config.voting?.finale) {
      // Default: 10% with min 3, max 10
      return Math.min(10, Math.max(3, Math.ceil(submissionCount * 0.1)));
    }

    const { finalistPercent, minFinalists, maxFinalists } = this.config.voting.finale;
    return Math.min(maxFinalists, Math.max(minFinalists, Math.ceil(submissionCount * finalistPercent)));
  }
}
