// apps/server/src/voting/strategies/NoVotingStrategy.ts

/**
 * NoVotingStrategy - For game modes without voting
 *
 * Used in modes like solo practice or 1v1 duels where voting is not needed.
 * All voting-related methods return no-op results.
 */

import type { VotingStrategy, VotingState, VoteResult, RankedPlayer, FairnessReport } from '../types.js';
import type { Instance, Submission, VotingAssignment } from '../../types.js';

export class NoVotingStrategy implements VotingStrategy {
  isEnabled(): boolean {
    return false;
  }

  initialize(_submissions: Submission[]): null {
    // No voting state needed
    return null;
  }

  calculateRounds(_submissionCount: number): number {
    return 0;
  }

  prepareRound(
    _instance: Instance,
    _state: VotingState,
    _roundNumber: number
  ): VotingAssignment[] {
    // No assignments needed
    return [];
  }

  processVote(
    _instance: Instance,
    _state: VotingState,
    _voterId: string,
    _chosenImageId: string
  ): VoteResult {
    return {
      success: false,
      error: 'Voting is not available in this game mode',
    };
  }

  processFinaleVote(
    _state: VotingState,
    _voterId: string,
    _chosenPlayerId: string
  ): VoteResult {
    return {
      success: false,
      error: 'Voting is not available in this game mode',
    };
  }

  calculateRanking(submissions: Submission[], _state: VotingState): RankedPlayer[] {
    // Simple ranking by submission order
    return submissions.map((sub, index) => ({
      playerId: sub.playerId,
      elo: 1000,
      finalVotes: 0,
      place: index + 1,
    }));
  }

  validateFairness(_state: VotingState): FairnessReport {
    return {
      isFair: true,
      variance: 0,
      min: 0,
      max: 0,
      avg: 0,
    };
  }

  isRoundComplete(_state: VotingState): boolean {
    return true;
  }

  calculateFinalistCount(_submissionCount: number): number {
    return 0;
  }
}
