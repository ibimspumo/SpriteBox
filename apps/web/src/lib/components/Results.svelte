<!-- apps/web/src/lib/components/Results.svelte -->
<script lang="ts">
  import { results, currentUser } from '$lib/stores';
  import PixelCanvas from './PixelCanvas.svelte';

  const medals = ['1.', '2.', '3.'];
</script>

<div class="results">
  {#if $results}
    <h2>Ergebnisse</h2>
    <p class="prompt">Prompt: "{$results.prompt}"</p>

    <div class="podium">
      {#each $results.rankings.slice(0, 3) as entry, index}
        {@const isOwn = entry.user.fullName === $currentUser?.fullName}
        <div class="winner" class:first={index === 0} class:own={isOwn}>
          <span class="medal">{medals[index]}</span>
          <PixelCanvas
            pixelData={entry.pixels}
            size={index === 0 ? 120 : 100}
            readonly
          />
          <span class="name">{entry.user.displayName}</span>
          <span class="votes">{entry.finalVotes} Votes</span>
          {#if isOwn}
            <span class="own-tag">Du!</span>
          {/if}
        </div>
      {/each}
    </div>

    <div class="gallery">
      <h3>Alle Bilder ({$results.totalParticipants})</h3>
      <div class="gallery-grid">
        {#each $results.rankings.slice(3) as entry}
          <div class="gallery-item">
            <PixelCanvas pixelData={entry.pixels} size={60} readonly />
            <span>#{entry.place}</span>
          </div>
        {/each}
      </div>
    </div>

    <p class="next-round">Nachste Runde startet gleich...</p>
  {/if}
</div>

<style>
  .results {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 24px;
    padding: 16px;
    text-align: center;
  }

  h2 {
    color: #fbbf24;
    margin: 0;
  }

  .prompt {
    color: #aaa;
    font-style: italic;
  }

  .podium {
    display: flex;
    align-items: flex-end;
    gap: 16px;
  }

  .winner {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
    padding: 16px;
    background: #16213e;
    border-radius: 12px;
  }

  .winner.first {
    order: -1;
    transform: translateY(-20px);
  }

  .winner.own {
    border: 2px solid #4ade80;
  }

  .medal {
    font-size: 2rem;
  }

  .name {
    font-weight: bold;
  }

  .votes {
    font-size: 0.875rem;
    color: #aaa;
  }

  .own-tag {
    font-size: 0.75rem;
    padding: 2px 8px;
    background: #4ade80;
    color: #000;
    border-radius: 4px;
  }

  .gallery {
    width: 100%;
    max-width: 500px;
  }

  .gallery h3 {
    color: #aaa;
  }

  .gallery-grid {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    gap: 8px;
  }

  .gallery-item {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 4px;
    font-size: 0.75rem;
    color: #666;
  }

  .next-round {
    color: #aaa;
    animation: pulse 1s ease-in-out infinite;
  }

  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.5; }
  }
</style>
