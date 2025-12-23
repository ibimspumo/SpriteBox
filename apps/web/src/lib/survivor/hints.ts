// apps/web/src/lib/survivor/hints.ts
// Hint engine for Pixel Survivor drawing challenges

import type { DrawableAnalysis } from './drawable-analysis.js';
import type { DrawingCategory } from './analysis.js';

// ============================================
// TYPES
// ============================================

/**
 * Soft hint about current drawing
 */
export interface SoftHint {
  type: 'positive' | 'negative' | 'neutral';
  key: string; // Simple key like 'needsMoreWidth', 'lookingSharp'
  priority: number; // Higher = more important
}

/**
 * A condition that must be met for a category
 */
export interface CategoryCondition {
  key: string;
  check: (analysis: DrawableAnalysis) => boolean;
  passedKey: string; // Simple key for success hint
  failedKey: string; // Simple key for failure hint
  priority: number; // Higher = more important (shown first)
}

/**
 * Requirements for each drawing category
 */
export interface CategoryRequirement {
  category: DrawingCategory;
  conditions: CategoryCondition[];
}

/**
 * Explanation of why a drawing was categorized a certain way
 */
export interface CategoryMatchExplanation {
  detectedCategory: DrawingCategory;
  matchedConditions: string[]; // Simple keys
  targetCategory: DrawingCategory;
  missingConditions: string[]; // Simple keys
  suggestions: string[]; // Simple keys
  matchScore: number; // 0-100, how close to target
}

/**
 * Progress report for target category
 */
export interface ProgressReport {
  category: DrawingCategory;
  totalConditions: number;
  metConditions: number;
  percentage: number;
  nextHint: SoftHint | null; // Most important missing condition
}

// ============================================
// CATEGORY REQUIREMENTS
// ============================================

/**
 * Define all category requirements with conditions
 * These mirror the detection logic in analysis.ts
 */
