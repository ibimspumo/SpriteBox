// apps/web/src/lib/idle-pixel/index.ts
// Barrel export for Idle Pixel game mode

// Store and state management
export {
	// Stores
	idlePixelState,
	idlePixelPhase,
	mergeAnimations,
	achievementPopup,
	offlineReport,
	isInitialized,
	lastSaveTime,

	// Derived stores
	currency,
	productionPerSecond,
	productionBreakdown,
	grid,
	unlockedSlots,
	pixelCount,
	emptySlots,
	slotPurchaseOptions,
	nextPixelInfo,
	stats,
	prestigeState,
	clickerState,
	colorPalette,

	// Upgrade stores
	upgradeDefinitions,
	upgradeCategories,
	allUpgradesInfo,
	purchasedUpgrades,

	// Prestige stores
	prestigeInfo,
	allPrestigeUpgradesInfo,
	prestigeUpgradeDefinitions,

	// Actions
	initializeIdlePixel,
	startNewGame,
	continueGame,
	saveGame,
	resetGame,
	pauseGame,
	resumeGame,
	buyPixel,
	buyMaxPixels,
	buySlot,
	clearCompletedAnimations,
	getStateSnapshot,
	cleanup,

	// Upgrade actions
	buyUpgrade,
	getUpgradeInfo,
	canPurchaseUpgrade,

	// Clicker actions
	harvestEnergy,
	collectGoldenPixel,
	getGoldenPixelBonus,

	// Prestige actions
	performPrestige,
	buyPrestigeUpgrade,
	canBuyPrestigeUpgrade,
	getPrestigeUpgradeInfo,
	showPrestigeConfirm,
	cancelPrestige,

	// Achievement actions
	showAchievement,
	dismissAchievement
} from './store.js';

export type { IdlePixelPhase } from './store.js';

// Systems
export {
	productionSystem,
	mergeSystem,
	gridSystem,
	purchaseSystem,
	upgradeEngine,
	energyBarSystem,
	goldenPixelSystem,
	prestigeEngine,
	ProductionSystem,
	MergeSystem,
	GridSystem,
	PurchaseSystem,
	UpgradeEngine,
	EnergyBarSystem,
	GoldenPixelSystem,
	PrestigeEngine,
	updateClickerSystems,
	UPGRADE_DEFINITIONS,
	UPGRADES_BY_ID,
	PRESTIGE_UPGRADE_DEFINITIONS,
	PRESTIGE_UPGRADES_BY_ID,
	getUpgradesByCategory,
	createUpgradeDefinitionsMap,
	calculatePrestigeGain,
	currencyForPrisma,
	createInitialPrestigeState
} from './systems/index.js';

export type { MergeAnimation, MergeCheckResult, GoldenPixelPosition } from './systems/index.js';

// Game Loop
export { gameLoop, GameLoop } from './game-loop.js';

// Storage
export {
	saveGameState,
	loadGameState,
	deleteSaveData,
	hasSaveData,
	exportSaveData,
	importSaveData,
	getSaveInfo
} from './storage.js';
