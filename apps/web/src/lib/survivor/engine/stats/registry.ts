/**
 * Stats Registry - All Stat Definitions
 *
 * This module contains the definitions for all stats in the game.
 * Add new stats here to extend the system.
 *
 * @module engine/stats/registry
 */

import type { StatType, StatDefinition } from './types.js';

/**
 * Registry of all stat definitions.
 * Each stat has its constraints, display settings, and behavior.
 */
export const STAT_DEFINITIONS: Map<StatType, StatDefinition> = new Map([
	// ============================================
	// RESOURCE STATS
	// ============================================

	[
		'hp',
		{
			id: 'hp',
			category: 'resource',
			displayKey: 'pixelSurvivor.stats.hp',
			descriptionKey: 'pixelSurvivor.stats.hpDesc',
			icon: 'heart',
			color: 'var(--color-danger)',
			min: 0,
			max: 9999,
			defaultValue: 100,
			isResource: true,
			calculationType: 'additive',
			displayFormat: 'integer'
		}
	],

	[
		'maxHp',
		{
			id: 'maxHp',
			category: 'resource',
			displayKey: 'pixelSurvivor.stats.maxHp',
			descriptionKey: 'pixelSurvivor.stats.maxHpDesc',
			icon: 'heart-pulse',
			color: 'var(--color-danger)',
			min: 1,
			max: 9999,
			defaultValue: 100,
			isResource: false,
			calculationType: 'additive',
			displayFormat: 'integer'
		}
	],

	[
		'mana',
		{
			id: 'mana',
			category: 'resource',
			displayKey: 'pixelSurvivor.stats.mana',
			descriptionKey: 'pixelSurvivor.stats.manaDesc',
			icon: 'droplet',
			color: 'var(--color-info)',
			min: 0,
			max: 9999,
			defaultValue: 50,
			isResource: true,
			calculationType: 'additive',
			displayFormat: 'integer'
		}
	],

	[
		'maxMana',
		{
			id: 'maxMana',
			category: 'resource',
			displayKey: 'pixelSurvivor.stats.maxMana',
			descriptionKey: 'pixelSurvivor.stats.maxManaDesc',
			icon: 'droplets',
			color: 'var(--color-info)',
			min: 0,
			max: 9999,
			defaultValue: 50,
			isResource: false,
			calculationType: 'additive',
			displayFormat: 'integer'
		}
	],

	[
		'shield',
		{
			id: 'shield',
			category: 'resource',
			displayKey: 'pixelSurvivor.stats.shield',
			descriptionKey: 'pixelSurvivor.stats.shieldDesc',
			icon: 'shield',
			color: 'var(--color-warning)',
			min: 0,
			max: 9999,
			defaultValue: 0,
			isResource: true,
			calculationType: 'additive',
			displayFormat: 'integer'
		}
	],

	// ============================================
	// COMBAT STATS
	// ============================================

	[
		'attack',
		{
			id: 'attack',
			category: 'combat',
			displayKey: 'pixelSurvivor.stats.attack',
			descriptionKey: 'pixelSurvivor.stats.attackDesc',
			icon: 'sword',
			color: 'var(--color-danger)',
			min: 0,
			max: 999,
			defaultValue: 50,
			isResource: false,
			calculationType: 'additive',
			displayFormat: 'integer'
		}
	],

	[
		'defense',
		{
			id: 'defense',
			category: 'combat',
			displayKey: 'pixelSurvivor.stats.defense',
			descriptionKey: 'pixelSurvivor.stats.defenseDesc',
			icon: 'shield-half',
			color: 'var(--color-success)',
			min: 0,
			max: 999,
			defaultValue: 40,
			isResource: false,
			calculationType: 'additive',
			displayFormat: 'integer'
		}
	],

	[
		'speed',
		{
			id: 'speed',
			category: 'combat',
			displayKey: 'pixelSurvivor.stats.speed',
			descriptionKey: 'pixelSurvivor.stats.speedDesc',
			icon: 'zap',
			color: 'var(--color-warning)',
			min: 0,
			max: 999,
			defaultValue: 50,
			isResource: false,
			calculationType: 'additive',
			displayFormat: 'integer'
		}
	],

	[
		'luck',
		{
			id: 'luck',
			category: 'combat',
			displayKey: 'pixelSurvivor.stats.luck',
			descriptionKey: 'pixelSurvivor.stats.luckDesc',
			icon: 'clover',
			color: 'var(--color-accent)',
			min: 0,
			max: 999,
			defaultValue: 25,
			isResource: false,
			calculationType: 'additive',
			displayFormat: 'integer'
		}
	],

	// ============================================
	// CRITICAL STATS
	// ============================================

	[
		'critChance',
		{
			id: 'critChance',
			category: 'critical',
			displayKey: 'pixelSurvivor.stats.critChance',
			descriptionKey: 'pixelSurvivor.stats.critChanceDesc',
			icon: 'target',
			color: 'var(--color-danger)',
			min: 0,
			max: 100,
			defaultValue: 5,
			isResource: false,
			calculationType: 'additive',
			displayFormat: 'percent'
		}
	],

	[
		'critDamage',
		{
			id: 'critDamage',
			category: 'critical',
			displayKey: 'pixelSurvivor.stats.critDamage',
			descriptionKey: 'pixelSurvivor.stats.critDamageDesc',
			icon: 'flame',
			color: 'var(--color-danger)',
			min: 100,
			max: 1000,
			defaultValue: 150,
			isResource: false,
			calculationType: 'additive',
			displayFormat: 'percent'
		}
	],

	// ============================================
	// DEFENSIVE STATS
	// ============================================

	[
		'dodgeChance',
		{
			id: 'dodgeChance',
			category: 'defensive',
			displayKey: 'pixelSurvivor.stats.dodgeChance',
			descriptionKey: 'pixelSurvivor.stats.dodgeChanceDesc',
			icon: 'wind',
			color: 'var(--color-info)',
			min: 0,
			max: 75, // Cap at 75% to prevent invincibility
			defaultValue: 0,
			isResource: false,
			calculationType: 'additive',
			displayFormat: 'percent'
		}
	],

	[
		'armorPenetration',
		{
			id: 'armorPenetration',
			category: 'defensive',
			displayKey: 'pixelSurvivor.stats.armorPenetration',
			descriptionKey: 'pixelSurvivor.stats.armorPenetrationDesc',
			icon: 'crosshair',
			color: 'var(--color-warning)',
			min: 0,
			max: 100,
			defaultValue: 0,
			isResource: false,
			calculationType: 'additive',
			displayFormat: 'percent'
		}
	],

	// ============================================
	// UTILITY STATS (Multipliers)
	// ============================================

	[
		'xpRate',
		{
			id: 'xpRate',
			category: 'utility',
			displayKey: 'pixelSurvivor.stats.xpRate',
			descriptionKey: 'pixelSurvivor.stats.xpRateDesc',
			icon: 'star',
			color: 'var(--color-accent)',
			min: 0,
			max: 1000,
			defaultValue: 100, // 100 = 1.0x
			isResource: false,
			calculationType: 'multiplicative',
			displayFormat: 'percent'
		}
	],

	[
		'dropChance',
		{
			id: 'dropChance',
			category: 'utility',
			displayKey: 'pixelSurvivor.stats.dropChance',
			descriptionKey: 'pixelSurvivor.stats.dropChanceDesc',
			icon: 'gift',
			color: 'var(--color-success)',
			min: 0,
			max: 1000,
			defaultValue: 100, // 100 = 1.0x
			isResource: false,
			calculationType: 'multiplicative',
			displayFormat: 'percent'
		}
	]
]);

