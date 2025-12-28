// apps/web/src/lib/idle-pixel/systems/clicker.ts
// Clicker Systems - Energy Bar & Golden Pixel

import type { IdlePixelGameState, UpgradeEffectType } from '@spritebox/types';
import { BALANCE } from '@spritebox/types';
import { createUpgradeDefinitionsMap } from './upgrades.js';

/**
 * Get the value for a specific upgrade effect type
 */
function getUpgradeEffectValue(
	state: IdlePixelGameState,
	effectType: UpgradeEffectType,
	upgradeDefinitions: Map<string, { effectType: UpgradeEffectType; effectValue: number }>
): number {
	let total = 1;

	for (const purchased of state.upgrades) {
		const definition = upgradeDefinitions.get(purchased.upgradeId);
		if (definition && definition.effectType === effectType) {
			total *= Math.pow(definition.effectValue, purchased.level);
		}
	}

	return total;
}

// ============================================
// ENERGY BAR SYSTEM
// ============================================

/**
 * Energy Bar System
 * Fills passively based on production, click to harvest
 */
export class EnergyBarSystem {
	private upgradeDefinitions: Map<string, { effectType: UpgradeEffectType; effectValue: number }>;

	constructor() {
		this.upgradeDefinitions = createUpgradeDefinitionsMap();
	}

	/**
	 * Calculate the maximum capacity based on upgrades
	 */
	getMaxCapacity(state: IdlePixelGameState): number {
		const upgradeMultiplier = getUpgradeEffectValue(
			state,
			'energy_bar_capacity',
			this.upgradeDefinitions
		);
		return Math.floor(BALANCE.ENERGY_BASE_CAPACITY * upgradeMultiplier);
	}

	/**
	 * Calculate fill rate per second based on production
	 */
	getFillRate(state: IdlePixelGameState, productionPerSecond: number): number {
		return productionPerSecond * BALANCE.ENERGY_FILL_RATE_PERCENT;
	}

	/**
	 * Update energy bar state
	 */
	update(
		state: IdlePixelGameState,
		deltaSeconds: number,
		productionPerSecond: number
	): IdlePixelGameState {
		const maxCapacity = this.getMaxCapacity(state);
		const fillRate = this.getFillRate(state, productionPerSecond);
		const fillAmount = fillRate * deltaSeconds;

		const newCurrent = Math.min(state.clicker.energyBarCurrent + fillAmount, maxCapacity);

		return {
			...state,
			clicker: {
				...state.clicker,
				energyBarCurrent: newCurrent,
				energyBarMax: maxCapacity
			}
		};
	}

	/**
	 * Harvest energy bar - convert to currency
	 */
	harvest(state: IdlePixelGameState): { newState: IdlePixelGameState; harvested: number } {
		const harvested = Math.floor(state.clicker.energyBarCurrent);

		if (harvested <= 0) {
			return { newState: state, harvested: 0 };
		}

		const newState: IdlePixelGameState = {
			...state,
			currency: state.currency + harvested,
			clicker: {
				...state.clicker,
				energyBarCurrent: 0
			},
			stats: {
				...state.stats,
				totalEarned: state.stats.totalEarned + harvested,
				totalClicks: state.stats.totalClicks + 1
			}
		};

		return { newState, harvested };
	}

	/**
	 * Get fill percentage (0-100)
	 */
	getFillPercentage(state: IdlePixelGameState): number {
		const max = state.clicker.energyBarMax;
		if (max === 0) return 0;
		return (state.clicker.energyBarCurrent / max) * 100;
	}
}

// ============================================
// GOLDEN PIXEL SYSTEM
// ============================================

/**
 * Golden Pixel position for UI
 */
export interface GoldenPixelPosition {
	x: number; // percentage (0-100)
	y: number; // percentage (0-100)
}

/**
 * Golden Pixel System
 * Appears randomly, gives bonus when clicked
 */
export class GoldenPixelSystem {
	private upgradeDefinitions: Map<string, { effectType: UpgradeEffectType; effectValue: number }>;

	constructor() {
		this.upgradeDefinitions = createUpgradeDefinitionsMap();
	}

	/**
	 * Calculate spawn interval based on upgrades
	 */
	getSpawnInterval(state: IdlePixelGameState): number {
		const frequencyMultiplier = getUpgradeEffectValue(
			state,
			'golden_pixel_frequency',
			this.upgradeDefinitions
		);
		// Lower multiplier = shorter interval
		return Math.floor(BALANCE.GOLDEN_BASE_INTERVAL_MS * frequencyMultiplier);
	}

