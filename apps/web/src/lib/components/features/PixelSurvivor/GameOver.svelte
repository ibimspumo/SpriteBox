<!-- PixelSurvivor/GameOver.svelte - Game over screen -->
<script lang="ts">
  import { Button } from '../../atoms';
  import { t } from '$lib/i18n';
  import { PALETTE, hexCharToIndex } from '$lib/palette';
  import { survivorRun, endRun, enterCharacterCreation } from '$lib/survivor';

  // Get color from pixel hex character
  function getPixelColor(pixel: string): string {
    const index = hexCharToIndex(pixel);
    return PALETTE[index]?.hex ?? PALETTE[0].hex;
  }

  let mounted = $state(false);

  // Get final run data
  const run = $derived($survivorRun);

  $effect(() => {
    setTimeout(() => {
      mounted = true;
    }, 100);
  });

  function handleTryAgain(): void {
    // End the run (update stats) before starting character creation
    endRun(false);
    enterCharacterCreation();
  }

  function handleBackToMenu(): void {
    // End the run (update stats) - this will also reset to menu since run becomes null
    endRun(false);
  }

  // Calculate score based on days survived, level, gold, etc.
  const finalScore = $derived(() => {
    if (!run) return 0;
    const dayScore = run.day * 100;
    const levelScore = run.level * 50;
    const goldScore = run.gold;
    return dayScore + levelScore + goldScore;
  });
</script>

<div class="gameover-screen" class:mounted>
  <!-- Header -->
  <div class="gameover-header">
    <h1 class="gameover-title">{$t.pixelSurvivor.gameOver}</h1>
  </div>

  <!-- Character Preview -->
  {#if run?.character?.pixels}
    <div class="character-preview">
      <div class="preview-grid dead">
        {#each run.character.pixels.split('') as pixel, i}
          {@const row = Math.floor(i / 8)}
          {@const col = i % 8}
          <div
            class="preview-pixel"
            style="background-color: {getPixelColor(pixel)}; grid-row: {row + 1}; grid-column: {col + 1};"
          ></div>
        {/each}
      </div>
    </div>
  {/if}

  <!-- Stats -->
  <div class="stats-container">
    <div class="stat-row">
      <span class="stat-label">{$t.pixelSurvivor.day}</span>
      <span class="stat-value">{run?.day ?? 1}</span>
    </div>
    <div class="stat-row">
      <span class="stat-label">{$t.pixelSurvivor.level}</span>
      <span class="stat-value">{run?.level ?? 1}</span>
    </div>
    <div class="stat-row">
      <span class="stat-label">{$t.pixelSurvivor.gold}</span>
      <span class="stat-value">{run?.gold ?? 0}</span>
    </div>
  </div>

  <!-- Final Score -->
  <div class="score-container">
    <span class="score-label">{$t.pixelSurvivor.finalScore.replace('{{score}}', '')}</span>
    <span class="score-value">{finalScore()}</span>
  </div>

  <!-- Actions -->
  <div class="actions">
    <Button variant="primary" size="lg" onclick={handleTryAgain}>
      {$t.pixelSurvivor.tryAgain}
    </Button>
    <Button variant="ghost" size="md" onclick={handleBackToMenu}>
      {$t.pixelSurvivor.backToMenu}
    </Button>
  </div>
</div>

<style>
  .gameover-screen {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--space-4);
    width: 100%;
    max-width: 400px;
    padding: var(--space-4);
    opacity: 0;
    transform: translateY(20px);
    transition: all 0.4s ease;
  }

  .gameover-screen.mounted {
    opacity: 1;
    transform: translateY(0);
  }

  .gameover-header {
    text-align: center;
  }

  .gameover-title {
    margin: 0;
    font-size: var(--font-size-2xl);
    font-weight: var(--font-weight-bold);
    color: var(--color-danger);
    text-transform: uppercase;
    letter-spacing: 3px;
  }

  .character-preview {
    display: flex;
    justify-content: center;
  }

  .preview-grid {
    display: grid;
    grid-template-columns: repeat(8, 1fr);
    gap: 2px;
    padding: var(--space-2);
    background: var(--color-bg-secondary);
    border: 3px solid var(--color-bg-tertiary);
    border-radius: var(--radius-sm);
  }

  .preview-grid.dead {
    filter: grayscale(100%);
    opacity: 0.7;
  }

  .preview-pixel {
    width: 20px;
    height: 20px;
    border-radius: 1px;
  }

  .stats-container {
    width: 100%;
    padding: var(--space-3);
    background: var(--color-bg-secondary);
    border: 2px solid var(--color-bg-tertiary);
    border-radius: var(--radius-md);
  }

  .stat-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: var(--space-2) 0;
  }

  .stat-row:not(:last-child) {
    border-bottom: 1px solid var(--color-bg-tertiary);
  }

  .stat-label {
    font-size: var(--font-size-sm);
    color: var(--color-text-secondary);
  }

  .stat-value {
    font-size: var(--font-size-md);
    font-weight: var(--font-weight-bold);
    color: var(--color-text-primary);
  }

  .score-container {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--space-1);
    padding: var(--space-4);
    background: var(--color-bg-tertiary);
    border-radius: var(--radius-md);
    width: 100%;
  }

  .score-label {
    font-size: var(--font-size-sm);
    color: var(--color-text-muted);
    text-transform: uppercase;
    letter-spacing: 1px;
  }

  .score-value {
    font-size: var(--font-size-2xl);
    font-weight: var(--font-weight-bold);
    color: var(--color-accent);
  }

  .actions {
    display: flex;
    flex-direction: column;
    gap: var(--space-3);
    width: 100%;
    margin-top: var(--space-2);
  }

  @media (max-width: 480px) {
    .gameover-screen {
      padding: var(--space-3);
    }

    .preview-pixel {
      width: 16px;
      height: 16px;
    }
  }
</style>
