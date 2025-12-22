<!-- Card Organism -->
<script lang="ts">
  import type { Snippet } from 'svelte';

  interface Props {
    padding?: 'none' | 'sm' | 'md' | 'lg';
    hoverable?: boolean;
    selected?: boolean;
    highlight?: boolean;
    clickable?: boolean;
    onclick?: (e: MouseEvent) => void;
    children: Snippet;
  }

  let {
    padding = 'md',
    hoverable = false,
    selected = false,
    highlight = false,
    clickable = false,
    onclick,
    children
  }: Props = $props();
</script>

{#if clickable || onclick}
  <button
    class="card padding-{padding}"
    class:hoverable
    class:selected
    class:highlight
    class:clickable
    {onclick}
  >
    {@render children()}
  </button>
{:else}
  <div
    class="card padding-{padding}"
    class:hoverable
    class:selected
    class:highlight
  >
    {@render children()}
  </div>
{/if}

<style>
  .card {
    background: var(--color-bg-secondary);
    border-radius: var(--radius-lg);
    border: 2px solid transparent;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--space-2);
    transition: transform var(--transition-fast), border-color var(--transition-normal);
  }

  button.card {
    font-family: inherit;
    font-size: inherit;
    color: inherit;
    cursor: pointer;
    width: auto;
  }

  /* Padding variants */
  .card.padding-none {
    padding: 0;
  }

  .card.padding-sm {
    padding: var(--space-2);
  }

  .card.padding-md {
    padding: var(--space-4);
  }

  .card.padding-lg {
    padding: var(--space-6);
  }

  /* Hoverable */
  .card.hoverable:hover,
  .card.clickable:hover {
    transform: scale(1.05);
    border-color: var(--color-accent);
  }

  /* Selected state */
  .card.selected {
    border-color: var(--color-success);
  }

  /* Highlight state */
  .card.highlight {
    border-color: var(--color-accent);
  }
</style>
