// packages/types/src/modes/idle-pixel/core.ts
// Core types for Idle Pixel game mode

import type { PurchasedUpgrade } from './upgrades.js';
import type { PrestigeState } from './prestige.js';
import { BALANCE } from './balance.js';

/**
 * Ein einzelner Pixel auf dem Grid
 */
export interface IdlePixel {
  /** Eindeutige ID */
  id: string;
  /** Farbstufe (0-14) */
  colorLevel: number;
  /** Position im Grid (0-63) */
  position: number;
  /** Produktionsrate pro Sekunde (vor Multiplikatoren) */
  baseProduction: number;
}

/**
 * Ein Slot im Grid (kann leer oder mit Pixel belegt sein)
 */
export interface GridSlot {
  /** Position (0-63) */
  position: number;
  /** Ob der Slot freigeschaltet ist */
  unlocked: boolean;
  /** Pixel auf diesem Slot (null = leer) */
  pixel: IdlePixel | null;
}

/**
 * Clicker-Zustand
 */
export interface ClickerState {
  /** Energie-Balken: aktueller Füllstand */
  energyBarCurrent: number;
  /** Energie-Balken: Maximum */
  energyBarMax: number;
  /** Goldener Pixel: nächste Erscheinungszeit */
  goldenPixelNextSpawn: number;
  /** Goldener Pixel: aktuell sichtbar? */
  goldenPixelActive: boolean;
  /** Goldener Pixel: verbleibende Zeit */
  goldenPixelTimeLeft: number;
}

/**
 * Spielstatistiken
 */
export interface IdlePixelStats {
  /** Gesamt verdiente Währung (all-time) */
  totalEarned: number;
  /** Anzahl gekaufter Pixel */
  pixelsPurchased: number;
  /** Anzahl durchgeführter Merges */
  mergesPerformed: number;
  /** Höchste erreichte Farbstufe */
  highestColorLevel: number;
  /** Gesamt-Klicks */
  totalClicks: number;
  /** Spielzeit in Sekunden */
  playTime: number;
}

/**
 * Haupt-Spielzustand
 */
export interface IdlePixelGameState {
  /** Aktuelle Pixel-Währung */
  currency: number;
  /** Alle Grid-Slots (64 Slots für 8x8) */
  grid: GridSlot[];
  /** Gekaufte Upgrades */
  upgrades: PurchasedUpgrade[];
  /** Statistiken */
  stats: IdlePixelStats;
  /** Clicker-Zustand */
  clicker: ClickerState;
  /** Prestige-Daten */
  prestige: PrestigeState;
  /** Zeitstempel des letzten Speicherns */
  lastSaved: number;
  /** Zeitstempel der letzten Produktion-Berechnung */
  lastTick: number;
}

/**
 * Farb-Palette für Idle Pixel (15 Farben)
 * Index entspricht der Farbstufe (0-14)
 */
export const IDLE_PIXEL_COLORS = [
  '#ffffff', // 0: Weiß (Stufe 1 - günstigster Pixel)
  '#5c3a21', // 1: Braun
  '#ff0000', // 2: Rot
  '#ff8800', // 3: Orange
  '#ffff00', // 4: Gelb
  '#00ff00', // 5: Grün
  '#00ffff', // 6: Cyan
  '#0088ff', // 7: Hellblau
  '#0000ff', // 8: Blau
  '#8800ff', // 9: Violett
  '#ff00ff', // 10: Magenta
  '#ff0088', // 11: Pink
  '#888888', // 12: Grau
  '#cccccc', // 13: Hellgrau
  '#ffcccc', // 14: Rosa (Maximum)
] as const;

/** Anzahl der verfügbaren Farbstufen */
export const MAX_COLOR_LEVEL = 14;

/** Berechnet die Produktionsrate für eine Farbstufe */
export const getProductionForLevel = (level: number): number => {
  return Math.pow(BALANCE.PIXEL_BASE_PRODUCTION, level);
};
