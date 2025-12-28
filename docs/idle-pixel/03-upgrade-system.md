# Phase 3: Upgrade-System

> Dynamisches, erweiterbares Upgrade-System

## Design-Prinzipien

1. **Daten-getrieben**: Upgrades werden durch Definitionen beschrieben, nicht durch Code
2. **Erweiterbar**: Neue Upgrades hinzufügen = neue Definition hinzufügen
3. **Komposierbar**: Effekte können kombiniert werden
4. **Typsicher**: Volle TypeScript-Unterstützung

---

## Architektur

```
┌─────────────────────────────────────────────────────────────┐
│                      UPGRADE REGISTRY                        │
│  ┌─────────────────────────────────────────────────────────┐│
│  │  UpgradeDefinition[]                                    ││
│  │  - ID, Name, Beschreibung                               ││
│  │  - Kategorie, Effekt-Typ, Effekt-Wert                   ││
│  │  - Kosten, Max-Level, Voraussetzungen                   ││
│  └─────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                      UPGRADE ENGINE                          │
│  ┌───────────────┐  ┌───────────────┐  ┌─────────────────┐ │
│  │ canPurchase() │  │  purchase()   │  │ calculateEffects│ │
│  └───────────────┘  └───────────────┘  └─────────────────┘ │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                     EFFECT CALCULATOR                        │
│  Sammelt alle aktiven Effekte und berechnet finale Werte   │
└─────────────────────────────────────────────────────────────┘
```

---

## Upgrade-Definitionen (5 Basis-Upgrades)

```typescript
/**
 * Alle verfügbaren Upgrades
 */
export const UPGRADE_DEFINITIONS: UpgradeDefinition[] = [
  // ═══════════════════════════════════════════════════════════
  // PRODUKTION
  // ═══════════════════════════════════════════════════════════
  {
    id: 'prod_multiplier',
    nameKey: 'idlePixel.upgrades.prodMultiplier.name',
    descriptionKey: 'idlePixel.upgrades.prodMultiplier.description',
    category: 'production',
    effectType: 'multiply_production',
    effectValue: 1.25, // +25% pro Level
    baseCost: 100,
    costMultiplier: 2.0,
    maxLevel: 0, // Unbegrenzt
    icon: '⚡',
  },

  // ═══════════════════════════════════════════════════════════
  // WIRTSCHAFT
  // ═══════════════════════════════════════════════════════════
  {
    id: 'cheaper_pixels',
    nameKey: 'idlePixel.upgrades.cheaperPixels.name',
    descriptionKey: 'idlePixel.upgrades.cheaperPixels.description',
    category: 'economy',
    effectType: 'reduce_pixel_cost',
    effectValue: 0.9, // -10% Kosten pro Level
    baseCost: 500,
    costMultiplier: 2.5,
    maxLevel: 10,
    icon: '💰',
  },

  {
    id: 'better_pixels',
    nameKey: 'idlePixel.upgrades.betterPixels.name',
    descriptionKey: 'idlePixel.upgrades.betterPixels.description',
    category: 'economy',
    effectType: 'increase_base_pixel_level',
    effectValue: 1, // +1 Farbstufe pro Level
    baseCost: 10000,
    costMultiplier: 10.0, // Sehr teuer!
    maxLevel: 5, // Max +5 Stufen
    icon: '⬆️',
  },

  // ═══════════════════════════════════════════════════════════
  // CLICKER
  // ═══════════════════════════════════════════════════════════
  {
    id: 'energy_capacity',
    nameKey: 'idlePixel.upgrades.energyCapacity.name',
    descriptionKey: 'idlePixel.upgrades.energyCapacity.description',
    category: 'clicker',
    effectType: 'energy_bar_capacity',
    effectValue: 1.5, // +50% Kapazität pro Level
    baseCost: 200,
    costMultiplier: 1.8,
    maxLevel: 20,
    icon: '🔋',
  },

  {
    id: 'golden_frequency',
    nameKey: 'idlePixel.upgrades.goldenFrequency.name',
    descriptionKey: 'idlePixel.upgrades.goldenFrequency.description',
    category: 'clicker',
    effectType: 'golden_pixel_frequency',
    effectValue: 0.85, // -15% Wartezeit pro Level
    baseCost: 1000,
    costMultiplier: 3.0,
    maxLevel: 10,
    icon: '⭐',
  },
];

/**
 * Schneller Zugriff per ID
 */
export const UPGRADES_BY_ID = new Map(
  UPGRADE_DEFINITIONS.map(u => [u.id, u])
);
```

