/**
 * Element Detector
 *
 * Detects a character's element from pixel analysis.
 * Uses color analysis and drawing properties to determine
 * the most appropriate element.
 *
 * This is CHARACTER-SPECIFIC detection logic.
 * The element definitions themselves are in core/elements.
 *
 * @module engine/character/element-detector
 */

import type { CharacterAnalysis } from './analyzer/types.js';
import type { ElementType } from '../core/elements/types.js';
import { ALL_ELEMENTS, DEFAULT_ELEMENT } from '../core/elements/types.js';

// ============================================
// DETECTION RESULT
// ============================================

/**
 * Result of element detection.
 */
export interface ElementDetectionResult {
	/** Primary detected element */
	element: ElementType;

	/** Confidence score (0-1) */
	confidence: number;

	/** Secondary element affinity (if dual-element) */
	secondaryElement?: ElementType;

	/** Scores for all elements */
	scores: Record<ElementType, number>;

	/** Reason for detection */
	reason: string;
}

// ============================================
// DETECTION WEIGHTS
// ============================================

/**
 * Weights for element detection scoring.
 */
export const ELEMENT_DETECTION_WEIGHTS = {
	// Primary color influence (0-100)
	colorWeight: 60,

	// Secondary factors (0-100 each)
	densityWeight: 15,
	brightnessWeight: 15,
	diversityWeight: 10
} as const;

// ============================================
// COLOR TO ELEMENT MAPPING
// ============================================

/**
 * Map colors to element affinities.
 * Each color has a primary and optional secondary affinity.
 *
 * Colors: 0=Black, 1=White, 2=Red, 3=Green, 4=Blue, 5=Yellow,
 * 6=Magenta, 7=Cyan, 8=Orange, 9=Purple, A=Light Blue,
 * B=Lime, C=Pink, D=Gray, E=Light Gray, F=Brown
 */
export const COLOR_ELEMENT_AFFINITY: Record<string, { primary: ElementType; secondary?: ElementType; strength: number }> = {
	'0': { primary: 'dark', strength: 1.0 },           // Black → Dark
	'1': { primary: 'light', strength: 0.8 },          // White → Light
	'2': { primary: 'fire', strength: 1.0 },           // Red → Fire
	'3': { primary: 'earth', secondary: 'air', strength: 0.9 }, // Green → Earth
	'4': { primary: 'water', strength: 1.0 },          // Blue → Water
	'5': { primary: 'light', secondary: 'fire', strength: 0.9 }, // Yellow → Light
	'6': { primary: 'fire', secondary: 'dark', strength: 0.7 }, // Magenta → Fire/Dark
	'7': { primary: 'water', secondary: 'air', strength: 0.9 }, // Cyan → Water/Air
	'8': { primary: 'fire', secondary: 'earth', strength: 0.9 }, // Orange → Fire
	'9': { primary: 'dark', secondary: 'water', strength: 0.8 }, // Purple → Dark
	'A': { primary: 'water', secondary: 'air', strength: 0.8 }, // Light Blue → Water/Air
	'B': { primary: 'earth', secondary: 'light', strength: 0.8 }, // Lime → Earth/Light
	'C': { primary: 'fire', secondary: 'light', strength: 0.6 }, // Pink → Fire/Light
	'D': { primary: 'neutral', strength: 0.5 },        // Gray → Neutral
	'E': { primary: 'air', secondary: 'light', strength: 0.7 }, // Light Gray → Air/Light
	'F': { primary: 'earth', strength: 1.0 }           // Brown → Earth
};

// ============================================
// SCORING FUNCTIONS
// ============================================

/**
 * Calculate element scores from color analysis.
 */
function calculateColorScores(analysis: CharacterAnalysis): Record<ElementType, number> {
	const scores: Record<ElementType, number> = {
		fire: 0,
		water: 0,
		earth: 0,
		air: 0,
		light: 0,
		dark: 0,
		neutral: 0
	};

	const { filledPixels } = analysis;
	if (filledPixels.length === 0) {
		scores.neutral = 50;
		return scores;
	}

	// Count element contributions from each pixel
	for (const pixel of filledPixels) {
		const affinity = COLOR_ELEMENT_AFFINITY[pixel.color.toUpperCase()];
		if (affinity) {
			scores[affinity.primary] += affinity.strength;
			if (affinity.secondary) {
				scores[affinity.secondary] += affinity.strength * 0.4;
			}
		}
	}

	// Normalize to 0-100 scale
	const maxScore = Math.max(...Object.values(scores), 1);
	for (const element of ALL_ELEMENTS) {
		scores[element] = Math.round((scores[element] / maxScore) * 100);
	}

	return scores;
}

/**
 * Apply density modifiers to element scores.
 * Low density → Air, High density → Earth
 */
function applyDensityModifier(
	scores: Record<ElementType, number>,
	density: number
): void {
	// Very low density favors air
	if (density < 0.3) {
		scores.air += 20 * (1 - density / 0.3);
	}
	// Very high density favors earth
	if (density > 0.7) {
		scores.earth += 20 * ((density - 0.7) / 0.3);
	}
}

/**
 * Apply brightness modifiers to element scores.
 * Bright colors → Light, Dark colors → Dark
 */
