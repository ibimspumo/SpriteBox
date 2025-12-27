// apps/server/src/gameModes/index.ts

/**
 * Game Mode System
 *
 * This module provides the infrastructure for multiple game modes in SpriteBox.
 * Each game mode defines its own configuration including player limits, phases,
 * timers, voting rules, and more.
 *
 * Usage:
 * ```typescript
 * import { gameModes, initializeGameModes } from './gameModes/index.js';
 *
 * // Initialize at server startup
 * initializeGameModes();
 *
 * // Get a mode config
 * const config = gameModes.get('pixel-battle');
 * console.log(config.players.min); // 5
 * ```
 */

// Re-export types
export type {
  GameModeConfig,
  GameModeInfo,
  GameModeTimers,
  PlayerLimits,
  LobbyConfig,
  VotingConfig,
  EloConfig,
  VotingRoundsConfig,
  FinaleConfig,
  CanvasConfig,
  RoomConfig,
  CompressionConfig,
} from './types.js';

export { toGameModeInfo } from './types.js';

// Re-export registry
export { GameModeRegistry, gameModes } from './registry.js';

// Re-export modes
export { pixelBattleMode } from './modes/pixelBattle.js';
export { copyCatMode } from './modes/copyCat.js';
export { copyCatSoloMode } from './modes/copyCatSolo.js';
export { pixelGuesserMode } from './modes/pixelGuesser.js';
export { zombiePixelMode } from './modes/zombiePixel.js';
export { pixelSurvivorMode } from './modes/pixelSurvivor.js';
export { copyCatRoyaleMode } from './modes/copyCatRoyale.js';

// Re-export helpers
export {
  getInstanceConfig,
  getPlayerLimits,
  getLobbyConfig,
  getVotingConfig,
  getCanvasConfig,
  getTimerDuration,
  hasVoting,
  hasFinale,
  getLobbyAutoStartThreshold,
  allowsLateJoin,
  allowsSpectators,
  getEloConfig,
  calculateVotingRounds,
  calculateFinalistCount,
  shouldCompress,
} from './helpers.js';

// Import for initialization
import { gameModes } from './registry.js';
import { pixelBattleMode } from './modes/pixelBattle.js';
import { copyCatMode } from './modes/copyCat.js';
import { copyCatSoloMode } from './modes/copyCatSolo.js';
import { pixelGuesserMode } from './modes/pixelGuesser.js';
import { zombiePixelMode } from './modes/zombiePixel.js';
import { pixelSurvivorMode } from './modes/pixelSurvivor.js';
import { copyCatRoyaleMode } from './modes/copyCatRoyale.js';
import { log } from '../utils.js';

/**
 * Initialize all game modes.
 * Must be called once at server startup before any game logic runs.
 */
export function initializeGameModes(): void {
  // Register the standard pixel-battle mode
  gameModes.register(pixelBattleMode);

  // Register CopyCat mode (1v1)
  gameModes.register(copyCatMode);

  // Register Pixel Guesser mode
  gameModes.register(pixelGuesserMode);

  // Register CopyCat Solo mode (single-player memory practice)
  gameModes.register(copyCatSoloMode);

  // Register Zombie Pixel mode (real-time infection)
  gameModes.register(zombiePixelMode);

  // Register Pixel Survivor mode (single-player roguelike)
  gameModes.register(pixelSurvivorMode);

  // Register CopyCat Royale mode (battle royale elimination)
  gameModes.register(copyCatRoyaleMode);

  // Set pixel-battle as the default
  gameModes.setDefault('pixel-battle');

  log('GameMode', `Initialized ${gameModes.size} game mode(s)`);
}
