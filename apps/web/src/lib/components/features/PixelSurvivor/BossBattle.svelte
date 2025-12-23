<!-- PixelSurvivor/BossBattle.svelte - Day 30 boss battle -->
<script lang="ts">
  import { Button } from '../../atoms';
  import { PixelCanvas } from '../../utility';
  import { t, currentLanguage } from '$lib/i18n';
  import { PALETTE } from '$lib/palette';
  import {
    survivorRun,
    currentDrawing,
    survivorSelectedColor,
    getRandomBoss,
    attackBoss,
    fleeBoss,
    initBossBattle,
    getLocalizedText,
    type Boss,
  } from '$lib/survivor';

  let mounted = $state(false);
  let boss = $state<Boss | null>(null);
  let loading = $state(true);
  let attacking = $state(false);
  let lastAttackResult = $state<{
    damage: number;
    bossAttack: number;
  } | null>(null);

  // Get current run data
  const run = $derived($survivorRun);
  const bossHpPercent = $derived(
    run?.boss ? Math.round((run.boss.currentHp / run.boss.maxHp) * 100) : 100
  );

  // Load boss data
  $effect(() => {
    loadBoss();
  });

  async function loadBoss(): Promise<void> {
    loading = true;
    await initBossBattle();
    boss = await getRandomBoss();
    currentDrawing.set('1'.repeat(64));
    survivorSelectedColor.set(0);
    loading = false;
  }

  $effect(() => {
    setTimeout(() => {
      mounted = true;
    }, 100);
  });

  function handlePixelChange(newPixels: string): void {
    currentDrawing.set(newPixels);
  }

  function handleColorSelect(index: number): void {
    survivorSelectedColor.set(index);
  }

  async function handleAttack(): Promise<void> {
    if (attacking) return;
    attacking = true;

    const result = await attackBoss($currentDrawing);
    lastAttackResult = {
      damage: result.damage,
      bossAttack: result.bossAttack,
    };

    // Clear canvas for next attack
    if (!result.bossDefeated && !result.playerDied) {
      currentDrawing.set('1'.repeat(64));
    }

    attacking = false;
  }

  function handleFlee(): void {
    fleeBoss();
  }

  // Count non-empty pixels
  const pixelCount = $derived(
    $currentDrawing.split('').filter((c) => c !== '1').length
  );
</script>