function applyBrightnessModifier(
	scores: Record<ElementType, number>,
	analysis: CharacterAnalysis
): void {
	const { color } = analysis;

	// Bright colors (white, yellow, light gray)
	const brightPixels = color.categories.bright;
	const darkPixels = color.categories.dark;
	const total = analysis.filledPixels.length;

	if (total > 0) {
		const brightRatio = brightPixels / total;
		const darkRatio = darkPixels / total;

		if (brightRatio > 0.5) {
			scores.light += 15 * brightRatio;
		}
		if (darkRatio > 0.5) {
			scores.dark += 15 * darkRatio;
		}
	}
}

/**
 * Apply color diversity modifier.
 * High diversity → Neutral, Low diversity → stronger affinity
 */
function applyDiversityModifier(
	scores: Record<ElementType, number>,
	diversity: number
): void {
	// Very high diversity suggests no clear element
	if (diversity > 0.7) {
		scores.neutral += 15 * ((diversity - 0.7) / 0.3);
	}
}

// ============================================
// MAIN DETECTION FUNCTION
// ============================================

/**
 * Detect element from character analysis.
 */
export function detectElement(analysis: CharacterAnalysis): ElementDetectionResult {
	if (!analysis.isValid) {
		return {
			element: DEFAULT_ELEMENT,
			confidence: 0,
			scores: createEmptyScores(),
			reason: 'Invalid analysis'
		};
	}

	// Calculate base scores from colors
	const scores = calculateColorScores(analysis);

	// Apply modifiers
	applyDensityModifier(scores, analysis.shape.density);
	applyBrightnessModifier(scores, analysis);
	applyDiversityModifier(scores, analysis.color.diversity);

	// Find best and second-best elements
	let bestElement: ElementType = 'neutral';
	let bestScore = 0;
	let secondElement: ElementType | undefined;
	let secondScore = 0;

	for (const [element, score] of Object.entries(scores) as Array<[ElementType, number]>) {
		if (score > bestScore) {
			secondElement = bestElement;
			secondScore = bestScore;
			bestElement = element;
			bestScore = score;
		} else if (score > secondScore) {
			secondElement = element;
			secondScore = score;
		}
	}

	// Calculate confidence
	const scoreDiff = bestScore - secondScore;
	const confidence = Math.min(1, (bestScore / 100) * (0.5 + scoreDiff / 100));

	// Determine if secondary element is significant
	const hasSecondary = secondScore > bestScore * 0.6 && secondScore > 30;

	return {
		element: bestElement,
		confidence,
		secondaryElement: hasSecondary ? secondElement : undefined,
		scores,
		reason: getDetectionReason(bestElement, analysis, scores)
	};
}

/**
 * Get detection reason for display.
 */
function getDetectionReason(
	element: ElementType,
	analysis: CharacterAnalysis,
	scores: Record<ElementType, number>
): string {
	const { color, shape } = analysis;

	switch (element) {
		case 'fire':
			return `Warm colors detected (${color.categories.warm} pixels)`;
		case 'water':
			return `Cool colors detected (${color.categories.cool} pixels)`;
		case 'earth':
			return `Natural colors detected (${color.categories.natural} pixels)`;
		case 'air':
			if (shape.density < 0.3) {
				return `Low density drawing (${Math.round(shape.density * 100)}%)`;
			}
			return `Light, airy colors detected`;
		case 'light':
			return `Bright colors dominant (${color.categories.bright} pixels)`;
		case 'dark':
			return `Dark colors dominant (${color.categories.dark} pixels)`;
		case 'neutral':
			if (color.diversity > 0.7) {
				return `High color diversity suggests no clear affinity`;
			}
			return `No dominant elemental colors`;
		default:
			return `Score: ${scores[element]}`;
	}
}

/**
 * Create empty scores object.
 */
function createEmptyScores(): Record<ElementType, number> {
	return {
		fire: 0,
		water: 0,
		earth: 0,
		air: 0,
		light: 0,
		dark: 0,
		neutral: 50
	};
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * Get all elements that have significant affinity based on analysis.
 */
export function getElementAffinities(
	analysis: CharacterAnalysis
): Array<{ element: ElementType; score: number }> {
	const result = detectElement(analysis);

	return Object.entries(result.scores)
		.filter(([_, score]) => score > 20)
		.map(([element, score]) => ({
			element: element as ElementType,
			score
		}))
		.sort((a, b) => b.score - a.score);
}

/**
 * Check if an analysis matches a specific element.
 */
export function matchesElement(
	analysis: CharacterAnalysis,
	element: ElementType,
	threshold: number = 50
): boolean {
	const result = detectElement(analysis);
	return result.scores[element] >= threshold;
}

/**
 * Get a breakdown of element detection for UI display.
 */
export function getElementBreakdown(
	analysis: CharacterAnalysis
): {
	primary: { element: ElementType; score: number; reason: string };
	secondary?: { element: ElementType; score: number };
	all: Array<{ element: ElementType; score: number }>;
} {
	const result = detectElement(analysis);

	const sortedElements = Object.entries(result.scores)
		.map(([element, score]) => ({ element: element as ElementType, score }))
		.sort((a, b) => b.score - a.score);

	return {
		primary: {
			element: result.element,
			score: result.scores[result.element],
			reason: result.reason
		},
		secondary: result.secondaryElement
			? {
					element: result.secondaryElement,
					score: result.scores[result.secondaryElement]
				}
			: undefined,
		all: sortedElements
	};
}
