// apps/server/src/phases/strategies/PixelGuesserPhaseManager.ts

/**
 * PixelGuesserPhaseManager - Phase manager for Pixel Guesser (Pictionary) mode
 *
 * Handles the PixelGuesser phase flow:
 * lobby -> countdown -> guessing -> reveal -> (next round) -> ... -> results
 *
 * The 'guessing' phase combines drawing (by artist) and guessing (by others).
 * Each player takes a turn being the artist, so there are N rounds where N = players.
 *
 * This mode has no voting - points are earned by fast correct guesses.
 */

import type { PhaseManager, PhaseContext, PhaseHandleResult } from '../types.js';
import type { Instance, GamePhase } from '../../types.js';
import type { GameModeConfig } from '../../gameModes/types.js';
import { log } from '../../utils.js';
import {
  initializePixelGuesserState,
  advanceToNextRound,
  updateDrawing,
  processGuess,
  allGuessersCorrect,
  endRound,
  getRoundScores,
  getFinalRankings,
  getGameState,
  getCurrentDrawing,
  cleanupPixelGuesserState,
} from '../../pixelGuesser.js';

/** Default guessing phase duration in milliseconds */
const DEFAULT_GUESSING_DURATION = 45_000;

/** Default reveal phase duration in milliseconds */
const DEFAULT_REVEAL_DURATION = 5_000;

