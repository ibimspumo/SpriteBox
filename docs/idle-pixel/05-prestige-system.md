# Phase 5: Prestige-System

> Reset-Mechanik für langfristigen Fortschritt

## Konzept

### Was ist Prestige?

Prestige ist ein Meta-Fortschritt-System:

1. Spieler spielt das Spiel, sammelt Währung
2. Bei genug Fortschritt: **Prestige verfügbar**
3. Prestige resettet das Spiel, gibt aber **Prisma-Pixel**
4. Prisma-Pixel kaufen permanente Boni
5. Neuer Durchlauf startet schneller dank Boni

```
┌─────────────────────────────────────────────────────────┐
│                    PRESTIGE FLOW                         │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  Spielen → Fortschritt → Prestige → Permanente Boni     │
│     ↑                                      │             │
│     └──────────────────────────────────────┘             │
│              (Neuer Durchlauf mit Boni)                  │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

---

## Prisma-Pixel Berechnung

### Formel

```typescript
/**
 * Berechnet die erhaltenen Prisma-Pixel bei Prestige
 *
 * Formel: floor(sqrt(totalEarned / 1,000,000))
 *
 * Beispiele:
 * - 1M Währung → 1 Prisma
 * - 4M Währung → 2 Prisma
 * - 9M Währung → 3 Prisma
 * - 100M Währung → 10 Prisma
 * - 1B Währung → 31 Prisma
 */
export function calculatePrestigeGain(totalEarned: number): number {
  return Math.floor(Math.sqrt(totalEarned / 1_000_000));
}

/**
 * Berechnet benötigte Währung für N Prisma
 */
export function currencyForPrisma(prisma: number): number {
  return prisma * prisma * 1_000_000;
}
```

### Progression-Tabelle

| Gesamt-Währung | Prisma-Pixel | Nächstes Prisma bei |
|----------------|--------------|---------------------|
| 1,000,000 | 1 | 4,000,000 |
| 4,000,000 | 2 | 9,000,000 |
| 9,000,000 | 3 | 16,000,000 |
| 16,000,000 | 4 | 25,000,000 |
| 25,000,000 | 5 | 36,000,000 |
| 100,000,000 | 10 | 121,000,000 |
| 1,000,000,000 | 31 | 1,024,000,000 |

---

## Was wird resettet?

### Resettet (zurückgesetzt)

- Pixel-Währung → 0
- Grid → Start-Zustand (2×2, ein schwarzer Pixel)
- Normale Upgrades → Level 0
- Stats → Nur "totalEarned" und "playTime" werden übertragen

### Behalten (permanent)

- Prisma-Pixel (Prestige-Währung)
- Prestige-Upgrades (gekauft mit Prisma)
- Prestige-Zähler
- All-Time Statistiken

---

## Prestige-Upgrades

### Definitionen

```typescript
/**
 * Prestige-Upgrade-Definitionen
 */
export const PRESTIGE_UPGRADE_DEFINITIONS: PrestigeUpgradeDefinition[] = [
  {
    id: 'prisma_production',
    nameKey: 'idlePixel.prestige.production.name',
    descriptionKey: 'idlePixel.prestige.production.description',
    prismaCost: 1,
    effectType: 'multiply_production',
    effectValue: 2.0, // 2× Produktion pro Level
    maxLevel: 10,
    icon: '💎',
  },

  {
    id: 'prisma_start_currency',
    nameKey: 'idlePixel.prestige.startCurrency.name',
    descriptionKey: 'idlePixel.prestige.startCurrency.description',
    prismaCost: 2,
    effectType: 'start_currency_bonus',
    effectValue: 1000, // +1000 Start-Währung pro Level
    maxLevel: 20,
    icon: '🎁',
  },

  {
    id: 'prisma_unlock_slots',
    nameKey: 'idlePixel.prestige.unlockSlots.name',
    descriptionKey: 'idlePixel.prestige.unlockSlots.description',
    prismaCost: 5,
    effectType: 'start_unlocked_slots',
    effectValue: 4, // +4 freigeschaltete Slots pro Level
    maxLevel: 10, // Max +40 Slots (fast volles Grid)
    icon: '📐',
  },

  {
    id: 'prisma_golden_bonus',
    nameKey: 'idlePixel.prestige.goldenBonus.name',
    descriptionKey: 'idlePixel.prestige.goldenBonus.description',
    prismaCost: 3,
    effectType: 'golden_pixel_value',
    effectValue: 1.5, // +50% Golden-Pixel-Bonus pro Level
    maxLevel: 10,
    icon: '⭐',
  },

  {
    id: 'prisma_base_pixel',
    nameKey: 'idlePixel.prestige.basePixel.name',
    descriptionKey: 'idlePixel.prestige.basePixel.description',
    prismaCost: 10,
    effectType: 'increase_base_pixel_level',
    effectValue: 1, // +1 Start-Pixel-Stufe pro Level
    maxLevel: 5,
    icon: '⬆️',
  },
];

