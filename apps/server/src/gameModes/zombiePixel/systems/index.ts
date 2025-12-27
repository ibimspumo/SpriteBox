// apps/server/src/gameModes/zombiePixel/systems/index.ts
// Barrel exports for ZombiePixel systems

// Types
export type {
  ItemVisibility,
  ItemEffectType,
  EffectDuration,
  ItemDefinition,
  SpawnedItem,
  ActiveEffect,
  ItemSystemState,
  ItemSystemCallbacks,
} from './itemTypes.js';

// Item Registry
export { ITEM_DEFINITIONS, getItemDefinition, getEligibleItems, selectWeightedItem } from './ItemRegistry.js';

// Item Systems
export { EffectSystem, type EffectSystemCallbacks } from './EffectSystem.js';
export { SpawnSystem, type SpawnSystemCallbacks } from './SpawnSystem.js';
export { CollectionSystem, type CollectionSystemCallbacks } from './CollectionSystem.js';

// Game Loop Systems
export { InfectionSystem, type InfectionResult } from './InfectionSystem.js';
export { BroadcastSystem } from './BroadcastSystem.js';
export { MovementSystem } from './MovementSystem.js';
