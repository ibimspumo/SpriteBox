// apps/web/src/lib/idle-pixel/systems/purchase.ts
// Purchase System - handles buying new pixels

import type { IdlePixelGameState, IdlePixel, PurchasedUpgrade, UpgradeEffectType } from '@spritebox/types';
import { getProductionForLevel, BALANCE } from '@spritebox/types';
import { gridSystem } from './grid.js';
import { createUpgradeDefinitionsMap } from './upgrades.js';

/**
 * Generate a unique pixel ID
 */
function generatePixelId(): string {
	return `px_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Get upgrade effect value for a specific effect type
 */
function getUpgradeEffectValue(
	upgrades: PurchasedUpgrade[],
	effectType: UpgradeEffectType,
	upgradeDefinitions: Map<string, { effectType: UpgradeEffectType; effectValue: number }>
): number {
	let total = 1;

	for (const purchased of upgrades) {
		const definition = upgradeDefinitions.get(purchased.upgradeId);
		if (definition && definition.effectType === effectType) {
			total *= Math.pow(definition.effectValue, purchased.level);
		}
	}

	return total;
}

/**
 * Get upgrade level for a specific effect type
 */
function getUpgradeLevel(
	upgrades: PurchasedUpgrade[],
	effectType: UpgradeEffectType,
	upgradeDefinitions: Map<string, { effectType: UpgradeEffectType; effectValue: number }>
): number {
	let totalLevel = 0;

	for (const purchased of upgrades) {
		const definition = upgradeDefinitions.get(purchased.upgradeId);
		if (definition && definition.effectType === effectType) {
			totalLevel += purchased.level;
		}
	}

	return totalLevel;
}

/**
 * Purchase System - handles buying new pixels
 */
export class PurchaseSystem {
	private upgradeDefinitions: Map<string, { effectType: UpgradeEffectType; effectValue: number }>;

	constructor() {
		// Initialize with upgrade definitions from upgrades.ts
		this.upgradeDefinitions = createUpgradeDefinitionsMap();
	}

	/**
	 * Set upgrade definitions for cost calculations
	 */
	setUpgradeDefinitions(
		definitions: Map<string, { effectType: UpgradeEffectType; effectValue: number }>
	): void {
		this.upgradeDefinitions = definitions;
	}

	/**
	 * Calculate the cost for the next pixel purchase
	 */
	calculatePixelCost(state: IdlePixelGameState): number {
		const purchaseCount = state.stats.pixelsPurchased;

		// Get cost reduction from upgrades (e.g., 0.9 = 10% reduction)
		const costReduction = getUpgradeEffectValue(
			state.upgrades,
			'reduce_pixel_cost',
			this.upgradeDefinitions
		);

		// Base cost with exponential scaling
		const baseCost = BALANCE.PIXEL_BASE_COST * Math.pow(BALANCE.PIXEL_COST_MULTIPLIER, purchaseCount);

		// Apply cost reduction
		return Math.floor(baseCost * costReduction);
	}

	/**
	 * Get the starting color level for new pixels
	 * Can be increased with upgrades
	 */
	getNewPixelColorLevel(state: IdlePixelGameState): number {
		const baseLevel = 0; // Black
		const upgradeBonus = getUpgradeLevel(
			state.upgrades,
			'increase_base_pixel_level',
			this.upgradeDefinitions
		);

		// Cap at max color level
		return Math.min(baseLevel + upgradeBonus, BALANCE.MAX_COLOR_LEVEL);
	}

	/**
	 * Find a pixel with matching color level for immediate merge
	 * Returns the position of the matching pixel, or null if none found
	 */
	findMergeablePixel(state: IdlePixelGameState, colorLevel: number): number | null {
		for (const slot of state.grid) {
			if (slot.unlocked && slot.pixel && slot.pixel.colorLevel === colorLevel) {
				return slot.position;
			}
		}
		return null;
	}

	/**
	 * Check if a pixel can be purchased
	 * Allows purchase when grid is full if immediate merge is possible
	 */
	canPurchasePixel(state: IdlePixelGameState): {
		canPurchase: boolean;
		reason: 'ok' | 'no_currency' | 'no_space' | 'merge_available';
		cost: number;
	} {
		const cost = this.calculatePixelCost(state);
		const hasEmptySpace = gridSystem.findFirstEmptySlot(state.grid) !== null;

		// Check for empty space first
		if (!hasEmptySpace) {
			// Grid is full - check if immediate merge is possible
			const newPixelLevel = this.getNewPixelColorLevel(state);
			const mergeTarget = this.findMergeablePixel(state, newPixelLevel);

			if (mergeTarget === null) {
				// No empty space AND no merge possible
				return { canPurchase: false, reason: 'no_space', cost };
			}

			// Merge is possible - check currency
			if (state.currency < cost) {
				return { canPurchase: false, reason: 'no_currency', cost };
			}

			// Can purchase with immediate merge
			return { canPurchase: true, reason: 'merge_available', cost };
		}

		if (state.currency < cost) {
			return { canPurchase: false, reason: 'no_currency', cost };
		}

		return { canPurchase: true, reason: 'ok', cost };
	}

	/**
	 * Purchase a new pixel and place it on the grid
	 * Handles immediate merge when grid is full but merge is possible
	 * @returns Updated state and merge info, or null if purchase failed
	 */
	purchasePixel(state: IdlePixelGameState): {
		newState: IdlePixelGameState;
		mergedImmediately: boolean;
		newColorLevel: number;
	} | null {
		const { canPurchase, reason, cost } = this.canPurchasePixel(state);

		if (!canPurchase) {
			return null;
		}

		const colorLevel = this.getNewPixelColorLevel(state);

		// Handle immediate merge case (grid is full)
		if (reason === 'merge_available') {
			const mergeTargetPos = this.findMergeablePixel(state, colorLevel);
			if (mergeTargetPos === null) {
				return null;
			}

			// Perform immediate merge - upgrade the existing pixel
			const mergedLevel = Math.min(colorLevel + 1, BALANCE.MAX_COLOR_LEVEL);
			const mergedPixel: IdlePixel = {
				id: generatePixelId(),
				colorLevel: mergedLevel,
				position: mergeTargetPos,
				baseProduction: getProductionForLevel(mergedLevel)
			};

			const newGrid = [...state.grid];
			newGrid[mergeTargetPos] = {
				...newGrid[mergeTargetPos],
				pixel: mergedPixel
			};

			// Track highest color level
			const newHighestLevel = Math.max(
				state.stats.highestColorLevel,
				mergedLevel
			);

			const newState: IdlePixelGameState = {
				...state,
				currency: state.currency - cost,
				grid: newGrid,
				stats: {
					...state.stats,
					pixelsPurchased: state.stats.pixelsPurchased + 1,
					mergesPerformed: state.stats.mergesPerformed + 1,
					highestColorLevel: newHighestLevel
				}
			};

			return {
				newState,
				mergedImmediately: true,
				newColorLevel: mergedLevel
			};
		}

		// Normal purchase - find empty slot
		const emptySlot = gridSystem.findFirstEmptySlot(state.grid);
		if (emptySlot === null) {
			return null;
		}

		// Create new pixel
		const newPixel: IdlePixel = {
			id: generatePixelId(),
			colorLevel,
			position: emptySlot,
			baseProduction: getProductionForLevel(colorLevel)
		};

		// Update grid
		const newGrid = [...state.grid];
		newGrid[emptySlot] = {
			...newGrid[emptySlot],
			pixel: newPixel
		};

		return {
			newState: {
				...state,
				currency: state.currency - cost,
				grid: newGrid,
				stats: {
					...state.stats,
					pixelsPurchased: state.stats.pixelsPurchased + 1
				}
			},
			mergedImmediately: false,
			newColorLevel: colorLevel
		};
	}

	/**
	 * Get purchase info for UI display
	 */
	getPurchaseInfo(state: IdlePixelGameState): {
		cost: number;
		canAfford: boolean;
		hasSpace: boolean;
		canMergeImmediately: boolean;
		newColorLevel: number;
		productionGain: number;
	} {
		const cost = this.calculatePixelCost(state);
		const hasEmptySpace = gridSystem.findFirstEmptySlot(state.grid) !== null;
		const canAfford = state.currency >= cost;
		const newColorLevel = this.getNewPixelColorLevel(state);
		const productionGain = getProductionForLevel(newColorLevel);

		// Check if merge is possible when grid is full
		const canMergeImmediately = !hasEmptySpace &&
			this.findMergeablePixel(state, newColorLevel) !== null;

		return {
			cost,
			canAfford,
			hasSpace: hasEmptySpace || canMergeImmediately,
			canMergeImmediately,
			newColorLevel,
			productionGain
		};
	}

	/**
	 * Calculate how many pixels can be bought with current currency
	 */
	getMaxPurchaseablePixels(state: IdlePixelGameState): number {
		let count = 0;
		let simulatedCurrency = state.currency;
		let simulatedPurchases = state.stats.pixelsPurchased;

		// Get available slots
		const emptySlots = gridSystem.getEmptySlotCount(state.grid);

		while (count < emptySlots) {
			const cost = Math.floor(
				BALANCE.PIXEL_BASE_COST * Math.pow(BALANCE.PIXEL_COST_MULTIPLIER, simulatedPurchases)
			);

			if (simulatedCurrency < cost) break;

			simulatedCurrency -= cost;
			simulatedPurchases++;
			count++;
		}

		return count;
	}

	/**
	 * Buy the maximum number of pixels possible
	 * @returns Updated state and count of pixels bought
	 */
	purchaseMaxPixels(state: IdlePixelGameState): {
		newState: IdlePixelGameState;
		pixelsBought: number;
		mergesPerformed: number;
	} {
		let currentState = state;
		let pixelsBought = 0;
		let mergesPerformed = 0;

		while (true) {
			const result = this.purchasePixel(currentState);
			if (!result) break;

			currentState = result.newState;
			pixelsBought++;
			if (result.mergedImmediately) {
				mergesPerformed++;
			}

			// Safety limit
			if (pixelsBought > 100) break;
		}

		return {
			newState: currentState,
			pixelsBought,
			mergesPerformed
		};
	}
}

// Singleton instance
export const purchaseSystem = new PurchaseSystem();
