// packages/types/src/modes/idle-pixel/upgrades.ts
// Upgrade system types for Idle Pixel

/**
 * Upgrade-Kategorie
 */
export type UpgradeCategory =
  | 'production' // Produktions-Multiplikatoren
  | 'economy' // Kaufpreis-Reduktion, Merge-Bonus
  | 'grid' // Grid-Erweiterung
  | 'clicker'; // Klick-Verstärkung

/**
 * Upgrade-Effekt-Typ
 */
export type UpgradeEffectType =
  | 'multiply_production' // Globaler Produktions-Multiplikator
  | 'multiply_color_level' // Bonus pro Farbstufe
  | 'reduce_pixel_cost' // Pixel-Kaufpreis reduzieren
  | 'increase_merge_bonus' // Merge gibt mehr Wert
  | 'unlock_grid_slot' // Grid-Slot freischalten
  | 'increase_base_pixel_level' // Gekaufte Pixel starten höher
  | 'energy_bar_capacity' // Energie-Balken vergrößern
  | 'energy_bar_fill_rate' // Energie-Balken füllt schneller
  | 'click_value' // Klick gibt mehr Währung
  | 'golden_pixel_frequency' // Goldener Pixel erscheint öfter
  | 'golden_pixel_value' // Goldener Pixel gibt mehr
  // Merge-Unlock-System
  | 'unlock_auto_merge_level' // Schaltet Auto-Merge für höhere Level frei (Currency)
  | 'prisma_merge_unlock' // Erhöht max Auto-Merge-Level um 1 (Prestige)
  // Prestige-spezifische Effekte
  | 'start_currency_bonus' // Startwährung nach Prestige
  | 'start_unlocked_slots'; // Freigeschaltete Slots nach Prestige

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

/**
 * Berechnet den Preis für das nächste Level eines Upgrades
 */
export const calculateUpgradeCost = (
  definition: UpgradeDefinition,
  currentLevel: number
): number => {
  return Math.floor(
    definition.baseCost * Math.pow(definition.costMultiplier, currentLevel)
  );
};

/**
 * Berechnet den Gesamteffekt eines Upgrades basierend auf Level
 * Bei multiplikativen Effekten: effectValue ^ level
 * Bei additiven Effekten: effectValue * level
 */
export const calculateUpgradeEffect = (
  definition: UpgradeDefinition,
  level: number
): number => {
  // Multiplikative Effekte
  if (
    definition.effectType === 'multiply_production' ||
    definition.effectType === 'multiply_color_level' ||
    definition.effectType === 'reduce_pixel_cost'
  ) {
    return Math.pow(definition.effectValue, level);
  }
  // Additive Effekte
  return definition.effectValue * level;
};
