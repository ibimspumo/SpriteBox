<!-- PixelSurvivor/Victory.svelte - Victory screen for surviving 30 days -->
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

  function handlePlayAgain(): void {
    // End the run (update stats) before starting character creation
    endRun(true);
    enterCharacterCreation();
  }

  function handleBackToMenu(): void {
    // End the run (update stats) - this will also reset to menu since run becomes null
    endRun(true);
  }

  // Calculate final score
  const finalScore = $derived(() => {
    if (!run) return 0;
    const dayScore = 30 * 100; // Survived all 30 days
    const levelScore = run.level * 50;
    const goldScore = run.gold;
    const hpBonus = run.hp; // Bonus for remaining HP
    return dayScore + levelScore + goldScore + hpBonus;
  });
</script>

<div class="victory-screen" class:mounted>
  <!-- Header -->
  <div class="victory-header">
    <div class="victory-badge">
      <span class="crown">👑</span>
    </div>
    <h1 class="victory-title">{$t.pixelSurvivor.victory}</h1>
    <p class="victory-subtitle">{$t.pixelSurvivor.youSurvived}</p>
  </div>

  <!-- Character Preview -->
  {#if run?.character?.pixels}
    <div class="character-preview">
      <div class="preview-grid victorious">
        {#each run.character.pixels.split('') as pixel, i}
          {@const row = Math.floor(i / 8)}
          {@const col = i % 8}
          <div
            class="preview-pixel"
            style="background-color: {getPixelColor(pixel)}; grid-row: {row + 1}; grid-column: {col + 1};"
          ></div>
        {/each}
      </div>
      <div class="sparkles"></div>
    </div>
  {/if}

  <!-- Stats -->
  <div class="stats-container">
    <div class="stat-row">
      <span class="stat-label">{$t.pixelSurvivor.level}</span>
      <span class="stat-value">{run?.level ?? 1}</span>
    </div>
    <div class="stat-row">
      <span class="stat-label">{$t.pixelSurvivor.hp}</span>
      <span class="stat-value">{run?.hp ?? 0}/{run?.maxHp ?? 100}</span>
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
    <Button variant="primary" size="lg" onclick={handlePlayAgain}>
      {$t.pixelSurvivor.tryAgain}
    </Button>
    <Button variant="ghost" size="md" onclick={handleBackToMenu}>
      {$t.pixelSurvivor.backToMenu}
    </Button>
  </div>
</div>

<style>
  .victory-screen {
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

  .victory-screen.mounted {
    opacity: 1;
    transform: translateY(0);
  }

  .victory-header {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--space-2);
    text-align: center;
  }

  .victory-badge {
    width: 60px;
    height: 60px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: linear-gradient(135deg, #d4af37 0%, #f5e6a3 50%, #d4af37 100%);
    border-radius: 50%;
    animation: glow 2s ease-in-out infinite;
  }

  .crown {
    font-size: 32px;
    animation: bounce 1s ease-in-out infinite;
  }

  .victory-title {
    margin: 0;
    font-size: var(--font-size-2xl);
    font-weight: var(--font-weight-bold);
    color: #d4af37;
    text-transform: uppercase;
    letter-spacing: 4px;
  }

  .victory-subtitle {
    margin: 0;
    font-size: var(--font-size-md);
    color: var(--color-text-secondary);
  }

  .character-preview {
    position: relative;
    display: flex;
    justify-content: center;
  }

  .preview-grid {
    display: grid;
    grid-template-columns: repeat(8, 1fr);
    gap: 2px;
    padding: var(--space-2);
    background: var(--color-bg-secondary);
    border: 3px solid #d4af37;
    border-radius: var(--radius-sm);
  }

  .preview-grid.victorious {
    animation: victory-pulse 2s ease-in-out infinite;
  }

  .preview-pixel {
    width: 20px;
    height: 20px;
    border-radius: 1px;
  }

  .sparkles {
    position: absolute;
    inset: -20px;
    pointer-events: none;
    background:
      radial-gradient(circle at 10% 20%, #d4af37 1px, transparent 1px),
      radial-gradient(circle at 90% 30%, #d4af37 1px, transparent 1px),
      radial-gradient(circle at 20% 80%, #d4af37 1px, transparent 1px),
      radial-gradient(circle at 80% 70%, #d4af37 1px, transparent 1px);
    animation: sparkle 2s ease-in-out infinite;
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
    background: linear-gradient(135deg, var(--color-bg-tertiary) 0%, rgba(212, 175, 55, 0.2) 100%);
    border: 2px solid #d4af37;
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
    color: #d4af37;
  }

  .actions {
    display: flex;
    flex-direction: column;
    gap: var(--space-3);
    width: 100%;
    margin-top: var(--space-2);
  }

  @keyframes glow {
    0%,
    100% {
      box-shadow: 0 0 10px rgba(212, 175, 55, 0.5);
    }
    50% {
      box-shadow: 0 0 25px rgba(212, 175, 55, 0.8);
    }
  }

  @keyframes bounce {
    0%,
    100% {
      transform: translateY(0);
    }
    50% {
      transform: translateY(-4px);
    }
  }

  @keyframes victory-pulse {
    0%,
    100% {
      box-shadow: 0 0 0 0 rgba(212, 175, 55, 0.4);
    }
    50% {
      box-shadow: 0 0 0 10px rgba(212, 175, 55, 0);
    }
  }

  @keyframes sparkle {
    0%,
    100% {
      opacity: 0.3;
    }
    50% {
      opacity: 1;
    }
  }

  @media (max-width: 480px) {
    .victory-screen {
      padding: var(--space-3);
    }

    .preview-pixel {
      width: 16px;
      height: 16px;
    }
  }
</style>
