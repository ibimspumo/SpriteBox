# Phase 4: Clicker-System

> Energie-Balken & Goldener Pixel

## Übersicht

Zwei Clicker-Elemente bieten aktive Interaktion:

| Element | Typ | Beschreibung |
|---------|-----|--------------|
| Energie-Balken | Passiv + Aktiv | Füllt sich automatisch, Klick erntet |
| Goldener Pixel | Event-basiert | Erscheint zufällig, muss schnell geklickt werden |

---

## 1. Energie-Balken

### Konzept

```
┌─────────────────────────────────────────────────────────┐
│                                                          │
│   ⚡ ENERGIE                                             │
│   ┌──────────────────────────────────────────────────┐  │
│   │████████████████████████████░░░░░░░░░░░░░░░░░░░░░│  │
│   └──────────────────────────────────────────────────┘  │
│   750 / 1000                            [SAMMELN!]      │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

- Füllt sich passiv basierend auf aktueller Produktion
- Bei Klick: Balken-Inhalt wird zu Währung
- Größe und Füllrate durch Upgrades verbesserbar

### Implementierung

```typescript
/**
 * Energie-Balken-System
 */
export class EnergyBarSystem {
  /**
   * Berechnet die maximale Kapazität
   */
  getMaxCapacity(state: IdlePixelGameState): number {
    const baseCapacity = 100;
    const upgradeMultiplier = upgradeEngine.calculateEffect(
      state,
      'energy_bar_capacity'
    );
    return Math.floor(baseCapacity * upgradeMultiplier);
  }

  /**
   * Berechnet die Füllrate pro Sekunde
   */
  getFillRate(state: IdlePixelGameState): number {
    // Füllrate = 10% der aktuellen Produktion
    const production = calculateTotalProduction(state);
    const baseRate = production * 0.1;

    const upgradeMultiplier = upgradeEngine.calculateEffect(
      state,
      'energy_bar_fill_rate'
    );

    return baseRate * upgradeMultiplier;
  }

  /**
   * Aktualisiert den Energie-Balken
   */
  update(state: IdlePixelGameState, deltaTime: number): IdlePixelGameState {
    const maxCapacity = this.getMaxCapacity(state);
    const fillRate = this.getFillRate(state);
    const fillAmount = fillRate * deltaTime;

    const newCurrent = Math.min(
      state.clicker.energyBarCurrent + fillAmount,
      maxCapacity
    );

    return {
      ...state,
      clicker: {
        ...state.clicker,
        energyBarCurrent: newCurrent,
        energyBarMax: maxCapacity,
      },
    };
  }

  /**
   * Erntet die Energie
   */
  harvest(state: IdlePixelGameState): IdlePixelGameState {
    const harvested = Math.floor(state.clicker.energyBarCurrent);

    if (harvested <= 0) return state;

    return {
      ...state,
      currency: state.currency + harvested,
      clicker: {
        ...state.clicker,
        energyBarCurrent: 0,
      },
      stats: {
        ...state.stats,
        totalEarned: state.stats.totalEarned + harvested,
        totalClicks: state.stats.totalClicks + 1,
      },
    };
  }
}

export const energyBarSystem = new EnergyBarSystem();
```

### UI-Komponente

```svelte
<!-- EnergyBar.svelte -->
<script lang="ts">
  import { energyBarSystem } from '$lib/idle-pixel/clicker';
  import { formatNumber } from '$lib/utils';
  import type { IdlePixelGameState } from '@spritebox/types';

  interface Props {
    state: IdlePixelGameState;
    onHarvest: () => void;
  }

  let { state, onHarvest }: Props = $props();

  const current = $derived(Math.floor(state.clicker.energyBarCurrent));
  const max = $derived(state.clicker.energyBarMax);
  const percentage = $derived((current / max) * 100);
  const canHarvest = $derived(current > 0);

  // Pulsieren wenn voll
  const isFull = $derived(percentage >= 100);
</script>

