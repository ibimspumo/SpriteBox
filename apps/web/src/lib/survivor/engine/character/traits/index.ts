/**
 * Character Trait System
 *
 * Traits are personality modifiers derived from drawing style.
 * They provide permanent bonuses and special abilities.
 *
 * @module engine/character/traits
 */

// ============================================
// TYPES
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
} from './types.js';

export {
	ALL_TRAITS,
	OFFENSIVE_TRAITS,
	DEFENSIVE_TRAITS,
	UTILITY_TRAITS
} from './types.js';

// ============================================
// REGISTRY
// ============================================

export {
	TRAIT_DEFINITIONS,
	getTraitDefinition,
	getAllTraitDefinitions,
	getTraitsByCategory,
	getTraitsByTag,
	isValidTrait,
	getTraitIcon,
	getTraitColor,
	getTraitsForElement
} from './registry.js';

// ============================================
// DETECTOR
// ============================================

export {
	DETECTION_THRESHOLDS,
	detectTrait,
	getPossibleTraits,
	matchesTrait,
	getTraitBreakdown
} from './detector.js';
