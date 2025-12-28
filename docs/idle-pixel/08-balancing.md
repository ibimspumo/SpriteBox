# Phase 8: Balancing & Formeln

> Alle Spielwerte und Balancing-Parameter

## Übersicht aller Formeln

```
┌─────────────────────────────────────────────────────────────────┐
│                        FORMEL-ÜBERSICHT                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  PRODUKTION                                                      │
│  ├─ Pixel-Basis:       3^colorLevel                             │
│  ├─ Gesamt:            Σ(Pixel) × Upgrades × Prestige           │
│  └─ Merge-Wert:        3× (nicht 2×)                            │
│                                                                  │
│  KOSTEN                                                          │
│  ├─ Pixel-Kauf:        10 × 1.15^purchaseCount                  │
│  ├─ Slot-Kauf:         100-10000 (Ring-basiert)                 │
│  └─ Upgrades:          baseCost × multiplier^level              │
│                                                                  │
│  PRESTIGE                                                        │
│  └─ Prisma-Gain:       floor(sqrt(totalEarned / 1,000,000))     │
│                                                                  │
│  CLICKER                                                         │
│  ├─ Energie-Füllrate:  production × 0.1 × upgrades              │
│  └─ Golden-Bonus:      production × 10 × upgrades               │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 1. Pixel-Produktion

### Basis-Produktion pro Farbstufe

| Stufe | Farbe | Hex | Produktion/Sek | Formel |
|-------|-------|-----|----------------|--------|
| 0 | Schwarz | #000000 | 1 | 3⁰ |
| 1 | Braun | #5c3a21 | 3 | 3¹ |
| 2 | Rot | #ff0000 | 9 | 3² |
| 3 | Orange | #ff8800 | 27 | 3³ |
| 4 | Gelb | #ffff00 | 81 | 3⁴ |
| 5 | Grün | #00ff00 | 243 | 3⁵ |
| 6 | Cyan | #00ffff | 729 | 3⁶ |
| 7 | Hellblau | #0088ff | 2,187 | 3⁷ |
| 8 | Blau | #0000ff | 6,561 | 3⁸ |
| 9 | Violett | #8800ff | 19,683 | 3⁹ |
| 10 | Magenta | #ff00ff | 59,049 | 3¹⁰ |
| 11 | Pink | #ff0088 | 177,147 | 3¹¹ |
| 12 | Grau | #888888 | 531,441 | 3¹² |
| 13 | Hellgrau | #cccccc | 1,594,323 | 3¹³ |
| 14 | Rosa | #ffcccc | 4,782,969 | 3¹⁴ |

### Gesamt-Produktions-Formel

```typescript
function calculateTotalProduction(state: IdlePixelGameState): number {
  // 1. Basis: Summe aller Pixel
  const baseProduction = state.grid
    .filter(slot => slot.pixel)
    .reduce((sum, slot) => sum + slot.pixel!.baseProduction, 0);

  // 2. Upgrade-Multiplikatoren
  const prodUpgrade = upgradeEngine.calculateEffect(state, 'multiply_production');
  // Beispiel: Level 5 = 1.25^5 = 3.05×

  // 3. Prestige-Multiplikator
  const prestigeBonus = prestigeEngine.getPrestigeProductionMultiplier(state);
  // Beispiel: Level 3 = 2^3 = 8×

  // 4. Finale Berechnung
  return baseProduction * prodUpgrade * prestigeBonus;
}
```

---

## 2. Pixel-Kauf-Kosten

### Formel

```
Kosten = BaseCost × Multiplier^PurchaseCount × CostReduction
```

### Parameter

| Parameter | Wert | Beschreibung |
|-----------|------|--------------|
| BaseCost | 10 | Start-Kosten |
| Multiplier | 1.15 | Steigerung pro Kauf |
| CostReduction | 0.9^UpgradeLevel | Durch "Cheaper Pixels" Upgrade |

### Beispiel-Progression

| Kauf # | Kosten (ohne Upgrade) | Mit Upgrade Lv.5 |
|--------|----------------------|------------------|
| 1 | 10 | 6 |
| 10 | 35 | 21 |
| 50 | 1,084 | 642 |
| 100 | 11,739 | 6,951 |
| 200 | 1,377,810 | 815,597 |
| 500 | 1.5B | 889M |
| 1000 | 2.3×10¹⁶ | 1.4×10¹⁶ |

### Code

```typescript
const PIXEL_BASE_COST = 10;
const PIXEL_COST_MULTIPLIER = 1.15;

function calculatePixelCost(state: IdlePixelGameState): number {
  const purchaseCount = state.stats.pixelsPurchased;
  const costReduction = upgradeEngine.calculateEffect(state, 'reduce_pixel_cost');

  return Math.floor(
    PIXEL_BASE_COST *
    Math.pow(PIXEL_COST_MULTIPLIER, purchaseCount) *
    costReduction
  );
}
```

---

## 3. Grid-Slot-Kosten

### Ring-basierte Preise

```
       0  1  2  3  4  5  6  7
     ┌─────────────────────────┐
   0 │ 4  4  4  4  4  4  4  4  │
   1 │ 4  3  3  3  3  3  3  4  │
   2 │ 4  3  2  2  2  2  3  4  │
   3 │ 4  3  2  1  1  2  3  4  │
   4 │ 4  3  2  1  1  2  3  4  │
   5 │ 4  3  2  2  2  2  3  4  │
   6 │ 4  3  3  3  3  3  3  4  │
   7 │ 4  4  4  4  4  4  4  4  │
     └─────────────────────────┘
