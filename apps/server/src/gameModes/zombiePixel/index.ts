// apps/server/src/gameModes/zombiePixel/index.ts

/**
 * Zombie Pixel Game Mode Module
 *
 * This module provides the bot AI system for the Zombie Pixel game mode.
 * Bots are designed to look like real players using the same naming system
 * and have AI logic for chasing (zombies) or fleeing (survivors).
 *
 * Usage:
 * ```typescript
 * import { ZombieBotManager, ZOMBIE_PIXEL_CONSTANTS } from './gameModes/zombiePixel/index.js';
 *
 * // Create bot manager
 * const botManager = new ZombieBotManager();
 *
 * // Create bots to fill the game
 * const bots = botManager.createBots(30, playerPositions);
 *
 * // Update bots each tick
 * const movements = botManager.updateBots(allPlayers);
 * ```
 */

// Re-export types
export type {
  ZombiePosition,
  ZombieDirection,
  ZombiePixelPlayer,
  ZombieInfectionEvent,
  ZombiePixelStats,
  ZombiePixelWinner,
  ZombiePixelState,
  ZombiePixelPlayerClient,
  ZombieItemClient,
  ZombieEffectClient,
} from './types.js';

export { ZOMBIE_PIXEL_CONSTANTS } from './types.js';

// Re-export bot classes
export { ZombiePixelBot } from './bot.js';
export { ZombieBotManager } from './botManager.js';

// Re-export item system
export {
  ItemSystemManager,
  ITEM_DEFINITIONS,
  type ItemDefinition,
  type SpawnedItem,
  type ActiveEffect,
  type ItemVisibility,
  type ItemEffectType,
  type EffectDuration,
  type ItemSystemState,
} from './itemSystem.js';

// Re-export game loop functions
export {
  initializeZombiePixelState,
  assignZombieRoles,
  startGameLoop,
  stopGameLoop,
  handlePlayerMove,
  checkGameTimeout,
  cleanupZombiePixelState,
} from './gameLoop.js';
