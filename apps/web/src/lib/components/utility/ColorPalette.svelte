<!-- ColorPalette Utility Component -->
<script lang="ts">
  import { selectedColor } from '$lib/stores';
  import { PALETTE } from '$lib/palette';
</script>

<div class="palette">
  {#each PALETTE as color, index}
    <button
      class="color-button"
      class:selected={$selectedColor === index}
      style="background-color: {color.hex}"
      onclick={() => selectedColor.set(index)}
      title={color.name}
      aria-label={color.name}
    ></button>
  {/each}
</div>

<style>
  .palette {
    display: grid;
    grid-template-columns: repeat(8, 1fr);
    gap: var(--space-1);
    padding: var(--space-2);
    background: var(--color-bg-secondary);
    border-radius: var(--radius-md);
  }

  .color-button {
    width: 32px;
    height: 32px;
    border: 2px solid transparent;
    border-radius: var(--radius-sm);
    cursor: pointer;
    transition: transform var(--transition-fast), border-color var(--transition-fast);
  }

  .color-button:hover {
    transform: scale(1.1);
  }

  .color-button.selected {
    border-color: white;
    transform: scale(1.15);
  }

  @media (max-width: 400px) {
    .color-button {
      width: 28px;
      height: 28px;
    }
  }
</style>
