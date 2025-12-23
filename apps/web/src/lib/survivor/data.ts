// apps/web/src/lib/survivor/data.ts
// Game data types and loading utilities for Pixel Survivor

import type { Element } from './types.js';

// === Event Types ===

export interface SolutionBonus {
  condition: string;
  bonus: number;
  text: string;
}

export interface EventSolution {
  categories: string[];
  effectiveness: number;
  bonuses?: SolutionBonus[];
  successText: string;
  successTextDE?: string;
  failText: string;
  failTextDE?: string;
}

export interface EventRewards {
  xp: number;
  gold?: number;
  food?: number;
  materials?: number;
}

export interface EventPunishment {
  damage: number;
  effect?: string;
  goldLoss?: number;
  foodLoss?: number;
}

export interface GameEvent {
  id: string;
  name: string;
  nameDE?: string;
  description: string;
  descriptionDE?: string;
  hint?: string;
  hintDE?: string;
  type: 'combat' | 'survival' | 'exploration' | 'social' | 'mystery' | 'boss';
  minDay: number;
  maxDay: number;
  probability: number;
  difficulty: number;
  solutions: EventSolution[];
  rewards: EventRewards;
  punishment: EventPunishment;
}

export interface EventsData {
  events: GameEvent[];
}

// === Monster Types ===

export interface Monster {
  id: string;
  name: string;
  nameDE?: string;
  tier: number;
  baseHp: number;
  baseAttack: number;
  baseDefense: number;
  speed: number;
  element: Element;
  weaknesses: string[];
  resistances: string[];
  minDay: number;
  maxDay: number;
}

export interface Boss {
  id: string;
  name: string;
  nameDE?: string;
  baseHp: number;
  baseAttack: number;
  baseDefense: number;
  speed: number;
  special: string;
  specialDE?: string;
}

export interface MonstersData {
  monsters: Monster[];
  bosses: Boss[];
}

// === Upgrade Types ===

export interface UpgradeEffectData {
  type: 'stat' | 'category_boost' | 'heal' | 'special';
  stat?: string;
  value?: number;
  isPercent?: boolean;
  category?: string;
  specialId?: string;
}

export interface UpgradeData {
  id: string;
  name: string;
  nameDE?: string;
  description: string;
  descriptionDE?: string;
  rarity: 'common' | 'uncommon' | 'rare' | 'legendary';
  maxStacks: number;
  effect: UpgradeEffectData;
}

export interface UpgradesData {
  upgrades: UpgradeData[];
}

// === Drawable Object Types ===

export interface ObjectBonus {
  condition: string;
  bonus: number;
  text: string;
}

export interface DrawableObject {
  id: string;
  name: string;
  nameDE?: string;
  basePower: number;
  bonuses?: ObjectBonus[];
  description?: string;
}

export interface CategoryDetection {
  aspectRatioMin?: number;
  aspectRatioMax?: number;
  widthMin?: number;
  widthMax?: number;
  heightMin?: number;
  heightMax?: number;
  densityMin?: number;
  densityMax?: number;
  isHollow?: boolean;
  isPointy?: boolean;
  isFlat?: boolean;
  hasWarmColors?: boolean;
  hasCoolColors?: boolean;
  dominantColors?: string[];
  dominantColor?: string;
  centerYMin?: number;
  colorCountMin?: number;
  default?: boolean;
}

export interface DrawableCategory {
  id: string;
  name: string;
  nameDE?: string;
  detection: CategoryDetection;
  objects: DrawableObject[];
}

export interface DrawableObjectsData {
  categories: DrawableCategory[];
}

// === Data Cache ===

let eventsCache: EventsData | null = null;
let monstersCache: MonstersData | null = null;
let upgradesCache: UpgradesData | null = null;
let drawableObjectsCache: DrawableObjectsData | null = null;

// === Data Loaders ===

export async function loadEvents(): Promise<EventsData> {
  if (eventsCache) return eventsCache;

  try {
    const response = await fetch('/data/survivor/events.json');
    if (!response.ok) {
      throw new Error(`Failed to load events: ${response.status}`);
    }
    eventsCache = await response.json();
    return eventsCache!;
  } catch (error) {
    console.error('[Survivor] Failed to load events:', error);
    throw error;
  }
}

export async function loadMonsters(): Promise<MonstersData> {
  if (monstersCache) return monstersCache;

  try {
    const response = await fetch('/data/survivor/monsters.json');
    if (!response.ok) {
      throw new Error(`Failed to load monsters: ${response.status}`);
    }
    monstersCache = await response.json();
    return monstersCache!;
  } catch (error) {
    console.error('[Survivor] Failed to load monsters:', error);
    throw error;
  }
}

