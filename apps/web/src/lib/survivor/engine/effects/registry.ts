/**
 * Effects Registry - Predefined Effect Definitions
 *
 * This module contains all predefined effects that can be applied in the game.
 * Add new effects here to extend the system.
 *
 * @module engine/effects/registry
 */

import type { EffectDefinition } from './types.js';

/**
 * Registry of all effect definitions.
 */
export const EFFECT_DEFINITIONS: Map<string, EffectDefinition> = new Map();

/**
 * Register an effect definition.
 */
export function registerEffect(effect: EffectDefinition): void {
	if (EFFECT_DEFINITIONS.has(effect.id)) {
		console.warn(`[EffectRegistry] Overwriting effect: ${effect.id}`);
	}
	EFFECT_DEFINITIONS.set(effect.id, effect);
}

/**
 * Get an effect definition by ID.
 */
export function getEffectDefinition(id: string): EffectDefinition | undefined {
	return EFFECT_DEFINITIONS.get(id);
}

/**
 * Get all effect definitions.
 */
export function getAllEffectDefinitions(): EffectDefinition[] {
	return Array.from(EFFECT_DEFINITIONS.values());
}

/**
 * Get effects by category.
 */
export function getEffectsByCategory(category: 'buff' | 'debuff' | 'neutral'): EffectDefinition[] {
	return getAllEffectDefinitions().filter((e) => e.category === category);
}

/**
 * Get effects by tag.
 */
export function getEffectsByTag(tag: string): EffectDefinition[] {
	return getAllEffectDefinitions().filter((e) => e.tags?.includes(tag));
}

// ============================================
// BUFF EFFECTS
// ============================================

// === Combat Buffs ===

registerEffect({
	id: 'rage',
	type: 'stat_modifier',
	name: 'pixelSurvivor.effects.rage',
	description: 'pixelSurvivor.effects.rageDesc',
	icon: 'flame',
	color: 'var(--color-danger)',
	category: 'buff',
	timingCategory: 'per_tick',
	triggers: ['on_apply', 'on_tick', 'on_remove'],
	duration: 3, // 3 rounds
	stackable: true,
	maxStacks: 3,
	stackBehavior: 'add',
	canBeCleansed: false,
	payload: {
		type: 'stat_modifier',
		modifiers: [{ stat: 'attack', operation: 'percent_base', value: 25, priority: 70 }]
	},
	tags: ['combat', 'offensive']
});

registerEffect({
	id: 'fortify',
	type: 'stat_modifier',
	name: 'pixelSurvivor.effects.fortify',
	description: 'pixelSurvivor.effects.fortifyDesc',
	icon: 'shield',
	color: 'var(--color-success)',
	category: 'buff',
	timingCategory: 'per_tick',
	triggers: ['on_apply', 'on_tick', 'on_remove'],
	duration: 3,
	stackable: true,
	maxStacks: 3,
	stackBehavior: 'add',
	canBeCleansed: false,
	payload: {
		type: 'stat_modifier',
		modifiers: [{ stat: 'defense', operation: 'percent_base', value: 20, priority: 70 }]
	},
	tags: ['combat', 'defensive']
});

registerEffect({
	id: 'haste',
	type: 'stat_modifier',
	name: 'pixelSurvivor.effects.haste',
	description: 'pixelSurvivor.effects.hasteDesc',
	icon: 'zap',
	color: 'var(--color-warning)',
	category: 'buff',
	timingCategory: 'per_tick',
	triggers: ['on_apply', 'on_tick', 'on_remove'],
	duration: 3,
	stackable: false,
	stackBehavior: 'refresh',
	canBeCleansed: false,
	payload: {
		type: 'stat_modifier',
		modifiers: [{ stat: 'speed', operation: 'percent_base', value: 30, priority: 70 }]
	},
	tags: ['combat', 'utility']
});

registerEffect({
	id: 'lucky_strike',
	type: 'stat_modifier',
	name: 'pixelSurvivor.effects.luckyStrike',
	description: 'pixelSurvivor.effects.luckyStrikeDesc',
	icon: 'clover',
	color: 'var(--color-accent)',
	category: 'buff',
	timingCategory: 'per_tick',
	triggers: ['on_apply', 'on_tick', 'on_remove'],
	duration: 5,
	stackable: false,
	stackBehavior: 'refresh',
	canBeCleansed: false,
	payload: {
		type: 'stat_modifier',
		modifiers: [
			{ stat: 'critChance', operation: 'flat', value: 15, priority: 70 },
			{ stat: 'luck', operation: 'percent_base', value: 20, priority: 70 }
		]
	},
	tags: ['combat', 'crit']
});

// === Healing Effects ===

registerEffect({
	id: 'regeneration',
	type: 'heal',
	name: 'pixelSurvivor.effects.regeneration',
	description: 'pixelSurvivor.effects.regenerationDesc',
	icon: 'heart-pulse',
	color: 'var(--color-success)',
	category: 'buff',
	timingCategory: 'per_tick',
	triggers: ['on_round_end'],
	duration: 5,
	stackable: true,
	maxStacks: 3,
	stackBehavior: 'add',
	canBeCleansed: true,
	payload: {
		type: 'heal',
		amount: { percent: 5 }, // 5% max HP per stack per round
		canOverheal: false
	},
	tags: ['healing', 'regen']
});