	/**
	 * Get a randomized spawn interval with variance
	 */
	getRandomizedSpawnInterval(state: IdlePixelGameState): number {
		const baseInterval = this.getSpawnInterval(state);
		const variance = baseInterval * BALANCE.GOLDEN_INTERVAL_VARIANCE;
		// Random between (baseInterval - variance) and (baseInterval + variance)
		return baseInterval + (Math.random() * 2 - 1) * variance;
	}

	/**
	 * Calculate bonus value when collected
	 */
	getBonusValue(state: IdlePixelGameState, productionPerSecond: number): number {
		const bonusMultiplier = getUpgradeEffectValue(
			state,
			'golden_pixel_value',
			this.upgradeDefinitions
		);
		return Math.floor(productionPerSecond * BALANCE.GOLDEN_BASE_MULTIPLIER * bonusMultiplier);
	}

	/**
	 * Get visibility duration
	 */
	getVisibleDuration(): number {
		return BALANCE.GOLDEN_VISIBLE_DURATION_MS;
	}

	/**
	 * Update golden pixel state
	 */
	update(state: IdlePixelGameState, now: number): IdlePixelGameState {
		let newState = { ...state };

		if (state.clicker.goldenPixelActive) {
			// Active - check if time expired
			const elapsed = now - (state.lastTick || now);
			const newTimeLeft = state.clicker.goldenPixelTimeLeft - elapsed;

			if (newTimeLeft <= 0) {
				// Time expired - hide and schedule next spawn
				newState = {
					...newState,
					clicker: {
						...newState.clicker,
						goldenPixelActive: false,
						goldenPixelTimeLeft: 0,
						goldenPixelNextSpawn: now + this.getRandomizedSpawnInterval(state)
					}
				};
			} else {
				// Still visible - update remaining time
				newState = {
					...newState,
					clicker: {
						...newState.clicker,
						goldenPixelTimeLeft: newTimeLeft
					}
				};
			}
		} else {
			// Not active - check if should spawn
			if (now >= state.clicker.goldenPixelNextSpawn) {
				newState = {
					...newState,
					clicker: {
						...newState.clicker,
						goldenPixelActive: true,
						goldenPixelTimeLeft: BALANCE.GOLDEN_VISIBLE_DURATION_MS
					}
				};
			}
		}

		return newState;
	}

	/**
	 * Collect golden pixel
	 */
	collect(
		state: IdlePixelGameState,
		productionPerSecond: number
	): { newState: IdlePixelGameState; bonus: number } {
		if (!state.clicker.goldenPixelActive) {
			return { newState: state, bonus: 0 };
		}

		const bonus = this.getBonusValue(state, productionPerSecond);
		const now = Date.now();

		const newState: IdlePixelGameState = {
			...state,
			currency: state.currency + bonus,
			clicker: {
				...state.clicker,
				goldenPixelActive: false,
				goldenPixelTimeLeft: 0,
				goldenPixelNextSpawn: now + this.getRandomizedSpawnInterval(state)
			},
			stats: {
				...state.stats,
				totalEarned: state.stats.totalEarned + bonus,
				totalClicks: state.stats.totalClicks + 1
			}
		};

		return { newState, bonus };
	}

	/**
	 * Generate random position for golden pixel
	 */
	getRandomPosition(): GoldenPixelPosition {
		return {
			x: Math.random() * 60 + 20, // 20-80%
			y: Math.random() * 40 + 30 // 30-70%
		};
	}

	/**
	 * Get remaining time percentage (0-1)
	 */
	getTimeProgress(state: IdlePixelGameState): number {
		if (!state.clicker.goldenPixelActive) return 0;
		return state.clicker.goldenPixelTimeLeft / BALANCE.GOLDEN_VISIBLE_DURATION_MS;
	}
}

// ============================================
// SINGLETON INSTANCES
// ============================================

export const energyBarSystem = new EnergyBarSystem();
export const goldenPixelSystem = new GoldenPixelSystem();

// ============================================
// INTEGRATION FUNCTION
// ============================================

/**
 * Update all clicker systems in game loop
 */
export function updateClickerSystems(
	state: IdlePixelGameState,
	deltaSeconds: number,
	now: number,
	productionPerSecond: number
): IdlePixelGameState {
	let newState = state;

	// 1. Update energy bar
	newState = energyBarSystem.update(newState, deltaSeconds, productionPerSecond);

	// 2. Update golden pixel
	newState = goldenPixelSystem.update(newState, now);

	return newState;
}