---

## Upgrade-Engine

```typescript
/**
 * Upgrade-Verwaltung und Berechnung
 */
export class UpgradeEngine {
  /**
   * Prüft, ob ein Upgrade gekauft werden kann
   */
  canPurchase(
    state: IdlePixelGameState,
    upgradeId: string
  ): { canBuy: boolean; reason?: string } {
    const definition = UPGRADES_BY_ID.get(upgradeId);
    if (!definition) {
      return { canBuy: false, reason: 'Upgrade nicht gefunden' };
    }

    const currentLevel = this.getLevel(state, upgradeId);

    // Max-Level erreicht?
    if (definition.maxLevel > 0 && currentLevel >= definition.maxLevel) {
      return { canBuy: false, reason: 'Maximum erreicht' };
    }

    // Voraussetzung erfüllt?
    if (definition.requires) {
      const requiredLevel = this.getLevel(state, definition.requires);
      if (requiredLevel === 0) {
        const requiredDef = UPGRADES_BY_ID.get(definition.requires);
        return {
          canBuy: false,
          reason: `Benötigt: ${requiredDef?.nameKey ?? definition.requires}`
        };
      }
    }

    // Genug Währung?
    const cost = this.getCost(state, upgradeId);
    if (state.currency < cost) {
      return { canBuy: false, reason: 'Nicht genug Pixel' };
    }

    return { canBuy: true };
  }

  /**
   * Berechnet den Kaufpreis für das nächste Level
   */
  getCost(state: IdlePixelGameState, upgradeId: string): number {
    const definition = UPGRADES_BY_ID.get(upgradeId);
    if (!definition) return Infinity;

    const currentLevel = this.getLevel(state, upgradeId);
    return Math.floor(
      definition.baseCost * Math.pow(definition.costMultiplier, currentLevel)
    );
  }

  /**
   * Gibt das aktuelle Level eines Upgrades zurück
   */
  getLevel(state: IdlePixelGameState, upgradeId: string): number {
    const purchased = state.upgrades.find(u => u.upgradeId === upgradeId);
    return purchased?.level ?? 0;
  }

  /**
   * Kauft ein Upgrade
   */
  purchase(
    state: IdlePixelGameState,
    upgradeId: string
  ): IdlePixelGameState | null {
    const { canBuy } = this.canPurchase(state, upgradeId);
    if (!canBuy) return null;

    const cost = this.getCost(state, upgradeId);
    const currentLevel = this.getLevel(state, upgradeId);

    // Upgrade-Liste aktualisieren
    const existingIndex = state.upgrades.findIndex(u => u.upgradeId === upgradeId);
    const newUpgrades = [...state.upgrades];

    if (existingIndex >= 0) {
      newUpgrades[existingIndex] = {
        ...newUpgrades[existingIndex],
        level: currentLevel + 1,
        lastPurchased: Date.now(),
      };
    } else {
      newUpgrades.push({
        upgradeId,
        level: 1,
        lastPurchased: Date.now(),
      });
    }

    return {
      ...state,
      currency: state.currency - cost,
      upgrades: newUpgrades,
    };
  }

  /**
   * Berechnet alle aktiven Effekte eines Typs
   */
  calculateEffect(
    state: IdlePixelGameState,
    effectType: UpgradeEffectType
  ): number {
    let totalEffect = 1; // Basis-Multiplikator

    for (const purchased of state.upgrades) {
      const definition = UPGRADES_BY_ID.get(purchased.upgradeId);
      if (!definition || definition.effectType !== effectType) continue;

      // Effekt pro Level anwenden
      for (let i = 0; i < purchased.level; i++) {
        totalEffect *= definition.effectValue;
      }
    }

    // Prestige-Effekte hinzufügen
    totalEffect *= this.getPrestigeEffect(state, effectType);

    return totalEffect;
  }

  /**
   * Prestige-Bonus für einen Effekt-Typ
   */
  private getPrestigeEffect(
    state: IdlePixelGameState,
    effectType: UpgradeEffectType
  ): number {
    // TODO: Prestige-Upgrades integrieren
    return 1;
  }
}

// Singleton-Instanz
export const upgradeEngine = new UpgradeEngine();
```

