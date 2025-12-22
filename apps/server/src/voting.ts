// apps/server/src/voting.ts
import type { Instance, Submission, Vote, VotingAssignment } from './types.js';
import { ELO, VOTING } from './constants.js';
import { shuffleArray, log } from './utils.js';

// === Voting State ===
export interface VotingState {
  voterSeenImages: Map<string, Set<string>>; // voterId -> seen imageIds
  imageShowCount: Map<string, number>; // imageId -> how often shown
  matchupHistory: Map<string, Set<string>>; // imageId -> who has faced
  eloRatings: Map<string, number>; // imageId -> Elo rating
  assignments: VotingAssignment[]; // Current round assignments
  currentRound: number;
  totalRounds: number;
  finaleVotes: Map<string, number>; // playerId -> vote count
  finalists: FinalistData[];
  votersVoted: Set<string>; // Track who voted this round
}

export interface FinalistData {
  playerId: string;
  pixels: string;
  elo: number;
}

/**
 * Initializes the voting state for an instance
 */
export function initVotingState(submissions: Submission[]): VotingState {
  const state: VotingState = {
    voterSeenImages: new Map(),
    imageShowCount: new Map(),
    matchupHistory: new Map(),
    eloRatings: new Map(),
    assignments: [],
    currentRound: 0,
    totalRounds: 0,
    finaleVotes: new Map(),
    finalists: [],
    votersVoted: new Set(),
  };

  // All images start with same Elo
  for (const sub of submissions) {
    state.eloRatings.set(sub.playerId, ELO.START_RATING);
    state.imageShowCount.set(sub.playerId, 0);
    state.matchupHistory.set(sub.playerId, new Set());
  }

  // Calculate number of rounds
  state.totalRounds = calculateVotingRounds(submissions.length);

  return state;
}

/**
 * Calculates the optimal number of voting rounds
 */
export function calculateVotingRounds(playerCount: number): number {
  // Maximum: Each sees each other image only 1x
  const maxPossibleRounds = Math.floor((playerCount - 1) / 2);

  // Desired rounds based on player count
  let desiredRounds: number;
  if (playerCount <= 10) desiredRounds = 3;
  else if (playerCount <= 20) desiredRounds = 4;
  else if (playerCount <= 30) desiredRounds = 5;
  else if (playerCount <= 50) desiredRounds = 6;
  else desiredRounds = 7;

  return Math.max(VOTING.MIN_ROUNDS, Math.min(maxPossibleRounds, desiredRounds));
}

/**
 * Calculates the number of finalists
 */
export function calculateFinalistCount(playerCount: number): number {
  // 10% of players, minimum 3, maximum 10
  return Math.min(10, Math.max(3, Math.ceil(playerCount * 0.1)));
}

// === Elo-Berechnung ===

interface EloResult {
  winnerNewElo: number;
  loserNewElo: number;
  winnerChange: number;
  loserChange: number;
}

/**
 * Calculates new Elo values after a duel
 */
export function calculateElo(winnerElo: number, loserElo: number): EloResult {
  // Expected win probability
  const expectedWinner = 1 / (1 + Math.pow(10, (loserElo - winnerElo) / 400));

  // Points change
  const winnerChange = Math.round(ELO.K_FACTOR * (1 - expectedWinner));
  const loserChange = -winnerChange;

  return {
    winnerNewElo: winnerElo + winnerChange,
    loserNewElo: loserElo + loserChange,
    winnerChange,
    loserChange,
  };
}

// === Assignment-Algorithmus ===

/**
 * Prepares the assignments for a voting round
 */
export function prepareVotingRound(
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

// === Vote-Verarbeitung ===

interface VoteResult {
  success: boolean;
  error?: string;
  eloChange?: { winner: number; loser: number };
}

/**
 * Processes a single vote
 */
export function processVote(
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
  const winnerElo = state.eloRatings.get(winnerId) || ELO.START_RATING;
  const loserElo = state.eloRatings.get(loserId) || ELO.START_RATING;

  const result = calculateElo(winnerElo, loserElo);

  // Update Elo
  state.eloRatings.set(winnerId, result.winnerNewElo);
  state.eloRatings.set(loserId, result.loserNewElo);

  // Save vote
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

/**
 * Processes a finale vote
 */
export function processFinaleVote(
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

// === Ranking ===

export interface RankedPlayer {
  playerId: string;
  elo: number;
  finalVotes: number;
  place: number;
}

/**
 * Creates the final ranking
 */
export function calculateFinalRanking(
  submissions: Submission[],
  state: VotingState
): RankedPlayer[] {
  const ranked = submissions.map((sub) => ({
    playerId: sub.playerId,
    elo: state.eloRatings.get(sub.playerId) || ELO.START_RATING,
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

// === Fairness-Check ===

export interface FairnessReport {
  isFair: boolean;
  variance: number;
  min: number;
  max: number;
  avg: number;
}

/**
 * Checks if all images were shown fairly often
 */
export function validateFairness(state: VotingState): FairnessReport {
  const showCounts = [...state.imageShowCount.values()];

  if (showCounts.length === 0) {
    return { isFair: true, variance: 0, min: 0, max: 0, avg: 0 };
  }

  const min = Math.min(...showCounts);
  const max = Math.max(...showCounts);
  const avg = showCounts.reduce((a, b) => a + b, 0) / showCounts.length;

  return {
    isFair: max - min <= 2, // Max 2 Differenz erlaubt
    variance: max - min,
    min,
    max,
    avg: Math.round(avg * 10) / 10,
  };
}

/**
 * Checks if all votes for a round are in
 */
export function isRoundComplete(state: VotingState): boolean {
  return state.assignments.length === 0;
}

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
