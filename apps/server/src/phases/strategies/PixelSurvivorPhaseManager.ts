// apps/server/src/phases/strategies/PixelSurvivorPhaseManager.ts

import type { PhaseManager } from '../types.js';
import type { Instance, GamePhase } from '../../types.js';
import type { GameModeConfig } from '../../gameModes/types.js';

/**
 * Phase Manager for Pixel Survivor mode.
 *
 * This is a minimal implementation since Pixel Survivor runs primarily client-side.
 * The phase transitions are managed by the client using LocalStorage.
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
    // Pixel Survivor phase flow (client-managed, but defined here for consistency)
    const transitions: Partial<Record<GamePhase, GamePhase>> = {
      'survivor-menu': 'survivor-character',
      'survivor-character': 'survivor-day-start',
      'survivor-day-start': 'survivor-event',
      'survivor-event': 'survivor-drawing',
      'survivor-drawing': 'survivor-result',
      'survivor-result': 'survivor-day-start', // Loop back for next day
      'survivor-levelup': 'survivor-day-start',
      'survivor-gameover': 'survivor-menu',
      'survivor-victory': 'survivor-menu',
    };

    return transitions[currentPhase] || 'survivor-menu';
  }

  getTimerDuration(phase: GamePhase): number | null {
    const { timers } = this.config;

    switch (phase) {
      case 'survivor-drawing':
        return timers.drawing ?? 60_000;
      case 'survivor-character':
        return timers.characterCreation ?? 120_000;
      case 'survivor-day-start':
        return timers.dayStart ?? 3_000;
      case 'survivor-event':
        return timers.eventIntro ?? 5_000;
      case 'survivor-result':
        return timers.eventResult ?? 5_000;
      case 'survivor-levelup':
        return timers.levelUp ?? 30_000;
      default:
        return null;
    }
  }

  canTransitionTo(_instance: Instance, toPhase: GamePhase): boolean {
    return this.hasPhase(toPhase);
  }

  getPhaseAfterDrawing(_instance: Instance): GamePhase {
    return 'survivor-result';
  }

  getPhaseAfterVoting(_instance: Instance): GamePhase {
    // No voting in Survivor
    return 'survivor-result';
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
