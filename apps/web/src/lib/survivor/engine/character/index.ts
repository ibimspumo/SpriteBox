/**
 * Character System
 *
 * Complete character creation and management system.
 * Creates game characters from pixel art with:
 * - Pixel analysis
 * - Element detection
 * - Trait detection
 * - Stats calculation
 * - Engine integration
 *
 * @module engine/character
 *
 * @example
 * ```typescript
 * import { CharacterFactory } from '$lib/survivor/engine';
 *
 * // Create a character from pixel art
 * const character = CharacterFactory.create(pixelString, {
 *   name: 'MyHero'
 * });
 *
 * // Access character properties
 * console.log(character.elementAffinity.primary); // 'fire'
 * console.log(character.trait); // 'chaotic'
 * console.log(character.statManager.getStat('attack')); // 65
 *
 * // Preview without full creation
 * const preview = CharacterFactory.preview(pixelString);
 * console.log(preview.element.element); // 'water'
 * ```
 */

// ============================================
// TYPES (Re-exported for convenience)
// ============================================

export type {
	// Analyzer
	Pixel,
	BoundingBox,
	ColorCategory,
	ColorAnalysis,
	ShapeAnalysis,
	ProportionAnalysis,
	ComplexityAnalysis,
	CharacterAnalysis,
	AnalyzerOptions,
	// Element Detection
	ElementDetectionResult,
	// Traits
	TraitType,
	TraitCategory,
	TraitDefinition,
	ConditionalTraitModifier,
	TraitAbility,
	TraitAbilityTrigger,
	TraitAbilityEffect,
	TraitAbilityEffectType,
	ElementSynergy,
	TraitDetectionResult,
	// Stats
	StatCalculationResult,
	StatBreakdown,
	// Factory
	GameCharacter,
	CharacterCreationOptions,
	CharacterPreview,
	SerializedGameCharacter
} from './types.js';

// ============================================
// ANALYZER
// ============================================

export {
	PixelAnalyzer,
	defaultPixelAnalyzer,
	analyzeCharacterPixels,
	getColorCategory,
	DEFAULT_ANALYZER_OPTIONS
} from './analyzer/index.js';

// ============================================
// ELEMENT DETECTION
// ============================================

export {
	detectElement,
	getElementAffinities,
	matchesElement,
	getElementBreakdown,
	COLOR_ELEMENT_AFFINITY,
	ELEMENT_DETECTION_WEIGHTS
} from './element-detector.js';

// ============================================
// TRAITS
// ============================================

export {
	// Constants
	ALL_TRAITS,
	OFFENSIVE_TRAITS,
	DEFENSIVE_TRAITS,
	UTILITY_TRAITS,
	// Registry
	TRAIT_DEFINITIONS,
	getTraitDefinition,
	getAllTraitDefinitions,
	getTraitsByCategory,
	getTraitsByTag,
	isValidTrait,
	getTraitIcon,
	getTraitColor,
	getTraitsForElement,
	// Detection
	DETECTION_THRESHOLDS,
	detectTrait,
	getPossibleTraits,
	matchesTrait,
	getTraitBreakdown
} from './traits/index.js';

// ============================================
// STATS CALCULATOR
// ============================================

export {
	STAT_BUDGET_CONFIG,
	STAT_CALCULATION_CONFIG,
	calculateBaseStats,
	getStatsSummary,
	compareStats
} from './stats-calculator.js';

// ============================================
// FACTORY
// ============================================

export {
	CharacterFactory,
	serializeCharacter,
	deserializeCharacter
} from './factory.js';