<div class="energy-bar-container">
  <div class="energy-header">
    <span class="icon">⚡</span>
    <span class="label">{$t.idlePixel.energyBar.title}</span>
  </div>

  <div class="energy-bar-wrapper">
    <div
      class="energy-bar-fill"
      class:full={isFull}
      style="width: {percentage}%"
    />
    <span class="energy-text">
      {formatNumber(current)} / {formatNumber(max)}
    </span>
  </div>

  <button
    class="harvest-button"
    class:disabled={!canHarvest}
    onclick={onHarvest}
  >
    {$t.idlePixel.energyBar.harvest}
  </button>
</div>

<style>
  .energy-bar-container {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
    padding: var(--space-3);
    background: var(--color-bg-secondary);
    border-radius: var(--radius-md);
  }

  .energy-bar-wrapper {
    position: relative;
    height: 24px;
    background: var(--color-bg-tertiary);
    border-radius: var(--radius-sm);
    overflow: hidden;
  }

  .energy-bar-fill {
    position: absolute;
    top: 0;
    left: 0;
    height: 100%;
    background: linear-gradient(90deg, var(--color-accent), var(--color-success));
    transition: width 0.1s ease-out;
  }

  .energy-bar-fill.full {
    animation: pulse 1s ease-in-out infinite;
  }

  .energy-text {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    font-size: var(--font-size-sm);
    font-weight: 600;
    color: var(--color-text-primary);
    text-shadow: 0 1px 2px rgba(0, 0, 0, 0.5);
  }

  .harvest-button {
    padding: var(--space-2) var(--space-4);
    background: var(--color-accent);
    border: none;
    border-radius: var(--radius-sm);
    color: var(--color-text-primary);
    font-weight: 600;
    cursor: pointer;
    transition: transform 0.1s, background 0.2s;
  }

  .harvest-button:hover:not(.disabled) {
    transform: scale(1.02);
    background: var(--color-accent-hover);
  }

  .harvest-button.disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.7; }
  }
</style>
```

---

## 2. Goldener Pixel

### Konzept

```
┌─────────────────────────────────────────────────────────┐
│                                                          │
│   Normales Grid:           Mit Goldenem Pixel:          │
│   ┌──────────────┐         ┌──────────────┐             │
│   │ ██ 🟫 ██ ██ │         │ ██ 🟫 ██ ██ │             │
│   │ 🔴 ██ 🟫 ██ │         │ 🔴 ⭐ 🟫 ██ │ ← KLICK!    │
│   │ ██ 🔴 ██ ██ │         │ ██ 🔴 ██ ██ │   (3.5s)    │
│   │ ██ ██ ██ 🟫 │         │ ██ ██ ██ 🟫 │             │
│   └──────────────┘         └──────────────┘             │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

- Erscheint zufällig alle 30-90 Sekunden (Upgrade-abhängig)
- Sichtbar für 3-5 Sekunden
- Bei Klick: Bonus = 10× aktuelle Produktion
- Verpasst: Nichts passiert

### Implementierung

