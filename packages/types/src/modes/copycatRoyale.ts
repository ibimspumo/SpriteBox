// packages/types/src/modes/copycatRoyale.ts
// CopyCat Royale (Battle Royale) game mode types

import type { User } from '../user.js';

/**
 * CopyCat Royale game state stored on instance
 */
export interface CopyCatRoyaleState {
  imagePool: RoyalePoolImage[];                // All images in the pool
  usedImageIds: Set<string>;                   // Images already used as reference
  currentReferenceImage: RoyalePoolImage | null;
  eliminationBracket: EliminationBracket[];    // Pre-calculated bracket
  currentRound: number;                        // 0 = initial drawing, 1+ = copy rounds
  roundResults: Map<number, RoyaleRoundResult>;
  playerStatus: Map<string, RoyalePlayerStatus>;
  isFinale: boolean;
  drawStartTime?: number;
}

/**
 * An image in the pool (from initial drawing phase)
 */
export interface RoyalePoolImage {
  id: string;
  pixels: string;                              // 64-char hex string
  creatorId: string;
  creatorName: string;
}

/**
 * Elimination bracket entry
 */
export interface EliminationBracket {
  round: number;
  playersStart: number;
  playersEnd: number;
  eliminateCount: number;
}

/**
 * Player's status throughout the game
 */
export interface RoyalePlayerStatus {
  isEliminated: boolean;
  eliminatedInRound: number | null;
  totalAccuracy: number;                       // Sum of all accuracies
  roundsPlayed: number;
  submissions: Map<number, RoyalePlayerSubmission>;
}

/**
 * A player's submission for a round
 */
export interface RoyalePlayerSubmission {
  pixels: string;
  accuracy: number;
  matchingPixels: number;
  submitTime: number;
}

/**
 * Result of a single round
 */
export interface RoyaleRoundResult {
  round: number;
  referenceImage: RoyalePoolImage;
  results: RoyalePlayerRoundResult[];
  eliminated: string[];                        // Player IDs eliminated this round
}

/**
 * Individual player's result for a round
 */
export interface RoyalePlayerRoundResult {
  playerId: string;
  user: User;
  pixels: string;
  accuracy: number;
  matchingPixels: number;
  submitTime: number;
  wasEliminated: boolean;
  finalRank?: number;                          // Final placement (for eliminated players)
}

/**
 * Final ranking entry
 */
export interface RoyaleFinalRanking {
  playerId: string;
  user: User;
  finalRank: number;
  eliminatedInRound: number | null;            // null if winner
  averageAccuracy: number;
  totalRoundsPlayed: number;
}

// Event data types for socket events

/**
 * Initial drawing phase event data
 */
export interface RoyaleInitialDrawingData {
  duration: number;
  endsAt: number;
}

/**
 * Show reference image event data
 */
export interface RoyaleShowReferenceData {
  referenceImage: string;
  imageCreator: string;
  round: number;
  totalRounds: number;
  remainingPlayers: number;
  duration: number;
  endsAt: number;
}

/**
 * Drawing phase event data
 */
export interface RoyaleDrawingData {
  round: number;
  duration: number;
  endsAt: number;
}

/**
 * Round results event data
 */
export interface RoyaleRoundResultsData {
  round: number;
  referenceImage: string;
  results: RoyalePlayerRoundResult[];
  eliminated: string[];
  surviving: string[];
  eliminationThreshold: number;
  duration: number;
  endsAt: number;
}

/**
 * Player eliminated event data
 */
export interface RoyalePlayerEliminatedData {
  playerId: string;
  user: User;
  round: number;
  accuracy: number;
  finalRank: number;
}

/**
 * Finale event data
 */
export interface RoyaleFinaleData {
  finalists: User[];
  round: number;
}

/**
 * Winner event data
 */
export interface RoyaleWinnerData {
  winner: User;
  winnerId: string;
  winnerPixels: string;
  winningAccuracy: number;
  totalRounds: number;
  allResults: RoyaleFinalRanking[];
  duration: number;
  endsAt: number;
}

/**
 * You were eliminated event data
 */
export interface RoyaleYouEliminatedData {
  round: number;
  accuracy: number;
  finalRank: number;
  totalPlayers: number;
}
