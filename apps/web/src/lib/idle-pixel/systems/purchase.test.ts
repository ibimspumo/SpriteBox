// apps/web/src/lib/idle-pixel/systems/purchase.test.ts
// Unit tests for PurchaseSystem

import { describe, it, expect, beforeEach } from 'vitest';
import { PurchaseSystem } from './purchase.js';
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

describe('PurchaseSystem', () => {
	let purchaseSystem: PurchaseSystem;

	beforeEach(() => {
		purchaseSystem = new PurchaseSystem();
	});

	describe('calculatePixelCost', () => {
		it('should return base cost for first pixel', () => {
			const state = createTestState();
			const cost = purchaseSystem.calculatePixelCost(state);

			expect(cost).toBe(10); // Base cost
		});

		it('should increase cost exponentially', () => {
			const state = createTestState();
			state.stats.pixelsPurchased = 10;

			const cost = purchaseSystem.calculatePixelCost(state);

			// 10 * 1.15^10 ≈ 40.45 -> floor = 40
			expect(cost).toBeGreaterThan(10);
			expect(cost).toBeLessThan(50);
		});

		it('should handle many purchases', () => {
			const state = createTestState();
			state.stats.pixelsPurchased = 100;

			const cost = purchaseSystem.calculatePixelCost(state);

			// Should be significantly higher
			expect(cost).toBeGreaterThan(100000);
		});
	});

	describe('canPurchasePixel', () => {
		it('should allow purchase with enough currency and space', () => {
			const state = createTestState({ currency: 100 });

			const result = purchaseSystem.canPurchasePixel(state);

			expect(result.canPurchase).toBe(true);
			expect(result.reason).toBe('ok');
		});

		it('should deny purchase without enough currency', () => {
			const state = createTestState({ currency: 5 });

			const result = purchaseSystem.canPurchasePixel(state);

			expect(result.canPurchase).toBe(false);
			expect(result.reason).toBe('no_currency');
		});

		it('should deny purchase without space when no merge possible', () => {
			const state = createTestState({ currency: 1000 });

			// Fill all slots with different color levels (no merge possible)
			GRID_START_POSITIONS.forEach((pos, index) => {
				state.grid[pos].pixel = {
					id: `test_${pos}`,
					colorLevel: index + 1, // Different levels: 1, 2, 3, 4
					position: pos,
					baseProduction: 1
				};
			});

			const result = purchaseSystem.canPurchasePixel(state);

			expect(result.canPurchase).toBe(false);
			expect(result.reason).toBe('no_space');
		});

		it('should allow purchase with full grid when merge is possible', () => {
			const state = createTestState({ currency: 1000 });

			// Fill all slots with level 0 (same as new pixel, merge possible)
			for (const pos of GRID_START_POSITIONS) {
				state.grid[pos].pixel = {
					id: `test_${pos}`,
					colorLevel: 0, // Same level as new pixel
					position: pos,
					baseProduction: 1
				};
			}

			const result = purchaseSystem.canPurchasePixel(state);

			expect(result.canPurchase).toBe(true);
			expect(result.reason).toBe('merge_available');
		});
	});

	describe('purchasePixel', () => {
		it('should create pixel and update state', () => {
			const state = createTestState({ currency: 100 });

			const result = purchaseSystem.purchasePixel(state);

			expect(result).not.toBeNull();
			expect(result!.newState.currency).toBe(90); // 100 - 10
			expect(result!.newState.stats.pixelsPurchased).toBe(1);
			expect(result!.mergedImmediately).toBe(false);

			// Check pixel was placed
			const placedPixel = result!.newState.grid[27].pixel;
			expect(placedPixel).not.toBeNull();
			expect(placedPixel!.colorLevel).toBe(0);
			expect(placedPixel!.baseProduction).toBe(getProductionForLevel(0));
		});

		it('should return null when cannot purchase', () => {
			const state = createTestState({ currency: 5 });

			const result = purchaseSystem.purchasePixel(state);

			expect(result).toBeNull();
		});

		it('should place pixel in first empty slot', () => {
			const state = createTestState({ currency: 100 });

			// Fill first slot
			state.grid[27].pixel = {
				id: 'existing',
				colorLevel: 0,
				position: 27,
				baseProduction: 1
			};

			const result = purchaseSystem.purchasePixel(state);

			expect(result).not.toBeNull();
			// Should be placed in position 28 (second start position)
			expect(result!.newState.grid[28].pixel).not.toBeNull();
		});

		it('should perform immediate merge when grid is full', () => {
			const state = createTestState({ currency: 100 });

			// Fill all slots with level 0 (same as new pixel)
			for (const pos of GRID_START_POSITIONS) {
				state.grid[pos].pixel = {
					id: `test_${pos}`,
					colorLevel: 0,
					position: pos,
					baseProduction: 1
				};
			}

			const result = purchaseSystem.purchasePixel(state);

			expect(result).not.toBeNull();
			expect(result!.mergedImmediately).toBe(true);
			expect(result!.newColorLevel).toBe(1); // Merged to level 1
			expect(result!.newState.stats.mergesPerformed).toBe(1);

			// One pixel should now be level 1
			const level1Pixels = result!.newState.grid.filter(
				slot => slot.pixel?.colorLevel === 1
			);
			expect(level1Pixels.length).toBe(1);
		});
	});

	describe('getNewPixelColorLevel', () => {
		it('should return 0 by default', () => {
			const state = createTestState();
			const level = purchaseSystem.getNewPixelColorLevel(state);

			expect(level).toBe(0);
		});

		// Upgrade-based tests would go here once upgrades are implemented
	});

	describe('getPurchaseInfo', () => {
		it('should provide purchase details', () => {
			const state = createTestState({ currency: 50 });

			const info = purchaseSystem.getPurchaseInfo(state);

			expect(info.cost).toBe(10);
			expect(info.canAfford).toBe(true);
			expect(info.hasSpace).toBe(true);
			expect(info.canMergeImmediately).toBe(false);
			expect(info.newColorLevel).toBe(0);
			expect(info.productionGain).toBe(getProductionForLevel(0));
		});

		it('should indicate merge is possible when grid is full', () => {
			const state = createTestState({ currency: 50 });

			// Fill all slots with level 0
			for (const pos of GRID_START_POSITIONS) {
				state.grid[pos].pixel = {
					id: `test_${pos}`,
					colorLevel: 0,
					position: pos,
					baseProduction: 1
				};
			}

			const info = purchaseSystem.getPurchaseInfo(state);

			expect(info.hasSpace).toBe(true); // Still true because merge is possible
			expect(info.canMergeImmediately).toBe(true);
		});
	});

	describe('getMaxPurchaseablePixels', () => {
		it('should calculate max purchaseable with limited currency', () => {
			// With 100 currency, can buy:
			// 1st: 10, 2nd: 11.5, 3rd: 13.2, etc.
			// 10 + 11 + 13 + 15 + 17 = 66 (5 pixels)
			// 10 + 11 + 13 + 15 + 17 + 20 = 86 (6 pixels)
			// 10 + 11 + 13 + 15 + 17 + 20 + 23 = 109 (would need 109, but only have 100)
			const state = createTestState({ currency: 100 });

			const max = purchaseSystem.getMaxPurchaseablePixels(state);

			expect(max).toBeGreaterThanOrEqual(4);
			expect(max).toBeLessThanOrEqual(8);
		});

		it('should be limited by available slots', () => {
			const state = createTestState({ currency: 1000000 });

			// Only 4 start positions available
			const max = purchaseSystem.getMaxPurchaseablePixels(state);

			expect(max).toBe(4);
		});
	});

	describe('purchaseMaxPixels', () => {
		it('should buy multiple pixels', () => {
			const state = createTestState({ currency: 100 });

			const result = purchaseSystem.purchaseMaxPixels(state);

			expect(result.pixelsBought).toBeGreaterThan(0);
			expect(result.newState.stats.pixelsPurchased).toBe(result.pixelsBought);
		});

		it('should stop when out of currency', () => {
			const state = createTestState({ currency: 15 });

			const result = purchaseSystem.purchaseMaxPixels(state);

			expect(result.pixelsBought).toBe(1); // Can only afford 1 at 10 currency
			expect(result.newState.currency).toBe(5); // 15 - 10
		});

		it('should stop when out of space and no merge possible', () => {
			const state = createTestState({ currency: 1000000 });

			// Pre-fill one slot with a high-level pixel that can't merge with new pixels
			state.grid[27].pixel = {
				id: 'high_level',
				colorLevel: 10,
				position: 27,
				baseProduction: 1
			};

			const result = purchaseSystem.purchaseMaxPixels(state);

			// Should fill remaining 3 start positions, then continue merging until no match
			// With 3 level 0 pixels: merge 2 into level 1, then merge with the third into level 2
			// Then buy more level 0 to merge... this continues for a while
			// Eventually stops when currency runs out or no more merges possible
			expect(result.pixelsBought).toBeGreaterThan(3);
			expect(result.mergesPerformed).toBeGreaterThan(0);
		});

		it('should handle merges when grid fills up', () => {
			const state = createTestState({ currency: 100 });

			const result = purchaseSystem.purchaseMaxPixels(state);

			// With 100 currency, should buy several pixels and possibly merge some
			expect(result.pixelsBought).toBeGreaterThan(0);
			// Total count = pixelsBought - mergesPerformed + original pixels
			const finalPixelCount = result.newState.grid.filter(s => s.pixel !== null).length;
			expect(finalPixelCount).toBeGreaterThan(0);
		});
	});
});
