/**
 * Damage System - Type Definitions
 *
 * Defines damage types, damage instances, and damage calculation.
 * Works in conjunction with the element system.
 *
 * @module engine/core/damage/types
 */

import type { ElementType, ElementAffinity } from '../elements/types.js';

// ============================================
// DAMAGE TYPES
// ============================================

/**
 * Physical vs Magical damage category.
 */
export type DamageCategory = 'physical' | 'magical' | 'true';

/**
 * Specific damage type (used for resistances/immunities).
 */
export type DamageType =
	// Physical subtypes
	| 'slash'
	| 'pierce'
	| 'blunt'
	| 'crush'
	// Magical subtypes
	| 'fire'
	| 'ice'
	| 'lightning'
	| 'poison'
	| 'holy'
	| 'shadow'
	// Special
	| 'true'      // Ignores all defenses
	| 'pure';     // Ignores shields

// ============================================
// DAMAGE INSTANCE
// ============================================

/**
 * A single instance of damage.
 */
export interface DamageInstance {
	/** Base damage amount before modifiers */
	baseDamage: number;

	/** Final damage after all calculations */
	finalDamage: number;

	/** Damage category */
	category: DamageCategory;

	/** Specific damage type */
	type: DamageType;

	/** Element of the damage source */
	element: ElementType;

	/** Whether this was a critical hit */
	isCritical: boolean;

	/** Critical multiplier applied (1.0 if not crit) */
	critMultiplier: number;

	/** Element multiplier applied */
	elementMultiplier: number;

	/** Defense reduction applied */
	defenseReduction: number;

	/** Source of the damage */
	source: DamageSource;
}

/**
 * Source of damage for tracking/display.
 */
export interface DamageSource {
	/** Type of source */
	type: 'attack' | 'skill' | 'effect' | 'environment' | 'reflect';

	/** Source ID (skill ID, effect ID, etc.) */
	id: string;

	/** Display name */
	name: string;

	/** Entity that dealt the damage */
	entityId?: string;
}

// ============================================
// DAMAGE CALCULATION
// ============================================

/**
 * Input for damage calculation.
 */
export interface DamageCalculationInput {
	/** Base damage amount */
	baseDamage: number;

	/** Damage category */
	category: DamageCategory;

	/** Damage type */
	type: DamageType;

	/** Attacker's element affinity */
	attackerElement: ElementAffinity;

	/** Defender's element affinity */
	defenderElement: ElementAffinity;

	/** Attacker's relevant stats */
	attackerStats: {
		attack: number;
		critChance: number;
		critDamage: number;
		armorPenetration?: number;
	};

	/** Defender's relevant stats */
	defenderStats: {
		defense: number;
		magicDefense?: number;
		dodgeChance?: number;
	};

	/** Random roll for crit (0-100) */
	critRoll: number;

	/** Random roll for dodge (0-100) */
	dodgeRoll?: number;

	/** Additional multipliers */
	bonusMultipliers?: number[];

	/** Source for tracking */
	source: DamageSource;
}

/**
 * Result of damage calculation.
 */
export interface DamageCalculationResult {
	/** The calculated damage instance */
	damage: DamageInstance;

	/** Whether the attack was dodged */
	wasDodged: boolean;

	/** Whether the attack was blocked */
	wasBlocked: boolean;

	/** Breakdown for UI display */
	breakdown: DamageBreakdown;
}

/**
 * Breakdown of damage calculation for tooltips.
 */
export interface DamageBreakdown {
	baseDamage: number;
	attackBonus: number;
	critBonus: number;
	elementBonus: number;
	defenseReduction: number;
	otherModifiers: Array<{ name: string; value: number }>;
	finalDamage: number;
}

// ============================================
// DAMAGE OVER TIME
// ============================================

/**
 * Damage over time effect.
 */
export interface DamageOverTime {
	/** Unique ID */
	id: string;

	/** Damage per tick */
	damagePerTick: number;

	/** Number of ticks remaining */
	ticksRemaining: number;

	/** Total ticks (for display) */
	totalTicks: number;

	/** Tick interval in ms (for real-time) or 1 (for turn-based) */
	tickInterval: number;

	/** Damage type */
	type: DamageType;

	/** Element */
	element: ElementType;

	/** Source */
	source: DamageSource;

	/** Can this DoT crit? */
	canCrit: boolean;

	/** Can this DoT be cleansed? */
	canBeCleansed: boolean;
}

// ============================================
// DAMAGE MODIFIERS
// ============================================

/**
 * A modifier that affects damage calculation.
 */
export interface DamageModifier {
	/** Unique ID */
	id: string;

	/** When this modifier applies */
	trigger: DamageModifierTrigger;

	/** Type of modification */
	type: DamageModifierType;

	/** Value of modification */
	value: number;

	/** Conditions for this modifier */
	conditions?: DamageModifierCondition[];

	/** Priority (higher = applied first) */
	priority: number;
}

export type DamageModifierTrigger =
	| 'on_deal'      // When dealing damage
	| 'on_receive'   // When receiving damage
	| 'on_crit'      // On critical hits only
	| 'on_kill';     // On killing blow

export type DamageModifierType =
	| 'flat'         // +X damage
	| 'percent'      // +X% damage
	| 'multiply';    // *X damage

export interface DamageModifierCondition {
	type: 'element' | 'category' | 'hp_threshold' | 'target_type';
	value: string | number;
	comparison?: 'equals' | 'not_equals' | 'greater' | 'less';
}
