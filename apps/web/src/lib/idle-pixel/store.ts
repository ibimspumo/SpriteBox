// apps/web/src/lib/idle-pixel/store.ts
// Svelte stores for Idle Pixel game mode

import { writable, derived, get } from 'svelte/store';
import type { IdlePixelGameState, GridSlot, IdlePixel } from '@spritebox/types';
import {
	GRID_START_POSITIONS,
	IDLE_PIXEL_COLORS,
	getProductionForLevel,
	AUTO_SAVE_INTERVAL
} from '@spritebox/types';

// Cast for use with .includes()
const START_POSITIONS: readonly number[] = GRID_START_POSITIONS;
import { gameLoop } from './game-loop.js';
import {
	productionSystem,
	mergeSystem,
	gridSystem,
	purchaseSystem,
	upgradeEngine,
	energyBarSystem,
	goldenPixelSystem,
	prestigeEngine,
	UPGRADE_DEFINITIONS,
	PRESTIGE_UPGRADE_DEFINITIONS,
	getUpgradesByCategory
} from './systems/index.js';
import type { MergeAnimation } from './systems/index.js';
import { saveGameState, loadGameState, deleteSaveData, hasSaveData } from './storage.js';

// Note: Upgrade definitions are now initialized in the system constructors

// ============================================
// GAME STATE STORE
// ============================================

/**
 * Create initial game state
 */
function createInitialState(): IdlePixelGameState {
	// Create empty 8x8 grid
	const grid: GridSlot[] = [];
	for (let i = 0; i < 64; i++) {
		grid.push({
			position: i,
			unlocked: START_POSITIONS.includes(i),
			pixel: null
		});
	}

	// Add starting pixel (black, position 27)
	const startPixel: IdlePixel = {
		id: `px_start_${Date.now()}`,
		colorLevel: 0,
		position: 27,
		baseProduction: getProductionForLevel(0)
	};
	grid[27].pixel = startPixel;

	const now = Date.now();

	return {
		currency: 0,
		grid,
		upgrades: [],
		stats: {
			totalEarned: 0,
			pixelsPurchased: 0,
			mergesPerformed: 0,
			highestColorLevel: 0,
			totalClicks: 0,
			playTime: 0
		},
		clicker: {
			energyBarCurrent: 0,
			energyBarMax: 100,
			goldenPixelNextSpawn: now + 60000,
			goldenPixelActive: false,
			goldenPixelTimeLeft: 0
		},
		prestige: {
			prestigeCount: 0,
			prismaPixels: 0,
			totalPrismaEarned: 0,
			prestigeUpgrades: [],
			lifetimeHighestColorLevel: 0
		},
		lastSaved: now,
		lastTick: now
	};
}

// Main game state store
export const idlePixelState = writable<IdlePixelGameState | null>(null);

// Game phase (menu, playing, prestige confirmation, etc.)
export type IdlePixelPhase = 'menu' | 'playing' | 'offline-report' | 'prestige-confirm';
export const idlePixelPhase = writable<IdlePixelPhase>('menu');

// ============================================
// UI STATE STORES
// ============================================

// Active merge animations
export const mergeAnimations = writable<MergeAnimation[]>([]);

// Achievement popup state
export const achievementPopup = writable<{
	show: boolean;
	colorLevel: number;
} | null>(null);

// Achievement popup timeout
let achievementTimeout: ReturnType<typeof setTimeout> | null = null;

/**
 * Show achievement popup for new highest color level
 * Auto-dismisses after 4 seconds
 */
export function showAchievement(colorLevel: number): void {
	// Clear any existing timeout
	if (achievementTimeout) {
		clearTimeout(achievementTimeout);
	}

	// Show popup
	achievementPopup.set({ show: true, colorLevel });

	// Auto-dismiss after 4 seconds
	achievementTimeout = setTimeout(() => {
		achievementPopup.set(null);
		achievementTimeout = null;
	}, 4000);
}

/**
 * Manually dismiss achievement popup
 */
export function dismissAchievement(): void {
	if (achievementTimeout) {
		clearTimeout(achievementTimeout);
		achievementTimeout = null;
	}
	achievementPopup.set(null);
}

// Offline report data
export const offlineReport = writable<{
	seconds: number;
	earnings: number;
} | null>(null);

