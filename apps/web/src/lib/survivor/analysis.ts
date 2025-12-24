// apps/web/src/lib/survivor/analysis.ts
// Re-exports from engine for convenience

export {
	analyzeCharacterPixels,
	detectElement,
	detectTrait,
	calculateBaseStats,
	CharacterFactory
} from './engine/index.js';

export type {
	CharacterAnalysis,
	ColorAnalysis,
	ShapeAnalysis,
	ProportionAnalysis,
	ComplexityAnalysis,
	ElementDetectionResult,
	TraitDetectionResult
} from './engine/index.js';
