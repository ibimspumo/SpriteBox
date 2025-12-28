# Phase 7: UI-Komponenten

> Svelte 5 Komponenten mit Atomic Design

## Komponenten-Struktur

```
apps/web/src/lib/components/features/IdlePixel/
├── index.ts                    # Barrel Export
├── IdlePixelGame.svelte        # Haupt-Komponente
├── PixelGrid.svelte            # Das 8x8 Grid
├── PixelSlot.svelte            # Einzelner Slot
├── CurrencyDisplay.svelte      # Währungsanzeige
├── ProductionDisplay.svelte    # Produktion/Sek
├── PurchasePanel.svelte        # Kauf-Buttons
├── UpgradePanel.svelte         # Upgrade-Liste
├── EnergyBar.svelte            # Clicker: Energie
├── GoldenPixel.svelte          # Clicker: Goldener Pixel
├── PrestigeButton.svelte       # Prestige-Trigger
├── PrestigeShop.svelte         # Prestige-Upgrades
├── OfflineModal.svelte         # Willkommen-zurück
└── StatsPanel.svelte           # Statistiken
```

---

## 1. Haupt-Komponente

```svelte
<!-- IdlePixelGame.svelte -->
<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { t } from '$lib/i18n';
  import {
    initializeGame,
    storageService,
    offlineProgressService
  } from '$lib/idle-pixel/storage';
  import { gameLoop } from '$lib/idle-pixel/core';
  import { mergeSystem } from '$lib/idle-pixel/merge';
  import { purchasePixel, purchaseSlot } from '$lib/idle-pixel/purchase';
  import { upgradeEngine } from '$lib/idle-pixel/upgrades';
  import { energyBarSystem, goldenPixelSystem } from '$lib/idle-pixel/clicker';
  import { prestigeEngine } from '$lib/idle-pixel/prestige';
  import type { IdlePixelGameState, MergeAnimation } from '@spritebox/types';

  import {
    PixelGrid,
    CurrencyDisplay,
    ProductionDisplay,
    PurchasePanel,
    UpgradePanel,
    EnergyBar,
    GoldenPixel,
    PrestigeButton,
    PrestigeShop,
    OfflineModal,
    StatsPanel,
  } from './';

  // Initialisierung
  const init = initializeGame();
  let gameState = $state<IdlePixelGameState>(init.state);
  let showOfflineModal = $state(init.showOfflineModal);
  let showPrestigeShop = $state(false);
  let showStats = $state(false);

  // Animationen
  let mergeAnimations = $state<MergeAnimation[]>([]);

  // Game Loop
  let animationFrameId: number;
  let lastFrameTime = performance.now();

  function tick(currentTime: number) {
    const deltaTime = (currentTime - lastFrameTime) / 1000;
    lastFrameTime = currentTime;

    // Game State aktualisieren
    gameState = gameLoop(gameState, deltaTime);

    // Merges prüfen
    const mergeResult = mergeSystem.checkForMerges(gameState);
    if (mergeResult.animations.length > 0) {
      gameState = mergeResult.newState;
      mergeAnimations = [...mergeAnimations, ...mergeResult.animations];

      // Animationen nach Abschluss entfernen
      setTimeout(() => {
        mergeAnimations = mergeAnimations.filter(
          a => Date.now() - a.startTime < a.duration
        );
      }, 500);
    }

    animationFrameId = requestAnimationFrame(tick);
  }

  onMount(() => {
    // Game Loop starten
    animationFrameId = requestAnimationFrame(tick);

    // Auto-Save starten
    storageService.startAutoSave(() => gameState);
  });

  onDestroy(() => {
    cancelAnimationFrame(animationFrameId);
    storageService.save(gameState);
    storageService.stopAutoSave();
  });

  // Event Handlers
  function handlePurchasePixel() {
    const result = purchasePixel(gameState);
    if (result) gameState = result;
  }

  function handlePurchaseSlot(position: number) {
    const result = purchaseSlot(gameState, position);
    if (result) gameState = result;
  }

  function handlePurchaseUpgrade(upgradeId: string) {
    const result = upgradeEngine.purchase(gameState, upgradeId);
    if (result) gameState = result;
  }

  function handleEnergyHarvest() {
    gameState = energyBarSystem.harvest(gameState);
  }

  function handleGoldenPixelCollect() {
    gameState = goldenPixelSystem.collect(gameState);
  }

  function handlePrestige() {
    gameState = prestigeEngine.performPrestige(gameState);
    showPrestigeShop = false;
  }

  function handlePrestigeUpgrade(upgradeId: string) {
    const result = prestigeEngine.purchasePrestigeUpgrade(gameState, upgradeId);
    if (result) gameState = result;
  }
</script>

<div class="idle-pixel-game">
  <!-- Header -->
  <header class="game-header">
    <CurrencyDisplay currency={gameState.currency} />
    <ProductionDisplay state={gameState} />

    <div class="header-actions">
      <button
        class="icon-button"
        onclick={() => showStats = !showStats}
        aria-label={$t.idlePixel.stats.title}
      >
        📊
      </button>
      <button
        class="icon-button"
        onclick={() => showPrestigeShop = !showPrestigeShop}
        aria-label={$t.idlePixel.prestige.shopTitle}
      >
        💎
      </button>
    </div>
  </header>

  <!-- Main Game Area -->
  <main class="game-main">
    <!-- Grid -->
    <div class="grid-area">
      <PixelGrid
        state={gameState}
        animations={mergeAnimations}
        onSlotPurchase={handlePurchaseSlot}
      />

      <!-- Goldener Pixel (schwebt über Grid) -->
      <GoldenPixel
        state={gameState}
        onCollect={handleGoldenPixelCollect}
      />
    </div>

    <!-- Sidebar -->
    <aside class="sidebar">
      <PurchasePanel
        state={gameState}
        onPurchasePixel={handlePurchasePixel}
      />

      <EnergyBar
        state={gameState}
        onHarvest={handleEnergyHarvest}
      />

      <UpgradePanel
        state={gameState}
        onPurchase={handlePurchaseUpgrade}
      />

      <PrestigeButton
        state={gameState}
        onPrestige={() => showPrestigeShop = true}
      />
    </aside>
  </main>

  <!-- Modals -->
  {#if showOfflineModal}
    <OfflineModal
      offlineTime={init.offlineTime}
      offlineEarnings={init.offlineEarnings}
      onClose={() => showOfflineModal = false}
    />
  {/if}

  {#if showPrestigeShop}
    <PrestigeShop
      state={gameState}
      onPurchase={handlePrestigeUpgrade}
      onPrestige={handlePrestige}
      onClose={() => showPrestigeShop = false}
    />
  {/if}

  {#if showStats}
    <StatsPanel
      state={gameState}
      onClose={() => showStats = false}
    />
  {/if}
</div>

<style>
  .idle-pixel-game {
    display: flex;
    flex-direction: column;
    height: 100vh;
    background: var(--color-bg-primary);
    color: var(--color-text-primary);
  }

  .game-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: var(--space-3) var(--space-4);
    background: var(--color-bg-secondary);
    border-bottom: 1px solid var(--color-border);
  }

  .header-actions {
    display: flex;
    gap: var(--space-2);
  }

  .icon-button {
    width: 40px;
    height: 40px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--color-bg-tertiary);
    border: none;
    border-radius: var(--radius-md);
    font-size: 20px;
    cursor: pointer;
    transition: background 0.2s;
  }

  .icon-button:hover {
    background: var(--color-bg-hover);
  }

  .game-main {
    flex: 1;
    display: grid;
    grid-template-columns: 1fr 280px;
    gap: var(--space-4);
    padding: var(--space-4);
    overflow: hidden;
  }

  .grid-area {
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .sidebar {
    display: flex;
    flex-direction: column;
    gap: var(--space-3);
    overflow-y: auto;
  }

  /* Mobile Layout */
  @media (max-width: 768px) {
    .game-main {
      grid-template-columns: 1fr;
      grid-template-rows: auto 1fr;
    }

    .sidebar {
      flex-direction: row;
      flex-wrap: wrap;
      overflow-x: auto;
    }
  }
</style>
```

