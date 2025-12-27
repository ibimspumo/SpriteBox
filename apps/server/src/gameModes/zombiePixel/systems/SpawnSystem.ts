// apps/server/src/gameModes/zombiePixel/systems/SpawnSystem.ts
// Item spawning system

import { randomInt } from 'crypto';
import type { ZombiePosition } from '../types.js';
import type { SpawnedItem, ItemSystemState, ItemDefinition } from './itemTypes.js';
import { getEligibleItems, selectWeightedItem } from './ItemRegistry.js';
import { ZOMBIE_PIXEL_CONSTANTS } from '../types.js';
import { generateId } from '../../../utils.js';

export interface SpawnSystemCallbacks {
  onItemSpawned?: (item: SpawnedItem, definition: ItemDefinition) => void;
}

/**
 * System for spawning items on the map
 */
export class SpawnSystem {
  private gridSize: number;
  private callbacks: SpawnSystemCallbacks = {};

  constructor(gridSize: number = ZOMBIE_PIXEL_CONSTANTS.GRID_SIZE) {
    this.gridSize = gridSize;
  }

  /**
   * Set callback handlers
   */
  setCallbacks(callbacks: SpawnSystemCallbacks): void {
    this.callbacks = callbacks;
  }

  /**
   * Calculate when the next item should spawn
   */
  calculateNextSpawnTime(currentTime: number): number {
    const minDelay = ZOMBIE_PIXEL_CONSTANTS.ITEM_SPAWN_MIN_MS;
    const maxDelay = ZOMBIE_PIXEL_CONSTANTS.ITEM_SPAWN_MAX_MS;
    const delay = randomInt(minDelay, maxDelay + 1);
    return currentTime + delay;
  }

  /**
   * Check if it's time to spawn and try to spawn an item
   */
  checkAndSpawn(state: ItemSystemState, occupiedPositions: Set<string>): void {
    if (state.elapsedMs >= state.nextSpawnAt) {
      this.trySpawnItem(state, occupiedPositions);
      state.nextSpawnAt = this.calculateNextSpawnTime(state.elapsedMs);
    }
  }

  /**
   * Try to spawn a random item
   */
  private trySpawnItem(state: ItemSystemState, occupiedPositions: Set<string>): void {
    // Get eligible items based on spawn conditions
    const eligibleItems = getEligibleItems(state);
    if (eligibleItems.length === 0) return;

    // Select random item based on weight
    const selectedDef = selectWeightedItem(eligibleItems, (max) => randomInt(0, max));
    if (!selectedDef) return;

    // Find a valid spawn position
    const position = this.findSpawnPosition(state, occupiedPositions);
    if (!position) return;

    // Create the item
    const item: SpawnedItem = {
      id: `item_${generateId(8)}`,
      definitionId: selectedDef.id,
      position,
      spawnedAt: Date.now(),
      collected: false,
    };

    state.items.set(item.id, item);
    this.callbacks.onItemSpawned?.(item, selectedDef);
  }

  /**
   * Find a valid position for spawning an item
   */
  private findSpawnPosition(state: ItemSystemState, occupiedPositions: Set<string>): ZombiePosition | null {
    // Try up to 50 times to find an unoccupied position
    for (let i = 0; i < 50; i++) {
      const x = randomInt(0, this.gridSize);
      const y = randomInt(0, this.gridSize);
      const key = `${x},${y}`;

      if (!occupiedPositions.has(key)) {
        // Also check no item is already there
        const hasItem = Array.from(state.items.values()).some(
          (item) => !item.collected && item.position.x === x && item.position.y === y
        );
        if (!hasItem) {
          return { x, y };
        }
      }
    }
    return null;
  }

  /**
   * Clean up collected items
   */
  cleanup(state: ItemSystemState): void {
    for (const [id, item] of state.items) {
      if (item.collected) {
        state.items.delete(id);
      }
    }
  }
}
