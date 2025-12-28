// apps/web/src/lib/idle-pixel/systems/upgrades.ts
// Upgrade System - dynamic, data-driven upgrade management

import type {
	IdlePixelGameState,
	UpgradeDefinition,
	UpgradeCategory,
	UpgradeEffectType,
	PurchasedUpgrade
} from '@spritebox/types';
import { calculateUpgradeCost, calculateUpgradeEffect, BALANCE } from '@spritebox/types';

// ============================================
// UPGRADE DEFINITIONS (5 Base Upgrades)
// ============================================

/**
 * All available upgrades
 * Balance values (baseCost, costMultiplier, effectValue, maxLevel) are imported from BALANCE
 * Structure values (id, nameKey, category, effectType, icon) are defined here
 */
export const UPGRADE_DEFINITIONS: UpgradeDefinition[] = [
	// ═══════════════════════════════════════════════════════════
	// PRODUCTION
	// ═══════════════════════════════════════════════════════════
	{
		id: 'prod_multiplier',
		nameKey: 'idlePixel.upgrades.prodMultiplier.name',
		descriptionKey: 'idlePixel.upgrades.prodMultiplier.description',
		category: 'production',
		effectType: 'multiply_production',
		...BALANCE.UPGRADES.prod_multiplier,
		icon: '⚡'
	},

	// ═══════════════════════════════════════════════════════════
	// ECONOMY
	// ═══════════════════════════════════════════════════════════
	{
		id: 'cheaper_pixels',
		nameKey: 'idlePixel.upgrades.cheaperPixels.name',
		descriptionKey: 'idlePixel.upgrades.cheaperPixels.description',
		category: 'economy',
		effectType: 'reduce_pixel_cost',
		...BALANCE.UPGRADES.cheaper_pixels,
		icon: '💰'
	},

	{
		id: 'better_pixels',
		nameKey: 'idlePixel.upgrades.betterPixels.name',
		descriptionKey: 'idlePixel.upgrades.betterPixels.description',
		category: 'economy',
		effectType: 'increase_base_pixel_level',
		...BALANCE.UPGRADES.better_pixels,
		icon: '⬆️'
	},

	// ═══════════════════════════════════════════════════════════
	// CLICKER
	// ═══════════════════════════════════════════════════════════
	{
		id: 'energy_capacity',
		nameKey: 'idlePixel.upgrades.energyCapacity.name',
		descriptionKey: 'idlePixel.upgrades.energyCapacity.description',
		category: 'clicker',
		effectType: 'energy_bar_capacity',
		...BALANCE.UPGRADES.energy_capacity,
		icon: '🔋'
	},

	{
		id: 'golden_frequency',
		nameKey: 'idlePixel.upgrades.goldenFrequency.name',
		descriptionKey: 'idlePixel.upgrades.goldenFrequency.description',
		category: 'clicker',
		effectType: 'golden_pixel_frequency',
		...BALANCE.UPGRADES.golden_frequency,
		icon: '⭐'
	},

	// ═══════════════════════════════════════════════════════════════
	// MERGE UNLOCK (Economy)
	// Level 1-7 are free, 8-10 require currency upgrades
	// ═══════════════════════════════════════════════════════════════
	{
		id: 'unlock_merge_8',
		nameKey: 'idlePixel.upgrades.mergeUnlock8.name',
		descriptionKey: 'idlePixel.upgrades.mergeUnlock8.description',
		category: 'economy',
		effectType: 'unlock_auto_merge_level',
		effectValue: 8,
		baseCost: BALANCE.MERGE_UNLOCK_COSTS[8],
		costMultiplier: 1,
		maxLevel: 1,
		icon: '8️⃣'
	},

	{
		id: 'unlock_merge_9',
		nameKey: 'idlePixel.upgrades.mergeUnlock9.name',
		descriptionKey: 'idlePixel.upgrades.mergeUnlock9.description',
		category: 'economy',
		effectType: 'unlock_auto_merge_level',
		effectValue: 9,
		baseCost: BALANCE.MERGE_UNLOCK_COSTS[9],
		costMultiplier: 1,
		maxLevel: 1,
		requires: 'unlock_merge_8',
		icon: '9️⃣'
	},

	{
		id: 'unlock_merge_10',
		nameKey: 'idlePixel.upgrades.mergeUnlock10.name',
		descriptionKey: 'idlePixel.upgrades.mergeUnlock10.description',
		category: 'economy',
		effectType: 'unlock_auto_merge_level',
		effectValue: 10,
		baseCost: BALANCE.MERGE_UNLOCK_COSTS[10],
		costMultiplier: 1,
		maxLevel: 1,
		requires: 'unlock_merge_9',
		icon: '🔟'
	}
];

