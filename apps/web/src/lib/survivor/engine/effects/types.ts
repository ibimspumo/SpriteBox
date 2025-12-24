/**
 * Effects System - Type Definitions
 *
 * Effects are time-based modifications that can heal, damage, shield,
 * or apply stat modifiers over time or on specific triggers.
 *
 * @module engine/effects/types
 */

import type { StatType } from '../stats/types.js';
import type { ModifierTemplate, ModifierSource } from '../modifiers/types.js';

// ============================================
// EFFECT TRIGGERS
// ============================================

/**
 * When an effect is triggered.
 */
export type EffectTrigger =
	// Lifecycle
	| 'on_apply' // When effect is first applied
	| 'on_remove' // When effect expires or is removed
	| 'on_tick' // Every game tick/round
	// Combat
	| 'on_combat_start' // When combat begins
	| 'on_combat_end' // When combat ends
	| 'on_round_start' // Start of combat round
	| 'on_round_end' // End of combat round
	| 'on_turn_start' // Start of player's turn
	| 'on_turn_end' // End of player's turn
	// Day/Night
	| 'on_day_start' // Start of new day
	| 'on_day_end' // End of day
	// Damage
	| 'on_damage_taken' // When taking damage
	| 'on_damage_dealt' // When dealing damage
	| 'on_crit' // When landing a critical hit
	| 'on_dodge' // When dodging an attack
	| 'on_block' // When blocking with shield
	// Healing
	| 'on_heal' // When receiving healing
	| 'on_overheal' // When healing beyond max HP
	// Kill/Death
	| 'on_kill' // When killing an enemy
	| 'on_death' // When dying
	// Progression
	| 'on_level_up' // When leveling up
	| 'on_xp_gain' // When gaining XP
	| 'on_item_pickup'; // When picking up an item

// ============================================
// EFFECT TIMING
// ============================================

/**
 * How often an effect triggers.
 */
export type EffectTimingCategory =
	| 'instant' // Triggers once immediately
	| 'per_tick' // Triggers every tick/round
	| 'per_turn' // Triggers every turn
	| 'per_combat' // Triggers once per combat
	| 'per_day' // Triggers once per day
	| 'permanent'; // Passive, always active

// ============================================
// EFFECT TYPES
// ============================================

/**
 * What an effect does.
 */
export type EffectType =
	| 'stat_modifier' // Modifies stats
	| 'heal' // Heals HP
	| 'damage' // Deals damage
	| 'shield' // Grants shield
	| 'mana_restore' // Restores mana
	| 'mana_drain' // Drains mana
	| 'xp_bonus' // Grants bonus XP
	| 'cleanse' // Removes debuffs
	| 'dispel' // Removes buffs (from enemies)
	| 'stun' // Prevents actions
	| 'silence' // Prevents skills
	| 'root' // Prevents movement/dodge
	| 'immunity' // Immune to certain effects
	| 'transform' // Transforms character
	| 'composite'; // Multiple effects

// ============================================
// EFFECT PAYLOADS
// ============================================

/**
 * Base payload interface.
 */
export interface BasePayload {
	type: EffectType;
}

/**
 * Stat modifier payload.
 */
export interface StatModifierPayload extends BasePayload {
	type: 'stat_modifier';
	modifiers: ModifierTemplate[];
}

/**
 * Heal payload.
 */
export interface HealPayload extends BasePayload {
	type: 'heal';
	amount: number | { percent: number }; // Flat or % of max HP
	canOverheal: boolean;
}

/**
 * Damage payload.
 */
export interface DamagePayload extends BasePayload {
	type: 'damage';
	amount: number | { percent: number }; // Flat or % of max HP
	damageType: 'physical' | 'magical' | 'true'; // True damage ignores defense
	canKill: boolean; // Can reduce HP to 0
	ignoreShield: boolean;
}

/**
 * Shield payload.
 */
export interface ShieldPayload extends BasePayload {
	type: 'shield';
	amount: number | { percent: number }; // Flat or % of max HP
	absorbs: 'all' | 'physical' | 'magical';
}

/**
 * Mana restore payload.
 */
export interface ManaRestorePayload extends BasePayload {
	type: 'mana_restore';
	amount: number | { percent: number };
}

/**
 * Mana drain payload.
 */
export interface ManaDrainPayload extends BasePayload {
	type: 'mana_drain';
	amount: number | { percent: number };
}

/**
 * XP bonus payload.
 */
export interface XpBonusPayload extends BasePayload {
	type: 'xp_bonus';
	amount: number;
	multiplier?: number;
}

/**
 * Cleanse payload.
 */
export interface CleansePayload extends BasePayload {
	type: 'cleanse';
	count: number | 'all'; // Number of debuffs to remove
	types?: string[]; // Specific debuff types to target
}

/**
 * Status effect payload (stun, silence, root).
 */
export interface StatusPayload extends BasePayload {
	type: 'stun' | 'silence' | 'root';
	duration: number; // In rounds
}

/**
 * Immunity payload.
 */
export interface ImmunityPayload extends BasePayload {
	type: 'immunity';
	immuneTo: string[]; // Effect IDs or types
}

/**
 * Composite payload (multiple effects).
 */
export interface CompositePayload extends BasePayload {
	type: 'composite';
	effects: EffectPayload[];
}

/**
 * Union of all payload types.
 */
export type EffectPayload =
	| StatModifierPayload
	| HealPayload
	| DamagePayload
	| ShieldPayload
	| ManaRestorePayload
	| ManaDrainPayload
	| XpBonusPayload
	| CleansePayload
	| StatusPayload
	| ImmunityPayload
	| CompositePayload;

// ============================================
// EFFECT DEFINITION
// ============================================

