<!-- Finale Feature Component -->
<script lang="ts">
  import { finale, finaleVoted, currentUser } from '$lib/stores';
  import { finaleVote } from '$lib/socketBridge';
  import { t } from '$lib/i18n';
  import { Badge } from '../atoms';
  import { Card, GalleryGrid } from '../organisms';
  import { PixelCanvas, Timer } from '../utility';

  let myPlayerId = $derived($currentUser?.fullName ?? '');
</script>

<div class="finale">
  <div class="header">
    <h2>{$t.finale.title}</h2>
    <Timer />
  </div>

  <p class="instruction">{$t.finale.pickYourFavorite}</p>

  {#if $finaleVoted}
    <Card padding="lg">
      <span class="voted-text">{$t.finale.votedResultsSoon}</span>
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
          <span class="name">{finalist.user?.fullName ?? $t.common.anonymous}</span>
          <span class="elo">{$t.finale.elo} {finalist.elo}</span>
          {#if isOwn}
            <Badge variant="default" text={$t.finale.yourArt} />
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
    width: 100%;
    max-width: 1200px;
    margin: 0 auto;
  }

  .header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    width: 100%;
    padding: var(--space-4);
    background: var(--color-bg-secondary);
    border: 3px solid var(--color-warning);
    border-radius: var(--radius-md);
    box-shadow: var(--shadow-pixel-lg);
  }

  .header h2 {
    margin: 0;
    color: var(--color-warning);
    font-size: var(--font-size-2xl);
    font-weight: var(--font-weight-bold);
    text-transform: uppercase;
    letter-spacing: 2px;
    text-shadow:
      2px 2px 0 rgba(0, 0, 0, 0.5),
      0 0 20px rgba(245, 158, 11, 0.4);
    animation: glow 2s ease-in-out infinite;
  }

  @keyframes glow {
    0%, 100% {
      text-shadow:
        2px 2px 0 rgba(0, 0, 0, 0.5),
        0 0 20px rgba(245, 158, 11, 0.4);
    }
    50% {
      text-shadow:
        2px 2px 0 rgba(0, 0, 0, 0.5),
        0 0 30px rgba(245, 158, 11, 0.6);
    }
  }

  .instruction {
    color: var(--color-text-primary);
    font-size: var(--font-size-lg);
    font-weight: var(--font-weight-semibold);
    text-transform: uppercase;
    letter-spacing: 1px;
    margin: 0;
    padding: var(--space-3) var(--space-6);
    background: var(--color-bg-tertiary);
    border: 3px solid var(--color-border-strong);
    border-radius: var(--radius-md);
    box-shadow: var(--shadow-pixel);
  }

  .name {
    font-weight: var(--font-weight-bold);
    font-size: var(--font-size-md);
    color: var(--color-text-primary);
    text-transform: uppercase;
    letter-spacing: 1px;
  }

  .elo {
    font-size: var(--font-size-sm);
    color: var(--color-warning);
    font-weight: var(--font-weight-semibold);
    text-transform: uppercase;
    letter-spacing: 1px;
  }

  .voted-text {
    color: var(--color-success);
    font-size: var(--font-size-xl);
    font-weight: var(--font-weight-bold);
    text-transform: uppercase;
    letter-spacing: 2px;
    text-align: center;
    padding: var(--space-6);
  }
</style>
