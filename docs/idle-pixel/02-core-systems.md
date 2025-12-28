# Phase 2: Core Systems

> Pixel-Produktion, Merge-Mechanik & Grid-System

## Übersicht

```
┌─────────────────────────────────────────────────────────┐
│                    GAME LOOP (60fps)                     │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  ┌──────────────┐    ┌──────────────┐    ┌────────────┐ │
│  │ Production   │───▶│   Merger     │───▶│  Renderer  │ │
│  │   System     │    │   System     │    │            │ │
│  └──────────────┘    └──────────────┘    └────────────┘ │
│         │                   │                   │        │
│         ▼                   ▼                   ▼        │
│  ┌──────────────────────────────────────────────────┐   │
│  │                   GAME STATE                      │   │
│  └──────────────────────────────────────────────────┘   │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

---

## 1. Produktions-System

### Basis-Produktion

```typescript
/**
 * Berechnet die Basis-Produktion eines Pixels
 * Formel: 3^(colorLevel)
 */
function getPixelBaseProduction(colorLevel: number): number {
  return Math.pow(3, colorLevel);
}

// Beispiele:
// Stufe 0 (Schwarz): 3^0 = 1
// Stufe 1 (Braun):   3^1 = 3
// Stufe 2 (Rot):     3^2 = 9
// Stufe 14 (Rosa):   3^14 = 4,782,969
```

### Gesamt-Produktion mit Multiplikatoren

```typescript
/**
 * Berechnet die finale Produktion pro Sekunde
 */
function calculateTotalProduction(state: IdlePixelGameState): number {
  // 1. Summe aller Pixel-Basis-Produktionen
  const baseProduction = state.grid
    .filter(slot => slot.pixel !== null)
    .reduce((sum, slot) => sum + slot.pixel!.baseProduction, 0);

  // 2. Upgrade-Multiplikatoren sammeln
  const upgradeMultiplier = getUpgradeMultiplier(state, 'multiply_production');
  const colorBonusMultiplier = getColorLevelBonus(state);
  const prestigeMultiplier = getPrestigeMultiplier(state);

  // 3. Finale Berechnung
  return baseProduction * upgradeMultiplier * colorBonusMultiplier * prestigeMultiplier;
}

/**
 * Berechnet Bonus basierend auf höchster Farbstufe
 */
function getColorLevelBonus(state: IdlePixelGameState): number {
  const highestLevel = Math.max(
    ...state.grid
      .filter(slot => slot.pixel !== null)
      .map(slot => slot.pixel!.colorLevel),
    0
  );

  // +5% pro Farbstufe
  const upgradeBonus = getUpgradeValue(state, 'multiply_color_level');
  return 1 + (highestLevel * 0.05 * upgradeBonus);
}
```

### Game Loop Integration

```typescript
/**
 * Wird jeden Frame aufgerufen (requestAnimationFrame)
 */
function gameLoop(state: IdlePixelGameState, deltaTime: number): IdlePixelGameState {
  // deltaTime in Sekunden
  const production = calculateTotalProduction(state);
  const earned = production * deltaTime;

  return {
    ...state,
    currency: state.currency + earned,
    stats: {
      ...state.stats,
      totalEarned: state.stats.totalEarned + earned,
      playTime: state.stats.playTime + deltaTime,
    },
    lastTick: Date.now(),
  };
}
```

---

## 2. Pixel-Kauf-System

### Preisberechnung

```typescript
/**
 * Berechnet den Preis für den nächsten Pixel-Kauf
 *
 * Formel: baseCost × (multiplier ^ purchaseCount)
 *
 * Beispiel mit baseCost=10, multiplier=1.15:
 * - Kauf 1: 10 × 1.15^0 = 10
 * - Kauf 2: 10 × 1.15^1 = 11.5
 * - Kauf 10: 10 × 1.15^9 = 35.2
 * - Kauf 100: 10 × 1.15^99 = 11,790,186
 */
const PIXEL_BASE_COST = 10;
const PIXEL_COST_MULTIPLIER = 1.15;

