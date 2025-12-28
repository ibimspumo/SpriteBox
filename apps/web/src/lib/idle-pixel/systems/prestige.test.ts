// apps/web/src/lib/idle-pixel/systems/prestige.test.ts
// Unit tests for PrestigeEngine

import { describe, it, expect, beforeEach } from 'vitest';
import {
	PrestigeEngine,
	PRESTIGE_UPGRADE_DEFINITIONS,
	PRESTIGE_UPGRADES_BY_ID,
	calculatePrestigeGain,
	currencyForPrisma
} from './prestige.js';
import type { IdlePixelGameState } from '@spritebox/types';
import { GRID_START_POSITIONS } from '@spritebox/types';

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

describe('Prestige Upgrade Definitions', () => {
	it('should have 6 prestige upgrades defined (5 base + 1 merge unlock)', () => {
		expect(PRESTIGE_UPGRADE_DEFINITIONS.length).toBe(6);
	});

	it('should have all required prestige upgrades', () => {
		const ids = PRESTIGE_UPGRADE_DEFINITIONS.map((u) => u.id);
		expect(ids).toContain('prisma_production');
		expect(ids).toContain('prisma_start_currency');
		expect(ids).toContain('prisma_unlock_slots');
		expect(ids).toContain('prisma_golden_bonus');
		expect(ids).toContain('prisma_base_pixel');
		expect(ids).toContain('prisma_merge_unlock'); // Merge unlock upgrade
	});

	it('should populate PRESTIGE_UPGRADES_BY_ID map', () => {
		expect(PRESTIGE_UPGRADES_BY_ID.size).toBe(6);
		expect(PRESTIGE_UPGRADES_BY_ID.get('prisma_production')).toBeDefined();
		expect(PRESTIGE_UPGRADES_BY_ID.get('prisma_merge_unlock')).toBeDefined();
	});

	it('should have correct effect types for each upgrade', () => {
		expect(PRESTIGE_UPGRADES_BY_ID.get('prisma_production')!.effectType).toBe('multiply_production');
		expect(PRESTIGE_UPGRADES_BY_ID.get('prisma_start_currency')!.effectType).toBe('start_currency_bonus');
		expect(PRESTIGE_UPGRADES_BY_ID.get('prisma_unlock_slots')!.effectType).toBe('start_unlocked_slots');
		expect(PRESTIGE_UPGRADES_BY_ID.get('prisma_golden_bonus')!.effectType).toBe('golden_pixel_value');
		expect(PRESTIGE_UPGRADES_BY_ID.get('prisma_base_pixel')!.effectType).toBe('increase_base_pixel_level');
		expect(PRESTIGE_UPGRADES_BY_ID.get('prisma_merge_unlock')!.effectType).toBe('prisma_merge_unlock');
	});
});

describe('Prestige Calculation Functions', () => {
	// Note: PRESTIGE_DIVISOR is now 1_000_000_000 (1B)
	const DIVISOR = 1_000_000_000;

	describe('calculatePrestigeGain', () => {
		it('should return 0 for less than 1,000,000,000 total earned', () => {
			expect(calculatePrestigeGain(0)).toBe(0);
			expect(calculatePrestigeGain(500_000_000)).toBe(0);
			expect(calculatePrestigeGain(999_999_999)).toBe(0);
		});

		it('should return 1 for 1,000,000,000 total earned', () => {
			expect(calculatePrestigeGain(DIVISOR)).toBe(1);
		});

		it('should follow sqrt formula: floor(sqrt(totalEarned / 1,000,000,000))', () => {
			// sqrt(4) = 2
			expect(calculatePrestigeGain(4 * DIVISOR)).toBe(2);
			// sqrt(9) = 3
			expect(calculatePrestigeGain(9 * DIVISOR)).toBe(3);
			// sqrt(16) = 4
			expect(calculatePrestigeGain(16 * DIVISOR)).toBe(4);
			// sqrt(100) = 10
			expect(calculatePrestigeGain(100 * DIVISOR)).toBe(10);
		});

		it('should floor non-perfect squares', () => {
			// sqrt(2) ≈ 1.41 → 1
			expect(calculatePrestigeGain(2 * DIVISOR)).toBe(1);
			// sqrt(5) ≈ 2.24 → 2
			expect(calculatePrestigeGain(5 * DIVISOR)).toBe(2);
		});
	});

	describe('currencyForPrisma', () => {
		it('should return required currency for given prisma count', () => {
			expect(currencyForPrisma(0)).toBe(0);
			expect(currencyForPrisma(1)).toBe(DIVISOR);
			expect(currencyForPrisma(2)).toBe(4 * DIVISOR);
			expect(currencyForPrisma(3)).toBe(9 * DIVISOR);
			expect(currencyForPrisma(10)).toBe(100 * DIVISOR);
		});
	});
});

