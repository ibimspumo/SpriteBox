// apps/web/src/lib/idle-pixel/systems/clicker.test.ts
// Unit tests for Clicker Systems (EnergyBar & GoldenPixel)

import { describe, it, expect, beforeEach } from 'vitest';
import { EnergyBarSystem, GoldenPixelSystem, updateClickerSystems } from './clicker.js';
import type { IdlePixelGameState } from '@spritebox/types';
import { GRID_START_POSITIONS, BALANCE } from '@spritebox/types';

// Cast for use with .includes()
const START_POSITIONS: readonly number[] = GRID_START_POSITIONS;

function createTestState(overrides?: Partial<IdlePixelGameState>): IdlePixelGameState {
	const grid = Array.from({ length: 64 }, (_, i) => ({
		position: i,
		unlocked: START_POSITIONS.includes(i),
		pixel: null
	}));

	const now = Date.now();

	return {
		currency: 1000,
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
			goldenPixelNextSpawn: now + 60000,
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
		lastSaved: now,
		lastTick: now,
		...overrides
	};
}

// ============================================
// ENERGY BAR SYSTEM TESTS
// ============================================

describe('EnergyBarSystem', () => {
	let energyBarSystem: EnergyBarSystem;

	beforeEach(() => {
		energyBarSystem = new EnergyBarSystem();
	});

	describe('getMaxCapacity', () => {
		it('should return base capacity without upgrades', () => {
			const state = createTestState();
			expect(energyBarSystem.getMaxCapacity(state)).toBe(BALANCE.ENERGY_BASE_CAPACITY);
		});

		it('should apply upgrade multiplier', () => {
			const state = createTestState({
				upgrades: [
					{ upgradeId: 'energy_capacity', level: 1, lastPurchased: Date.now() }
				]
			});
			// With 1 level of energy_capacity (1.5x): 250 * 1.5 = 375
			const expected = Math.floor(BALANCE.ENERGY_BASE_CAPACITY * BALANCE.UPGRADES.energy_capacity.effectValue);
			expect(energyBarSystem.getMaxCapacity(state)).toBe(expected);
		});

		it('should compound upgrade multiplier', () => {
			const state = createTestState({
				upgrades: [
					{ upgradeId: 'energy_capacity', level: 2, lastPurchased: Date.now() }
				]
			});
			// With 2 levels of energy_capacity (1.5^2): 250 * 2.25 = 562.5 → 562
			const multiplier = Math.pow(BALANCE.UPGRADES.energy_capacity.effectValue, 2);
			const expected = Math.floor(BALANCE.ENERGY_BASE_CAPACITY * multiplier);
			expect(energyBarSystem.getMaxCapacity(state)).toBe(expected);
		});
	});

	describe('getFillRate', () => {
		it('should return configured percentage of production', () => {
			const state = createTestState();
			const productionPerSecond = 100;
			const expected = productionPerSecond * BALANCE.ENERGY_FILL_RATE_PERCENT; // 100 * 0.25 = 25
			expect(energyBarSystem.getFillRate(state, productionPerSecond)).toBe(expected);
		});

		it('should return 0 for 0 production', () => {
			const state = createTestState();
			expect(energyBarSystem.getFillRate(state, 0)).toBe(0);
		});
	});

	describe('update', () => {
		it('should fill energy bar over time', () => {
			const state = createTestState({
				clicker: {
					energyBarCurrent: 0,
					energyBarMax: BALANCE.ENERGY_BASE_CAPACITY,
					goldenPixelNextSpawn: Date.now() + 60000,
					goldenPixelActive: false,
					goldenPixelTimeLeft: 0
				}
			});

			// 100 production/sec * 25% = 25 fill/sec
			// 1 second = 25 energy
			const newState = energyBarSystem.update(state, 1, 100);
			const expectedFill = 100 * BALANCE.ENERGY_FILL_RATE_PERCENT;
			expect(newState.clicker.energyBarCurrent).toBe(expectedFill);
		});

		it('should cap at max capacity', () => {
			const maxCapacity = BALANCE.ENERGY_BASE_CAPACITY;
			const state = createTestState({
				clicker: {
					energyBarCurrent: maxCapacity - 5,
					energyBarMax: maxCapacity,
					goldenPixelNextSpawn: Date.now() + 60000,
					goldenPixelActive: false,
					goldenPixelTimeLeft: 0
				}
			});

			// Try to add more than max
			const newState = energyBarSystem.update(state, 10, 100);

			expect(newState.clicker.energyBarCurrent).toBe(maxCapacity);
		});

		it('should update max capacity based on upgrades', () => {
			const state = createTestState({
				upgrades: [
					{ upgradeId: 'energy_capacity', level: 1, lastPurchased: Date.now() }
				]
			});

			const newState = energyBarSystem.update(state, 1, 100);
			const expectedMax = Math.floor(BALANCE.ENERGY_BASE_CAPACITY * BALANCE.UPGRADES.energy_capacity.effectValue);
			expect(newState.clicker.energyBarMax).toBe(expectedMax);
		});
	});

	describe('harvest', () => {
		it('should convert energy to currency', () => {
			const state = createTestState({
				currency: 1000,
				clicker: {
					energyBarCurrent: 50,
					energyBarMax: 100,
					goldenPixelNextSpawn: Date.now() + 60000,
					goldenPixelActive: false,
					goldenPixelTimeLeft: 0
				}
			});

			const { newState, harvested } = energyBarSystem.harvest(state);

			expect(harvested).toBe(50);
			expect(newState.currency).toBe(1050);
			expect(newState.clicker.energyBarCurrent).toBe(0);
		});

		it('should update stats on harvest', () => {
			const state = createTestState({
				clicker: {
					energyBarCurrent: 50,
					energyBarMax: 100,
					goldenPixelNextSpawn: Date.now() + 60000,
					goldenPixelActive: false,
					goldenPixelTimeLeft: 0
				}
			});

			const { newState } = energyBarSystem.harvest(state);

			expect(newState.stats.totalEarned).toBe(50);
			expect(newState.stats.totalClicks).toBe(1);
		});

		it('should floor fractional energy', () => {
			const state = createTestState({
				clicker: {
					energyBarCurrent: 50.7,
					energyBarMax: 100,
					goldenPixelNextSpawn: Date.now() + 60000,
					goldenPixelActive: false,
					goldenPixelTimeLeft: 0
				}
			});

			const { harvested } = energyBarSystem.harvest(state);

			expect(harvested).toBe(50);
		});

		it('should return 0 if energy is 0', () => {
			const state = createTestState({
				clicker: {
					energyBarCurrent: 0,
					energyBarMax: 100,
					goldenPixelNextSpawn: Date.now() + 60000,
					goldenPixelActive: false,
					goldenPixelTimeLeft: 0
				}
			});

			const { newState, harvested } = energyBarSystem.harvest(state);

			expect(harvested).toBe(0);
			expect(newState).toBe(state); // Same reference
		});
	});

	describe('getFillPercentage', () => {
		it('should calculate correct percentage', () => {
			const state = createTestState({
				clicker: {
					energyBarCurrent: 75,
					energyBarMax: 100,
					goldenPixelNextSpawn: Date.now() + 60000,
					goldenPixelActive: false,
					goldenPixelTimeLeft: 0
				}
			});

			expect(energyBarSystem.getFillPercentage(state)).toBe(75);
		});

		it('should return 0 for max of 0', () => {
			const state = createTestState({
				clicker: {
					energyBarCurrent: 0,
					energyBarMax: 0,
					goldenPixelNextSpawn: Date.now() + 60000,
					goldenPixelActive: false,
					goldenPixelTimeLeft: 0
				}
			});

			expect(energyBarSystem.getFillPercentage(state)).toBe(0);
		});
	});
});

