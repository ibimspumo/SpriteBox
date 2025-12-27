// apps/server/src/gameModes/zombiePixel/systems/itemTypes.ts
// Item system type definitions

import type { ZombiePosition, ZombiePixelPlayer } from '../types.js';

/**
 * Who can see and collect this item
 */
export type ItemVisibility = 'zombies' | 'survivors' | 'all';

/**
 * What happens when the item is collected
 */
export type ItemEffectType =
  | 'speed-boost'
  | 'healing-touch'
  | 'invincibility'
  | 'teleport'
  | 'freeze'
  | 'reveal'
  | 'trap'
  | 'shrink-zone';

/**
 * Duration type for effects
 */
export type EffectDuration =
  | { type: 'instant' }
  | { type: 'timed'; durationMs: number }
  | { type: 'uses'; count: number };

/**
 * Complete item definition
 */
export interface ItemDefinition {
  id: string;
  name: string;
  icon: string;
  visibility: ItemVisibility;
  collectableBy: ItemVisibility;
  spawnWeight: number;
  effect: ItemEffectType;
  duration: EffectDuration;
  sharedEffect: boolean;
  color: string;
  spawnCondition?: (gameState: ItemSystemState) => boolean;
  effectParams?: Record<string, unknown>;
}

/**
 * An item that has been spawned on the map
 */
export interface SpawnedItem {
  id: string;
  definitionId: string;
  position: ZombiePosition;
  spawnedAt: number;
  collected: boolean;
  collectedBy?: string;
}

/**
 * An active effect on a player or team
 */
export interface ActiveEffect {
  id: string;
  itemId: string;
  type: ItemEffectType;
  affectedId: string;
  startedAt: number;
  expiresAt: number | null;
  remainingUses: number | null;
  sourcePlayerId: string;
  data: Record<string, unknown>;
}

/**
 * Complete state for the item system
 */
export interface ItemSystemState {
  items: Map<string, SpawnedItem>;
  activeEffects: Map<string, ActiveEffect>;
  elapsedMs: number;
  nextSpawnAt: number;
  survivorCount: number;
  zombieCount: number;
}

/**
 * Callbacks for item system events
 */
export interface ItemSystemCallbacks {
  onItemSpawned?: (item: SpawnedItem, definition: ItemDefinition) => void;
  onItemCollected?: (item: SpawnedItem, definition: ItemDefinition, player: ZombiePixelPlayer) => void;
  onEffectStarted?: (effect: ActiveEffect, definition: ItemDefinition) => void;
  onEffectEnded?: (effect: ActiveEffect, definition: ItemDefinition) => void;
}
