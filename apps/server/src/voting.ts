// apps/server/src/voting.ts

/**
 * Voting System - Facade for VotingStrategy
 *
 * This file provides backward-compatible exports that delegate to the
 * VotingStrategy pattern. New code should import from './voting/index.js' directly.
 *
 * The actual voting logic is implemented in:
 * - voting/strategies/EloVotingStrategy.ts (standard Elo-based voting)
 * - voting/strategies/NoVotingStrategy.ts (for modes without voting)
 */

import type { Instance, Submission, VotingAssignment } from './types.js';

// Re-export types from the new voting module
export type {
  VotingStrategy,
  VotingState,
  VoteResult,
  RankedPlayer,
  FairnessReport,
  FinalistData,
} from './voting/index.js';

// Re-export factory functions
export { getVotingStrategy, getVotingStrategyForMode, hasVotingEnabled } from './voting/index.js';

// Re-export strategies for direct access
export { EloVotingStrategy } from './voting/index.js';
export { NoVotingStrategy } from './voting/index.js';

// Import for internal use
import { getVotingStrategy, getVotingStrategyForMode } from './voting/index.js';
import type { VotingState, VoteResult, RankedPlayer, FairnessReport } from './voting/index.js';

// ============================================================================
// Backward-compatible function exports
// These delegate to the VotingStrategy for the instance's game mode
// ============================================================================

/**
 * Initializes the voting state for an instance
 * @deprecated Use getVotingStrategy(instance).initialize() instead
 */
export function initVotingState(submissions: Submission[], instance?: Instance): VotingState | null {
  // If instance provided, use strategy pattern
  if (instance) {
    const strategy = getVotingStrategy(instance);
    return strategy.initialize(submissions);
  }

  // Fallback: use default pixel-battle mode strategy
  const strategy = getVotingStrategyForMode('pixel-battle');
  return strategy.initialize(submissions);
}

/**
 * Calculates the optimal number of voting rounds
 * @deprecated Use getVotingStrategy(instance).calculateRounds() instead
 */
export function calculateVotingRounds(playerCount: number, instance?: Instance): number {
  if (instance) {
    const strategy = getVotingStrategy(instance);
    return strategy.calculateRounds(playerCount);
  }

  // Fallback: use default pixel-battle mode strategy
  const strategy = getVotingStrategyForMode('pixel-battle');
  return strategy.calculateRounds(playerCount);
}

/**
 * Calculates the number of finalists
 * @deprecated Use getVotingStrategy(instance).calculateFinalistCount() instead
 */
export function calculateFinalistCount(playerCount: number, instance?: Instance): number {
  if (instance) {
    const strategy = getVotingStrategy(instance);
    return strategy.calculateFinalistCount(playerCount);
  }

  // Fallback: use default pixel-battle mode strategy
  const strategy = getVotingStrategyForMode('pixel-battle');
  return strategy.calculateFinalistCount(playerCount);
}

/**
 * Prepares the assignments for a voting round
 * @deprecated Use getVotingStrategy(instance).prepareRound() instead
 */
export function prepareVotingRound(
  instance: Instance,
  state: VotingState,
  roundNumber: number
): VotingAssignment[] {
  const strategy = getVotingStrategy(instance);
  return strategy.prepareRound(instance, state, roundNumber);
}

/**
 * Processes a single vote
 * @deprecated Use getVotingStrategy(instance).processVote() instead
 */
export function processVote(
  instance: Instance,
  state: VotingState,
  voterId: string,
  chosenImageId: string
): VoteResult {
  const strategy = getVotingStrategy(instance);
  return strategy.processVote(instance, state, voterId, chosenImageId);
}

/**
 * Processes a finale vote
 * @deprecated Use getVotingStrategy(instance).processFinaleVote() instead
 */
export function processFinaleVote(
  state: VotingState,
  voterId: string,
  chosenPlayerId: string,
  instance?: Instance
): VoteResult {
  if (instance) {
    const strategy = getVotingStrategy(instance);
    return strategy.processFinaleVote(state, voterId, chosenPlayerId);
  }

  // Fallback: use default pixel-battle mode strategy
  const strategy = getVotingStrategyForMode('pixel-battle');
  return strategy.processFinaleVote(state, voterId, chosenPlayerId);
}

/**
 * Creates the final ranking
 * @deprecated Use getVotingStrategy(instance).calculateRanking() instead
 */
export function calculateFinalRanking(
  submissions: Submission[],
  state: VotingState,
  instance?: Instance
): RankedPlayer[] {
  if (instance) {
    const strategy = getVotingStrategy(instance);
    return strategy.calculateRanking(submissions, state);
  }

  // Fallback: use default pixel-battle mode strategy
  const strategy = getVotingStrategyForMode('pixel-battle');
  return strategy.calculateRanking(submissions, state);
}

/**
 * Checks if all images were shown fairly often
 * @deprecated Use getVotingStrategy(instance).validateFairness() instead
 */
export function validateFairness(state: VotingState, instance?: Instance): FairnessReport {
  if (instance) {
    const strategy = getVotingStrategy(instance);
    return strategy.validateFairness(state);
  }

  // Fallback: use default pixel-battle mode strategy
  const strategy = getVotingStrategyForMode('pixel-battle');
  return strategy.validateFairness(state);
}

/**
 * Checks if all votes for a round are in
 * @deprecated Use getVotingStrategy(instance).isRoundComplete() instead
 */
export function isRoundComplete(state: VotingState, instance?: Instance): boolean {
  if (instance) {
    const strategy = getVotingStrategy(instance);
    return strategy.isRoundComplete(state);
  }

  // Fallback: use default pixel-battle mode strategy
  const strategy = getVotingStrategyForMode('pixel-battle');
  return strategy.isRoundComplete(state);
}

// ============================================================================
// Utility functions (not strategy-specific)
// ============================================================================

/**
 * Gets the number of pending votes
 */
export function getPendingVoteCount(state: VotingState): number {
  return state.assignments.length;
}

/**
 * Gets vote count for current round
 */
export function getVoteStats(state: VotingState, totalVoters: number): { received: number; total: number } {
  return {
    received: state.votersVoted.size,
    total: totalVoters,
  };
}