---

## 2. Pixel-Grid

```svelte
<!-- PixelGrid.svelte -->
<script lang="ts">
  import { t } from '$lib/i18n';
  import { getAvailableSlotOptions, GridUtils } from '$lib/idle-pixel/grid';
  import { IDLE_PIXEL_COLORS } from '$lib/idle-pixel/constants';
  import type { IdlePixelGameState, MergeAnimation, SlotPurchaseOption } from '@spritebox/types';

  interface Props {
    state: IdlePixelGameState;
    animations: MergeAnimation[];
    onSlotPurchase: (position: number) => void;
  }

  let { state, animations, onSlotPurchase }: Props = $props();

  // Verfügbare Slots zum Kaufen
  const availableSlots = $derived(getAvailableSlotOptions(state.grid));
  const availablePositions = $derived(new Set(availableSlots.map(s => s.position)));

  // Grid-Dimensionen berechnen (nur freigeschaltete + verfügbare zeigen)
  const visibleBounds = $derived(() => {
    const positions = [
      ...state.grid.filter(s => s.unlocked).map(s => s.position),
      ...availableSlots.map(s => s.position),
    ];

    if (positions.length === 0) return { minX: 3, maxX: 4, minY: 3, maxY: 4 };

    const coords = positions.map(p => GridUtils.positionToCoords(p));
    return {
      minX: Math.max(0, Math.min(...coords.map(c => c.x)) - 1),
      maxX: Math.min(7, Math.max(...coords.map(c => c.x)) + 1),
      minY: Math.max(0, Math.min(...coords.map(c => c.y)) - 1),
      maxY: Math.min(7, Math.max(...coords.map(c => c.y)) + 1),
    };
  });

  // Hilfsfunktion für Animation-Zustand
  function getAnimationForSlot(position: number): MergeAnimation | undefined {
    return animations.find(
      a => a.fromPositions.includes(position) || a.toPosition === position
    );
  }
</script>

<div class="pixel-grid">
  {#each { length: 8 } as _, y}
    {#each { length: 8 } as _, x}
      {@const position = y * 8 + x}
      {@const slot = state.grid[position]}
      {@const isAvailable = availablePositions.has(position)}
      {@const availableOption = availableSlots.find(s => s.position === position)}
      {@const animation = getAnimationForSlot(position)}
      {@const bounds = visibleBounds()}
      {@const isVisible = x >= bounds.minX && x <= bounds.maxX && y >= bounds.minY && y <= bounds.maxY}

      {#if isVisible}
        <div
          class="grid-slot"
          class:unlocked={slot.unlocked}
          class:available={isAvailable}
          class:has-pixel={slot.pixel !== null}
          class:animating={animation !== undefined}
          style="grid-column: {x - bounds.minX + 1}; grid-row: {y - bounds.minY + 1}"
        >
          {#if slot.unlocked && slot.pixel}
            <!-- Pixel anzeigen -->
            <div
              class="pixel"
              style="background-color: {IDLE_PIXEL_COLORS[slot.pixel.colorLevel]}"
              class:merging={animation?.fromPositions.includes(position)}
              class:merged={animation?.toPosition === position}
            />
          {:else if isAvailable}
            <!-- Kaufbarer Slot -->
            <button
              class="slot-purchase"
              onclick={() => onSlotPurchase(position)}
              aria-label={$t.idlePixel.grid.purchaseSlot}
            >
              <span class="plus">+</span>
              <span class="cost">{availableOption?.cost}</span>
            </button>
          {:else if slot.unlocked}
            <!-- Leerer freigeschalteter Slot -->
            <div class="empty-slot" />
          {/if}
        </div>
      {/if}
    {/each}
  {/each}
</div>

<style>
  .pixel-grid {
    display: grid;
    gap: 4px;
    padding: var(--space-4);
    background: var(--color-bg-secondary);
    border-radius: var(--radius-lg);
    width: fit-content;
  }

  .grid-slot {
    width: 48px;
    height: 48px;
    border-radius: var(--radius-sm);
    display: flex;
    align-items: center;
    justify-content: center;
    transition: transform 0.2s;
  }

  .grid-slot.unlocked {
    background: var(--color-bg-tertiary);
  }

  .grid-slot.available {
    background: transparent;
    border: 2px dashed var(--color-border);
  }

  .pixel {
    width: 100%;
    height: 100%;
    border-radius: var(--radius-sm);
    transition: transform 0.3s ease-out;
  }

  .pixel.merging {
    animation: mergeOut 0.3s ease-in forwards;
  }

  .pixel.merged {
    animation: mergeIn 0.3s ease-out;
  }

  .empty-slot {
    width: 100%;
    height: 100%;
    background: var(--color-bg-tertiary);
    border-radius: var(--radius-sm);
    opacity: 0.3;
  }

  .slot-purchase {
    width: 100%;
    height: 100%;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    background: transparent;
    border: none;
    cursor: pointer;
    color: var(--color-text-secondary);
    transition: color 0.2s, transform 0.2s;
  }

  .slot-purchase:hover {
    color: var(--color-accent);
    transform: scale(1.05);
  }

  .plus {
    font-size: 20px;
    font-weight: bold;
  }

  .cost {
    font-size: var(--font-size-xs);
  }

  @keyframes mergeOut {
    0% { transform: scale(1); opacity: 1; }
    100% { transform: scale(0.5); opacity: 0; }
  }

  @keyframes mergeIn {
    0% { transform: scale(0.5); opacity: 0; }
    50% { transform: scale(1.2); }
    100% { transform: scale(1); opacity: 1; }
  }
</style>
```

