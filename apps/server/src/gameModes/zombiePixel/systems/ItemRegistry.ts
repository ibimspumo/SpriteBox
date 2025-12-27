// apps/server/src/gameModes/zombiePixel/systems/ItemRegistry.ts
// Item definitions registry

import type { ItemDefinition } from './itemTypes.js';

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
    sharedEffect: true,
    color: '#fbbf24',
    effectParams: {
      speedBonus: 3,
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
    sharedEffect: false,
    color: '#ef4444',
    effectParams: {},
  },

  // === FUTURE ITEMS (examples, currently disabled via spawnWeight: 0) ===
  // Add new items here with spawnWeight > 0 to enable them
};

/**
 * Get item definition by ID
 */
export function getItemDefinition(itemId: string): ItemDefinition | undefined {
  return ITEM_DEFINITIONS[itemId];
}

/**
 * Get all eligible items for spawning based on current state
 */
export function getEligibleItems(
  state: { elapsedMs: number; survivorCount: number; zombieCount: number }
): ItemDefinition[] {
  return Object.values(ITEM_DEFINITIONS).filter((def) => {
    if (def.spawnWeight <= 0) return false;
    if (def.spawnCondition && !def.spawnCondition(state as any)) return false;
    return true;
  });
}

/**
 * Select a random item based on weighted probability
 */
export function selectWeightedItem(
  eligibleItems: ItemDefinition[],
  randomFn: (max: number) => number
): ItemDefinition | null {
  if (eligibleItems.length === 0) return null;

  const totalWeight = eligibleItems.reduce((sum, def) => sum + def.spawnWeight, 0);
  let random = randomFn(totalWeight);

  for (const def of eligibleItems) {
    random -= def.spawnWeight;
    if (random < 0) {
      return def;
    }
  }

  return null;
}