```typescript
/**
 * Goldener Pixel System
 */
export class GoldenPixelSystem {
  private readonly BASE_INTERVAL = 60000; // 60 Sekunden
  private readonly VISIBLE_DURATION = 4000; // 4 Sekunden
  private readonly BASE_BONUS_MULTIPLIER = 10; // 10× Produktion

  /**
   * Berechnet das Erscheinungs-Interval
   */
  getSpawnInterval(state: IdlePixelGameState): number {
    const frequencyMultiplier = upgradeEngine.calculateEffect(
      state,
      'golden_pixel_frequency'
    );
    return Math.floor(this.BASE_INTERVAL * frequencyMultiplier);
  }

  /**
   * Berechnet den Bonus bei Klick
   */
  getBonusValue(state: IdlePixelGameState): number {
    const production = calculateTotalProduction(state);
    const bonusMultiplier = upgradeEngine.calculateEffect(
      state,
      'golden_pixel_value'
    );
    return Math.floor(production * this.BASE_BONUS_MULTIPLIER * bonusMultiplier);
  }

  /**
   * Aktualisiert den Golden-Pixel-Zustand
   */
  update(state: IdlePixelGameState, now: number): IdlePixelGameState {
    let newState = { ...state };

    // Aktiver Goldener Pixel?
    if (state.clicker.goldenPixelActive) {
      const timeLeft = state.clicker.goldenPixelTimeLeft - (now - state.lastTick);

      if (timeLeft <= 0) {
        // Zeit abgelaufen - verstecken
        newState = {
          ...newState,
          clicker: {
            ...newState.clicker,
            goldenPixelActive: false,
            goldenPixelTimeLeft: 0,
            goldenPixelNextSpawn: now + this.getSpawnInterval(state),
          },
        };
      } else {
        newState = {
          ...newState,
          clicker: {
            ...newState.clicker,
            goldenPixelTimeLeft: timeLeft,
          },
        };
      }
    } else {
      // Prüfen ob neuer Goldener Pixel erscheinen soll
      if (now >= state.clicker.goldenPixelNextSpawn) {
        newState = {
          ...newState,
          clicker: {
            ...newState.clicker,
            goldenPixelActive: true,
            goldenPixelTimeLeft: this.VISIBLE_DURATION,
          },
        };
      }
    }

    return newState;
  }

  /**
   * Goldener Pixel wurde geklickt
   */
  collect(state: IdlePixelGameState): IdlePixelGameState {
    if (!state.clicker.goldenPixelActive) return state;

    const bonus = this.getBonusValue(state);

    return {
      ...state,
      currency: state.currency + bonus,
      clicker: {
        ...state.clicker,
        goldenPixelActive: false,
        goldenPixelTimeLeft: 0,
        goldenPixelNextSpawn: Date.now() + this.getSpawnInterval(state),
      },
      stats: {
        ...state.stats,
        totalEarned: state.stats.totalEarned + bonus,
        totalClicks: state.stats.totalClicks + 1,
      },
    };
  }

  /**
   * Zufällige Position für den Goldenen Pixel
   */
  getRandomPosition(): { x: number; y: number } {
    // Position außerhalb des Grids (schwebt darüber)
    return {
      x: Math.random() * 80 + 10, // 10-90%
      y: Math.random() * 60 + 20, // 20-80%
    };
  }
}

export const goldenPixelSystem = new GoldenPixelSystem();
```

### UI-Komponente

```svelte
<!-- GoldenPixel.svelte -->
<script lang="ts">
  import { goldenPixelSystem } from '$lib/idle-pixel/clicker';
  import { formatNumber } from '$lib/utils';
  import type { IdlePixelGameState } from '@spritebox/types';

  interface Props {
    state: IdlePixelGameState;
    onCollect: () => void;
  }

  let { state, onCollect }: Props = $props();

  const isActive = $derived(state.clicker.goldenPixelActive);
  const timeLeft = $derived(state.clicker.goldenPixelTimeLeft);
  const bonusValue = $derived(goldenPixelSystem.getBonusValue(state));

  // Zufällige Position (nur ändern wenn neu erscheint)
  let position = $state({ x: 50, y: 50 });

  $effect(() => {
    if (isActive) {
      position = goldenPixelSystem.getRandomPosition();
    }
  });
</script>

{#if isActive}
  <button
    class="golden-pixel"
    style="left: {position.x}%; top: {position.y}%"
    onclick={onCollect}
    aria-label={$t.idlePixel.goldenPixel.collect}
  >
    <span class="star">⭐</span>
    <span class="bonus">+{formatNumber(bonusValue)}</span>
    <div class="timer-ring" style="--progress: {timeLeft / 4000}"></div>
  </button>
{/if}

<style>
  .golden-pixel {
    position: absolute;
    transform: translate(-50%, -50%);
    width: 60px;
    height: 60px;
    background: radial-gradient(circle, #ffd700, #ff8c00);
    border: 3px solid #fff;
    border-radius: 50%;
    cursor: pointer;
    animation: bounce 0.5s ease-in-out infinite alternate,
               glow 1s ease-in-out infinite;
    z-index: 100;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
  }

  .star {
    font-size: 24px;
    filter: drop-shadow(0 0 4px #fff);
  }

  .bonus {
    position: absolute;
    bottom: -20px;
    font-size: var(--font-size-xs);
    font-weight: 700;
    color: #ffd700;
    text-shadow: 0 1px 2px rgba(0, 0, 0, 0.8);
    white-space: nowrap;
  }

  .timer-ring {
    position: absolute;
    inset: -4px;
    border-radius: 50%;
    border: 3px solid transparent;
    border-top-color: rgba(255, 255, 255, 0.8);
    transform: rotate(calc((1 - var(--progress)) * 360deg));
    transition: transform 0.1s linear;
  }

  @keyframes bounce {
    0% { transform: translate(-50%, -50%) scale(1); }
    100% { transform: translate(-50%, -50%) scale(1.1); }
  }

  @keyframes glow {
    0%, 100% { box-shadow: 0 0 20px #ffd700, 0 0 40px #ff8c00; }
    50% { box-shadow: 0 0 30px #ffd700, 0 0 60px #ff8c00; }
  }
</style>
```