function calculatePixelCost(state: IdlePixelGameState): number {
  const purchaseCount = state.stats.pixelsPurchased;
  const costReduction = getUpgradeValue(state, 'reduce_pixel_cost');

  const baseCost = PIXEL_BASE_COST * Math.pow(PIXEL_COST_MULTIPLIER, purchaseCount);
  return Math.floor(baseCost * costReduction);
}
```

### Basis-Pixel-Level Upgrade

```typescript
/**
 * Bestimmt die Farbstufe eines neu gekauften Pixels
 *
 * Upgrade "Bessere Pixel" erhöht die Start-Stufe
 */
function getNewPixelColorLevel(state: IdlePixelGameState): number {
  const baseLevel = 0; // Schwarz
  const upgradeBonus = getUpgradeLevel(state, 'increase_base_pixel_level');
  return Math.min(baseLevel + upgradeBonus, 14); // Max: Rosa
}
```

### Kauf-Logik

```typescript
/**
 * Kauft einen neuen Pixel und platziert ihn
 */
function purchasePixel(state: IdlePixelGameState): IdlePixelGameState | null {
  const cost = calculatePixelCost(state);

  // Nicht genug Währung?
  if (state.currency < cost) return null;

  // Keinen freien Slot?
  const emptySlot = findFirstEmptyUnlockedSlot(state.grid);
  if (emptySlot === null) return null;

  // Neuen Pixel erstellen
  const colorLevel = getNewPixelColorLevel(state);
  const newPixel: IdlePixel = {
    id: generateId(),
    colorLevel,
    position: emptySlot,
    baseProduction: getPixelBaseProduction(colorLevel),
  };

  // State aktualisieren
  const newGrid = [...state.grid];
  newGrid[emptySlot] = {
    ...newGrid[emptySlot],
    pixel: newPixel,
  };

  return {
    ...state,
    currency: state.currency - cost,
    grid: newGrid,
    stats: {
      ...state.stats,
      pixelsPurchased: state.stats.pixelsPurchased + 1,
    },
  };
}
```

---

## 3. Merge-System

### Merge-Erkennung

```typescript
/**
 * Findet alle Merge-Paare im Grid
 *
 * Regel: Zwei Pixel mit gleicher Farbstufe → Merge
 * Priorität: Niedrigere Position zuerst
 */
function findMergePairs(grid: GridSlot[]): [number, number][] {
  const pairs: [number, number][] = [];
  const used = new Set<number>();

  // Pixel nach Farbstufe gruppieren
  const byColor: Map<number, number[]> = new Map();

  for (const slot of grid) {
    if (slot.pixel && slot.unlocked) {
      const level = slot.pixel.colorLevel;
      if (!byColor.has(level)) byColor.set(level, []);
      byColor.get(level)!.push(slot.position);
    }
  }

  // Paare bilden (Position aufsteigend)
  for (const [_level, positions] of byColor) {
    positions.sort((a, b) => a - b);

    for (let i = 0; i < positions.length - 1; i += 2) {
      if (!used.has(positions[i]) && !used.has(positions[i + 1])) {
        pairs.push([positions[i], positions[i + 1]]);
        used.add(positions[i]);
        used.add(positions[i + 1]);
      }
    }
  }

  return pairs;
}
```

### Merge-Durchführung

```typescript
/**
 * Führt einen Merge durch
 *
 * - Zwei Pixel werden entfernt
 * - Ein neuer Pixel mit nächster Stufe erscheint
 * - Position: Der niedrigere der beiden
 * - Wert: 3× (nicht 2×!)
 */
