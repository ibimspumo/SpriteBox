/**
 * Trait System - Type Definitions
 *
 * Traits are personality/playstyle modifiers determined by
 * how a player draws their character. They provide permanent
 * stat modifiers and special abilities.
 *
 * Unlike Elements (shared by all entities), Traits are
 * CHARACTER-SPECIFIC - derived from player drawing style.
 *
 * @module engine/character/traits/types
 */

import type { ModifierTemplate, ModifierCondition } from '../../modifiers/types.js';
import type { EffectTrigger } from '../../effects/types.js';

// ============================================
// TRAIT TYPES
// ============================================

/**
 * All available trait types.
 *
 * Traits are determined by drawing characteristics:
 * - Symmetry → Perfectionist / Chaotic
 * - Pixel count → Bulky / Minimalist
 * - Color variety → Creative / Focused
 * - Proportions → Intellectual / Grounded
 * - Default → Balanced
 */
export type TraitType =
	// Symmetry-based
	| 'perfectionist'   // High symmetry (>90%)
	| 'chaotic'         // Low symmetry (<20%)
	// Size-based
	| 'bulky'           // Many pixels (>50)
	| 'minimalist'      // Few pixels (<15)
	// Color-based
	| 'creative'        // Many colors (5+)
	| 'focused'         // Single color
	// Proportion-based
	| 'intellectual'    // Large head ratio (>40%)
	| 'grounded'        // Large leg ratio (>40%)
	// Default
	| 'balanced';       // No strong characteristics

/**
 * Trait category for grouping.
 */
export type TraitCategory =
	| 'offensive'     // Damage-focused traits
	| 'defensive'     // Survivability traits
	| 'utility'       // Speed, luck, special effects
	| 'balanced';     // Mixed benefits

// ============================================
// TRAIT DEFINITION
// ============================================

/**
 * Complete definition of a trait.
 */
export interface TraitDefinition {
	/** Unique identifier */
	id: TraitType;

	/** i18n key for display name */
	nameKey: string;

	/** i18n key for description */
	descriptionKey: string;

	/** i18n key for flavor text */
	flavorKey?: string;

	/** Icon (emoji or icon name) */
	icon: string;

	/** CSS color */
	color: string;

	/** Trait category */
	category: TraitCategory;

	// === Stat Modifiers ===

	/**
	 * Permanent stat modifiers applied at character creation.
	 */
	modifiers: ModifierTemplate[];

	// === Conditional Modifiers ===

	/**
	 * Modifiers that only activate under certain conditions.
	 */
	conditionalModifiers?: ConditionalTraitModifier[];

	// === Special Abilities ===

	/**
	 * Special ability granted by this trait.
	 */
	specialAbility?: TraitAbility;

	// === Synergies ===

	/**
	 * Elements that synergize well with this trait.
	 */
	elementSynergies?: ElementSynergy[];

	// === Tags ===

	/** Tags for filtering */
	tags: string[];
}

// ============================================
// CONDITIONAL MODIFIERS
// ============================================

/**
 * A modifier with activation conditions.
 */
export interface ConditionalTraitModifier extends ModifierTemplate {
	/** Condition for activation */
	condition: ModifierCondition;

	/** i18n key describing when this activates */
	conditionDescriptionKey?: string;
}

// ============================================
// TRAIT ABILITIES
// ============================================

/**
 * Special ability granted by a trait.
 */
export interface TraitAbility {
	/** Ability ID */
	id: string;

	/** i18n key for name */
	nameKey: string;

	/** i18n key for description */
	descriptionKey: string;

	/** When this ability triggers */
	trigger: TraitAbilityTrigger;

	/** Chance to trigger (0-100) */
	triggerChance: number;

	/** Cooldown in turns (0 = no cooldown) */
	cooldown: number;

	/** Effect when triggered */
	effect: TraitAbilityEffect;
}

/**
 * When a trait ability can trigger.
 */
export type TraitAbilityTrigger =
	| 'on_combat_start'
	| 'on_turn_start'
	| 'on_attack'
	| 'on_hit'
	| 'on_crit'
	| 'on_kill'
	| 'on_damage_taken'
	| 'on_low_hp'
	| 'on_level_up'
	| 'passive';

/**
 * Effect of a trait ability.
 */
export interface TraitAbilityEffect {
	/** Type of effect */
	type: TraitAbilityEffectType;

	/** Value/amount */
	value: number;

	/** Duration in turns (for buffs) */
	duration?: number;

	/** Target of effect */
	target: 'self' | 'enemy' | 'all_enemies';
}

export type TraitAbilityEffectType =
	| 'heal_percent'
	| 'damage_percent'
	| 'buff_attack'
	| 'buff_defense'
	| 'buff_speed'
	| 'debuff_attack'
	| 'debuff_defense'
	| 'gain_shield'
	| 'restore_mana'
	| 'gain_xp';

// ============================================
// ELEMENT SYNERGY
// ============================================

/**
 * Synergy between a trait and an element.
 */
export interface ElementSynergy {
	/** Element that synergizes */
	element: string;

	/** Bonus modifiers when combined */
	bonusModifiers: ModifierTemplate[];

	/** i18n key for synergy description */
	descriptionKey?: string;
}

// ============================================
// TRAIT DETECTION
// ============================================

/**
 * Result of trait detection from character analysis.
 */
export interface TraitDetectionResult {
	/** Detected trait */
	trait: TraitType;

	/** Confidence score (0-1) */
	confidence: number;

	/** Scores for all traits */
	scores: Record<TraitType, number>;

	/** Primary reason for detection */
	reason: string;

	/** Secondary trait (if close) */
	secondaryTrait?: TraitType;
}

// ============================================
// CONSTANTS
// ============================================

/**
 * All trait types as array.
 */
export const ALL_TRAITS: readonly TraitType[] = [
	'perfectionist',
	'chaotic',
	'bulky',
	'minimalist',
	'creative',
	'focused',
	'intellectual',
	'grounded',
	'balanced'
] as const;

/**
 * Offensive traits.
 */
export const OFFENSIVE_TRAITS: readonly TraitType[] = [
	'chaotic',
	'focused',
	'intellectual'
] as const;

/**
 * Defensive traits.
 */
export const DEFENSIVE_TRAITS: readonly TraitType[] = [
	'perfectionist',
	'bulky',
	'grounded'
] as const;

/**
 * Utility traits.
 */
export const UTILITY_TRAITS: readonly TraitType[] = [
	'minimalist',
	'creative'
] as const;
