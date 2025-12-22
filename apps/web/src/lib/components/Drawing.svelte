<!-- apps/web/src/lib/components/Drawing.svelte -->
<script lang="ts">
  import { game, pixels, hasSubmitted } from '$lib/stores';
  import { submitDrawing } from '$lib/socketBridge';
  import PixelCanvas from './PixelCanvas.svelte';
  import ColorPalette from './ColorPalette.svelte';
  import Timer from './Timer.svelte';

  function handleSubmit(): void {
    submitDrawing($pixels);
  }

  function handleClear(): void {
    pixels.set('1'.repeat(64));
  }
</script>

<div class="drawing">
  <div class="header">
    <div class="prompt">
      <span class="label">Draw:</span>
      <span class="text">{$game.prompt}</span>
    </div>
    <Timer />
  </div>

  <div class="canvas-container">
    <PixelCanvas size={280} readonly={$hasSubmitted} />
  </div>

  <ColorPalette />

  <div class="actions">
    {#if $hasSubmitted}
      <div class="submitted">
        Submitted! Waiting for others...
      </div>
    {:else}
      <button class="btn secondary" onclick={handleClear}>
        Clear
      </button>
      <button class="btn primary" onclick={handleSubmit}>
        Submit
      </button>
    {/if}
  </div>
</div>

<style>
  .drawing {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 20px;
    padding: 16px;
  }

  .header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    width: 100%;
    max-width: 400px;
    flex-wrap: wrap;
    gap: 12px;
  }

  .prompt {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .prompt .label {
    font-size: 0.875rem;
    color: #aaa;
  }

  .prompt .text {
    font-size: 1.25rem;
    font-weight: bold;
    color: #e94560;
  }

  .canvas-container {
    background: #16213e;
    padding: 16px;
    border-radius: 12px;
  }

  .actions {
    display: flex;
    gap: 12px;
    width: 100%;
    max-width: 280px;
  }

  .btn {
    flex: 1;
    padding: 12px;
    border: none;
    border-radius: 8px;
    font-size: 1rem;
    cursor: pointer;
  }

  .btn.primary {
    background: #4ade80;
    color: #000;
  }

  .btn.secondary {
    background: #0f3460;
    color: #fff;
  }

  .submitted {
    padding: 16px;
    background: #16213e;
    border-radius: 8px;
    text-align: center;
    color: #4ade80;
    width: 100%;
  }
</style>
