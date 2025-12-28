// apps/web/src/lib/idle-pixel/systems/grid.test.ts
// Unit tests for GridSystem

import { describe, it, expect, beforeEach } from 'vitest';
import { GridSystem } from './grid.js';
import type { IdlePixelGameState, GridSlot } from '@spritebox/types';
import { GRID_START_POSITIONS, GRID_TOTAL_SLOTS, calculateSlotCost } from '@spritebox/types';

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

describe('GridSystem', () => {
	let gridSystem: GridSystem;

	beforeEach(() => {
		gridSystem = new GridSystem();
	});

	describe('createInitialGrid', () => {
		it('should create 64 slots', () => {
			const grid = gridSystem.createInitialGrid();
			expect(grid).toHaveLength(GRID_TOTAL_SLOTS);
		});

		it('should unlock start positions', () => {
			const grid = gridSystem.createInitialGrid();

			for (const pos of GRID_START_POSITIONS) {
				expect(grid[pos].unlocked).toBe(true);
			}
		});

		it('should keep other positions locked', () => {
			const grid = gridSystem.createInitialGrid();

			for (let i = 0; i < 64; i++) {
				if (!START_POSITIONS.includes(i)) {
					expect(grid[i].unlocked).toBe(false);
				}
			}
		});

		it('should have no pixels initially', () => {
			const grid = gridSystem.createInitialGrid();

			for (const slot of grid) {
				expect(slot.pixel).toBeNull();
			}
		});
	});

	describe('slot counting', () => {
		it('should count unlocked slots', () => {
			const state = createTestState();
			expect(gridSystem.getUnlockedCount(state.grid)).toBe(GRID_START_POSITIONS.length);
		});

		it('should count pixels', () => {
			const state = createTestState();
			state.grid[27].pixel = {
				id: 'test',
				colorLevel: 0,
				position: 27,
				baseProduction: 1
			};

			expect(gridSystem.getPixelCount(state.grid)).toBe(1);
		});

		it('should count empty slots', () => {
			const state = createTestState();
			state.grid[27].pixel = {
				id: 'test',
				colorLevel: 0,
				position: 27,
				baseProduction: 1
			};

			// 4 start positions, 1 has a pixel = 3 empty
			expect(gridSystem.getEmptySlotCount(state.grid)).toBe(3);
		});
	});

	describe('findFirstEmptySlot', () => {
		it('should find first empty unlocked slot', () => {
			const state = createTestState();
			const emptySlot = gridSystem.findFirstEmptySlot(state.grid);

			expect(emptySlot).toBe(27); // First start position
		});

		it('should skip occupied slots', () => {
			const state = createTestState();
			state.grid[27].pixel = {
				id: 'test',
				colorLevel: 0,
				position: 27,
				baseProduction: 1
			};

			const emptySlot = gridSystem.findFirstEmptySlot(state.grid);
			expect(emptySlot).toBe(28); // Second start position
		});

		it('should return null when all slots are full', () => {
			const state = createTestState();

			// Fill all start positions
			for (const pos of GRID_START_POSITIONS) {
				state.grid[pos].pixel = {
					id: `test_${pos}`,
					colorLevel: 0,
					position: pos,
					baseProduction: 1
				};
			}

			const emptySlot = gridSystem.findFirstEmptySlot(state.grid);
			expect(emptySlot).toBeNull();
		});
	});

	describe('getAvailableSlotOptions', () => {
		it('should find slots adjacent to unlocked slots', () => {
			const state = createTestState();
			const options = gridSystem.getAvailableSlotOptions(state.grid);

			expect(options.length).toBeGreaterThan(0);

			// All options should be adjacent to at least one unlocked slot
			for (const option of options) {
				expect(option.adjacentUnlocked.length).toBeGreaterThan(0);
			}
		});

		it('should have same cost for all slots (exponential based on purchased)', () => {
			const state = createTestState();
			const options = gridSystem.getAvailableSlotOptions(state.grid);

			// All slots should have the same cost (first purchase = calculateSlotCost(0))
			const expectedCost = calculateSlotCost(0); // 1000 for first slot
			for (const option of options) {
				expect(option.cost).toBe(expectedCost);
			}
		});

		it('should increase cost after purchasing a slot', () => {
			const state = createTestState({ currency: 10000 });
			const options = gridSystem.getAvailableSlotOptions(state.grid);
			const firstSlot = options[0];

			// Purchase the first slot
			const newState = gridSystem.purchaseSlot(state, firstSlot.position);
			expect(newState).not.toBeNull();

			// Get new options - cost should be higher
			const newOptions = gridSystem.getAvailableSlotOptions(newState!.grid);
			const expectedNewCost = calculateSlotCost(1); // 1500 for second slot

			for (const option of newOptions) {
				expect(option.cost).toBe(expectedNewCost);
			}
		});
	});

	describe('purchaseSlot', () => {
		it('should unlock slot when affordable', () => {
			const state = createTestState({ currency: 100_000 });
			const options = gridSystem.getAvailableSlotOptions(state.grid);
			const cheapestOption = options[0];

			const newState = gridSystem.purchaseSlot(state, cheapestOption.position);

			expect(newState).not.toBeNull();
			expect(newState!.grid[cheapestOption.position].unlocked).toBe(true);
			expect(newState!.currency).toBe(100_000 - cheapestOption.cost);
		});

		it('should fail when not enough currency', () => {
			const state = createTestState({ currency: 0 });
			const options = gridSystem.getAvailableSlotOptions(state.grid);

			if (options.length > 0) {
				const newState = gridSystem.purchaseSlot(state, options[0].position);
				expect(newState).toBeNull();
			}
		});

		it('should fail for non-adjacent slot', () => {
			const state = createTestState({ currency: 100000 });

			// Try to unlock corner (not adjacent to start positions)
			const newState = gridSystem.purchaseSlot(state, 0);
			expect(newState).toBeNull();
		});
	});

	describe('grid status', () => {
		it('should detect full grid', () => {
			const state = createTestState();

			// Fill all start positions
			for (const pos of GRID_START_POSITIONS) {
				state.grid[pos].pixel = {
					id: `test_${pos}`,
					colorLevel: 0,
					position: pos,
					baseProduction: 1
				};
			}

			expect(gridSystem.isGridFull(state.grid)).toBe(true);
		});

		it('should detect not full grid', () => {
			const state = createTestState();
			expect(gridSystem.isGridFull(state.grid)).toBe(false);
		});

		it('should detect fully expanded grid', () => {
			const state = createTestState();

			// Unlock all slots
			for (let i = 0; i < 64; i++) {
				state.grid[i].unlocked = true;
			}

			expect(gridSystem.isFullyExpanded(state.grid)).toBe(true);
		});

		it('should calculate expansion progress', () => {
			const state = createTestState();

			// 4 out of 64 = 0.0625
			const progress = gridSystem.getExpansionProgress(state.grid);
			expect(progress).toBeCloseTo(4 / 64, 4);
		});
	});

	describe('getUnlockedBounds', () => {
		it('should calculate correct bounds for start positions', () => {
			const state = createTestState();
			const bounds = gridSystem.getUnlockedBounds(state.grid);

			// Start positions are 27, 28, 35, 36 (2x2 in center)
			// Position 27 = (3, 3), 28 = (4, 3), 35 = (3, 4), 36 = (4, 4)
			expect(bounds.minX).toBe(3);
			expect(bounds.maxX).toBe(4);
			expect(bounds.minY).toBe(3);
			expect(bounds.maxY).toBe(4);
			expect(bounds.centerX).toBe(3.5);
			expect(bounds.centerY).toBe(3.5);
		});
	});
});
