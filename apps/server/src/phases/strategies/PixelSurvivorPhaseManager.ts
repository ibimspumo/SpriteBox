// apps/server/src/phases/strategies/PixelSurvivorPhaseManager.ts

import type { PhaseManager } from '../types.js';
import type { Instance, GamePhase } from '../../types.js';
import type { GameModeConfig } from '../../gameModes/types.js';

/**
 * Phase Manager for Pixel Survivor mode.
 *
 * This is a minimal implementation since Pixel Survivor runs primarily client-side.
 * Currently only character creation is implemented.
 * Phase transitions are managed by the client using LocalStorage.
 */
export class PixelSurvivorPhaseManager implements PhaseManager {
  constructor(private config: GameModeConfig) {}

  getConfig(): GameModeConfig {
    return this.config;
  }

  getPhases(): GamePhase[] {
    return this.config.phases as GamePhase[];
  }

  hasPhase(phase: GamePhase): boolean {
    return this.config.phases.includes(phase);
  }

  getNextPhase(currentPhase: GamePhase): GamePhase {
    // Simplified - only menu and character creation
    const transitions: Partial<Record<GamePhase, GamePhase>> = {
      'survivor-menu': 'survivor-character',
      'survivor-character': 'survivor-menu',
    };

    return transitions[currentPhase] || 'survivor-menu';
  }

  getTimerDuration(phase: GamePhase): number | null {
    const { timers } = this.config;

    switch (phase) {
      case 'survivor-character':
        return timers.characterCreation ?? 120_000;
      default:
        return null;
    }
  }

  canTransitionTo(_instance: Instance, toPhase: GamePhase): boolean {
    return this.hasPhase(toPhase);
  }

  getPhaseAfterDrawing(_instance: Instance): GamePhase {
    return 'survivor-menu';
  }

  getPhaseAfterVoting(_instance: Instance): GamePhase {
    return 'survivor-menu';
  }

  hasVoting(): boolean {
    return false;
  }

  hasFinale(): boolean {
    return false;
  }

  calculateVotingRounds(_submissionCount: number): number {
    return 0;
  }

  calculateFinalistCount(_submissionCount: number): number {
    return 0;
  }
}
