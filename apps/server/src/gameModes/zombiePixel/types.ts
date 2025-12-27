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
  hasHealingItem: boolean;   // Player has collected healing item
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
  gridWidth: 32;
  gridHeight: 32;
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
  // Dynamic game duration (can be extended by infections)
  gameDurationMs: number;
  // Timer extensions from infections
  timerExtensionsMs: number;
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
  hasHealingItem: boolean;
}

/**
 * Item data sent to clients
 */
export interface ZombieItemClient {
  id: string;
  type: string;       // Item definition ID
  x: number;
  y: number;
  icon: string;       // Icon name from pixelarticons
  color: string;      // Hex color
}

/**
 * Active effect data sent to clients
 */
export interface ZombieEffectClient {
  id: string;
  type: string;           // Effect type
  affectedId: string;     // Player ID or 'zombies'/'survivors'
  expiresAt: number | null;
  remainingUses: number | null;
}

/**
 * Constants for the game
 */
export const ZOMBIE_PIXEL_CONSTANTS = {
  GRID_SIZE: 32,
  MAX_PLAYERS: 100,
  MOVE_COOLDOWN_MS: 100,      // 10 moves per second
  TICK_RATE_MS: 50,           // 20 ticks per second
  GAME_DURATION_MS: 30_000,   // 30 seconds base (extended by +1s per infection)
  ZOMBIES_PER_PLAYERS: 10,    // 1 zombie per 10 players (up to 10 zombies with 100 players)
  MIN_ZOMBIES: 1,
  BOT_SIGHT_RANGE: 10,        // Bots can "see" 10 tiles (for 32x32 grid)
  BOT_RANDOM_MOVE_CHANCE: 0.1, // 10% chance for random move
  // Speed settings (lower = faster, represents ticks between moves)
  ZOMBIE_BASE_SPEED: 5,       // Zombies move every 5 ticks (250ms)
  SURVIVOR_BASE_SPEED: 7,     // Survivors move every 7 ticks (350ms)
  ZOMBIE_BOOST_SPEED: 2,      // Zombies with boost move every 2 ticks (+3 speed = 5-3=2)
  // Item settings
  SPEED_BOOST_DURATION_MS: 5000, // 5 seconds
  ITEM_SPAWN_MIN_MS: 5000,    // Min time between item spawns
  ITEM_SPAWN_MAX_MS: 15000,   // Max time between item spawns
  TIMER_EXTENSION_MS: 1000,   // +1 second on infection
} as const;
