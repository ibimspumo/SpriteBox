// apps/server/src/gameModes/zombiePixel/itemSystem.ts

/**
 * Dynamic Item System for ZombiePixel
 *
 * Extensible system for spawning and managing power-ups on the map.
 * Add new items by extending ITEM_DEFINITIONS.
 */

import { randomInt } from 'crypto';
import type { ZombiePosition, ZombiePixelPlayer } from './types.js';
import { ZOMBIE_PIXEL_CONSTANTS } from './types.js';
import { generateId } from '../../utils.js';

// ============================================
// ITEM DEFINITIONS
// ============================================

/**
 * Who can see and collect this item
 */
export type ItemVisibility = 'zombies' | 'survivors' | 'all';

/**
 * What happens when the item is collected
 */
export type ItemEffectType =
  | 'speed-boost'      // Temporary speed increase
  | 'healing-touch'    // Next infection heals the zombie
  | 'invincibility'    // Temporary immunity (future)
  | 'teleport'         // Random teleport (future)
  | 'freeze'           // Freeze enemies briefly (future)
  | 'reveal'           // Reveal all enemy positions (future)
  | 'trap'             // Place a trap (future)
  | 'shrink-zone';     // Shrink the play area (future)

/**
 * Duration type for effects
 */
export type EffectDuration =
  | { type: 'instant' }                    // One-time effect
  | { type: 'timed'; durationMs: number }  // Lasts for X ms
  | { type: 'uses'; count: number };       // Lasts for X uses (e.g., healing touch = 1 use)

/**
 * Complete item definition
 */
export interface ItemDefinition {
  /** Unique identifier for this item type */
  id: string;

  /** Display name for the item */
  name: string;

  /** Icon name from pixelarticons (without .svg) */
  icon: string;

  /** Who can see this item on the map */
  visibility: ItemVisibility;

  /** Who can collect this item */
  collectableBy: ItemVisibility;

  /** Base spawn weight (higher = more likely to spawn) */
  spawnWeight: number;

  /** Effect when collected */
  effect: ItemEffectType;

  /** How long the effect lasts */
  duration: EffectDuration;

  /** Whether the effect is shared with team (e.g., all zombies get speed boost) */
  sharedEffect: boolean;

  /** Color for rendering (hex) */
  color: string;

  /** Optional: Condition for spawning (e.g., only spawn after 10 seconds) */
  spawnCondition?: (gameState: ItemSystemState) => boolean;

  /** Optional: Custom effect parameters */
  effectParams?: Record<string, unknown>;
}

/**
 * All available items - ADD NEW ITEMS HERE
 */
export const ITEM_DEFINITIONS: Record<string, ItemDefinition> = {
  'speed-boost': {
    id: 'speed-boost',
    name: 'Speed Boost',
    icon: 'zap',
    visibility: 'zombies',
    collectableBy: 'zombies',
    spawnWeight: 50,
    effect: 'speed-boost',
    duration: { type: 'timed', durationMs: 5000 },
    sharedEffect: true,  // All zombies get the boost
    color: '#fbbf24',    // Amber/yellow
    effectParams: {
      speedBonus: 3,     // +3 speed (from 5 to 2 ticks between moves)
    },
  },

  'healing-touch': {
    id: 'healing-touch',
    name: 'Healing Touch',
    icon: 'heart',
    visibility: 'survivors',
    collectableBy: 'survivors',
    spawnWeight: 40,
    effect: 'healing-touch',
    duration: { type: 'uses', count: 1 },
    sharedEffect: false,  // Only the collector gets it
    color: '#ef4444',     // Red
    effectParams: {},
  },

  // === FUTURE ITEMS (examples, currently disabled via spawnWeight: 0) ===

  // 'invincibility': {
  //   id: 'invincibility',
  //   name: 'Shield',
  //   icon: 'shield',
  //   visibility: 'survivors',
  //   collectableBy: 'survivors',
  //   spawnWeight: 0,  // Disabled
  //   effect: 'invincibility',
  //   duration: { type: 'timed', durationMs: 3000 },
  //   sharedEffect: false,
  //   color: '#3b82f6',
  //   spawnCondition: (state) => state.elapsedMs > 15000,  // Only after 15s
  // },
};

// ============================================
// SPAWNED ITEM INSTANCE
// ============================================

/**
 * An item that has been spawned on the map
 */
export interface SpawnedItem {
  /** Unique instance ID */
  id: string;

  /** Item definition ID */
  definitionId: string;

