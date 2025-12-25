/**
 * Core Engine Systems
 *
 * Shared systems used by all game entities.
 *
 * @module engine/core
 */

// ============================================
// ELEMENTS
// ============================================

export {
	// Types
	type ElementType,
	type InteractionType,
	type ElementDefinition,
	type ElementDamageType,
	type ElementTag,
	type ElementInteraction,
	type InteractionMatrixEntry,
	type ElementAffinity,
	type ElementContext,
	type ElementConditions,
	// Constants
	ALL_ELEMENTS,
	PRIMARY_ELEMENTS,
	MYSTIC_ELEMENTS,
	INTERACTION_MULTIPLIERS,
	DEFAULT_ELEMENT,
	// Functions
	createElementAffinity,
	// Registry
	ELEMENT_DEFINITIONS,
	getElementDefinition,
	getAllElementDefinitions,
	getElementsByTag,
	getElementsByDamageType,
	isValidElement,
	getElementIcon,
	getElementColor,
	// Interactions
	INTERACTION_MATRIX,
	getInteractionType,
	getInteractionMultiplier,
	getElementInteraction,
	calculateElementMultiplier,
	calculateContextMultiplier,
	getStrongAgainst,
	getWeakAgainst,
	getResistedBy,
	hasAdvantage,
	hasDisadvantage,
	getElementMatchupSummary
} from './elements/index.js';

// ============================================
// DAMAGE
// ============================================

export type {
	DamageCategory,
	DamageType,
	DamageInstance,
	DamageSource,
	DamageCalculationInput,
	DamageCalculationResult,
	DamageBreakdown,
	DamageOverTime,
	DamageModifier,
	DamageModifierTrigger,
	DamageModifierType,
	DamageModifierCondition
} from './damage/index.js';

// ============================================
// RANDOM
// ============================================

export {
	secureRandomInt,
	secureRandomFloat,
	secureRandomString,
	secureRandomHex,
	secureShuffleArray,
	secureRandomChoice,
	secureWeightedChoice,
	generateSecureId
} from './random.js';
