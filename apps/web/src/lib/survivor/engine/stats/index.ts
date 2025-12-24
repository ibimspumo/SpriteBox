/**
 * Stats Module - Public API
 *
 * @module engine/stats
 */

// Types
export type {
	StatType,
	StatCategory,
	CalculationType,
	DisplayFormat,
	StatDefinition,
	StatValue,
	StatBreakdown,
	StatModifierBreakdown,
	BaseStats,
	SerializedStatValue,
	SerializedStats
} from './types.js';

export { DEFAULT_BASE_STATS } from './types.js';

// Registry
export {
	STAT_DEFINITIONS,
	getStatDefinition,
	getAllStatDefinitions,
	getStatsByCategory,
	isValidStatType,
	ALL_STAT_TYPES,
	RESOURCE_STATS,
	COMBAT_STATS,
	UTILITY_STATS
} from './registry.js';

// Manager
export { StatManager } from './manager.js';
export type { SerializedStatManager, CardDefinition, ItemDefinition } from './manager.js';
