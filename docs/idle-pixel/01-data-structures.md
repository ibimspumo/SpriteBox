# Phase 1: Datenstrukturen & Types

> Alle TypeScript-Definitionen für Idle Pixel

## Datei-Struktur

```
packages/types/src/
├── modes/
│   └── idle-pixel/
│       ├── index.ts        # Barrel Export
│       ├── core.ts         # Kern-Types
│       ├── upgrades.ts     # Upgrade-Definitionen
│       ├── grid.ts         # Grid-System
│       └── prestige.ts     # Prestige-System
```

---

## Core Types (`core.ts`)

```typescript
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
```

---

## Upgrade Types (`upgrades.ts`)

```typescript
/**
 * Upgrade-Kategorie
 */
export type UpgradeCategory =
  | 'production'  // Produktions-Multiplikatoren
  | 'economy'     // Kaufpreis-Reduktion, Merge-Bonus
  | 'grid'        // Grid-Erweiterung
  | 'clicker';    // Klick-Verstärkung

/**
 * Upgrade-Effekt-Typ
 */
export type UpgradeEffectType =
  | 'multiply_production'      // Globaler Produktions-Multiplikator
  | 'multiply_color_level'     // Bonus pro Farbstufe
  | 'reduce_pixel_cost'        // Pixel-Kaufpreis reduzieren
  | 'increase_merge_bonus'     // Merge gibt mehr Wert
  | 'unlock_grid_slot'         // Grid-Slot freischalten
  | 'increase_base_pixel_level' // Gekaufte Pixel starten höher
  | 'energy_bar_capacity'      // Energie-Balken vergrößern
  | 'energy_bar_fill_rate'     // Energie-Balken füllt schneller
  | 'click_value'              // Klick gibt mehr Währung
  | 'golden_pixel_frequency'   // Goldener Pixel erscheint öfter
  | 'golden_pixel_value';      // Goldener Pixel gibt mehr

/**
 * Definition eines Upgrades (statisch)
 */
export interface UpgradeDefinition {
  /** Eindeutige ID */
  id: string;
  /** i18n-Key für Namen */
  nameKey: string;
  /** i18n-Key für Beschreibung */
  descriptionKey: string;
  /** Kategorie */
  category: UpgradeCategory;
  /** Effekt-Typ */
  effectType: UpgradeEffectType;
  /** Effekt-Wert (z.B. 1.5 für +50%) */
  effectValue: number;
  /** Basispreis */
  baseCost: number;
  /** Preis-Multiplikator pro Level */
  costMultiplier: number;
  /** Maximales Level (0 = unbegrenzt) */
  maxLevel: number;
  /** Voraussetzung (andere Upgrade-ID) */
  requires?: string;
  /** Icon (Emoji oder SVG-Pfad) */
  icon: string;
}

/**
 * Gekauftes Upgrade (dynamisch)
 */
export interface PurchasedUpgrade {
  /** Upgrade-ID (referenziert UpgradeDefinition) */
  upgradeId: string;
  /** Aktuelles Level */
  level: number;
  /** Zeitpunkt des letzten Kaufs */
  lastPurchased: number;
}

/**
 * Berechneter Upgrade-Effekt
 */
export interface CalculatedUpgradeEffect {
  /** Effekt-Typ */
  type: UpgradeEffectType;
  /** Gesamt-Wert (alle Level kombiniert) */
  totalValue: number;
  /** Quelle (Upgrade-IDs) */
  sources: string[];
}
```

---

## Grid Types (`grid.ts`)

```typescript
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
 * Position im 2D-Grid
 */
export interface GridPosition {
  x: number; // 0-7
  y: number; // 0-7
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
    y: Math.floor(pos / 8)
  }),

  /** 2D-Koordinaten zu Position */
  coordsToPosition: (coords: GridPosition): number =>
    coords.y * 8 + coords.x,

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

    if (x > 0) adjacent.push(pos - 1);      // Links
    if (x < 7) adjacent.push(pos + 1);      // Rechts
    if (y > 0) adjacent.push(pos - 8);      // Oben
    if (y < 7) adjacent.push(pos + 8);      // Unten

    return adjacent;
  }
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
export const GRID_START_POSITIONS = [27, 28, 35, 36];

/**
 * Slot-Preisberechnung basierend auf Ring
 */
export const SLOT_RING_COSTS: Record<number, number> = {
  0: 0,       // Start-Slots (gratis, bereits freigeschaltet)
  1: 100,     // Ring 1: direkt anliegend
  2: 500,     // Ring 2
  3: 2500,    // Ring 3
  4: 10000,   // Ring 4 (Rand)
};
```