---

## 3. Currency & Production Display

```svelte
<!-- CurrencyDisplay.svelte -->
<script lang="ts">
  import { formatNumber } from '$lib/utils';
  import { t } from '$lib/i18n';

  interface Props {
    currency: number;
  }

  let { currency }: Props = $props();

  // Animierter Wert
  let displayValue = $state(currency);
  let previousValue = $state(currency);

  $effect(() => {
    previousValue = displayValue;
    displayValue = currency;
  });

  const isIncreasing = $derived(displayValue > previousValue);
</script>

<div class="currency-display">
  <span class="icon">🟦</span>
  <span class="value" class:increasing={isIncreasing}>
    {formatNumber(Math.floor(currency))}
  </span>
  <span class="label">{$t.idlePixel.currency}</span>
</div>

<style>
  .currency-display {
    display: flex;
    align-items: center;
    gap: var(--space-2);
  }

  .icon {
    font-size: 24px;
  }

  .value {
    font-size: var(--font-size-xl);
    font-weight: 700;
    font-variant-numeric: tabular-nums;
    transition: color 0.1s;
  }

  .value.increasing {
    color: var(--color-success);
  }

  .label {
    color: var(--color-text-secondary);
    font-size: var(--font-size-sm);
  }
</style>
```

```svelte
<!-- ProductionDisplay.svelte -->
<script lang="ts">
  import { formatNumber } from '$lib/utils';
  import { calculateTotalProduction } from '$lib/idle-pixel/core';
  import { t } from '$lib/i18n';
  import type { IdlePixelGameState } from '@spritebox/types';

  interface Props {
    state: IdlePixelGameState;
  }

  let { state }: Props = $props();

  const production = $derived(calculateTotalProduction(state));
</script>

<div class="production-display">
  <span class="value">+{formatNumber(production)}</span>
  <span class="label">{$t.idlePixel.perSecond}</span>
</div>

<style>
  .production-display {
    display: flex;
    align-items: baseline;
    gap: var(--space-1);
  }

  .value {
    color: var(--color-success);
    font-size: var(--font-size-lg);
    font-weight: 600;
  }

  .label {
    color: var(--color-text-secondary);
    font-size: var(--font-size-sm);
  }
</style>
```

