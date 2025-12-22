<!-- GalleryGrid Organism - Pixel Art Style -->
<script lang="ts">
  import type { Snippet } from 'svelte';

  interface Props {
    gap?: 'sm' | 'md' | 'lg';
    itemSize?: number;
    children: Snippet;
  }

  let {
    gap = 'md',
    itemSize,
    children
  }: Props = $props();
</script>

<div
  class="gallery-grid gap-{gap}"
  style={itemSize ? `--item-size: ${itemSize}px` : undefined}
>
  {@render children()}
</div>

<style>
  .gallery-grid {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    padding: var(--space-2);
  }

  .gallery-grid.gap-sm {
    gap: var(--space-2);
  }

  .gallery-grid.gap-md {
    gap: var(--space-3);
  }

  .gallery-grid.gap-lg {
    gap: var(--space-4);
  }

  /* Ensure all images inside gallery render as pixel art */
  .gallery-grid :global(img),
  .gallery-grid :global(canvas) {
    image-rendering: -moz-crisp-edges;
    image-rendering: -webkit-crisp-edges;
    image-rendering: pixelated;
    image-rendering: crisp-edges;
  }

  /* Gallery item styling for cards */
  .gallery-grid :global(.card) {
    transition: transform var(--transition-fast), box-shadow var(--transition-fast);
  }

  .gallery-grid :global(.card:hover) {
    transform: translateY(-4px);
    box-shadow: var(--shadow-pixel-lg);
  }
</style>
