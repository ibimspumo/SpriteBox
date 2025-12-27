// packages/types/src/phase.ts
// Phase state types for session restoration

import type { User } from './user.js';
import type { CopyCatResultEntry } from './modes/copycat.js';
import type { PixelGuesserScoreEntry } from './modes/pixelGuesser.js';

/**
 * Timer information for phases
 */
export interface PhaseTimer {
  duration: number;
  endsAt: number;
}

/**
 * Voting assignment data for session restore
 */
export interface VotingAssignmentData {
  imageA: { playerId: string; pixels: string };
  imageB: { playerId: string; pixels: string };
}

/**
 * Finalist data for session restore
 */
export interface FinalistData {
  playerId: string;
  pixels: string;
  elo: number;
}

/**
 * Flat phase state with all possible properties optional.
 * Used on the client for session restoration where the phase
 * is already known from context.
 */
export interface PhaseStateFlat {
  phase?: string;
  timer?: PhaseTimer;
  // Drawing phase
  hasSubmitted?: boolean;
  submissionCount?: number;
  // Voting phase
  currentRound?: number;
  totalRounds?: number;
  hasVoted?: boolean;
  votingAssignment?: VotingAssignmentData;
  // Finale phase
  finalists?: Array<FinalistData & { user?: User }>;
  finaleVoted?: boolean;
  // CopyCat mode
  referenceImage?: string;
  playerResults?: CopyCatResultEntry[];
  winner?: CopyCatResultEntry;
  isDraw?: boolean;
  votes?: { playerId: string; wantsRematch: boolean }[];
  // PixelGuesser mode
  round?: number;
  artistId?: string;
  isYouArtist?: boolean;
  secretPrompt?: string;
  currentDrawing?: string;
  hasGuessedCorrectly?: boolean;
  correctGuessers?: { playerId: string; user: User; position: number }[];
  scores?: PixelGuesserScoreEntry[];
  artistPixels?: string;
}

/**
 * Discriminated union of all phase states
 * Used for session restoration
 */
export type PhaseState =
  | { phase: 'lobby' }
  | { phase: 'countdown' }
  | { phase: 'results' }
  | {
      phase: 'drawing';
      timer?: PhaseTimer;
      hasSubmitted: boolean;
      submissionCount: number;
    }
  | {
      phase: 'voting';
      timer?: PhaseTimer;
      currentRound: number;
      totalRounds: number;
      hasVoted: boolean;
      votingAssignment?: VotingAssignmentData;
    }
  | {
      phase: 'finale';
      timer?: PhaseTimer;
      finalists: FinalistData[];
      finaleVoted: boolean;
    }
  // CopyCat mode phases
  | {
      phase: 'memorize';
      timer?: PhaseTimer;
      referenceImage: string;
    }
  | {
      phase: 'copycat-result';
      referenceImage: string;
      playerResults: CopyCatResultEntry[];
      winner?: CopyCatResultEntry;
      isDraw: boolean;
    }
  | {
      phase: 'copycat-rematch';
      timer?: PhaseTimer;
      votes: { playerId: string; wantsRematch: boolean }[];
    }
  // PixelGuesser mode phases
  | {
      phase: 'guessing';
      timer?: PhaseTimer;
      round: number;
      totalRounds: number;
      artistId: string;
      isYouArtist: boolean;
      secretPrompt?: string;          // Only for artist
      currentDrawing: string;
      hasGuessedCorrectly: boolean;
      correctGuessers: { playerId: string; user: User; position: number }[];
    }
  | {
      phase: 'reveal';
      timer?: PhaseTimer;
      secretPrompt: string;
      artistPixels: string;
      scores: PixelGuesserScoreEntry[];
    };
