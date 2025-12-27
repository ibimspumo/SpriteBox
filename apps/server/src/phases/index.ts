// apps/server/src/phases/index.ts

/**
 * Phase Manager System
 *
 * Provides PhaseManager instances for different game modes.
 * Each game mode can have its own phase flow, timing, AND handler logic.
 *
 * The system uses a Strategy pattern where each PhaseManager:
 * - Defines the phase sequence for its mode
 * - Provides timer durations
 * - Implements handlePhase() for mode-specific logic
 */

import type { Instance } from '../types.js';
import type { PhaseManager } from './types.js';
import { gameModes } from '../gameModes/index.js';
import { StandardPhaseManager } from './strategies/StandardPhaseManager.js';
import { CopyCatPhaseManager } from './strategies/CopyCatPhaseManager.js';
import { PixelGuesserPhaseManager } from './strategies/PixelGuesserPhaseManager.js';
import { PixelSurvivorPhaseManager } from './strategies/PixelSurvivorPhaseManager.js';
import { ZombiePixelPhaseManager } from './strategies/ZombiePixelPhaseManager.js';
import { CopyCatRoyalePhaseManager } from './strategies/CopyCatRoyalePhaseManager.js';

// Re-export types
export type { PhaseManager, PhaseContext, PhaseHandleResult } from './types.js';

// Re-export common utilities
export {
  setIoInstance,
  getIoInstance,
  setPhaseTimings,
  isWithinPhaseTime,
  getPhaseTimings,
  clearPhaseTimings,
  emitToInstance,
  emitToPlayer,
  createPhaseContext,
  resetForNextRound,
  handleLobbyPhase,
  handleCountdownPhase,
  handleResultsPhase,
  createSimpleRankings,
  isCopyCatMode,
  isCopyCatSoloMode,
  isZombiePixelMode,
  isPixelGuesserMode,
  isCopyCatRoyaleMode,
} from './common.js';

// Re-export strategies
export { StandardPhaseManager } from './strategies/StandardPhaseManager.js';
export { CopyCatPhaseManager } from './strategies/CopyCatPhaseManager.js';
export { PixelGuesserPhaseManager } from './strategies/PixelGuesserPhaseManager.js';
export { PixelSurvivorPhaseManager } from './strategies/PixelSurvivorPhaseManager.js';
export { ZombiePixelPhaseManager } from './strategies/ZombiePixelPhaseManager.js';
export { CopyCatRoyalePhaseManager } from './strategies/CopyCatRoyalePhaseManager.js';

// Cache PhaseManagers by gameMode ID (they're stateless, so we can reuse them)
const phaseManagerCache = new Map<string, PhaseManager>();

/**
 * Get or create a PhaseManager for an instance's game mode
 */
export function getPhaseManager(instance: Instance): PhaseManager {
  return getPhaseManagerForMode(instance.gameMode);
}

/**
 * Get or create a PhaseManager for a specific game mode
 */
export function getPhaseManagerForMode(gameModeId: string): PhaseManager {
  // Check cache first
  if (phaseManagerCache.has(gameModeId)) {
    return phaseManagerCache.get(gameModeId)!;
  }

  // Get config and create appropriate manager
  const config = gameModes.get(gameModeId);

  // Select appropriate PhaseManager based on game mode
  let manager: PhaseManager;
  switch (gameModeId) {
    case 'copy-cat':
    case 'copy-cat-solo':
      manager = new CopyCatPhaseManager(config);
      break;
    case 'pixel-guesser':
      manager = new PixelGuesserPhaseManager(config);
      break;
    case 'pixel-survivor':
      manager = new PixelSurvivorPhaseManager(config);
      break;
    case 'zombie-pixel':
      manager = new ZombiePixelPhaseManager(config);
      break;
    case 'copycat-royale':
      manager = new CopyCatRoyalePhaseManager(config);
      break;
    default:
      manager = new StandardPhaseManager(config);
  }

  // Cache for reuse
  phaseManagerCache.set(gameModeId, manager);

  return manager;
}

/**
 * Clear the phase manager cache (useful for testing or hot-reloading)
 */
export function clearPhaseManagerCache(): void {
  phaseManagerCache.clear();
}