registerEffect({
	id: 'vampiric_touch',
	type: 'heal',
	name: 'pixelSurvivor.effects.vampiricTouch',
	description: 'pixelSurvivor.effects.vampiricTouchDesc',
	icon: 'droplet',
	color: 'var(--color-danger)',
	category: 'buff',
	timingCategory: 'per_combat',
	triggers: ['on_damage_dealt'],
	duration: undefined, // Permanent
	stackable: false,
	stackBehavior: 'refresh',
	canBeCleansed: false,
	payload: {
		type: 'heal',
		amount: { percent: 10 }, // Heal 10% of damage dealt
		canOverheal: false
	},
	tags: ['healing', 'lifesteal']
});

// === Shield Effects ===

registerEffect({
	id: 'barrier',
	type: 'shield',
	name: 'pixelSurvivor.effects.barrier',
	description: 'pixelSurvivor.effects.barrierDesc',
	icon: 'shield',
	color: 'var(--color-info)',
	category: 'buff',
	timingCategory: 'instant',
	triggers: ['on_apply'],
	duration: undefined, // Until broken
	stackable: false,
	stackBehavior: 'replace',
	canBeCleansed: false,
	payload: {
		type: 'shield',
		amount: { percent: 25 }, // 25% of max HP
		absorbs: 'all'
	},
	tags: ['defensive', 'shield']
});

// ============================================
// DEBUFF EFFECTS
// ============================================

registerEffect({
	id: 'poison',
	type: 'damage',
	name: 'pixelSurvivor.effects.poison',
	description: 'pixelSurvivor.effects.poisonDesc',
	icon: 'skull',
	color: 'var(--color-success)',
	category: 'debuff',
	timingCategory: 'per_tick',
	triggers: ['on_round_end'],
	duration: 3,
	stackable: true,
	maxStacks: 5,
	stackBehavior: 'add',
	canBeCleansed: true,
	payload: {
		type: 'damage',
		amount: { percent: 3 }, // 3% max HP per stack per round
		damageType: 'true',
		canKill: false,
		ignoreShield: true
	},
	tags: ['dot', 'poison']
});

registerEffect({
	id: 'burn',
	type: 'damage',
	name: 'pixelSurvivor.effects.burn',
	description: 'pixelSurvivor.effects.burnDesc',
	icon: 'flame',
	color: 'var(--color-warning)',
	category: 'debuff',
	timingCategory: 'per_tick',
	triggers: ['on_round_start'],
	duration: 2,
	stackable: true,
	maxStacks: 3,
	stackBehavior: 'add',
	canBeCleansed: true,
	payload: {
		type: 'damage',
		amount: { percent: 5 }, // 5% max HP per stack per round
		damageType: 'magical',
		canKill: true,
		ignoreShield: false
	},
	tags: ['dot', 'fire']
});

registerEffect({
	id: 'weakness',
	type: 'stat_modifier',
	name: 'pixelSurvivor.effects.weakness',
	description: 'pixelSurvivor.effects.weaknessDesc',
	icon: 'arrow-down',
	color: 'var(--color-danger)',
	category: 'debuff',
	timingCategory: 'per_tick',
	triggers: ['on_apply', 'on_tick', 'on_remove'],
	duration: 3,
	stackable: true,
	maxStacks: 3,
	stackBehavior: 'add',
	canBeCleansed: true,
	payload: {
		type: 'stat_modifier',
		modifiers: [{ stat: 'attack', operation: 'percent_base', value: -15, priority: 60 }]
	},
	tags: ['debuff', 'attack_reduction']
});

registerEffect({
	id: 'vulnerability',
	type: 'stat_modifier',
	name: 'pixelSurvivor.effects.vulnerability',
	description: 'pixelSurvivor.effects.vulnerabilityDesc',
	icon: 'shield-off',
	color: 'var(--color-danger)',
	category: 'debuff',
	timingCategory: 'per_tick',
	triggers: ['on_apply', 'on_tick', 'on_remove'],
	duration: 3,
	stackable: true,
	maxStacks: 3,
	stackBehavior: 'add',
	canBeCleansed: true,
	payload: {
		type: 'stat_modifier',
		modifiers: [{ stat: 'defense', operation: 'percent_base', value: -20, priority: 60 }]
	},
	tags: ['debuff', 'defense_reduction']
});

registerEffect({
	id: 'slow',
	type: 'stat_modifier',
	name: 'pixelSurvivor.effects.slow',
	description: 'pixelSurvivor.effects.slowDesc',
	icon: 'snail',
	color: 'var(--color-info)',
	category: 'debuff',
	timingCategory: 'per_tick',
	triggers: ['on_apply', 'on_tick', 'on_remove'],
	duration: 2,
	stackable: true,
	maxStacks: 3,
	stackBehavior: 'add',
	canBeCleansed: true,
	payload: {
		type: 'stat_modifier',
		modifiers: [{ stat: 'speed', operation: 'percent_base', value: -25, priority: 60 }]
	},
	tags: ['debuff', 'speed_reduction']
});

