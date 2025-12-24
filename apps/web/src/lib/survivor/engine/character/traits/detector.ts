/**
 * Trait Detector
 *
 * Detects character traits from pixel analysis results.
 * Each trait has specific detection criteria based on
 * drawing characteristics.
 *
 * @module engine/character/traits/detector
 */

import type { CharacterAnalysis } from '../analyzer/types.js';
import type { TraitType, TraitDetectionResult } from './types.js';
import { ALL_TRAITS } from './types.js';

// ============================================
// DETECTION THRESHOLDS
// ============================================

/**
 * Thresholds for trait detection.
 * Adjustable for balancing.
 */
export const DETECTION_THRESHOLDS = {
	// Symmetry-based
	perfectionist: {
		symmetryMin: 0.85,
		symmetryIdeal: 0.95
	},
	chaotic: {
		symmetryMax: 0.25,
		symmetryIdeal: 0.1
	},

	// Size-based
	bulky: {
		pixelsMin: 45,
		pixelsIdeal: 55
	},
	minimalist: {
		pixelsMax: 18,
		pixelsIdeal: 10
	},

	// Color-based
	creative: {
		colorsMin: 5,
		colorsIdeal: 7
	},
	focused: {
		colorsMax: 1,
		colorsIdeal: 1
	},

	// Proportion-based
	intellectual: {
		headRatioMin: 0.35,
		headRatioIdeal: 0.45
	},
	grounded: {
		legRatioMin: 0.35,
		legRatioIdeal: 0.45
	}
} as const;

// ============================================
// TRAIT SCORING
// ============================================

/**
 * Calculate score for a specific trait based on analysis.
 * Returns 0-100 score.
 */
function calculateTraitScore(trait: TraitType, analysis: CharacterAnalysis): number {
	const { shape, color, proportions } = analysis;

	switch (trait) {
		// ==========================================
		// PERFECTIONIST - High symmetry
		// ==========================================
		case 'perfectionist': {
			const { symmetryMin, symmetryIdeal } = DETECTION_THRESHOLDS.perfectionist;
			if (shape.symmetry < symmetryMin) return 0;

			// Scale from threshold to ideal
			const normalized = (shape.symmetry - symmetryMin) / (symmetryIdeal - symmetryMin);
			return Math.min(100, Math.round(normalized * 100));
		}

		// ==========================================
		// CHAOTIC - Low symmetry
		// ==========================================
		case 'chaotic': {
			const { symmetryMax, symmetryIdeal } = DETECTION_THRESHOLDS.chaotic;
			if (shape.symmetry > symmetryMax) return 0;

			// Lower symmetry = higher score
			const normalized = (symmetryMax - shape.symmetry) / (symmetryMax - symmetryIdeal);
			return Math.min(100, Math.round(normalized * 100));
		}

		// ==========================================
		// BULKY - Many pixels
		// ==========================================
		case 'bulky': {
			const { pixelsMin, pixelsIdeal } = DETECTION_THRESHOLDS.bulky;
			if (shape.pixelCount < pixelsMin) return 0;

			const normalized = (shape.pixelCount - pixelsMin) / (pixelsIdeal - pixelsMin);
			return Math.min(100, Math.round(normalized * 100));
		}

		// ==========================================
		// MINIMALIST - Few pixels
		// ==========================================
		case 'minimalist': {
			const { pixelsMax, pixelsIdeal } = DETECTION_THRESHOLDS.minimalist;
			if (shape.pixelCount > pixelsMax) return 0;

			// Fewer pixels = higher score
			const normalized = (pixelsMax - shape.pixelCount) / (pixelsMax - pixelsIdeal);
			return Math.min(100, Math.round(normalized * 100));
		}

		// ==========================================
		// CREATIVE - Many colors
		// ==========================================
		case 'creative': {
			const { colorsMin, colorsIdeal } = DETECTION_THRESHOLDS.creative;
			if (color.colorCount < colorsMin) return 0;

			const normalized = (color.colorCount - colorsMin) / (colorsIdeal - colorsMin);
			return Math.min(100, Math.round(normalized * 100));
		}

		// ==========================================
		// FOCUSED - Single color
		// ==========================================
		case 'focused': {
			const { colorsMax } = DETECTION_THRESHOLDS.focused;
			if (color.colorCount > colorsMax) return 0;

			// Exactly one color = 100
			return color.colorCount === 1 ? 100 : 0;
		}

		// ==========================================
		// INTELLECTUAL - Large head
		// ==========================================
		case 'intellectual': {
			const { headRatioMin, headRatioIdeal } = DETECTION_THRESHOLDS.intellectual;
			if (proportions.headRatio < headRatioMin) return 0;

			const normalized =
				(proportions.headRatio - headRatioMin) / (headRatioIdeal - headRatioMin);
			return Math.min(100, Math.round(normalized * 100));
		}

		// ==========================================
		// GROUNDED - Large legs
		// ==========================================
		case 'grounded': {
			const { legRatioMin, legRatioIdeal } = DETECTION_THRESHOLDS.grounded;
			if (proportions.legRatio < legRatioMin) return 0;

			const normalized =
				(proportions.legRatio - legRatioMin) / (legRatioIdeal - legRatioMin);
			return Math.min(100, Math.round(normalized * 100));
		}

		// ==========================================
		// BALANCED - Default (always has base score)
		// ==========================================
		case 'balanced': {
			// Balanced is the fallback - give it a base score
			// that can be beaten by other traits
			return 30;
		}

		default:
			return 0;
	}
}

