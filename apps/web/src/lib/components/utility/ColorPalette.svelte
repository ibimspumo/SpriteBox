<!-- ColorPalette Utility Component -->
<script lang="ts">
  import { selectedColor } from '$lib/stores';
  import { PALETTE } from '$lib/palette';
  import { t } from '$lib/i18n';
</script>

<div class="palette-container">
  <div class="palette-header">
    <span class="palette-label">{$t.colorPalette.title}</span>
  </div>
  <div class="palette">
    {#each PALETTE as color, index}
      <button
        class="color-button"
        class:selected={$selectedColor === index}
        style="--color: {color.hex}"
        onclick={() => selectedColor.set(index)}
        title={color.name}
        aria-label={color.name}
      >
        <span class="color-swatch" style="background-color: {color.hex}"></span>
      </button>
    {/each}
  </div>
</div>

<style>
  .palette-container {
    width: 100%;
    max-width: 320px;
  }

  .palette-header {
    margin-bottom: var(--space-2);
    padding: 0 var(--space-1);
  }

  .palette-label {
    font-size: var(--font-size-xs);
    font-weight: var(--font-weight-bold);
    color: var(--color-text-muted);
    text-transform: uppercase;
    letter-spacing: 1.5px;
  }

  .palette {
    display: grid;
    grid-template-columns: repeat(8, 1fr);
    gap: 4px;
    padding: var(--space-2);
    background: var(--color-bg-secondary);
    border: 3px solid var(--color-bg-tertiary);
    border-radius: var(--radius-md);
    box-shadow: var(--shadow-pixel);
  }

  .color-button {
    position: relative;
    aspect-ratio: 1;
    width: 100%;
    padding: 0;
    background: var(--color-bg-tertiary);
    border: 2px solid var(--color-bg-elevated);
    border-radius: var(--radius-sm);
    cursor: pointer;
    transition: transform var(--transition-fast), border-color var(--transition-fast);
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .color-swatch {
    width: 75%;
    height: 75%;
    border-radius: 2px;
    box-shadow: inset 0 0 0 1px rgba(0, 0, 0, 0.2);
    image-rendering: pixelated;
    image-rendering: crisp-edges;
  }

  .color-button:hover {
    transform: scale(1.1);
    border-color: var(--color-text-secondary);
    z-index: 1;
  }

  .color-button.selected {
    border-color: var(--color-accent);
    border-width: 3px;
    transform: scale(1.15);
    background: var(--color-bg-elevated);
    box-shadow:
      0 0 0 2px var(--color-bg-secondary),
      0 0 0 4px var(--color-accent),
      var(--shadow-pixel-sm);
    z-index: 2;
  }

  .color-button.selected:hover {
    transform: scale(1.15);
  }

  .color-button:active {
    transform: scale(1.05);
  }

  @media (max-width: 400px) {
    .palette {
      gap: 3px;
      padding: var(--space-2);
    }
  }
</style>
