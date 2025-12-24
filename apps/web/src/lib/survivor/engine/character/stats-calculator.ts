/**
 * Stats Calculator
 *
 * Calculates base character stats from pixel analysis.
 * Uses a BALANCED BUDGET SYSTEM where every character has
 * the same total stat points, but distribution varies based
 * on drawing characteristics.
 *
 * @module engine/character/stats-calculator
 */

import type { CharacterAnalysis } from './analyzer/types.js';
import type { BaseStats } from '../stats/types.js';
import { DEFAULT_BASE_STATS } from '../stats/types.js';

// ============================================
// BALANCING CONFIG
// ============================================

/**
 * Stat budget configuration.
 * All characters have the same total points.
 */
export const STAT_BUDGET_CONFIG = {
	// Total budget for primary combat stats (HP, Attack, Defense, Speed)
	primaryBudget: 280,

	// Total budget for secondary stats (Mana, Luck)
	secondaryBudget: 80,

	// Weight multipliers for how much each drawing property affects distribution
	weights: {
		// More pixels = more towards HP
		pixelCountWeight: 1.5,
		// Asymmetry = more towards Attack
		asymmetryWeight: 1.2,
		// Symmetry + Compactness = more towards Defense
		symmetryWeight: 1.0,
		compactnessWeight: 0.5,
		// Low density = more towards Speed
		lightnessWeight: 1.3,
		// Color diversity = more towards Mana
		diversityWeight: 1.0,
		// Color count = more towards Luck
		colorCountWeight: 1.0
	},

	// Min/Max constraints per stat (as percentage of budget share)
	constraints: {
		maxHp: { min: 60, max: 140 },
		maxMana: { min: 25, max: 60 },
		attack: { min: 25, max: 80 },
		defense: { min: 20, max: 75 },
		speed: { min: 25, max: 80 },
		luck: { min: 10, max: 45 }
	}
} as const;

// Legacy config for backward compatibility
export const STAT_CALCULATION_CONFIG = STAT_BUDGET_CONFIG;

// ============================================
// STAT CALCULATION RESULT
// ============================================

/**
 * Result of stat calculation with breakdown.
 */
export interface StatCalculationResult {
	/** Calculated base stats */
	stats: BaseStats;

	/** Breakdown of how each stat was calculated */
	breakdown: StatBreakdownMap;

	/** Quality score of the drawing */
	qualityScore: number;

	/** Raw weights before budget distribution */
	rawWeights?: {
		hp: number;
		attack: number;
		defense: number;
		speed: number;
		mana: number;
		luck: number;
	};
}

/**
 * Breakdown for a single stat.
 */
export interface StatBreakdown {
	/** Base value before modifiers */
	base: number;

	/** Individual modifiers applied */
	modifiers: Array<{
		name: string;
		value: number;
		source: string;
	}>;

	/** Final calculated value */
	final: number;
}

type StatBreakdownMap = Record<keyof BaseStats, StatBreakdown>;

// ============================================
// RAW WEIGHT CALCULATION
// ============================================

interface RawWeights {
	hp: number;
	attack: number;
	defense: number;
	speed: number;
	mana: number;
	luck: number;
}

/**
 * Calculate raw weights (0-1) for each stat based on drawing properties.
 * These determine how the budget is distributed.
 */
function calculateRawWeights(analysis: CharacterAnalysis): RawWeights {
	const { shape, color } = analysis;
	const w = STAT_BUDGET_CONFIG.weights;

	// Normalize pixel count (5-60 pixels -> 0-1)
	const normalizedPixels = clamp((shape.pixelCount - 5) / 55, 0, 1);

	// HP: Based on pixel count (more pixels = more substance)
	const hpWeight = normalizedPixels * w.pixelCountWeight;

	// Attack: Based on asymmetry (less symmetry = more aggressive)
	const asymmetry = 1 - shape.symmetry;
	const attackWeight = asymmetry * w.asymmetryWeight;

	// Defense: Based on symmetry + compactness (stable = defensive)
	const defenseWeight =
		shape.symmetry * w.symmetryWeight + shape.compactness * w.compactnessWeight;

	// Speed: Based on low density (lighter = faster)
	const lightness = 1 - shape.density;
	const speedWeight = lightness * w.lightnessWeight;

	// Mana: Based on color diversity
	const manaWeight = color.diversity * w.diversityWeight;

	// Luck: Based on color count (1-8 colors -> 0-1)
	const normalizedColors = clamp((color.colorCount - 1) / 7, 0, 1);
	const luckWeight = normalizedColors * w.colorCountWeight;

	return {
		hp: hpWeight,
		attack: attackWeight,
		defense: defenseWeight,
		speed: speedWeight,
		mana: manaWeight,
		luck: luckWeight
	};
}

// ============================================
// BUDGET DISTRIBUTION
// ============================================