---

## Effekt-Integration in Core Systems

### Produktions-System

```typescript
function calculateTotalProduction(state: IdlePixelGameState): number {
  const baseProduction = getGridBaseProduction(state);

  // Upgrade-Effekte abrufen
  const prodMultiplier = upgradeEngine.calculateEffect(state, 'multiply_production');
  const colorBonus = upgradeEngine.calculateEffect(state, 'multiply_color_level');

  return baseProduction * prodMultiplier * colorBonus;
}
```

### Pixel-Kauf-System

```typescript
function calculatePixelCost(state: IdlePixelGameState): number {
  const baseCost = PIXEL_BASE_COST * Math.pow(
    PIXEL_COST_MULTIPLIER,
    state.stats.pixelsPurchased
  );

  // Kosten-Reduktion aus Upgrades
  const costMultiplier = upgradeEngine.calculateEffect(state, 'reduce_pixel_cost');

  return Math.floor(baseCost * costMultiplier);
}

function getNewPixelColorLevel(state: IdlePixelGameState): number {
  // Basis-Level aus Upgrades
  let level = 0;

  const betterPixelsLevel = upgradeEngine.getLevel(state, 'better_pixels');
  level += betterPixelsLevel;

  return Math.min(level, 14); // Max: Rosa
}
```

### Clicker-System

```typescript
function getEnergyBarMax(state: IdlePixelGameState): number {
  const baseCapacity = 100;
  const capacityMultiplier = upgradeEngine.calculateEffect(state, 'energy_bar_capacity');

  return Math.floor(baseCapacity * capacityMultiplier);
}

function getGoldenPixelInterval(state: IdlePixelGameState): number {
  const baseInterval = 60000; // 60 Sekunden
  const frequencyMultiplier = upgradeEngine.calculateEffect(state, 'golden_pixel_frequency');

  return Math.floor(baseInterval * frequencyMultiplier);
}
```

---

## UI-Integration

### Upgrade-Liste Komponente

```svelte
<!-- UpgradeList.svelte -->
<script lang="ts">
  import { upgradeEngine, UPGRADE_DEFINITIONS } from '$lib/idle-pixel/upgrades';
  import type { IdlePixelGameState, UpgradeCategory } from '@spritebox/types';

  interface Props {
    state: IdlePixelGameState;
    onPurchase: (upgradeId: string) => void;
  }

  let { state, onPurchase }: Props = $props();

  // Gruppiert nach Kategorie
  const groupedUpgrades = $derived(() => {
    const groups: Record<UpgradeCategory, typeof UPGRADE_DEFINITIONS> = {
      production: [],
      economy: [],
      grid: [],
      clicker: [],
    };

    for (const def of UPGRADE_DEFINITIONS) {
      groups[def.category].push(def);
    }

    return groups;
  });
</script>

{#each Object.entries(groupedUpgrades) as [category, upgrades]}
  <div class="upgrade-category">
    <h3>{category}</h3>

    {#each upgrades as upgrade}
      {@const level = upgradeEngine.getLevel(state, upgrade.id)}
      {@const cost = upgradeEngine.getCost(state, upgrade.id)}
      {@const { canBuy, reason } = upgradeEngine.canPurchase(state, upgrade.id)}

      <button
        class="upgrade-item"
        class:disabled={!canBuy}
        onclick={() => canBuy && onPurchase(upgrade.id)}
        title={reason}
      >
        <span class="icon">{upgrade.icon}</span>
        <span class="name">{$t[upgrade.nameKey]}</span>
        <span class="level">Lv.{level}</span>
        <span class="cost">{formatNumber(cost)} Pixel</span>
      </button>
    {/each}
  </div>
{/each}
```