function performMerge(
  state: IdlePixelGameState,
  pos1: number,
  pos2: number
): IdlePixelGameState {
  const pixel1 = state.grid[pos1].pixel!;
  const pixel2 = state.grid[pos2].pixel!;

  // Beide müssen gleiche Stufe haben
  if (pixel1.colorLevel !== pixel2.colorLevel) {
    throw new Error('Merge requires same color level');
  }

  // Neue Stufe (max 14)
  const newColorLevel = Math.min(pixel1.colorLevel + 1, 14);

  // Merge-Bonus aus Upgrades
  const mergeBonus = getUpgradeValue(state, 'increase_merge_bonus');

  // Neuer Pixel
  const mergedPixel: IdlePixel = {
    id: generateId(),
    colorLevel: newColorLevel,
    position: Math.min(pos1, pos2), // Niedrigere Position
    baseProduction: getPixelBaseProduction(newColorLevel) * mergeBonus,
  };

  // Grid aktualisieren
  const newGrid = [...state.grid];
  const targetPos = Math.min(pos1, pos2);
  const removePos = Math.max(pos1, pos2);

  newGrid[targetPos] = { ...newGrid[targetPos], pixel: mergedPixel };
  newGrid[removePos] = { ...newGrid[removePos], pixel: null };

  return {
    ...state,
    grid: newGrid,
    stats: {
      ...state.stats,
      mergesPerformed: state.stats.mergesPerformed + 1,
      highestColorLevel: Math.max(state.stats.highestColorLevel, newColorLevel),
    },
  };
}
```

### Automatischer Merge mit Animation

```typescript
/**
 * Animation-Queue für Merges
 */
interface MergeAnimation {
  fromPositions: [number, number];
  toPosition: number;
  newColorLevel: number;
  startTime: number;
  duration: number; // ms
}

/**
 * Merge-System mit Animation
 */
class MergeSystem {
  private animationQueue: MergeAnimation[] = [];
  private readonly MERGE_DURATION = 300; // ms
  private readonly SHUFFLE_DURATION = 200; // ms

  /**
   * Prüft auf Merges nach jedem State-Update
   */
  checkForMerges(state: IdlePixelGameState): {
    newState: IdlePixelGameState;
    animations: MergeAnimation[];
  } {
    const pairs = findMergePairs(state.grid);
    const animations: MergeAnimation[] = [];
    let currentState = state;

    for (const [pos1, pos2] of pairs) {
      // Merge durchführen
      currentState = performMerge(currentState, pos1, pos2);

      // Animation hinzufügen
      animations.push({
        fromPositions: [pos1, pos2],
        toPosition: Math.min(pos1, pos2),
        newColorLevel: currentState.grid[Math.min(pos1, pos2)].pixel!.colorLevel,
        startTime: Date.now(),
        duration: this.MERGE_DURATION,
      });
    }

    // Nach Merges: Grid neu ordnen
    if (pairs.length > 0) {
      currentState = this.compactGrid(currentState);
    }

    return { newState: currentState, animations };
  }

  /**
   * Ordnet Pixel neu an (füllt Lücken)
   */
  private compactGrid(state: IdlePixelGameState): IdlePixelGameState {
    const unlockedSlots = state.grid
      .filter(slot => slot.unlocked)
      .sort((a, b) => a.position - b.position);

    const pixels = unlockedSlots
      .filter(slot => slot.pixel !== null)
      .map(slot => slot.pixel!);

    const newGrid = [...state.grid];

    // Alle freigeschalteten Slots durchgehen
    let pixelIndex = 0;
    for (const slot of unlockedSlots) {
      if (pixelIndex < pixels.length) {
        newGrid[slot.position] = {
          ...newGrid[slot.position],
          pixel: { ...pixels[pixelIndex], position: slot.position },
        };
        pixelIndex++;
      } else {
        newGrid[slot.position] = {
          ...newGrid[slot.position],
          pixel: null,
        };
      }
    }

    return { ...state, grid: newGrid };
  }
}
```

---

## 4. Grid-Erweiterungs-System

### Verfügbare Slots anzeigen

```typescript
/**
 * Findet alle kaufbaren Slot-Optionen
 *
 * Regel: Slot muss an mindestens einen freigeschalteten Slot angrenzen
 */