export const PRESTIGE_UPGRADES_BY_ID = new Map(
  PRESTIGE_UPGRADE_DEFINITIONS.map(u => [u.id, u])
);
```

---

## Prestige-Engine

```typescript
/**
 * Prestige-System-Verwaltung
 */
export class PrestigeEngine {
  /**
   * Prüft, ob Prestige verfügbar ist
   */
  canPrestige(state: IdlePixelGameState): boolean {
    const potentialGain = calculatePrestigeGain(state.stats.totalEarned);
    return potentialGain > 0;
  }

  /**
   * Berechnet den aktuellen Prestige-Gewinn
   */
  getPrestigeGain(state: IdlePixelGameState): number {
    return calculatePrestigeGain(state.stats.totalEarned);
  }

  /**
   * Berechnet Währung bis zum nächsten Prisma
   */
  getCurrencyToNextPrisma(state: IdlePixelGameState): number {
    const currentPrisma = calculatePrestigeGain(state.stats.totalEarned);
    const nextPrismaRequirement = currencyForPrisma(currentPrisma + 1);
    return Math.max(0, nextPrismaRequirement - state.stats.totalEarned);
  }

  /**
   * Führt Prestige durch
   */
  performPrestige(state: IdlePixelGameState): IdlePixelGameState {
    const prismaGain = this.getPrestigeGain(state);

    if (prismaGain <= 0) {
      throw new Error('Cannot prestige without earning prisma');
    }

    // Neuer Start-Zustand mit Prestige-Boni
    const newState = createNewGameState();

    // Prestige-Daten übertragen
    newState.prestige = {
      prestigeCount: state.prestige.prestigeCount + 1,
      prismaPixels: state.prestige.prismaPixels + prismaGain,
      totalPrismaEarned: state.prestige.totalPrismaEarned + prismaGain,
      prestigeUpgrades: [...state.prestige.prestigeUpgrades],
    };

    // Start-Boni anwenden
    newState.currency = this.getStartCurrency(newState);
    newState.grid = this.applyStartSlots(newState);

    return newState;
  }

  /**
   * Berechnet Start-Währung basierend auf Prestige-Upgrades
   */
  private getStartCurrency(state: IdlePixelGameState): number {
    const upgrade = state.prestige.prestigeUpgrades.find(
      u => u.upgradeId === 'prisma_start_currency'
    );

    const level = upgrade?.level ?? 0;
    return level * 1000;
  }

  /**
   * Wendet Start-Slot-Boni an
   */
  private applyStartSlots(state: IdlePixelGameState): GridSlot[] {
    const upgrade = state.prestige.prestigeUpgrades.find(
      u => u.upgradeId === 'prisma_unlock_slots'
    );

    const bonusSlots = (upgrade?.level ?? 0) * 4;
    const grid = [...state.grid];

    // Zusätzliche Slots freischalten (spiralförmig vom Zentrum)
    const slotsToUnlock = this.getUnlockOrder().slice(0, 4 + bonusSlots);

    for (const pos of slotsToUnlock) {
      grid[pos] = { ...grid[pos], unlocked: true };
    }

    return grid;
  }

