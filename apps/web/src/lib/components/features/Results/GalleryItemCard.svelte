<!-- GalleryItemCard Component - Single gallery entry card -->
<script lang="ts">
  import type { User } from '$lib/socket';
  import { t } from '$lib/i18n';
  import { Badge, ShareButton } from '../../atoms';
  import { PixelCanvas } from '../../utility';

  interface Props {
    entry: {
      place: number;
      playerId: string;
      user: User;
      pixels: string;
      finalVotes: number;
      elo: number;
    };
    index: number;
    isOwn: boolean;
    mounted: boolean;
  }

  let { entry, index, isOwn, mounted }: Props = $props();

  let itemDelay = $derived(0.5 + index * 0.03);
</script>

<div
  class="gallery-item"
  class:own={isOwn}
  class:mounted
  style="--item-delay: {itemDelay}s"
>
  <div class="gallery-frame">
    <PixelCanvas pixelData={entry.pixels} size={64} readonly />
  </div>
  <span class="rank-badge">#{entry.place}</span>
  <span class="gallery-name">{entry.user.fullName}</span>
  <div class="gallery-actions">
    {#if isOwn}
      <Badge variant="success" text={$t.common.you} />
    {/if}
    <ShareButton pixels={entry.pixels} username={entry.user.fullName} size="sm" />
  </div>
</div>

<style>
  .gallery-item {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--space-2);
    padding: var(--space-3);
    background: var(--color-bg-tertiary);
    border-radius: var(--radius-md);
    border: 2px solid transparent;
    transition: all 0.3s ease;
    opacity: 0;
    transform: translateY(10px);
  }

  .gallery-item.mounted {
    opacity: 1;
    transform: translateY(0);
    transition-delay: var(--item-delay, 0s);
  }

  .gallery-item:hover {
    transform: translateY(-4px);
    border-color: var(--color-accent);
    box-shadow: 0 0 20px rgba(78, 205, 196, 0.2);
  }

  .gallery-item.own {
    border-color: var(--color-success);
    background: linear-gradient(145deg, rgba(34, 197, 94, 0.1) 0%, var(--color-bg-tertiary) 100%);
  }

  .gallery-frame {
    padding: var(--space-2);
    background: var(--color-bg-primary);
    border-radius: var(--radius-sm);
    border: 2px solid var(--color-bg-elevated);
  }

  .rank-badge {
    font-size: var(--font-size-xs);
    font-weight: var(--font-weight-bold);
    color: var(--color-text-muted);
    padding: var(--space-1) var(--space-2);
    background: var(--color-bg-elevated);
    border-radius: var(--radius-sm);
  }

  .gallery-name {
    font-size: var(--font-size-xs);
    color: var(--color-text-secondary);
    text-align: center;
    max-width: 80px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .gallery-actions {
    display: flex;
    align-items: center;
    gap: var(--space-2);
  }

  /* Reduce motion */
  @media (prefers-reduced-motion: reduce) {
    .gallery-item {
      transition: opacity 0.2s ease;
      transform: none;
    }

    .gallery-item.mounted {
      transform: none;
    }
  }
</style>
