<!-- apps/web/src/lib/components/ColorPalette.svelte -->
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
    gap: 4px;
    padding: 8px;
    background: #16213e;
    border-radius: 8px;
  }

  .color-button {
    width: 32px;
    height: 32px;
    border: 2px solid transparent;
    border-radius: 4px;
    cursor: pointer;
    transition: transform 0.1s, border-color 0.1s;
  }

  .color-button:hover {
    transform: scale(1.1);
  }

  .color-button.selected {
    border-color: #fff;
    transform: scale(1.15);
  }

  @media (max-width: 400px) {
    .color-button {
      width: 28px;
      height: 28px;
    }
  }
</style>
