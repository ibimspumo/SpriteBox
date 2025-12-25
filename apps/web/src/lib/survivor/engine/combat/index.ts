/**
 * Combat System - Barrel Exports
 *
 * Turn-based combat between player and monsters.
 *
 * @module engine/combat
 */

// ============================================
// COMBAT TYPES
// ============================================

export type {
	CombatPhase,
	CombatParticipant,
	D20RollCategory,
	CombatD20Roll,
	CombatActionType,
	CombatAction,
	CombatActionResult,
	CombatLogEntry,
	CombatState,
	DamageCalculationInput,
	DamageCalculationResult,
	CombatConfig,
	CombatEventType,
	CombatEvent
} from './types.js';

export { getCombatD20Result, DEFAULT_COMBAT_CONFIG } from './types.js';

// ============================================
// COMBAT ENGINE
// ============================================

export { CombatEngine, createCombatEngine } from './engine.js';

// ============================================
// MONSTER SYSTEM
// ============================================

export {
	// Types
	type MonsterRarity,
	type MonsterBehavior,
	type MonsterSize,
	type MonsterZone,
	type LootDrop,
	type MonsterAbility,
	type MonsterDefinition,
	type MonsterInstance,
	type MonstersJsonData,
	type ZoneDefinition,
	type MonsterSpawnRequest,
	type MonsterSpawnResult,
	// Registry Functions
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
} from './monsters/index.js';
