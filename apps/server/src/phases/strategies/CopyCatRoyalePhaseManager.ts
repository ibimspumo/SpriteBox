// apps/server/src/phases/strategies/CopyCatRoyalePhaseManager.ts

/**
 * CopyCatRoyalePhaseManager - Phase manager for CopyCat Royale battle royale mode
 *
 * Handles the CopyCat Royale phase flow:
 * lobby -> countdown -> royale-initial-drawing -> [royale-show-reference -> royale-drawing -> royale-results -> royale-elimination] -> royale-winner -> lobby
 *
 * This mode has no voting - elimination is based on accuracy comparison.
 */

import type { PhaseManager, PhaseContext, PhaseHandleResult } from '../types.js';
import type { Instance, GamePhase } from '../../types.js';
import type { GameModeConfig } from '../../gameModes/types.js';
import { log } from '../../utils.js';
import {
  initializeCopyCatRoyaleState,
  addToImagePool,
  getRandomPoolImage,
  recordRoyaleSubmission,
  calculateRoundResults,
  isGameOver,
  isInFinale,
  getWinner,
  getSurvivingPlayerIds,
  getFinalRankings as getRoyaleFinalRankings,
  advanceRound,
  allActivePlayersSubmitted,
  getEstimatedTotalRounds,
  getCurrentReferenceImage,
  cleanupCopyCatRoyaleState,
  getActivePlayerCount,
  getPlayerLastSubmission,
} from '../../copycatRoyale.js';

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

  // ============================================
  // HANDLER METHODS
  // ============================================

  /**
   * Initialize the game state for CopyCat Royale mode
   */
  initializeGame(instance: Instance, _ctx: PhaseContext): boolean {
    log('Phase', `Initializing CopyCat Royale state for instance ${instance.id}`);
    initializeCopyCatRoyaleState(instance);
    return true;
  }

  /**
   * Get the first phase after countdown for CopyCat Royale mode
   */
  getPhaseAfterCountdown(_instance: Instance): GamePhase {
    return 'royale-initial-drawing';
  }

  /**
   * Handle CopyCat Royale-specific phases
   */
  handlePhase(instance: Instance, phase: GamePhase, ctx: PhaseContext): PhaseHandleResult {
    switch (phase) {
      case 'royale-initial-drawing':
        this.handleRoyaleInitialDrawing(instance, ctx);
        return { handled: true };
      case 'royale-show-reference':
        this.handleRoyaleShowReference(instance, ctx);
        return { handled: true };
      case 'royale-drawing':
        this.handleRoyaleDrawing(instance, ctx);
        return { handled: true };
      case 'royale-results':
        this.handleRoyaleResults(instance, ctx);
        return { handled: true };
      case 'royale-elimination':
        this.handleRoyaleElimination(instance, ctx);
        return { handled: true };
      case 'royale-winner':
        this.handleRoyaleWinner(instance, ctx);
        return { handled: true };
      default:
        return { handled: false };
    }
  }

  /**
   * Handle submission for CopyCat Royale mode
   */
  handleSubmission(
    instance: Instance,
    playerId: string,
    pixels: string,
    ctx: PhaseContext
  ): boolean {
    if (!instance.copyCatRoyale) {
      return false;
    }

    // Check phase
    if (instance.phase !== 'royale-initial-drawing' && instance.phase !== 'royale-drawing') {
      return false;
    }

    // For initial drawing phase, add to image pool
    if (instance.phase === 'royale-initial-drawing') {
      const player = instance.players.get(playerId);
      if (player) {
        addToImagePool(instance, playerId, pixels, player.user.displayName);
      }
    }

    // Record submission
    const submission = recordRoyaleSubmission(instance, playerId, pixels);
    if (!submission) {
      return false;
    }

    // Add to standard submissions for compatibility
    instance.submissions.push({
      playerId,
      pixels,
      timestamp: submission.submitTime,
    });

    // Check if all active players have submitted
    const allSubmitted = allActivePlayersSubmitted(instance);

    if (allSubmitted) {
      log('Phase', 'All CopyCat Royale players submitted, ending phase early');
      clearTimeout(instance.phaseTimer);

      if (instance.phase === 'royale-initial-drawing') {
        this.endRoyaleInitialDrawing(instance, ctx);
      } else {
        ctx.transitionTo(instance, 'royale-results');
      }
    }

    return true;
  }

  /**
   * Cleanup CopyCat Royale state
   */
  cleanup(instance: Instance): void {
    cleanupCopyCatRoyaleState(instance);
  }

  // ============================================
  // PRIVATE PHASE HANDLERS
  // ============================================

  /**
   * Initial drawing phase for CopyCat Royale (30 seconds)
   * All players draw freely - their drawings become the image pool
   */
  private handleRoyaleInitialDrawing(instance: Instance, ctx: PhaseContext): void {
    const duration = this.getTimerDuration('royale-initial-drawing') ?? 30_000;

    // Reset submissions
    instance.submissions = [];

    // Set phase timing for anti-cheat
    ctx.setPhaseTimings(instance.id, duration);

    // Set draw start time
    if (instance.copyCatRoyale) {
      instance.copyCatRoyale.drawStartTime = Date.now();
    }

    const endsAt = Date.now() + duration;

    ctx.emitToInstance(instance, 'phase-changed', {
      phase: 'royale-initial-drawing',
      duration,
      endsAt,
    });

    ctx.emitToInstance(instance, 'royale-initial-drawing', {
      duration,
      endsAt,
    });

    log('Phase', `CopyCat Royale initial drawing started for instance ${instance.id}`);

    instance.phaseTimer = setTimeout(() => {
      this.endRoyaleInitialDrawing(instance, ctx);
    }, duration);
  }

  /**
   * Ends the initial drawing phase and collects images
   */
  private endRoyaleInitialDrawing(instance: Instance, ctx: PhaseContext): void {
    if (!instance.copyCatRoyale) {
      log('Phase', 'No CopyCat Royale state, skipping to lobby');
      ctx.transitionTo(instance, 'lobby');
      return;
    }

    // Collect all submitted images into the pool
    for (const submission of instance.submissions) {
      const player = instance.players.get(submission.playerId);
      if (player) {
        addToImagePool(instance, submission.playerId, submission.pixels, player.user.displayName);
      }
    }

    log('Phase', `CopyCat Royale initial drawing ended: ${instance.copyCatRoyale.imagePool.length} images collected`);

    // Advance to round 1 and show first reference
    advanceRound(instance);
    ctx.transitionTo(instance, 'royale-show-reference');
  }

  /**
   * Show reference phase for CopyCat Royale (5 seconds)
   * Display the image to memorize
   */
  private handleRoyaleShowReference(instance: Instance, ctx: PhaseContext): void {
    const duration = this.getTimerDuration('royale-show-reference') ?? 5_000;

    if (!instance.copyCatRoyale) {
      log('Phase', 'No CopyCat Royale state in show reference');
      ctx.transitionTo(instance, 'lobby');
      return;
    }

    // Get a random image from the pool
    const referenceImage = getRandomPoolImage(instance);
    if (!referenceImage) {
      log('Phase', 'No reference image available, ending game');
      ctx.transitionTo(instance, 'royale-winner');
      return;
    }

    const endsAt = Date.now() + duration;
    const remainingPlayers = getActivePlayerCount(instance);
    const totalRounds = getEstimatedTotalRounds(instance);

    ctx.emitToInstance(instance, 'phase-changed', {
      phase: 'royale-show-reference',
      round: instance.copyCatRoyale.currentRound,
      totalRounds,
      duration,
      endsAt,
    });

    ctx.emitToInstance(instance, 'royale-show-reference', {
      referenceImage: referenceImage.pixels,
      imageCreator: referenceImage.creatorName,
      round: instance.copyCatRoyale.currentRound,
      totalRounds,
      remainingPlayers,
      duration,
      endsAt,
    });

    log('Phase', `CopyCat Royale show reference: round ${instance.copyCatRoyale.currentRound}, image from ${referenceImage.creatorName}`);

    instance.phaseTimer = setTimeout(() => {
      ctx.transitionTo(instance, 'royale-drawing');
    }, duration);
  }

  /**
   * Drawing phase for CopyCat Royale (25 seconds)
   * Players recreate the image from memory (no reference visible)
   */
  private handleRoyaleDrawing(instance: Instance, ctx: PhaseContext): void {
    const duration = this.getTimerDuration('royale-drawing') ?? 25_000;

    if (!instance.copyCatRoyale) {
      log('Phase', 'No CopyCat Royale state in drawing');
      ctx.transitionTo(instance, 'lobby');
      return;
    }

    // Reset submissions for this round
    instance.submissions = [];

    // Set phase timing for anti-cheat
    ctx.setPhaseTimings(instance.id, duration);

    // Set draw start time
    instance.copyCatRoyale.drawStartTime = Date.now();

    const endsAt = Date.now() + duration;

    ctx.emitToInstance(instance, 'phase-changed', {
      phase: 'royale-drawing',
      round: instance.copyCatRoyale.currentRound,
      duration,
      endsAt,
    });

    ctx.emitToInstance(instance, 'royale-drawing', {
      round: instance.copyCatRoyale.currentRound,
      duration,
      endsAt,
    });

    log('Phase', `CopyCat Royale drawing phase: round ${instance.copyCatRoyale.currentRound}`);

    instance.phaseTimer = setTimeout(() => {
      ctx.transitionTo(instance, 'royale-results');
    }, duration);
  }

  /**
   * Results phase for CopyCat Royale (8 seconds)
   * Show results, accuracies, and who gets eliminated
   */
  private handleRoyaleResults(instance: Instance, ctx: PhaseContext): void {
    const duration = this.getTimerDuration('royale-results') ?? 8_000;

    if (!instance.copyCatRoyale) {
      log('Phase', 'No CopyCat Royale state in results');
      ctx.transitionTo(instance, 'lobby');
      return;
    }

    // Calculate results and eliminations
    const roundResult = calculateRoundResults(instance);
    if (!roundResult) {
      log('Phase', 'Failed to calculate round results');
      ctx.transitionTo(instance, 'royale-winner');
      return;
    }

    const referenceImage = getCurrentReferenceImage(instance);
    const surviving = getSurvivingPlayerIds(instance);

    // Calculate elimination threshold (lowest surviving accuracy)
    const survivingResults = roundResult.results.filter((r) => !r.wasEliminated);
    const threshold = survivingResults.length > 0
      ? Math.min(...survivingResults.map((r) => r.accuracy))
      : 0;

    const endsAt = Date.now() + duration;

    ctx.emitToInstance(instance, 'phase-changed', {
      phase: 'royale-results',
      round: instance.copyCatRoyale.currentRound,
      duration,
      endsAt,
    });

    ctx.emitToInstance(instance, 'royale-round-results', {
      round: instance.copyCatRoyale.currentRound,
      referenceImage: referenceImage?.pixels ?? '',
      results: roundResult.results,
      eliminated: roundResult.eliminated,
      surviving,
      eliminationThreshold: threshold,
      duration,
      endsAt,
    });

    // Send personal elimination notifications
    for (const result of roundResult.results) {
      if (result.wasEliminated) {
        const player = instance.players.get(result.playerId);
        if (player) {
          const totalPlayers = instance.copyCatRoyale.playerStatus.size;
          ctx.io.to(player.socketId).emit('royale-you-eliminated', {
            round: instance.copyCatRoyale.currentRound,
            accuracy: result.accuracy,
            finalRank: result.finalRank ?? totalPlayers,
            totalPlayers,
          });

          // Move eliminated player to spectators
          instance.spectators.set(result.playerId, player);
          instance.players.delete(result.playerId);
        }
      }
    }

    log('Phase', `CopyCat Royale results: round ${instance.copyCatRoyale.currentRound}, ${roundResult.eliminated.length} eliminated`);

    instance.phaseTimer = setTimeout(() => {
      ctx.transitionTo(instance, 'royale-elimination');
    }, duration);
  }

  /**
   * Elimination phase for CopyCat Royale (instant)
   * Determines what happens next
   */
  private handleRoyaleElimination(instance: Instance, ctx: PhaseContext): void {
    if (!instance.copyCatRoyale) {
      ctx.transitionTo(instance, 'lobby');
      return;
    }

    // Check if game is over
    if (isGameOver(instance)) {
      ctx.transitionTo(instance, 'royale-winner');
      return;
    }

    // Check if we're entering finale (3 or fewer players)
    if (isInFinale(instance)) {
      instance.copyCatRoyale.isFinale = true;
      const finalists: { playerId: string; user: import('../../types.js').User }[] = [];
      for (const [playerId, status] of instance.copyCatRoyale.playerStatus) {
        if (!status.isEliminated) {
          const player = instance.players.get(playerId);
          if (player) {
            finalists.push({ playerId, user: player.user });
          }
        }
      }
      ctx.emitToInstance(instance, 'royale-finale', {
        finalists: finalists.map((f) => f.user),
        round: instance.copyCatRoyale.currentRound + 1,
      });
    }

    // Advance to next round
    advanceRound(instance);

    // Continue to next round
    ctx.transitionTo(instance, 'royale-show-reference');
  }

  /**
   * Winner phase for CopyCat Royale (15 seconds)
   * Show the winner and final rankings
   */
  private handleRoyaleWinner(instance: Instance, ctx: PhaseContext): void {
    const duration = this.getTimerDuration('royale-winner') ?? 15_000;

    const winner = getWinner(instance);
    const rankings = getRoyaleFinalRankings(instance);
    const totalRounds = instance.copyCatRoyale?.currentRound ?? 0;

    const endsAt = Date.now() + duration;

    // Get winner's last drawing
    const winnerPixels = winner ? getPlayerLastSubmission(instance, winner.playerId) : null;
    const winnerResult = rankings.find((r) => r.finalRank === 1);

    ctx.emitToInstance(instance, 'phase-changed', {
      phase: 'royale-winner',
      duration,
      endsAt,
    });

    ctx.emitToInstance(instance, 'royale-winner', {
      winner: winner?.user ?? { displayName: 'Unknown', discriminator: '0000', fullName: 'Unknown#0000' },
      winnerId: winner?.playerId ?? '',
      winnerPixels: winnerPixels ?? '',
      winningAccuracy: winnerResult?.averageAccuracy ?? 0,
      totalRounds,
      allResults: rankings,
      duration,
      endsAt,
    });

    log('Phase', `CopyCat Royale winner: ${winner?.user.displayName ?? 'none'}`);

    // Clean up state
    cleanupCopyCatRoyaleState(instance);

    // Return spectators to players for next game
    for (const [id, spectator] of instance.spectators) {
      instance.players.set(id, spectator);
    }
    instance.spectators.clear();

    instance.phaseTimer = setTimeout(() => {
      ctx.resetForNextRound(instance);
      ctx.transitionTo(instance, 'lobby');
    }, duration);
  }
}
