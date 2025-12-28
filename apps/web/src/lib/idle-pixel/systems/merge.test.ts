// apps/web/src/lib/idle-pixel/systems/merge.test.ts
// Unit tests for MergeSystem

import { describe, it, expect, beforeEach } from 'vitest';
import { MergeSystem, getMaxAutoMergeLevel } from './merge.js';
import type { IdlePixelGameState } from '@spritebox/types';
import { getProductionForLevel, GRID_START_POSITIONS, MAX_COLOR_LEVEL, BALANCE } from '@spritebox/types';

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

function addPixel(
	state: IdlePixelGameState,
	position: number,
	colorLevel: number
): IdlePixelGameState {
	const newGrid = [...state.grid];
	newGrid[position] = {
		...newGrid[position],
		pixel: {
			id: `test_${position}_${colorLevel}`,
			colorLevel,
			position,
			baseProduction: getProductionForLevel(colorLevel)
		}
	};
	return { ...state, grid: newGrid };
}

describe('MergeSystem', () => {
	let mergeSystem: MergeSystem;

	beforeEach(() => {
		mergeSystem = new MergeSystem();
	});

	describe('checkAndPerformMerges', () => {
		it('should not merge with no pixels', () => {
			const state = createTestState();
			const result = mergeSystem.checkAndPerformMerges(state);

			expect(result.hasMerges).toBe(false);
			expect(result.animations).toHaveLength(0);
		});

		it('should not merge with single pixel', () => {
			let state = createTestState();
			state = addPixel(state, 27, 0);

			const result = mergeSystem.checkAndPerformMerges(state);

			expect(result.hasMerges).toBe(false);
			expect(result.animations).toHaveLength(0);
		});

		it('should not merge pixels with different color levels', () => {
			let state = createTestState();
			state = addPixel(state, 27, 0);
			state = addPixel(state, 28, 1);

			const result = mergeSystem.checkAndPerformMerges(state);

			expect(result.hasMerges).toBe(false);
		});

		it('should merge two pixels with same color level', () => {
			let state = createTestState();
			state = addPixel(state, 27, 0);
			state = addPixel(state, 28, 0);

			const result = mergeSystem.checkAndPerformMerges(state);

			expect(result.hasMerges).toBe(true);
			expect(result.animations).toHaveLength(1);
			expect(result.newState.stats.mergesPerformed).toBe(1);

			// Check merged pixel
			const mergedPixel = result.newState.grid[27].pixel;
			expect(mergedPixel).not.toBeNull();
			expect(mergedPixel?.colorLevel).toBe(1); // 0 + 1 = 1

			// Check empty slot
			expect(result.newState.grid[28].pixel).toBeNull();
		});

		it('should perform chain merges', () => {
			let state = createTestState();
			// Add 4 black pixels -> should merge to 2 brown -> 1 red
			state = addPixel(state, 27, 0);
			state = addPixel(state, 28, 0);
			state = addPixel(state, 35, 0);
			state = addPixel(state, 36, 0);

			const result = mergeSystem.checkAndPerformMerges(state);

			expect(result.hasMerges).toBe(true);
			// 4 -> 2 (first round) -> 1 (second round) = 3 merges total
			expect(result.newState.stats.mergesPerformed).toBe(3);
			expect(result.newState.stats.highestColorLevel).toBe(2); // Red
		});

		it('should update highestColorLevel stat', () => {
			let state = createTestState();
			state = addPixel(state, 27, 5);
			state = addPixel(state, 28, 5);

			const result = mergeSystem.checkAndPerformMerges(state);

			expect(result.newState.stats.highestColorLevel).toBe(6);
		});

		it('should cap at MAX_COLOR_LEVEL', () => {
			let state = createTestState();
			state = addPixel(state, 27, MAX_COLOR_LEVEL);
			state = addPixel(state, 28, MAX_COLOR_LEVEL);

			const result = mergeSystem.checkAndPerformMerges(state);

			// Max level pixels should not merge
			expect(result.hasMerges).toBe(false);
		});

		it('should create proper animation data', () => {
			let state = createTestState();
			state = addPixel(state, 27, 3);
			state = addPixel(state, 28, 3);

			const result = mergeSystem.checkAndPerformMerges(state);

			const animation = result.animations[0];
			expect(animation.fromPositions).toContain(27);
			expect(animation.fromPositions).toContain(28);
			expect(animation.toPosition).toBe(27); // Lower position
			expect(animation.newColorLevel).toBe(4);
			expect(animation.duration).toBe(mergeSystem.MERGE_DURATION);
		});
	});

	describe('merge bonus', () => {
		it('should apply merge bonus to production', () => {
			mergeSystem.setMergeBonus(1.5);

			let state = createTestState();
			state = addPixel(state, 27, 0);
			state = addPixel(state, 28, 0);

			const result = mergeSystem.checkAndPerformMerges(state);
			const mergedPixel = result.newState.grid[27].pixel;

			// Level 1 production = 3, with 1.5x bonus = 4.5
			expect(mergedPixel?.baseProduction).toBe(getProductionForLevel(1) * 1.5);
		});
	});

	describe('animation management', () => {
		it('should track active animations', () => {
			const animation = {
				fromPositions: [27, 28] as [number, number],
				toPosition: 27,
				newColorLevel: 1,
				startTime: Date.now(),
				duration: 300,
				id: 'test_anim'
			};

			mergeSystem.addAnimations([animation]);
			expect(mergeSystem.hasAnimations()).toBe(true);
			expect(mergeSystem.getActiveAnimations()).toHaveLength(1);
		});

		it('should remove completed animations', () => {
			const animation = {
				fromPositions: [27, 28] as [number, number],
				toPosition: 27,
				newColorLevel: 1,
				startTime: Date.now() - 500, // Started 500ms ago
				duration: 300, // Duration is 300ms
				id: 'test_anim'
			};

			mergeSystem.addAnimations([animation]);
			const completed = mergeSystem.updateAnimations();

			expect(completed).toContain('test_anim');
			expect(mergeSystem.hasAnimations()).toBe(false);
		});

		it('should calculate animation progress', () => {
			const now = Date.now();
			const animation = {
				fromPositions: [27, 28] as [number, number],
				toPosition: 27,
				newColorLevel: 1,
				startTime: now - 150, // Started 150ms ago
				duration: 300, // Duration is 300ms
				id: 'test_anim'
			};

			mergeSystem.addAnimations([animation]);
			const progress = mergeSystem.getAnimationProgress('test_anim');

			// Should be around 0.5 (150/300)
			expect(progress).toBeGreaterThan(0.4);
			expect(progress).toBeLessThan(0.6);
		});

		it('should clear all animations', () => {
			mergeSystem.addAnimations([
				{
					fromPositions: [27, 28],
					toPosition: 27,
					newColorLevel: 1,
					startTime: Date.now(),
					duration: 300,
					id: 'test1'
				},
				{
					fromPositions: [35, 36],
					toPosition: 35,
					newColorLevel: 1,
					startTime: Date.now(),
					duration: 300,
					id: 'test2'
				}
			]);

			mergeSystem.clearAnimations();
			expect(mergeSystem.hasAnimations()).toBe(false);
		});
	});
});