registerEffect({
	id: 'cursed',
	type: 'stat_modifier',
	name: 'pixelSurvivor.effects.cursed',
	description: 'pixelSurvivor.effects.cursedDesc',
	icon: 'ghost',
	color: 'var(--color-dark)',
	category: 'debuff',
	timingCategory: 'per_tick',
	triggers: ['on_apply', 'on_tick', 'on_remove'],
	duration: 5,
	stackable: false,
	stackBehavior: 'refresh',
	canBeCleansed: true,
	payload: {
		type: 'stat_modifier',
		modifiers: [
			{ stat: 'luck', operation: 'percent_base', value: -50, priority: 60 },
			{ stat: 'critChance', operation: 'flat', value: -10, priority: 60 }
		]
	},
	tags: ['debuff', 'curse']
});

// ============================================
// TRAIT EFFECTS (Permanent)
// ============================================

registerEffect({
	id: 'trait_perfectionist_bonus',
	type: 'stat_modifier',
	name: 'pixelSurvivor.traits.perfectionist',
	category: 'buff',
	timingCategory: 'permanent',
	triggers: ['on_apply'],
	stackable: false,
	stackBehavior: 'replace',
	canBeCleansed: false,
	payload: {
		type: 'stat_modifier',
		modifiers: [
			{ stat: 'critChance', operation: 'flat', value: 10, priority: 90 },
			{ stat: 'defense', operation: 'percent_base', value: 10, priority: 90 }
		]
	},
	tags: ['trait', 'permanent']
});

registerEffect({
	id: 'trait_chaotic_bonus',
	type: 'stat_modifier',
	name: 'pixelSurvivor.traits.chaotic',
	category: 'buff',
	timingCategory: 'permanent',
	triggers: ['on_apply'],
	stackable: false,
	stackBehavior: 'replace',
	canBeCleansed: false,
	payload: {
		type: 'stat_modifier',
		modifiers: [
			{ stat: 'critDamage', operation: 'flat', value: 50, priority: 90 },
			{ stat: 'attack', operation: 'percent_base', value: 15, priority: 90 }
		]
	},
	tags: ['trait', 'permanent']
});

registerEffect({
	id: 'trait_bulky_bonus',
	type: 'stat_modifier',
	name: 'pixelSurvivor.traits.bulky',
	category: 'buff',
	timingCategory: 'permanent',
	triggers: ['on_apply'],
	stackable: false,
	stackBehavior: 'replace',
	canBeCleansed: false,
	payload: {
		type: 'stat_modifier',
		modifiers: [
			{ stat: 'maxHp', operation: 'percent_base', value: 25, priority: 90 },
			{ stat: 'defense', operation: 'flat', value: 10, priority: 90 }
		]
	},
	tags: ['trait', 'permanent']
});

// ============================================
// LEVEL UP EFFECTS
// ============================================

registerEffect({
	id: 'level_up_heal',
	type: 'heal',
	name: 'pixelSurvivor.effects.levelUpHeal',
	category: 'buff',
	timingCategory: 'instant',
	triggers: ['on_level_up'],
	stackable: false,
	stackBehavior: 'replace',
	payload: {
		type: 'heal',
		amount: { percent: 100 }, // Full heal on level up
		canOverheal: false
	},
	tags: ['levelup', 'instant']
});

// ============================================
// ENVIRONMENTAL EFFECTS
// ============================================

registerEffect({
	id: 'dungeon_darkness',
	type: 'stat_modifier',
	name: 'pixelSurvivor.effects.darkness',
	description: 'pixelSurvivor.effects.darknessDesc',
	icon: 'moon',
	color: 'var(--color-dark)',
	category: 'neutral',
	timingCategory: 'permanent',
	triggers: ['on_apply', 'on_remove'],
	stackable: false,
	stackBehavior: 'replace',
	canBeCleansed: false,
	payload: {
		type: 'stat_modifier',
		modifiers: [
			{ stat: 'dodgeChance', operation: 'flat', value: -10, priority: 20 },
			{ stat: 'critChance', operation: 'flat', value: -5, priority: 20 }
		]
	},
	tags: ['environment', 'dungeon']
});

registerEffect({
	id: 'blessed_ground',
	type: 'stat_modifier',
	name: 'pixelSurvivor.effects.blessedGround',
	description: 'pixelSurvivor.effects.blessedGroundDesc',
	icon: 'sun',
	color: 'var(--color-warning)',
	category: 'buff',
	timingCategory: 'permanent',
	triggers: ['on_apply', 'on_remove'],
	stackable: false,
	stackBehavior: 'replace',
	canBeCleansed: false,
	payload: {
		type: 'stat_modifier',
		modifiers: [
			{ stat: 'xpRate', operation: 'flat', value: 25, priority: 20 },
			{ stat: 'dropChance', operation: 'flat', value: 25, priority: 20 }
		]
	},
	tags: ['environment', 'blessing']
});
