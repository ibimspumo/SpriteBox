// apps/server/src/gameModes/zombiePixel/types.ts

import type { User } from '../../types.js';

/**
 * Position on the 50x50 grid
 */
export interface ZombiePosition {
  x: number;
  y: number;
}

/**
 * Direction for movement (including diagonals)
 */
export type ZombieDirection = 'up' | 'down' | 'left' | 'right' | 'up-left' | 'up-right' | 'down-left' | 'down-right';

/**
 * Player/Bot in the Zombie Pixel game
 */
export interface ZombiePixelPlayer {
  id: string;
  sessionId: string;
  user: User;
  isBot: boolean;
  isZombie: boolean;
  position: ZombiePosition;
  isAlive: boolean;          // false = infected (now a zombie)
  infectedAt?: number;       // Timestamp when infected
  infectedBy?: string;       // ID of the zombie who infected this player
  lastMoveAt: number;        // For movement cooldown
}

/**
 * Infection event for the log
 */
export interface ZombieInfectionEvent {
  timestamp: number;
  victimId: string;
  victimName: string;
  zombieId: string;
  zombieName: string;
  survivorsRemaining: number;
}

/**
 * Stats shown at end of game
 */
export interface ZombiePixelStats {
  totalInfections: number;
  gameDuration: number;
  firstInfectionTime: number | null;
  mostInfections: {
    playerId: string;
    name: string;
    count: number;
  } | null;
  longestSurvivor: {
    playerId: string;
    name: string;
    survivalTime: number;
  } | null;
}

/**
 * Winner information
 */
export interface ZombiePixelWinner {
  id: string;
  name: string;
  isBot: boolean;
  survivalTime: number;
}

/**
 * Game state stored on the instance
 */
export interface ZombiePixelState {
  gridWidth: 50;
  gridHeight: 50;
  players: Map<string, ZombiePixelPlayer>;
  gameStartTime: number;
  gameEndTime?: number;
  tickInterval?: ReturnType<typeof setInterval>;
  winner?: ZombiePixelWinner;
  infectionLog: ZombieInfectionEvent[];
  // Movement cooldown: 100ms (10 moves per second)
  moveCooldown: 100;
  // Game tick rate: 50ms (20 ticks per second)
  tickRate: 50;
}

/**
 * Player data sent to clients (minimal for performance)
 */
export interface ZombiePixelPlayerClient {
  id: string;
  name: string;
  x: number;
  y: number;
  isZombie: boolean;
  isBot: boolean;
}

/**
 * Constants for the game
 */
export const ZOMBIE_PIXEL_CONSTANTS = {
  GRID_SIZE: 50,
  MAX_PLAYERS: 100,
  MOVE_COOLDOWN_MS: 100,      // 10 moves per second
  TICK_RATE_MS: 50,           // 20 ticks per second
  GAME_DURATION_MS: 60_000,   // 60 seconds
  ZOMBIES_PER_PLAYERS: 10,    // 1 zombie per 10 players (up to 10 zombies with 100 players)
  MIN_ZOMBIES: 1,
  BOT_SIGHT_RANGE: 15,        // Bots can "see" 15 tiles (for 50x50 grid)
  BOT_RANDOM_MOVE_CHANCE: 0.1, // 10% chance for random move
} as const;