/**
 * Distribute a budget among stats based on weights.
 *
 * NEW APPROACH: Weight-proportional distribution
 * - Each stat's weight (0-1) determines where it falls in its min-max range
 * - Low weight = closer to min, high weight = closer to max
 * - This ensures stats intuitively reflect their underlying properties
 * - Budget is then adjusted by scaling all stats proportionally
 */
function distributeBudget(
	weights: number[],
	budget: number,
	constraints: Array<{ min: number; max: number }>
): number[] {
	const n = weights.length;

	// Step 1: Map each weight to its position in the stat's range
	// weight 0 = min, weight 1 = max
	const rawValues = weights.map((w, i) => {
		const { min, max } = constraints[i];
		const range = max - min;
		// Clamp weight to 0-1 and interpolate
		const clampedWeight = clamp(w, 0, 1);
		return min + range * clampedWeight;
	});

	// Step 2: Calculate current total and scale to match budget
	const currentTotal = rawValues.reduce((sum, v) => sum + v, 0);

	if (currentTotal === 0) {
		// Edge case: all zeros, distribute minimums
		return constraints.map((c) => c.min);
	}

	// Scale factor to match budget
	const scale = budget / currentTotal;

	// Step 3: Apply scale and round, respecting constraints
	let values = rawValues.map((v, i) => {
		const { min, max } = constraints[i];
		return clamp(Math.round(v * scale), min, max);
	});

	// Step 4: Fine-tune to match budget exactly
	let attempts = 0;
	const maxAttempts = 10;

	while (attempts < maxAttempts) {
		const total = values.reduce((sum, v) => sum + v, 0);
		const diff = budget - total;

		if (diff === 0) break;

		// Find stats with room to adjust
		const adjustable: Array<{ idx: number; room: number; weight: number }> = [];
		for (let i = 0; i < n; i++) {
			const { min, max } = constraints[i];
			const room = diff > 0 ? max - values[i] : values[i] - min;
			if (room > 0) {
				adjustable.push({ idx: i, room, weight: weights[i] });
			}
		}

		if (adjustable.length === 0) break;

		// Prefer adjusting stats with higher weights when adding,
		// or lower weights when removing
		adjustable.sort((a, b) =>
			diff > 0 ? b.weight - a.weight : a.weight - b.weight
		);

		// Adjust one point at a time for precision
		const { idx } = adjustable[0];
		values[idx] += diff > 0 ? 1 : -1;
		attempts++;
	}

	return values;
}

// ============================================
// MAIN CALCULATION FUNCTION
// ============================================

/**
 * Calculate base stats from character analysis.
 * Uses budget system for balance.
 */
export function calculateBaseStats(analysis: CharacterAnalysis): StatCalculationResult {
	if (!analysis.isValid) {
		return {
			stats: { ...DEFAULT_BASE_STATS },
			breakdown: createEmptyBreakdown(),
			qualityScore: 0
		};
	}

	// Calculate quality score
	const qualityScore = calculateQualityScore(analysis);

	// Get raw weights for each stat
	const rawWeights = calculateRawWeights(analysis);

	// Distribute primary budget (HP, Attack, Defense, Speed)
	const primaryWeights = [rawWeights.hp, rawWeights.attack, rawWeights.defense, rawWeights.speed];
	const primaryConstraints = [
		STAT_BUDGET_CONFIG.constraints.maxHp,
		STAT_BUDGET_CONFIG.constraints.attack,
		STAT_BUDGET_CONFIG.constraints.defense,
		STAT_BUDGET_CONFIG.constraints.speed
	];
	const [maxHp, attack, defense, speed] = distributeBudget(
		primaryWeights,
		STAT_BUDGET_CONFIG.primaryBudget,
		primaryConstraints
	);

	// Distribute secondary budget (Mana, Luck)
	const secondaryWeights = [rawWeights.mana, rawWeights.luck];
	const secondaryConstraints = [
		STAT_BUDGET_CONFIG.constraints.maxMana,
		STAT_BUDGET_CONFIG.constraints.luck
	];
	const [maxMana, luck] = distributeBudget(
		secondaryWeights,
		STAT_BUDGET_CONFIG.secondaryBudget,
		secondaryConstraints
	);

	// Build stats object
	const stats: BaseStats = {
		maxHp,
		maxMana,
		attack,
		defense,
		speed,
		luck
	};

	// Build breakdown
	const breakdown = createBreakdown(stats, rawWeights, analysis);

	return {
		stats,
		breakdown,
		qualityScore,
		rawWeights
	};
}

// ============================================
// BREAKDOWN GENERATION
// ============================================