---

## 4. Purchase Panel

```svelte
<!-- PurchasePanel.svelte -->
<script lang="ts">
  import { formatNumber } from '$lib/utils';
  import { calculatePixelCost, getNewPixelColorLevel } from '$lib/idle-pixel/purchase';
  import { IDLE_PIXEL_COLORS } from '$lib/idle-pixel/constants';
  import { t } from '$lib/i18n';
  import type { IdlePixelGameState } from '@spritebox/types';

  interface Props {
    state: IdlePixelGameState;
    onPurchasePixel: () => void;
  }

  let { state, onPurchasePixel }: Props = $props();

  const cost = $derived(calculatePixelCost(state));
  const canAfford = $derived(state.currency >= cost);
  const pixelLevel = $derived(getNewPixelColorLevel(state));
  const pixelColor = $derived(IDLE_PIXEL_COLORS[pixelLevel]);
</script>

<div class="purchase-panel">
  <h3>{$t.idlePixel.purchase.title}</h3>

  <button
    class="purchase-button"
    class:disabled={!canAfford}
    onclick={onPurchasePixel}
  >
    <div class="pixel-preview" style="background-color: {pixelColor}" />
    <div class="purchase-info">
      <span class="action">{$t.idlePixel.purchase.buyPixel}</span>
      <span class="cost" class:affordable={canAfford}>
        {formatNumber(cost)} {$t.idlePixel.currency}
      </span>
    </div>
  </button>

  <p class="hint">
    {$t.idlePixel.purchase.hint}
  </p>
</div>

<style>
  .purchase-panel {
    background: var(--color-bg-secondary);
    border-radius: var(--radius-md);
    padding: var(--space-3);
  }

  h3 {
    margin: 0 0 var(--space-2) 0;
    font-size: var(--font-size-sm);
    color: var(--color-text-secondary);
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .purchase-button {
    width: 100%;
    display: flex;
    align-items: center;
    gap: var(--space-3);
    padding: var(--space-3);
    background: var(--color-bg-tertiary);
    border: 2px solid transparent;
    border-radius: var(--radius-md);
    cursor: pointer;
    transition: border-color 0.2s, transform 0.1s;
  }

  .purchase-button:hover:not(.disabled) {
    border-color: var(--color-accent);
    transform: scale(1.02);
  }

  .purchase-button.disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .pixel-preview {
    width: 32px;
    height: 32px;
    border-radius: var(--radius-sm);
    flex-shrink: 0;
  }

  .purchase-info {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
  }

  .action {
    font-weight: 600;
    color: var(--color-text-primary);
  }

  .cost {
    font-size: var(--font-size-sm);
    color: var(--color-error);
  }

  .cost.affordable {
    color: var(--color-success);
  }

  .hint {
    margin: var(--space-2) 0 0 0;
    font-size: var(--font-size-xs);
    color: var(--color-text-tertiary);
  }
</style>
```

