/**
 * Monster Registry
 *
 * Manages monster definitions and creates monster instances for combat.
 *
 * @module engine/combat/monsters/registry
 */

import type {
	MonsterDefinition,
	MonsterInstance,
	MonsterSpawnRequest,
	MonsterSpawnResult,
	MonsterRarity,
	MonstersJsonData
} from './types.js';

// Import monster data
import monstersData from '../../../data/monsters.json';

// ============================================
// REGISTRY STATE
// ============================================

const monsterRegistry: Map<string, MonsterDefinition> = new Map();
let isInitialized = false;

// ============================================
// INITIALIZATION
// ============================================

/**
 * Initialize the monster registry from JSON data.
 */
export function initializeMonsterRegistry(): void {
	if (isInitialized) return;

	const data = monstersData as MonstersJsonData;

	for (const monster of data.monsters) {
		monsterRegistry.set(monster.id, monster);
	}

	isInitialized = true;
	console.log(`Monster registry initialized with ${monsterRegistry.size} monsters`);
}

/**
 * Ensure registry is initialized (lazy initialization).
 */
function ensureInitialized(): void {
	if (!isInitialized) {
		initializeMonsterRegistry();
	}
}

// ============================================
// REGISTRY QUERIES
// ============================================

/**
 * Get a monster definition by ID.
 */
export function getMonsterDefinition(id: string): MonsterDefinition | undefined {
	ensureInitialized();
	return monsterRegistry.get(id);
}

/**
 * Get all monster definitions.
 */
export function getAllMonsterDefinitions(): MonsterDefinition[] {
	ensureInitialized();
	return Array.from(monsterRegistry.values());
}

/**
 * Get monsters available in a specific zone.
 */
export function getMonstersForZone(zoneId: string, round: number): MonsterDefinition[] {
	ensureInitialized();

	return Array.from(monsterRegistry.values()).filter((monster) => {
		return monster.zones.some((zone) => {
			if (zone.id !== zoneId) return false;
			if (round < zone.minRound) return false;
			if (zone.maxRound !== -1 && round > zone.maxRound) return false;
			return true;
		});
	});
}

/**
 * Get monsters by rarity.
 */
export function getMonstersByRarity(rarity: MonsterRarity): MonsterDefinition[] {
	ensureInitialized();
	return Array.from(monsterRegistry.values()).filter((m) => m.rarity === rarity);
}

/**
 * Check if a monster exists.
 */
export function hasMonster(id: string): boolean {
	ensureInitialized();
	return monsterRegistry.has(id);
}

// ============================================
// INSTANCE CREATION
// ============================================

/**
 * Generate a unique instance ID.
 */
function generateInstanceId(): string {
	const randomPart = Array.from(crypto.getRandomValues(new Uint8Array(6)))
		.map((b) => b.toString(16).padStart(2, '0'))
		.join('');
	return `monster_${Date.now()}_${randomPart}`;
}

/**
 * Calculate scaled stats for a monster at a specific level.
 */
export function calculateMonsterStats(
	definition: MonsterDefinition,
	level: number
): {
	maxHp: number;
	maxMana: number;
	attack: number;
	defense: number;
	speed: number;
	luck: number;
} {
	const levelMultiplier = 1 + definition.statGrowth * (level - 1);

	return {
		maxHp: Math.floor(definition.baseStats.maxHp * levelMultiplier),
		maxMana: Math.floor(definition.baseStats.maxMana * levelMultiplier),
		attack: Math.floor(definition.baseStats.attack * levelMultiplier),
		defense: Math.floor(definition.baseStats.defense * levelMultiplier),
		speed: Math.floor(definition.baseStats.speed * levelMultiplier),
		luck: Math.floor(definition.baseStats.luck * levelMultiplier)
	};
}

/**
 * Create a monster instance from a definition.
 */
export function createMonsterInstance(
	definition: MonsterDefinition,
	level: number,
	name?: string
): MonsterInstance {
	const stats = calculateMonsterStats(definition, level);

	return {
		instanceId: generateInstanceId(),
		definitionId: definition.id,
		name: name ?? definition.id, // Will be localized by UI
		level,
		pixels: definition.pixels,
		element: definition.element,
		rarity: definition.rarity,
		behavior: definition.behavior,

		// Combat stats
		currentHp: stats.maxHp,
		maxHp: stats.maxHp,
		currentMana: stats.maxMana,
		maxMana: stats.maxMana,
		attack: stats.attack,
		defense: stats.defense,
		speed: stats.speed,
		luck: stats.luck,

		// Combat state
		buffs: [],
		debuffs: [],
		abilityCooldowns: {},
		isAlive: true
	};
}