```

| Ring | Kosten | Anzahl Slots |
|------|--------|--------------|
| 0 (Start) | 0 (gratis) | 4 |
| 1 | 100 | 8 |
| 2 | 500 | 16 |
| 3 | 2,500 | 20 |
| 4 | 10,000 | 16 |
| **Gesamt** | **177,600** | **64** |

### Code

```typescript
const SLOT_RING_COSTS: Record<number, number> = {
  0: 0,      // Start-Slots
  1: 100,
  2: 500,
  3: 2500,
  4: 10000,
};

function getSlotCost(position: number): number {
  const ringDistance = Math.ceil(GridUtils.getRingDistance(position));
  return SLOT_RING_COSTS[ringDistance] ?? SLOT_RING_COSTS[4];
}
```

---

## 4. Upgrade-Kosten

### 5 Basis-Upgrades

| ID | Basis-Kosten | Multiplikator | Max Level | Effekt |
|----|--------------|---------------|-----------|--------|
| `prod_multiplier` | 100 | 2.0× | ∞ | +25% Produktion |
| `cheaper_pixels` | 500 | 2.5× | 10 | -10% Pixelkosten |
| `better_pixels` | 10,000 | 10.0× | 5 | +1 Basis-Stufe |
| `energy_capacity` | 200 | 1.8× | 20 | +50% Energie-Max |
| `golden_frequency` | 1,000 | 3.0× | 10 | -15% Wartezeit |

### Kosten-Tabelle: `prod_multiplier`

| Level | Kosten | Gesamt investiert | Effekt |
|-------|--------|------------------|--------|
| 1 | 100 | 100 | 1.25× |
| 2 | 200 | 300 | 1.56× |
| 3 | 400 | 700 | 1.95× |
| 5 | 1,600 | 3,100 | 3.05× |
| 10 | 51,200 | 102,300 | 9.31× |
| 20 | 52.4M | 104.8M | 86.7× |

### Kosten-Tabelle: `better_pixels`

| Level | Kosten | Neue Basis-Stufe | Basis-Produktion |
|-------|--------|-----------------|------------------|
| 1 | 10,000 | 1 (Braun) | 3/Sek |
| 2 | 100,000 | 2 (Rot) | 9/Sek |
| 3 | 1,000,000 | 3 (Orange) | 27/Sek |
| 4 | 10,000,000 | 4 (Gelb) | 81/Sek |
| 5 | 100,000,000 | 5 (Grün) | 243/Sek |

---

## 5. Clicker-Balancing

### Energie-Balken

| Parameter | Basis | Mit Upgrades (Lv.10) |
|-----------|-------|---------------------|
| Kapazität | 100 | 5,767 |
| Füllrate | 10% der Produktion | 10% × Upgrades |
| Beispiel (1000 Prod/s) | 100/s Füllung | 100/s Füllung |

```typescript
// Füllzeit bei 1000 Produktion/Sek
const production = 1000;
const fillRate = production * 0.1; // = 100/sek
const capacity = 100 * Math.pow(1.5, upgradeLevel);

// Level 0: 100 Kapazität, 1 Sek zum Füllen
// Level 10: 5,767 Kapazität, 57.67 Sek zum Füllen
```

### Goldener Pixel

| Parameter | Basis | Mit Upgrades (Lv.10) |
|-----------|-------|---------------------|
| Erscheinungs-Interval | 60s | 12s |
| Sichtbarkeit | 4s | 4s |
| Bonus | 10× Produktion | 57.7× Produktion |

```typescript
// Interval-Berechnung
const baseInterval = 60000; // 60 Sekunden
const interval = baseInterval * Math.pow(0.85, upgradeLevel);
// Level 0: 60s
// Level 5: 26.6s
// Level 10: 11.8s