// Whether the game has been initialized
export const isInitialized = writable<boolean>(false);

// Last save timestamp (for UI indicator)
export const lastSaveTime = writable<number>(0);

// Auto-save interval ID
let autoSaveInterval: ReturnType<typeof setInterval> | null = null;

// ============================================
// DERIVED STORES
// ============================================

// Current currency
export const currency = derived(idlePixelState, ($state) => $state?.currency ?? 0);

// Production per second
export const productionPerSecond = derived(idlePixelState, ($state) => {
	if (!$state) return 0;
	return productionSystem.getTotalProductionPerSecond($state);
});

// Production breakdown for UI
export const productionBreakdown = derived(idlePixelState, ($state) => {
	if (!$state) {
		return {
			baseProduction: 0,
			upgradeMultiplier: 1,
			colorBonus: 1,
			prestigeMultiplier: 1,
			totalPerSecond: 0,
			pixelCount: 0,
			highestColorLevel: 0
		};
	}
	return productionSystem.getProductionBreakdown($state);
});

// Grid data
export const grid = derived(idlePixelState, ($state) => $state?.grid ?? []);

// Unlocked slot count
export const unlockedSlots = derived(grid, ($grid) => gridSystem.getUnlockedCount($grid));

// Pixel count
export const pixelCount = derived(grid, ($grid) => gridSystem.getPixelCount($grid));

// Empty slot count
export const emptySlots = derived(grid, ($grid) => gridSystem.getEmptySlotCount($grid));

// Available slot purchase options
export const slotPurchaseOptions = derived(grid, ($grid) =>
	gridSystem.getAvailableSlotOptions($grid)
);

// Next pixel purchase info
export const nextPixelInfo = derived(idlePixelState, ($state) => {
	if (!$state) {
		return {
			cost: 10,
			canAfford: false,
			hasSpace: false,
			newColorLevel: 0,
			productionGain: 1
		};
	}
	return purchaseSystem.getPurchaseInfo($state);
});

// Stats
export const stats = derived(idlePixelState, ($state) => $state?.stats ?? null);

// Prestige state
export const prestigeState = derived(idlePixelState, ($state) => $state?.prestige ?? null);

// Prestige info (for UI)
export const prestigeInfo = derived(idlePixelState, ($state) => {
	if (!$state) {
		return {
			canPrestige: false,
			prismaGain: 0,
			toNextPrisma: 0,
			progressToNext: 0,
			prismaPixels: 0,
			prestigeCount: 0
		};
	}
	return {
		canPrestige: prestigeEngine.canPrestige($state),
		prismaGain: prestigeEngine.getPrestigeGain($state),
		toNextPrisma: prestigeEngine.getCurrencyToNextPrisma($state),
		progressToNext: prestigeEngine.getProgressToNextPrisma($state),
		prismaPixels: $state.prestige.prismaPixels,
		prestigeCount: $state.prestige.prestigeCount
	};
});

// Prestige upgrades info (for UI)
export const allPrestigeUpgradesInfo = derived(idlePixelState, ($state) => {
	if (!$state) return [];
	return prestigeEngine.getAllPrestigeUpgradesInfo($state);
});

// Prestige upgrade definitions (static)
export const prestigeUpgradeDefinitions = PRESTIGE_UPGRADE_DEFINITIONS;

// Clicker state
export const clickerState = derived(idlePixelState, ($state) => $state?.clicker ?? null);

// Color palette reference
export const colorPalette = IDLE_PIXEL_COLORS;

// ============================================
// UPGRADE STORES
// ============================================

// All upgrade definitions (static)
export const upgradeDefinitions = UPGRADE_DEFINITIONS;

// Upgrades grouped by category (static)
export const upgradeCategories = getUpgradesByCategory();

// Upgrade info for all upgrades (reactive)
export const allUpgradesInfo = derived(idlePixelState, ($state) => {
	if (!$state) return [];
	return upgradeEngine.getAllUpgradesInfo($state);
});

// Purchased upgrades
export const purchasedUpgrades = derived(idlePixelState, ($state) => $state?.upgrades ?? []);

// ============================================
// ACTIONS
// ============================================

/**
 * Initialize the Idle Pixel game
 */
