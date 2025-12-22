<!-- Voting Feature Component -->
<script lang="ts">
  import { voting } from '$lib/stores';
  import { vote } from '$lib/socketBridge';
  import { PixelCanvas, Timer } from '../utility';

  function handleVote(chosenId: string): void {
    vote(chosenId);
  }
</script>

<div class="voting">
  <div class="header">
    <span class="round">ROUND {$voting.round}/{$voting.totalRounds}</span>
    <Timer />
  </div>

  {#if $voting.hasVoted}
    <div class="waiting-container">
      <span class="waiting-text">VOTED! WAITING FOR NEXT ROUND...</span>
    </div>
  {:else if $voting.imageA && $voting.imageB}
    <p class="instruction">WHICH PIXEL ART IS BETTER?</p>

    <div class="duel">
      <button
        class="vote-card"
        onclick={() => handleVote($voting.imageA!.playerId)}
        aria-label="Vote for image A"
      >
        <div class="canvas-wrapper">
          <PixelCanvas
            pixelData={$voting.imageA.pixels}
            size={140}
            readonly
          />
        </div>
        <span class="vote-hint">CLICK TO VOTE</span>
      </button>

      <div class="vs-container">
        <span class="vs">VS</span>
      </div>

      <button
        class="vote-card"
        onclick={() => handleVote($voting.imageB!.playerId)}
        aria-label="Vote for image B"
      >
        <div class="canvas-wrapper">
          <PixelCanvas
            pixelData={$voting.imageB.pixels}
            size={140}
            readonly
          />
        </div>
        <span class="vote-hint">CLICK TO VOTE</span>
      </button>
    </div>
  {:else}
    <div class="waiting-container">
      <span class="waiting-text">LOADING IMAGES...</span>
    </div>
  {/if}
</div>

<style>
  .voting {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--space-8);
    padding: var(--space-4);
    max-width: 100%;
  }

  .header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    width: 100%;
    max-width: 600px;
    padding: var(--space-4);
    background: var(--color-bg-secondary);
    border: 3px solid var(--color-border-strong);
    border-radius: var(--radius-md);
    box-shadow: var(--shadow-pixel);
  }

  .round {
    font-size: var(--font-size-md);
    font-weight: var(--font-weight-bold);
    color: var(--color-brand);
    text-transform: uppercase;
    letter-spacing: 2px;
  }

  .instruction {
    font-size: var(--font-size-lg);
    font-weight: var(--font-weight-bold);
    color: var(--color-text-primary);
    text-transform: uppercase;
    letter-spacing: 1px;
    margin: 0;
    text-align: center;
    text-shadow: 2px 2px 0 rgba(0, 0, 0, 0.5);
  }

  .duel {
    display: flex;
    align-items: center;
    gap: var(--space-8);
    justify-content: center;
    flex-wrap: wrap;
  }

  .vote-card {
    position: relative;
    background: var(--color-bg-secondary);
    border: 3px solid var(--color-border-strong);
    border-radius: var(--radius-md);
    padding: var(--space-4);
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--space-3);
    cursor: pointer;
    transition: all var(--transition-fast);
    box-shadow: var(--shadow-pixel);
    font-family: var(--font-family);
  }

  .vote-card:hover {
    transform: translateY(-4px) scale(1.05);
    border-color: var(--color-accent);
    box-shadow: var(--shadow-pixel-lg), 0 0 20px var(--color-glow);
    background: var(--color-bg-tertiary);
  }

  .vote-card:active {
    transform: translateY(-2px) scale(1.03);
    box-shadow: var(--shadow-pixel-sm);
  }

  .canvas-wrapper {
    border: 3px solid var(--color-bg-tertiary);
    border-radius: var(--radius-sm);
    padding: var(--space-2);
    background: var(--color-bg-primary);
    transition: border-color var(--transition-fast);
  }

  .vote-card:hover .canvas-wrapper {
    border-color: var(--color-accent);
  }

  .vote-hint {
    font-size: var(--font-size-xs);
    font-weight: var(--font-weight-bold);
    color: var(--color-text-muted);
    text-transform: uppercase;
    letter-spacing: 1px;
    opacity: 0.7;
    transition: all var(--transition-fast);
  }

  .vote-card:hover .vote-hint {
    color: var(--color-accent);
    opacity: 1;
  }

  .vs-container {
    display: flex;
    align-items: center;
    justify-content: center;
    min-width: 80px;
  }

  .vs {
    font-size: var(--font-size-3xl);
    font-weight: var(--font-weight-bold);
    color: var(--color-accent);
    text-transform: uppercase;
    letter-spacing: 4px;
    text-shadow: 3px 3px 0 rgba(0, 0, 0, 0.5);
    animation: pulse 2s ease-in-out infinite;
  }

  .waiting-container {
    background: var(--color-bg-secondary);
    border: 3px solid var(--color-border-strong);
    border-radius: var(--radius-md);
    padding: var(--space-8) var(--space-10);
    box-shadow: var(--shadow-pixel);
  }

  .waiting-text {
    font-size: var(--font-size-lg);
    font-weight: var(--font-weight-bold);
    color: var(--color-success);
    text-transform: uppercase;
    letter-spacing: 2px;
    text-align: center;
    animation: pulse 2s ease-in-out infinite;
  }

  @media (max-width: 768px) {
    .duel {
      flex-direction: column;
      gap: var(--space-6);
    }

    .vs-container {
      min-width: auto;
    }

    .vs {
      font-size: var(--font-size-2xl);
      letter-spacing: 2px;
    }

    .vote-card {
      width: 100%;
      max-width: 300px;
    }

    .instruction {
      font-size: var(--font-size-md);
    }
  }

  @media (max-width: 400px) {
    .header {
      flex-direction: column;
      gap: var(--space-3);
      text-align: center;
    }

    .round {
      font-size: var(--font-size-sm);
    }

    .instruction {
      font-size: var(--font-size-sm);
    }

    .waiting-text {
      font-size: var(--font-size-md);
    }
  }
</style>
