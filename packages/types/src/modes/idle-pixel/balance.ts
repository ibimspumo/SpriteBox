// packages/types/src/modes/idle-pixel/balance.ts
// Centralized balancing constants for Idle Pixel game mode
// All game values and formulas in one place for easy tuning

/**
 * BALANCE - Alle Balance-Konstanten an einem Ort
 *
 * Dieses Objekt enthält alle Spielwerte, die das Balancing beeinflussen.
 * Änderungen hier wirken sich auf das gesamte Spiel aus.
 */
export const BALANCE = {
  // ═══════════════════════════════════════════════════════════════════════════
  // PIXEL PRODUCTION
  // ═══════════════════════════════════════════════════════════════════════════

  /** Basis-Produktionsrate: 2^colorLevel */
  PIXEL_BASE_PRODUCTION: 3,

  /** Merge-Wert-Multiplikator (Merged Pixel = 2× Wert) */
  MERGE_VALUE_MULTIPLIER: 3,

  /** Maximale Farbstufe (0-14, 15 Farben total) */
  MAX_COLOR_LEVEL: 14,

  // ═══════════════════════════════════════════════════════════════════════════
  // PIXEL PURCHASE
  // ═══════════════════════════════════════════════════════════════════════════

  /** Basis-Kosten für den ersten Pixel */
  PIXEL_BASE_COST: 10,

  /** Kosten-Multiplikator pro gekauftem Pixel */
  PIXEL_COST_MULTIPLIER: 1.15,

  // ═══════════════════════════════════════════════════════════════════════════
  // GRID
  // ═══════════════════════════════════════════════════════════════════════════

  /** Grid-Größe (8x8) */
  GRID_SIZE: 8,

  /** Totale Anzahl Slots */
  GRID_TOTAL_SLOTS: 64,

  /** Start-Positionen (2x2 in der Mitte) */
  GRID_START_POSITIONS: [27, 28, 35, 36] as const,

  /** Slot-Kosten (exponentiell basierend auf gekauften Slots) */
  SLOT_BASE_COST: 10_000,
  SLOT_COST_MULTIPLIER: 1.5,

  // ═══════════════════════════════════════════════════════════════════════════
  // ENERGY BAR (Clicker A)
  // ═══════════════════════════════════════════════════════════════════════════

  /** Basis-Kapazität des Energie-Balkens */
  ENERGY_BASE_CAPACITY: 1000,

  /** Füllrate als Prozentsatz der Produktion (25%) */
  ENERGY_FILL_RATE_PERCENT: 0.25,

  // ═══════════════════════════════════════════════════════════════════════════
  // GOLDEN PIXEL (Clicker B)
  // ═══════════════════════════════════════════════════════════════════════════

  /** Basis-Intervall zwischen Spawns (ms) - 60 Sekunden */
  GOLDEN_BASE_INTERVAL_MS: 60_000,

  /** Sichtbarkeitsdauer (ms) - 4 Sekunden */
  GOLDEN_VISIBLE_DURATION_MS: 4_000,

  /** Basis-Bonus-Multiplikator (10× Produktion) */
  GOLDEN_BASE_MULTIPLIER: 30,

  /** Zufällige Varianz für Spawn-Intervall (±50%) */
  GOLDEN_INTERVAL_VARIANCE: 0.5,

  // ═══════════════════════════════════════════════════════════════════════════
  // PRESTIGE
  // ═══════════════════════════════════════════════════════════════════════════

  /** Divisor für Prisma-Berechnung: sqrt(totalEarned / DIVISOR) */
  PRESTIGE_DIVISOR: 1_000_000_000,

  /** Prestige-Count-Bonus: +10% pro Prestige (1.1^prestigeCount) */
  PRESTIGE_COUNT_MULTIPLIER: 1.1,

  /** Prisma-Produktion-Upgrade-Basis: 2^level */
  PRESTIGE_PRODUCTION_BASE: 2,

  /** Golden Pixel Prestige-Upgrade-Basis: 1.5^level */
  PRESTIGE_GOLDEN_BASE: 1.5,

  /** Start-Währung pro Level (+1000) */
  PRESTIGE_START_CURRENCY_PER_LEVEL: 1000,

  /** Zusätzliche Slots pro Level (+4) */
  PRESTIGE_SLOTS_PER_LEVEL: 4,

  // ═══════════════════════════════════════════════════════════════════════════
  // MERGE UNLOCK SYSTEM
  // Level 1-7: Gratis, Level 8-10: Currency-Upgrades, Level 11+: Prestige
  // ═══════════════════════════════════════════════════════════════════════════

  /** Maximales Auto-Merge-Level ohne Upgrades */
  DEFAULT_MAX_MERGE_LEVEL: 7,

  /** Kosten für Merge-Unlock-Upgrades (Currency) */
  MERGE_UNLOCK_COSTS: {
    8: 10_000_000,           // 1M für Level 8
    9: 10_000_000_000,       // 1B für Level 9
    10: 10_000_000_000_000,  // 1T für Level 10
  } as Record<number, number>,

  /** Prisma-Kosten pro +1 Max-Merge-Level (für Level 11+) */
  PRISMA_MERGE_UNLOCK_COST: 15,

  // ═══════════════════════════════════════════════════════════════════════════
  // OFFLINE PROGRESSION
  // ═══════════════════════════════════════════════════════════════════════════

  /** Maximale Offline-Zeit in Sekunden (24 Stunden) */
  OFFLINE_MAX_SECONDS: 24 * 60 * 60,

  /** Offline-Effizienz (50%) */
  OFFLINE_EFFICIENCY: 0.5,

  /** Auto-Save Intervall in ms (30 Sekunden) */
  AUTO_SAVE_INTERVAL_MS: 30_000,

  // ═══════════════════════════════════════════════════════════════════════════
  // BASE UPGRADES
  // Kosten und Effekte für die 5 Basis-Upgrades
  // ═══════════════════════════════════════════════════════════════════════════

  UPGRADES: {
    /** Produktions-Multiplikator: +25% pro Level */
    prod_multiplier: {
      baseCost: 100,
      costMultiplier: 2.0,
      effectValue: 1.25,
      maxLevel: 0, // Unbegrenzt
    },
    /** Günstigere Pixel: -10% Kosten pro Level */
    cheaper_pixels: {
      baseCost: 5000,
      costMultiplier: 2.5,
      effectValue: 0.9,
      maxLevel: 10,
    },
    /** Bessere Pixel: +1 Basis-Stufe pro Level */
    better_pixels: {
      baseCost: 10_000,
      costMultiplier: 100.0,
      effectValue: 1,
      maxLevel: 7,
    },
    /** Energie-Kapazität: +50% pro Level */
    energy_capacity: {
      baseCost: 200,
      costMultiplier: 1.8,
      effectValue: 1.5,
      maxLevel: 0,
    },
    /** Golden Pixel Frequenz: -15% Wartezeit pro Level */
    golden_frequency: {
      baseCost: 10000,
      costMultiplier: 3.0,
      effectValue: 0.85,
      maxLevel: 10,
    },
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // PRESTIGE UPGRADES
  // Kosten und Effekte für die 5 Prestige-Upgrades
  // ═══════════════════════════════════════════════════════════════════════════

  PRESTIGE_UPGRADES: {
    /** Prisma-Produktion: 2× pro Level */
    prisma_production: {
      prismaCostPerLevel: 1,
      effectValue: 2.0,
      maxLevel: 10,
    },
    /** Start-Währung: +1000 pro Level */
    prisma_start_currency: {
      prismaCostPerLevel: 2,
      effectValue: 1000,
      maxLevel: 20,
    },
    /** Start-Slots: +4 pro Level */
    prisma_unlock_slots: {
      prismaCostPerLevel: 5,
      effectValue: 4,
      maxLevel: 10,
    },
    /** Golden Bonus: +50% pro Level */
    prisma_golden_bonus: {
      prismaCostPerLevel: 3,
      effectValue: 1.5,
      maxLevel: 10,
    },
    /** Basis-Pixel-Level: +1 pro Level */
    prisma_base_pixel: {
      prismaCostPerLevel: 10,
      effectValue: 1,
      maxLevel: 5,
    },
  },
} as const;

// ═══════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Berechnet die Produktionsrate für eine Farbstufe
 * @param level Farbstufe (0-14)
 * @returns Produktion pro Sekunde
 */
export const getProductionForLevel = (level: number): number => {
  return Math.pow(BALANCE.PIXEL_BASE_PRODUCTION, level);
};

/**
 * Berechnet die Kosten für den nächsten Pixel
 * @param purchaseCount Anzahl bereits gekaufter Pixel
 * @param costReduction Kosten-Reduktion durch Upgrades (default: 1)
 * @returns Kosten für den nächsten Pixel
 */
export const calculatePixelCost = (
  purchaseCount: number,
  costReduction: number = 1
): number => {
  const baseCost =
    BALANCE.PIXEL_BASE_COST *
    Math.pow(BALANCE.PIXEL_COST_MULTIPLIER, purchaseCount);
  return Math.floor(baseCost * costReduction);
};

/**
 * Berechnet die Prisma-Pixel-Belohnung bei Prestige
 * @param totalEarned Gesamt verdiente Währung
 * @returns Anzahl Prisma-Pixel
 */
export const calculatePrestigeGain = (totalEarned: number): number => {
  return Math.floor(Math.sqrt(totalEarned / BALANCE.PRESTIGE_DIVISOR));
};

/**
 * Berechnet wie viel Währung für eine bestimmte Prisma-Anzahl benötigt wird
 * @param prismaCount Gewünschte Prisma-Anzahl
 * @returns Benötigte Gesamt-Währung
 */
export const currencyForPrisma = (prismaCount: number): number => {
  return prismaCount * prismaCount * BALANCE.PRESTIGE_DIVISOR;
};

/**
 * Berechnet den Slot-Kaufpreis basierend auf Anzahl bereits gekaufter Slots
 * Formel: SLOT_BASE_COST * SLOT_COST_MULTIPLIER^slotsPurchased
 * @param slotsPurchased Anzahl bereits gekaufter Slots (0 = erster Kauf)
 * @returns Kaufpreis
 */
export const calculateSlotCost = (slotsPurchased: number): number => {
  return Math.floor(
    BALANCE.SLOT_BASE_COST * Math.pow(BALANCE.SLOT_COST_MULTIPLIER, slotsPurchased)
  );
};

/**
 * Berechnet die Upgrade-Kosten für ein bestimmtes Level
 * @param upgradeId Upgrade-ID
 * @param currentLevel Aktuelles Level
 * @returns Kosten für das nächste Level
 */
export const calculateUpgradeCostFromBalance = (
  upgradeId: keyof typeof BALANCE.UPGRADES,
  currentLevel: number
): number => {
  const upgrade = BALANCE.UPGRADES[upgradeId];
  return Math.floor(
    upgrade.baseCost * Math.pow(upgrade.costMultiplier, currentLevel)
  );
};

/**
 * Berechnet die Prestige-Upgrade-Kosten für ein bestimmtes Level
 * @param upgradeId Prestige-Upgrade-ID
 * @param currentLevel Aktuelles Level
 * @returns Kosten in Prisma-Pixeln
 */
export const calculatePrestigeUpgradeCost = (
  upgradeId: keyof typeof BALANCE.PRESTIGE_UPGRADES,
  currentLevel: number
): number => {
  const upgrade = BALANCE.PRESTIGE_UPGRADES[upgradeId];
  return upgrade.prismaCostPerLevel * (currentLevel + 1);
};

// Type export for BALANCE object
export type BalanceConfig = typeof BALANCE;