export const CATEGORY_REQUIREMENTS: CategoryRequirement[] = [
  {
    category: 'rope',
    conditions: [
      {
        key: 'aspectRatio',
        check: (a) => a.aspectRatio >= 4,
        passedKey: 'lookingSharp',
        failedKey: 'needsMoreHeight',
        priority: 10,
      },
      {
        key: 'width',
        check: (a) => a.width === 1,
        passedKey: 'goodWidth',
        failedKey: 'tooWide',
        priority: 9,
      },
    ],
  },
  {
    category: 'weapon',
    conditions: [
      {
        key: 'aspectRatio',
        check: (a) => a.aspectRatio >= 2.5,
        passedKey: 'lookingSharp',
        failedKey: 'needsMoreHeight',
        priority: 10,
      },
      {
        key: 'width',
        check: (a) => a.width <= 2,
        passedKey: 'goodWidth',
        failedKey: 'tooWide',
        priority: 9,
      },
      {
        key: 'isPointy',
        check: (a) => a.isPointy,
        passedKey: 'lookingSharp',
        failedKey: 'needsPointy',
        priority: 7,
      },
      {
        key: 'height',
        check: (a) => a.height >= 6,
        passedKey: 'goodHeight',
        failedKey: 'needsMoreHeight',
        priority: 6,
      },
    ],
  },
  {
    category: 'bridge',
    conditions: [
      {
        key: 'isFlat',
        check: (a) => a.isFlat,
        passedKey: 'niceAndFlat',
        failedKey: 'tooTall',
        priority: 10,
      },
      {
        key: 'height',
        check: (a) => a.height <= 2,
        passedKey: 'niceAndFlat',
        failedKey: 'tooTall',
        priority: 9,
      },
      {
        key: 'width',
        check: (a) => a.width >= 5,
        passedKey: 'goodWidth',
        failedKey: 'needsMoreWidth',
        priority: 8,
      },
    ],
  },
  {
    category: 'light',
    conditions: [
      {
        key: 'dominantColor',
        check: (a) => a.dominantColor === '5',
        passedKey: 'goodColors',
        failedKey: 'needsYellow',
        priority: 10,
      },
      {
        key: 'width',
        check: (a) => a.width <= 3,
        passedKey: 'goodSize',
        failedKey: 'tooWide',
        priority: 8,
      },
      {
        key: 'height',
        check: (a) => a.height <= 3,
        passedKey: 'goodSize',
        failedKey: 'tooTall',
        priority: 8,
      },
    ],
  },
  {
    category: 'fire',
    conditions: [
      {
        key: 'hasWarmColors',
        check: (a) => a.hasWarmColors,
        passedKey: 'goodColors',
        failedKey: 'needsWarmColors',
        priority: 10,
      },
      {
        key: 'dominantColor',
        check: (a) => ['2', '5', '8', 'C'].includes(a.dominantColor),
        passedKey: 'goodColors',
        failedKey: 'needsWarmColors',
        priority: 9,
      },
    ],
  },
  {
    category: 'water',
    conditions: [
      {
        key: 'dominantColor',
        check: (a) => ['4', '7', 'A'].includes(a.dominantColor),
        passedKey: 'goodColors',
        failedKey: 'needsCoolColors',
        priority: 10,
      },
      {
        key: 'hasCoolColors',
        check: (a) => a.hasCoolColors,
        passedKey: 'goodColors',
        failedKey: 'needsCoolColors',
        priority: 9,
      },
    ],
  },
  {
    category: 'shelter',
    conditions: [
      {
        key: 'isHollow',
        check: (a) => a.isHollow,
        passedKey: 'goodHollow',
        failedKey: 'needsHollow',
        priority: 10,
      },
      {
        key: 'width',
        check: (a) => a.width >= 4,
        passedKey: 'goodWidth',
        failedKey: 'needsMoreWidth',
        priority: 9,
      },
      {
        key: 'height',
        check: (a) => a.height >= 4,
        passedKey: 'goodHeight',
        failedKey: 'needsMoreHeight',
        priority: 9,
      },
    ],
  },
  {
    category: 'boat',
    conditions: [
      {
        key: 'isHollow',
        check: (a) => a.isHollow,
        passedKey: 'goodHollow',
        failedKey: 'needsHollow',
        priority: 10,
      },
      {
        key: 'centerY',
        check: (a) => a.centerY >= 5,
        passedKey: 'goodPosition',
        failedKey: 'moveDown',
        priority: 9,
      },
      {
        key: 'density',
        check: (a) => a.density < 0.8,
        passedKey: 'goodDensity',
        failedKey: 'tooDense',
        priority: 7,
      },
    ],
  },
  {
    category: 'trap',
    conditions: [
      {
        key: 'isPointy',
        check: (a) => a.isPointy,
        passedKey: 'lookingSharp',
        failedKey: 'needsPointy',
        priority: 10,
      },
      {
        key: 'centerY',
        check: (a) => a.centerY >= 5,
        passedKey: 'goodPosition',
        failedKey: 'moveDown',
        priority: 9,
      },
    ],
  },
  {
    category: 'shield',
    conditions: [
      {
        key: 'width',
        check: (a) => a.width >= 3,
        passedKey: 'goodWidth',
        failedKey: 'needsMoreWidth',
        priority: 10,
      },
      {
        key: 'height',
        check: (a) => a.height >= 3,
        passedKey: 'goodHeight',
        failedKey: 'needsMoreHeight',
        priority: 10,
      },
      {
        key: 'density',
        check: (a) => a.density > 0.7,
        passedKey: 'sturdyLooking',
        failedKey: 'needsDenser',
        priority: 9,
      },
      {
        key: 'isNotHollow',
        check: (a) => !a.isHollow,
        passedKey: 'sturdyLooking',
        failedKey: 'tooHollow',
        priority: 8,
      },
    ],
  },
  {
    category: 'armor',
    conditions: [
      {
        key: 'width',
        check: (a) => a.width >= 5,
        passedKey: 'goodWidth',
        failedKey: 'needsMoreWidth',
        priority: 10,
      },
      {
        key: 'height',
        check: (a) => a.height >= 5,
        passedKey: 'goodHeight',
        failedKey: 'needsMoreHeight',
        priority: 10,
      },
      {
        key: 'density',
        check: (a) => a.density > 0.5,
        passedKey: 'sturdyLooking',
        failedKey: 'needsDenser',
        priority: 8,
      },
    ],
  },
  {
    category: 'food',
    conditions: [
      {
        key: 'width',
        check: (a) => a.width <= 3,
        passedKey: 'goodSize',
        failedKey: 'tooWide',
        priority: 9,
      },
      {
        key: 'height',
        check: (a) => a.height <= 3,
        passedKey: 'goodSize',
        failedKey: 'tooTall',
        priority: 9,
      },
      {
        key: 'dominantColor',
        check: (a) => ['3', 'B', 'F'].includes(a.dominantColor),
        passedKey: 'goodColors',
        failedKey: 'needsNaturalColors',
        priority: 10,
      },
    ],
  },
  {
    category: 'potion',
    conditions: [
      {
        key: 'width',
        check: (a) => a.width <= 3,
        passedKey: 'goodSize',
        failedKey: 'tooWide',
        priority: 9,
      },
      {
        key: 'height',
        check: (a) => a.height <= 4,
        passedKey: 'goodSize',
        failedKey: 'tooTall',
        priority: 9,
      },
      {
        key: 'density',
        check: (a) => a.density > 0.6,
        passedKey: 'sturdyLooking',
        failedKey: 'needsDenser',
        priority: 8,
      },
    ],
  },
  {
    category: 'distraction',
    conditions: [
      {
        key: 'density',
        check: (a) => a.density < 0.4,
        passedKey: 'goodSpread',
        failedKey: 'tooDense',
        priority: 10,
      },
      {
        key: 'isNotHollow',
        check: (a) => !a.isHollow,
        passedKey: 'goodShape',
        failedKey: 'tooHollow',
        priority: 8,
      },
    ],
  },
  {
    category: 'tool',
    conditions: [
      {
        key: 'density',
        check: (a) => a.density > 0.5,
        passedKey: 'sturdyLooking',
        failedKey: 'needsDenser',
        priority: 9,
      },
      {
        key: 'pixelCount',
        check: (a) => a.pixelCount >= 10,
        passedKey: 'goodSize',
        failedKey: 'needsMorePixels',
        priority: 8,
      },
    ],
  },
];

