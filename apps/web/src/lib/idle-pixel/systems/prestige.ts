// apps/web/src/lib/idle-pixel/systems/prestige.ts
// Prestige System - handles meta-progression with Prisma-Pixels

import type {
	IdlePixelGameState,
	PrestigeUpgradeDefinition,
	UpgradeEffectType,
	GridSlot,
	IdlePixel
} from '@spritebox/types';
import {
	calculatePrestigeGain,
	currencyForPrisma,
	createInitialPrestigeState,
	getProductionForLevel,
	GRID_START_POSITIONS,
	BALANCE
} from '@spritebox/types';

// Cast for use with .includes()
const START_POSITIONS: readonly number[] = GRID_START_POSITIONS;

/**
 * Prestige-Upgrade-Definitionen
 * These permanent upgrades are purchased with Prisma-Pixels
 * Balance values (prismaCostPerLevel, effectValue, maxLevel) are imported from BALANCE.PRESTIGE_UPGRADES
 * Structure values (id, nameKey, effectType, icon) are defined here
 */
export const PRESTIGE_UPGRADE_DEFINITIONS: PrestigeUpgradeDefinition[] = [
	{
		id: 'prisma_production',
		nameKey: 'idlePixel.prestige.upgrades.production.name',
		descriptionKey: 'idlePixel.prestige.upgrades.production.description',
		prismaCost: BALANCE.PRESTIGE_UPGRADES.prisma_production.prismaCostPerLevel,
		effectType: 'multiply_production',
		effectValue: BALANCE.PRESTIGE_UPGRADES.prisma_production.effectValue,
		maxLevel: BALANCE.PRESTIGE_UPGRADES.prisma_production.maxLevel,
		icon: '💎'
	},
	{
		id: 'prisma_start_currency',
		nameKey: 'idlePixel.prestige.upgrades.startCurrency.name',
		descriptionKey: 'idlePixel.prestige.upgrades.startCurrency.description',
		prismaCost: BALANCE.PRESTIGE_UPGRADES.prisma_start_currency.prismaCostPerLevel,
		effectType: 'start_currency_bonus',
		effectValue: BALANCE.PRESTIGE_UPGRADES.prisma_start_currency.effectValue,
		maxLevel: BALANCE.PRESTIGE_UPGRADES.prisma_start_currency.maxLevel,
		icon: '🎁'
	},
	{
		id: 'prisma_unlock_slots',
		nameKey: 'idlePixel.prestige.upgrades.unlockSlots.name',
		descriptionKey: 'idlePixel.prestige.upgrades.unlockSlots.description',
		prismaCost: BALANCE.PRESTIGE_UPGRADES.prisma_unlock_slots.prismaCostPerLevel,
		effectType: 'start_unlocked_slots',
		effectValue: BALANCE.PRESTIGE_UPGRADES.prisma_unlock_slots.effectValue,
		maxLevel: BALANCE.PRESTIGE_UPGRADES.prisma_unlock_slots.maxLevel,
		icon: '📐'
	},
	{
		id: 'prisma_golden_bonus',
		nameKey: 'idlePixel.prestige.upgrades.goldenBonus.name',
		descriptionKey: 'idlePixel.prestige.upgrades.goldenBonus.description',
		prismaCost: BALANCE.PRESTIGE_UPGRADES.prisma_golden_bonus.prismaCostPerLevel,
		effectType: 'golden_pixel_value',
		effectValue: BALANCE.PRESTIGE_UPGRADES.prisma_golden_bonus.effectValue,
		maxLevel: BALANCE.PRESTIGE_UPGRADES.prisma_golden_bonus.maxLevel,
		icon: '⭐'
	},
	{
		id: 'prisma_base_pixel',
		nameKey: 'idlePixel.prestige.upgrades.basePixel.name',
		descriptionKey: 'idlePixel.prestige.upgrades.basePixel.description',
		prismaCost: BALANCE.PRESTIGE_UPGRADES.prisma_base_pixel.prismaCostPerLevel,
		effectType: 'increase_base_pixel_level',
		effectValue: BALANCE.PRESTIGE_UPGRADES.prisma_base_pixel.effectValue,
		maxLevel: BALANCE.PRESTIGE_UPGRADES.prisma_base_pixel.maxLevel,
		icon: '⬆️'
	},
	{
		id: 'prisma_merge_unlock',
		nameKey: 'idlePixel.prestige.upgrades.mergeUnlock.name',
		descriptionKey: 'idlePixel.prestige.upgrades.mergeUnlock.description',
		prismaCost: BALANCE.PRISMA_MERGE_UNLOCK_COST,
		effectType: 'prisma_merge_unlock',
		effectValue: 1, // +1 max merge level per level (11, 12, 13, 14)
		maxLevel: 4, // Up to level 14 (10 + 4)
		icon: '🔗'
	}
];

