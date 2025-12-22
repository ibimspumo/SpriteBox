<!-- apps/web/src/lib/components/Finale.svelte -->
<script lang="ts">
  import { finale, finaleVoted, currentUser } from '$lib/stores';
  import { finaleVote } from '$lib/socketBridge';
  import PixelCanvas from './PixelCanvas.svelte';
  import Timer from './Timer.svelte';

  let myPlayerId = $derived($currentUser?.fullName ?? '');
</script>

<div class="finale">
  <div class="header">
    <h2>Finale</h2>
    <Timer />
  </div>

  <p class="instruction">Wahle deinen Favoriten!</p>

  {#if $finaleVoted}
    <div class="voted">
      Abgestimmt! Ergebnisse kommen gleich...
    </div>
  {:else if $finale}
    <div class="finalists">
      {#each $finale.finalists as finalist}
        {@const isOwn = finalist.user?.fullName === myPlayerId}
        <button
          class="finalist"
          class:own={isOwn}
          disabled={isOwn}
          onclick={() => finaleVote(finalist.playerId)}
        >
          <PixelCanvas
            pixelData={finalist.pixels}
            size={100}
            readonly
          />
          <span class="name">{finalist.user?.displayName ?? 'Anonym'}</span>
          <span class="elo">Elo: {finalist.elo}</span>
          {#if isOwn}
            <span class="own-tag">Dein Bild</span>
          {/if}
        </button>
      {/each}
    </div>
  {/if}
</div>

<style>
  .finale {
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
    max-width: 600px;
  }

  .header h2 {
    margin: 0;
    color: #fbbf24;
  }

  .instruction {
    color: #aaa;
  }

  .finalists {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    gap: 16px;
    max-width: 600px;
  }

  .finalist {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
    padding: 12px;
    background: #16213e;
    border: 2px solid transparent;
    border-radius: 12px;
    cursor: pointer;
    transition: transform 0.1s, border-color 0.2s;
  }

  .finalist:not(:disabled):hover {
    transform: scale(1.05);
    border-color: #fbbf24;
  }

  .finalist:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .finalist.own {
    border-color: #0f3460;
  }

  .name {
    font-weight: bold;
  }

  .elo {
    font-size: 0.75rem;
    color: #aaa;
  }

  .own-tag {
    font-size: 0.75rem;
    padding: 2px 8px;
    background: #0f3460;
    border-radius: 4px;
  }

  .voted {
    padding: 32px;
    background: #16213e;
    border-radius: 12px;
    color: #4ade80;
  }
</style>