export function initializeIdlePixel(): void {
	// Check for existing save
	if (hasSaveData()) {
		const { state, offlineSeconds, offlineEarnings } = loadGameState();

		if (state) {
			idlePixelState.set(state);
			lastSaveTime.set(state.lastSaved); // Show when last saved

			// Initialize game loop
			gameLoop.initialize(state);
			gameLoop.setStateUpdateCallback((newState) => {
				idlePixelState.set(newState);
			});
			gameLoop.setAnimationCallback((animations) => {
				mergeAnimations.update((current) => [...current, ...animations]);
			});

			// Apply offline progress
			if (offlineSeconds > 0) {
				gameLoop.applyOfflineProgress(offlineSeconds);
			}

			// Show offline report if significant time passed
			if (offlineSeconds > 60) {
				offlineReport.set({
					seconds: offlineSeconds,
					earnings: offlineEarnings
				});
				idlePixelPhase.set('offline-report');
				// Loop will start when user clicks continue
			} else {
				// Go directly to playing and start the loop
				idlePixelPhase.set('playing');
				gameLoop.start();
			}

			startAutoSave();
			isInitialized.set(true);
			return;
		}
	}

	// No save - show menu
	isInitialized.set(true);
	idlePixelPhase.set('menu');
}

/**
 * Start a new game
 */
export function startNewGame(): void {
	const state = createInitialState();
	idlePixelState.set(state);
	idlePixelPhase.set('playing');

	// Initialize game loop
	gameLoop.initialize(state);
	gameLoop.setStateUpdateCallback((newState) => {
		idlePixelState.set(newState);
	});
	gameLoop.setAnimationCallback((animations) => {
		mergeAnimations.update((current) => [...current, ...animations]);
	});
	gameLoop.start();

	startAutoSave();
	saveGame(); // Use saveGame to also update lastSaveTime
}

/**
 * Continue from save (after offline report)
 */
export function continueGame(): void {
	offlineReport.set(null);
	idlePixelPhase.set('playing');
	gameLoop.start();
}

// Event handlers for visibility and unload
let visibilityHandler: (() => void) | null = null;
let beforeUnloadHandler: (() => void) | null = null;

/**
 * Start auto-save interval and event listeners
 */
function startAutoSave(): void {
	if (autoSaveInterval) {
		clearInterval(autoSaveInterval);
	}

	// Interval-based auto-save (every 30 seconds)
	autoSaveInterval = setInterval(() => {
		saveGame(); // Uses saveGame which updates lastSaveTime
	}, AUTO_SAVE_INTERVAL);

	// Save when tab becomes hidden (user switches tabs)
	if (!visibilityHandler) {
		visibilityHandler = () => {
			if (document.hidden) {
				saveGame();
			}
		};
		document.addEventListener('visibilitychange', visibilityHandler);
	}

	// Save when window/tab is about to close
	if (!beforeUnloadHandler) {
		beforeUnloadHandler = () => {
			saveGame();
		};
		window.addEventListener('beforeunload', beforeUnloadHandler);
	}
}

/**
 * Stop auto-save and remove event listeners
 */
function stopAutoSave(): void {
	if (autoSaveInterval) {
		clearInterval(autoSaveInterval);
		autoSaveInterval = null;
	}

	// Remove visibility change listener
	if (visibilityHandler) {
		document.removeEventListener('visibilitychange', visibilityHandler);
		visibilityHandler = null;
	}

	// Remove beforeunload listener
	if (beforeUnloadHandler) {
		window.removeEventListener('beforeunload', beforeUnloadHandler);
		beforeUnloadHandler = null;
	}
}

/**
 * Manual save
 */
export function saveGame(): boolean {
	const state = get(idlePixelState);
	if (!state) return false;
	const success = saveGameState(state);
	if (success) {
		lastSaveTime.set(Date.now());
	}
	return success;
}

/**
 * Reset game (with confirmation)
 */
export function resetGame(): void {
	gameLoop.stop();
	stopAutoSave();
	deleteSaveData();
	idlePixelState.set(null);
	offlineReport.set(null);
	mergeAnimations.set([]);
	idlePixelPhase.set('menu');
}

/**
 * Pause the game
 */
export function pauseGame(): void {
	gameLoop.stop();
	saveGame();
}

