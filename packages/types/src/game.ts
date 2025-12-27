// packages/types/src/game.ts
// Core game types shared between server and client

import type { User, Player } from './user.js';
import type { Prompt, PromptIndices } from './prompt.js';
import type { CopyCatState } from './modes/copycat.js';
import type { PixelGuesserState } from './modes/pixelGuesser.js';
import type { CopyCatRoyaleState } from './modes/copycatRoyale.js';

/**
 * Instance type: public (auto-matched) or private (room code)
 */
export type InstanceType = 'public' | 'private';

/**
 * All possible game phases across all game modes
 */
export type GamePhase =
  | 'lobby'
  | 'countdown'
  | 'drawing'
  | 'voting'
  | 'finale'
  | 'results'
  // CopyCat mode phases
  | 'memorize'
  | 'copycat-result'
  | 'copycat-rematch'
  // PixelGuesser mode phases
  | 'guessing'
  | 'reveal'
  // PixelSurvivor mode phases (single-player roguelike)
  | 'survivor-menu'
  | 'survivor-character'
  | 'survivor-day-start'
  | 'survivor-event'
  | 'survivor-drawing'
  | 'survivor-result'
  | 'survivor-levelup'
  | 'survivor-gameover'
  | 'survivor-victory'
  // ZombiePixel mode phases (real-time infection)
  | 'active'
  // CopyCat Royale mode phases (battle royale)
  | 'royale-initial-drawing'
  | 'royale-show-reference'
  | 'royale-drawing'
  | 'royale-results'
  | 'royale-elimination'
  | 'royale-winner';

/**
 * A game instance (room)
 */
export interface Instance {
  id: string;
  type: InstanceType;
  gameMode: string;       // Game mode ID (e.g., 'pixel-battle')
  code?: string;          // Only for private rooms
  hostId?: string;        // Only for private rooms
  passwordHash?: string;  // Optional password for private rooms
  phase: GamePhase;
  players: Map<string, Player>;
  spectators: Map<string, Player>;
  submissions: Submission[];
  votes: Vote[];
  prompt?: Prompt;
  promptIndices?: PromptIndices;  // For client-side localization
  createdAt: number;
  lastActivity: number;
  lobbyTimer?: ReturnType<typeof setTimeout>;
  lobbyTimerEndsAt?: number;  // When the lobby timer ends (for late joiners)
  phaseTimer?: ReturnType<typeof setTimeout>;
  // CopyCat mode fields
  copyCat?: CopyCatState;
  // PixelGuesser mode fields
  pixelGuesser?: PixelGuesserState;
  // ZombiePixel mode fields (uses dynamic import in types.ts)
  zombiePixel?: unknown;
  // CopyCat Royale mode fields
  copyCatRoyale?: CopyCatRoyaleState;
}

/**
 * A drawing submission
 */
export interface Submission {
  playerId: string;
  pixels: string;         // 64-character hex string
  timestamp: number;
}

/**
 * A vote in the voting phase
 */
export interface Vote {
  voterId: string;
  winnerId: string;
  loserId: string;
  round: number;
  timestamp: number;
}

/**
 * Voting assignment for a player
 */
export interface VotingAssignment {
  voterId: string;
  imageA: string;         // playerId
  imageB: string;         // playerId
  round: number;
}

/**
 * Image data for voting
 */
export interface ImageData {
  playerId: string;
  pixels: string;
}

/**
 * Finalist entry for finale phase
 */
export interface FinalistEntry {
  playerId: string;
  pixels: string;
  user?: User;  // Optional for session restore compatibility
  elo: number;
}

/**
 * Final ranking entry
 */
export interface RankingEntry {
  place: number;
  playerId: string;
  user: User;
  pixels: string;
  finalVotes: number;
  elo: number;
}
