// apps/server/src/phases/strategies/StandardPhaseManager.ts

/**
 * StandardPhaseManager - Default implementation for standard game modes
 *
 * Handles the standard phase flow:
 * lobby -> countdown -> drawing -> voting -> finale -> results -> lobby
 *
 * This is used for 'pixel-battle' and similar modes with Elo voting.
 */

import type { PhaseManager, PhaseContext, PhaseHandleResult } from '../types.js';
import type { Instance, GamePhase, RankingEntry } from '../../types.js';
import type { GameModeConfig } from '../../gameModes/types.js';
import { log } from '../../utils.js';
import { TIMERS } from '../../constants.js';
import { generatePromptIndices, assemblePromptFromIndices } from '../../prompts.js';
import {
  initVotingState,
  prepareVotingRound,
  calculateFinalRanking,
  validateFairness,
  isRoundComplete,
  type VotingState,
} from '../../voting.js';
import { compressIfNeeded } from '../../compression.js';
import { shouldCompress } from '../../gameModes/index.js';
import { cleanupInstance } from '../../instance.js';

// Voting-State per instance
const votingStates = new Map<string, VotingState>();

// Phase timing for anti-cheat
interface PhaseTimings {
  phaseStartedAt: number;
  phaseEndsAt: number;
}

const instanceTimings = new Map<string, PhaseTimings>();

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

  // ============================================
  // HANDLER METHODS
  // ============================================

  /**
   * Initialize the game state for this mode
   * Called when the game starts (before countdown)
   */
  initializeGame(instance: Instance, _ctx: PhaseContext): boolean {
    // Generate prompt indices for client-side localization
    instance.promptIndices = generatePromptIndices();
    // Also generate the English text for server logging
    instance.prompt = assemblePromptFromIndices(instance.promptIndices);

    log('Phase', `[StandardPhaseManager] Prompt: "${instance.prompt.prefix} ${instance.prompt.subject} ${instance.prompt.suffix}"`);

    return true;
  }

  /**
   * Get the first phase after countdown for this mode
   */
  getPhaseAfterCountdown(_instance: Instance): GamePhase | null {
    return 'drawing';
  }

  /**
   * Handle a specific phase
   */
  handlePhase(instance: Instance, phase: GamePhase, ctx: PhaseContext): PhaseHandleResult {
    switch (phase) {
      case 'drawing':
        return this.handleDrawing(instance, ctx);
      case 'voting':
        return this.handleVoting(instance, ctx);
      case 'finale':
        return this.handleFinale(instance, ctx);
      case 'results':
        return this.handleResults(instance, ctx);
      default:
        return { handled: false };
    }
  }

  /**
   * Handle submission for this game mode
   */
  handleSubmission(
    instance: Instance,
    playerId: string,
    pixels: string,
    _ctx: PhaseContext
  ): boolean {
    // Check if player already submitted
    const existingSubmission = instance.submissions.find((s) => s.playerId === playerId);
    if (existingSubmission) {
      log('Phase', `[StandardPhaseManager] Player ${playerId} already submitted`);
      return false;
    }

    // Add submission
    instance.submissions.push({
      playerId,
      pixels,
      timestamp: Date.now(),
    });

    log('Phase', `[StandardPhaseManager] Submission received from ${playerId} (${instance.submissions.length} total)`);

    return true;
  }

  /**
   * Cleanup game state when returning to lobby
   */
  cleanup(instance: Instance): void {
    // Clean up voting state for this instance
    votingStates.delete(instance.id);
    instanceTimings.delete(instance.id);

    log('Phase', `[StandardPhaseManager] Cleaned up state for instance ${instance.id}`);
  }

  // ============================================
  // PRIVATE HELPER METHODS
  // ============================================

  /**
   * Sets phase timing for anti-cheat validation
   */
  private setPhaseTimings(instanceId: string, duration: number): void {
    instanceTimings.set(instanceId, {
      phaseStartedAt: Date.now(),
      phaseEndsAt: Date.now() + duration,
    });
  }

  /**
   * Handle drawing phase (30s default)
   */
  private handleDrawing(instance: Instance, ctx: PhaseContext): PhaseHandleResult {
    const duration = this.getTimerDuration('drawing') ?? TIMERS.DRAWING;

    // Reset submissions
    instance.submissions = [];

    // Set phase timing for anti-cheat
    this.setPhaseTimings(instance.id, duration);
    ctx.setPhaseTimings(instance.id, duration);

    const endsAt = Date.now() + duration;

    ctx.emitToInstance(instance, 'phase-changed', {
      phase: 'drawing',
      prompt: instance.prompt,
      promptIndices: instance.promptIndices,
      duration,
      endsAt,
    });

    // Timer to end drawing phase
    instance.phaseTimer = setTimeout(() => {
      this.endDrawingPhase(instance, ctx);
    }, duration);

    log('Phase', `[StandardPhaseManager] Drawing phase started for instance ${instance.id}`);

    return { handled: true };
  }

  /**
   * Ends the drawing phase
   */
  private endDrawingPhase(instance: Instance, ctx: PhaseContext): void {
    // Players who didn't submit -> move to spectators
    const submittedIds = new Set(instance.submissions.map((s) => s.playerId));

    for (const [playerId, player] of instance.players) {
      if (!submittedIds.has(playerId)) {
        log('Phase', `[StandardPhaseManager] ${player.user.fullName} didn't submit, moving to spectators`);
        instance.spectators.set(playerId, player);
        instance.players.delete(playerId);
      }
    }

    log('Phase', `[StandardPhaseManager] Drawing ended for ${instance.id}: ${instance.submissions.length} valid submissions`);

    // Determine next phase
    const nextPhase = this.getPhaseAfterDrawing(instance);
    ctx.transitionTo(instance, nextPhase);
  }

  /**
   * Handle voting phase
   */
  private handleVoting(instance: Instance, ctx: PhaseContext): PhaseHandleResult {
    // Initialize voting state using the instance's game mode
    const state = initVotingState(instance.submissions, instance);

    // If no voting for this game mode, skip to results
    if (!state) {
      log('Phase', '[StandardPhaseManager] No voting for this game mode, skipping to results');
      ctx.transitionTo(instance, 'results');
      return { handled: true };
    }

    votingStates.set(instance.id, state);

    log('Phase', `[StandardPhaseManager] Voting started with ${state.totalRounds} rounds for ${instance.submissions.length} submissions`);

    // Start first round
    this.startVotingRound(instance, state, 1, ctx);

    return { handled: true };
  }

  /**
   * Starts a voting round
   */
  private startVotingRound(instance: Instance, state: VotingState, roundNumber: number, ctx: PhaseContext): void {
    const duration = this.getTimerDuration('voting') ?? TIMERS.VOTING_ROUND;

    log('Phase', `[StandardPhaseManager] Voting round ${roundNumber}/${state.totalRounds}`);

    // Set phase timing for anti-cheat
    this.setPhaseTimings(instance.id, duration);
    ctx.setPhaseTimings(instance.id, duration);

    // Calculate assignments
    const assignments = prepareVotingRound(instance, state, roundNumber);

    // Calculate endsAt once to ensure consistency
    const endsAt = Date.now() + duration;

    // Send phase-changed FIRST (race condition fix)
    ctx.emitToInstance(instance, 'phase-changed', {
      phase: 'voting',
      round: roundNumber,
      totalRounds: state.totalRounds,
      duration,
      endsAt,
    });

    // Send individual voting-round events to each player
    for (const assignment of assignments) {
      const imageA = instance.submissions.find((s) => s.playerId === assignment.imageA);
      const imageB = instance.submissions.find((s) => s.playerId === assignment.imageB);

      if (!imageA || !imageB) continue;

      const player = instance.players.get(assignment.voterId) || instance.spectators.get(assignment.voterId);
      if (player && ctx.io) {
        ctx.io.to(player.socketId).emit('voting-round', {
          round: roundNumber,
          totalRounds: state.totalRounds,
          imageA: { playerId: imageA.playerId, pixels: imageA.pixels },
          imageB: { playerId: imageB.playerId, pixels: imageB.pixels },
          timeLimit: duration,
          endsAt,
        });
      }
    }

    // Timer for round end
    instance.phaseTimer = setTimeout(() => {
      this.endVotingRound(instance, state, roundNumber, ctx);
    }, duration);
  }

  /**
   * Ends a voting round
   */
  private endVotingRound(instance: Instance, state: VotingState, roundNumber: number, ctx: PhaseContext): void {
    const fairness = validateFairness(state, instance);
    log(
      'Phase',
      `[StandardPhaseManager] Voting round ${roundNumber} ended. Fairness: ${fairness.isFair ? 'OK' : 'WARN'} (${fairness.min}-${fairness.max})`
    );

    if (roundNumber < state.totalRounds) {
      // Next round
      this.startVotingRound(instance, state, roundNumber + 1, ctx);
    } else {
      // Voting ended -> Finale (or results if no finale)
      const nextPhase = this.getPhaseAfterVoting(instance);
      ctx.transitionTo(instance, nextPhase);
    }
  }

  /**
   * Handle finale phase
   */
  private handleFinale(instance: Instance, ctx: PhaseContext): PhaseHandleResult {
    const duration = this.getTimerDuration('finale') ?? TIMERS.FINALE;

    const state = votingStates.get(instance.id);
    if (!state) {
      log('Phase', '[StandardPhaseManager] No voting state found, skipping to results');
      ctx.transitionTo(instance, 'results');
      return { handled: true };
    }

    // Set phase timing for anti-cheat
    this.setPhaseTimings(instance.id, duration);
    ctx.setPhaseTimings(instance.id, duration);

    const finalistCount = this.calculateFinalistCount(instance.submissions.length);

    // Select top X by Elo
    const sorted = [...state.eloRatings.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, finalistCount);

    const finalists = sorted.map(([playerId, elo]) => {
      const submission = instance.submissions.find((s) => s.playerId === playerId);
      const player = instance.players.get(playerId) || instance.spectators.get(playerId);
      return {
        playerId,
        pixels: submission?.pixels || '',
        user: player?.user || { displayName: 'Unknown', discriminator: '0000', fullName: 'Unknown#0000' },
        elo,
      };
    });

    log('Phase', `[StandardPhaseManager] Finale with ${finalists.length} finalists`);

    // Initialize finale votes
    state.finaleVotes.clear();
    state.finalists = finalists.map((f) => ({ playerId: f.playerId, pixels: f.pixels, elo: f.elo }));
    state.votersVoted.clear();
    finalists.forEach((f) => state.finaleVotes.set(f.playerId, 0));

    const endsAt = Date.now() + duration;

    ctx.emitToInstance(instance, 'finale-start', {
      finalists,
      timeLimit: duration,
      endsAt,
    });

    ctx.emitToInstance(instance, 'phase-changed', {
      phase: 'finale',
      duration,
      endsAt,
    });

    instance.phaseTimer = setTimeout(() => {
      this.endFinale(instance, ctx);
    }, duration);

    return { handled: true };
  }

  /**
   * Ends the finale and calculates results
   */
  private endFinale(instance: Instance, ctx: PhaseContext): void {
    const state = votingStates.get(instance.id);
    if (!state) {
      ctx.transitionTo(instance, 'results');
      return;
    }

    const ranking = calculateFinalRanking(instance.submissions, state, instance);

    log('Phase', `[StandardPhaseManager] Finale ended. Winner: ${ranking[0]?.playerId || 'none'}`);

    // Show results with ranking
    this.handleResultsWithRanking(instance, ranking, ctx);
  }

  /**
   * Handle results phase
   */
  private handleResults(instance: Instance, ctx: PhaseContext): PhaseHandleResult {
    const duration = this.getTimerDuration('results') ?? TIMERS.RESULTS;

    // Simple ranking by submission order (fallback when no voting)
    const rankings: RankingEntry[] = instance.submissions.map((sub, index) => {
      const player = instance.players.get(sub.playerId) || instance.spectators.get(sub.playerId);
      return {
        place: index + 1,
        playerId: sub.playerId,
        user: player?.user || { displayName: 'Unknown', discriminator: '0000', fullName: 'Unknown#0000' },
        pixels: sub.pixels,
        finalVotes: 0,
        elo: 1000,
      };
    });

    ctx.emitToInstance(instance, 'phase-changed', {
      phase: 'results',
      duration,
    });

    ctx.emitToInstance(instance, 'game-results', {
      prompt: instance.prompt,
      promptIndices: instance.promptIndices,
      rankings,
      totalParticipants: instance.submissions.length,
    });

    // Make spectators players for next round
    for (const [id, spectator] of instance.spectators) {
      instance.players.set(id, spectator);
    }
    instance.spectators.clear();

    // After results: Reset for next round
    instance.phaseTimer = setTimeout(() => {
      this.resetForNextRound(instance, ctx);
    }, duration);

    return { handled: true };
  }

  /**
   * Results with ranking (after voting/finale)
   */
  private handleResultsWithRanking(
    instance: Instance,
    ranking: ReturnType<typeof calculateFinalRanking>,
    ctx: PhaseContext
  ): void {
    const duration = this.getTimerDuration('results') ?? TIMERS.RESULTS;

    instance.phase = 'results';

    const results: RankingEntry[] = ranking.map((r) => {
      const submission = instance.submissions.find((s) => s.playerId === r.playerId);
      const player = instance.players.get(r.playerId) || instance.spectators.get(r.playerId);
      return {
        place: r.place,
        playerId: r.playerId,
        user: player?.user || { displayName: 'Unknown', discriminator: '0000', fullName: 'Unknown#0000' },
        pixels: submission?.pixels || '',
        finalVotes: r.finalVotes,
        elo: r.elo,
      };
    });

    ctx.emitToInstance(instance, 'phase-changed', {
      phase: 'results',
      duration,
    });

    // Use compression for large galleries (based on game mode config)
    const playerCount = instance.submissions.length;
    const useCompression = shouldCompress(instance, playerCount);
    const compressedRankings = useCompression ? compressIfNeeded(results, playerCount) : { compressed: false, data: '' };

    ctx.emitToInstance(instance, 'game-results', {
      prompt: instance.prompt,
      promptIndices: instance.promptIndices,
      rankings: compressedRankings.compressed ? [] : results, // Send empty if compressed
      compressedRankings: compressedRankings.compressed ? compressedRankings.data : undefined,
      totalParticipants: instance.submissions.length,
    });

    if (compressedRankings.compressed) {
      log('Compression', `[StandardPhaseManager] Gallery compressed for ${playerCount} players`);
    }

    // Clean up voting state
    votingStates.delete(instance.id);

    // Spectators to players for next round
    for (const [id, spectator] of instance.spectators) {
      instance.players.set(id, spectator);
    }
    instance.spectators.clear();

    instance.phaseTimer = setTimeout(() => {
      this.resetForNextRound(instance, ctx);
    }, duration);
  }

  /**
   * Reset for next round
   */
  private resetForNextRound(instance: Instance, ctx: PhaseContext): void {
    instance.submissions = [];
    instance.votes = [];
    instance.prompt = undefined;

    // For private instances: check if host is still present
    if (instance.type === 'private' && instance.hostId) {
      const hostStillPresent = instance.players.has(instance.hostId) || instance.spectators.has(instance.hostId);

      if (!hostStillPresent) {
        log('Phase', `[StandardPhaseManager] Host left private instance ${instance.id}, closing room`);

        // Notify all players that the instance is closing
        ctx.emitToInstance(instance, 'instance-closing', { reason: 'host-left' });

        // Clean up the instance
        cleanupInstance(instance);
        return;
      }
    }

    // Clean up manager state
    this.cleanup(instance);

    // Back to lobby
    ctx.resetForNextRound(instance);
    ctx.transitionTo(instance, 'lobby');

    log('Phase', `[StandardPhaseManager] Instance ${instance.id} reset for next round`);
  }

  // ============================================
  // PUBLIC STATIC METHODS FOR EXTERNAL ACCESS
  // ============================================

  /**
   * Get voting state for an instance (used by socket handlers for early end detection)
   */
  static getVotingState(instanceId: string): VotingState | undefined {
    return votingStates.get(instanceId);
  }

  /**
   * Check if all votes are in and trigger early phase end
   * Returns true if early end was triggered
   */
  static checkAndTriggerEarlyVotingEnd(
    instanceId: string,
    instance: Instance,
    manager: StandardPhaseManager,
    ctx: PhaseContext
  ): boolean {
    const state = votingStates.get(instanceId);
    if (!state) return false;

    // Check if all assignments have been processed (all votes received)
    if (!isRoundComplete(state, instance)) {
      return false;
    }

    log('Phase', `[StandardPhaseManager] All votes received for round ${state.currentRound}, ending early`);

    // Clear the phase timer to prevent double-execution
    clearTimeout(instance.phaseTimer);

    // Trigger early end
    if (instance.phase === 'voting') {
      manager.endVotingRound(instance, state, state.currentRound, ctx);
      return true;
    }

    return false;
  }

  /**
   * Check if all finale votes are in and trigger early phase end
   */
  static checkAndTriggerEarlyFinaleEnd(
    instanceId: string,
    instance: Instance,
    totalVoters: number,
    manager: StandardPhaseManager,
    ctx: PhaseContext
  ): boolean {
    const state = votingStates.get(instanceId);
    if (!state) return false;

    // Check if all voters have voted
    if (state.votersVoted.size < totalVoters) {
      return false;
    }

    log('Phase', '[StandardPhaseManager] All finale votes received, ending early');

    // Clear the phase timer
    clearTimeout(instance.phaseTimer);

    // End finale
    manager.endFinale(instance, ctx);
    return true;
  }

  /**
   * Check if an action is within the valid time window
   */
  static isWithinPhaseTime(instanceId: string, gracePeriodMs = 2000): boolean {
    const timings = instanceTimings.get(instanceId);
    if (!timings) return false;

    const now = Date.now();
    return now <= timings.phaseEndsAt + gracePeriodMs;
  }

  /**
   * Get phase timings for anti-bot checks
   */
  static getPhaseTimings(instanceId: string): PhaseTimings | undefined {
    return instanceTimings.get(instanceId);
  }
}