/**
 * Get a stat definition by type.
 * @throws Error if stat type is not found
 */
export function getStatDefinition(stat: StatType): StatDefinition {
	const def = STAT_DEFINITIONS.get(stat);
	if (!def) {
		throw new Error(`[StatRegistry] Unknown stat type: ${stat}`);
	}
	return def;
}

/**
 * Get all stat definitions.
 */
export function getAllStatDefinitions(): StatDefinition[] {
	return Array.from(STAT_DEFINITIONS.values());
}

/**
 * Get stat definitions by category.
 */
export function getStatsByCategory(category: StatDefinition['category']): StatDefinition[] {
	return getAllStatDefinitions().filter((s) => s.category === category);
}

/**
 * Check if a stat type exists.
 */
export function isValidStatType(stat: string): stat is StatType {
	return STAT_DEFINITIONS.has(stat as StatType);
}

/**
 * All stat types as an array.
 */
export const ALL_STAT_TYPES: StatType[] = Array.from(STAT_DEFINITIONS.keys());

/**
 * Resource stat types (have current/max values).
 */
export const RESOURCE_STATS: StatType[] = getAllStatDefinitions()
	.filter((s) => s.isResource)
	.map((s) => s.id);

/**
 * Combat stat types.
 */
export const COMBAT_STATS: StatType[] = getStatsByCategory('combat').map((s) => s.id);

/**
 * Utility stat types (multipliers).
 */
export const UTILITY_STATS: StatType[] = getStatsByCategory('utility').map((s) => s.id);
