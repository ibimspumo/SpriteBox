/**
 * Combat System - Type Definitions
 *
 * Turn-based combat between player and monsters.
 * Uses D20 rolls to modify damage output.
 *
 * @module engine/combat/types
 */

import type { ElementType, ElementAffinity, InteractionType } from '../core/elements/types.js';
import type { MonsterInstance } from './monsters/types.js';
import type { GameCharacter } from '../character/types.js';

// ============================================
// COMBAT PHASES
// ============================================

/**
 * Current phase of combat.
 */
export type CombatPhase =
	| 'initializing'   // Setting up combat
	| 'player_turn'    // Player's turn to act
	| 'player_rolling' // Player is rolling dice
	| 'player_attack'  // Player attack animation
	| 'monster_turn'   // Monster's turn
	| 'monster_rolling'// Monster is rolling dice
	| 'monster_attack' // Monster attack animation
	| 'victory'        // Player won
	| 'defeat'         // Player lost
	| 'fled';          // Player fled (if allowed)

// ============================================
// COMBAT PARTICIPANTS
// ============================================

/**
 * A participant in combat (player or monster).
 */
export interface CombatParticipant {
	/** Unique identifier */
	id: string;

	/** Display name */
	name: string;

	/** Whether this is the player */
	isPlayer: boolean;

	/** Pixel art */
	pixels: string;

	/** Element affinity */
	element: ElementAffinity;

	// === Current Stats ===
	currentHp: number;
	maxHp: number;
	attack: number;
	defense: number;
	speed: number;
	luck: number;

	/** Is still alive */
	isAlive: boolean;
}

// ============================================
// D20 ROLL MODIFIERS
// ============================================

/**
 * D20 roll result category.
 * Determines damage modifier.
 *
 * Roll ranges:
 * - 1 (Natural 1): Critical failure, -50% damage
 * - 2-5: Poor roll, -20% damage
 * - 6-14: Normal roll, no modifier
 * - 15-19: Good roll, +20% damage
 * - 20 (Natural 20): Critical hit, +50% damage
 */
export type D20RollCategory =
	| 'critical_failure' // 1
	| 'poor'             // 2-5
	| 'normal'           // 6-14
	| 'good'             // 15-19
	| 'critical_hit';    // 20

/**
 * D20 roll result for combat.
 */
export interface CombatD20Roll {
	/** The actual roll value (1-20) */
	value: number;

	/** Category of the roll */
	category: D20RollCategory;

	/** Damage multiplier based on roll */
	damageMultiplier: number;

	/** Whether this was a natural 1 */
	isNat1: boolean;

	/** Whether this was a natural 20 */
	isNat20: boolean;
}

/**
 * Get the roll category and damage multiplier for a D20 roll.
 */
export function getCombatD20Result(roll: number): CombatD20Roll {
	if (roll === 1) {
		return {
			value: roll,
			category: 'critical_failure',
			damageMultiplier: 0.5,
			isNat1: true,
			isNat20: false
		};
	}

	if (roll >= 2 && roll <= 5) {
		return {
			value: roll,
			category: 'poor',
			damageMultiplier: 0.8,
			isNat1: false,
			isNat20: false
		};
	}

	if (roll >= 6 && roll <= 14) {
		return {
			value: roll,
			category: 'normal',
			damageMultiplier: 1.0,
			isNat1: false,
			isNat20: false
		};
	}

	if (roll >= 15 && roll <= 19) {
		return {
			value: roll,
			category: 'good',
			damageMultiplier: 1.2,
			isNat1: false,
			isNat20: false
		};
	}

	// roll === 20
	return {
		value: roll,
		category: 'critical_hit',
		damageMultiplier: 1.5,
		isNat1: false,
		isNat20: true
	};
}

// ============================================
// COMBAT ACTIONS
// ============================================

/**
 * Types of actions in combat.
 */
export type CombatActionType =
	| 'attack'     // Basic attack
	| 'ability'    // Use special ability
	| 'defend'     // Defensive stance
	| 'item'       // Use item
	| 'flee';      // Attempt to flee

/**
 * A combat action performed by a participant.
 */
export interface CombatAction {
	/** Type of action */
	type: CombatActionType;

	/** ID of the actor */
	actorId: string;

	/** ID of the target (if applicable) */
	targetId?: string;

	/** Ability ID (if type is 'ability') */
	abilityId?: string;

	/** Item ID (if type is 'item') */
	itemId?: string;
}

// ============================================
// COMBAT RESULT
// ============================================

/**
 * Result of a combat action.
 */
export interface CombatActionResult {
	/** The action that was performed */
	action: CombatAction;

	/** Whether the action was successful */
	success: boolean;

	/** D20 roll result (if applicable) */
	d20Roll?: CombatD20Roll;

