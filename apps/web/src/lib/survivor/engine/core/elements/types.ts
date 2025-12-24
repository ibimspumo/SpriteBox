/**
 * Element System - Core Type Definitions
 *
 * This is the SHARED element system used by all entities:
 * - Characters (player-created)
 * - Monsters
 * - Skills/Spells
 * - Items
 * - Environmental effects
 *
 * The element system follows a rock-paper-scissors style interaction
 * similar to Pokemon, where elements have strengths and weaknesses.
 *
 * @module engine/core/elements/types
 */

import type { ModifierTemplate } from '../../modifiers/types.js';

// ============================================
// ELEMENT TYPES
// ============================================

/**
 * All available element types.
 *
 * To add a new element:
 * 1. Add the type here
 * 2. Add definition in registry.ts
 * 3. Update interaction matrix in interactions.ts
 * 4. Add i18n translations
 */
export type ElementType =
	| 'fire'
	| 'water'
	| 'earth'
	| 'air'
	| 'light'
	| 'dark'
	| 'neutral';

/**
 * Element interaction result type.
 */
export type InteractionType =
	| 'super_effective'  // 2x damage (strong against)
	| 'effective'        // 1.5x damage (advantage)
	| 'normal'           // 1x damage (neutral)
	| 'resisted'         // 0.5x damage (weak against)
	| 'immune'           // 0x damage (complete immunity)
	| 'absorbed';        // Heals instead of damages (rare)

// ============================================
// ELEMENT DEFINITION
// ============================================

/**
 * Complete definition of an element.
 * Used for both display and gameplay mechanics.
 */
export interface ElementDefinition {
	/** Unique identifier */
	id: ElementType;

	/** i18n key for display name */
	nameKey: string;

	/** i18n key for description */
	descriptionKey: string;

	/** Icon (emoji or icon name) */
	icon: string;

	/** Primary CSS color */
	color: string;

	/** Secondary color for gradients/accents */
	colorSecondary: string;

	/** Background color (darker variant) */
	colorBackground: string;

	// === Combat Modifiers ===

	/**
	 * Passive stat modifiers for entities with this element.
	 * Applied permanently when entity has this element.
	 */
	passiveModifiers: ModifierTemplate[];

	// === Thematic Properties ===

	/** Associated damage type */
	damageType: ElementDamageType;

	/** Status effects commonly associated with this element */
	associatedStatuses: string[];

	/** Tags for filtering/grouping */
	tags: ElementTag[];
}

/**
 * Damage type associated with elements.
 */
export type ElementDamageType =
	| 'burn'        // Fire - DoT
	| 'freeze'      // Water/Ice - Slow
	| 'crush'       // Earth - Defense reduction
	| 'shock'       // Air/Lightning - Stun chance
	| 'holy'        // Light - Bonus vs Dark
	| 'shadow'      // Dark - Life steal
	| 'physical';   // Neutral - No special effect

/**
 * Tags for element categorization.
 */
export type ElementTag =
	| 'primary'     // Classic four elements
	| 'mystic'      // Light/Dark
	| 'neutral'     // No affinity
	| 'offensive'   // Focused on damage
	| 'defensive'   // Focused on protection
	| 'utility';    // Special effects

// ============================================
// ELEMENT INTERACTION
// ============================================

/**
 * Interaction between two elements.
 */
export interface ElementInteraction {
	/** Attacking element */
	attacker: ElementType;

	/** Defending element */
	defender: ElementType;

	/** Type of interaction */
	type: InteractionType;

	/** Damage multiplier */
	multiplier: number;

	/** i18n key for battle message (optional) */
	messageKey?: string;
}

/**
 * Full interaction matrix entry.
 */
export interface InteractionMatrixEntry {
	/** Defending elements and their interaction types */
	against: Partial<Record<ElementType, InteractionType>>;
}

// ============================================
// ELEMENT AFFINITY
// ============================================

/**
 * An entity's element affinity.
 * Supports primary + optional secondary element.
 */
export interface ElementAffinity {
	/** Primary element */
	primary: ElementType;

	/** Secondary element (optional, 50% effectiveness) */
	secondary?: ElementType;

	/** Primary affinity strength (0-1, default 1) */
	primaryStrength: number;

	/** Secondary affinity strength (0-1, default 0.5) */
	secondaryStrength: number;

	/** Whether this is a pure element (no secondary) */
	isPure: boolean;
}

/**
 * Create a simple element affinity (primary only).
 */
export function createElementAffinity(
	primary: ElementType,
	secondary?: ElementType
): ElementAffinity {
	return {
		primary,
		secondary,
		primaryStrength: 1.0,
		secondaryStrength: secondary ? 0.5 : 0,
		isPure: !secondary
	};
}

// ============================================
// ELEMENT CONTEXT
// ============================================

/**
 * Context for element-based calculations.
 * Passed to damage calculators, skill checks, etc.
 */
export interface ElementContext {
	/** Source entity's element affinity */
	sourceElement: ElementAffinity;

	/** Target entity's element affinity */
	targetElement: ElementAffinity;

	/** Environmental element modifier (optional) */
	environmentElement?: ElementType;

	/** Weather/time modifiers */
	conditions?: ElementConditions;
}

/**
 * Environmental conditions that affect elements.
 */
export interface ElementConditions {
	/** Current weather */
	weather?: 'sunny' | 'rainy' | 'stormy' | 'snowy' | 'foggy' | 'clear';

	/** Time of day */
	timeOfDay?: 'dawn' | 'day' | 'dusk' | 'night';

	/** Current terrain */
	terrain?: 'forest' | 'desert' | 'water' | 'mountain' | 'cave' | 'plains';

	/** Special modifiers */
	modifiers?: string[];
}

// ============================================
// CONSTANTS
// ============================================

/**
 * All element types as array (for iteration).
 */
export const ALL_ELEMENTS: readonly ElementType[] = [
	'fire',
	'water',
	'earth',
	'air',
	'light',
	'dark',
	'neutral'
] as const;

/**
 * Primary (classic) elements.
 */
export const PRIMARY_ELEMENTS: readonly ElementType[] = [
	'fire',
	'water',
	'earth',
	'air'
] as const;

/**
 * Mystic elements.
 */
export const MYSTIC_ELEMENTS: readonly ElementType[] = [
	'light',
	'dark'
] as const;

/**
 * Default multipliers for interaction types.
 */
export const INTERACTION_MULTIPLIERS: Record<InteractionType, number> = {
	super_effective: 2.0,
	effective: 1.5,
	normal: 1.0,
	resisted: 0.5,
	immune: 0,
	absorbed: -1.0  // Negative = heals
} as const;

/**
 * Default element for entities without a specific element.
 */
export const DEFAULT_ELEMENT: ElementType = 'neutral';