/**
 * Resume the game
 */
export function resumeGame(): void {
	gameLoop.start();
}

/**
 * Check for new highest color level and trigger achievement if needed
 * Also updates lifetimeHighestColorLevel if a new record is set
 */
function checkAndTriggerAchievement(state: IdlePixelGameState): IdlePixelGameState {
	const currentHighest = state.stats.highestColorLevel;
	const lifetimeHighest = state.prestige.lifetimeHighestColorLevel;

	if (currentHighest > lifetimeHighest) {
		// New lifetime record - trigger achievement and update state
		showAchievement(currentHighest);

		return {
			...state,
			prestige: {
				...state.prestige,
				lifetimeHighestColorLevel: currentHighest
			}
		};
	}

	return state;
}

/**
 * Purchase a pixel
 */
export function buyPixel(): boolean {
	const state = get(idlePixelState);
	if (!state) return false;

	const purchaseResult = purchaseSystem.purchasePixel(state);
	if (!purchaseResult) return false;

	// If purchase already performed an immediate merge, skip additional merge check
	let finalState = purchaseResult.newState;

	// Only check for additional merges if purchase didn't already merge
	if (!purchaseResult.mergedImmediately) {
		const mergeResult = mergeSystem.checkAndPerformMerges(finalState);

		// Trigger animations
		if (mergeResult.hasMerges) {
			mergeAnimations.update((current) => [...current, ...mergeResult.animations]);
		}

		finalState = mergeResult.newState;
	}

	// Check for new highest color level achievement
	finalState = checkAndTriggerAchievement(finalState);

	idlePixelState.set(finalState);
	gameLoop.setState(finalState);
	return true;
}

/**
 * Buy maximum pixels
 */
export function buyMaxPixels(): number {
	const state = get(idlePixelState);
	if (!state) return 0;

	const { newState, pixelsBought } = purchaseSystem.purchaseMaxPixels(state);

	if (pixelsBought > 0) {
		// Check for merges after all purchases
		const mergeResult = mergeSystem.checkAndPerformMerges(newState);

		if (mergeResult.hasMerges) {
			mergeAnimations.update((current) => [...current, ...mergeResult.animations]);
		}

		// Check for new highest color level achievement
		const finalState = checkAndTriggerAchievement(mergeResult.newState);

		idlePixelState.set(finalState);
		gameLoop.setState(finalState);
	}

	return pixelsBought;
}

/**
 * Purchase a grid slot
 */
export function buySlot(position: number): boolean {
	const state = get(idlePixelState);
	if (!state) return false;

	const newState = gridSystem.purchaseSlot(state, position);
	if (!newState) return false;

	idlePixelState.set(newState);
	gameLoop.setState(newState);
	return true;
}

/**
 * Clear completed animations
 */
export function clearCompletedAnimations(): void {
	const completed = mergeSystem.updateAnimations();
	if (completed.length > 0) {
		mergeAnimations.update((anims) => anims.filter((a) => !completed.includes(a.id)));
	}
}

/**
 * Get current state snapshot
 */
export function getStateSnapshot(): IdlePixelGameState | null {
	return get(idlePixelState);
}

/**
 * Cleanup on unmount
 */
export function cleanup(): void {
	gameLoop.stop();
	stopAutoSave();
	saveGame();
}

/**
 * Purchase an upgrade
 */
export function buyUpgrade(upgradeId: string): boolean {
	const state = get(idlePixelState);
	if (!state) return false;

	const newState = upgradeEngine.purchase(state, upgradeId);
	if (!newState) return false;

	// Special handling for "better_pixels" upgrade:
	// Upgrade all existing pixels that are below the new minimum level
	if (upgradeId === 'better_pixels') {
		const newMinLevel = upgradeEngine.calculateEffect(newState, 'increase_base_pixel_level');
		let pixelsUpgraded = 0;

		newState.grid = newState.grid.map((slot) => {
			if (slot.pixel && slot.pixel.colorLevel < newMinLevel) {
				pixelsUpgraded++;
				return {
					...slot,
					pixel: {
						...slot.pixel,
						colorLevel: newMinLevel,
						baseProduction: getProductionForLevel(newMinLevel)
					}
				};
			}
			return slot;
		});

		// Update highest color level stat if needed
		if (newMinLevel > newState.stats.highestColorLevel) {
			newState.stats = {
				...newState.stats,
				highestColorLevel: newMinLevel
			};
		}
	}

	// Check for new highest color level achievement
	const finalState = checkAndTriggerAchievement(newState);

	idlePixelState.set(finalState);
	gameLoop.setState(finalState);
	return true;
}