export const PRESTIGE_UPGRADES_BY_ID = new Map(
	PRESTIGE_UPGRADE_DEFINITIONS.map((u) => [u.id, u])
);

/**
 * Spiral order for unlocking grid slots (center outward)
 * This determines which slots get unlocked with prestige bonuses
 */
const SLOT_UNLOCK_ORDER: number[] = [
	// Ring 0: 2x2 center (start positions)
	27, 28, 35, 36,
	// Ring 1: surrounding the center
	19, 20, 26, 29, 34, 37, 43, 44,
	// Ring 2: next ring out
	10, 11, 12, 18, 21, 25, 30, 33, 38, 42, 45, 51, 52, 53,
	// Ring 3: outer ring
	1, 2, 3, 4, 9, 13, 17, 22, 24, 31, 32, 39, 41, 46, 50, 54, 58, 59, 60, 61,
	// Ring 4: edges (corners last)
	0, 5, 6, 7, 8, 14, 15, 16, 23, 40, 47, 48, 49, 55, 56, 57, 62, 63
];

/**
 * PrestigeEngine - manages prestige mechanics
 */
export class PrestigeEngine {
	/**
	 * Check if prestige is available
	 */
	canPrestige(state: IdlePixelGameState): boolean {
		const potentialGain = calculatePrestigeGain(state.stats.totalEarned);
		return potentialGain > 0;
	}

	/**
	 * Get the current prisma gain if prestige is performed now
	 */
	getPrestigeGain(state: IdlePixelGameState): number {
		return calculatePrestigeGain(state.stats.totalEarned);
	}

	/**
	 * Get currency needed until the next prisma
	 */
	getCurrencyToNextPrisma(state: IdlePixelGameState): number {
		const currentPrisma = calculatePrestigeGain(state.stats.totalEarned);
		const nextPrismaRequirement = currencyForPrisma(currentPrisma + 1);
		return Math.max(0, nextPrismaRequirement - state.stats.totalEarned);
	}

	/**
	 * Get progress percentage to next prisma (0-100)
	 */
	getProgressToNextPrisma(state: IdlePixelGameState): number {
		const currentPrisma = calculatePrestigeGain(state.stats.totalEarned);
		const currentThreshold = currencyForPrisma(currentPrisma);
		const nextThreshold = currencyForPrisma(currentPrisma + 1);

		if (nextThreshold <= currentThreshold) return 100;

		const progress = (state.stats.totalEarned - currentThreshold) / (nextThreshold - currentThreshold);
		return Math.min(100, Math.max(0, progress * 100));
	}

	/**
	 * Perform prestige - reset game with prisma rewards
	 */
	performPrestige(state: IdlePixelGameState): IdlePixelGameState {
		const prismaGain = this.getPrestigeGain(state);

		if (prismaGain <= 0) {
			throw new Error('Cannot prestige without earning prisma');
		}

		// Create fresh game state
		const now = Date.now();

		// Get starting bonuses from prestige upgrades
		const startCurrency = this.getStartCurrency(state.prestige);
		const bonusSlots = this.getStartBonusSlots(state.prestige);
		const startPixelLevel = this.getStartPixelLevel(state.prestige);

		// Create starting pixel with upgraded level
		const startPixel: IdlePixel = {
			id: `px_prestige_${now}`,
			colorLevel: startPixelLevel,
			position: 27,
			baseProduction: getProductionForLevel(startPixelLevel)
		};

		// Create empty 8x8 grid
		const grid: GridSlot[] = Array.from({ length: 64 }, (_, i) => ({
			position: i,
			unlocked: START_POSITIONS.includes(i),
			pixel: i === 27 ? startPixel : null
		}));

		// Unlock bonus slots
		const slotsToUnlock = SLOT_UNLOCK_ORDER.slice(0, 4 + bonusSlots);
		for (const pos of slotsToUnlock) {
			grid[pos] = { ...grid[pos], unlocked: true };
		}

		return {
			currency: startCurrency,
			grid,
			upgrades: [],
			stats: {
				totalEarned: 0,
				pixelsPurchased: 0,
				mergesPerformed: 0,
				highestColorLevel: startPixelLevel,
				totalClicks: 0,
				playTime: 0
			},
			clicker: {
				energyBarCurrent: 0,
				energyBarMax: BALANCE.ENERGY_BASE_CAPACITY,
				goldenPixelNextSpawn: now + BALANCE.GOLDEN_BASE_INTERVAL_MS,
				goldenPixelActive: false,
				goldenPixelTimeLeft: 0
			},
			prestige: {
				prestigeCount: state.prestige.prestigeCount + 1,
				prismaPixels: state.prestige.prismaPixels + prismaGain,
				totalPrismaEarned: state.prestige.totalPrismaEarned + prismaGain,
				prestigeUpgrades: [...state.prestige.prestigeUpgrades],
				lifetimeHighestColorLevel: Math.max(
					state.prestige.lifetimeHighestColorLevel,
					state.stats.highestColorLevel
				)
			},
			lastSaved: now,
			lastTick: now
		};
	}