---

## 3. Integration in Game Loop

```typescript
/**
 * Clicker-Systeme im Game Loop aktualisieren
 */
function updateClickerSystems(
  state: IdlePixelGameState,
  deltaTime: number,
  now: number
): IdlePixelGameState {
  let newState = state;

  // Energie-Balken aktualisieren
  newState = energyBarSystem.update(newState, deltaTime);

  // Goldener Pixel aktualisieren
  newState = goldenPixelSystem.update(newState, now);

  return newState;
}

/**
 * Haupt-Game-Loop
 */
function gameLoop(state: IdlePixelGameState): IdlePixelGameState {
  const now = Date.now();
  const deltaTime = (now - state.lastTick) / 1000; // Sekunden

  let newState = state;

  // 1. Produktion
  newState = updateProduction(newState, deltaTime);

  // 2. Clicker-Systeme
  newState = updateClickerSystems(newState, deltaTime, now);

  // 3. Timestamp aktualisieren
  newState = {
    ...newState,
    lastTick: now,
  };

  return newState;
}
```

---

## 4. Event Handlers

```svelte
<!-- IdlePixelGame.svelte (Ausschnitt) -->
<script lang="ts">
  import { EnergyBar, GoldenPixel } from '$lib/components/features/IdlePixel';
  import { energyBarSystem, goldenPixelSystem } from '$lib/idle-pixel/clicker';

  let gameState = $state(loadOrCreateGameState());

  function handleEnergyHarvest() {
    gameState = energyBarSystem.harvest(gameState);
    playSound('harvest');
  }

  function handleGoldenPixelCollect() {
    gameState = goldenPixelSystem.collect(gameState);
    playSound('golden');
    showFloatingText(`+${formatNumber(goldenPixelSystem.getBonusValue(gameState))}`);
  }
</script>

<div class="game-container">
  <PixelGrid {gameState} />

  <div class="clicker-area">
    <EnergyBar
      state={gameState}
      onHarvest={handleEnergyHarvest}
    />

    <GoldenPixel
      state={gameState}
      onCollect={handleGoldenPixelCollect}
    />
  </div>
</div>
```

---

## 5. Sound & Feedback (Optional)

```typescript
/**
 * Audio-Feedback für Clicker-Aktionen
 */
const CLICKER_SOUNDS = {
  harvest: '/sounds/harvest.mp3',
  golden: '/sounds/golden.mp3',
  click: '/sounds/click.mp3',
};

function playSound(type: keyof typeof CLICKER_SOUNDS) {
  const audio = new Audio(CLICKER_SOUNDS[type]);
  audio.volume = 0.3;
  audio.play().catch(() => {}); // Ignoriere Autoplay-Fehler
}

/**
 * Floating Text Animation
 */
function showFloatingText(text: string, x: number, y: number) {
  const element = document.createElement('div');
  element.className = 'floating-text';
  element.textContent = text;
  element.style.left = `${x}px`;
  element.style.top = `${y}px`;
  document.body.appendChild(element);

  setTimeout(() => element.remove(), 1000);
}
```

---

## Implementierungs-Checkliste

- [ ] `EnergyBarSystem` Klasse
- [ ] `GoldenPixelSystem` Klasse
- [ ] `EnergyBar.svelte` Komponente
- [ ] `GoldenPixel.svelte` Komponente
- [ ] Integration in Game Loop
- [ ] Event Handler in Haupt-Komponente
- [ ] CSS Animationen (pulse, bounce, glow)
- [ ] Sound-Effekte (optional)
- [ ] Floating-Text-Feedback (optional)
- [ ] i18n-Texte
- [ ] Unit Tests für beide Systeme