  /**
   * Reihenfolge der Slot-Freischaltung (spiralförmig)
   */
  private getUnlockOrder(): number[] {
    // Start mit 2x2 Mitte, dann spiralförmig nach außen
    return [
      27, 28, 35, 36, // Ring 0 (Start)
      19, 20, 26, 29, 34, 37, 43, 44, // Ring 1
      10, 11, 12, 18, 21, 25, 30, 33, 38, 42, 45, 51, 52, 53, // Ring 2
      // ... weitere Ringe
    ];
  }

  /**
   * Kauft ein Prestige-Upgrade
   */
  purchasePrestigeUpgrade(
    state: IdlePixelGameState,
    upgradeId: string
  ): IdlePixelGameState | null {
    const definition = PRESTIGE_UPGRADES_BY_ID.get(upgradeId);
    if (!definition) return null;

    const currentLevel = this.getPrestigeUpgradeLevel(state, upgradeId);

    // Max erreicht?
    if (currentLevel >= definition.maxLevel) return null;

    // Kosten berechnen (steigen pro Level)
    const cost = definition.prismaCost * (currentLevel + 1);

    // Genug Prisma?
    if (state.prestige.prismaPixels < cost) return null;

    // Upgrade kaufen
    const existingIndex = state.prestige.prestigeUpgrades.findIndex(
      u => u.upgradeId === upgradeId
    );

    const newUpgrades = [...state.prestige.prestigeUpgrades];

    if (existingIndex >= 0) {
      newUpgrades[existingIndex] = {
        ...newUpgrades[existingIndex],
        level: currentLevel + 1,
      };
    } else {
      newUpgrades.push({ upgradeId, level: 1 });
    }

    return {
      ...state,
      prestige: {
        ...state.prestige,
        prismaPixels: state.prestige.prismaPixels - cost,
        prestigeUpgrades: newUpgrades,
      },
    };
  }

  /**
   * Gibt das Level eines Prestige-Upgrades zurück
   */
  getPrestigeUpgradeLevel(state: IdlePixelGameState, upgradeId: string): number {
    const upgrade = state.prestige.prestigeUpgrades.find(
      u => u.upgradeId === upgradeId
    );
    return upgrade?.level ?? 0;
  }

  /**
   * Berechnet den Gesamt-Produktions-Multiplikator aus Prestige
   */
  getPrestigeProductionMultiplier(state: IdlePixelGameState): number {
    const upgrade = state.prestige.prestigeUpgrades.find(
      u => u.upgradeId === 'prisma_production'
    );

    const level = upgrade?.level ?? 0;
    return Math.pow(2, level); // 2^level
  }
}

export const prestigeEngine = new PrestigeEngine();
```

---

## UI-Komponenten

### Prestige-Button

```svelte
<!-- PrestigeButton.svelte -->
<script lang="ts">
  import { prestigeEngine, calculatePrestigeGain } from '$lib/idle-pixel/prestige';
  import { formatNumber } from '$lib/utils';
  import type { IdlePixelGameState } from '@spritebox/types';

  interface Props {
    state: IdlePixelGameState;
    onPrestige: () => void;
  }

  let { state, onPrestige }: Props = $props();

  const canPrestige = $derived(prestigeEngine.canPrestige(state));
  const prismaGain = $derived(prestigeEngine.getPrestigeGain(state));
  const toNextPrisma = $derived(prestigeEngine.getCurrencyToNextPrisma(state));

  let showConfirm = $state(false);
</script>

