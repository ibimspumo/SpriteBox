// apps/server/src/voting/types.ts

/**
 * VotingStrategy Interface
 *
 * Defines the contract for different voting systems in game modes.
 * Each game mode can use a different voting strategy (Elo, simple vote, none).
 */

import type { Instance, Submission, VotingAssignment } from '../types.js';

/**
 * State maintained during voting phase
 */
export interface VotingState {
  /** Tracks which images each voter has seen */
  voterSeenImages: Map<string, Set<string>>;
  /** Tracks how often each image was shown */
  imageShowCount: Map<string, number>;
  /** Tracks which images have faced each other */
  matchupHistory: Map<string, Set<string>>;
  /** Current Elo ratings for each image */
  eloRatings: Map<string, number>;
  /** Current round's voting assignments */
  assignments: VotingAssignment[];
  /** Current round number (1-indexed) */
  currentRound: number;
  /** Total number of voting rounds */
  totalRounds: number;
  /** Finale vote counts per player */
  finaleVotes: Map<string, number>;
  /** Finalist data for finale phase */
  finalists: FinalistData[];
  /** Tracks who has voted in current round */
  votersVoted: Set<string>;
}

/**
 * Finalist data for finale phase
 */
export interface FinalistData {
  playerId: string;
  pixels: string;
  elo: number;
}

/**
 * Result of processing a vote
 */
export interface VoteResult {
  success: boolean;
  error?: string;
  eloChange?: {
    winner: number;
    loser: number;
  };
}

/**
 * Ranked player after voting
 */
export interface RankedPlayer {
  playerId: string;
  elo: number;
  finalVotes: number;
  place: number;
}

/**
 * Fairness report for voting distribution
 */
export interface FairnessReport {
  isFair: boolean;
  variance: number;
  min: number;
  max: number;
  avg: number;
}

/**
 * VotingStrategy interface
 *
 * Implementations handle different voting systems:
 * - EloVotingStrategy: Elo-based pairwise voting
 * - NoVotingStrategy: For modes without voting
 */
export interface VotingStrategy {
  /**
   * Check if voting is enabled for this strategy
   */
  isEnabled(): boolean;

  /**
   * Initialize voting state for an instance
   * Returns null if voting is not applicable
   */
  initialize(submissions: Submission[]): VotingState | null;

  /**
   * Calculate the number of voting rounds
   */
  calculateRounds(submissionCount: number): number;

  /**
   * Prepare assignments for a voting round
   */
  prepareRound(
    instance: Instance,
    state: VotingState,
    roundNumber: number
  ): VotingAssignment[];

  /**
   * Process a single vote
   */
  processVote(
    instance: Instance,
    state: VotingState,
    voterId: string,
    chosenImageId: string
  ): VoteResult;

  /**
   * Process a finale vote
   */
  processFinaleVote(
    state: VotingState,
    voterId: string,
    chosenPlayerId: string
  ): VoteResult;

  /**
   * Calculate the final ranking
   */
  calculateRanking(submissions: Submission[], state: VotingState): RankedPlayer[];

  /**
   * Validate fairness of vote distribution
   */
  validateFairness(state: VotingState): FairnessReport;

  /**
   * Check if all votes for current round are in
   */
  isRoundComplete(state: VotingState): boolean;

  /**
   * Calculate number of finalists
   */
  calculateFinalistCount(submissionCount: number): number;
}