function getAvailableSlotOptions(grid: GridSlot[]): SlotPurchaseOption[] {
  const unlockedPositions = new Set(
    grid.filter(slot => slot.unlocked).map(slot => slot.position)
  );

  const availablePositions = new Set<number>();

  // Alle Nachbarn von freigeschalteten Slots finden
  for (const pos of unlockedPositions) {
    const neighbors = GridUtils.getAdjacentPositions(pos);
    for (const neighbor of neighbors) {
      if (!unlockedPositions.has(neighbor)) {
        availablePositions.add(neighbor);
      }
    }
  }

  // Optionen mit Preis erstellen
  return Array.from(availablePositions).map(position => {
    const ringDistance = Math.ceil(GridUtils.getRingDistance(position));
    const adjacentUnlocked = GridUtils.getAdjacentPositions(position)
      .filter(p => unlockedPositions.has(p));

    return {
      position,
      coords: GridUtils.positionToCoords(position),
      cost: SLOT_RING_COSTS[ringDistance] ?? SLOT_RING_COSTS[4],
      ringDistance,
      adjacentUnlocked,
    };
  }).sort((a, b) => a.cost - b.cost); // Günstigste zuerst
}
```

### Slot kaufen

```typescript
/**
 * Kauft einen neuen Grid-Slot
 */
function purchaseSlot(
  state: IdlePixelGameState,
  position: number
): IdlePixelGameState | null {
  const options = getAvailableSlotOptions(state.grid);
  const option = options.find(o => o.position === position);

  // Nicht verfügbar oder nicht genug Währung?
  if (!option || state.currency < option.cost) return null;

  // Slot freischalten
  const newGrid = [...state.grid];
  newGrid[position] = {
    ...newGrid[position],
    unlocked: true,
  };

  return {
    ...state,
    currency: state.currency - option.cost,
    grid: newGrid,
  };
}
```

### Ring-Preis-Visualisierung

```
Ring-Distanz vom Zentrum:

     0  1  2  3  4  5  6  7
   ┌─────────────────────────┐
 0 │ 4  4  4  4  4  4  4  4  │  Ring 4: 10,000
 1 │ 4  3  3  3  3  3  3  4  │  Ring 3:  2,500
 2 │ 4  3  2  2  2  2  3  4  │  Ring 2:    500
 3 │ 4  3  2  1  1  2  3  4  │  Ring 1:    100
 4 │ 4  3  2  1  1  2  3  4  │  Ring 0:      0 (Start)
 5 │ 4  3  2  2  2  2  3  4  │
 6 │ 4  3  3  3  3  3  3  4  │
 7 │ 4  4  4  4  4  4  4  4  │
   └─────────────────────────┘

Start-Positionen (Ring 0): 27, 28, 35, 36
```

---

## 5. Initialisierung

```typescript
/**
 * Erstellt einen neuen Spielzustand
 */
function createNewGameState(): IdlePixelGameState {
  // Leeres 8x8 Grid erstellen
  const grid: GridSlot[] = Array.from({ length: 64 }, (_, i) => ({
    position: i,
    unlocked: GRID_START_POSITIONS.includes(i),
    pixel: null,
  }));

  // Start-Pixel (schwarzer Pixel auf Position 27)
  grid[27].pixel = {
    id: generateId(),
    colorLevel: 0,
    position: 27,
    baseProduction: 1,
  };

  return {
    currency: 0,
    grid,
    upgrades: [],
    stats: {
      totalEarned: 0,
      pixelsPurchased: 0,
      mergesPerformed: 0,
      highestColorLevel: 0,
      totalClicks: 0,
      playTime: 0,
    },
    clicker: {
      energyBarCurrent: 0,
      energyBarMax: 100,
      goldenPixelNextSpawn: Date.now() + 60000,
      goldenPixelActive: false,
      goldenPixelTimeLeft: 0,
    },
    prestige: {
      prestigeCount: 0,
      prismaPixels: 0,
      totalPrismaEarned: 0,
      prestigeUpgrades: [],
    },
    lastSaved: Date.now(),
    lastTick: Date.now(),
  };
}
```

---

## Implementierungs-Checkliste

- [ ] `ProductionSystem` Klasse
- [ ] `MergeSystem` Klasse mit Animation-Queue
- [ ] `GridSystem` Klasse für Slot-Management
- [ ] `PurchaseSystem` für Pixel-Käufe
- [ ] Game Loop mit `requestAnimationFrame`
- [ ] Utility-Funktionen (ID-Generator, etc.)
- [ ] Unit Tests für alle Systeme