---

## Prestige Types (`prestige.ts`)

```typescript
/**
 * Prestige-Zustand
 */
export interface PrestigeState {
  /** Anzahl durchgeführter Prestiges */
  prestigeCount: number;
  /** Prestige-Währung ("Prisma-Pixel") */
  prismaPixels: number;
  /** Gesamt verdiente Prisma-Pixel (all-time) */
  totalPrismaEarned: number;
  /** Gekaufte Prestige-Upgrades */
  prestigeUpgrades: PurchasedPrestigeUpgrade[];
}

/**
 * Prestige-Upgrade-Definition
 */
export interface PrestigeUpgradeDefinition {
  id: string;
  nameKey: string;
  descriptionKey: string;
  /** Kosten in Prisma-Pixeln */
  prismaCost: number;
  /** Effekt (ähnlich zu normalen Upgrades) */
  effectType: UpgradeEffectType;
  effectValue: number;
  maxLevel: number;
  icon: string;
}

/**
 * Gekauftes Prestige-Upgrade
 */
export interface PurchasedPrestigeUpgrade {
  upgradeId: string;
  level: number;
}

/**
 * Prestige-Berechnung
 *
 * Formel: prismaPixels = floor(sqrt(totalEarned / 1_000_000))
 *
 * Beispiele:
 * - 1M Währung = 1 Prisma
 * - 4M Währung = 2 Prisma
 * - 100M Währung = 10 Prisma
 */
export const calculatePrestigeGain = (totalEarned: number): number => {
  return Math.floor(Math.sqrt(totalEarned / 1_000_000));
};
```

---

## Speicher-Format (`storage.ts`)

```typescript
/**
 * LocalStorage-Schlüssel
 */
export const IDLE_PIXEL_STORAGE_KEY = 'spritebox_idle_pixel_save';

/**
 * Gespeicherter Spielzustand
 * (Komprimierte Version von IdlePixelGameState)
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
 * Aktuelle Save-Version
 */
export const IDLE_PIXEL_SAVE_VERSION = 1;
```

---

## Zod Validation Schemas

```typescript
import { z } from 'zod';

export const IdlePixelSchema = z.object({
  id: z.string(),
  colorLevel: z.number().int().min(0).max(14),
  position: z.number().int().min(0).max(63),
  baseProduction: z.number().positive(),
});

export const GridSlotSchema = z.object({
  position: z.number().int().min(0).max(63),
  unlocked: z.boolean(),
  pixel: IdlePixelSchema.nullable(),
});

export const ClickerStateSchema = z.object({
  energyBarCurrent: z.number().min(0),
  energyBarMax: z.number().positive(),
  goldenPixelNextSpawn: z.number(),
  goldenPixelActive: z.boolean(),
  goldenPixelTimeLeft: z.number().min(0),
});

export const IdlePixelGameStateSchema = z.object({
  currency: z.number().min(0),
  grid: z.array(GridSlotSchema).length(64),
  upgrades: z.array(z.object({
    upgradeId: z.string(),
    level: z.number().int().min(0),
    lastPurchased: z.number(),
  })),
  stats: z.object({
    totalEarned: z.number().min(0),
    pixelsPurchased: z.number().int().min(0),
    mergesPerformed: z.number().int().min(0),
    highestColorLevel: z.number().int().min(0).max(14),
    totalClicks: z.number().int().min(0),
    playTime: z.number().min(0),
  }),
  clicker: ClickerStateSchema,
  prestige: z.object({
    prestigeCount: z.number().int().min(0),
    prismaPixels: z.number().min(0),
    totalPrismaEarned: z.number().min(0),
    prestigeUpgrades: z.array(z.object({
      upgradeId: z.string(),
      level: z.number().int().min(0),
    })),
  }),
  lastSaved: z.number(),
  lastTick: z.number(),
});
```

---

## Implementierungs-Checkliste

- [ ] Types in `packages/types/src/modes/idle-pixel/` erstellen
- [ ] Barrel-Export in `packages/types/src/index.ts` hinzufügen
- [ ] Zod-Schemas für Validierung
- [ ] Grid-Utility-Funktionen
- [ ] Default-Werte für neues Spiel