// Bonus-Berechnung
const baseBonus = 10;
const bonus = baseBonus * Math.pow(1.5, upgradeLevel);
// Level 0: 10×
// Level 5: 75.9×
// Level 10: 576.7×
```

---

## 6. Prestige-Balancing

### Prisma-Gain-Kurve

```
Prisma = floor(sqrt(totalEarned / 1,000,000))
```

| Gesamt verdient | Prisma | Zeit bis hierher* |
|----------------|--------|-------------------|
| 1,000,000 | 1 | ~17 min |
| 4,000,000 | 2 | ~33 min |
| 9,000,000 | 3 | ~50 min |
| 25,000,000 | 5 | ~83 min |
| 100,000,000 | 10 | ~167 min |
| 1,000,000,000 | 31 | ~8.3h |

*Geschätzt bei durchschnittlicher Spielweise

### Prestige-Upgrade-Kosten

| ID | Kosten pro Level | Max | Gesamt-Kosten |
|----|-----------------|-----|---------------|
| `prisma_production` | 1, 2, 3... | 10 | 55 Prisma |
| `prisma_start_currency` | 2, 4, 6... | 20 | 420 Prisma |
| `prisma_unlock_slots` | 5, 10, 15... | 10 | 275 Prisma |
| `prisma_golden_bonus` | 3, 6, 9... | 10 | 165 Prisma |
| `prisma_base_pixel` | 10, 20, 30... | 5 | 150 Prisma |

### Prestige-Multiplikatoren

| Upgrade | Level 1 | Level 5 | Level 10 |
|---------|---------|---------|----------|
| Production | 2× | 32× | 1,024× |
| Start-Währung | +1,000 | +5,000 | +10,000 |
| Start-Slots | +4 | +20 | +40 |
| Golden-Bonus | 1.5× | 7.6× | 57.7× |
| Basis-Pixel | +1 | +5 | - |

---

## 7. Progression-Milestones

### Erste Session (ohne Prestige)

| Zeit | Erwarteter Fortschritt |
|------|----------------------|
| 5 min | 2-3 Pixel, erste Merges |
| 15 min | 5-6 Pixel, Stufe 2-3 erreicht |
| 30 min | 10+ Pixel, erste Upgrades |
| 1h | Grid teilweise erweitert, Stufe 5+ |
| 2h | Prestige-fähig (1-2 Prisma) |

### Nach erstem Prestige

| Prestige # | Prisma | Geschätzte Run-Zeit |
|------------|--------|---------------------|
| 1 | 1-2 | 2h |
| 2 | 3-5 | 1.5h |
| 3 | 5-8 | 1h |
| 5 | 10-15 | 45min |
| 10 | 25-40 | 30min |

---

## 8. Balance-Konstanten (Zusammenfassung)

```typescript
/**
 * Alle Balance-Konstanten an einem Ort
 */
export const BALANCE = {
  // Pixel-Produktion
  PIXEL_BASE_PRODUCTION: 3,        // 3^colorLevel
  MERGE_VALUE_MULTIPLIER: 3,       // 3× statt 2× bei Merge

  // Pixel-Kauf
  PIXEL_BASE_COST: 10,
  PIXEL_COST_MULTIPLIER: 1.15,

  // Grid-Slots
  SLOT_RING_COSTS: {
    0: 0,
    1: 100,
    2: 500,
    3: 2500,
    4: 10000,
  },
  GRID_START_POSITIONS: [27, 28, 35, 36],

  // Energie-Balken
  ENERGY_BASE_CAPACITY: 100,
  ENERGY_FILL_RATE_PERCENT: 0.1,   // 10% der Produktion

  // Goldener Pixel
  GOLDEN_BASE_INTERVAL: 60000,     // 60 Sekunden
  GOLDEN_VISIBLE_DURATION: 4000,   // 4 Sekunden
  GOLDEN_BASE_MULTIPLIER: 10,      // 10× Produktion

  // Prestige
  PRESTIGE_DIVISOR: 1_000_000,     // sqrt(earned / 1M)

  // Offline
  OFFLINE_MAX_HOURS: 24,
  OFFLINE_EFFICIENCY: 0.5,         // 50%

  // Upgrades
  UPGRADES: {
    prod_multiplier: { base: 100, mult: 2.0, effect: 1.25 },
    cheaper_pixels: { base: 500, mult: 2.5, effect: 0.9, max: 10 },
    better_pixels: { base: 10000, mult: 10.0, effect: 1, max: 5 },
    energy_capacity: { base: 200, mult: 1.8, effect: 1.5, max: 20 },
    golden_frequency: { base: 1000, mult: 3.0, effect: 0.85, max: 10 },
  },
} as const;
```

---

## 9. Tuning-Empfehlungen

### Wenn das Spiel zu langsam ist:

1. `PIXEL_COST_MULTIPLIER` senken (z.B. 1.12)
2. `ENERGY_FILL_RATE_PERCENT` erhöhen (z.B. 0.15)
3. `GOLDEN_BASE_INTERVAL` senken (z.B. 45000)

### Wenn das Spiel zu schnell ist:

1. `PIXEL_COST_MULTIPLIER` erhöhen (z.B. 1.18)
2. `PRESTIGE_DIVISOR` erhöhen (z.B. 2_000_000)
3. Upgrade-Multiplikatoren erhöhen

### Wenn Prestige zu wertvoll/wertlos ist:

- `PRESTIGE_DIVISOR` anpassen
- Prestige-Upgrade-Effekte skalieren

---

## Implementierungs-Checkliste

- [ ] `BALANCE` Konstanten-Objekt erstellen
- [ ] Alle Formeln mit Konstanten verbinden
- [ ] Balancing-Tests schreiben
- [ ] Simulations-Tool für Progression
- [ ] Telemetrie für spätere Anpassungen (optional)
