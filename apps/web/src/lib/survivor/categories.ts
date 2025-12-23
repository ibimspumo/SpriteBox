// apps/web/src/lib/survivor/categories.ts
// Category metadata system for Pixel Survivor drawing categories

import type { DrawingCategory } from './analysis.js';
import type { EventSolution } from './data.js';

/**
 * Visual and descriptive metadata for each drawing category
 */
export interface CategoryMeta {
  id: DrawingCategory;
  icon: string;          // Emoji or icon reference
  colorHex: string;      // Brand color for the category
  i18nKey: string;       // Key for localized category name
  i18nDescKey: string;   // Key for localized category description
  exampleShape: string;  // Expected shape characteristics
}

/**
 * Complete metadata for all drawing categories
 */
export const CATEGORY_META: Record<DrawingCategory, CategoryMeta> = {
  weapon: {
    id: 'weapon',
    icon: '⚔️',
    colorHex: '#ef4444', // --color-error (red)
    i18nKey: 'survivor.categories.weapon',
    i18nDescKey: 'survivor.categories.weaponDesc',
    exampleShape: 'tall-thin',
  },
  shield: {
    id: 'shield',
    icon: '🛡️',
    colorHex: '#6b7280', // --color-btn-secondary (gray)
    i18nKey: 'survivor.categories.shield',
    i18nDescKey: 'survivor.categories.shieldDesc',
    exampleShape: 'wide-solid',
  },
  shelter: {
    id: 'shelter',
    icon: '🏠',
    colorHex: '#f59e0b', // --color-warning (orange/yellow)
    i18nKey: 'survivor.categories.shelter',
    i18nDescKey: 'survivor.categories.shelterDesc',
    exampleShape: 'hollow-large',
  },
  fire: {
    id: 'fire',
    icon: '🔥',
    colorHex: '#f5a623', // --color-brand (orange)
    i18nKey: 'survivor.categories.fire',
    i18nDescKey: 'survivor.categories.fireDesc',
    exampleShape: 'warm-colors',
  },
  water: {
    id: 'water',
    icon: '💧',
    colorHex: '#3b82f6', // --color-info/--color-btn-action (blue)
    i18nKey: 'survivor.categories.water',
    i18nDescKey: 'survivor.categories.waterDesc',
    exampleShape: 'cool-colors',
  },
  food: {
    id: 'food',
    icon: '🍎',
    colorHex: '#22c55e', // --color-success (green)
    i18nKey: 'survivor.categories.food',
    i18nDescKey: 'survivor.categories.foodDesc',
    exampleShape: 'small-organic',
  },
  tool: {
    id: 'tool',
    icon: '🔧',
    colorHex: '#b8b8d0', // --color-text-secondary (light gray)
    i18nKey: 'survivor.categories.tool',
    i18nDescKey: 'survivor.categories.toolDesc',
    exampleShape: 'compact-functional',
  },
  trap: {
    id: 'trap',
    icon: '🪤',
    colorHex: '#dc2626', // --color-btn-danger (dark red)
    i18nKey: 'survivor.categories.trap',
    i18nDescKey: 'survivor.categories.trapDesc',
    exampleShape: 'pointy-bottom',
  },
  bridge: {
    id: 'bridge',
    icon: '🌉',
    colorHex: '#a78bfa', // Purple (from design tokens approximate)
    i18nKey: 'survivor.categories.bridge',
    i18nDescKey: 'survivor.categories.bridgeDesc',
    exampleShape: 'flat-wide',
  },
  boat: {
    id: 'boat',
    icon: '⛵',
    colorHex: '#4ecdc4', // --color-accent (cyan/teal)
    i18nKey: 'survivor.categories.boat',
    i18nDescKey: 'survivor.categories.boatDesc',
    exampleShape: 'hollow-bottom',
  },
  rope: {
    id: 'rope',
    icon: '🪢',
    colorHex: '#d4870c', // --color-brand-dark (dark orange/brown)
    i18nKey: 'survivor.categories.rope',
    i18nDescKey: 'survivor.categories.ropeDesc',
    exampleShape: 'thin-long',
  },
  light: {
    id: 'light',
    icon: '💡',
    colorHex: '#ffc857', // --color-brand-light (yellow)
    i18nKey: 'survivor.categories.light',
    i18nDescKey: 'survivor.categories.lightDesc',
    exampleShape: 'small-yellow',
  },
  armor: {
    id: 'armor',
    icon: '🛡️',
    colorHex: '#6ee7df', // --color-accent-hover (light cyan)
    i18nKey: 'survivor.categories.armor',
    i18nDescKey: 'survivor.categories.armorDesc',
    exampleShape: 'large-dense',
  },
  potion: {
    id: 'potion',
    icon: '🧪',
    colorHex: '#c084fc', // Purple (approximate from design system)
    i18nKey: 'survivor.categories.potion',
    i18nDescKey: 'survivor.categories.potionDesc',
    exampleShape: 'small-round',
  },
  distraction: {
    id: 'distraction',
    icon: '✨',
    colorHex: '#fbbf24', // Yellow/gold
    i18nKey: 'survivor.categories.distraction',
    i18nDescKey: 'survivor.categories.distractionDesc',
    exampleShape: 'colorful-spread',
  },
  unknown: {
    id: 'unknown',
    icon: '❓',
    colorHex: '#6b6b8a', // --color-text-muted (muted gray)
    i18nKey: 'survivor.categories.unknown',
    i18nDescKey: 'survivor.categories.unknownDesc',
    exampleShape: 'unclassified',
  },
};

/**
 * Get icon for a category
 * @param category - The drawing category
 * @returns Emoji icon string
 */
export function getCategoryIcon(category: DrawingCategory): string {
  return CATEGORY_META[category]?.icon ?? CATEGORY_META.unknown.icon;
}

/**
 * Get color hex for a category
 * @param category - The drawing category
 * @returns Hex color string (e.g., "#ef4444")
 */
export function getCategoryColor(category: DrawingCategory): string {
  return CATEGORY_META[category]?.colorHex ?? CATEGORY_META.unknown.colorHex;
}

/**
 * Extract unique categories from event solutions
 * @param eventSolutions - Array of event solutions
 * @returns Array of unique category metadata objects
 */
export function getSolutionCategories(eventSolutions: EventSolution[]): CategoryMeta[] {
  const uniqueCategories = new Set<DrawingCategory>();

  // Collect all unique categories from all solutions
  for (const solution of eventSolutions) {
    for (const categoryStr of solution.categories) {
      // Type guard: ensure category string is a valid DrawingCategory
      if (categoryStr in CATEGORY_META) {
        uniqueCategories.add(categoryStr as DrawingCategory);
      }
    }
  }

  // Map to metadata objects
  return Array.from(uniqueCategories).map((category) => CATEGORY_META[category]);
}

/**
 * Get metadata for a specific category
 * @param category - The drawing category
 * @returns Category metadata object
 */
export function getCategoryMeta(category: DrawingCategory): CategoryMeta {
  return CATEGORY_META[category] ?? CATEGORY_META.unknown;
}

/**
 * Get all category metadata as an array
 * @returns Array of all category metadata objects
 */
export function getAllCategories(): CategoryMeta[] {
  return Object.values(CATEGORY_META);
}

/**
 * Get categories filtered by shape characteristic
 * @param shapeType - Shape characteristic to filter by
 * @returns Array of matching category metadata objects
 */
export function getCategoriesByShape(shapeType: string): CategoryMeta[] {
  return Object.values(CATEGORY_META).filter((meta) => meta.exampleShape.includes(shapeType));
}
