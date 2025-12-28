// apps/web/src/lib/idle-pixel/systems/upgrades.test.ts
// Unit tests for UpgradeEngine

import { describe, it, expect, beforeEach } from 'vitest';
import {
	UpgradeEngine,
	UPGRADE_DEFINITIONS,
	UPGRADES_BY_ID,
	getUpgradesByCategory,
	createUpgradeDefinitionsMap
} from './upgrades.js';
import type { IdlePixelGameState } from '@spritebox/types';
import { getProductionForLevel, GRID_START_POSITIONS } from '@spritebox/types';

// Cast for use with .includes()
const START_POSITIONS: readonly number[] = GRID_START_POSITIONS;

function createTestState(overrides?: Partial<IdlePixelGameState>): IdlePixelGameState {
	const grid = Array.from({ length: 64 }, (_, i) => ({
		position: i,
		unlocked: START_POSITIONS.includes(i),
		pixel: null
	}));

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
			goldenPixelNextSpawn: Date.now() + 60000,
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
		lastSaved: Date.now(),
		lastTick: Date.now(),
		...overrides
	};
}

describe('Upgrade Definitions', () => {
	it('should have 8 upgrades defined (5 base + 3 merge unlock)', () => {
		expect(UPGRADE_DEFINITIONS.length).toBe(8);
	});

	it('should have all required upgrades', () => {
		const ids = UPGRADE_DEFINITIONS.map((u) => u.id);
		// Base upgrades
		expect(ids).toContain('prod_multiplier');
		expect(ids).toContain('cheaper_pixels');
		expect(ids).toContain('better_pixels');
		expect(ids).toContain('energy_capacity');
		expect(ids).toContain('golden_frequency');
		// Merge unlock upgrades
		expect(ids).toContain('unlock_merge_8');
		expect(ids).toContain('unlock_merge_9');
		expect(ids).toContain('unlock_merge_10');
	});

	it('should populate UPGRADES_BY_ID map', () => {
		expect(UPGRADES_BY_ID.size).toBe(8);
		expect(UPGRADES_BY_ID.get('prod_multiplier')).toBeDefined();
		expect(UPGRADES_BY_ID.get('unlock_merge_8')).toBeDefined();
	});

	it('should group upgrades by category', () => {
		const groups = getUpgradesByCategory();
		expect(groups.production.length).toBe(1);
		expect(groups.economy.length).toBe(5); // 2 base + 3 merge unlock
		expect(groups.clicker.length).toBe(2);
		expect(groups.grid.length).toBe(0);
	});
});