	/**
	 * Get starting currency from prestige upgrades
	 */
	private getStartCurrency(prestige: IdlePixelGameState['prestige']): number {
		const upgrade = prestige.prestigeUpgrades.find(
			(u) => u.upgradeId === 'prisma_start_currency'
		);
		const level = upgrade?.level ?? 0;
		return level * BALANCE.PRESTIGE_START_CURRENCY_PER_LEVEL;
	}

	/**
	 * Get bonus starting slots from prestige upgrades
	 */
	private getStartBonusSlots(prestige: IdlePixelGameState['prestige']): number {
		const upgrade = prestige.prestigeUpgrades.find(
			(u) => u.upgradeId === 'prisma_unlock_slots'
		);
		const level = upgrade?.level ?? 0;
		return level * BALANCE.PRESTIGE_SLOTS_PER_LEVEL;
	}

	/**
	 * Get starting pixel level from prestige upgrades
	 */
	private getStartPixelLevel(prestige: IdlePixelGameState['prestige']): number {
		const upgrade = prestige.prestigeUpgrades.find(
			(u) => u.upgradeId === 'prisma_base_pixel'
		);
		return upgrade?.level ?? 0;
	}

	/**
	 * Purchase a prestige upgrade
	 */
	purchasePrestigeUpgrade(
		state: IdlePixelGameState,
		upgradeId: string
	): IdlePixelGameState | null {
		const definition = PRESTIGE_UPGRADES_BY_ID.get(upgradeId);
		if (!definition) return null;

		const currentLevel = this.getPrestigeUpgradeLevel(state, upgradeId);

		// Already maxed?
		if (currentLevel >= definition.maxLevel) return null;

		// Calculate cost (scales with level)
		const cost = definition.prismaCost * (currentLevel + 1);

		// Can afford?
		if (state.prestige.prismaPixels < cost) return null;

		// Purchase the upgrade
		const existingIndex = state.prestige.prestigeUpgrades.findIndex(
			(u) => u.upgradeId === upgradeId
		);

		const newUpgrades = [...state.prestige.prestigeUpgrades];

		if (existingIndex >= 0) {
			newUpgrades[existingIndex] = {
				...newUpgrades[existingIndex],
				level: currentLevel + 1
			};
		} else {
			newUpgrades.push({ upgradeId, level: 1 });
		}

		return {
			...state,
			prestige: {
				...state.prestige,
				prismaPixels: state.prestige.prismaPixels - cost,
				prestigeUpgrades: newUpgrades
			}
		};
	}

	/**
	 * Get the current level of a prestige upgrade
	 */
	getPrestigeUpgradeLevel(state: IdlePixelGameState, upgradeId: string): number {
		const upgrade = state.prestige.prestigeUpgrades.find(
			(u) => u.upgradeId === upgradeId
		);
		return upgrade?.level ?? 0;
	}