  /** Position on the grid */
  position: ZombiePosition;

  /** When it was spawned */
  spawnedAt: number;

  /** Whether it's been collected */
  collected: boolean;

  /** Who collected it (if collected) */
  collectedBy?: string;
}

// ============================================
// ACTIVE EFFECT
// ============================================

/**
 * An active effect on a player or team
 */
export interface ActiveEffect {
  /** Unique effect instance ID */
  id: string;

  /** Item definition ID that caused this effect */
  itemId: string;

  /** Effect type */
  type: ItemEffectType;

  /** Who has this effect (player ID or 'zombies'/'survivors' for shared) */
  affectedId: string;

  /** When the effect started */
  startedAt: number;

  /** When the effect expires (null for uses-based) */
  expiresAt: number | null;

  /** Remaining uses (null for timed effects) */
  remainingUses: number | null;

  /** Who triggered this effect */
  sourcePlayerId: string;

  /** Custom effect data */
  data: Record<string, unknown>;
}

// ============================================
// ITEM SYSTEM STATE
// ============================================

/**
 * Complete state for the item system
 */
export interface ItemSystemState {
  /** All spawned items on the map */
  items: Map<string, SpawnedItem>;

  /** All active effects */
  activeEffects: Map<string, ActiveEffect>;

  /** Elapsed game time in ms */
  elapsedMs: number;

  /** Time until next item spawn */
  nextSpawnAt: number;

  /** Current survivor count (for balance) */
  survivorCount: number;

  /** Current zombie count (for balance) */
  zombieCount: number;
}

// ============================================
// ITEM SYSTEM MANAGER
// ============================================

export class ItemSystemManager {
  private state: ItemSystemState;
  private gridSize: number;
  private onItemSpawned?: (item: SpawnedItem, definition: ItemDefinition) => void;
  private onItemCollected?: (item: SpawnedItem, definition: ItemDefinition, player: ZombiePixelPlayer) => void;
  private onEffectStarted?: (effect: ActiveEffect, definition: ItemDefinition) => void;
  private onEffectEnded?: (effect: ActiveEffect, definition: ItemDefinition) => void;

  constructor(gridSize: number = ZOMBIE_PIXEL_CONSTANTS.GRID_SIZE) {
    this.gridSize = gridSize;
    this.state = {
      items: new Map(),
      activeEffects: new Map(),
      elapsedMs: 0,
      nextSpawnAt: this.calculateNextSpawnTime(0),
      survivorCount: 0,
      zombieCount: 0,
    };
  }

  // ============================================
  // EVENT HANDLERS
  // ============================================

  /**
   * Set callback for when an item spawns
   */
  onSpawn(callback: (item: SpawnedItem, definition: ItemDefinition) => void): void {
    this.onItemSpawned = callback;
  }

  /**
   * Set callback for when an item is collected
   */
  onCollect(callback: (item: SpawnedItem, definition: ItemDefinition, player: ZombiePixelPlayer) => void): void {
    this.onItemCollected = callback;
  }

  /**
   * Set callback for when an effect starts
   */
  onEffectStart(callback: (effect: ActiveEffect, definition: ItemDefinition) => void): void {
    this.onEffectStarted = callback;
  }

  /**
   * Set callback for when an effect ends
   */
  onEffectEnd(callback: (effect: ActiveEffect, definition: ItemDefinition) => void): void {
    this.onEffectEnded = callback;
  }

  // ============================================
  // UPDATE LOOP
  // ============================================

  /**
   * Update the item system (called every game tick)
   */
  update(
    elapsedMs: number,
    players: Map<string, ZombiePixelPlayer>,
    occupiedPositions: Set<string>
  ): void {
    this.state.elapsedMs = elapsedMs;
    this.state.survivorCount = Array.from(players.values()).filter(p => !p.isZombie).length;
    this.state.zombieCount = Array.from(players.values()).filter(p => p.isZombie).length;

    // Check for item spawning
    if (elapsedMs >= this.state.nextSpawnAt) {
      this.trySpawnItem(occupiedPositions);
      this.state.nextSpawnAt = this.calculateNextSpawnTime(elapsedMs);
    }

    // Check for item collection
    this.checkCollisions(players);

    // Update active effects (expire timed effects)
    this.updateEffects();
  }

  // ============================================
  // SPAWNING
  // ============================================

