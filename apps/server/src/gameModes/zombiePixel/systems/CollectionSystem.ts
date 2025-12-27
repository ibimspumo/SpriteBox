// apps/server/src/gameModes/zombiePixel/systems/CollectionSystem.ts
// Item collection system

import type { ZombiePixelPlayer } from '../types.js';
import type { SpawnedItem, ItemSystemState, ItemDefinition, ActiveEffect } from './itemTypes.js';
import { getItemDefinition, ITEM_DEFINITIONS } from './ItemRegistry.js';
import { EffectSystem } from './EffectSystem.js';

export interface CollectionSystemCallbacks {
  onItemCollected?: (item: SpawnedItem, definition: ItemDefinition, player: ZombiePixelPlayer) => void;
}

/**
 * System for handling item collection
 */
export class CollectionSystem {
  private effectSystem: EffectSystem;
  private callbacks: CollectionSystemCallbacks = {};

  constructor(effectSystem: EffectSystem) {
    this.effectSystem = effectSystem;
  }

  /**
   * Set callback handlers
   */
  setCallbacks(callbacks: CollectionSystemCallbacks): void {
    this.callbacks = callbacks;
  }

  /**
   * Check for player-item collisions and collect items
   */
  checkCollisions(state: ItemSystemState, players: Map<string, ZombiePixelPlayer>): void {
    for (const item of state.items.values()) {
      if (item.collected) continue;

      const definition = ITEM_DEFINITIONS[item.definitionId];
      if (!definition) continue;

      for (const player of players.values()) {
        // Check if player can collect this item
        if (!this.canCollect(player, definition)) continue;

        // Check position match
        if (player.position.x === item.position.x && player.position.y === item.position.y) {
          this.collectItem(state, item, definition, player);
          break;
        }
      }
    }
  }

  /**
   * Check if a player can collect an item
   */
  private canCollect(player: ZombiePixelPlayer, definition: ItemDefinition): boolean {
    const isZombie = player.isZombie;

    switch (definition.collectableBy) {
      case 'zombies':
        return isZombie;
      case 'survivors':
        return !isZombie;
      case 'all':
        return true;
      default:
        return false;
    }
  }

  /**
   * Collect an item and apply its effect
   */
  private collectItem(
    state: ItemSystemState,
    item: SpawnedItem,
    definition: ItemDefinition,
    player: ZombiePixelPlayer
  ): void {
    item.collected = true;
    item.collectedBy = player.id;

    // Create the effect
    const effect = this.effectSystem.createEffect(definition, player);
    if (effect) {
      this.effectSystem.addEffect(state, effect);
    }

    this.callbacks.onItemCollected?.(item, definition, player);
  }

  /**
   * Get all visible items for a player
   */
  getVisibleItems(state: ItemSystemState, isZombie: boolean): SpawnedItem[] {
    const visible: SpawnedItem[] = [];

    for (const item of state.items.values()) {
      if (item.collected) continue;

      const definition = ITEM_DEFINITIONS[item.definitionId];
      if (!definition) continue;

      const canSee =
        definition.visibility === 'all' ||
        (definition.visibility === 'zombies' && isZombie) ||
        (definition.visibility === 'survivors' && !isZombie);

      if (canSee) {
        visible.push(item);
      }
    }

    return visible;
  }
}
