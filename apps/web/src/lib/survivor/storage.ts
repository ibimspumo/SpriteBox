// apps/web/src/lib/survivor/storage.ts
// LocalStorage utilities for Pixel Survivor
// Simplified: Only character creation system remains

import LZString from 'lz-string';
import type {
  PixelSurvivorRun,
  PixelSurvivorStats,
  PixelSurvivorSettings,
} from './types.js';
import { DEFAULT_STATS, DEFAULT_SETTINGS } from './types.js';

// === Storage Keys ===
const STORAGE_KEYS = {
  CURRENT_RUN: 'pixel_survivor_run',
  STATISTICS: 'pixel_survivor_stats',
  SETTINGS: 'pixel_survivor_settings',
  VERSION: 'pixel_survivor_version',
} as const;

const SCHEMA_VERSION = 1;

// === Run Storage ===

/**
 * Save the current run to LocalStorage (compressed)
 */
export function saveRun(run: PixelSurvivorRun): void {
  try {
    run.lastSavedAt = Date.now();
    const compressed = LZString.compressToUTF16(JSON.stringify(run));
    localStorage.setItem(STORAGE_KEYS.CURRENT_RUN, compressed);
  } catch (error) {
    console.error('[Survivor] Failed to save run:', error);
  }
}

/**
 * Load the current run from LocalStorage
 */
export function loadRun(): PixelSurvivorRun | null {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.CURRENT_RUN);
    if (!data) return null;

    const decompressed = LZString.decompressFromUTF16(data);
    if (!decompressed) return null;

    const run = JSON.parse(decompressed) as PixelSurvivorRun;
    return migrateRun(run);
  } catch (error) {
    console.error('[Survivor] Failed to load run:', error);
    return null;
  }
}

/**
 * Delete the current run
 */
export function deleteRun(): void {
  localStorage.removeItem(STORAGE_KEYS.CURRENT_RUN);
}

/**
 * Check if there's an active run
 */
export function hasActiveRun(): boolean {
  return localStorage.getItem(STORAGE_KEYS.CURRENT_RUN) !== null;
}

// === Statistics Storage ===

/**
 * Save statistics to LocalStorage
 */
export function saveStats(stats: PixelSurvivorStats): void {
  try {
    localStorage.setItem(STORAGE_KEYS.STATISTICS, JSON.stringify(stats));
  } catch (error) {
    console.error('[Survivor] Failed to save stats:', error);
  }
}

/**
 * Load statistics from LocalStorage
 */
export function loadStats(): PixelSurvivorStats {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.STATISTICS);
    if (!data) return { ...DEFAULT_STATS };

    const stats = JSON.parse(data) as PixelSurvivorStats;
    return migrateStats(stats);
  } catch (error) {
    console.error('[Survivor] Failed to load stats:', error);
    return { ...DEFAULT_STATS };
  }
}

// === Settings Storage ===

/**
 * Save settings to LocalStorage
 */
export function saveSettings(settings: PixelSurvivorSettings): void {
  try {
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
  } catch (error) {
    console.error('[Survivor] Failed to save settings:', error);
  }
}

/**
 * Load settings from LocalStorage
 */
export function loadSettings(): PixelSurvivorSettings {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.SETTINGS);
    if (!data) return { ...DEFAULT_SETTINGS };

    const settings = JSON.parse(data) as PixelSurvivorSettings;
    return migrateSettings(settings);
  } catch (error) {
    console.error('[Survivor] Failed to load settings:', error);
    return { ...DEFAULT_SETTINGS };
  }
}

// === Migration Functions ===

function migrateRun(run: PixelSurvivorRun): PixelSurvivorRun {
  // Future migrations go here
  if (run.version < SCHEMA_VERSION) {
    run.version = SCHEMA_VERSION;
  }
  return run;
}

function migrateStats(stats: PixelSurvivorStats): PixelSurvivorStats {
  // Merge with defaults to ensure all fields exist
  return { ...DEFAULT_STATS, ...stats, version: SCHEMA_VERSION };
}

function migrateSettings(settings: PixelSurvivorSettings): PixelSurvivorSettings {
  return { ...DEFAULT_SETTINGS, ...settings, version: SCHEMA_VERSION };
}

// === Utility Functions ===

/**
 * Clear all Pixel Survivor data (for debugging/reset)
 */
export function clearAllData(): void {
  Object.values(STORAGE_KEYS).forEach((key) => {
    localStorage.removeItem(key);
  });
}

/**
 * Get storage usage estimate (in bytes)
 */
export function getStorageUsage(): number {
  let total = 0;
  Object.values(STORAGE_KEYS).forEach((key) => {
    const data = localStorage.getItem(key);
    if (data) {
      total += data.length * 2; // UTF-16 = 2 bytes per character
    }
  });
  return total;
}