describe('getMaxAutoMergeLevel', () => {
	it('should return DEFAULT_MAX_MERGE_LEVEL (7) for no upgrades', () => {
		const state = createTestState();
		expect(getMaxAutoMergeLevel(state)).toBe(BALANCE.DEFAULT_MAX_MERGE_LEVEL); // 7
	});

	it('should return 8 with unlock_merge_8 upgrade', () => {
		const state = createTestState({
			upgrades: [{ upgradeId: 'unlock_merge_8', level: 1, lastPurchased: Date.now() }]
		});
		expect(getMaxAutoMergeLevel(state)).toBe(8);
	});

	it('should return 9 with unlock_merge_8 and unlock_merge_9 upgrades', () => {
		const state = createTestState({
			upgrades: [
				{ upgradeId: 'unlock_merge_8', level: 1, lastPurchased: Date.now() },
				{ upgradeId: 'unlock_merge_9', level: 1, lastPurchased: Date.now() }
			]
		});
		expect(getMaxAutoMergeLevel(state)).toBe(9);
	});

	it('should return 10 with all currency merge unlocks', () => {
		const state = createTestState({
			upgrades: [
				{ upgradeId: 'unlock_merge_8', level: 1, lastPurchased: Date.now() },
				{ upgradeId: 'unlock_merge_9', level: 1, lastPurchased: Date.now() },
				{ upgradeId: 'unlock_merge_10', level: 1, lastPurchased: Date.now() }
			]
		});
		expect(getMaxAutoMergeLevel(state)).toBe(10);
	});

	it('should add prestige merge unlock levels', () => {
		const state = createTestState({
			upgrades: [
				{ upgradeId: 'unlock_merge_8', level: 1, lastPurchased: Date.now() },
				{ upgradeId: 'unlock_merge_9', level: 1, lastPurchased: Date.now() },
				{ upgradeId: 'unlock_merge_10', level: 1, lastPurchased: Date.now() }
			],
			prestige: {
				prestigeCount: 1,
				prismaPixels: 50,
				totalPrismaEarned: 100,
				prestigeUpgrades: [{ upgradeId: 'prisma_merge_unlock', level: 2 }],
				lifetimeHighestColorLevel: 0
			}
		});
		// 10 from currency upgrades + 2 from prestige = 12
		expect(getMaxAutoMergeLevel(state)).toBe(12);
	});

	it('should cap at MAX_COLOR_LEVEL (14)', () => {
		const state = createTestState({
			upgrades: [
				{ upgradeId: 'unlock_merge_8', level: 1, lastPurchased: Date.now() },
				{ upgradeId: 'unlock_merge_9', level: 1, lastPurchased: Date.now() },
				{ upgradeId: 'unlock_merge_10', level: 1, lastPurchased: Date.now() }
			],
			prestige: {
				prestigeCount: 5,
				prismaPixels: 100,
				totalPrismaEarned: 200,
				prestigeUpgrades: [{ upgradeId: 'prisma_merge_unlock', level: 10 }], // Over max
				lifetimeHighestColorLevel: 0
			}
		});
		// 10 + 10 would be 20, but capped at 14
		expect(getMaxAutoMergeLevel(state)).toBe(MAX_COLOR_LEVEL); // 14
	});

	it('should require unlock_merge_8 before 9 or 10 count', () => {
		// Only has unlock_merge_9 but not 8 - should still be 7
		const state = createTestState({
			upgrades: [{ upgradeId: 'unlock_merge_9', level: 1, lastPurchased: Date.now() }]
		});
		// Since we check sequentially, having 9 without 8 won't work
		expect(getMaxAutoMergeLevel(state)).toBe(BALANCE.DEFAULT_MAX_MERGE_LEVEL);
	});
});
