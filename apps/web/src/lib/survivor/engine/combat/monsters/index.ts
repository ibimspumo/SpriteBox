/**
 * Monster System - Barrel Exports
 *
 * @module engine/combat/monsters
 */

// Types
export type {
	MonsterRarity,
	MonsterBehavior,
	MonsterSize,
	MonsterZone,
	LootDrop,
	MonsterAbility,
	MonsterDefinition,
	MonsterInstance,
	MonstersJsonData,
	ZoneDefinition,
	MonsterSpawnRequest,
	MonsterSpawnResult
} from './types.js';

// Registry
export {
	initializeMonsterRegistry,
	getMonsterDefinition,
	getAllMonsterDefinitions,
	getMonstersForZone,
	getMonstersByRarity,
	hasMonster,
	calculateMonsterStats,
	createMonsterInstance,
	spawnMonster,
	calculateXpReward
} from './registry.js';
