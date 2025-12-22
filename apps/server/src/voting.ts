// apps/server/src/voting.ts
import type { Instance, Submission, Vote, VotingAssignment } from './types.js';
import { ELO, VOTING } from './constants.js';
import { shuffleArray, log } from './utils.js';

// === Voting State ===
export interface VotingState {
  voterSeenImages: Map<string, Set<string>>; // voterId -> gesehene imageIds
  imageShowCount: Map<string, number>; // imageId -> wie oft gezeigt
  matchupHistory: Map<string, Set<string>>; // imageId -> gegen wen angetreten
  eloRatings: Map<string, number>; // imageId -> Elo-Rating
  assignments: VotingAssignment[]; // Aktuelle Runden-Assignments
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
 * Initialisiert den Voting-State für eine Instanz
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

  // Alle Bilder starten mit gleichem Elo
  for (const sub of submissions) {
    state.eloRatings.set(sub.playerId, ELO.START_RATING);
    state.imageShowCount.set(sub.playerId, 0);
    state.matchupHistory.set(sub.playerId, new Set());
  }

  // Anzahl Runden berechnen
  state.totalRounds = calculateVotingRounds(submissions.length);

  return state;
}

/**
 * Berechnet die optimale Anzahl Voting-Runden
 */
export function calculateVotingRounds(playerCount: number): number {
  // Maximum: Jeder sieht jedes fremde Bild nur 1x
  const maxPossibleRounds = Math.floor((playerCount - 1) / 2);

  // Gewünschte Runden basierend auf Spielerzahl
  let desiredRounds: number;
  if (playerCount <= 10) desiredRounds = 3;
  else if (playerCount <= 20) desiredRounds = 4;
  else if (playerCount <= 30) desiredRounds = 5;
  else if (playerCount <= 50) desiredRounds = 6;
  else desiredRounds = 7;

  return Math.max(VOTING.MIN_ROUNDS, Math.min(maxPossibleRounds, desiredRounds));
}

/**
 * Berechnet die Anzahl Finalisten
 */
export function calculateFinalistCount(playerCount: number): number {
  // 10% der Spieler, mindestens 3, maximal 10
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
 * Berechnet neue Elo-Werte nach einem Duell
 */
export function calculateElo(winnerElo: number, loserElo: number): EloResult {
  // Erwartete Gewinnwahrscheinlichkeit
  const expectedWinner = 1 / (1 + Math.pow(10, (loserElo - winnerElo) / 400));

  // Punkte-Änderung
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
 * Bereitet die Assignments für eine Voting-Runde vor
 */
export function prepareVotingRound(
  instance: Instance,
  state: VotingState,
  roundNumber: number
): VotingAssignment[] {
  const submissions = instance.submissions;
  const assignments: VotingAssignment[] = [];

  // Alle aktiven Voter (Spieler + Spectators)
  const voterIds = [...instance.players.keys(), ...instance.spectators.keys()];

  // Zufällige Reihenfolge für Fairness
  const shuffledVoters = shuffleArray(voterIds);

  for (const voterId of shuffledVoters) {
    const seen = state.voterSeenImages.get(voterId) || new Set<string>();

    // Eigenes Bild ausschließen
    seen.add(voterId);

    // Verfügbare Bilder, sortiert nach wenigsten Anzeigen
    const available = submissions
      .filter((s) => !seen.has(s.playerId))
      .map((s) => ({
        playerId: s.playerId,
        showCount: state.imageShowCount.get(s.playerId) || 0,
      }))
      .sort((a, b) => a.showCount - b.showCount);

    if (available.length < 2) {
      continue; // Voter überspringt diese Runde
    }

    // Bestes Paar finden (noch nicht gegeneinander angetreten)
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

    // Fallback: Die zwei mit wenigsten Anzeigen
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

    // State aktualisieren
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
 * Verarbeitet einen einzelnen Vote
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

  // Assignment finden
  const assignment = state.assignments.find((a) => a.voterId === voterId);

  if (!assignment) {
    return { success: false, error: 'No assignment found' };
  }

  // Gültige Wahl?
  if (chosenImageId !== assignment.imageA && chosenImageId !== assignment.imageB) {
    return { success: false, error: 'Invalid choice' };
  }

  const winnerId = chosenImageId;
  const loserId = winnerId === assignment.imageA ? assignment.imageB : assignment.imageA;

  // Elo berechnen
  const winnerElo = state.eloRatings.get(winnerId) || ELO.START_RATING;
  const loserElo = state.eloRatings.get(loserId) || ELO.START_RATING;

  const result = calculateElo(winnerElo, loserElo);

  // Elo aktualisieren
  state.eloRatings.set(winnerId, result.winnerNewElo);
  state.eloRatings.set(loserId, result.loserNewElo);

  // Vote speichern
  instance.votes.push({
    voterId,
    winnerId,
    loserId,
    round: assignment.round,
    timestamp: Date.now(),
  });

  // Mark as voted
  state.votersVoted.add(voterId);

  // Assignment entfernen (wurde verarbeitet)
  state.assignments = state.assignments.filter((a) => a.voterId !== voterId);

  return {
    success: true,
    eloChange: { winner: result.winnerChange, loser: result.loserChange },
  };
}

/**
 * Verarbeitet einen Finale-Vote
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
 * Erstellt das finale Ranking
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

  // Sortieren: Finale-Votes > Elo
  ranked.sort((a, b) => {
    if (a.finalVotes !== b.finalVotes) {
      return b.finalVotes - a.finalVotes;
    }
    return b.elo - a.elo;
  });

  // Platzierungen vergeben (mit Ties)
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
 * Prüft ob alle Bilder fair oft gezeigt wurden
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
