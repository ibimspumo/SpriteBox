/**
 * Core Element System
 *
 * Shared element system used by all game entities:
 * - Characters (players)
 * - Monsters
 * - Skills/Spells
 * - Items
 * - Environmental effects
 *
 * @module engine/core/elements
 *
 * @example
 * ```typescript
 * import {
 *   getElementDefinition,
 *   getInteractionMultiplier,
 *   calculateElementMultiplier,
 *   createElementAffinity
 * } from '$lib/survivor/engine';
 *
 * // Get element info
 * const fireDef = getElementDefinition('fire');
 * console.log(fireDef.icon); // 🔥
 *
 * // Calculate damage multiplier
 * const multiplier = getInteractionMultiplier('water', 'fire');
 * console.log(multiplier); // 2.0 (super effective!)
 *
 * // For entities with dual elements
 * const playerElement = createElementAffinity('fire', 'dark');
 * const monsterElement = createElementAffinity('water');
 * const result = calculateElementMultiplier(playerElement, monsterElement);
 * ```
 */

// ============================================
// TYPES
// ============================================

export type {
	ElementType,
	InteractionType,
	ElementDefinition,
	ElementDamageType,
	ElementTag,
	ElementInteraction,
	InteractionMatrixEntry,
	ElementAffinity,
	ElementContext,
	ElementConditions
} from './types.js';

export {
	ALL_ELEMENTS,
	PRIMARY_ELEMENTS,
	MYSTIC_ELEMENTS,
	INTERACTION_MULTIPLIERS,
	DEFAULT_ELEMENT,
	createElementAffinity
} from './types.js';

// ============================================
// REGISTRY
// ============================================

export {
	ELEMENT_DEFINITIONS,
	getElementDefinition,
	getAllElementDefinitions,
	getElementsByTag,
	getElementsByDamageType,
	isValidElement,
	getElementIcon,
	getElementColor
} from './registry.js';

// ============================================
// INTERACTIONS
// ============================================

export {
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
} from './interactions.js';