---

## 5. Animations (tokens.css Ergänzung)

```css
/* In apps/web/src/lib/styles/tokens.css hinzufügen */

/* ═══════════════════════════════════════════════════════════
   IDLE PIXEL ANIMATIONS
   ═══════════════════════════════════════════════════════════ */

@keyframes idle-pixel-merge-out {
  0% {
    transform: scale(1);
    opacity: 1;
  }
  100% {
    transform: scale(0.5);
    opacity: 0;
  }
}

@keyframes idle-pixel-merge-in {
  0% {
    transform: scale(0.5);
    opacity: 0;
  }
  50% {
    transform: scale(1.2);
  }
  100% {
    transform: scale(1);
    opacity: 1;
  }
}

@keyframes idle-pixel-pulse {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.7;
  }
}

@keyframes idle-pixel-bounce {
  0%, 100% {
    transform: translate(-50%, -50%) scale(1);
  }
  50% {
    transform: translate(-50%, -50%) scale(1.1);
  }
}

@keyframes idle-pixel-glow {
  0%, 100% {
    box-shadow: 0 0 20px var(--color-accent), 0 0 40px var(--color-accent-dim);
  }
  50% {
    box-shadow: 0 0 30px var(--color-accent), 0 0 60px var(--color-accent-dim);
  }
}

@keyframes idle-pixel-float-up {
  0% {
    transform: translateY(0);
    opacity: 1;
  }
  100% {
    transform: translateY(-30px);
    opacity: 0;
  }
}

@keyframes idle-pixel-shake {
  0%, 100% {
    transform: translateX(0);
  }
  25% {
    transform: translateX(-2px);
  }
  75% {
    transform: translateX(2px);
  }
}
```

---

## Implementierungs-Checkliste

- [ ] `IdlePixelGame.svelte` Haupt-Komponente
- [ ] `PixelGrid.svelte` mit dynamischer Größe
- [ ] `PixelSlot.svelte` (falls benötigt)
- [ ] `CurrencyDisplay.svelte`
- [ ] `ProductionDisplay.svelte`
- [ ] `PurchasePanel.svelte`
- [ ] `UpgradePanel.svelte`
- [ ] `EnergyBar.svelte` (aus Phase 4)
- [ ] `GoldenPixel.svelte` (aus Phase 4)
- [ ] `PrestigeButton.svelte`
- [ ] `PrestigeShop.svelte`
- [ ] `OfflineModal.svelte` (aus Phase 6)
- [ ] `StatsPanel.svelte`
- [ ] Barrel Export (`index.ts`)
- [ ] CSS-Animationen in `tokens.css`
- [ ] Responsive Layout (Mobile)
- [ ] Keyboard Navigation
- [ ] i18n für alle Texte