export async function loadUpgrades(): Promise<UpgradesData> {
  if (upgradesCache) return upgradesCache;

  try {
    const response = await fetch('/data/survivor/upgrades.json');
    if (!response.ok) {
      throw new Error(`Failed to load upgrades: ${response.status}`);
    }
    upgradesCache = await response.json();
    return upgradesCache!;
  } catch (error) {
    console.error('[Survivor] Failed to load upgrades:', error);
    throw error;
  }
}

export async function loadDrawableObjects(): Promise<DrawableObjectsData> {
  if (drawableObjectsCache) return drawableObjectsCache;

  try {
    const response = await fetch('/data/survivor/drawable-objects.json');
    if (!response.ok) {
      throw new Error(`Failed to load drawable objects: ${response.status}`);
    }
    drawableObjectsCache = await response.json();
    return drawableObjectsCache!;
  } catch (error) {
    console.error('[Survivor] Failed to load drawable objects:', error);
    throw error;
  }
}

// === Load All Data ===

export interface AllGameData {
  events: EventsData;
  monsters: MonstersData;
  upgrades: UpgradesData;
  drawableObjects: DrawableObjectsData;
}

export async function loadAllGameData(): Promise<AllGameData> {
  const [events, monsters, upgrades, drawableObjects] = await Promise.all([
    loadEvents(),
    loadMonsters(),
    loadUpgrades(),
    loadDrawableObjects(),
  ]);

  return { events, monsters, upgrades, drawableObjects };
}

// === Event Selection ===

/**
 * Select a random event appropriate for the current day
 */
export function selectRandomEvent(
  events: GameEvent[],
  day: number,
  eventHistory: string[],
  seed: number
): GameEvent | null {
  // Filter events valid for current day
  const validEvents = events.filter(
    (e) => day >= e.minDay && day <= e.maxDay && !eventHistory.includes(e.id)
  );

  if (validEvents.length === 0) {
    // Allow repeats if we've exhausted unique events
    const repeatEvents = events.filter((e) => day >= e.minDay && day <= e.maxDay);
    if (repeatEvents.length === 0) return null;
    return selectWeightedEvent(repeatEvents, seed + day);
  }

  return selectWeightedEvent(validEvents, seed + day);
}

/**
 * Select event based on probability weights
 */
function selectWeightedEvent(events: GameEvent[], seed: number): GameEvent {
  const totalWeight = events.reduce((sum, e) => sum + e.probability, 0);

  // Simple seeded random
  const random = seededRandom(seed) * totalWeight;

  let cumulative = 0;
  for (const event of events) {
    cumulative += event.probability;
    if (random < cumulative) {
      return event;
    }
  }

  return events[events.length - 1];
}

/**
 * Simple seeded random number generator (0-1)
 */
export function seededRandom(seed: number): number {
  const x = Math.sin(seed * 9999) * 10000;
  return x - Math.floor(x);
}

// === Upgrade Selection ===

/**
 * Select random upgrades for level up
 */
export function selectRandomUpgrades(
  upgrades: UpgradeData[],
  currentUpgrades: string[],
  count: number = 3,
  seed: number
): UpgradeData[] {
  // Filter out max-stacked upgrades
  const upgradeStacks = countUpgradeStacks(currentUpgrades);
  const available = upgrades.filter((u) => {
    const stacks = upgradeStacks[u.id] ?? 0;
    return stacks < u.maxStacks;
  });

  // Weight by rarity
  const weighted = available.map((u) => ({
    upgrade: u,
    weight: getRarityWeight(u.rarity),
  }));

  const selected: UpgradeData[] = [];
  let remainingWeighted = [...weighted];

  for (let i = 0; i < count && remainingWeighted.length > 0; i++) {
    const totalWeight = remainingWeighted.reduce((sum, w) => sum + w.weight, 0);
    const random = seededRandom(seed + i) * totalWeight;

    let cumulative = 0;
    for (let j = 0; j < remainingWeighted.length; j++) {
      cumulative += remainingWeighted[j].weight;
      if (random < cumulative) {
        selected.push(remainingWeighted[j].upgrade);
        remainingWeighted.splice(j, 1);
        break;
      }
    }
  }

  return selected;
}

function countUpgradeStacks(upgradeIds: string[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const id of upgradeIds) {
    counts[id] = (counts[id] ?? 0) + 1;
  }
  return counts;
}

function getRarityWeight(rarity: string): number {
  switch (rarity) {
    case 'common':
      return 50;
    case 'uncommon':
      return 30;
    case 'rare':
      return 15;
    case 'legendary':
      return 5;
    default:
      return 50;
  }
}

// === Localization Helper ===

export function getLocalizedText(
  en: string,
  de: string | undefined,
  lang: 'en' | 'de'
): string {
  if (lang === 'de' && de) return de;
  return en;
}
