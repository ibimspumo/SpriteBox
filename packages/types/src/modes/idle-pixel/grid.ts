// packages/types/src/modes/idle-pixel/grid.ts
// Grid system types and utilities for Idle Pixel

/**
 * Position im 2D-Grid
 */
export interface GridPosition {
  x: number; // 0-7
  y: number; // 0-7
}

/**
 * Grid-Konfiguration
 */
export interface GridConfig {
  /** Maximale Größe (8 = 8x8) */
  maxSize: 8;
  /** Aktuelle freigeschaltete Slots */
  unlockedSlots: number[];
  /** Startposition (Mitte des 8x8 Grids) */
  startPositions: number[];
}

/**
 * Slot-Kauf-Option
 */
export interface SlotPurchaseOption {
  /** Position des Slots */
  position: number;
  /** 2D-Koordinaten */
  coords: GridPosition;
  /** Kaufpreis */
  cost: number;
  /** Ring-Distanz vom Zentrum (beeinflusst Preis) */
  ringDistance: number;
  /** Anliegende freigeschaltete Slots */
  adjacentUnlocked: number[];
}

/**
 * Hilfsfunktionen für Grid-Konvertierung
 */
export const GridUtils = {
  /** Position (0-63) zu 2D-Koordinaten */
  positionToCoords: (pos: number): GridPosition => ({
    x: pos % 8,
    y: Math.floor(pos / 8),
  }),

  /** 2D-Koordinaten zu Position */
  coordsToPosition: (coords: GridPosition): number => coords.y * 8 + coords.x,

  /** Ring-Distanz vom Zentrum (3.5, 3.5) */
  getRingDistance: (pos: number): number => {
    const { x, y } = GridUtils.positionToCoords(pos);
    const centerX = 3.5;
    const centerY = 3.5;
    return Math.max(Math.abs(x - centerX), Math.abs(y - centerY));
  },

  /** Alle anliegenden Positionen (4er-Nachbarschaft) */
  getAdjacentPositions: (pos: number): number[] => {
    const { x, y } = GridUtils.positionToCoords(pos);
    const adjacent: number[] = [];

    if (x > 0) adjacent.push(pos - 1); // Links
    if (x < 7) adjacent.push(pos + 1); // Rechts
    if (y > 0) adjacent.push(pos - 8); // Oben
    if (y < 7) adjacent.push(pos + 8); // Unten

    return adjacent;
  },

  /** Prüft ob zwei Positionen nebeneinander sind */
  areAdjacent: (pos1: number, pos2: number): boolean => {
    return GridUtils.getAdjacentPositions(pos1).includes(pos2);
  },

  /** Findet alle kaufbaren Slots (nicht freigeschaltet, aber neben freigeschalteten) */
  getPurchasableSlots: (unlockedSlots: number[]): number[] => {
    const purchasable = new Set<number>();

    for (const slot of unlockedSlots) {
      for (const adjacent of GridUtils.getAdjacentPositions(slot)) {
        if (!unlockedSlots.includes(adjacent)) {
          purchasable.add(adjacent);
        }
      }
    }

    return Array.from(purchasable);
  },
};

/**
 * Start-Konfiguration (2x2 in der Mitte)
 *
 * Das 8x8 Grid mit Positionen:
 *
 *  0  1  2  3  4  5  6  7
 *  8  9 10 11 12 13 14 15
 * 16 17 18 19 20 21 22 23
 * 24 25 26 [27 28] 29 30 31
 * 32 33 34 [35 36] 37 38 39
 * 40 41 42 43 44 45 46 47
 * 48 49 50 51 52 53 54 55
 * 56 57 58 59 60 61 62 63
 *
 * Start-Positionen: 27, 28, 35, 36 (2x2 Mitte)
 */
export const GRID_START_POSITIONS = [27, 28, 35, 36] as const;

/** Maximale Grid-Größe */
export const GRID_SIZE = 8;

/** Totale Anzahl Slots */
export const GRID_TOTAL_SLOTS = GRID_SIZE * GRID_SIZE; // 64

// Slot-Kosten werden jetzt in balance.ts definiert und über calculateSlotCost berechnet
// Formel: SLOT_BASE_COST * SLOT_COST_MULTIPLIER^slotsPurchased
// Siehe: packages/types/src/modes/idle-pixel/balance.ts