/**
 * Quick access by ID
 */
export const UPGRADES_BY_ID = new Map<string, UpgradeDefinition>(
	UPGRADE_DEFINITIONS.map((u) => [u.id, u])
);

/**
 * Get upgrades grouped by category
 */
export function getUpgradesByCategory(): Record<UpgradeCategory, UpgradeDefinition[]> {
	const groups: Record<UpgradeCategory, UpgradeDefinition[]> = {
		production: [],
		economy: [],
		grid: [],
		clicker: []
	};

	for (const def of UPGRADE_DEFINITIONS) {
		groups[def.category].push(def);
	}

	return groups;
}

// ============================================
// UPGRADE ENGINE
// ============================================

/**
 * Upgrade management and calculation
 */
export class UpgradeEngine {
	/**
	 * Get the current level of an upgrade
	 */
	getLevel(state: IdlePixelGameState, upgradeId: string): number {
		const purchased = state.upgrades.find((u) => u.upgradeId === upgradeId);
		return purchased?.level ?? 0;
	}

	/**
	 * Calculate the purchase cost for the next level
	 */
	getCost(state: IdlePixelGameState, upgradeId: string): number {
		const definition = UPGRADES_BY_ID.get(upgradeId);
		if (!definition) return Infinity;

		const currentLevel = this.getLevel(state, upgradeId);
		return calculateUpgradeCost(definition, currentLevel);
	}

	/**
	 * Check if an upgrade can be purchased
	 */
	canPurchase(
		state: IdlePixelGameState,
		upgradeId: string
	): { canBuy: boolean; reason?: string; reasonKey?: string } {
		const definition = UPGRADES_BY_ID.get(upgradeId);
		if (!definition) {
			return { canBuy: false, reason: 'Upgrade not found', reasonKey: 'idlePixel.upgrades.errors.notFound' };
		}

		const currentLevel = this.getLevel(state, upgradeId);

		// Max level reached?
		if (definition.maxLevel > 0 && currentLevel >= definition.maxLevel) {
			return { canBuy: false, reason: 'Maximum reached', reasonKey: 'idlePixel.upgrades.errors.maxReached' };
		}

		// Requirement fulfilled?
		if (definition.requires) {
			const requiredLevel = this.getLevel(state, definition.requires);
			if (requiredLevel === 0) {
				const requiredDef = UPGRADES_BY_ID.get(definition.requires);
				return {
					canBuy: false,
					reason: `Requires: ${requiredDef?.id ?? definition.requires}`,
					reasonKey: 'idlePixel.upgrades.errors.requiresUpgrade'
				};
			}
		}

		// Enough currency?
		const cost = this.getCost(state, upgradeId);
		if (state.currency < cost) {
			return { canBuy: false, reason: 'Not enough pixels', reasonKey: 'idlePixel.upgrades.errors.notEnough' };
		}

		return { canBuy: true };
	}

	/**
	 * Purchase an upgrade
	 */
	purchase(state: IdlePixelGameState, upgradeId: string): IdlePixelGameState | null {
		const { canBuy } = this.canPurchase(state, upgradeId);
		if (!canBuy) return null;

		const cost = this.getCost(state, upgradeId);
		const currentLevel = this.getLevel(state, upgradeId);

		// Update upgrades list
		const existingIndex = state.upgrades.findIndex((u) => u.upgradeId === upgradeId);
		const newUpgrades = [...state.upgrades];

		if (existingIndex >= 0) {
			newUpgrades[existingIndex] = {
				...newUpgrades[existingIndex],
				level: currentLevel + 1,
				lastPurchased: Date.now()
			};
		} else {
			newUpgrades.push({
				upgradeId,
				level: 1,
				lastPurchased: Date.now()
			});
		}

		return {
			...state,
			currency: state.currency - cost,
			upgrades: newUpgrades
		};
	}

