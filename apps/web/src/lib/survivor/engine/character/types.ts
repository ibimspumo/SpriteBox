/**
 * Character System - Shared Types
 *
 * Re-exports all character-related types from submodules
 * for convenient importing.
 *
 * @module engine/character/types
 */

// ============================================
// ANALYZER TYPES
// ============================================

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
} from './analyzer/types.js';

// ============================================
// ELEMENT DETECTION TYPES
// ============================================

export type { ElementDetectionResult } from './element-detector.js';

// ============================================
// TRAIT TYPES
// ============================================

export type {
	TraitType,
	TraitCategory,
	TraitDefinition,
	ConditionalTraitModifier,
	TraitAbility,
	TraitAbilityTrigger,
	TraitAbilityEffect,
	TraitAbilityEffectType,
	ElementSynergy,
	TraitDetectionResult
} from './traits/types.js';

// ============================================
// STATS TYPES
// ============================================

export type {
	StatCalculationResult,
	StatBreakdown
} from './stats-calculator.js';

// ============================================
// FACTORY TYPES
// ============================================

export type {
	GameCharacter,
	CharacterCreationOptions,
	CharacterPreview,
	SerializedGameCharacter
} from './factory.js';
