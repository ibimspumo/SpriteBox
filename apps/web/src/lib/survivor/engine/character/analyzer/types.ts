/**
 * Character Analyzer - Type Definitions
 *
 * Types for pixel art analysis used in character creation.
 * The analyzer extracts visual properties from 8x8 pixel drawings
 * to determine character stats, elements, and traits.
 *
 * @module engine/character/analyzer/types
 */

// ============================================
// PIXEL TYPES
// ============================================

/**
 * A single pixel with position and color.
 */
export interface Pixel {
	/** X coordinate (0-7) */
	x: number;
	/** Y coordinate (0-7) */
	y: number;
	/** Color as hex character (0-F) */
	color: string;
}

/**
 * Bounding box of filled pixels.
 */
export interface BoundingBox {
	minX: number;
	maxX: number;
	minY: number;
	maxY: number;
	width: number;
	height: number;
}

// ============================================
// COLOR ANALYSIS
// ============================================

/**
 * Color category for element detection.
 */
export type ColorCategory =
	| 'warm' // Red, Orange, Pink - Fire affinity
	| 'cool' // Blue, Cyan, Light Blue - Water affinity
	| 'natural' // Green, Lime, Brown - Earth affinity
	| 'bright' // Yellow, White, Light Gray - Light affinity
	| 'dark' // Black, Dark Gray, Purple - Dark affinity
	| 'neutral'; // Gray tones - Air/Neutral affinity

/**
 * Result of color analysis.
 */
export interface ColorAnalysis {
	/** Most common color (hex character) */
	dominantColor: string;

	/** Number of unique colors used */
	colorCount: number;

	/** Colors by category */
	categories: {
		warm: number;
		cool: number;
		natural: number;
		bright: number;
		dark: number;
		neutral: number;
	};

	/** Which color categories are present */
	hasWarm: boolean;
	hasCool: boolean;
	hasNatural: boolean;
	hasBright: boolean;
	hasDark: boolean;

	/** Color palette diversity score (0-1) */
	diversity: number;
}

// ============================================
// SHAPE ANALYSIS
// ============================================

/**
 * Result of shape/form analysis.
 */
export interface ShapeAnalysis {
	/** Total filled pixels */
	pixelCount: number;

	/** Bounding box of the drawing */
	bounds: BoundingBox;

	/** Left-right symmetry (0-1, 1 = perfect mirror) */
	symmetry: number;

	/** Top-bottom balance (0-1, 1 = equal distribution) */
	balance: number;

	/** How filled the bounding box is (0-1) */
	density: number;

	/** How clustered vs spread the pixels are (0-1, 1 = very compact) */
	compactness: number;

	/** Center of mass */
	centroid: { x: number; y: number };

	/** Aspect ratio (width / height) */
	aspectRatio: number;
}

// ============================================
// PROPORTION ANALYSIS
// ============================================

/**
 * Body proportion analysis (for humanoid detection).
 */
export interface ProportionAnalysis {
	/** Pixels in top third (head area) */
	headRatio: number;

	/** Pixels in middle third (body area) */
	bodyRatio: number;

	/** Pixels in bottom third (legs area) */
	legRatio: number;

	/** Left side pixels ratio */
	leftRatio: number;

	/** Right side pixels ratio */
	rightRatio: number;

	/** Whether drawing appears humanoid */
	isHumanoid: boolean;
}

// ============================================
// COMPLEXITY ANALYSIS
// ============================================

/**
 * Complexity and detail analysis.
 */
export interface ComplexityAnalysis {
	/** Edge pixels (pixels adjacent to empty space) */
	edgeCount: number;

	/** Edge to total ratio (higher = more detailed outline) */
	edgeRatio: number;

	/** Number of distinct color regions */
	regionCount: number;

	/** Internal complexity score (0-100) */
	complexityScore: number;
}

// ============================================
// FULL CHARACTER ANALYSIS
// ============================================

/**
 * Complete analysis of a character drawing.
 * Used to determine element, trait, and base stats.
 */
export interface CharacterAnalysis {
	/** Whether the analysis is valid */
	isValid: boolean;

	/** Raw pixel data */
	pixels: string;

	/** All filled (non-background) pixels */
	filledPixels: Pixel[];

	/** Color analysis results */
	color: ColorAnalysis;

	/** Shape analysis results */
	shape: ShapeAnalysis;

	/** Proportion analysis results */
	proportions: ProportionAnalysis;

	/** Complexity analysis results */
	complexity: ComplexityAnalysis;

	/** Timestamp of analysis */
	analyzedAt: number;
}

// ============================================
// ANALYSIS OPTIONS
// ============================================

/**
 * Options for the analyzer.
 */
export interface AnalyzerOptions {
	/** Background color to ignore (default: '1' = white) */
	backgroundColor?: string;

	/** Grid size (default: 8) */
	gridSize?: number;

	/** Minimum pixels required for valid analysis (default: 3) */
	minPixels?: number;
}

/**
 * Default analyzer options.
 */
export const DEFAULT_ANALYZER_OPTIONS: Required<AnalyzerOptions> = {
	backgroundColor: '1',
	gridSize: 8,
	minPixels: 3
};
