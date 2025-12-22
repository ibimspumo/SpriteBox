<!-- Finale Feature Component -->
<script lang="ts">
  import { finale, finaleVoted, currentUser } from '$lib/stores';
  import { finaleVote } from '$lib/socketBridge';
  import { Badge } from '../atoms';
  import { Card, GalleryGrid } from '../organisms';
  import { PixelCanvas, Timer } from '../utility';

  let myPlayerId = $derived($currentUser?.fullName ?? '');
</script>

<div class="finale">
  <div class="header">
    <h2>Finale</h2>
    <Timer />
  </div>

  <p class="instruction">Wahle deinen Favoriten!</p>

  {#if $finaleVoted}
    <Card padding="lg">
      <span class="voted-text">Abgestimmt! Ergebnisse kommen gleich...</span>
    </Card>
  {:else if $finale}
    <GalleryGrid gap="md">
      {#each $finale.finalists as finalist}
        {@const isOwn = finalist.user?.fullName === myPlayerId}
        <Card
          hoverable={!isOwn}
          clickable={!isOwn}
          selected={isOwn}
          padding="md"
          onclick={isOwn ? undefined : () => finaleVote(finalist.playerId)}
        >
          <PixelCanvas
            pixelData={finalist.pixels}
            size={100}
            readonly
          />
          <span class="name">{finalist.user?.displayName ?? 'Anonym'}</span>
          <span class="elo">Elo: {finalist.elo}</span>
          {#if isOwn}
            <Badge variant="default" text="Dein Bild" />
          {/if}
        </Card>
      {/each}
    </GalleryGrid>
  {/if}
</div>

<style>
  .finale {
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
    max-width: 600px;
  }

  .header h2 {
    margin: 0;
    color: var(--color-warning);
  }

  .instruction {
    color: var(--color-text-secondary);
    margin: 0;
  }

  .name {
    font-weight: var(--font-weight-bold);
  }

  .elo {
    font-size: var(--font-size-xs);
    color: var(--color-text-secondary);
  }

  .voted-text {
    color: var(--color-success);
  }
</style>