/**
 * Get the reason string for a detected trait.
 */
function getDetectionReason(trait: TraitType, analysis: CharacterAnalysis): string {
	const { shape, color, proportions } = analysis;

	switch (trait) {
		case 'perfectionist':
			return `High symmetry (${Math.round(shape.symmetry * 100)}%)`;
		case 'chaotic':
			return `Low symmetry (${Math.round(shape.symmetry * 100)}%)`;
		case 'bulky':
			return `Many pixels (${shape.pixelCount})`;
		case 'minimalist':
			return `Few pixels (${shape.pixelCount})`;
		case 'creative':
			return `Many colors (${color.colorCount})`;
		case 'focused':
			return `Single color used`;
		case 'intellectual':
			return `Large head ratio (${Math.round(proportions.headRatio * 100)}%)`;
		case 'grounded':
			return `Large leg ratio (${Math.round(proportions.legRatio * 100)}%)`;
		case 'balanced':
			return `No dominant characteristic`;
		default:
			return `Unknown`;
	}
}

// ============================================
// MAIN DETECTION FUNCTION
// ============================================

/**
 * Detect trait from character analysis.
 */
export function detectTrait(analysis: CharacterAnalysis): TraitDetectionResult {
	if (!analysis.isValid) {
		return {
			trait: 'balanced',
			confidence: 0,
			scores: createEmptyScores(),
			reason: 'Invalid analysis'
		};
	}

	// Calculate scores for all traits
	const scores: Record<TraitType, number> = {} as Record<TraitType, number>;
	for (const trait of ALL_TRAITS) {
		scores[trait] = calculateTraitScore(trait, analysis);
	}

	// Find the highest scoring trait
	let bestTrait: TraitType = 'balanced';
	let bestScore = 0;
	let secondBestTrait: TraitType | undefined;
	let secondBestScore = 0;

	for (const [trait, score] of Object.entries(scores) as Array<[TraitType, number]>) {
		if (score > bestScore) {
			secondBestTrait = bestTrait;
			secondBestScore = bestScore;
			bestTrait = trait;
			bestScore = score;
		} else if (score > secondBestScore) {
			secondBestTrait = trait;
			secondBestScore = score;
		}
	}

	// Calculate confidence based on score difference
	const scoreDiff = bestScore - secondBestScore;
	const confidence = Math.min(1, bestScore / 100 * (0.5 + scoreDiff / 200));

	return {
		trait: bestTrait,
		confidence,
		scores,
		reason: getDetectionReason(bestTrait, analysis),
		secondaryTrait: secondBestScore > 20 ? secondBestTrait : undefined
	};
}

/**
 * Create empty scores object.
 */
function createEmptyScores(): Record<TraitType, number> {
	const scores: Record<TraitType, number> = {} as Record<TraitType, number>;
	for (const trait of ALL_TRAITS) {
		scores[trait] = 0;
	}
	scores.balanced = 30; // Default fallback score
	return scores;
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * Get all traits that could match the analysis (score > 0).
 */
export function getPossibleTraits(analysis: CharacterAnalysis): TraitType[] {
	if (!analysis.isValid) return ['balanced'];

	const possible: TraitType[] = [];
	for (const trait of ALL_TRAITS) {
		const score = calculateTraitScore(trait, analysis);
		if (score > 0) {
			possible.push(trait);
		}
	}

	return possible.length > 0 ? possible : ['balanced'];
}

/**
 * Check if a specific trait matches the analysis.
 */
export function matchesTrait(analysis: CharacterAnalysis, trait: TraitType): boolean {
	return calculateTraitScore(trait, analysis) > 0;
}

/**
 * Get a detailed breakdown of trait scores for UI.
 */
export function getTraitBreakdown(
	analysis: CharacterAnalysis
): Array<{ trait: TraitType; score: number; reason: string }> {
	if (!analysis.isValid) {
		return [{ trait: 'balanced', score: 30, reason: 'Default trait' }];
	}

	const breakdown: Array<{ trait: TraitType; score: number; reason: string }> = [];

	for (const trait of ALL_TRAITS) {
		const score = calculateTraitScore(trait, analysis);
		if (score > 0) {
			breakdown.push({
				trait,
				score,
				reason: getDetectionReason(trait, analysis)
			});
		}
	}

	// Sort by score descending
	breakdown.sort((a, b) => b.score - a.score);

	return breakdown;
}