<div class="boss-battle" class:mounted>
  {#if loading}
    <div class="loading">
      <div class="loading-spinner"></div>
      <span>{$t.pixelSurvivor.analyzing}...</span>
    </div>
  {:else}
    <!-- Boss Header -->
    <div class="boss-header">
      <h1 class="boss-title">{$t.pixelSurvivor.bossTitle}</h1>
      <p class="boss-subtitle">{$t.pixelSurvivor.bossSubtitle}</p>
    </div>

    <!-- Boss Info -->
    {#if boss}
      <div class="boss-info">
        <h2 class="boss-name">
          {getLocalizedText(boss.name, boss.nameDE, $currentLanguage)}
        </h2>
        {#if boss.special}
          <p class="boss-special">
            {getLocalizedText(boss.special, boss.specialDE, $currentLanguage)}
          </p>
        {/if}
      </div>
    {/if}

    <!-- HP Bars -->
    <div class="hp-section">
      <div class="hp-bar-container">
        <span class="hp-label">{$t.pixelSurvivor.bossHp}</span>
        <div class="hp-bar boss-hp">
          <div class="hp-fill" style="width: {bossHpPercent}%"></div>
        </div>
        <span class="hp-value">{run?.boss?.currentHp ?? 0}/{run?.boss?.maxHp ?? 0}</span>
      </div>

      <div class="hp-bar-container">
        <span class="hp-label">{$t.pixelSurvivor.yourHp}</span>
        <div class="hp-bar player-hp">
          <div class="hp-fill" style="width: {((run?.hp ?? 0) / (run?.maxHp ?? 100)) * 100}%"></div>
        </div>
        <span class="hp-value">{run?.hp ?? 0}/{run?.maxHp ?? 0}</span>
      </div>
    </div>

    <!-- Last Attack Result -->
    {#if lastAttackResult}
      <div class="attack-result">
        <span class="damage-dealt">-{lastAttackResult.damage} HP</span>
        <span class="damage-taken">-{lastAttackResult.bossAttack} HP</span>
      </div>
    {/if}

    <!-- Drawing Section -->
    <div class="drawing-section">
      <h3 class="drawing-title">{$t.pixelSurvivor.drawWeapon}</h3>

      <div class="canvas-wrapper">
        <PixelCanvas
          pixelData={$currentDrawing}
          editable={true}
          onchange={handlePixelChange}
          size={180}
        />
      </div>

      <!-- Color Palette -->
      <div class="palette-container">
        <div class="palette">
          {#each PALETTE as color, index}
            <button
              class="color-button"
              class:selected={$survivorSelectedColor === index}
              style="--color: {color.hex}"
              onclick={() => handleColorSelect(index)}
              title={color.name}
              aria-label={color.name}
            >
              <span class="color-swatch" style="background-color: {color.hex}"></span>
            </button>
          {/each}
        </div>
      </div>
    </div>

    <!-- Actions -->
    <div class="actions">
      <Button variant="ghost" size="sm" onclick={handleFlee}>
        {$t.pixelSurvivor.flee}
      </Button>
      <Button
        variant="primary"
        size="lg"
        onclick={handleAttack}
        disabled={pixelCount < 3 || attacking}
      >
        {#if attacking}
          {$t.pixelSurvivor.analyzing}...
        {:else}
          {$t.pixelSurvivor.attackBoss}
        {/if}
      </Button>
    </div>
  {/if}
</div>

<style>
  .boss-battle {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--space-3);
    width: 100%;
    max-width: 400px;
    padding: var(--space-4);
    opacity: 0;
    transform: translateY(20px);
    transition: all 0.4s ease;
  }

  .boss-battle.mounted {
    opacity: 1;
    transform: translateY(0);
  }

  .loading {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--space-3);
    padding: var(--space-8);
  }

  .loading-spinner {
    width: 40px;
    height: 40px;
    border: 4px solid var(--color-bg-tertiary);
    border-top-color: var(--color-danger);
    border-radius: 50%;
    animation: spin 1s linear infinite;
  }

  .boss-header {
    text-align: center;
  }

  .boss-title {
    margin: 0;
    font-size: var(--font-size-xl);
    font-weight: var(--font-weight-bold);
    color: var(--color-danger);
    text-transform: uppercase;
    letter-spacing: 2px;
  }

  .boss-subtitle {
    margin: var(--space-1) 0 0;
    font-size: var(--font-size-sm);
    color: var(--color-text-secondary);
  }

  .boss-info {
    width: 100%;
    padding: var(--space-3);
    background: linear-gradient(135deg, var(--color-bg-secondary) 0%, rgba(200, 50, 50, 0.1) 100%);
    border: 3px solid var(--color-danger);
    border-radius: var(--radius-md);
    text-align: center;
  }

  .boss-name {
    margin: 0;
    font-size: var(--font-size-lg);
    font-weight: var(--font-weight-bold);
    color: var(--color-danger);
  }

  .boss-special {
    margin: var(--space-2) 0 0;
    font-size: var(--font-size-sm);
    color: var(--color-text-secondary);
    font-style: italic;
  }

  .hp-section {
    width: 100%;
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
  }

  .hp-bar-container {
    display: flex;
    align-items: center;
    gap: var(--space-2);
  }

  .hp-label {
    width: 60px;
    font-size: var(--font-size-xs);
    color: var(--color-text-muted);
    text-transform: uppercase;
  }

  .hp-bar {
    flex: 1;
    height: 16px;
    background: var(--color-bg-tertiary);
    border-radius: 8px;
    overflow: hidden;
  }

  .hp-fill {
    height: 100%;
    border-radius: 8px;
    transition: width 0.3s ease;
  }

  .boss-hp .hp-fill {
    background: var(--color-danger);
  }

  .player-hp .hp-fill {
    background: var(--color-success);
  }

  .hp-value {
    width: 70px;
    font-size: var(--font-size-sm);
    font-weight: var(--font-weight-bold);
    color: var(--color-text-primary);
    text-align: right;
  }

  .attack-result {
    display: flex;
    gap: var(--space-4);
    padding: var(--space-2);
  }

  .damage-dealt {
    padding: var(--space-1) var(--space-2);
    background: var(--color-success);
    border-radius: var(--radius-sm);
    font-size: var(--font-size-sm);
    font-weight: var(--font-weight-bold);
    color: white;
  }

  .damage-taken {
    padding: var(--space-1) var(--space-2);
    background: var(--color-danger);
    border-radius: var(--radius-sm);
    font-size: var(--font-size-sm);
    font-weight: var(--font-weight-bold);
    color: white;
  }

  .drawing-section {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--space-2);
    width: 100%;
  }

  .drawing-title {
    margin: 0;
    font-size: var(--font-size-sm);
    font-weight: var(--font-weight-bold);
    color: var(--color-text-muted);
    text-transform: uppercase;
  }

  .canvas-wrapper {
    background: var(--color-bg-secondary);
    padding: var(--space-2);
    border: 3px solid var(--color-bg-tertiary);
    border-radius: var(--radius-md);
  }

  .palette-container {
    width: 100%;
    max-width: 240px;
  }

  .palette {
    display: grid;
    grid-template-columns: repeat(8, 1fr);
    gap: 2px;
    padding: var(--space-1);
    background: var(--color-bg-secondary);
    border: 2px solid var(--color-bg-tertiary);
    border-radius: var(--radius-sm);
  }

  .color-button {
    aspect-ratio: 1;
    padding: 0;
    background: var(--color-bg-tertiary);
    border: 2px solid var(--color-bg-elevated);
    border-radius: 2px;
    cursor: pointer;
    transition: transform var(--transition-fast);
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .color-swatch {
    width: 65%;
    height: 65%;
    border-radius: 1px;
  }

  .color-button:hover {
    transform: scale(1.1);
    z-index: 1;
  }

  .color-button.selected {
    border-color: var(--color-accent);
    transform: scale(1.15);
    z-index: 2;
  }

  .actions {
    display: flex;
    justify-content: space-between;
    align-items: center;
    width: 100%;
    gap: var(--space-3);
  }

  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }

  @media (max-width: 480px) {
    .boss-battle {
      padding: var(--space-3);
    }

    .canvas-wrapper {
      padding: var(--space-1);
    }
  }
</style>
