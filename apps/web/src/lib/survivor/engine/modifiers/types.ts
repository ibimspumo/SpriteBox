/**
 * Modifier System - Type Definitions
 *
 * Modifiers are the core mechanism for changing stats.
 * They can come from items, buffs, debuffs, traits, events, cards, etc.
 *
 * @module engine/modifiers/types
 */

import type { StatType } from '../stats/types.js';
import { secureRandomString } from '../core/random.js';

// ============================================
// MODIFIER SOURCE TYPES
// ============================================

/**
 * Where a modifier comes from.
 * This determines how the modifier is grouped and managed.
 */
export type ModifierSourceType =
	| 'base' // Character creation base stats
	| 'level' // Level-up bonuses
	| 'item' // Equipped items
	| 'card' // Level-up cards (permanent until run end)
	| 'buff' // Temporary positive effects
	| 'debuff' // Temporary negative effects
	| 'trait' // Character trait effects
	| 'event' // Random event effects
	| 'skill' // Active skill effects
	| 'environment' // Environmental effects (dungeon modifiers)
	| 'monster'; // Monster ability effects

// ============================================
// MODIFIER OPERATIONS
// ============================================

/**
 * How a modifier value is applied to a stat.
 *
 * Calculation order:
 * 1. Base Value
 * 2. Flat modifiers (+10, -5)
 * 3. Percent of Base (+10% of base)
 * 4. Percent of Total (+10% of current total)
 * 5. Multiply (*1.5)
 * 6. Override (replaces everything)
 * 7. Clamp to min/max
 */
export type ModifierOperation =
	| 'flat' // +10, -5 (added directly)
	| 'percent_base' // +10% of base value
	| 'percent_total' // +10% of current total (after flat + percent_base)
	| 'multiply' // *1.5, *0.5 (multiplies current total)
	| 'override'; // Sets absolute value (highest priority, ignores all other mods)

// ============================================
// MODIFIER SOURCE
// ============================================

/**
 * Information about where a modifier came from.
 * Used for UI display and modifier management.
 */
export interface ModifierSource {
	/** Source type category */
	type: ModifierSourceType;

	/** Unique ID of the source (e.g., item ID, buff ID) */
	id: string;

	/** Display name (i18n key or direct string) */
	name: string;

	/** Optional icon for UI */
	icon?: string;

	/** When this modifier was applied */
	appliedAt: number;

	/** When this modifier expires (undefined = permanent) */
	expiresAt?: number;

	/** Duration in ticks/rounds (for display) */
	duration?: number;
}

// ============================================
// MODIFIER CONDITIONS
// ============================================

/**
 * Types of conditions that can enable/disable modifiers.
 */
export type ConditionType =
	| 'always' // Always active
	| 'hp_below_percent' // HP below X%
	| 'hp_above_percent' // HP above X%
	| 'mana_below_percent' // Mana below X%
	| 'mana_above_percent' // Mana above X%
	| 'has_buff' // Specific buff is active
	| 'has_debuff' // Specific debuff is active
	| 'in_combat' // During combat
	| 'out_of_combat' // Outside combat
	| 'element_match' // Element matches target
	| 'element_mismatch' // Element doesn't match target
	| 'is_day' // During day phase
	| 'is_night' // During night phase
	| 'level_above' // Level above threshold
	| 'level_below'; // Level below threshold

/**
 * Condition for conditional modifiers.
 */
export interface ModifierCondition {
	/** Type of condition */
	type: ConditionType;

	/** Threshold value (for percent/level conditions) */
	threshold?: number;

	/** Comparison stat (for stat conditions) */
	stat?: StatType;

	/** Target ID (for has_buff/has_debuff) */
	targetId?: string;

	/** Whether condition is inverted */
	inverted?: boolean;
}

// ============================================
// STAT MODIFIER
// ============================================

/**
 * A single stat modifier.
 * This is the core data structure for all stat modifications.
 */
export interface StatModifier {
	/** Unique identifier for this modifier instance */
	id: string;

	/** Which stat this modifier affects */
	stat: StatType;

	/** How the modifier is applied */
	operation: ModifierOperation;

	/** The modifier value */
	value: number;

	/** Where this modifier came from */
	source: ModifierSource;

