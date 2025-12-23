<!-- CopyCatResult - Shows comparison results for CopyCat mode -->
<script lang="ts">
  import { PixelCanvas } from '../../utility';
  import { Timer } from '../../utility';
  import { copyCat, currentUser } from '$lib/stores';
  import { t } from '$lib/i18n';

  let results = $derived($copyCat.results);
  let winner = $derived($copyCat.winner);
  let referenceImage = $derived($copyCat.referenceImage);
  let isDraw = $derived($copyCat.isDraw);
  let user = $derived($currentUser);

  let isWinner = $derived(winner?.user.fullName === user?.fullName);
  let myResult = $derived(results.find(r => r.user.fullName === user?.fullName));
</script>

<div class="result-container">
  <div class="header">
    {#if isDraw}
      <h1 class="title draw">{$t.copyCat.draw}!</h1>
    {:else if isWinner}
      <h1 class="title winner">{$t.copyCat.youWon}</h1>
    {:else}
      <h1 class="title loser">{$t.copyCat.youLost}</h1>
    {/if}
  </div>

  <div class="timer-section">
    <Timer />
  </div>

  <!-- Reference image -->
  <div class="reference-section">
    <h2 class="section-title">{$t.copyCat.referenceImage}</h2>
    {#if referenceImage}
      <div class="canvas-wrapper reference">
        <PixelCanvas pixelData={referenceImage} size={120} readonly />
      </div>
    {/if}
  </div>

  <!-- Player results -->
  <div class="players-section">
    {#each results as result (result.playerId)}
      {@const isCurrentUser = result.user.fullName === user?.fullName}
      {@const isResultWinner = !isDraw && winner?.playerId === result.playerId}
      <div class="player-result" class:winner={isResultWinner} class:you={isCurrentUser}>
        <div class="player-header">
          <span class="player-name">
            {isCurrentUser ? $t.common.you : result.user.displayName}
            {#if isResultWinner}
              <span class="crown">👑</span>
            {/if}
          </span>
        </div>
        <div class="canvas-wrapper">
          <PixelCanvas pixelData={result.pixels} size={100} readonly />
        </div>
        <div class="stats">
          <div class="stat accuracy">
            <span class="stat-value">{result.accuracy}%</span>
            <span class="stat-label">{$t.copyCat.accuracy}</span>
          </div>
          <div class="stat pixels">
            <span class="stat-value">{result.matchingPixels}/64</span>
            <span class="stat-label">{$t.copyCat.matchingPixels}</span>
          </div>
        </div>
      </div>
    {/each}
  </div>
</div>

<style>
  .result-container {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--space-5);
    padding: var(--space-6);
    width: 100%;
    max-width: 600px;
    margin: 0 auto;
  }

  .header {
    text-align: center;
  }

  .title {
    font-size: var(--font-size-2xl);
    margin: 0;
    text-transform: uppercase;
    letter-spacing: 2px;
  }

  .title.winner {
    color: var(--color-success);
    animation: celebrate 0.5s ease-out;
  }

  .title.loser {
    color: var(--color-error);
  }

  .title.draw {
    color: var(--color-warning);
  }

  .timer-section {
    width: 100%;
    display: flex;
    justify-content: center;
  }

  .reference-section {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--space-2);
  }

  .section-title {
    font-size: var(--font-size-sm);
    color: var(--color-text-secondary);
    text-transform: uppercase;
    letter-spacing: 1px;
    margin: 0;
  }

  .players-section {
    display: flex;
    gap: var(--space-6);
    flex-wrap: wrap;
    justify-content: center;
    width: 100%;
  }

  .player-result {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--space-3);
    padding: var(--space-4);
    background: var(--color-bg-secondary);
    border: 3px solid var(--color-bg-tertiary);
    border-radius: var(--radius-md);
    transition: all 0.2s ease;
  }

  .player-result.winner {
    border-color: var(--color-success);
    background: rgba(var(--color-success-rgb), 0.1);
  }

  .player-result.you {
    border-color: var(--color-accent);
  }

  .player-header {
    display: flex;
    align-items: center;
    gap: var(--space-2);
  }

  .player-name {
    font-size: var(--font-size-md);
    font-weight: 600;
    color: var(--color-text-primary);
    display: flex;
    align-items: center;
    gap: var(--space-2);
  }

  .crown {
    font-size: var(--font-size-lg);
    animation: bounce 1s ease-in-out infinite;
  }

  .canvas-wrapper {
    padding: var(--space-2);
    background: var(--color-bg-tertiary);
    border-radius: var(--radius-sm);
  }

  .canvas-wrapper.reference {
    border: 2px solid var(--color-accent);
  }

  .stats {
    display: flex;
    gap: var(--space-4);
  }

  .stat {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--space-1);
  }

  .stat-value {
    font-size: var(--font-size-lg);
    font-weight: 700;
    color: var(--color-text-primary);
  }

  .stat-label {
    font-size: var(--font-size-xs);
    color: var(--color-text-muted);
    text-transform: uppercase;
    letter-spacing: 1px;
  }

  .stat.accuracy .stat-value {
    color: var(--color-success);
  }

  @keyframes celebrate {
    0% {
      transform: scale(0.8);
      opacity: 0;
    }
    50% {
      transform: scale(1.1);
    }
    100% {
      transform: scale(1);
      opacity: 1;
    }
  }

  @keyframes bounce {
    0%, 100% {
      transform: translateY(0);
    }
    50% {
      transform: translateY(-5px);
    }
  }

  @media (max-width: 480px) {
    .result-container {
      padding: var(--space-4);
    }

    .players-section {
      flex-direction: column;
      align-items: center;
    }

    .player-result {
      width: 100%;
      max-width: 200px;
    }
  }
</style>
