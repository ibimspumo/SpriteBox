// apps/web/src/lib/idle-pixel/storage.test.ts
// Unit tests for Storage functions

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
	saveGameState,
	loadGameState,
	deleteSaveData,
	hasSaveData,
	exportSaveData,
	importSaveData,
	getSaveInfo
} from './storage.js';
import type { IdlePixelGameState } from '@spritebox/types';
import {
	IDLE_PIXEL_STORAGE_KEY,
	IDLE_PIXEL_SAVE_VERSION,
	MAX_OFFLINE_SECONDS,
	GRID_START_POSITIONS
} from '@spritebox/types';

// Cast for use with .includes()
const START_POSITIONS: readonly number[] = GRID_START_POSITIONS;

// Mock localStorage with proper store persistence
let mockStore: Record<string, string> = {};

const localStorageMock = {
	getItem: vi.fn((key: string) => mockStore[key] ?? null),
	setItem: vi.fn((key: string, value: string) => {
		mockStore[key] = value;
	}),
	removeItem: vi.fn((key: string) => {
		delete mockStore[key];
	}),
	clear: vi.fn(() => {
		mockStore = {};
	})
};

Object.defineProperty(global, 'localStorage', {
	value: localStorageMock,
	writable: true
});

function createTestState(overrides?: Partial<IdlePixelGameState>): IdlePixelGameState {
	const grid = Array.from({ length: 64 }, (_, i) => ({
		position: i,
		unlocked: START_POSITIONS.includes(i),
		pixel: null
	}));

	return {
		currency: 1000,
		grid,
		upgrades: [],
		stats: {
			totalEarned: 5000,
			pixelsPurchased: 10,
			mergesPerformed: 5,
			highestColorLevel: 3,
			totalClicks: 100,
			playTime: 3600
		},
		clicker: {
			energyBarCurrent: 50,
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

describe('Storage Functions', () => {
	beforeEach(() => {
		mockStore = {};
		vi.clearAllMocks();
	});

	afterEach(() => {
		mockStore = {};
	});

	describe('saveGameState', () => {
		it('should save game state to localStorage', () => {
			const state = createTestState();
			const result = saveGameState(state);

			expect(result).toBe(true);
			expect(localStorageMock.setItem).toHaveBeenCalledWith(
				IDLE_PIXEL_STORAGE_KEY,
				expect.any(String)
			);
		});

		it('should include version and checksum in saved data', () => {
			const state = createTestState();
			saveGameState(state);

			const savedData = JSON.parse(localStorageMock.setItem.mock.calls[0][1]);
			expect(savedData.version).toBe(IDLE_PIXEL_SAVE_VERSION);
			expect(savedData.checksum).toBeDefined();
			expect(typeof savedData.checksum).toBe('string');
		});

		it('should update lastSaved timestamp', () => {
			const state = createTestState({ lastSaved: 0 });
			saveGameState(state);

			const savedData = JSON.parse(localStorageMock.setItem.mock.calls[0][1]);
			expect(savedData.state.lastSaved).toBeGreaterThan(0);
		});
	});

	describe('loadGameState', () => {
		it('should return null state when no save exists', () => {
			const result = loadGameState();

			expect(result.state).toBeNull();
			expect(result.offlineSeconds).toBe(0);
			expect(result.offlineEarnings).toBe(0);
		});

		it('should load valid save data', () => {
			const state = createTestState();
			saveGameState(state);

			const result = loadGameState();

			expect(result.state).not.toBeNull();
			expect(result.state?.currency).toBe(1000);
			expect(result.state?.stats.totalEarned).toBe(5000);
		});

		it('should calculate offline seconds correctly', () => {
			const oneHourAgo = Date.now() - 3600 * 1000;
			const state = createTestState({ lastSaved: oneHourAgo });

			// Directly set the mock store to preserve the old lastSaved timestamp
			const saveData = {
				version: IDLE_PIXEL_SAVE_VERSION,
				state: state,
				checksum: 'test'
			};
			mockStore[IDLE_PIXEL_STORAGE_KEY] = JSON.stringify(saveData);

			const result = loadGameState();

			// Should be approximately 1 hour (3600 seconds) + small delta
			expect(result.offlineSeconds).toBeGreaterThanOrEqual(3599);
			expect(result.offlineSeconds).toBeLessThanOrEqual(3602);
		});

		it('should cap offline seconds at MAX_OFFLINE_SECONDS', () => {
			const twoDaysAgo = Date.now() - 48 * 3600 * 1000; // 48 hours ago
			const state = createTestState({ lastSaved: twoDaysAgo });

			// Directly set the mock store to preserve the old lastSaved timestamp
			const saveData = {
				version: IDLE_PIXEL_SAVE_VERSION,
				state: state,
				checksum: 'test'
			};
			mockStore[IDLE_PIXEL_STORAGE_KEY] = JSON.stringify(saveData);

			const result = loadGameState();

			expect(result.offlineSeconds).toBe(MAX_OFFLINE_SECONDS);
		});

		it('should return null for invalid JSON', () => {
			localStorageMock.getItem.mockReturnValueOnce('invalid json');

			const result = loadGameState();

			expect(result.state).toBeNull();
		});

		it('should return null for invalid state schema', () => {
			const invalidData = {
				version: IDLE_PIXEL_SAVE_VERSION,
				state: { invalid: 'data' },
				checksum: 'test'
			};
			localStorageMock.getItem.mockReturnValueOnce(JSON.stringify(invalidData));

			const result = loadGameState();

			expect(result.state).toBeNull();
		});
	});

	describe('hasSaveData', () => {
		it('should return false when no save exists', () => {
			expect(hasSaveData()).toBe(false);
		});

		it('should return true when save exists', () => {
			const state = createTestState();
			saveGameState(state);

			expect(hasSaveData()).toBe(true);
		});
	});

	describe('deleteSaveData', () => {
		it('should remove save data from localStorage', () => {
			const state = createTestState();
			saveGameState(state);
			expect(hasSaveData()).toBe(true);

			deleteSaveData();

			expect(localStorageMock.removeItem).toHaveBeenCalledWith(IDLE_PIXEL_STORAGE_KEY);
		});
	});

	describe('exportSaveData', () => {
		it('should return null when no save exists', () => {
			expect(exportSaveData()).toBeNull();
		});

		it('should return JSON string when save exists', () => {
			const state = createTestState();
			saveGameState(state);

			const exported = exportSaveData();

			expect(exported).not.toBeNull();
			expect(typeof exported).toBe('string');

			// Should be valid JSON
			expect(() => JSON.parse(exported!)).not.toThrow();
		});
	});

	describe('importSaveData', () => {
		it('should return false for invalid JSON', () => {
			const result = importSaveData('not valid json');
			expect(result).toBe(false);
		});

		it('should return false for invalid state schema', () => {
			const invalidData = JSON.stringify({
				version: IDLE_PIXEL_SAVE_VERSION,
				state: { invalid: 'data' },
				checksum: 'test'
			});

			const result = importSaveData(invalidData);
			expect(result).toBe(false);
		});

		it('should import valid save data', () => {
			const state = createTestState({ currency: 9999 });
			saveGameState(state);

			const exported = exportSaveData()!;
			localStorageMock.clear();

			const result = importSaveData(exported);

			expect(result).toBe(true);
			expect(localStorageMock.setItem).toHaveBeenCalled();
		});
	});

	describe('getSaveInfo', () => {
		it('should return exists: false when no save', () => {
			const info = getSaveInfo();

			expect(info.exists).toBe(false);
			expect(info.lastSaved).toBeNull();
			expect(info.currency).toBeNull();
			expect(info.playTime).toBeNull();
		});

		it('should return save info when save exists', () => {
			const state = createTestState({
				currency: 5000,
				stats: {
					totalEarned: 10000,
					pixelsPurchased: 20,
					mergesPerformed: 10,
					highestColorLevel: 5,
					totalClicks: 200,
					playTime: 7200
				}
			});
			saveGameState(state);

			const info = getSaveInfo();

			expect(info.exists).toBe(true);
			expect(info.currency).toBe(5000);
			expect(info.playTime).toBe(7200);
			expect(info.lastSaved).toBeDefined();
		});
	});

	describe('offline earnings calculation', () => {
		it('should calculate earnings based on pixel production', () => {
			const state = createTestState();
			// Add a pixel with production to position 27
			state.grid[27] = {
				position: 27,
				unlocked: true,
				pixel: {
					id: 'test-pixel',
					colorLevel: 2,
					position: 27,
					baseProduction: 4 // Level 2 = 2^2 = 4 (with PIXEL_BASE_PRODUCTION = 2)
				}
			};

			// Save the state first
			saveGameState(state);

			// Now modify the saved data to have a past timestamp
			// (saveGameState always sets lastSaved to now, so we override it)
			const savedJson = localStorage.getItem(IDLE_PIXEL_STORAGE_KEY)!;
			const savedData = JSON.parse(savedJson);
			savedData.state.lastSaved = Date.now() - 3600 * 1000; // 1 hour ago
			localStorage.setItem(IDLE_PIXEL_STORAGE_KEY, JSON.stringify(savedData));

			const result = loadGameState();

			// Expected: 4 production * 3600 seconds * 0.5 (offline multiplier)
			// = 7200 offline earnings
			expect(result.offlineEarnings).toBeGreaterThan(0);
			expect(result.offlineSeconds).toBeCloseTo(3600, 0);
		});
	});
});