function createBreakdown(
	stats: BaseStats,
	weights: RawWeights,
	analysis: CharacterAnalysis
): StatBreakdownMap {
	const { shape, color } = analysis;

	return {
		maxHp: {
			base: STAT_BUDGET_CONFIG.constraints.maxHp.min,
			modifiers: [
				{
					name: 'Pixel mass',
					value: stats.maxHp - STAT_BUDGET_CONFIG.constraints.maxHp.min,
					source: `${shape.pixelCount} pixels (${Math.round(weights.hp * 100)}% weight)`
				}
			],
			final: stats.maxHp
		},
		maxMana: {
			base: STAT_BUDGET_CONFIG.constraints.maxMana.min,
			modifiers: [
				{
					name: 'Color diversity',
					value: stats.maxMana - STAT_BUDGET_CONFIG.constraints.maxMana.min,
					source: `${Math.round(color.diversity * 100)}% diversity`
				}
			],
			final: stats.maxMana
		},
		attack: {
			base: STAT_BUDGET_CONFIG.constraints.attack.min,
			modifiers: [
				{
					name: 'Asymmetry',
					value: stats.attack - STAT_BUDGET_CONFIG.constraints.attack.min,
					source: `${Math.round((1 - shape.symmetry) * 100)}% chaos`
				}
			],
			final: stats.attack
		},
		defense: {
			base: STAT_BUDGET_CONFIG.constraints.defense.min,
			modifiers: [
				{
					name: 'Stability',
					value: stats.defense - STAT_BUDGET_CONFIG.constraints.defense.min,
					source: `${Math.round(shape.symmetry * 100)}% symmetry, ${Math.round(shape.compactness * 100)}% compact`
				}
			],
			final: stats.defense
		},
		speed: {
			base: STAT_BUDGET_CONFIG.constraints.speed.min,
			modifiers: [
				{
					name: 'Lightness',
					value: stats.speed - STAT_BUDGET_CONFIG.constraints.speed.min,
					source: `${Math.round((1 - shape.density) * 100)}% light`
				}
			],
			final: stats.speed
		},
		luck: {
			base: STAT_BUDGET_CONFIG.constraints.luck.min,
			modifiers: [
				{
					name: 'Color variety',
					value: stats.luck - STAT_BUDGET_CONFIG.constraints.luck.min,
					source: `${color.colorCount} colors`
				}
			],
			final: stats.luck
		}
	};
}

// ============================================
// QUALITY SCORE
// ============================================

/**
 * Calculate overall quality score of the drawing.
 * Doesn't affect stats directly in budget system,
 * but useful for feedback.
 */
function calculateQualityScore(analysis: CharacterAnalysis): number {
	const { shape, color, complexity } = analysis;

	const factors = [
		// Reasonable size
		shape.pixelCount >= 10 && shape.pixelCount <= 50 ? 1 : 0.8,
		// Some color variety
		color.colorCount >= 2 && color.colorCount <= 6 ? 1 : 0.9,
		// Some complexity
		complexity.complexityScore > 20 ? 1 : 0.85,
		// Reasonable density
		shape.density > 0.2 && shape.density < 0.9 ? 1 : 0.9
	];

	return factors.reduce((sum, f) => sum + f, 0) / factors.length;
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

function clamp(value: number, min: number, max: number): number {
	return Math.min(max, Math.max(min, value));
}

function createEmptyBreakdown(): StatBreakdownMap {
	const emptyBreakdown: StatBreakdown = {
		base: 0,
		modifiers: [],
		final: 0
	};

	return {
		maxHp: { ...emptyBreakdown, base: DEFAULT_BASE_STATS.maxHp, final: DEFAULT_BASE_STATS.maxHp },
		maxMana: {
			...emptyBreakdown,
			base: DEFAULT_BASE_STATS.maxMana,
			final: DEFAULT_BASE_STATS.maxMana
		},
		attack: { ...emptyBreakdown, base: DEFAULT_BASE_STATS.attack, final: DEFAULT_BASE_STATS.attack },
		defense: {
			...emptyBreakdown,
			base: DEFAULT_BASE_STATS.defense,
			final: DEFAULT_BASE_STATS.defense
		},
		speed: { ...emptyBreakdown, base: DEFAULT_BASE_STATS.speed, final: DEFAULT_BASE_STATS.speed },
		luck: { ...emptyBreakdown, base: DEFAULT_BASE_STATS.luck, final: DEFAULT_BASE_STATS.luck }
	};
}

/**
 * Get a simple stats summary for display.
 */
export function getStatsSummary(stats: BaseStats): {
	offensive: number;
	defensive: number;
	utility: number;
	total: number;
} {
	const offensive = stats.attack + Math.round(stats.luck * 0.5);
	const defensive = stats.maxHp + stats.defense;
	const utility = stats.speed + stats.maxMana + Math.round(stats.luck * 0.5);
	const total = offensive + defensive + utility;

	return { offensive, defensive, utility, total };
}

/**
 * Compare two stat sets.
 */
export function compareStats(a: BaseStats, b: BaseStats): Record<keyof BaseStats, number> {
	return {
		maxHp: a.maxHp - b.maxHp,
		maxMana: a.maxMana - b.maxMana,
		attack: a.attack - b.attack,
		defense: a.defense - b.defense,
		speed: a.speed - b.speed,
		luck: a.luck - b.luck
	};
}

/**
 * Get the total stat budget.
 */
export function getTotalBudget(): number {
	return STAT_BUDGET_CONFIG.primaryBudget + STAT_BUDGET_CONFIG.secondaryBudget;
}
