// apps/server/src/phases/index.ts

/**
 * Phase Manager System
 *
 * Provides PhaseManager instances for different game modes.
 * Each game mode can have its own phase flow and timing.
 */

import type { Instance } from '../types.js';
import type { PhaseManager } from './types.js';
import { gameModes } from '../gameModes/index.js';
import { StandardPhaseManager } from './strategies/StandardPhaseManager.js';
import { CopyCatPhaseManager } from './strategies/CopyCatPhaseManager.js';

// Re-export types
export type { PhaseManager } from './types.js';
export { StandardPhaseManager } from './strategies/StandardPhaseManager.js';
export { CopyCatPhaseManager } from './strategies/CopyCatPhaseManager.js';

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
      manager = new CopyCatPhaseManager(config);
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
