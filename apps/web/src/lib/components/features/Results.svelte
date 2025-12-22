<!-- Results Feature Component -->
<script lang="ts">
  import { results, currentUser } from '$lib/stores';
  import { Badge } from '../atoms';
  import { PromptDisplay } from '../molecules';
  import { Card, GalleryGrid } from '../organisms';
  import { PixelCanvas } from '../utility';

  const medals = ['1.', '2.', '3.'];
</script>

<div class="results">
  {#if $results}
    <h2>Results</h2>

    <PromptDisplay prompt={$results.prompt} label="Prompt:" size="sm" centered />

    <div class="podium">
      {#each $results.rankings.slice(0, 3) as entry, index}
        {@const isOwn = entry.user.fullName === $currentUser?.fullName}
        <Card
          padding="md"
          selected={isOwn}
          highlight={index === 0}
        >
          <span class="medal">{medals[index]}</span>
          <PixelCanvas
            pixelData={entry.pixels}
            size={index === 0 ? 120 : 100}
            readonly
          />
          <span class="name">{entry.user.displayName}</span>
          <span class="votes">{entry.finalVotes} Votes</span>
          {#if isOwn}
            <Badge variant="success" text="You!" />
          {/if}
        </Card>
      {/each}
    </div>

    <div class="gallery">
      <h3>All Images ({$results.totalParticipants})</h3>
      <GalleryGrid gap="sm">
        {#each $results.rankings.slice(3) as entry}
          <div class="gallery-item">
            <PixelCanvas pixelData={entry.pixels} size={60} readonly />
            <span class="rank">#{entry.place}</span>
          </div>
        {/each}
      </GalleryGrid>
    </div>

    <p class="next-round">Next round starting soon...</p>
  {/if}
</div>

<style>
  .results {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--space-6);
    padding: var(--space-4);
    text-align: center;
  }

  h2 {
    color: var(--color-warning);
    margin: 0;
  }

  .podium {
    display: flex;
    align-items: flex-end;
    gap: var(--space-4);
  }

  .podium > :global(:first-child) {
    order: 1;
  }

  .podium > :global(:nth-child(2)) {
    order: 0;
  }

  .podium > :global(:nth-child(3)) {
    order: 2;
  }

  .podium > :global(:first-child) {
    transform: translateY(-20px);
  }

  .medal {
    font-size: var(--font-size-2xl);
  }

  .name {
    font-weight: var(--font-weight-bold);
  }

  .votes {
    font-size: var(--font-size-sm);
    color: var(--color-text-secondary);
  }

  .gallery {
    width: 100%;
    max-width: 500px;
  }

  .gallery h3 {
    color: var(--color-text-secondary);
  }

  .gallery-item {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--space-1);
  }

  .rank {
    font-size: var(--font-size-xs);
    color: var(--color-text-muted);
  }

  .next-round {
    color: var(--color-text-secondary);
    animation: pulse 1s ease-in-out infinite;
  }

  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.5; }
  }
</style>
