<!-- Voting Feature Component -->
<script lang="ts">
  import { voting } from '$lib/stores';
  import { vote } from '$lib/socketBridge';
  import { Card } from '../organisms';
  import { PixelCanvas, Timer } from '../utility';

  function handleVote(chosenId: string): void {
    vote(chosenId);
  }
</script>

<div class="voting">
  <div class="header">
    <span class="round">Round {$voting.round}/{$voting.totalRounds}</span>
    <Timer />
  </div>

  {#if $voting.hasVoted}
    <Card padding="lg">
      <span class="waiting-text">Voted! Waiting for next round...</span>
    </Card>
  {:else if $voting.imageA && $voting.imageB}
    <p class="instruction">Which image is better?</p>

    <div class="duel">
      <Card
        hoverable
        clickable
        padding="md"
        onclick={() => handleVote($voting.imageA!.playerId)}
      >
        <PixelCanvas
          pixelData={$voting.imageA.pixels}
          size={140}
          readonly
        />
      </Card>

      <span class="vs">VS</span>

      <Card
        hoverable
        clickable
        padding="md"
        onclick={() => handleVote($voting.imageB!.playerId)}
      >
        <PixelCanvas
          pixelData={$voting.imageB.pixels}
          size={140}
          readonly
        />
      </Card>
    </div>
  {:else}
    <Card padding="lg">
      <span class="waiting-text">Waiting for images...</span>
    </Card>
  {/if}
</div>

<style>
  .voting {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--space-6);
    padding: var(--space-4);
  }

  .header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    width: 100%;
    max-width: 400px;
  }

  .round {
    font-size: var(--font-size-md);
    color: var(--color-text-secondary);
  }

  .instruction {
    font-size: var(--font-size-lg);
    color: var(--color-text-secondary);
    margin: 0;
  }

  .duel {
    display: flex;
    align-items: center;
    gap: var(--space-6);
  }

  .vs {
    font-size: var(--font-size-xl);
    font-weight: var(--font-weight-bold);
    color: var(--color-accent);
  }

  .waiting-text {
    color: var(--color-success);
  }

  @media (max-width: 400px) {
    .duel {
      flex-direction: column;
    }
  }
</style>