  /**
   * Calculate when the next item should spawn
   */
  private calculateNextSpawnTime(currentTime: number): number {
    const minDelay = ZOMBIE_PIXEL_CONSTANTS.ITEM_SPAWN_MIN_MS;
    const maxDelay = ZOMBIE_PIXEL_CONSTANTS.ITEM_SPAWN_MAX_MS;
    const delay = randomInt(minDelay, maxDelay + 1);
    return currentTime + delay;
  }

  /**
   * Try to spawn a random item
   */
  private trySpawnItem(occupiedPositions: Set<string>): void {
    // Get eligible items based on spawn conditions
    const eligibleItems = Object.values(ITEM_DEFINITIONS).filter(def => {
      if (def.spawnWeight <= 0) return false;
      if (def.spawnCondition && !def.spawnCondition(this.state)) return false;
      return true;
    });

    if (eligibleItems.length === 0) return;

    // Weighted random selection
    const totalWeight = eligibleItems.reduce((sum, def) => sum + def.spawnWeight, 0);
    let random = randomInt(0, totalWeight);

    let selectedDef: ItemDefinition | null = null;
    for (const def of eligibleItems) {
      random -= def.spawnWeight;
      if (random < 0) {
        selectedDef = def;
        break;
      }
    }

    if (!selectedDef) return;

    // Find a valid spawn position
    const position = this.findSpawnPosition(occupiedPositions);
    if (!position) return;

    // Create the item
    const item: SpawnedItem = {
      id: `item_${generateId(8)}`,
      definitionId: selectedDef.id,
      position,
      spawnedAt: Date.now(),
      collected: false,
    };

    this.state.items.set(item.id, item);
    this.onItemSpawned?.(item, selectedDef);
  }

  /**
   * Find a valid position for spawning an item
   */
  private findSpawnPosition(occupiedPositions: Set<string>): ZombiePosition | null {
    // Try up to 50 times to find an unoccupied position
    for (let i = 0; i < 50; i++) {
      const x = randomInt(0, this.gridSize);
      const y = randomInt(0, this.gridSize);
      const key = `${x},${y}`;

      if (!occupiedPositions.has(key)) {
        // Also check no item is already there
        const hasItem = Array.from(this.state.items.values()).some(
          item => !item.collected && item.position.x === x && item.position.y === y
        );
        if (!hasItem) {
          return { x, y };
        }
      }
    }
    return null;
  }

  // ============================================
  // COLLECTION
  // ============================================

