<!-- apps/web/src/lib/components/Voting.svelte -->
<script lang="ts">
  import { voting } from '$lib/stores';
  import { vote } from '$lib/socketBridge';
  import PixelCanvas from './PixelCanvas.svelte';
  import Timer from './Timer.svelte';

  function handleVote(chosenId: string): void {
    vote(chosenId);
  }
</script>

<div class="voting">
  <div class="header">
    <span>Runde {$voting.round}/{$voting.totalRounds}</span>
    <Timer />
  </div>

  {#if $voting.hasVoted}
    <div class="waiting">
      Abgestimmt! Warte auf nachste Runde...
    </div>
  {:else if $voting.imageA && $voting.imageB}
    <p class="instruction">Welches Bild ist besser?</p>

    <div class="duel">
      <button
        class="image-btn"
        onclick={() => handleVote($voting.imageA!.playerId)}
      >
        <PixelCanvas
          pixelData={$voting.imageA.pixels}
          size={140}
          readonly
        />
      </button>

      <span class="vs">VS</span>

      <button
        class="image-btn"
        onclick={() => handleVote($voting.imageB!.playerId)}
      >
        <PixelCanvas
          pixelData={$voting.imageB.pixels}
          size={140}
          readonly
        />
      </button>
    </div>
  {:else}
    <div class="waiting">
      Warte auf Bilder...
    </div>
  {/if}
</div>

<style>
  .voting {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 24px;
    padding: 16px;
  }

  .header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    width: 100%;
    max-width: 400px;
  }

  .instruction {
    font-size: 1.25rem;
    color: #aaa;
  }

  .duel {
    display: flex;
    align-items: center;
    gap: 24px;
  }

  .image-btn {
    padding: 12px;
    background: #16213e;
    border: 3px solid transparent;
    border-radius: 12px;
    cursor: pointer;
    transition: transform 0.1s, border-color 0.2s;
  }

  .image-btn:hover {
    transform: scale(1.05);
    border-color: #e94560;
  }

  .vs {
    font-size: 1.5rem;
    font-weight: bold;
    color: #e94560;
  }

  .waiting {
    padding: 32px;
    background: #16213e;
    border-radius: 12px;
    text-align: center;
    color: #4ade80;
  }

  @media (max-width: 400px) {
    .duel {
      flex-direction: column;
    }
  }
</style>
