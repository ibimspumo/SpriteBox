// apps/web/src/lib/idle-pixel/systems/index.ts
// Barrel export for all systems

export { ProductionSystem, productionSystem } from './production.js';
export { MergeSystem, mergeSystem } from './merge.js';
export type { MergeAnimation, MergeCheckResult } from './merge.js';
export { GridSystem, gridSystem } from './grid.js';
export { PurchaseSystem, purchaseSystem } from './purchase.js';
export {
	UpgradeEngine,
	upgradeEngine,
	UPGRADE_DEFINITIONS,
	UPGRADES_BY_ID,
	getUpgradesByCategory,
	createUpgradeDefinitionsMap
} from './upgrades.js';
export {
	EnergyBarSystem,
	energyBarSystem,
	GoldenPixelSystem,
	goldenPixelSystem,
	updateClickerSystems
} from './clicker.js';
export type { GoldenPixelPosition } from './clicker.js';
export {
	PrestigeEngine,
	prestigeEngine,
	PRESTIGE_UPGRADE_DEFINITIONS,
	PRESTIGE_UPGRADES_BY_ID,
	calculatePrestigeGain,
	currencyForPrisma,
	createInitialPrestigeState
} from './prestige.js';
