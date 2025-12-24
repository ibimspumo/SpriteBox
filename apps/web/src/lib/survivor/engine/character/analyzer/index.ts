/**
 * Character Analyzer Module
 *
 * Exports all analyzer types and functions.
 *
 * @module engine/character/analyzer
 */

// Types
export type {
	Pixel,
	BoundingBox,
	ColorCategory,
	ColorAnalysis,
	ShapeAnalysis,
	ProportionAnalysis,
	ComplexityAnalysis,
	CharacterAnalysis,
	AnalyzerOptions
} from './types.js';

export { DEFAULT_ANALYZER_OPTIONS } from './types.js';

// Analyzer
export {
	PixelAnalyzer,
	defaultPixelAnalyzer,
	analyzeCharacterPixels,
	getColorCategory
} from './pixel-analyzer.js';