	/**
	 * Priority for calculation order within the same operation type.
	 * Higher priority = calculated first.
	 * Default: 50
	 */
	priority: number;

	// === Stacking ===

	/** Whether this modifier can stack with itself */
	stackable: boolean;

	/** Maximum stacks (if stackable) */
	maxStacks?: number;

	/** Current stack count */
	currentStacks?: number;

	// === Conditions ===

	/** Optional condition for this modifier to be active */
	condition?: ModifierCondition;

	// === Metadata ===

	/** Whether this modifier is currently enabled */
	enabled: boolean;

	/** Tags for filtering/grouping */
	tags?: string[];
}

// ============================================
// MODIFIER TEMPLATES
// ============================================

/**
 * Template for creating modifiers (without instance-specific fields).
 * Used in item/card/effect definitions.
 */
export interface ModifierTemplate {
	/** Which stat to modify */
	stat: StatType;

	/** How to apply the modifier */
	operation: ModifierOperation;

	/** The modifier value */
	value: number;

	/** Priority (default: 50) */
	priority?: number;

	/** Whether stackable (default: false) */
	stackable?: boolean;

	/** Max stacks if stackable */
	maxStacks?: number;

	/** Optional condition */
	condition?: ModifierCondition;

	/** Optional tags */
	tags?: string[];
}

// ============================================
// SERIALIZATION
// ============================================

/**
 * Serialized modifier for storage.
 */
export interface SerializedModifier {
	id: string;
	stat: StatType;
	operation: ModifierOperation;
	value: number;
	sourceType: ModifierSourceType;
	sourceId: string;
	sourceName: string;
	priority: number;
	stackable: boolean;
	maxStacks?: number;
	currentStacks?: number;
	enabled: boolean;
	appliedAt: number;
	expiresAt?: number;
	condition?: ModifierCondition;
	tags?: string[];
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * Create a modifier from a template.
 */
export function createModifier(
	template: ModifierTemplate,
	source: ModifierSource,
	idPrefix: string = 'mod'
): StatModifier {
	return {
		id: `${idPrefix}_${source.id}_${template.stat}_${Date.now()}_${secureRandomString(5)}`,
		stat: template.stat,
		operation: template.operation,
		value: template.value,
		source,
		priority: template.priority ?? 50,
		stackable: template.stackable ?? false,
		maxStacks: template.maxStacks,
		currentStacks: template.stackable ? 1 : undefined,
		condition: template.condition,
		enabled: true,
		tags: template.tags
	};
}

/**
 * Serialize a modifier for storage.
 */
export function serializeModifier(modifier: StatModifier): SerializedModifier {
	return {
		id: modifier.id,
		stat: modifier.stat,
		operation: modifier.operation,
		value: modifier.value,
		sourceType: modifier.source.type,
		sourceId: modifier.source.id,
		sourceName: modifier.source.name,
		priority: modifier.priority,
		stackable: modifier.stackable,
		maxStacks: modifier.maxStacks,
		currentStacks: modifier.currentStacks,
		enabled: modifier.enabled,
		appliedAt: modifier.source.appliedAt,
		expiresAt: modifier.source.expiresAt,
		condition: modifier.condition,
		tags: modifier.tags
	};
}

/**
 * Deserialize a modifier from storage.
 */
export function deserializeModifier(data: SerializedModifier): StatModifier {
	return {
		id: data.id,
		stat: data.stat,
		operation: data.operation,
		value: data.value,
		source: {
			type: data.sourceType,
			id: data.sourceId,
			name: data.sourceName,
			appliedAt: data.appliedAt,
			expiresAt: data.expiresAt
		},
		priority: data.priority,
		stackable: data.stackable,
		maxStacks: data.maxStacks,
		currentStacks: data.currentStacks,
		condition: data.condition,
		enabled: data.enabled,
		tags: data.tags
	};
}

/**
 * Default modifier priority by source type.
 */
export const DEFAULT_PRIORITY_BY_SOURCE: Record<ModifierSourceType, number> = {
	base: 100,
	trait: 90,
	level: 80,
	item: 70,
	card: 60,
	event: 50,
	skill: 40,
	buff: 30,
	debuff: 30,
	environment: 20,
	monster: 10
};
