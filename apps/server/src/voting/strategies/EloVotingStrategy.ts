// apps/server/src/voting/strategies/EloVotingStrategy.ts

/**
 * EloVotingStrategy - Elo-based pairwise voting system
 *
 * This is the standard voting strategy used in pixel-battle mode.
 * Players vote between pairs of images, and Elo ratings determine rankings.
 */

import type { VotingStrategy, VotingState, VoteResult, RankedPlayer, FairnessReport, FinalistData } from '../types.js';
import type { Instance, Submission, VotingAssignment } from '../../types.js';
import type { VotingConfig, EloConfig, FinaleConfig } from '../../gameModes/types.js';
import { shuffleArray } from '../../utils.js';

/**
 * Default Elo configuration
 */
const DEFAULT_ELO: EloConfig = {
  startRating: 1000,
  kFactor: 32,
};

/**
 * Default finale configuration
 */
const DEFAULT_FINALE: FinaleConfig = {
  enabled: true,
  finalistPercent: 0.1,
  minFinalists: 3,
  maxFinalists: 10,
};

export class EloVotingStrategy implements VotingStrategy {
  private eloConfig: EloConfig;
  private finaleConfig: FinaleConfig;
  private roundsConfig: {
    min: number;
    max: number;
    calculateRounds: (count: number) => number;
  };

  constructor(votingConfig: VotingConfig) {
    this.eloConfig = votingConfig.elo ?? DEFAULT_ELO;
    this.finaleConfig = votingConfig.finale ?? DEFAULT_FINALE;
    this.roundsConfig = votingConfig.rounds ?? {
      min: 2,
      max: 7,
      calculateRounds: this.defaultCalculateRounds.bind(this),
    };
  }

  isEnabled(): boolean {
    return true;
  }

  initialize(submissions: Submission[]): VotingState {
    const state: VotingState = {
      voterSeenImages: new Map(),
      imageShowCount: new Map(),
      matchupHistory: new Map(),
      eloRatings: new Map(),
      assignments: [],
      currentRound: 0,
      totalRounds: this.calculateRounds(submissions.length),
      finaleVotes: new Map(),
      finalists: [],
      votersVoted: new Set(),
    };

    // All images start with same Elo
    for (const sub of submissions) {
      state.eloRatings.set(sub.playerId, this.eloConfig.startRating);
      state.imageShowCount.set(sub.playerId, 0);
      state.matchupHistory.set(sub.playerId, new Set());
    }

    return state;
  }

  calculateRounds(submissionCount: number): number {
    return this.roundsConfig.calculateRounds(submissionCount);
  }

  private defaultCalculateRounds(playerCount: number): number {
    const maxPossibleRounds = Math.floor((playerCount - 1) / 2);

    let desiredRounds: number;
    if (playerCount <= 10) desiredRounds = 3;
    else if (playerCount <= 20) desiredRounds = 4;
    else if (playerCount <= 30) desiredRounds = 5;
    else if (playerCount <= 50) desiredRounds = 6;
    else desiredRounds = 7;

    return Math.max(this.roundsConfig.min, Math.min(maxPossibleRounds, desiredRounds));
  }

  prepareRound(
    instance: Instance,
    state: VotingState,
    roundNumber: number
  ): VotingAssignment[] {
    const submissions = instance.submissions;
    const assignments: VotingAssignment[] = [];

    // All active voters (players + spectators)
    const voterIds = [...instance.players.keys(), ...instance.spectators.keys()];

    // Random order for fairness
    const shuffledVoters = shuffleArray(voterIds);

    for (const voterId of shuffledVoters) {
      const seen = state.voterSeenImages.get(voterId) || new Set<string>();

      // Exclude own image
      seen.add(voterId);

      // Available images, sorted by fewest displays
      const available = submissions
        .filter((s) => !seen.has(s.playerId))
        .map((s) => ({
          playerId: s.playerId,
          showCount: state.imageShowCount.get(s.playerId) || 0,
        }))
        .sort((a, b) => a.showCount - b.showCount);

      if (available.length < 2) {
        continue; // Voter skips this round
      }

      // Find best pair (haven't faced each other yet)
      let bestPair: [string, string] | null = null;

      for (let i = 0; i < available.length && !bestPair; i++) {
        for (let j = i + 1; j < available.length; j++) {
          const a = available[i].playerId;
          const b = available[j].playerId;

          const aMatchups = state.matchupHistory.get(a) || new Set();

          if (!aMatchups.has(b)) {
            bestPair = [a, b];
            break;
          }
        }
      }

      // Fallback: The two with fewest displays
      if (!bestPair) {
        bestPair = [available[0].playerId, available[1].playerId];
      }

      const [imageA, imageB] = bestPair;

      assignments.push({
        voterId,
        imageA,
        imageB,
        round: roundNumber,
      });

      // Update state
      seen.add(imageA);
      seen.add(imageB);
      state.voterSeenImages.set(voterId, seen);

      state.imageShowCount.set(imageA, (state.imageShowCount.get(imageA) || 0) + 1);
      state.imageShowCount.set(imageB, (state.imageShowCount.get(imageB) || 0) + 1);

      state.matchupHistory.get(imageA)!.add(imageB);
      state.matchupHistory.get(imageB)!.add(imageA);
    }

    state.assignments = assignments;
    state.currentRound = roundNumber;
    state.votersVoted.clear(); // Reset for new round

    return assignments;
  }

