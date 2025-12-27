// apps/server/src/gameModes/zombiePixel/itemSystem.ts
// Item System Manager - Orchestrates subsystems
//
// This file has been refactored. The implementation is now split into:
//   - systems/itemTypes.ts      - Type definitions
//   - systems/ItemRegistry.ts   - Item definitions
//   - systems/EffectSystem.ts   - Effect management
//   - systems/SpawnSystem.ts    - Item spawning
//   - systems/CollectionSystem.ts - Item collection

import type { ZombiePixelPlayer } from './types.js';
import { ZOMBIE_PIXEL_CONSTANTS } from './types.js';
import {
  type ItemVisibility,
  type ItemEffectType,
  type EffectDuration,
  type ItemDefinition,
  type SpawnedItem,
  type ActiveEffect,
  type ItemSystemState,
  ITEM_DEFINITIONS,
  getItemDefinition,
  EffectSystem,
  SpawnSystem,
  CollectionSystem,
} from './systems/index.js';

// Re-export types for backwards compatibility
export type { ItemVisibility, ItemEffectType, EffectDuration, ItemDefinition, SpawnedItem, ActiveEffect, ItemSystemState };
export { ITEM_DEFINITIONS };

/**
 * Item System Manager - Orchestrates all item subsystems
 */
export class ItemSystemManager {
  private state: ItemSystemState;
  private effectSystem: EffectSystem;
  private spawnSystem: SpawnSystem;
  private collectionSystem: CollectionSystem;

  // Callback storage for backwards compatibility
  private onItemSpawned?: (item: SpawnedItem, definition: ItemDefinition) => void;
  private onItemCollected?: (item: SpawnedItem, definition: ItemDefinition, player: ZombiePixelPlayer) => void;
  private onEffectStarted?: (effect: ActiveEffect, definition: ItemDefinition) => void;
  private onEffectEnded?: (effect: ActiveEffect, definition: ItemDefinition) => void;

  constructor(gridSize: number = ZOMBIE_PIXEL_CONSTANTS.GRID_SIZE) {
    // Initialize state
    this.state = {
      items: new Map(),
      activeEffects: new Map(),
      elapsedMs: 0,
      nextSpawnAt: 0,
      survivorCount: 0,
      zombieCount: 0,
    };

    // Initialize subsystems
    this.effectSystem = new EffectSystem();
    this.spawnSystem = new SpawnSystem(gridSize);
    this.collectionSystem = new CollectionSystem(this.effectSystem);

    // Set initial spawn time
    this.state.nextSpawnAt = this.spawnSystem.calculateNextSpawnTime(0);
  }

  // ============================================
  // EVENT HANDLERS (Backwards Compatible API)
  // ============================================

  onSpawn(callback: (item: SpawnedItem, definition: ItemDefinition) => void): void {
    this.onItemSpawned = callback;
    this.spawnSystem.setCallbacks({ onItemSpawned: callback });
  }

  onCollect(callback: (item: SpawnedItem, definition: ItemDefinition, player: ZombiePixelPlayer) => void): void {
    this.onItemCollected = callback;
    this.collectionSystem.setCallbacks({ onItemCollected: callback });
  }

  onEffectStart(callback: (effect: ActiveEffect, definition: ItemDefinition) => void): void {
    this.onEffectStarted = callback;
    this.effectSystem.setCallbacks({
      onEffectStarted: callback,
      onEffectEnded: this.onEffectEnded,
    });
  }

  onEffectEnd(callback: (effect: ActiveEffect, definition: ItemDefinition) => void): void {
    this.onEffectEnded = callback;
    this.effectSystem.setCallbacks({
      onEffectStarted: this.onEffectStarted,
      onEffectEnded: callback,
    });
  }

  // ============================================
  // UPDATE LOOP
  // ============================================

  update(elapsedMs: number, players: Map<string, ZombiePixelPlayer>, occupiedPositions: Set<string>): void {
    // Update state
    this.state.elapsedMs = elapsedMs;
    this.state.survivorCount = Array.from(players.values()).filter((p) => !p.isZombie).length;
    this.state.zombieCount = Array.from(players.values()).filter((p) => p.isZombie).length;

    // Check for item spawning
    this.spawnSystem.checkAndSpawn(this.state, occupiedPositions);

    // Check for item collection
    this.collectionSystem.checkCollisions(this.state, players);

    // Update active effects (expire timed effects)
    this.effectSystem.updateEffects(this.state);
  }

  // ============================================
  // EFFECT DELEGATION
  // ============================================

  setPlayerZombieStatus(playerId: string, isZombie: boolean): void {
    this.effectSystem.setPlayerZombieStatus(playerId, isZombie);
  }

  consumeEffectUse(effectType: ItemEffectType, playerId: string): boolean {
    return this.effectSystem.consumeEffectUse(this.state, effectType, playerId);
  }

  hasZombieSpeedBoost(): boolean {
    return this.effectSystem.hasZombieSpeedBoost(this.state);
  }

  getZombieSpeedBoostRemaining(): number {
    return this.effectSystem.getZombieSpeedBoostRemaining(this.state);
  }

  hasHealingTouch(playerId: string): boolean {
    return this.effectSystem.hasHealingTouch(this.state, playerId);
  }

  getPlayersWithHealingTouch(): string[] {
    return this.effectSystem.getPlayersWithHealingTouch(this.state);
  }

  hasEffect(effectType: ItemEffectType, targetId: string): boolean {
    return this.effectSystem.hasEffect(this.state, effectType, targetId);
  }

  getActiveEffects(): ActiveEffect[] {
    return this.effectSystem.getActiveEffects(this.state);
  }

  // ============================================
  // QUERY METHODS
  // ============================================

  getVisibleItems(isZombie: boolean): SpawnedItem[] {
    return this.collectionSystem.getVisibleItems(this.state, isZombie);
  }

  getDefinition(itemId: string): ItemDefinition | undefined {
    return getItemDefinition(itemId);
  }

  getState(): ItemSystemState {
    return this.state;
  }

  // ============================================
  // CLEANUP
  // ============================================

  cleanup(): void {
    this.spawnSystem.cleanup(this.state);
  }
}
