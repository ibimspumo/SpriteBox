// apps/server/src/lobby/index.ts

/**
 * Lobby Strategy System
 *
 * Provides LobbyStrategy instances based on instance type (public/private)
 * and game mode. Each combination can have different lobby behavior.
 */

import type { Instance } from '../types.js';
import type { LobbyStrategy } from './types.js';
import { gameModes } from '../gameModes/index.js';
import { StandardLobbyStrategy } from './strategies/StandardLobbyStrategy.js';
import { PrivateLobbyStrategy } from './strategies/PrivateLobbyStrategy.js';
import { CopyCatLobbyStrategy } from './strategies/CopyCatLobbyStrategy.js';
import { CopyCatSoloLobbyStrategy } from './strategies/CopyCatSoloLobbyStrategy.js';
import { ZombiePixelLobbyStrategy } from './strategies/ZombiePixelLobbyStrategy.js';

// Re-export types
export type {
  LobbyStrategy,
  JoinResult,
  StartResult,
  LobbyTimerConfig,
} from './types.js';

// Re-export strategies
export { StandardLobbyStrategy } from './strategies/StandardLobbyStrategy.js';
export { PrivateLobbyStrategy } from './strategies/PrivateLobbyStrategy.js';
export { CopyCatLobbyStrategy } from './strategies/CopyCatLobbyStrategy.js';
export { CopyCatSoloLobbyStrategy } from './strategies/CopyCatSoloLobbyStrategy.js';
export { ZombiePixelLobbyStrategy } from './strategies/ZombiePixelLobbyStrategy.js';

// Cache strategies by key (gameMode:instanceType)
const lobbyStrategyCache = new Map<string, LobbyStrategy>();

/**
 * Get the cache key for an instance
 */
function getCacheKey(gameModeId: string, instanceType: 'public' | 'private'): string {
  return `${gameModeId}:${instanceType}`;
}

/**
 * Get or create a LobbyStrategy for an instance
 */
export function getLobbyStrategy(instance: Instance): LobbyStrategy {
  return getLobbyStrategyFor(instance.gameMode, instance.type);
}

/**
 * Get or create a LobbyStrategy for a specific game mode and instance type
 */
export function getLobbyStrategyFor(
  gameModeId: string,
  instanceType: 'public' | 'private'
): LobbyStrategy {
  const cacheKey = getCacheKey(gameModeId, instanceType);

  // Check cache first
  if (lobbyStrategyCache.has(cacheKey)) {
    return lobbyStrategyCache.get(cacheKey)!;
  }

  // Get config and create appropriate strategy
  const config = gameModes.get(gameModeId);

  let strategy: LobbyStrategy;

  // CopyCat mode uses its own strategy for both public and private
  if (gameModeId === 'copy-cat') {
    strategy = new CopyCatLobbyStrategy(config);
  } else if (gameModeId === 'copy-cat-solo') {
    // CopyCat Solo uses its own single-player strategy
    strategy = new CopyCatSoloLobbyStrategy(config);
  } else if (gameModeId === 'pixel-guesser') {
    // PixelGuesser uses standard strategies (auto-start with threshold)
    if (instanceType === 'private') {
      strategy = new PrivateLobbyStrategy(config);
    } else {
      strategy = new StandardLobbyStrategy(config);
    }
  } else if (gameModeId === 'zombie-pixel') {
    // ZombiePixel uses its own strategy for bot-filling behavior
    strategy = new ZombiePixelLobbyStrategy(config);
  } else if (instanceType === 'private') {
    strategy = new PrivateLobbyStrategy(config);
  } else {
    strategy = new StandardLobbyStrategy(config);
  }

  // Cache for reuse
  lobbyStrategyCache.set(cacheKey, strategy);

  return strategy;
}

/**
 * Clear the lobby strategy cache (useful for testing)
 */
export function clearLobbyStrategyCache(): void {
  lobbyStrategyCache.clear();
}