// ============================================
// GOLDEN PIXEL SYSTEM TESTS
// ============================================

describe('GoldenPixelSystem', () => {
	let goldenPixelSystem: GoldenPixelSystem;

	beforeEach(() => {
		goldenPixelSystem = new GoldenPixelSystem();
	});

	describe('getSpawnInterval', () => {
		it('should return base interval without upgrades', () => {
			const state = createTestState();
			expect(goldenPixelSystem.getSpawnInterval(state)).toBe(60000);
		});

		it('should apply upgrade multiplier', () => {
			const state = createTestState({
				upgrades: [
					{ upgradeId: 'golden_frequency', level: 1, lastPurchased: Date.now() }
				]
			});
			// With 1 level of golden_frequency (0.85x): 60000 * 0.85 = 51000
			expect(goldenPixelSystem.getSpawnInterval(state)).toBe(51000);
		});
	});

	describe('getBonusValue', () => {
		it('should return base multiplier of production without upgrades', () => {
			const state = createTestState();
			const productionPerSecond = 100;
			const expected = productionPerSecond * BALANCE.GOLDEN_BASE_MULTIPLIER; // 100 * 30 = 3000
			expect(goldenPixelSystem.getBonusValue(state, productionPerSecond)).toBe(expected);
		});

		it('should return 0 for 0 production', () => {
			const state = createTestState();
			expect(goldenPixelSystem.getBonusValue(state, 0)).toBe(0);
		});
	});

	describe('update', () => {
		it('should spawn golden pixel when time reaches', () => {
			const now = Date.now();
			const state = createTestState({
				clicker: {
					energyBarCurrent: 0,
					energyBarMax: 100,
					goldenPixelNextSpawn: now - 1000, // Already past spawn time
					goldenPixelActive: false,
					goldenPixelTimeLeft: 0
				},
				lastTick: now
			});

			const newState = goldenPixelSystem.update(state, now);

			expect(newState.clicker.goldenPixelActive).toBe(true);
			expect(newState.clicker.goldenPixelTimeLeft).toBe(4000);
		});

		it('should decrement time while active', () => {
			const now = Date.now();
			const state = createTestState({
				clicker: {
					energyBarCurrent: 0,
					energyBarMax: 100,
					goldenPixelNextSpawn: now + 60000,
					goldenPixelActive: true,
					goldenPixelTimeLeft: 3000
				},
				lastTick: now - 500 // 500ms ago
			});

			const newState = goldenPixelSystem.update(state, now);

			expect(newState.clicker.goldenPixelActive).toBe(true);
			expect(newState.clicker.goldenPixelTimeLeft).toBe(2500);
		});

		it('should deactivate when time expires', () => {
			const now = Date.now();
			const state = createTestState({
				clicker: {
					energyBarCurrent: 0,
					energyBarMax: 100,
					goldenPixelNextSpawn: now + 60000,
					goldenPixelActive: true,
					goldenPixelTimeLeft: 100
				},
				lastTick: now - 500 // 500ms ago, more than timeLeft
			});

			const newState = goldenPixelSystem.update(state, now);

			expect(newState.clicker.goldenPixelActive).toBe(false);
			expect(newState.clicker.goldenPixelTimeLeft).toBe(0);
			// Should schedule next spawn
			expect(newState.clicker.goldenPixelNextSpawn).toBeGreaterThan(now);
		});
	});

	describe('collect', () => {
		it('should add bonus to currency', () => {
			const state = createTestState({
				currency: 1000,
				clicker: {
					energyBarCurrent: 0,
					energyBarMax: BALANCE.ENERGY_BASE_CAPACITY,
					goldenPixelNextSpawn: Date.now() + 60000,
					goldenPixelActive: true,
					goldenPixelTimeLeft: 2000
				}
			});

			const { newState, bonus } = goldenPixelSystem.collect(state, 100);
			const expectedBonus = 100 * BALANCE.GOLDEN_BASE_MULTIPLIER; // 100 * 30 = 3000
			expect(bonus).toBe(expectedBonus);
			expect(newState.currency).toBe(1000 + expectedBonus);
		});

		it('should deactivate golden pixel after collect', () => {
			const state = createTestState({
				clicker: {
					energyBarCurrent: 0,
					energyBarMax: 100,
					goldenPixelNextSpawn: Date.now() + 60000,
					goldenPixelActive: true,
					goldenPixelTimeLeft: 2000
				}
			});

			const { newState } = goldenPixelSystem.collect(state, 100);

			expect(newState.clicker.goldenPixelActive).toBe(false);
			expect(newState.clicker.goldenPixelTimeLeft).toBe(0);
		});

		it('should update stats on collect', () => {
			const state = createTestState({
				clicker: {
					energyBarCurrent: 0,
					energyBarMax: 100,
					goldenPixelNextSpawn: Date.now() + 60000,
					goldenPixelActive: true,
					goldenPixelTimeLeft: 2000
				}
			});

			const { newState, bonus } = goldenPixelSystem.collect(state, 100);

			expect(newState.stats.totalEarned).toBe(bonus);
			expect(newState.stats.totalClicks).toBe(1);
		});

		it('should return 0 if not active', () => {
			const state = createTestState({
				clicker: {
					energyBarCurrent: 0,
					energyBarMax: 100,
					goldenPixelNextSpawn: Date.now() + 60000,
					goldenPixelActive: false,
					goldenPixelTimeLeft: 0
				}
			});

			const { newState, bonus } = goldenPixelSystem.collect(state, 100);

			expect(bonus).toBe(0);
			expect(newState).toBe(state); // Same reference
		});

		it('should schedule next spawn after collect', () => {
			const now = Date.now();
			const state = createTestState({
				clicker: {
					energyBarCurrent: 0,
					energyBarMax: 100,
					goldenPixelNextSpawn: now,
					goldenPixelActive: true,
					goldenPixelTimeLeft: 2000
				}
			});

			const { newState } = goldenPixelSystem.collect(state, 100);

			expect(newState.clicker.goldenPixelNextSpawn).toBeGreaterThan(now);
		});
	});

	describe('getRandomPosition', () => {
		it('should return position within bounds', () => {
			const position = goldenPixelSystem.getRandomPosition();

			expect(position.x).toBeGreaterThanOrEqual(20);
			expect(position.x).toBeLessThanOrEqual(80);
			expect(position.y).toBeGreaterThanOrEqual(30);
			expect(position.y).toBeLessThanOrEqual(70);
		});
	});

	describe('getTimeProgress', () => {
		it('should return correct progress', () => {
			const state = createTestState({
				clicker: {
					energyBarCurrent: 0,
					energyBarMax: 100,
					goldenPixelNextSpawn: Date.now() + 60000,
					goldenPixelActive: true,
					goldenPixelTimeLeft: 2000 // 50% of 4000
				}
			});

			expect(goldenPixelSystem.getTimeProgress(state)).toBe(0.5);
		});

		it('should return 0 if not active', () => {
			const state = createTestState({
				clicker: {
					energyBarCurrent: 0,
					energyBarMax: 100,
					goldenPixelNextSpawn: Date.now() + 60000,
					goldenPixelActive: false,
					goldenPixelTimeLeft: 0
				}
			});

			expect(goldenPixelSystem.getTimeProgress(state)).toBe(0);
		});
	});
});

// ============================================
// INTEGRATION TESTS
// ============================================

describe('updateClickerSystems', () => {
	it('should update both energy bar and golden pixel', () => {
		const now = Date.now();
		const state = createTestState({
			clicker: {
				energyBarCurrent: 0,
				energyBarMax: BALANCE.ENERGY_BASE_CAPACITY,
				goldenPixelNextSpawn: now + 60000,
				goldenPixelActive: false,
				goldenPixelTimeLeft: 0
			},
			lastTick: now
		});

		const newState = updateClickerSystems(state, 1, now, 100);

		// Energy should have increased (100 * 0.25 = 25)
		const expectedEnergy = 100 * BALANCE.ENERGY_FILL_RATE_PERCENT;
		expect(newState.clicker.energyBarCurrent).toBe(expectedEnergy);
		// Max should be updated
		expect(newState.clicker.energyBarMax).toBe(BALANCE.ENERGY_BASE_CAPACITY);
	});
});