  processVote(
    instance: Instance,
    state: VotingState,
    voterId: string,
    chosenImageId: string
  ): VoteResult {
    // Already voted this round?
    if (state.votersVoted.has(voterId)) {
      return { success: false, error: 'Already voted this round' };
    }

    // Find assignment
    const assignment = state.assignments.find((a) => a.voterId === voterId);

    if (!assignment) {
      return { success: false, error: 'No assignment found' };
    }

    // Valid choice?
    if (chosenImageId !== assignment.imageA && chosenImageId !== assignment.imageB) {
      return { success: false, error: 'Invalid choice' };
    }

    const winnerId = chosenImageId;
    const loserId = winnerId === assignment.imageA ? assignment.imageB : assignment.imageA;

    // Calculate Elo
    const winnerElo = state.eloRatings.get(winnerId) || this.eloConfig.startRating;
    const loserElo = state.eloRatings.get(loserId) || this.eloConfig.startRating;

    const result = this.calculateElo(winnerElo, loserElo);

    // Update Elo
    state.eloRatings.set(winnerId, result.winnerNewElo);
    state.eloRatings.set(loserId, result.loserNewElo);

    // Save vote to instance
    instance.votes.push({
      voterId,
      winnerId,
      loserId,
      round: assignment.round,
      timestamp: Date.now(),
    });

    // Mark as voted
    state.votersVoted.add(voterId);

    // Remove assignment (was processed)
    state.assignments = state.assignments.filter((a) => a.voterId !== voterId);

    return {
      success: true,
      eloChange: { winner: result.winnerChange, loser: result.loserChange },
    };
  }

  processFinaleVote(
    state: VotingState,
    voterId: string,
    chosenPlayerId: string
  ): VoteResult {
    // Already voted in finale?
    if (state.votersVoted.has(voterId)) {
      return { success: false, error: 'Already voted in finale' };
    }

    // Can't vote for self
    if (chosenPlayerId === voterId) {
      return { success: false, error: 'Cannot vote for yourself' };
    }

    // Must be a finalist
    if (!state.finalists.some((f) => f.playerId === chosenPlayerId)) {
      return { success: false, error: 'Invalid finalist' };
    }

    // Count vote
    state.finaleVotes.set(chosenPlayerId, (state.finaleVotes.get(chosenPlayerId) || 0) + 1);
    state.votersVoted.add(voterId);

    return { success: true };
  }

  calculateRanking(submissions: Submission[], state: VotingState): RankedPlayer[] {
    const ranked = submissions.map((sub) => ({
      playerId: sub.playerId,
      elo: state.eloRatings.get(sub.playerId) || this.eloConfig.startRating,
      finalVotes: state.finaleVotes.get(sub.playerId) || 0,
      place: 0,
    }));

    // Sort: Finale votes > Elo
    ranked.sort((a, b) => {
      if (a.finalVotes !== b.finalVotes) {
        return b.finalVotes - a.finalVotes;
      }
      return b.elo - a.elo;
    });

    // Assign placements (with ties)
    let currentPlace = 1;
    for (let i = 0; i < ranked.length; i++) {
      if (i > 0) {
        const prev = ranked[i - 1];
        const curr = ranked[i];
        if (curr.finalVotes !== prev.finalVotes || curr.elo !== prev.elo) {
          currentPlace = i + 1;
        }
      }
      ranked[i].place = currentPlace;
    }

    return ranked;
  }

  validateFairness(state: VotingState): FairnessReport {
    const showCounts = [...state.imageShowCount.values()];

    if (showCounts.length === 0) {
      return { isFair: true, variance: 0, min: 0, max: 0, avg: 0 };
    }

    const min = Math.min(...showCounts);
    const max = Math.max(...showCounts);
    const avg = showCounts.reduce((a, b) => a + b, 0) / showCounts.length;

    return {
      isFair: max - min <= 2,
      variance: max - min,
      min,
      max,
      avg: Math.round(avg * 10) / 10,
    };
  }

  isRoundComplete(state: VotingState): boolean {
    return state.assignments.length === 0;
  }

  calculateFinalistCount(submissionCount: number): number {
    const { finalistPercent, minFinalists, maxFinalists } = this.finaleConfig;
    return Math.min(maxFinalists, Math.max(minFinalists, Math.ceil(submissionCount * finalistPercent)));
  }

  /**
   * Calculate Elo rating changes
   */
  private calculateElo(winnerElo: number, loserElo: number): {
    winnerNewElo: number;
    loserNewElo: number;
    winnerChange: number;
    loserChange: number;
  } {
    // Expected win probability
    const expectedWinner = 1 / (1 + Math.pow(10, (loserElo - winnerElo) / 400));

    // Points change
    const winnerChange = Math.round(this.eloConfig.kFactor * (1 - expectedWinner));
    const loserChange = -winnerChange;

    return {
      winnerNewElo: winnerElo + winnerChange,
      loserNewElo: loserElo + loserChange,
      winnerChange,
      loserChange,
    };
  }
}
