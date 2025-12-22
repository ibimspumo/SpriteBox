<!-- Drawing Feature Component -->
<script lang="ts">
  import { game, pixels, hasSubmitted } from '$lib/stores';
  import { submitDrawing } from '$lib/socketBridge';
  import { Button } from '../atoms';
  import { PromptDisplay } from '../molecules';
  import { PixelCanvas, ColorPalette, Timer } from '../utility';

  function handleSubmit(): void {
    submitDrawing($pixels);
  }

  function handleClear(): void {
    pixels.set('1'.repeat(64));
  }
</script>

<div class="drawing">
  <div class="header">
    <PromptDisplay prompt={$game.prompt} label="Draw:" size="md" />
    <Timer />
  </div>

  <div class="canvas-wrapper">
    <PixelCanvas size={280} readonly={$hasSubmitted} />
  </div>

  <ColorPalette />

  <div class="actions">
    {#if $hasSubmitted}
      <div class="submitted-message">
        <span class="submitted-text">SUBMITTED!</span>
        <span class="waiting-text">Waiting for others...</span>
      </div>
    {:else}
      <Button variant="secondary" onclick={handleClear}>
        Clear
      </Button>
      <Button variant="primary" onclick={handleSubmit}>
        Submit
      </Button>
    {/if}
  </div>
</div>

<style>
  .drawing {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--space-5);
    padding: var(--space-4);
    width: 100%;
    max-width: 600px;
    margin: 0 auto;
  }

  .header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    width: 100%;
    max-width: 400px;
    flex-wrap: wrap;
    gap: var(--space-3);
  }

  .canvas-wrapper {
    padding: var(--space-4);
    background: var(--color-bg-secondary);
    border: 3px solid var(--color-bg-tertiary);
    border-radius: var(--radius-md);
    box-shadow: var(--shadow-pixel);
  }

  .actions {
    display: flex;
    gap: var(--space-3);
    width: 100%;
    max-width: 280px;
  }

  .actions :global(button) {
    flex: 1;
  }

  .submitted-message {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--space-2);
    padding: var(--space-4);
    background: var(--color-bg-secondary);
    border: 3px solid var(--color-success);
    border-radius: var(--radius-md);
    width: 100%;
    box-shadow: var(--shadow-pixel);
  }

  .submitted-text {
    color: var(--color-success);
    font-size: var(--font-size-lg);
    font-weight: var(--font-weight-bold);
    text-transform: uppercase;
    letter-spacing: 2px;
  }

  .waiting-text {
    color: var(--color-text-secondary);
    font-size: var(--font-size-sm);
    animation: pulse 2s ease-in-out infinite;
  }

  @media (max-width: 400px) {
    .drawing {
      padding: var(--space-3);
    }

    .canvas-wrapper {
      padding: var(--space-3);
    }
  }
</style>