/**
 * Get upgrade info for a specific upgrade
 */
export function getUpgradeInfo(upgradeId: string) {
	const state = get(idlePixelState);
	if (!state) return null;
	return upgradeEngine.getUpgradeInfo(state, upgradeId);
}

/**
 * Check if an upgrade can be purchased
 */
export function canPurchaseUpgrade(upgradeId: string) {
	const state = get(idlePixelState);
	if (!state) return { canBuy: false, reason: 'No game state' };
	return upgradeEngine.canPurchase(state, upgradeId);
}

// ============================================
// CLICKER ACTIONS
// ============================================

/**
 * Harvest energy bar
 */
export function harvestEnergy(): number {
	const state = get(idlePixelState);
	if (!state) return 0;

	const { newState, harvested } = energyBarSystem.harvest(state);

	if (harvested > 0) {
		idlePixelState.set(newState);
		gameLoop.setState(newState);
	}

	return harvested;
}

/**
 * Collect golden pixel
 */
export function collectGoldenPixel(): number {
	const state = get(idlePixelState);
	if (!state) return 0;

	const production = productionSystem.getTotalProductionPerSecond(state);
	const { newState, bonus } = goldenPixelSystem.collect(state, production);

	if (bonus > 0) {
		idlePixelState.set(newState);
		gameLoop.setState(newState);
	}

	return bonus;
}

/**
 * Get golden pixel bonus value (for UI preview)
 */
export function getGoldenPixelBonus(): number {
	const state = get(idlePixelState);
	if (!state) return 0;

	const production = productionSystem.getTotalProductionPerSecond(state);
	return goldenPixelSystem.getBonusValue(state, production);
}

// ============================================
// PRESTIGE ACTIONS
// ============================================

/**
 * Perform prestige - reset game with prisma rewards
 */
export function performPrestige(): boolean {
	const state = get(idlePixelState);
	if (!state) return false;

	if (!prestigeEngine.canPrestige(state)) return false;

	try {
		// Stop the game loop during prestige
		gameLoop.stop();

		// Perform prestige and get new state
		const newState = prestigeEngine.performPrestige(state);

		// Update state
		idlePixelState.set(newState);
		gameLoop.setState(newState);

		// Save immediately
		saveGame();

		// Restart game loop
		gameLoop.start();

		// Switch back to playing phase
		idlePixelPhase.set('playing');

		return true;
	} catch (error) {
		console.error('Prestige failed:', error);
		// Resume game loop on error
		gameLoop.start();
		return false;
	}
}

/**
 * Purchase a prestige upgrade
 */
export function buyPrestigeUpgrade(upgradeId: string): boolean {
	const state = get(idlePixelState);
	if (!state) return false;

	const newState = prestigeEngine.purchasePrestigeUpgrade(state, upgradeId);
	if (!newState) return false;

	idlePixelState.set(newState);
	gameLoop.setState(newState);
	return true;
}

/**
 * Check if a prestige upgrade can be purchased
 */
export function canBuyPrestigeUpgrade(upgradeId: string): { canBuy: boolean; reason?: string } {
	const state = get(idlePixelState);
	if (!state) return { canBuy: false, reason: 'No game state' };
	return prestigeEngine.canPurchasePrestigeUpgrade(state, upgradeId);
}

/**
 * Get prestige upgrade info for a specific upgrade
 */
export function getPrestigeUpgradeInfo(upgradeId: string) {
	const state = get(idlePixelState);
	if (!state) return null;
	return prestigeEngine.getPrestigeUpgradeInfo(state, upgradeId);
}

/**
 * Show prestige confirmation dialog
 */
export function showPrestigeConfirm(): void {
	idlePixelPhase.set('prestige-confirm');
}

/**
 * Cancel prestige and return to playing
 */
export function cancelPrestige(): void {
	idlePixelPhase.set('playing');
}