/**
 * Definition of an effect (template).
 */
export interface EffectDefinition {
	/** Unique identifier */
	id: string;

	/** Effect type */
	type: EffectType;

	/** Display name (i18n key) */
	name: string;

	/** Description (i18n key) */
	description?: string;

	/** Icon name */
	icon?: string;

	/** CSS color */
	color?: string;

	// === Categorization ===

	/** Is this a buff, debuff, or neutral */
	category: 'buff' | 'debuff' | 'neutral';

	/** Timing category */
	timingCategory: EffectTimingCategory;

	// === Triggers ===

	/** Which events trigger this effect */
	triggers: EffectTrigger[];

	// === Duration ===

	/** Duration in ticks/rounds (undefined = permanent) */
	duration?: number;

	/** Maximum duration when refreshed */
	maxDuration?: number;

	// === Stacking ===

	/** Can this effect stack */
	stackable: boolean;

	/** Maximum stacks */
	maxStacks?: number;

	/** What happens when applied again */
	stackBehavior: 'refresh' | 'extend' | 'add' | 'replace';

	// === Payload ===

	/** What the effect does */
	payload: EffectPayload;

	// === Tags ===

	/** Tags for filtering/grouping */
	tags?: string[];

	/** Can this effect be cleansed/dispelled */
	canBeCleansed?: boolean;
}

// ============================================
// ACTIVE EFFECT
// ============================================

/**
 * An active instance of an effect on a character.
 */
export interface ActiveEffect {
	/** Unique instance ID */
	instanceId: string;

	/** Reference to the effect definition */
	definitionId: string;

	/** Cached definition */
	definition: EffectDefinition;

	/** Where this effect came from */
	source: ModifierSource;

	// === State ===

	/** When this effect was applied */
	appliedAt: number;

	/** When this effect expires */
	expiresAt?: number;

	/** Remaining duration in ticks */
	remainingDuration?: number;

	/** Current stacks */
	currentStacks: number;

	/** Whether this effect is enabled */
	enabled: boolean;

	// === Tracking ===

	/** How many times this effect has ticked */
	tickCount: number;

	/** Total damage dealt by this effect */
	totalDamageDealt: number;

	/** Total healing done by this effect */
	totalHealingDone: number;

	// === Generated Modifiers ===

	/** Active stat modifiers from this effect */
	activeModifierIds: string[];
}

// ============================================
// TRIGGER EVENT DATA
// ============================================

/**
 * Data passed to effect triggers.
 */
export interface TriggerEventData {
	/** Which trigger fired */
	trigger: EffectTrigger;

	/** When this happened */
	timestamp: number;

	// === Damage context ===
	damage?: {
		amount: number;
		type: 'physical' | 'magical' | 'true';
		source: string;
		isCrit: boolean;
		wasDodged: boolean;
		wasBlocked: boolean;
	};

	// === Heal context ===
	heal?: {
		amount: number;
		source: string;
		overheal: number;
	};

	// === Combat context ===
	combat?: {
		enemyId: string;
		enemyName: string;
		enemyElement?: string;
		round: number;
		turn: number;
	};

	// === Level up context ===
	levelUp?: {
		oldLevel: number;
		newLevel: number;
		statsGained?: Partial<Record<StatType, number>>;
	};

	// === XP context ===
	xp?: {
		amount: number;
		source: string;
		bonusMultiplier: number;
	};

	// === Kill context ===
	kill?: {
		enemyId: string;
		enemyName: string;
		xpGained: number;
	};
}

// ============================================
// TRIGGER RESULT
// ============================================

/**
 * Result of processing a trigger.
 */
export interface TriggerResult {
	/** The effect that was triggered */
	effect: ActiveEffect;

	/** Whether the effect was processed */
	processed: boolean;

	/** What happened */
	actions: TriggerAction[];

	/** UI messages to display */
	messages: string[];
}

/**
 * An action taken by an effect.
 */
export interface TriggerAction {
	type: 'heal' | 'damage' | 'shield' | 'mana' | 'xp' | 'cleanse' | 'status' | 'modifier';
	stat?: StatType;
	oldValue?: number;
	newValue?: number;
	change?: number;
	source: string;
}

// ============================================
// SERIALIZATION
// ============================================

/**
 * Serialized active effect for storage.
 */
export interface SerializedActiveEffect {
	instanceId: string;
	definitionId: string;
	sourceType: string;
	sourceId: string;
	sourceName: string;
	appliedAt: number;
	expiresAt?: number;
	remainingDuration?: number;
	currentStacks: number;
	enabled: boolean;
	tickCount: number;
	totalDamageDealt: number;
	totalHealingDone: number;
	activeModifierIds: string[];
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * Generate a unique effect instance ID.
 */
export function generateEffectInstanceId(): string {
	return `eff_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

/**
 * Check if a payload is a stat modifier payload.
 */
export function isStatModifierPayload(payload: EffectPayload): payload is StatModifierPayload {
	return payload.type === 'stat_modifier';
}

/**
 * Check if a payload is a heal payload.
 */
export function isHealPayload(payload: EffectPayload): payload is HealPayload {
	return payload.type === 'heal';
}

/**
 * Check if a payload is a damage payload.
 */
export function isDamagePayload(payload: EffectPayload): payload is DamagePayload {
	return payload.type === 'damage';
}

/**
 * Check if a payload is a shield payload.
 */
export function isShieldPayload(payload: EffectPayload): payload is ShieldPayload {
	return payload.type === 'shield';
}

/**
 * Check if a payload is a composite payload.
 */
export function isCompositePayload(payload: EffectPayload): payload is CompositePayload {
	return payload.type === 'composite';
}
