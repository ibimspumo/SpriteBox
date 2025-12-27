// apps/server/src/phases/strategies/CopyCatRoyalePhaseManager.ts

/**
 * CopyCatRoyalePhaseManager - Phase manager for CopyCat Royale battle royale mode
 *
 * Handles the CopyCat Royale phase flow:
 * lobby → countdown → royale-initial-drawing → [royale-show-reference → royale-drawing → royale-results → royale-elimination] → royale-winner → lobby
 *
 * This mode has no voting - elimination is based on accuracy comparison.
 */

import type { PhaseManager } from '../types.js';
import type { Instance, GamePhase } from '../../types.js';
import type { GameModeConfig } from '../../gameModes/types.js';

export class CopyCatRoyalePhaseManager implements PhaseManager {
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
    switch (currentPhase) {
      case 'lobby':
        return 'countdown';
      case 'countdown':
        return 'royale-initial-drawing';
      case 'royale-initial-drawing':
        return 'royale-show-reference';
      case 'royale-show-reference':
        return 'royale-drawing';
      case 'royale-drawing':
        return 'royale-results';
      case 'royale-results':
        // After results, we either continue to next round or winner
        // This is handled by the phase handler based on player count
        return 'royale-elimination';
      case 'royale-elimination':
        // After elimination, either show reference for next round or winner
        return 'royale-show-reference';
      case 'royale-winner':
        return 'lobby';
      default:
        return 'lobby';
    }
  }

  getTimerDuration(phase: GamePhase): number | null {
    switch (phase) {
      case 'lobby':
        return this.config.timers.lobby;
      case 'countdown':
        return this.config.timers.countdown;
      case 'royale-initial-drawing':
        return this.config.timers.royaleInitialDrawing ?? 30_000;
      case 'royale-show-reference':
        return this.config.timers.royaleShowReference ?? 5_000;
      case 'royale-drawing':
        return this.config.timers.royaleDrawing ?? 25_000;
      case 'royale-results':
        return this.config.timers.royaleResults ?? 8_000;
      case 'royale-elimination':
        return 0; // Instant transition
      case 'royale-winner':
        return this.config.timers.royaleWinner ?? 15_000;
      default:
        return null;
    }
  }

  canTransitionTo(_instance: Instance, toPhase: GamePhase): boolean {
    return this.hasPhase(toPhase);
  }

  getPhaseAfterDrawing(_instance: Instance): GamePhase {
    // CopyCat Royale goes to results after drawing
    return 'royale-results';
  }

  getPhaseAfterVoting(_instance: Instance): GamePhase {
    // CopyCat Royale has no voting, go back to lobby
    return 'lobby';
  }

  hasVoting(): boolean {
    return false; // CopyCat Royale has no voting
  }

  hasFinale(): boolean {
    return false; // CopyCat Royale has built-in elimination instead
  }

  calculateVotingRounds(_submissionCount: number): number {
    return 0; // No voting rounds
  }

  calculateFinalistCount(_submissionCount: number): number {
    return 0; // No finalists
  }
}
