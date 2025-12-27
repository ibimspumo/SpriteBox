// packages/types/src/modes/pixelGuesser.ts
// PixelGuesser game mode types

import type { User } from '../user.js';
import type { PromptIndices } from '../prompt.js';

/**
 * PixelGuesser game state stored on instance
 */
export interface PixelGuesserState {
  currentRound: number;           // Current round (1-based)
  totalRounds: number;            // Total rounds (= number of players)
  artistOrder: string[];          // Player IDs in drawing order
  artistId: string;               // Current artist's player ID
  secretPrompt: string;           // The word to draw (English)
  secretPromptDe: string;         // The word to draw (German) - for multilingual matching
  secretPromptIndices?: PromptIndices; // For localization
  currentDrawing: string;         // Artist's current pixel data (streamed live)
  guesses: Map<string, PixelGuesserGuess[]>; // playerId -> their guesses
  correctGuessers: string[];      // Player IDs who guessed correctly (in order)
  scores: Map<string, number>;    // playerId -> total score
  roundStartTime: number;         // When drawing started (for time-based scoring)
  roundEnded: boolean;            // Whether round ended early (all guessed)
}

/**
 * A guess attempt
 */
export interface PixelGuesserGuess {
  text: string;                   // The guess text
  timestamp: number;              // When guessed
  correct: boolean;               // Whether it was correct
}

/**
 * Score entry for leaderboard
 */
export interface PixelGuesserScoreEntry {
  playerId: string;
  user: User;
  score: number;
  roundScore: number;             // Points earned this round
  wasArtist: boolean;
  guessedCorrectly: boolean;
  guessTime?: number;             // Time in ms to guess (if correct)
}

/**
 * Round start event data
 */
export interface PixelGuesserRoundStartData {
  round: number;
  totalRounds: number;
  artistId: string;
  artistUser: User;
  isYouArtist: boolean;
  secretPrompt?: string;           // Only sent to artist
  secretPromptIndices?: PromptIndices; // Only sent to artist
  duration: number;
  endsAt: number;
}

/**
 * Correct guess event data
 */
export interface PixelGuesserCorrectGuessData {
  playerId: string;
  user: User;
  points: number;
  timeMs: number;                 // How fast they guessed
  position: number;               // 1st, 2nd, 3rd...
  remainingGuessers: number;
}

/**
 * Reveal event data (end of round)
 */
export interface PixelGuesserRevealData {
  secretPrompt: string;
  secretPromptIndices?: PromptIndices;
  artistId: string;
  artistUser: User;
  artistPixels: string;
  scores: PixelGuesserScoreEntry[];
  duration: number;
  endsAt: number;
}

/**
 * Final results event data
 */
export interface PixelGuesserFinalResultsData {
  rankings: PixelGuesserScoreEntry[];
  totalRounds: number;
  duration: number;
  endsAt: number;
}
