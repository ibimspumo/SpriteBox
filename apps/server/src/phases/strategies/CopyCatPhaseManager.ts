// apps/server/src/phases/strategies/CopyCatPhaseManager.ts

/**
 * CopyCatPhaseManager - Phase manager for CopyCat 1v1 mode
 *
 * Handles the CopyCat phase flow:
 * lobby → countdown → memorize → drawing → copycat-result → [copycat-rematch →] lobby
 *
 * This mode has no voting - just direct comparison of accuracy.
 * The rematch phase is only for 1v1 mode, solo mode skips directly to lobby.
 */

import type { PhaseManager, PhaseContext, PhaseHandleResult } from '../types.js';
import type { Instance, GamePhase } from '../../types.js';
import type { GameModeConfig } from '../../gameModes/types.js';
import { log } from '../../utils.js';
import {
  initializeCopyCatState,
  reinitializeCopyCatStateForRematch,
  getReferenceImage,
  recordCopyCatSubmission,
  getCopyCatResults,
  allCopyCatSubmissionsIn,
  cleanupCopyCatState,
  recordRematchVote,
} from '../../copycat.js';

/** Rematch timeout in milliseconds */
const REMATCH_TIMEOUT = 15_000;

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

  // ============================================
  // HANDLER METHODS
  // ============================================

  /**
   * Initialize the game state for CopyCat mode
   */
  initializeGame(instance: Instance, _ctx: PhaseContext): boolean {
    log('Phase', `Initializing CopyCat state for instance ${instance.id}`);
    initializeCopyCatState(instance);
    return true;
  }

  /**
   * Get the first phase after countdown for CopyCat mode
   * CopyCat goes to memorize phase first
   */
  getPhaseAfterCountdown(_instance: Instance): GamePhase {
    return 'memorize';
  }

  /**
   * Check if this is CopyCat Solo mode
   */
  private isSoloMode(instance: Instance): boolean {
    return instance.gameMode === 'copy-cat-solo';
  }

  /**
   * Handle CopyCat-specific phases
   */
  handlePhase(instance: Instance, phase: GamePhase, ctx: PhaseContext): PhaseHandleResult {
    switch (phase) {
      case 'memorize':
        this.handleMemorize(instance, ctx);
        return { handled: true };
      case 'drawing':
        this.handleDrawing(instance, ctx);
        return { handled: true };
      case 'copycat-result':
        this.handleResult(instance, ctx);
        return { handled: true };
      case 'copycat-rematch':
        this.handleRematch(instance, ctx);
        return { handled: true };
      default:
        return { handled: false };
    }
  }

  /**
   * Memorize phase - shows the reference image
   */
  private handleMemorize(instance: Instance, ctx: PhaseContext): void {
    const duration = this.getTimerDuration('memorize') ?? 5_000;

    const referenceImage = getReferenceImage(instance);
    if (!referenceImage) {
      log('Phase', 'No reference image found for CopyCat, skipping to result');
      ctx.transitionTo(instance, 'copycat-result');
      return;
    }

    ctx.setPhaseTimings(instance.id, duration);

    const endsAt = Date.now() + duration;

    ctx.emitToInstance(instance, 'phase-changed', {
      phase: 'memorize',
      duration,
      endsAt,
    });

    ctx.emitToInstance(instance, 'copycat-reference', {
      referenceImage,
      duration,
      endsAt,
    });

    log('Phase', `Memorize phase started for instance ${instance.id}`);

    instance.phaseTimer = setTimeout(() => {
      ctx.transitionTo(instance, 'drawing');
    }, duration);
  }

  /**
   * Drawing phase for CopyCat mode
   */
  private handleDrawing(instance: Instance, ctx: PhaseContext): void {
    const duration = this.getTimerDuration('drawing') ?? 30_000;

    // Reset submissions
    instance.submissions = [];

    // Set phase timing for anti-cheat
    ctx.setPhaseTimings(instance.id, duration);

    const endsAt = Date.now() + duration;

    ctx.emitToInstance(instance, 'phase-changed', {
      phase: 'drawing',
      duration,
      endsAt,
    });

    log('Phase', `CopyCat drawing phase started for instance ${instance.id}`);

    instance.phaseTimer = setTimeout(() => {
      log('Phase', `CopyCat drawing ended for ${instance.id}: ${instance.copyCat?.playerResults.size || 0} submissions`);
      ctx.transitionTo(instance, 'copycat-result');
    }, duration);
  }

  /**
   * Result phase - shows comparison between drawings and reference
   */
  private handleResult(instance: Instance, ctx: PhaseContext): void {
    const duration = this.getTimerDuration('copycat-result') ?? 10_000;

    const referenceImage = getReferenceImage(instance);
    const { results, winner, isDraw } = getCopyCatResults(instance);

    log('Phase', `CopyCat result: ${results.length} players, winner: ${winner?.playerId || 'draw'}`);

    const endsAt = Date.now() + duration;

    ctx.emitToInstance(instance, 'phase-changed', {
      phase: 'copycat-result',
      duration,
      endsAt,
    });

    ctx.emitToInstance(instance, 'copycat-results', {
      referenceImage,
      results,
      winner,
      isDraw,
      duration,
      endsAt,
    });

    // Clear player results but keep state for rematch votes
    if (instance.copyCat) {
      instance.copyCat.playerResults.clear();
      instance.copyCat.rematchVotes.clear();
    }

    instance.phaseTimer = setTimeout(() => {
      if (this.isSoloMode(instance)) {
        // Solo mode: go back to lobby
        cleanupCopyCatState(instance);
        ctx.transitionTo(instance, 'lobby');
      } else {
        // 1v1 mode: transition to rematch prompt
        ctx.transitionTo(instance, 'copycat-rematch');
      }
    }, duration);
  }

  /**
   * Rematch phase - ask both players if they want to play again
   */
  private handleRematch(instance: Instance, ctx: PhaseContext): void {
    const endsAt = Date.now() + REMATCH_TIMEOUT;

    ctx.emitToInstance(instance, 'phase-changed', {
      phase: 'copycat-rematch',
      duration: REMATCH_TIMEOUT,
      endsAt,
    });

    ctx.emitToInstance(instance, 'copycat-rematch-prompt', {
      duration: REMATCH_TIMEOUT,
      endsAt,
    });

    log('Phase', `CopyCat rematch prompt started for instance ${instance.id}`);

    ctx.setPhaseTimings(instance.id, REMATCH_TIMEOUT);

    instance.phaseTimer = setTimeout(() => {
      log('Phase', `Rematch timeout for instance ${instance.id}`);
      ctx.emitToInstance(instance, 'copycat-rematch-result', {
        rematch: false,
        reason: 'timeout',
      });
      cleanupCopyCatState(instance);
      ctx.resetForNextRound(instance);
      ctx.transitionTo(instance, 'lobby');
    }, REMATCH_TIMEOUT);
  }

  /**
   * Handle submission for CopyCat mode
   */
  handleSubmission(
    instance: Instance,
    playerId: string,
    pixels: string,
    ctx: PhaseContext
  ): boolean {
    if (!instance.copyCat) {
      return false;
    }

    // Check if already submitted
    if (instance.copyCat.playerResults.has(playerId)) {
      return false;
    }

    // Record submission with accuracy calculation
    const result = recordCopyCatSubmission(instance, playerId, pixels);
    if (!result) {
      return false;
    }

    // Also add to standard submissions for compatibility
    instance.submissions.push({
      playerId,
      pixels,
      timestamp: result.submitTime,
    });

    // Check if all players have submitted
    const allSubmitted = allCopyCatSubmissionsIn(instance);

    if (allSubmitted) {
      log('Phase', 'All CopyCat players submitted, ending drawing early');
      clearTimeout(instance.phaseTimer);
      ctx.transitionTo(instance, 'copycat-result');
    }

    return true;
  }

  /**
   * Handle rematch vote from a player
   */
  handleRematchVote(
    instance: Instance,
    playerId: string,
    wantsRematch: boolean,
    ctx: PhaseContext
  ): void {
    if (instance.phase !== 'copycat-rematch') {
      log('Phase', `Ignoring rematch vote from ${playerId} - not in rematch phase`);
      return;
    }

    const { allVoted, bothWantRematch } = recordRematchVote(instance, playerId, wantsRematch);

    // Broadcast the vote to all players
    ctx.emitToInstance(instance, 'copycat-rematch-vote', {
      playerId,
      wantsRematch,
    });

    // If someone voted "no", end immediately
    if (!wantsRematch) {
      clearTimeout(instance.phaseTimer);
      log('Phase', `Player ${playerId} declined rematch`);
      ctx.emitToInstance(instance, 'copycat-rematch-result', {
        rematch: false,
        reason: 'declined',
      });
      cleanupCopyCatState(instance);
      ctx.resetForNextRound(instance);
      ctx.transitionTo(instance, 'lobby');
      return;
    }

    // If all voted and everyone wants rematch
    if (allVoted && bothWantRematch) {
      clearTimeout(instance.phaseTimer);
      log('Phase', `Both players want rematch - starting new game`);
      ctx.emitToInstance(instance, 'copycat-rematch-result', {
        rematch: true,
        reason: 'both-yes',
      });

      // Re-initialize with new reference image and start new game
      reinitializeCopyCatStateForRematch(instance);
      ctx.transitionTo(instance, 'countdown');
    }
  }

  /**
   * Cleanup CopyCat state
   */
  cleanup(instance: Instance): void {
    cleanupCopyCatState(instance);
  }
}