	/**
	 * Calculate the total effect for a specific effect type
	 * Takes into account all upgrades with that effect type
	 */
	calculateEffect(state: IdlePixelGameState, effectType: UpgradeEffectType): number {
		let totalEffect = 1; // Base multiplier for multiplicative effects
		let additiveTotal = 0; // For additive effects

		for (const purchased of state.upgrades) {
			const definition = UPGRADES_BY_ID.get(purchased.upgradeId);
			if (!definition || definition.effectType !== effectType) continue;

			const effect = calculateUpgradeEffect(definition, purchased.level);

			// Determine if this is multiplicative or additive
			if (this.isMultiplicativeEffect(effectType)) {
				totalEffect *= effect;
			} else {
				// For additive effects like increase_base_pixel_level
				additiveTotal += definition.effectValue * purchased.level;
			}
		}

		// Prestige effects (TODO: integrate prestige upgrades)
		totalEffect *= this.getPrestigeEffect(state, effectType);

		return this.isMultiplicativeEffect(effectType) ? totalEffect : additiveTotal;
	}

	/**
	 * Check if an effect type uses multiplicative stacking
	 */
	private isMultiplicativeEffect(effectType: UpgradeEffectType): boolean {
		const multiplicativeTypes: UpgradeEffectType[] = [
			'multiply_production',
			'multiply_color_level',
			'reduce_pixel_cost',
			'energy_bar_capacity',
			'golden_pixel_frequency',
			'golden_pixel_value',
			'click_value'
		];
		return multiplicativeTypes.includes(effectType);
	}

	/**
	 * Get prestige bonus for an effect type
	 */
	private getPrestigeEffect(state: IdlePixelGameState, effectType: UpgradeEffectType): number {
		// TODO: Integrate prestige upgrades in Phase 5
		// For now, return 1 (no bonus)
		return 1;
	}

	/**
	 * Get detailed info about an upgrade for UI display
	 */
	getUpgradeInfo(
		state: IdlePixelGameState,
		upgradeId: string
	): {
		definition: UpgradeDefinition | undefined;
		currentLevel: number;
		cost: number;
		canAfford: boolean;
		canBuy: boolean;
		reason?: string;
		reasonKey?: string;
		isMaxed: boolean;
		currentEffect: number;
		nextEffect: number;
	} {
		const definition = UPGRADES_BY_ID.get(upgradeId);
		const currentLevel = this.getLevel(state, upgradeId);
		const cost = this.getCost(state, upgradeId);
		const { canBuy, reason, reasonKey } = this.canPurchase(state, upgradeId);
		const isMaxed = definition ? definition.maxLevel > 0 && currentLevel >= definition.maxLevel : false;

		// Calculate current and next effect
		const currentEffect = definition ? calculateUpgradeEffect(definition, currentLevel) : 0;
		const nextEffect = definition && !isMaxed ? calculateUpgradeEffect(definition, currentLevel + 1) : currentEffect;

		return {
			definition,
			currentLevel,
			cost,
			canAfford: state.currency >= cost,
			canBuy,
			reason,
			reasonKey,
			isMaxed,
			currentEffect,
			nextEffect
		};
	}

	/**
	 * Get all upgrades info for UI
	 */
	getAllUpgradesInfo(state: IdlePixelGameState): Array<ReturnType<typeof this.getUpgradeInfo>> {
		return UPGRADE_DEFINITIONS.map((def) => this.getUpgradeInfo(state, def.id));
	}
}

// Singleton instance
export const upgradeEngine = new UpgradeEngine();

// ============================================
// HELPER FUNCTIONS FOR SYSTEM INTEGRATION
// ============================================

/**
 * Create upgrade definitions map for production/purchase systems
 */
export function createUpgradeDefinitionsMap(): Map<
	string,
	{ effectType: UpgradeEffectType; effectValue: number }
> {
	const map = new Map<string, { effectType: UpgradeEffectType; effectValue: number }>();

	for (const def of UPGRADE_DEFINITIONS) {
		map.set(def.id, {
			effectType: def.effectType,
			effectValue: def.effectValue
		});
	}

	return map;
}
