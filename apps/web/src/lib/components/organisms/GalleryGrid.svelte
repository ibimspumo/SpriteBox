<!-- GalleryGrid Organism -->
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
</style>