---

## Upgrade-Erweiterung (Beispiele für später)

```typescript
/**
 * Weitere Upgrades, die später hinzugefügt werden können
 */
const FUTURE_UPGRADES: UpgradeDefinition[] = [
  // Grid-Upgrades
  {
    id: 'auto_merge_speed',
    nameKey: 'idlePixel.upgrades.autoMergeSpeed.name',
    descriptionKey: 'idlePixel.upgrades.autoMergeSpeed.description',
    category: 'grid',
    effectType: 'auto_merge_speed',
    effectValue: 1.2,
    baseCost: 5000,
    costMultiplier: 2.0,
    maxLevel: 10,
    icon: '🔄',
  },

  // Synergie-Upgrades
  {
    id: 'color_synergy',
    nameKey: 'idlePixel.upgrades.colorSynergy.name',
    descriptionKey: 'idlePixel.upgrades.colorSynergy.description',
    category: 'production',
    effectType: 'multiply_color_level',
    effectValue: 1.1,
    baseCost: 2000,
    costMultiplier: 2.5,
    maxLevel: 15,
    requires: 'prod_multiplier', // Voraussetzung!
    icon: '🌈',
  },

  // Click-Upgrades
  {
    id: 'click_value',
    nameKey: 'idlePixel.upgrades.clickValue.name',
    descriptionKey: 'idlePixel.upgrades.clickValue.description',
    category: 'clicker',
    effectType: 'click_value',
    effectValue: 1.5,
    baseCost: 300,
    costMultiplier: 1.5,
    maxLevel: 50,
    icon: '👆',
  },

  // Auto-Buyer
  {
    id: 'auto_buyer',
    nameKey: 'idlePixel.upgrades.autoBuyer.name',
    descriptionKey: 'idlePixel.upgrades.autoBuyer.description',
    category: 'economy',
    effectType: 'auto_buyer_interval',
    effectValue: 0.9, // -10% Interval pro Level
    baseCost: 50000,
    costMultiplier: 5.0,
    maxLevel: 5,
    requires: 'cheaper_pixels',
    icon: '🤖',
  },
];
```

---

## "Bessere Pixel" Upgrade - Balancing

Das "bessere Pixel" Upgrade ist besonders wichtig. Hier die Kosten-Analyse:

```
Annahme: Spieler hat 1000 Pixel gekauft bei Basis-Preis

Pixel-Kosten-Summe bis Kauf N:
- Formel: Σ(10 × 1.15^n) für n=0 bis N-1
- Bei N=1000: ca. 2.6 × 10^64 Pixel investiert

"Bessere Pixel" Level 1:
- Neue Pixel starten bei Stufe 1 statt 0
- Effektive Ersparnis: 50% weniger Käufe für gleiche Produktion
- Kosten sollten ~50% der bisherigen Investition sein

Empfohlene Kosten-Staffelung:
- Level 1: 10,000 (früher Bonus)
- Level 2: 100,000
- Level 3: 1,000,000
- Level 4: 10,000,000
- Level 5: 100,000,000

Mit costMultiplier=10 und baseCost=10,000:
- Level 1: 10,000
- Level 2: 100,000
- Level 3: 1,000,000
- Level 4: 10,000,000
- Level 5: 100,000,000 ✓
```

---

## Implementierungs-Checkliste

- [ ] `UpgradeEngine` Klasse
- [ ] 5 Basis-Upgrade-Definitionen
- [ ] Integration in Produktions-System
- [ ] Integration in Pixel-Kauf-System
- [ ] Integration in Clicker-System
- [ ] `UpgradeList.svelte` Komponente
- [ ] `UpgradeItem.svelte` Komponente
- [ ] i18n-Texte für alle Upgrades
- [ ] Kosten-Berechnung und Anzeige
- [ ] Unit Tests für UpgradeEngine
