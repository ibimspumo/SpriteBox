/**
 * Dice System - Type Definitions
 *
 * D20-based dice rolling system for combat and skill checks.
 * Inspired by D&D mechanics.
 *
 * @module engine/dice/types
 */

import type { StatType } from '../stats/types.js';

// ============================================
// DICE TYPES
// ============================================

/**
 * Standard RPG dice types.
 */
export type DiceType = 'd4' | 'd6' | 'd8' | 'd10' | 'd12' | 'd20' | 'd100';

/**
 * Mapping of dice type to max value.
 */
export const DICE_MAX: Record<DiceType, number> = {
	d4: 4,
	d6: 6,
	d8: 8,
	d10: 10,
	d12: 12,
	d20: 20,
	d100: 100
};

// ============================================
// DICE ROLL
// ============================================

/**
 * Configuration for a dice roll.
 */
export interface DiceRoll {
	/** Type of die to roll */
	dice: DiceType;

	/** Number of dice to roll (e.g., 2 for "2d6") */
	count: number;

	/** Flat modifier to add to the total */
	modifier: number;

	/** Roll twice and take the higher result */
	advantage: boolean;

	/** Roll twice and take the lower result */
	disadvantage: boolean;

	/** Minimum result (after modifiers) */
	minimum?: number;

	/** Maximum result (after modifiers) */
	maximum?: number;
}

/**
 * Default dice roll configuration.
 */
export const DEFAULT_DICE_ROLL: DiceRoll = {
	dice: 'd20',
	count: 1,
	modifier: 0,
	advantage: false,
	disadvantage: false
};

// ============================================
// ROLL RESULT
// ============================================

/**
 * Result of a dice roll.
 */
export interface RollResult {
	/** The dice roll configuration used */
	roll: DiceRoll;

	/** Individual die results */
	rolls: number[];

	/** Sum of all dice (before modifier) */
	diceTotal: number;

	/** Final total (dice + modifier) */
	total: number;

	/** The original unmodified roll (for advantage/disadvantage) */
	originalRolls?: number[][];

	/** Whether this was a natural 20 (on d20) */
	isNatural20: boolean;

	/** Whether this was a natural 1 (on d20) */
	isNatural1: boolean;

	/** Whether this is a critical hit */
	isCrit: boolean;

	/** Whether this is a critical failure (fumble) */
	isFumble: boolean;

	/** Human-readable notation (e.g., "2d6+5 = 15") */
	notation: string;
}

// ============================================
// SKILL CHECK
// ============================================

/**
 * Types of skill checks.
 */
export type SkillCheckType =
	| 'attack' // Attack roll vs enemy AC
	| 'defense' // Defense roll vs incoming attack
	| 'dodge' // Dodge roll to avoid damage
	| 'save' // Saving throw vs effect
	| 'skill' // General skill check
	| 'initiative'; // Initiative roll for turn order

/**
 * Configuration for a skill check.
 */
export interface SkillCheck {
	/** Type of check */
	type: SkillCheckType;

	/** Stat used as modifier base */
	stat: StatType;

	/** Difficulty Class (target number to beat) */
	dc?: number;

	/** Additional flat bonuses */
	bonuses: number[];

	/** Additional flat penalties */
	penalties: number[];

	/** Whether the check has advantage */
	advantage: boolean;

	/** Whether the check has disadvantage */
	disadvantage: boolean;

	/** Whether natural 20 auto-succeeds */
	nat20AutoSuccess: boolean;

	/** Whether natural 1 auto-fails */
	nat1AutoFail: boolean;

	/** Minimum result */
	minimum?: number;
}

/**
 * Default skill check configuration.
 */
export const DEFAULT_SKILL_CHECK: SkillCheck = {
	type: 'skill',
	stat: 'luck',
	bonuses: [],
	penalties: [],
	advantage: false,
	disadvantage: false,
	nat20AutoSuccess: true,
	nat1AutoFail: true
};

/**
 * Result of a skill check.
 */
export interface SkillCheckResult {
	/** The skill check configuration */
	check: SkillCheck;

	/** The underlying dice roll */
	rollResult: RollResult;

	/** Stat value used */
	statValue: number;

	/** Calculated stat modifier */
	statModifier: number;

	/** Total of all bonuses */
	totalBonus: number;

	/** Total of all penalties */
	totalPenalty: number;

	/** Final check result */
	finalResult: number;

	/** The DC that was being checked against */
	dc?: number;

	/** Whether the check succeeded (if DC was provided) */
	success?: boolean;

	/** How much the check beat or missed the DC by */
	margin?: number;

	/** Whether this was a critical success (nat 20) */
	criticalSuccess: boolean;

	/** Whether this was a critical failure (nat 1) */
	criticalFailure: boolean;
}

// ============================================
// DAMAGE ROLL
// ============================================

/**
 * Types of damage.
 */
export type DamageType = 'physical' | 'magical' | 'true' | 'fire' | 'ice' | 'lightning' | 'poison';

/**
 * Configuration for a damage roll.
 */
export interface DamageRoll {
	/** Base damage dice (e.g., 2d6 for a sword) */
	baseDice: DiceRoll;

	/** Which stat scales the damage */
	scalingStat: StatType;

	/** How much of the stat is added (0.0 - 1.0) */
	scalingFactor: number;

	/** Type of damage */
	damageType: DamageType;

	/** Whether this damage can crit */
	canCrit: boolean;

	/** Critical damage multiplier (default: 2.0) */
	critMultiplier: number;

	/** Flat bonus damage */
	bonusDamage: number;

	/** Minimum damage */
	minimumDamage: number;
}

/**
 * Default damage roll configuration.
 */
export const DEFAULT_DAMAGE_ROLL: DamageRoll = {
	baseDice: { dice: 'd6', count: 1, modifier: 0, advantage: false, disadvantage: false },
	scalingStat: 'attack',
	scalingFactor: 0.5,
	damageType: 'physical',
	canCrit: true,
	critMultiplier: 2.0,
	bonusDamage: 0,
	minimumDamage: 1
};

/**
 * Result of a damage roll.
 */
export interface DamageRollResult {
	/** The damage roll configuration */
	damageRoll: DamageRoll;

	/** The underlying dice roll */
	rollResult: RollResult;

	/** Base damage from dice */
	baseDamage: number;

	/** Damage from stat scaling */
	scalingDamage: number;

	/** Bonus flat damage */
	bonusDamage: number;

	/** Total damage before crit */
	subtotal: number;

	/** Whether this was a critical hit */
	isCrit: boolean;

	/** Final damage after crit multiplier */
	finalDamage: number;

	/** Type of damage dealt */
	damageType: DamageType;

	/** Human-readable breakdown */
	breakdown: string;
}

// ============================================
// UTILITY TYPES
// ============================================

/**
 * Parse dice notation (e.g., "2d6+5") into a DiceRoll.
 */
export interface ParsedDiceNotation {
	count: number;
	dice: DiceType;
	modifier: number;
	isValid: boolean;
}

/**
 * Random number generator function type.
 * Can be replaced for testing or seeded randomness.
 */
export type RandomFunction = (min: number, max: number) => number;