	/** Damage dealt (if applicable) */
	damage?: number;

	/** Damage before modifications */
	baseDamage?: number;

	/** Element interaction type */
	elementInteraction?: InteractionType;

	/** Element damage multiplier */
	elementMultiplier?: number;

	/** Healing done (if applicable) */
	healing?: number;

	/** Whether the target was defeated */
	targetDefeated?: boolean;

	/** Whether the flee attempt succeeded */
	fleeSuccess?: boolean;

	/** Message key for combat log */
	messageKey?: string;
}

// ============================================
// COMBAT LOG
// ============================================

/**
 * A single entry in the combat log.
 */
export interface CombatLogEntry {
	/** Unique entry ID */
	id: string;

	/** Timestamp */
	timestamp: number;

	/** Turn number */
	turn: number;

	/** The action result */
	result: CombatActionResult;

	/** Formatted message (localized) */
	message?: string;
}

// ============================================
// COMBAT STATE
// ============================================

/**
 * Complete state of a combat encounter.
 */
export interface CombatState {
	/** Unique combat ID */
	combatId: string;

	/** Current phase */
	phase: CombatPhase;

	/** Current turn number */
	turn: number;

	/** Which participant's turn (index) */
	currentTurnIndex: number;

	/** The player */
	player: CombatParticipant;

	/** The monster(s) */
	monsters: MonsterInstance[];

	/** Turn order (participant IDs in order) */
	turnOrder: string[];

	/** Combat log */
	log: CombatLogEntry[];

	/** Start timestamp */
	startedAt: number;

	/** End timestamp (if finished) */
	endedAt?: number;

	/** XP reward (calculated on victory) */
	xpReward?: number;

	/** Loot (calculated on victory) */
	loot?: string[];

	/** Last action result (for UI) */
	lastResult?: CombatActionResult;
}

// ============================================
// DAMAGE CALCULATION
// ============================================

/**
 * Input for damage calculation.
 */
export interface DamageCalculationInput {
	/** Attacker's base attack stat */
	attackStat: number;

	/** Defender's defense stat */
	defenseStat: number;

	/** D20 roll result */
	d20Roll: CombatD20Roll;

	/** Attacker's element affinity */
	attackerElement: ElementAffinity;

	/** Defender's element affinity */
	defenderElement: ElementAffinity;

	/** Ability damage multiplier (if using ability) */
	abilityMultiplier?: number;

	/** Additional flat damage bonus */
	bonusDamage?: number;
}

/**
 * Result of damage calculation.
 */
export interface DamageCalculationResult {
	/** Final damage to apply */
	finalDamage: number;

	/** Base damage before modifiers */
	baseDamage: number;

	/** Damage after D20 modifier */
	d20ModifiedDamage: number;

	/** Damage after defense reduction */
	afterDefense: number;

	/** Damage after element modifier */
	afterElement: number;

	/** D20 damage multiplier applied */
	d20Multiplier: number;

	/** Defense reduction applied */
	defenseReduction: number;

	/** Element multiplier applied */
	elementMultiplier: number;

	/** Element interaction type */
	elementInteraction: InteractionType;

	/** Breakdown string for combat log */
	breakdown: string;
}

// ============================================
// COMBAT CONFIGURATION
// ============================================

/**
 * Configuration for combat behavior.
 */
export interface CombatConfig {
	/** Minimum damage that can be dealt (after reductions) */
	minimumDamage: number;

	/** Defense formula: how much 1 defense reduces damage */
	defenseEffectiveness: number;

	/** Whether fleeing is allowed */
	canFlee: boolean;

	/** Base flee chance (0-1) */
	baseFleeChance: number;

	/** Animation duration for attacks (ms) */
	attackAnimationDuration: number;

	/** Delay between turns (ms) */
	turnDelay: number;
}

/**
 * Default combat configuration.
 */
export const DEFAULT_COMBAT_CONFIG: CombatConfig = {
	minimumDamage: 1,
	defenseEffectiveness: 0.5, // Each defense point reduces damage by 0.5
	canFlee: true,
	baseFleeChance: 0.4,
	attackAnimationDuration: 800,
	turnDelay: 500
};

// ============================================
// COMBAT EVENTS
// ============================================

/**
 * Events emitted by the combat system.
 */
export type CombatEventType =
	| 'combat_started'
	| 'turn_started'
	| 'action_performed'
	| 'damage_dealt'
	| 'participant_defeated'
	| 'combat_victory'
	| 'combat_defeat'
	| 'combat_fled';

/**
 * Combat event data.
 */
export interface CombatEvent {
	type: CombatEventType;
	combatId: string;
	timestamp: number;
	data?: Record<string, unknown>;
}