describe('PrestigeEngine', () => {
	let engine: PrestigeEngine;
	// Note: PRESTIGE_DIVISOR is now 1_000_000_000 (1B)
	const DIVISOR = 1_000_000_000;

	beforeEach(() => {
		engine = new PrestigeEngine();
	});

	describe('canPrestige', () => {
		it('should return false when totalEarned < 1,000,000,000', () => {
			const state = createTestState({
				stats: {
					totalEarned: 500_000_000,
					pixelsPurchased: 0,
					mergesPerformed: 0,
					highestColorLevel: 0,
					totalClicks: 0,
					playTime: 0
				}
			});
			expect(engine.canPrestige(state)).toBe(false);
		});

		it('should return true when totalEarned >= 1,000,000,000', () => {
			const state = createTestState({
				stats: {
					totalEarned: DIVISOR,
					pixelsPurchased: 0,
					mergesPerformed: 0,
					highestColorLevel: 0,
					totalClicks: 0,
					playTime: 0
				}
			});
			expect(engine.canPrestige(state)).toBe(true);
		});
	});

	describe('getPrestigeGain', () => {
		it('should return correct prisma gain based on totalEarned', () => {
			const state = createTestState({
				stats: {
					totalEarned: 9 * DIVISOR, // 9B = sqrt(9) = 3 prisma
					pixelsPurchased: 0,
					mergesPerformed: 0,
					highestColorLevel: 0,
					totalClicks: 0,
					playTime: 0
				}
			});
			expect(engine.getPrestigeGain(state)).toBe(3);
		});
	});

	describe('getCurrencyToNextPrisma', () => {
		it('should return currency needed for first prisma', () => {
			const state = createTestState({
				stats: {
					totalEarned: 0,
					pixelsPurchased: 0,
					mergesPerformed: 0,
					highestColorLevel: 0,
					totalClicks: 0,
					playTime: 0
				}
			});
			expect(engine.getCurrencyToNextPrisma(state)).toBe(DIVISOR);
		});

		it('should return currency needed for next prisma', () => {
			const state = createTestState({
				stats: {
					totalEarned: 1_500_000_000, // 1.5B - Has 1 prisma, needs 4B for 2
					pixelsPurchased: 0,
					mergesPerformed: 0,
					highestColorLevel: 0,
					totalClicks: 0,
					playTime: 0
				}
			});
			expect(engine.getCurrencyToNextPrisma(state)).toBe(4 * DIVISOR - 1_500_000_000);
		});
	});

	describe('getProgressToNextPrisma', () => {
		it('should return 0 for 0 totalEarned', () => {
			const state = createTestState();
			expect(engine.getProgressToNextPrisma(state)).toBe(0);
		});

		it('should return 50 for halfway to first prisma', () => {
			const state = createTestState({
				stats: {
					totalEarned: 500_000_000, // 500M = 50% of 1B
					pixelsPurchased: 0,
					mergesPerformed: 0,
					highestColorLevel: 0,
					totalClicks: 0,
					playTime: 0
				}
			});
			expect(engine.getProgressToNextPrisma(state)).toBeCloseTo(50, 1);
		});
	});

	describe('performPrestige', () => {
		it('should throw error if prisma gain is 0', () => {
			const state = createTestState();
			expect(() => engine.performPrestige(state)).toThrow('Cannot prestige without earning prisma');
		});

		it('should reset game state with prisma rewards', () => {
			const state = createTestState({
				currency: 5 * DIVISOR, // 5B
				stats: {
					totalEarned: 5 * DIVISOR, // 5B = sqrt(5) = 2 prisma
					pixelsPurchased: 10,
					mergesPerformed: 5,
					highestColorLevel: 3,
					totalClicks: 100,
					playTime: 3600
				}
			});

			const newState = engine.performPrestige(state);

			// Currency reset to 0 (no prestige upgrades)
			expect(newState.currency).toBe(0);
			// Stats reset
			expect(newState.stats.totalEarned).toBe(0);
			expect(newState.stats.pixelsPurchased).toBe(0);
			expect(newState.stats.mergesPerformed).toBe(0);
			// Prestige count incremented
			expect(newState.prestige.prestigeCount).toBe(1);
			// Prisma added (sqrt(5) = 2.23... -> 2)
			expect(newState.prestige.prismaPixels).toBe(2);
			expect(newState.prestige.totalPrismaEarned).toBe(2);
		});

		it('should apply start currency bonus from prestige upgrades', () => {
			const state = createTestState({
				stats: {
					totalEarned: DIVISOR, // 1B = 1 prisma
					pixelsPurchased: 0,
					mergesPerformed: 0,
					highestColorLevel: 0,
					totalClicks: 0,
					playTime: 0
				},
				prestige: {
					prestigeCount: 1,
					prismaPixels: 5,
					totalPrismaEarned: 5,
					prestigeUpgrades: [{ upgradeId: 'prisma_start_currency', level: 3 }],
					lifetimeHighestColorLevel: 0
				}
			});

			const newState = engine.performPrestige(state);

			// 3 levels × 1000 = 3000 starting currency
			expect(newState.currency).toBe(3000);
		});

		it('should unlock bonus slots from prestige upgrades', () => {
			const state = createTestState({
				stats: {
					totalEarned: DIVISOR, // 1B = 1 prisma
					pixelsPurchased: 0,
					mergesPerformed: 0,
					highestColorLevel: 0,
					totalClicks: 0,
					playTime: 0
				},
				prestige: {
					prestigeCount: 1,
					prismaPixels: 10,
					totalPrismaEarned: 10,
					prestigeUpgrades: [{ upgradeId: 'prisma_unlock_slots', level: 2 }],
					lifetimeHighestColorLevel: 0
				}
			});

			const newState = engine.performPrestige(state);

			// 4 start slots + (2 × 4) = 12 unlocked slots
			const unlockedCount = newState.grid.filter((s) => s.unlocked).length;
			expect(unlockedCount).toBe(12);
		});

		it('should set starting pixel level from prestige upgrades', () => {
			const state = createTestState({
				stats: {
					totalEarned: DIVISOR, // 1B = 1 prisma
					pixelsPurchased: 0,
					mergesPerformed: 0,
					highestColorLevel: 0,
					totalClicks: 0,
					playTime: 0
				},
				prestige: {
					prestigeCount: 1,
					prismaPixels: 20,
					totalPrismaEarned: 20,
					prestigeUpgrades: [{ upgradeId: 'prisma_base_pixel', level: 2 }],
					lifetimeHighestColorLevel: 0
				}
			});

			const newState = engine.performPrestige(state);

			// Starting pixel at position 27 should have colorLevel 2
			const startPixel = newState.grid[27].pixel;
			expect(startPixel).not.toBeNull();
			expect(startPixel!.colorLevel).toBe(2);
			expect(newState.stats.highestColorLevel).toBe(2);
		});
	});

	describe('getPrestigeUpgradeLevel', () => {
		it('should return 0 for unpurchased upgrade', () => {
			const state = createTestState();
			expect(engine.getPrestigeUpgradeLevel(state, 'prisma_production')).toBe(0);
		});

		it('should return correct level for purchased upgrade', () => {
			const state = createTestState({
				prestige: {
					prestigeCount: 1,
					prismaPixels: 5,
					totalPrismaEarned: 10,
					prestigeUpgrades: [{ upgradeId: 'prisma_production', level: 3 }],
					lifetimeHighestColorLevel: 0
				}
			});
			expect(engine.getPrestigeUpgradeLevel(state, 'prisma_production')).toBe(3);
		});
	});

	describe('purchasePrestigeUpgrade', () => {
		it('should return null for unknown upgrade', () => {
			const state = createTestState({ prestige: { ...createTestState().prestige, prismaPixels: 100 } });
			expect(engine.purchasePrestigeUpgrade(state, 'unknown_upgrade')).toBeNull();
		});

		it('should return null when at max level', () => {
			const def = PRESTIGE_UPGRADES_BY_ID.get('prisma_production')!;
			const state = createTestState({
				prestige: {
					prestigeCount: 0,
					prismaPixels: 1000,
					totalPrismaEarned: 1000,
					prestigeUpgrades: [{ upgradeId: 'prisma_production', level: def.maxLevel }],
					lifetimeHighestColorLevel: 0
				}
			});
			expect(engine.purchasePrestigeUpgrade(state, 'prisma_production')).toBeNull();
		});

		it('should return null when cannot afford', () => {
			const state = createTestState({
				prestige: {
					prestigeCount: 0,
					prismaPixels: 0,
					totalPrismaEarned: 0,
					prestigeUpgrades: [],
					lifetimeHighestColorLevel: 0
				}
			});
			expect(engine.purchasePrestigeUpgrade(state, 'prisma_production')).toBeNull();
		});

		it('should purchase upgrade and deduct prisma', () => {
			const def = PRESTIGE_UPGRADES_BY_ID.get('prisma_production')!;
			const state = createTestState({
				prestige: {
					prestigeCount: 0,
					prismaPixels: 10,
					totalPrismaEarned: 10,
					prestigeUpgrades: [],
					lifetimeHighestColorLevel: 0
				}
			});

			const newState = engine.purchasePrestigeUpgrade(state, 'prisma_production');

			expect(newState).not.toBeNull();
			// Cost for level 1: prismaCost × 1 = 1
			expect(newState!.prestige.prismaPixels).toBe(10 - def.prismaCost);
			expect(newState!.prestige.prestigeUpgrades.length).toBe(1);
			expect(newState!.prestige.prestigeUpgrades[0].level).toBe(1);
		});

		it('should increment level on subsequent purchases', () => {
			const def = PRESTIGE_UPGRADES_BY_ID.get('prisma_production')!;
			let state = createTestState({
				prestige: {
					prestigeCount: 0,
					prismaPixels: 100,
					totalPrismaEarned: 100,
					prestigeUpgrades: [],
					lifetimeHighestColorLevel: 0
				}
			});

			state = engine.purchasePrestigeUpgrade(state, 'prisma_production')!;
			state = engine.purchasePrestigeUpgrade(state, 'prisma_production')!;

			expect(state.prestige.prestigeUpgrades[0].level).toBe(2);
			// Cost: 1 + 2 = 3 × prismaCost
			expect(state.prestige.prismaPixels).toBe(100 - def.prismaCost * 3);
		});
	});

	describe('canPurchasePrestigeUpgrade', () => {
		it('should return false for unknown upgrade', () => {
			const state = createTestState();
			const result = engine.canPurchasePrestigeUpgrade(state, 'unknown');
			expect(result.canBuy).toBe(false);
			expect(result.reason).toBe('Upgrade not found');
		});

		it('should return false at max level', () => {
			const def = PRESTIGE_UPGRADES_BY_ID.get('prisma_production')!;
			const state = createTestState({
				prestige: {
					prestigeCount: 0,
					prismaPixels: 1000,
					totalPrismaEarned: 1000,
					prestigeUpgrades: [{ upgradeId: 'prisma_production', level: def.maxLevel }],
					lifetimeHighestColorLevel: 0
				}
			});
			const result = engine.canPurchasePrestigeUpgrade(state, 'prisma_production');
			expect(result.canBuy).toBe(false);
			expect(result.reason).toBe('Max level reached');
		});

		it('should return false when not enough prisma', () => {
			const state = createTestState({
				prestige: {
					prestigeCount: 0,
					prismaPixels: 0,
					totalPrismaEarned: 0,
					prestigeUpgrades: [],
					lifetimeHighestColorLevel: 0
				}
			});
			const result = engine.canPurchasePrestigeUpgrade(state, 'prisma_production');
			expect(result.canBuy).toBe(false);
			expect(result.reason).toBe('Not enough prisma');
		});

		it('should return true when can afford', () => {
			const state = createTestState({
				prestige: {
					prestigeCount: 0,
					prismaPixels: 10,
					totalPrismaEarned: 10,
					prestigeUpgrades: [],
					lifetimeHighestColorLevel: 0
				}
			});
			const result = engine.canPurchasePrestigeUpgrade(state, 'prisma_production');
			expect(result.canBuy).toBe(true);
			expect(result.reason).toBeUndefined();
		});
	});

	describe('getPrestigeUpgradeInfo', () => {
		it('should return complete info for upgrade', () => {
			const state = createTestState({
				prestige: {
					prestigeCount: 0,
					prismaPixels: 5,
					totalPrismaEarned: 5,
					prestigeUpgrades: [],
					lifetimeHighestColorLevel: 0
				}
			});

			const info = engine.getPrestigeUpgradeInfo(state, 'prisma_production');

			expect(info.definition).toBeDefined();
			expect(info.currentLevel).toBe(0);
			expect(info.cost).toBe(1); // prismaCost × (level + 1) = 1 × 1
			expect(info.canAfford).toBe(true);
			expect(info.isMaxed).toBe(false);
			expect(info.currentEffect).toBe(1); // 2^0 = 1
			expect(info.nextEffect).toBe(2); // 2^1 = 2
		});

		it('should show upgrade as maxed when at max level', () => {
			const def = PRESTIGE_UPGRADES_BY_ID.get('prisma_production')!;
			const state = createTestState({
				prestige: {
					prestigeCount: 0,
					prismaPixels: 1000,
					totalPrismaEarned: 1000,
					prestigeUpgrades: [{ upgradeId: 'prisma_production', level: def.maxLevel }],
					lifetimeHighestColorLevel: 0
				}
			});

			const info = engine.getPrestigeUpgradeInfo(state, 'prisma_production');

			expect(info.isMaxed).toBe(true);
			expect(info.canAfford).toBe(false);
		});

		it('should return empty info for unknown upgrade', () => {
			const state = createTestState();
			const info = engine.getPrestigeUpgradeInfo(state, 'unknown');

			expect(info.definition).toBeUndefined();
			expect(info.currentLevel).toBe(0);
			expect(info.cost).toBe(0);
		});
	});

	describe('getAllPrestigeUpgradesInfo', () => {
		it('should return info for all prestige upgrades', () => {
			const state = createTestState({
				prestige: {
					prestigeCount: 0,
					prismaPixels: 100,
					totalPrismaEarned: 100,
					prestigeUpgrades: [],
					lifetimeHighestColorLevel: 0
				}
			});

			const allInfo = engine.getAllPrestigeUpgradesInfo(state);

			expect(allInfo.length).toBe(PRESTIGE_UPGRADE_DEFINITIONS.length);
			allInfo.forEach((info) => {
				expect(info.definition).toBeDefined();
			});
		});
	});

	describe('getPrestigeProductionMultiplier', () => {
		it('should return 1 for no prestige upgrades', () => {
			const state = createTestState();
			expect(engine.getPrestigeProductionMultiplier(state)).toBe(1);
		});

		it('should return 2^level for prisma_production upgrade', () => {
			const state = createTestState({
				prestige: {
					prestigeCount: 0,
					prismaPixels: 0,
					totalPrismaEarned: 0,
					prestigeUpgrades: [{ upgradeId: 'prisma_production', level: 3 }],
					lifetimeHighestColorLevel: 0
				}
			});
			expect(engine.getPrestigeProductionMultiplier(state)).toBe(8); // 2^3
		});
	});

	describe('getGoldenPixelMultiplier', () => {
		it('should return 1 for no prestige upgrades', () => {
			const state = createTestState();
			expect(engine.getGoldenPixelMultiplier(state)).toBe(1);
		});

		it('should return 1.5^level for prisma_golden_bonus upgrade', () => {
			const state = createTestState({
				prestige: {
					prestigeCount: 0,
					prismaPixels: 0,
					totalPrismaEarned: 0,
					prestigeUpgrades: [{ upgradeId: 'prisma_golden_bonus', level: 2 }],
					lifetimeHighestColorLevel: 0
				}
			});
			expect(engine.getGoldenPixelMultiplier(state)).toBeCloseTo(2.25, 4); // 1.5^2
		});
	});

	describe('getTotalPrestigeMultiplier', () => {
		it('should return 1 for fresh game', () => {
			const state = createTestState();
			expect(engine.getTotalPrestigeMultiplier(state)).toBe(1);
		});

		it('should include prestige count bonus (1.1^count)', () => {
			const state = createTestState({
				prestige: {
					prestigeCount: 3,
					prismaPixels: 0,
					totalPrismaEarned: 0,
					prestigeUpgrades: [],
					lifetimeHighestColorLevel: 0
				}
			});
			expect(engine.getTotalPrestigeMultiplier(state)).toBeCloseTo(Math.pow(1.1, 3), 4);
		});

		it('should combine prestige count and upgrade multipliers', () => {
			const state = createTestState({
				prestige: {
					prestigeCount: 2,
					prismaPixels: 0,
					totalPrismaEarned: 0,
					prestigeUpgrades: [{ upgradeId: 'prisma_production', level: 2 }],
					lifetimeHighestColorLevel: 0
				}
			});
			// 1.1^2 × 2^2 = 1.21 × 4 = 4.84
			expect(engine.getTotalPrestigeMultiplier(state)).toBeCloseTo(1.21 * 4, 4);
		});
	});
});
