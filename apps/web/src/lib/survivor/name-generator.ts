// apps/web/src/lib/survivor/name-generator.ts
// Random RPG name generator with localization support

import { get } from 'svelte/store';
import { currentLanguage } from '$lib/i18n';

interface NameData {
  names: string[];
  prefixes: string[];
  suffixes: string[];
}

interface NamesJson {
  en: NameData;
  de: NameData;
}

// Cache for loaded names
let namesCache: NamesJson | null = null;

/**
 * Load names from JSON file
 */
async function loadNames(): Promise<NamesJson> {
  if (namesCache) {
    return namesCache;
  }

  try {
    const response = await fetch('/data/survivor/names.json');
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    const data = await response.json() as NamesJson;
    namesCache = data;
    return data;
  } catch (error) {
    console.error('Failed to load names:', error);
    // Return fallback data
    return {
      en: {
        names: ['Hero', 'Warrior', 'Mage', 'Rogue', 'Knight'],
        prefixes: ['Sir', 'Lady', 'Lord', 'Captain', 'Duke'],
        suffixes: ['the Bold', 'the Brave', 'the Wise', 'the Swift', 'the Mighty'],
      },
      de: {
        names: ['Held', 'Krieger', 'Magier', 'Schurke', 'Ritter'],
        prefixes: ['Ritter', 'Dame', 'Graf', 'Kapitän', 'Herzog'],
        suffixes: ['der Kühne', 'der Tapfere', 'der Weise', 'der Flinke', 'der Mächtige'],
      },
    };
  }
}

/**
 * Secure random integer using crypto API
 */
function secureRandomInt(max: number): number {
  const array = new Uint32Array(1);
  globalThis.crypto.getRandomValues(array);
  return array[0] % max;
}

/**
 * Pick a random item from an array
 */
function pickRandom<T>(array: T[]): T {
  return array[secureRandomInt(array.length)];
}

/**
 * Check if random event should occur (percentage chance)
 */
function chance(percent: number): boolean {
  return secureRandomInt(100) < percent;
}

// Name generation patterns with weights
type NamePattern = 'name' | 'prefix-name' | 'name-suffix' | 'prefix-name-suffix';

const PATTERNS: { pattern: NamePattern; weight: number }[] = [
  { pattern: 'name', weight: 30 },           // 30% - Just the name
  { pattern: 'prefix-name', weight: 25 },    // 25% - Prefix + Name
  { pattern: 'name-suffix', weight: 30 },    // 30% - Name + Suffix
  { pattern: 'prefix-name-suffix', weight: 15 }, // 15% - Full title
];

/**
 * Pick a random pattern based on weights
 */
function pickPattern(): NamePattern {
  const totalWeight = PATTERNS.reduce((sum, p) => sum + p.weight, 0);
  let random = secureRandomInt(totalWeight);

  for (const { pattern, weight } of PATTERNS) {
    random -= weight;
    if (random < 0) {
      return pattern;
    }
  }

  return 'name';
}

/**
 * Generate a random RPG-style name
 * @param lang - Language code ('en' or 'de'), defaults to current language
 */
export async function generateRandomName(lang?: 'en' | 'de'): Promise<string> {
  const names = await loadNames();
  const currentLang = lang ?? get(currentLanguage);
  const data = names[currentLang] ?? names.en;

  const pattern = pickPattern();
  const name = pickRandom(data.names);

  switch (pattern) {
    case 'name':
      return name;

    case 'prefix-name':
      return `${pickRandom(data.prefixes)} ${name}`;

    case 'name-suffix':
      return `${name} ${pickRandom(data.suffixes)}`;

    case 'prefix-name-suffix':
      return `${pickRandom(data.prefixes)} ${name} ${pickRandom(data.suffixes)}`;

    default:
      return name;
  }
}

/**
 * Generate a simple name (no prefix/suffix) for shorter names
 */
export async function generateSimpleName(lang?: 'en' | 'de'): Promise<string> {
  const names = await loadNames();
  const currentLang = lang ?? get(currentLanguage);
  const data = names[currentLang] ?? names.en;

  return pickRandom(data.names);
}

/**
 * Generate a full title name (always has prefix and suffix)
 */
export async function generateFullTitle(lang?: 'en' | 'de'): Promise<string> {
  const names = await loadNames();
  const currentLang = lang ?? get(currentLanguage);
  const data = names[currentLang] ?? names.en;

  return `${pickRandom(data.prefixes)} ${pickRandom(data.names)} ${pickRandom(data.suffixes)}`;
}