<div class="prestige-container">
  {#if canPrestige}
    <button class="prestige-button" onclick={() => showConfirm = true}>
      <span class="icon">💎</span>
      <span class="label">{$t.idlePixel.prestige.button}</span>
      <span class="gain">+{prismaGain} Prisma</span>
    </button>
  {:else}
    <div class="prestige-progress">
      <span class="label">{$t.idlePixel.prestige.nextAt}</span>
      <span class="value">{formatNumber(toNextPrisma)}</span>
    </div>
  {/if}
</div>

{#if showConfirm}
  <div class="confirm-modal">
    <div class="confirm-content">
      <h3>{$t.idlePixel.prestige.confirmTitle}</h3>
      <p>{$t.idlePixel.prestige.confirmText}</p>

      <div class="gain-preview">
        <span class="icon">💎</span>
        <span class="amount">+{prismaGain}</span>
      </div>

      <div class="buttons">
        <button class="cancel" onclick={() => showConfirm = false}>
          {$t.common.cancel}
        </button>
        <button class="confirm" onclick={() => { onPrestige(); showConfirm = false; }}>
          {$t.idlePixel.prestige.confirm}
        </button>
      </div>
    </div>
  </div>
{/if}
```

### Prestige-Upgrade-Shop

```svelte
<!-- PrestigeShop.svelte -->
<script lang="ts">
  import {
    prestigeEngine,
    PRESTIGE_UPGRADE_DEFINITIONS
  } from '$lib/idle-pixel/prestige';
  import { formatNumber } from '$lib/utils';
  import type { IdlePixelGameState } from '@spritebox/types';

  interface Props {
    state: IdlePixelGameState;
    onPurchase: (upgradeId: string) => void;
  }

  let { state, onPurchase }: Props = $props();
</script>

<div class="prestige-shop">
  <div class="header">
    <h2>{$t.idlePixel.prestige.shopTitle}</h2>
    <div class="prisma-balance">
      <span class="icon">💎</span>
      <span class="amount">{formatNumber(state.prestige.prismaPixels)}</span>
    </div>
  </div>

  <div class="upgrade-grid">
    {#each PRESTIGE_UPGRADE_DEFINITIONS as upgrade}
      {@const level = prestigeEngine.getPrestigeUpgradeLevel(state, upgrade.id)}
      {@const cost = upgrade.prismaCost * (level + 1)}
      {@const canBuy = state.prestige.prismaPixels >= cost && level < upgrade.maxLevel}
      {@const maxed = level >= upgrade.maxLevel}

      <button
        class="prestige-upgrade"
        class:disabled={!canBuy}
        class:maxed
        onclick={() => canBuy && onPurchase(upgrade.id)}
      >
        <span class="icon">{upgrade.icon}</span>
        <span class="name">{$t[upgrade.nameKey]}</span>
        <span class="level">Lv.{level}/{upgrade.maxLevel}</span>

        {#if !maxed}
          <span class="cost">
            <span class="prisma-icon">💎</span>
            {cost}
          </span>
        {:else}
          <span class="max-label">{$t.idlePixel.prestige.maxed}</span>
        {/if}
      </button>
    {/each}
  </div>
</div>
```

---

## Integration in Core Systems

```typescript
/**
 * Produktions-Berechnung mit Prestige-Bonus
 */
function calculateTotalProduction(state: IdlePixelGameState): number {
  const baseProduction = getGridBaseProduction(state);

  // Normale Upgrades
  const upgradeMultiplier = upgradeEngine.calculateEffect(
    state,
    'multiply_production'
  );

  // Prestige-Bonus
  const prestigeMultiplier = prestigeEngine.getPrestigeProductionMultiplier(state);

  return baseProduction * upgradeMultiplier * prestigeMultiplier;
}
```

---

## Implementierungs-Checkliste

- [ ] `PrestigeEngine` Klasse
- [ ] Prestige-Upgrade-Definitionen
- [ ] Prestige-Berechnung (Prisma-Gain)
- [ ] Reset-Logik mit Bonus-Anwendung
- [ ] `PrestigeButton.svelte` Komponente
- [ ] `PrestigeShop.svelte` Komponente
- [ ] Bestätigungs-Modal
- [ ] Integration in Produktions-System
- [ ] i18n-Texte
- [ ] Unit Tests
