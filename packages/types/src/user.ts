// packages/types/src/user.ts
// User-related types shared between server and client

/**
 * Represents a user's display identity
 */
export interface User {
  displayName: string;
  discriminator: string;  // 4 digits: "0000" - "9999"
  fullName: string;       // "Name#0000"
}

/**
 * Player in a game instance (server-side only, but type is shared)
 */
export interface Player {
  id: string;
  sessionId: string;
  user: User;
  socketId: string;
  joinedAt: number;
  status: 'connected' | 'disconnected';
  disconnectedAt?: number;
}

/**
 * Persistent stats per game mode (stored in localStorage on client)
 */
export interface GameModeStats {
  gamesPlayed: number;
  wins: number;           // 1st place
  top3: number;           // 1st, 2nd, or 3rd place
  currentWinStreak: number;
  bestWinStreak: number;
  // CopyCat specific
  bestAccuracy?: number;  // Best accuracy percentage (0-100)
}

/**
 * Player stats (legacy/simple format)
 */
export interface PlayerStats {
  gamesPlayed: number;
  placements: {
    1: number;
    2: number;
    3: number;
  };
}