// ============================================
// HINT GENERATION
// ============================================

/**
 * Generate soft hints based on current drawing analysis for a target category
 */
export function generateSoftHints(
  analysis: DrawableAnalysis | null,
  targetCategory: DrawingCategory
): SoftHint[] {
  if (!analysis) return [];

  const hints: SoftHint[] = [];

  // Find requirements for target category
  const requirements = CATEGORY_REQUIREMENTS.find((req) => req.category === targetCategory);
  if (!requirements) {
    return hints;
  }

  // Check each condition and generate hints
  for (const condition of requirements.conditions) {
    const passed = condition.check(analysis);
    hints.push({
      type: passed ? 'positive' : 'negative',
      key: passed ? condition.passedKey : condition.failedKey,
      priority: condition.priority,
    });
  }

  // Sort by priority (highest first)
  hints.sort((a, b) => b.priority - a.priority);

  // Deduplicate by key (keep highest priority)
  const seen = new Set<string>();
  return hints.filter((hint) => {
    if (seen.has(hint.key)) return false;
    seen.add(hint.key);
    return true;
  });
}

/**
 * Generate hints for multiple target categories (for events with multiple solutions)
 * Returns hints grouped by how close each category is
 */
export function generateHintsForSolutions(
  analysis: DrawableAnalysis | null,
  targetCategories: DrawingCategory[]
): { category: DrawingCategory; hints: SoftHint[]; score: number }[] {
  if (!analysis) return [];

  return targetCategories
    .map((category) => {
      const hints = generateSoftHints(analysis, category);
      const positiveCount = hints.filter((h) => h.type === 'positive').length;
      const score = hints.length > 0 ? (positiveCount / hints.length) * 100 : 0;
      return { category, hints, score };
    })
    .sort((a, b) => b.score - a.score);
}

/**
 * Get the single best hint to show (most important negative for closest target)
 */
export function getBestHint(
  analysis: DrawableAnalysis | null,
  targetCategories: DrawingCategory[]
): SoftHint | null {
  const solutions = generateHintsForSolutions(analysis, targetCategories);
  if (solutions.length === 0) return null;

  // Find the closest category (highest score)
  const closest = solutions[0];

  // Return the most important negative hint for that category
  const negativeHint = closest.hints.find((h) => h.type === 'negative');
  if (negativeHint) return negativeHint;

  // If all positive, return the best positive
  return closest.hints[0] ?? null;
}

/**
 * Explain why a drawing was categorized a certain way
 * and what's missing to match the target category
 */