/** Default results phase duration in milliseconds */
const DEFAULT_RESULTS_DURATION = 15_000;

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
        return this.config.timers.guessing ?? DEFAULT_GUESSING_DURATION;
      case 'reveal':
        return this.config.timers.reveal ?? DEFAULT_REVEAL_DURATION;
      case 'results':
        return this.config.timers.results ?? DEFAULT_RESULTS_DURATION;
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

  // ============================================
  // HANDLER METHODS
  // ============================================

  /**
   * Initialize the game state for PixelGuesser mode
   * Called when the game starts (before countdown)
   */
  initializeGame(instance: Instance, _ctx: PhaseContext): boolean {
    log('Phase', `Initializing PixelGuesser state for instance ${instance.id}`);
    initializePixelGuesserState(instance);
    return true;
  }

  /**
   * Get the first phase after countdown for PixelGuesser mode
   */
  getPhaseAfterCountdown(_instance: Instance): GamePhase {
    return 'guessing';
  }

  /**
   * Handle PixelGuesser-specific phases
   */
  handlePhase(instance: Instance, phase: GamePhase, ctx: PhaseContext): PhaseHandleResult {
    switch (phase) {
      case 'guessing':
        this.handleGuessing(instance, ctx);
        return { handled: true };
      case 'reveal':
        this.handleReveal(instance, ctx);
        return { handled: true };
      case 'results':
        this.handleResults(instance, ctx);
        return { handled: true };
      default:
        return { handled: false };
    }
  }

  /**
   * Guessing phase - Artist draws while others guess
   *
   * During this phase:
   * - One player is the artist and can draw
   * - All other players try to guess what's being drawn
   * - Points are awarded based on guess speed
   * - Only the artist receives the secret prompt
   */
  private handleGuessing(instance: Instance, ctx: PhaseContext): void {
    const duration = this.getTimerDuration('guessing') ?? DEFAULT_GUESSING_DURATION;

    const state = instance.pixelGuesser;
    if (!state) {
      log('Phase', 'No PixelGuesser state, skipping to results');
      ctx.transitionTo(instance, 'results');
      return;
    }

    // Set phase timing for anti-cheat
    ctx.setPhaseTimings(instance.id, duration);

    const endsAt = Date.now() + duration;
    const gameState = getGameState(instance);

    if (!gameState) {
      log('Phase', 'Failed to get game state');
      ctx.transitionTo(instance, 'results');
      return;
    }

    // Send phase change to all players
    ctx.emitToInstance(instance, 'phase-changed', {
      phase: 'guessing',
      round: gameState.currentRound,
      totalRounds: gameState.totalRounds,
      duration,
      endsAt,
    });

    // Send round start event with role-specific data
    // Only the artist receives the secret prompt
    for (const [playerId, player] of instance.players) {
      const isArtist = playerId === gameState.artistId;

      ctx.io.to(player.socketId).emit('pixelguesser-round-start', {
        round: gameState.currentRound,
        totalRounds: gameState.totalRounds,
        artistId: gameState.artistId,
        artistUser: gameState.artistUser,
        isYouArtist: isArtist,
        // Only send prompt to artist
        secretPrompt: isArtist ? gameState.secretPrompt : undefined,
        secretPromptIndices: isArtist ? gameState.secretPromptIndices : undefined,
        duration,
        endsAt,
      });
    }

    log(
      'Phase',
      `PixelGuesser round ${gameState.currentRound}/${gameState.totalRounds} started, artist: ${gameState.artistId}`
    );

    // Set timer to end guessing phase
    instance.phaseTimer = setTimeout(() => {
      this.endGuessingPhase(instance, ctx);
    }, duration);
  }

  /**
   * End the guessing phase and transition to reveal
   */
  private endGuessingPhase(instance: Instance, ctx: PhaseContext): void {
    endRound(instance);
    log('Phase', `PixelGuesser guessing ended for ${instance.id}`);
    ctx.transitionTo(instance, 'reveal');
  }

  /**
   * Reveal phase - Shows the answer and round scores
   *
   * During this phase:
   * - The secret prompt is revealed to everyone
   * - Round scores are displayed
   * - Advances to next round (countdown) or goes to results
   */
  private handleReveal(instance: Instance, ctx: PhaseContext): void {
    const duration = this.getTimerDuration('reveal') ?? DEFAULT_REVEAL_DURATION;

    const state = instance.pixelGuesser;
    if (!state) {
      log('Phase', 'No PixelGuesser state in reveal, skipping to results');
      ctx.transitionTo(instance, 'results');
      return;
    }

    const scores = getRoundScores(instance);
    const artist = instance.players.get(state.artistId);

    const endsAt = Date.now() + duration;

    // Emit phase change
    ctx.emitToInstance(instance, 'phase-changed', {
      phase: 'reveal',
      duration,
      endsAt,
    });

    // Emit reveal event with scores and answer
    ctx.emitToInstance(instance, 'pixelguesser-reveal', {
      secretPrompt: state.secretPrompt,
      secretPromptIndices: state.secretPromptIndices,
      artistId: state.artistId,
      artistUser: artist?.user || {
        displayName: 'Unknown',
        discriminator: '0000',
        fullName: 'Unknown#0000',
      },
      artistPixels: state.currentDrawing,
      scores,
      duration,
      endsAt,
    });

    log(
      'Phase',
      `PixelGuesser reveal: "${state.secretPrompt}", ${state.correctGuessers.length} correct guesses`
    );

    // Determine next phase after reveal
    instance.phaseTimer = setTimeout(() => {
      const hasMoreRounds = advanceToNextRound(instance);

      if (hasMoreRounds) {
        // More rounds remaining, go back to countdown
        ctx.transitionTo(instance, 'countdown');
      } else {
        // No more rounds, go to final results
        this.handleResults(instance, ctx);
      }
    }, duration);
  }

  /**
   * Results phase - Show final rankings and cleanup
   *
   * During this phase:
   * - Final rankings are displayed
   * - PixelGuesser state is cleaned up
   * - Instance resets for next game
   */
  private handleResults(instance: Instance, ctx: PhaseContext): void {
    const duration = this.getTimerDuration('results') ?? DEFAULT_RESULTS_DURATION;

    const state = instance.pixelGuesser;
    const rankings = getFinalRankings(instance);

    instance.phase = 'results';

    const endsAt = Date.now() + duration;

    // Emit phase change
    ctx.emitToInstance(instance, 'phase-changed', {
      phase: 'results',
      duration,
      endsAt,
    });

    // Emit final results event
    ctx.emitToInstance(instance, 'pixelguesser-final-results', {
      rankings,
      totalRounds: state?.totalRounds || 0,
      duration,
      endsAt,
    });

    log('Phase', `PixelGuesser final results: winner ${rankings[0]?.playerId || 'none'}`);

    // Cleanup PixelGuesser state
    cleanupPixelGuesserState(instance);

    // Return spectators to players for next game
    for (const [id, spectator] of instance.spectators) {
      instance.players.set(id, spectator);
    }
    instance.spectators.clear();

    // Set timer to return to lobby
    instance.phaseTimer = setTimeout(() => {
      ctx.resetForNextRound(instance);
      ctx.transitionTo(instance, 'lobby');
    }, duration);
  }

  /**
   * Handle submission for PixelGuesser mode
   *
   * PixelGuesser doesn't use the standard submission system.
   * Drawing updates are sent in real-time via 'pixelguesser-draw' socket events.
   * This returns false to indicate the submission should not be processed.
   */
  handleSubmission(
    _instance: Instance,
    _playerId: string,
    _pixels: string,
    _ctx: PhaseContext
  ): boolean {
    // PixelGuesser uses real-time drawing updates, not submissions
    // Drawing updates should be handled via handleDrawUpdate method
    return false;
  }

  /**
   * Handle real-time drawing update from the artist
   * Called from the socket handler for 'pixelguesser-draw' events
   *
   * Broadcasts the drawing to all players except the artist
   */
  handleDrawUpdate(
    instance: Instance,
    playerId: string,
    pixels: string,
    ctx: PhaseContext
  ): boolean {
    // Only allow during guessing phase
    if (instance.phase !== 'guessing') {
      return false;
    }

    // Update the drawing state (validates that playerId is the artist)
    const updated = updateDrawing(instance, playerId, pixels);
    if (!updated) {
      return false;
    }

    // Broadcast to all players except the artist
    const drawing = getCurrentDrawing(instance);
    if (drawing) {
      for (const [pid, player] of instance.players) {
        if (pid !== playerId) {
          ctx.io.to(player.socketId).emit('pixelguesser-drawing-update', {
            pixels: drawing,
          });
        }
      }
    }

    return true;
  }

  /**
   * Handle a guess from a player
   * Called from the socket handler for 'pixelguesser-guess' events
   *
   * Returns the result of the guess to send back to the player
   */
  handleGuess(
    instance: Instance,
    playerId: string,
    guessText: string,
    ctx: PhaseContext
  ): { success: boolean; correct: boolean; close: boolean; points: number } {
    // Only allow during guessing phase
    if (instance.phase !== 'guessing') {
      return { success: false, correct: false, close: false, points: 0 };
    }

    // Process the guess
    const result = processGuess(instance, playerId, guessText);

    if (!result.success) {
      return { success: false, correct: false, close: false, points: 0 };
    }

    // Send result to the guesser
    const player = instance.players.get(playerId);
    if (player) {
      ctx.io.to(player.socketId).emit('pixelguesser-guess-result', {
        correct: result.correct,
        close: result.close,
        guess: guessText,
        message: result.close ? 'Close!' : undefined,
      });
    }

    // If correct, broadcast to all players
    if (result.correct) {
      const guesser = instance.players.get(playerId);
      const state = instance.pixelGuesser;
      const remainingGuessers = state
        ? instance.players.size - 1 - state.correctGuessers.length
        : 0;

      ctx.emitToInstance(instance, 'pixelguesser-correct-guess', {
        playerId,
        user: guesser?.user || {
          displayName: 'Unknown',
          discriminator: '0000',
          fullName: 'Unknown#0000',
        },
        points: result.points,
        timeMs: result.timeMs,
        position: result.position,
        remainingGuessers,
      });

      // Check if all guessers have guessed correctly
      if (allGuessersCorrect(instance)) {
        log('Phase', 'All guessers correct, ending guessing phase early');
        clearTimeout(instance.phaseTimer);
        this.endGuessingPhase(instance, ctx);
      }
    }

    return {
      success: true,
      correct: result.correct,
      close: result.close,
      points: result.points,
    };
  }

  /**
   * Cleanup PixelGuesser state when returning to lobby
   */
  cleanup(instance: Instance): void {
    cleanupPixelGuesserState(instance);
  }
}
