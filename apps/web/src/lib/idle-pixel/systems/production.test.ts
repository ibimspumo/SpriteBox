// apps/web/src/lib/idle-pixel/systems/production.test.ts
// Unit tests for ProductionSystem

import { describe, it, expect, beforeEach } from 'vitest';
import { ProductionSystem } from './production.js';
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

describe('ProductionSystem', () => {
	let productionSystem: ProductionSystem;

	beforeEach(() => {
		productionSystem = new ProductionSystem();
	});

	describe('getBaseProduction', () => {
		it('should return 0 for empty grid', () => {
			const state = createTestState();
			expect(productionSystem.getBaseProduction(state)).toBe(0);
		});

		it('should return correct production for single pixel', () => {
			const state = createTestState();
			state.grid[27].pixel = {
				id: 'test1',
				colorLevel: 0,
				position: 27,
				baseProduction: getProductionForLevel(0)
			};

			expect(productionSystem.getBaseProduction(state)).toBe(1);
		});

		it('should sum production from multiple pixels', () => {
			const state = createTestState();

			// Add pixel level 0 (production = 1)
			state.grid[27].pixel = {
				id: 'test1',
				colorLevel: 0,
				position: 27,
				baseProduction: getProductionForLevel(0)
			};

			// Add pixel level 1 (production = 3)
			state.grid[28].pixel = {
				id: 'test2',
				colorLevel: 1,
				position: 28,
				baseProduction: getProductionForLevel(1)
			};

			expect(productionSystem.getBaseProduction(state)).toBe(4); // 1 + 3
		});
	});

	describe('calculateProduction', () => {
		it('should return 0 for empty grid', () => {
			const state = createTestState();
			expect(productionSystem.calculateProduction(state, 1)).toBe(0);
		});

		it('should calculate production over time', () => {
			const state = createTestState();
			state.grid[27].pixel = {
				id: 'test1',
				colorLevel: 0,
				position: 27,
				baseProduction: 1
			};

			// 1 production/sec * 5 seconds = 5
			expect(productionSystem.calculateProduction(state, 5)).toBe(5);
		});

		it('should handle fractional time', () => {
			const state = createTestState();
			state.grid[27].pixel = {
				id: 'test1',
				colorLevel: 0,
				position: 27,
				baseProduction: 10
			};

			// 10 production/sec * 0.5 seconds = 5
			expect(productionSystem.calculateProduction(state, 0.5)).toBe(5);
		});
	});

	describe('applyProduction', () => {
		it('should update currency and stats', () => {
			const state = createTestState({ currency: 100 });
			state.grid[27].pixel = {
				id: 'test1',
				colorLevel: 0,
				position: 27,
				baseProduction: 10
			};

			const newState = productionSystem.applyProduction(state, 1);

			expect(newState.currency).toBe(110); // 100 + 10
			expect(newState.stats.totalEarned).toBe(10);
			expect(newState.stats.playTime).toBe(1);
		});

		it('should not modify state with 0 production', () => {
			const state = createTestState({ currency: 100 });
			const newState = productionSystem.applyProduction(state, 1);

			expect(newState).toBe(state); // Same reference, no changes
		});
	});

	describe('getProductionBreakdown', () => {
		it('should provide detailed breakdown', () => {
			const state = createTestState();
			state.grid[27].pixel = {
				id: 'test1',
				colorLevel: 2,
				position: 27,
				baseProduction: getProductionForLevel(2) // 9
			};

			const breakdown = productionSystem.getProductionBreakdown(state);

			expect(breakdown.baseProduction).toBe(9);
			expect(breakdown.upgradeMultiplier).toBe(1);
			expect(breakdown.prestigeMultiplier).toBe(1);
			expect(breakdown.pixelCount).toBe(1);
			expect(breakdown.highestColorLevel).toBe(2);
			// Color bonus: 1 + (2 * 0.05 * 1) = 1.1
			expect(breakdown.colorBonus).toBeCloseTo(1.1, 2);
			// Total: 9 * 1 * 1.1 * 1 = 9.9
			expect(breakdown.totalPerSecond).toBeCloseTo(9.9, 2);
		});
	});

	describe('prestige multiplier', () => {
		it('should apply prestige bonus', () => {
			const state = createTestState();
			state.prestige.prestigeCount = 1;
			state.grid[27].pixel = {
				id: 'test1',
				colorLevel: 0,
				position: 27,
				baseProduction: 10
			};

			const breakdown = productionSystem.getProductionBreakdown(state);

			// With 1 prestige: 10 * 1.1 = 11
			expect(breakdown.prestigeMultiplier).toBeCloseTo(1.1, 2);
		});

		it('should compound prestige bonus', () => {
			const state = createTestState();
			state.prestige.prestigeCount = 3;
			state.grid[27].pixel = {
				id: 'test1',
				colorLevel: 0,
				position: 27,
				baseProduction: 10
			};

			const breakdown = productionSystem.getProductionBreakdown(state);

			// With 3 prestiges: 1.1^3 = 1.331
			expect(breakdown.prestigeMultiplier).toBeCloseTo(1.331, 2);
		});
	});
});