  /**
   * Check for player-item collisions
   */
  private checkCollisions(players: Map<string, ZombiePixelPlayer>): void {
    for (const item of this.state.items.values()) {
      if (item.collected) continue;

      const definition = ITEM_DEFINITIONS[item.definitionId];
      if (!definition) continue;

      for (const player of players.values()) {
        // Check if player can collect this item
        if (!this.canCollect(player, definition)) continue;

        // Check position match
        if (player.position.x === item.position.x && player.position.y === item.position.y) {
          this.collectItem(item, definition, player);
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
    item: SpawnedItem,
    definition: ItemDefinition,
    player: ZombiePixelPlayer
  ): void {
    item.collected = true;
    item.collectedBy = player.id;

    // Create the effect
    const effect = this.createEffect(definition, player);
    if (effect) {
      this.state.activeEffects.set(effect.id, effect);
      this.onEffectStarted?.(effect, definition);
    }

    this.onItemCollected?.(item, definition, player);
  }

  // ============================================
  // EFFECTS
  // ============================================

  /**
   * Create an effect from an item definition
   */
  private createEffect(definition: ItemDefinition, player: ZombiePixelPlayer): ActiveEffect | null {
    const now = Date.now();

    let expiresAt: number | null = null;
    let remainingUses: number | null = null;

    switch (definition.duration.type) {
      case 'instant':
        // Instant effects don't create a lasting effect
        return null;
      case 'timed':
        expiresAt = now + definition.duration.durationMs;
        break;
      case 'uses':
        remainingUses = definition.duration.count;
        break;
    }

    // Determine who is affected
    const affectedId = definition.sharedEffect
      ? (player.isZombie ? 'zombies' : 'survivors')
      : player.id;

    return {
      id: `effect_${generateId(8)}`,
      itemId: definition.id,
      type: definition.effect,
      affectedId,
      startedAt: now,
      expiresAt,
      remainingUses,
      sourcePlayerId: player.id,
      data: { ...definition.effectParams },
    };
  }

  /**
   * Update active effects (expire timed ones)
   */
  private updateEffects(): void {
    const now = Date.now();

    for (const [id, effect] of this.state.activeEffects) {
      // Check timed expiration
      if (effect.expiresAt !== null && now >= effect.expiresAt) {
        const definition = ITEM_DEFINITIONS[effect.itemId];
        this.state.activeEffects.delete(id);
        if (definition) {
          this.onEffectEnded?.(effect, definition);
        }
      }

      // Check uses expiration
      if (effect.remainingUses !== null && effect.remainingUses <= 0) {
        const definition = ITEM_DEFINITIONS[effect.itemId];
        this.state.activeEffects.delete(id);
        if (definition) {
          this.onEffectEnded?.(effect, definition);
        }
      }
    }
  }

  /**
   * Consume a use from an effect (e.g., healing touch)
   * Returns true if the effect was consumed
   */
  consumeEffectUse(effectType: ItemEffectType, playerId: string): boolean {
    for (const effect of this.state.activeEffects.values()) {
      if (effect.type !== effectType) continue;

      // Check if this player has this effect
      const hasEffect = effect.affectedId === playerId ||
        (effect.affectedId === 'survivors' && !this.isZombie(playerId)) ||
        (effect.affectedId === 'zombies' && this.isZombie(playerId));

      if (!hasEffect) continue;

      if (effect.remainingUses !== null && effect.remainingUses > 0) {
        effect.remainingUses--;
        return true;
      }
    }
    return false;
  }

  // Helper to check if a player is a zombie (needs external data)
  private playerIsZombieMap: Map<string, boolean> = new Map();

  setPlayerZombieStatus(playerId: string, isZombie: boolean): void {
    this.playerIsZombieMap.set(playerId, isZombie);
  }

  private isZombie(playerId: string): boolean {
    return this.playerIsZombieMap.get(playerId) ?? false;
  }

  // ============================================
  // QUERIES
  // ============================================

  /**
   * Check if zombies have speed boost active
   */
  hasZombieSpeedBoost(): boolean {
    for (const effect of this.state.activeEffects.values()) {
      if (effect.type === 'speed-boost' && effect.affectedId === 'zombies') {
        return true;
      }
    }
    return false;
  }

  /**
   * Get remaining time for zombie speed boost (in ms)
   */
  getZombieSpeedBoostRemaining(): number {
    const now = Date.now();
    for (const effect of this.state.activeEffects.values()) {
      if (effect.type === 'speed-boost' && effect.affectedId === 'zombies' && effect.expiresAt) {
        return Math.max(0, effect.expiresAt - now);
      }
    }
    return 0;
  }

  /**
   * Check if a player has healing touch
   */
  hasHealingTouch(playerId: string): boolean {
    for (const effect of this.state.activeEffects.values()) {
      if (effect.type === 'healing-touch' && effect.affectedId === playerId) {
        if (effect.remainingUses !== null && effect.remainingUses > 0) {
          return true;
        }
      }
    }
    return false;
  }

  /**
   * Get all players with healing touch
   */
  getPlayersWithHealingTouch(): string[] {
    const players: string[] = [];
    for (const effect of this.state.activeEffects.values()) {
      if (effect.type === 'healing-touch' && effect.remainingUses !== null && effect.remainingUses > 0) {
        players.push(effect.affectedId);
      }
    }
    return players;
  }

  /**
   * Check if a specific effect is active for a player or team
   */
  hasEffect(effectType: ItemEffectType, targetId: string): boolean {
    for (const effect of this.state.activeEffects.values()) {
      if (effect.type !== effectType) continue;
      if (effect.affectedId === targetId) return true;
      if (effect.affectedId === 'zombies' && this.isZombie(targetId)) return true;
      if (effect.affectedId === 'survivors' && !this.isZombie(targetId)) return true;
    }
    return false;
  }

  /**
   * Get all visible items for a player
   */
  getVisibleItems(isZombie: boolean): SpawnedItem[] {
    const visible: SpawnedItem[] = [];

    for (const item of this.state.items.values()) {
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

  /**
   * Get all active effects
   */
  getActiveEffects(): ActiveEffect[] {
    return Array.from(this.state.activeEffects.values());
  }

  /**
   * Get item definition by ID
   */
  getDefinition(itemId: string): ItemDefinition | undefined {
    return ITEM_DEFINITIONS[itemId];
  }

  /**
   * Get the full state (for debugging/serialization)
   */
  getState(): ItemSystemState {
    return this.state;
  }

  /**
   * Clean up collected items (call periodically)
   */
  cleanup(): void {
    for (const [id, item] of this.state.items) {
      if (item.collected) {
        this.state.items.delete(id);
      }
    }
  }
}