	/**
	 * Get purchase info for a prestige upgrade
	 */
	getPrestigeUpgradeInfo(
		state: IdlePixelGameState,
		upgradeId: string
	): {
		definition: PrestigeUpgradeDefinition | undefined;
		currentLevel: number;
		cost: number;
		canAfford: boolean;
		isMaxed: boolean;
		currentEffect: number;
		nextEffect: number;
	} {
		const definition = PRESTIGE_UPGRADES_BY_ID.get(upgradeId);
		if (!definition) {
			return {
				definition: undefined,
				currentLevel: 0,
				cost: 0,
				canAfford: false,
				isMaxed: false,
				currentEffect: 0,
				nextEffect: 0
			};
		}

		const currentLevel = this.getPrestigeUpgradeLevel(state, upgradeId);
		const cost = definition.prismaCost * (currentLevel + 1);
		const isMaxed = currentLevel >= definition.maxLevel;
		const canAfford = state.prestige.prismaPixels >= cost && !isMaxed;

		// Calculate effects based on effectType
		let currentEffect: number;
		let nextEffect: number;

		if (definition.effectType === 'multiply_production') {
			currentEffect = Math.pow(definition.effectValue, currentLevel);
			nextEffect = Math.pow(definition.effectValue, currentLevel + 1);
		} else if (definition.effectType === 'golden_pixel_value') {
			currentEffect = Math.pow(definition.effectValue, currentLevel);
			nextEffect = Math.pow(definition.effectValue, currentLevel + 1);
		} else {
			// Additive effects
			currentEffect = definition.effectValue * currentLevel;
			nextEffect = definition.effectValue * (currentLevel + 1);
		}

		return {
			definition,
			currentLevel,
			cost,
			canAfford,
			isMaxed,
			currentEffect,
			nextEffect
		};
	}

	/**
	 * Get all prestige upgrade info for UI
	 */
	getAllPrestigeUpgradesInfo(state: IdlePixelGameState) {
		return PRESTIGE_UPGRADE_DEFINITIONS.map((def) =>
			this.getPrestigeUpgradeInfo(state, def.id)
		);
	}

	/**
	 * Get production multiplier from prestige upgrades
	 * This is applied on top of the prestige count bonus
	 */
	getPrestigeProductionMultiplier(state: IdlePixelGameState): number {
		const upgrade = state.prestige.prestigeUpgrades.find(
			(u) => u.upgradeId === 'prisma_production'
		);
		const level = upgrade?.level ?? 0;
		return Math.pow(BALANCE.PRESTIGE_PRODUCTION_BASE, level);
	}

	/**
	 * Get golden pixel value multiplier from prestige upgrades
	 */
	getGoldenPixelMultiplier(state: IdlePixelGameState): number {
		const upgrade = state.prestige.prestigeUpgrades.find(
			(u) => u.upgradeId === 'prisma_golden_bonus'
		);
		const level = upgrade?.level ?? 0;
		return Math.pow(BALANCE.PRESTIGE_GOLDEN_BASE, level);
	}

	/**
	 * Get total production multiplier (prestige count + prestige upgrades)
	 */
	getTotalPrestigeMultiplier(state: IdlePixelGameState): number {
		// Base prestige bonus: +10% per prestige count
		const prestigeCountMultiplier = Math.pow(BALANCE.PRESTIGE_COUNT_MULTIPLIER, state.prestige.prestigeCount);
		// Upgrade bonus from prestige upgrades
		const upgradeMultiplier = this.getPrestigeProductionMultiplier(state);

		return prestigeCountMultiplier * upgradeMultiplier;
	}

	/**
	 * Check if a prestige upgrade can be purchased
	 */
	canPurchasePrestigeUpgrade(
		state: IdlePixelGameState,
		upgradeId: string
	): { canBuy: boolean; reason?: string } {
		const definition = PRESTIGE_UPGRADES_BY_ID.get(upgradeId);

		if (!definition) {
			return { canBuy: false, reason: 'Upgrade not found' };
		}

		const currentLevel = this.getPrestigeUpgradeLevel(state, upgradeId);

		if (currentLevel >= definition.maxLevel) {
			return { canBuy: false, reason: 'Max level reached' };
		}

		const cost = definition.prismaCost * (currentLevel + 1);

		if (state.prestige.prismaPixels < cost) {
			return { canBuy: false, reason: 'Not enough prisma' };
		}

		return { canBuy: true };
	}
}

// Singleton instance
export const prestigeEngine = new PrestigeEngine();

// Re-export utility functions
export { calculatePrestigeGain, currencyForPrisma, createInitialPrestigeState };