describe('UpgradeEngine', () => {
	let engine: UpgradeEngine;

	beforeEach(() => {
		engine = new UpgradeEngine();
	});

	describe('getLevel', () => {
		it('should return 0 for unpurchased upgrade', () => {
			const state = createTestState();
			expect(engine.getLevel(state, 'prod_multiplier')).toBe(0);
		});

		it('should return correct level for purchased upgrade', () => {
			const state = createTestState({
				upgrades: [{ upgradeId: 'prod_multiplier', level: 3, lastPurchased: Date.now() }]
			});
			expect(engine.getLevel(state, 'prod_multiplier')).toBe(3);
		});
	});

	describe('getCost', () => {
		it('should return base cost for level 0', () => {
			const state = createTestState();
			const def = UPGRADES_BY_ID.get('prod_multiplier')!;
			expect(engine.getCost(state, 'prod_multiplier')).toBe(def.baseCost);
		});

		it('should scale cost exponentially', () => {
			const state = createTestState({
				upgrades: [{ upgradeId: 'prod_multiplier', level: 1, lastPurchased: Date.now() }]
			});
			const def = UPGRADES_BY_ID.get('prod_multiplier')!;
			// Cost for level 2: baseCost * multiplier^1 = 100 * 2 = 200
			expect(engine.getCost(state, 'prod_multiplier')).toBe(Math.floor(def.baseCost * def.costMultiplier));
		});

		it('should return Infinity for unknown upgrade', () => {
			const state = createTestState();
			expect(engine.getCost(state, 'unknown_upgrade')).toBe(Infinity);
		});
	});

	describe('canPurchase', () => {
		it('should allow purchase with sufficient currency', () => {
			const state = createTestState({ currency: 1000 });
			const result = engine.canPurchase(state, 'prod_multiplier');
			expect(result.canBuy).toBe(true);
		});

		it('should deny purchase with insufficient currency', () => {
			const state = createTestState({ currency: 10 });
			const result = engine.canPurchase(state, 'prod_multiplier');
			expect(result.canBuy).toBe(false);
			expect(result.reasonKey).toBe('idlePixel.upgrades.errors.notEnough');
		});

		it('should deny purchase at max level', () => {
			const def = UPGRADES_BY_ID.get('cheaper_pixels')!;
			const state = createTestState({
				currency: 1e12,
				upgrades: [{ upgradeId: 'cheaper_pixels', level: def.maxLevel, lastPurchased: Date.now() }]
			});
			const result = engine.canPurchase(state, 'cheaper_pixels');
			expect(result.canBuy).toBe(false);
			expect(result.reasonKey).toBe('idlePixel.upgrades.errors.maxReached');
		});

		it('should return false for unknown upgrade', () => {
			const state = createTestState({ currency: 1000 });
			const result = engine.canPurchase(state, 'unknown_upgrade');
			expect(result.canBuy).toBe(false);
		});
	});

	describe('purchase', () => {
		it('should purchase upgrade and deduct currency', () => {
			const state = createTestState({ currency: 1000 });
			const cost = engine.getCost(state, 'prod_multiplier');
			const newState = engine.purchase(state, 'prod_multiplier');

			expect(newState).not.toBeNull();
			expect(newState!.currency).toBe(1000 - cost);
			expect(newState!.upgrades.length).toBe(1);
			expect(newState!.upgrades[0].upgradeId).toBe('prod_multiplier');
			expect(newState!.upgrades[0].level).toBe(1);
		});

		it('should increment level on subsequent purchases', () => {
			let state = createTestState({ currency: 10000 });
			state = engine.purchase(state, 'prod_multiplier')!;
			state = { ...state, currency: 10000 }; // Refill for test
			state = engine.purchase(state, 'prod_multiplier')!;

			expect(state.upgrades[0].level).toBe(2);
		});

		it('should return null when cannot afford', () => {
			const state = createTestState({ currency: 1 });
			const newState = engine.purchase(state, 'prod_multiplier');
			expect(newState).toBeNull();
		});
	});

	describe('calculateEffect', () => {
		it('should return 1 for no upgrades (multiplicative)', () => {
			const state = createTestState();
			const effect = engine.calculateEffect(state, 'multiply_production');
			expect(effect).toBe(1);
		});

		it('should calculate multiplicative effect correctly', () => {
			const state = createTestState({
				upgrades: [{ upgradeId: 'prod_multiplier', level: 2, lastPurchased: Date.now() }]
			});
			const def = UPGRADES_BY_ID.get('prod_multiplier')!;
			// Effect: effectValue^level = 1.25^2 = 1.5625
			const effect = engine.calculateEffect(state, 'multiply_production');
			expect(effect).toBeCloseTo(Math.pow(def.effectValue, 2), 4);
		});

		it('should calculate additive effect correctly', () => {
			const state = createTestState({
				upgrades: [{ upgradeId: 'better_pixels', level: 3, lastPurchased: Date.now() }]
			});
			// Additive: effectValue * level = 1 * 3 = 3
			const effect = engine.calculateEffect(state, 'increase_base_pixel_level');
			expect(effect).toBe(3);
		});

		it('should ignore unrelated effect types', () => {
			const state = createTestState({
				upgrades: [{ upgradeId: 'prod_multiplier', level: 5, lastPurchased: Date.now() }]
			});
			// prod_multiplier is multiply_production, not reduce_pixel_cost
			const effect = engine.calculateEffect(state, 'reduce_pixel_cost');
			expect(effect).toBe(1);
		});
	});

	describe('getUpgradeInfo', () => {
		it('should provide complete info for upgrade', () => {
			const state = createTestState({ currency: 500 });
			const info = engine.getUpgradeInfo(state, 'prod_multiplier');

			expect(info.definition).toBeDefined();
			expect(info.currentLevel).toBe(0);
			expect(info.cost).toBe(100); // Base cost
			expect(info.canAfford).toBe(true);
			expect(info.canBuy).toBe(true);
			expect(info.isMaxed).toBe(false);
		});

		it('should show upgrade as maxed when at max level', () => {
			const def = UPGRADES_BY_ID.get('cheaper_pixels')!;
			const state = createTestState({
				currency: 1e12,
				upgrades: [{ upgradeId: 'cheaper_pixels', level: def.maxLevel, lastPurchased: Date.now() }]
			});
			const info = engine.getUpgradeInfo(state, 'cheaper_pixels');

			expect(info.isMaxed).toBe(true);
			expect(info.canBuy).toBe(false);
		});
	});

	describe('getAllUpgradesInfo', () => {
		it('should return info for all upgrades', () => {
			const state = createTestState({ currency: 1000 });
			const allInfo = engine.getAllUpgradesInfo(state);

			expect(allInfo.length).toBe(UPGRADE_DEFINITIONS.length);
			allInfo.forEach((info) => {
				expect(info.definition).toBeDefined();
			});
		});
	});
});

describe('createUpgradeDefinitionsMap', () => {
	it('should create a map with all upgrades', () => {
		const map = createUpgradeDefinitionsMap();
		expect(map.size).toBe(UPGRADE_DEFINITIONS.length);
	});

	it('should contain effectType and effectValue for each upgrade', () => {
		const map = createUpgradeDefinitionsMap();
		const prodMultiplier = map.get('prod_multiplier');

		expect(prodMultiplier).toBeDefined();
		expect(prodMultiplier!.effectType).toBe('multiply_production');
		expect(prodMultiplier!.effectValue).toBe(1.25);
	});
});
