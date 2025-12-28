// packages/types/src/modes/idle-pixel/storage.ts
// Storage types and constants for Idle Pixel

import type { IdlePixelGameState } from './core.js';

/**
 * LocalStorage-Schlüssel
 */
export const IDLE_PIXEL_STORAGE_KEY = 'spritebox_idle_pixel_save';

/**
 * Aktuelle Save-Version
 */
export const IDLE_PIXEL_SAVE_VERSION = 1;

/**
 * Gespeicherter Spielzustand
 */
export interface IdlePixelSaveData {
  /** Version für Migrations */
  version: number;
  /** Komprimierter Spielzustand */
  state: IdlePixelGameState;
  /** Checksumme zur Validierung */
  checksum: string;
}

/**
 * Maximale Offline-Progression in Sekunden (24 Stunden)
 */
export const MAX_OFFLINE_SECONDS = 24 * 60 * 60;

/**
 * Auto-Save Intervall in Millisekunden
 */
export const AUTO_SAVE_INTERVAL = 30_000; // 30 Sekunden

/**
 * Spielgeschwindigkeits-Multiplikator für Offline-Progression
 * (z.B. 0.5 = 50% der normalen Produktionsrate während offline)
 */
export const OFFLINE_PRODUCTION_MULTIPLIER = 0.5;
