// packages/types/src/modes/copycat.ts
// CopyCat game mode types

import type { User } from '../user.js';

/**
 * CopyCat game state stored on instance
 */
export interface CopyCatState {
  referenceImage: string;   // 64-char hex string of the image to copy
  referenceImageId?: string; // Optional ID from gallery
  playerResults: Map<string, CopyCatPlayerResult>;
  drawStartTime?: number;   // When drawing phase started (for tie-breaking)
  rematchVotes: Map<string, boolean>;  // playerId -> wants rematch
}

/**
 * Individual player's result in CopyCat
 */
export interface CopyCatPlayerResult {
  playerId: string;
  pixels: string;           // Player's drawing
  accuracy: number;         // 0-100 percentage
  matchingPixels: number;   // Count of matching pixels
  totalPixels: number;      // Total pixels (64)
  submitTime: number;       // Timestamp for tie-breaking
}

/**
 * Result entry for CopyCat results display (includes user info)
 */
export interface CopyCatResultEntry {
  playerId: string;
  user: User;
  pixels: string;
  accuracy: number;
  matchingPixels: number;
  submitTime: number;
}

/**
 * CopyCat results event data
 */
export interface CopyCatResultsData {
  referenceImage: string | null;
  results: CopyCatResultEntry[];
  winner: CopyCatResultEntry | null;
  isDraw: boolean;
  duration: number;
  endsAt: number;
}
