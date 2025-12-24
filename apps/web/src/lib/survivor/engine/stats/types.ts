/**
 * Stats System - Type Definitions
 *
 * This module defines all types for the stat management system.
 * Stats can be modified by items, buffs, debuffs, traits, events, and level-ups.
 *
 * @module engine/stats/types
 */

// ============================================
// STAT TYPES
// ============================================

/**
 * All available stat types in the system.
 * Add new stats here to extend the system.
 */
export type StatType =
	// Resource Stats (have current + max values)
	| 'hp'
	| 'maxHp'
	| 'mana'
	| 'maxMana'
	| 'shield'
	// Combat Stats
	| 'attack'
	| 'defense'
	| 'speed'
	| 'luck'
	// Critical Hit Stats
	| 'critChance'
	| 'critDamage'
	// Defensive Stats
	| 'dodgeChance'
	| 'armorPenetration'
	// Utility Stats (multipliers, base 100 = 1.0x)
	| 'xpRate'
	| 'dropChance';

/**
 * Categories for organizing stats in UI and logic.
 */
export type StatCategory =
	| 'resource' // HP, Mana, Shield - have current/max values
	| 'combat' // Attack, Defense, Speed, Luck - core combat stats
	| 'critical' // Crit Chance, Crit Damage
	| 'defensive' // Dodge, Armor Pen
	| 'utility'; // XP Rate, Drop Chance - multipliers

/**
 * How a stat value is calculated from modifiers.
 */
export type CalculationType =
	| 'additive' // Sum all modifiers (most stats)
	| 'multiplicative'; // Multiply all modifiers (for rate stats)

/**
 * How to display a stat value in the UI.
 */
export type DisplayFormat =
	| 'integer' // 100
	| 'percent' // 25%
	| 'decimal' // 1.5
	| 'multiplier'; // 1.5x

// ============================================
// STAT DEFINITION
// ============================================

/**
 * Definition of a single stat type.
 * Used to configure how each stat behaves.
 */
export interface StatDefinition {
	/** Unique identifier for this stat */
	id: StatType;

	/** Category for UI grouping */
	category: StatCategory;

	/** i18n key for display name (e.g., 'pixelSurvivor.stats.hp') */
	displayKey: string;

	/** Icon name for UI */
	icon: string;

	/** CSS color variable for UI */
	color: string;

	// === Value Constraints ===

	/** Minimum allowed value */
	min: number;

	/** Maximum allowed value */
	max: number;

	/** Default value when not modified */
	defaultValue: number;

	// === Behavior ===

	/** Whether this stat has current/max values (HP, Mana) */
	isResource: boolean;

	/** How modifiers are combined */
	calculationType: CalculationType;

	/** How to display the value */
	displayFormat: DisplayFormat;

	/** Decimal places for display (only for 'decimal' format) */
	precision?: number;

	/** Description i18n key for tooltips */
	descriptionKey?: string;
}

// ============================================
// STAT VALUES
// ============================================

/**
 * Runtime value of a single stat.
 */
export interface StatValue {
	/** Base value from character creation */
	base: number;

	/** Current calculated value (after all modifiers) */
	current: number;

	/** For resource stats: current resource amount */
	currentResource?: number;

	/** For resource stats: maximum resource amount */
	maxResource?: number;

	/** Whether the value is dirty and needs recalculation */
	isDirty: boolean;

	/** Last calculation timestamp */
	lastCalculated: number;
}

/**
 * Breakdown of how a stat value was calculated.
 * Useful for UI tooltips showing modifier sources.
 */
export interface StatBreakdown {
	/** The stat being broken down */
	stat: StatType;

	/** Base value before modifiers */
	baseValue: number;

	/** Final calculated value */
	finalValue: number;

	/** List of all modifiers applied */
	modifiers: StatModifierBreakdown[];
}

/**
 * Single modifier in a stat breakdown.
 */
export interface StatModifierBreakdown {
	/** Source name (e.g., "Iron Sword", "Rage Buff") */
	sourceName: string;

	/** Source type */
	sourceType: string;

	/** How it was calculated */
	operation: string;

	/** The modifier value */
	value: number;

	/** Contribution to final value */
	contribution: number;
}

// ============================================
// BASE STATS (from Character Creation)
// ============================================

/**
 * Base stats from character creation.
 * These are the starting values before any modifiers.
 */
export interface BaseStats {
	maxHp: number;
	maxMana: number;
	attack: number;
	defense: number;
	speed: number;
	luck: number;
}

/**
 * Default base stats for a new character.
 */
export const DEFAULT_BASE_STATS: BaseStats = {
	maxHp: 100,
	maxMana: 50,
	attack: 50,
	defense: 40,
	speed: 50,
	luck: 25
};

// ============================================
// SERIALIZATION
// ============================================

/**
 * Serialized stat value for storage.
 */
export interface SerializedStatValue {
	base: number;
	currentResource?: number;
}

/**
 * Serialized stats map for storage.
 */
export type SerializedStats = Record<StatType, SerializedStatValue>;