/**
 * Spawn a monster based on request parameters.
 */
export function spawnMonster(request: MonsterSpawnRequest): MonsterSpawnResult {
	ensureInitialized();

	// Determine level
	let level: number;
	if (typeof request.level === 'number') {
		level = request.level;
	} else {
		const range = request.level;
		level = range.min + Math.floor(Math.random() * (range.max - range.min + 1));
	}

	// If specific monster requested
	if (request.monsterId) {
		const definition = monsterRegistry.get(request.monsterId);
		if (!definition) {
			return { success: false, error: `Monster '${request.monsterId}' not found` };
		}

		// Check level bounds
		if (level < definition.minLevel) {
			level = definition.minLevel;
		}
		if (definition.maxLevel !== -1 && level > definition.maxLevel) {
			level = definition.maxLevel;
		}

		return {
			success: true,
			monster: createMonsterInstance(definition, level)
		};
	}

	// Otherwise, find eligible monsters
	let eligibleMonsters = Array.from(monsterRegistry.values());

	// Filter by zone if specified
	if (request.zoneId) {
		eligibleMonsters = eligibleMonsters.filter((m) =>
			m.zones.some((z) => z.id === request.zoneId)
		);
	}

	// Filter by rarity if specified
	if (request.rarity) {
		eligibleMonsters = eligibleMonsters.filter((m) => m.rarity === request.rarity);
	}

	// Filter by level range
	eligibleMonsters = eligibleMonsters.filter((m) => {
		if (level < m.minLevel) return false;
		if (m.maxLevel !== -1 && level > m.maxLevel) return false;
		return true;
	});

	if (eligibleMonsters.length === 0) {
		return { success: false, error: 'No eligible monsters found for spawn request' };
	}

	// Weighted random selection based on zone weights
	const weights: number[] = [];
	for (const monster of eligibleMonsters) {
		let weight = 1;
		if (request.zoneId) {
			const zone = monster.zones.find((z) => z.id === request.zoneId);
			if (zone) {
				weight = zone.weight;
			}
		}
		weights.push(weight);
	}

	const totalWeight = weights.reduce((sum, w) => sum + w, 0);
	const randomValue = Math.random() * totalWeight;

	let cumulative = 0;
	let selectedMonster: MonsterDefinition | undefined;
	for (let i = 0; i < eligibleMonsters.length; i++) {
		cumulative += weights[i];
		if (randomValue <= cumulative) {
			selectedMonster = eligibleMonsters[i];
			break;
		}
	}

	if (!selectedMonster) {
		selectedMonster = eligibleMonsters[0];
	}

	return {
		success: true,
		monster: createMonsterInstance(selectedMonster, level)
	};
}

// ============================================
// XP CALCULATION
// ============================================

/**
 * Calculate XP reward for defeating a monster.
 *
 * Formula:
 * - Base XP from monster definition
 * - Scaled by monster level
 * - Modified by level difference (more XP for higher level monsters)
 * - Rarity multiplier
 */
export function calculateXpReward(
	monster: MonsterInstance,
	playerLevel: number
): number {
	const definition = getMonsterDefinition(monster.definitionId);
	if (!definition) return 0;

	// Base XP scales with monster level
	let xp = definition.baseXp * (1 + 0.1 * (monster.level - 1));

	// Level difference modifier
	const levelDiff = monster.level - playerLevel;
	if (levelDiff > 0) {
		// Higher level monster = bonus XP (up to +50% for 5+ levels above)
		xp *= 1 + Math.min(levelDiff * 0.1, 0.5);
	} else if (levelDiff < -3) {
		// Much lower level monster = reduced XP
		xp *= Math.max(0.1, 1 + levelDiff * 0.15);
	}

	// Rarity multiplier
	const rarityMultipliers: Record<MonsterRarity, number> = {
		common: 1.0,
		uncommon: 1.25,
		rare: 1.5,
		epic: 2.0,
		legendary: 3.0,
		boss: 5.0
	};
	xp *= rarityMultipliers[monster.rarity];

	return Math.floor(xp);
}

// ============================================
// EXPORTS
// ============================================

export {
	type MonsterDefinition,
	type MonsterInstance,
	type MonsterSpawnRequest,
	type MonsterSpawnResult,
	type MonsterRarity,
	type MonstersJsonData
} from './types.js';
