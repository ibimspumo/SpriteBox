// apps/web/src/lib/idle-pixel/storage.ts
// Storage helpers for Idle Pixel game state

import type { IdlePixelGameState, IdlePixelSaveData } from '@spritebox/types';
import {
	IDLE_PIXEL_STORAGE_KEY,
	IDLE_PIXEL_SAVE_VERSION,
	MAX_OFFLINE_SECONDS,
	OFFLINE_PRODUCTION_MULTIPLIER,
	IdlePixelGameStateSchema
} from '@spritebox/types';

/**
 * Calculate a simple checksum for the state
 */
function calculateChecksum(state: IdlePixelGameState): string {
	// Simple checksum based on key values
	const data = `${state.currency}|${state.stats.totalEarned}|${state.stats.pixelsPurchased}|${state.lastSaved}`;
	let hash = 0;
	for (let i = 0; i < data.length; i++) {
		const char = data.charCodeAt(i);
		hash = ((hash << 5) - hash) + char;
		hash = hash & hash; // Convert to 32bit integer
	}
	return hash.toString(36);
}

/**
 * Save game state to localStorage
 */
export function saveGameState(state: IdlePixelGameState): boolean {
	try {
		const saveData: IdlePixelSaveData = {
			version: IDLE_PIXEL_SAVE_VERSION,
			state: {
				...state,
				lastSaved: Date.now()
			},
			checksum: calculateChecksum(state)
		};

		const json = JSON.stringify(saveData);
		localStorage.setItem(IDLE_PIXEL_STORAGE_KEY, json);
		return true;
	} catch (error) {
		console.error('Failed to save game state:', error);
		return false;
	}
}

/**
 * Load game state from localStorage
 */
export function loadGameState(): {
	state: IdlePixelGameState | null;
	offlineSeconds: number;
	offlineEarnings: number;
} {
	try {
		const json = localStorage.getItem(IDLE_PIXEL_STORAGE_KEY);
		if (!json) {
			return { state: null, offlineSeconds: 0, offlineEarnings: 0 };
		}

		const saveData = JSON.parse(json) as IdlePixelSaveData;

		// Version check (future migrations would go here)
		if (saveData.version !== IDLE_PIXEL_SAVE_VERSION) {
			console.warn('Save version mismatch, may need migration');
			// For now, just proceed - add migrations later if needed
		}

		// Validate the state
		const parseResult = IdlePixelGameStateSchema.safeParse(saveData.state);
		if (!parseResult.success) {
			console.error('Invalid save data:', parseResult.error);
			return { state: null, offlineSeconds: 0, offlineEarnings: 0 };
		}

		const state = parseResult.data;

		// Calculate offline time
		const now = Date.now();
		const lastSaved = state.lastSaved;
		const offlineMs = Math.max(0, now - lastSaved);
		const offlineSeconds = Math.min(offlineMs / 1000, MAX_OFFLINE_SECONDS);

		// Calculate offline earnings (will be applied by game loop)
		// This is just for display purposes
		const baseProduction = state.grid
			.filter((slot) => slot.pixel !== null)
			.reduce((sum, slot) => sum + (slot.pixel?.baseProduction ?? 0), 0);
		const offlineEarnings = baseProduction * offlineSeconds * OFFLINE_PRODUCTION_MULTIPLIER;

		return {
			state: {
				...state,
				lastTick: now
			},
			offlineSeconds,
			offlineEarnings
		};
	} catch (error) {
		console.error('Failed to load game state:', error);
		return { state: null, offlineSeconds: 0, offlineEarnings: 0 };
	}
}

/**
 * Delete saved game state
 */
export function deleteSaveData(): void {
	try {
		localStorage.removeItem(IDLE_PIXEL_STORAGE_KEY);
	} catch (error) {
		console.error('Failed to delete save data:', error);
	}
}

/**
 * Check if a save exists
 */
export function hasSaveData(): boolean {
	try {
		return localStorage.getItem(IDLE_PIXEL_STORAGE_KEY) !== null;
	} catch {
		return false;
	}
}

/**
 * Export save data as JSON string (for backup)
 */
export function exportSaveData(): string | null {
	try {
		return localStorage.getItem(IDLE_PIXEL_STORAGE_KEY);
	} catch {
		return null;
	}
}

/**
 * Import save data from JSON string (for restore)
 */
export function importSaveData(json: string): boolean {
	try {
		const saveData = JSON.parse(json) as IdlePixelSaveData;

		// Validate
		const parseResult = IdlePixelGameStateSchema.safeParse(saveData.state);
		if (!parseResult.success) {
			console.error('Invalid import data:', parseResult.error);
			return false;
		}

		localStorage.setItem(IDLE_PIXEL_STORAGE_KEY, json);
		return true;
	} catch (error) {
		console.error('Failed to import save data:', error);
		return false;
	}
}

/**
 * Get save data info without loading full state
 */
export function getSaveInfo(): {
	exists: boolean;
	lastSaved: number | null;
	currency: number | null;
	playTime: number | null;
} {
	try {
		const json = localStorage.getItem(IDLE_PIXEL_STORAGE_KEY);
		if (!json) {
			return { exists: false, lastSaved: null, currency: null, playTime: null };
		}

		const saveData = JSON.parse(json) as IdlePixelSaveData;
		return {
			exists: true,
			lastSaved: saveData.state.lastSaved,
			currency: saveData.state.currency,
			playTime: saveData.state.stats.playTime
		};
	} catch {
		return { exists: false, lastSaved: null, currency: null, playTime: null };
	}
}