export function explainCategoryMatch(
  analysis: DrawableAnalysis,
  detectedCategory: DrawingCategory,
  targetCategory: DrawingCategory
): CategoryMatchExplanation {
  const matchedConditions: string[] = [];
  const missingConditions: string[] = [];
  const suggestions: string[] = [];

  // Find requirements for both categories
  const detectedReqs = CATEGORY_REQUIREMENTS.find((req) => req.category === detectedCategory);
  const targetReqs = CATEGORY_REQUIREMENTS.find((req) => req.category === targetCategory);

  // Check what matched in detected category
  if (detectedReqs) {
    for (const condition of detectedReqs.conditions) {
      if (condition.check(analysis)) {
        matchedConditions.push(condition.passedKey);
      }
    }
  }

  // Check what's missing for target category
  if (targetReqs) {
    for (const condition of targetReqs.conditions) {
      if (!condition.check(analysis)) {
        missingConditions.push(condition.failedKey);
        suggestions.push(condition.failedKey);
      }
    }
  }

  // Calculate match score (percentage of target conditions met)
  let matchScore = 0;
  if (targetReqs && targetReqs.conditions.length > 0) {
    const metConditions = targetReqs.conditions.filter((c) => c.check(analysis)).length;
    matchScore = Math.round((metConditions / targetReqs.conditions.length) * 100);
  }

  return {
    detectedCategory,
    matchedConditions: [...new Set(matchedConditions)],
    targetCategory,
    missingConditions: [...new Set(missingConditions)],
    suggestions: [...new Set(suggestions)],
    matchScore,
  };
}

/**
 * Get the top N most important hints to show
 */
export function getTopHints(hints: SoftHint[], count: number = 3): SoftHint[] {
  return hints.slice(0, count);
}

/**
 * Get a single most important negative hint (what to fix)
 */
export function getPrimaryNegativeHint(hints: SoftHint[]): SoftHint | null {
  const negativeHints = hints.filter((h) => h.type === 'negative');
  return negativeHints.length > 0 ? negativeHints[0] : null;
}

/**
 * Get a single most important positive hint (what's good)
 */
export function getPrimaryPositiveHint(hints: SoftHint[]): SoftHint | null {
  const positiveHints = hints.filter((h) => h.type === 'positive');
  return positiveHints.length > 0 ? positiveHints[0] : null;
}

/**
 * Check if drawing meets minimum requirements for a category
 */
export function meetsMinimumRequirements(
  analysis: DrawableAnalysis,
  category: DrawingCategory,
  threshold: number = 0.5
): boolean {
  const requirements = CATEGORY_REQUIREMENTS.find((req) => req.category === category);
  if (!requirements || requirements.conditions.length === 0) {
    return false;
  }

  const metConditions = requirements.conditions.filter((c) => c.check(analysis)).length;
  const percentage = metConditions / requirements.conditions.length;

  return percentage >= threshold;
}

/**
 * Get all conditions for a category (useful for tutorials/help)
 */
export function getCategoryConditions(category: DrawingCategory): CategoryCondition[] {
  const requirements = CATEGORY_REQUIREMENTS.find((req) => req.category === category);
  return requirements?.conditions ?? [];
}

/**
 * Generate a progress report for target category
 */
export function generateProgressReport(
  analysis: DrawableAnalysis | null,
  targetCategory: DrawingCategory
): ProgressReport {
  const requirements = CATEGORY_REQUIREMENTS.find((req) => req.category === targetCategory);

  if (!requirements || !analysis) {
    return {
      category: targetCategory,
      totalConditions: 0,
      metConditions: 0,
      percentage: 0,
      nextHint: null,
    };
  }

  const metConditions = requirements.conditions.filter((c) => c.check(analysis)).length;
  const totalConditions = requirements.conditions.length;
  const percentage = totalConditions > 0 ? Math.round((metConditions / totalConditions) * 100) : 0;

  // Find highest priority unmet condition
  const unmetConditions = requirements.conditions
    .filter((c) => !c.check(analysis))
    .sort((a, b) => b.priority - a.priority);

  const nextHint: SoftHint | null =
    unmetConditions.length > 0
      ? {
          type: 'negative',
          key: unmetConditions[0].failedKey,
          priority: unmetConditions[0].priority,
        }
      : null;

  return {
    category: targetCategory,
    totalConditions,
    metConditions,
    percentage,
    nextHint,
  };
}
