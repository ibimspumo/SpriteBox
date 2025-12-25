/**
 * Monster System - Type Definitions
 *
 * Defines the structure for monsters in the Pixel Survivor game.
 * Monsters are enemies that players fight in turn-based combat.
 *
 * @module engine/combat/monsters/types
 */

import type { ElementType } from '../../core/elements/types.js';
import type { BaseStats } from '../../stats/types.js';

// ============================================
// MONSTER DEFINITION
// ============================================

/**
 * Rarity tiers for monsters.
 * Affects drop rates, XP rewards, and spawn frequency.
 */
export type MonsterRarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary' | 'boss';

/**
 * Monster behavior patterns.
 * Determines combat AI.
 */
export type MonsterBehavior =
	| 'aggressive' // Prioritizes attacking
	| 'defensive' // Prioritizes defense, heals if available
	| 'balanced' // Mixed approach
	| 'berserker' // Gets stronger at low HP
	| 'tactical'; // Uses abilities strategically

/**
 * Monster size category.
 * Can affect dodge/hit chances.
 */
export type MonsterSize = 'tiny' | 'small' | 'medium' | 'large' | 'huge';

/**
 * Zone/area where monster can spawn.
 */
export interface MonsterZone {
	/** Zone identifier */
	id: string;
	/** Minimum round for this zone (0-indexed) */
	minRound: number;
	/** Maximum round for this zone (-1 for unlimited) */
	maxRound: number;
	/** Spawn weight in this zone (higher = more common) */
	weight: number;
}

/**
 * Loot drop definition.
 */
export interface LootDrop {
	/** Item ID to drop */
	itemId: string;
	/** Drop chance (0-1) */
	chance: number;
	/** Minimum quantity */
	minQuantity: number;
	/** Maximum quantity */
	maxQuantity: number;
	/** Rarity affects final drop chance */
	affectedByLuck: boolean;
}

/**
 * Monster ability/skill.
 */
export interface MonsterAbility {
	/** Unique ability ID */
	id: string;
	/** i18n key for name */
	nameKey: string;
	/** i18n key for description */
	descriptionKey: string;
	/** Cooldown in turns (0 = no cooldown) */
	cooldown: number;
	/** HP threshold to use (e.g., 0.5 = use when below 50% HP) */
	hpThreshold?: number;
	/** Damage multiplier (1.0 = base damage) */
	damageMultiplier?: number;
	/** Self-heal amount (flat or percent) */
	healAmount?: number;
	/** Whether heal is percentage of max HP */
	healIsPercent?: boolean;
	/** Buff to apply to self */
	selfBuff?: string;
	/** Debuff to apply to target */
	targetDebuff?: string;
}

/**
 * Complete monster definition.
 * Loaded from JSON and used to create monster instances.
 */
export interface MonsterDefinition {
	/** Unique monster ID */
	id: string;

	/** i18n key for display name */
	nameKey: string;

	/** i18n key for description */
	descriptionKey: string;

	/** 64-character hex string for 8x8 pixel art */
	pixels: string;

	// === Combat Properties ===

	/** Monster's element type */
	element: ElementType;

	/** Monster's rarity tier */
	rarity: MonsterRarity;

	/** Combat behavior pattern */
	behavior: MonsterBehavior;

	/** Physical size */
	size: MonsterSize;

	// === Base Stats ===

	/**
	 * Base stats for level 1.
	 * Stats scale with level.
	 */
	baseStats: BaseStats;

	/**
	 * Stat growth per level (multiplier).
	 * E.g., 0.1 = +10% per level.
	 */
	statGrowth: number;

	// === Level Range ===

	/** Minimum spawn level */
	minLevel: number;

	/** Maximum spawn level (-1 for unlimited) */
	maxLevel: number;

	// === Zones ===

	/**
	 * Zones where this monster can spawn.
	 */
	zones: MonsterZone[];

	// === Rewards ===

	/**
	 * Base XP reward at level 1.
	 * Scales with level difference.
	 */
	baseXp: number;

	/**
	 * Possible loot drops.
	 */
	loot: LootDrop[];

	// === Abilities ===

	/**
	 * Special abilities (optional).
	 */
	abilities: MonsterAbility[];

	// === Visual/Audio ===

	/** Icon for UI (emoji or icon name) */
	icon: string;

	/** Sound effect on attack */
	attackSound?: string;

	/** Sound effect on death */
	deathSound?: string;
}

// ============================================
// MONSTER INSTANCE
// ============================================

/**
 * A spawned monster in combat.
 * Created from MonsterDefinition with specific level and current stats.
 */
export interface MonsterInstance {
	/** Unique instance ID (for tracking in combat) */
	instanceId: string;

	/** Reference to monster definition */
	definitionId: string;

	/** Monster's display name (localized) */
	name: string;

	/** Current level */
	level: number;

	/** Pixel art (from definition) */
	pixels: string;

	/** Element type */
	element: ElementType;

	/** Rarity */
	rarity: MonsterRarity;

	/** Behavior pattern */
	behavior: MonsterBehavior;

	// === Current Combat Stats ===

	/** Current HP */
	currentHp: number;

	/** Maximum HP (calculated from base + level) */
	maxHp: number;

	/** Current mana (if applicable) */
	currentMana: number;

	/** Maximum mana */
	maxMana: number;

	/** Attack stat (calculated) */
	attack: number;

	/** Defense stat (calculated) */
	defense: number;

	/** Speed stat (calculated) */
	speed: number;

	/** Luck stat (calculated) */
	luck: number;

	// === Combat State ===

	/** Current active buffs */
	buffs: string[];

	/** Current active debuffs */
	debuffs: string[];

	/** Ability cooldowns (abilityId -> turnsRemaining) */
	abilityCooldowns: Record<string, number>;

	/** Whether monster is alive */
	isAlive: boolean;
}

// ============================================
// MONSTER DATA (JSON Format)
// ============================================

/**
 * Format for monsters.json file.
 */
export interface MonstersJsonData {
	version: number;
	monsters: MonsterDefinition[];
}

// ============================================
// ZONE CONFIGURATION
// ============================================

/**
 * Zone definition for monster spawning.
 */
export interface ZoneDefinition {
	/** Zone ID (e.g., 'forest', 'cave', 'volcano') */
	id: string;

	/** i18n key for zone name */
	nameKey: string;

	/** Starting round (inclusive) */
	startRound: number;

	/** Ending round (inclusive, -1 for unlimited) */
	endRound: number;

	/** Monster IDs that can spawn in this zone */
	monsterIds: string[];

	/** Environment element bonus (affects element damage) */
	environmentElement?: ElementType;

	/** Spawn rate multiplier for the zone */
	spawnRateMultiplier: number;
}

// ============================================
// HELPER TYPES
// ============================================

/**
 * Monster spawn request.
 */
export interface MonsterSpawnRequest {
	/** Target zone */
	zoneId?: string;

	/** Target level (or range) */
	level: number | { min: number; max: number };

	/** Preferred rarity (optional) */
	rarity?: MonsterRarity;

	/** Specific monster ID (optional, for scripted encounters) */
	monsterId?: string;
}

/**
 * Result of spawning a monster.
 */
export interface MonsterSpawnResult {
	success: boolean;
	monster?: MonsterInstance;
	error?: string;
}
