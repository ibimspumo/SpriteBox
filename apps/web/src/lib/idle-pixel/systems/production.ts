// apps/web/src/lib/idle-pixel/systems/production.ts
// Production System - calculates currency generation per tick

import type {
	IdlePixelGameState,
	PurchasedUpgrade,
	UpgradeEffectType
} from '@spritebox/types';
import { createUpgradeDefinitionsMap } from './upgrades.js';

/**
 * Get the total value for a specific upgrade effect type
 */
function getUpgradeEffectValue(
	upgrades: PurchasedUpgrade[],
	effectType: UpgradeEffectType,
	upgradeDefinitions: Map<string, { effectType: UpgradeEffectType; effectValue: number }>
): number {
	let total = 1; // Base multiplier

	for (const purchased of upgrades) {
		const definition = upgradeDefinitions.get(purchased.upgradeId);
		if (definition && definition.effectType === effectType) {
			// Multiplicative stacking per level
			total *= Math.pow(definition.effectValue, purchased.level);
		}
	}

	return total;
}

/**
 * Calculate the highest color level among all pixels on the grid
 */
function getHighestColorLevel(state: IdlePixelGameState): number {
	let highest = 0;
	for (const slot of state.grid) {
		if (slot.pixel && slot.pixel.colorLevel > highest) {
			highest = slot.pixel.colorLevel;
		}
	}
	return highest;
}

/**
 * Calculate the color level bonus multiplier
 * +5% per color level, modified by upgrades
 */
function getColorLevelBonus(
	state: IdlePixelGameState,
	upgradeDefinitions: Map<string, { effectType: UpgradeEffectType; effectValue: number }>
): number {
	const highestLevel = getHighestColorLevel(state);
	const upgradeBonus = getUpgradeEffectValue(
		state.upgrades,
		'multiply_color_level',
		upgradeDefinitions
	);
	return 1 + highestLevel * 0.05 * upgradeBonus;
}

/**
 * Calculate prestige multiplier from prestige count and prestige upgrades
 * Base: +10% per prestige level, compounding
 * Plus: 2^level from prisma_production upgrade
 */
function getPrestigeMultiplier(state: IdlePixelGameState): number {
	const prestigeCount = state.prestige.prestigeCount;
	// Each prestige gives +10% multiplicative bonus
	const prestigeCountMultiplier = Math.pow(1.1, prestigeCount);

	// Prestige upgrade bonus: 2^level
	const upgrade = state.prestige.prestigeUpgrades.find(
		(u) => u.upgradeId === 'prisma_production'
	);
	const upgradeLevel = upgrade?.level ?? 0;
	const upgradeMultiplier = Math.pow(2, upgradeLevel);

	return prestigeCountMultiplier * upgradeMultiplier;
}

/**
 * Production System - handles all currency generation calculations
 */
export class ProductionSystem {
	private upgradeDefinitions: Map<string, { effectType: UpgradeEffectType; effectValue: number }>;

	constructor() {
		// Initialize with upgrade definitions from upgrades.ts
		this.upgradeDefinitions = createUpgradeDefinitionsMap();
	}

	/**
	 * Register upgrade definitions for production calculations
	 */
	setUpgradeDefinitions(
		definitions: Map<string, { effectType: UpgradeEffectType; effectValue: number }>
	): void {
		this.upgradeDefinitions = definitions;
	}

	/**
	 * Calculate base production (sum of all pixel base productions)
	 */
	getBaseProduction(state: IdlePixelGameState): number {
		let total = 0;
		for (const slot of state.grid) {
			if (slot.pixel) {
				total += slot.pixel.baseProduction;
			}
		}
		return total;
	}

	/**
	 * Get the global production multiplier from upgrades
	 */
	getUpgradeMultiplier(state: IdlePixelGameState): number {
		return getUpgradeEffectValue(
			state.upgrades,
			'multiply_production',
			this.upgradeDefinitions
		);
	}

	/**
	 * Calculate total production per second
	 */
	getTotalProductionPerSecond(state: IdlePixelGameState): number {
		const baseProduction = this.getBaseProduction(state);

		if (baseProduction === 0) return 0;

		const upgradeMultiplier = this.getUpgradeMultiplier(state);
		const colorBonus = getColorLevelBonus(state, this.upgradeDefinitions);
		const prestigeMultiplier = getPrestigeMultiplier(state);

		return baseProduction * upgradeMultiplier * colorBonus * prestigeMultiplier;
	}

	/**
	 * Calculate production for a time delta
	 * @param state Current game state
	 * @param deltaSeconds Time elapsed in seconds
	 * @returns Amount of currency earned
	 */
	calculateProduction(state: IdlePixelGameState, deltaSeconds: number): number {
		const perSecond = this.getTotalProductionPerSecond(state);
		return perSecond * deltaSeconds;
	}

	/**
	 * Apply production to state and return updated state
	 */
	applyProduction(state: IdlePixelGameState, deltaSeconds: number): IdlePixelGameState {
		const earned = this.calculateProduction(state, deltaSeconds);

		if (earned === 0) return state;

		return {
			...state,
			currency: state.currency + earned,
			stats: {
				...state.stats,
				totalEarned: state.stats.totalEarned + earned,
				playTime: state.stats.playTime + deltaSeconds
			},
			lastTick: Date.now()
		};
	}

	/**
	 * Get detailed production breakdown for UI display
	 */
	getProductionBreakdown(state: IdlePixelGameState): {
		baseProduction: number;
		upgradeMultiplier: number;
		colorBonus: number;
		prestigeMultiplier: number;
		totalPerSecond: number;
		pixelCount: number;
		highestColorLevel: number;
	} {
		const baseProduction = this.getBaseProduction(state);
		const upgradeMultiplier = this.getUpgradeMultiplier(state);
		const colorBonus = getColorLevelBonus(state, this.upgradeDefinitions);
		const prestigeMultiplier = getPrestigeMultiplier(state);

		let pixelCount = 0;
		for (const slot of state.grid) {
			if (slot.pixel) pixelCount++;
		}

		return {
			baseProduction,
			upgradeMultiplier,
			colorBonus,
			prestigeMultiplier,
			totalPerSecond: baseProduction * upgradeMultiplier * colorBonus * prestigeMultiplier,
			pixelCount,
			highestColorLevel: getHighestColorLevel(state)
		};
	}
}

// Singleton instance for easy access
export const productionSystem = new ProductionSystem();
