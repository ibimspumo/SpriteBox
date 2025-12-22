<!-- Drawing Feature Component -->
<script lang="ts">
  import { game, pixels, hasSubmitted } from '$lib/stores';
  import { submitDrawing } from '$lib/socketBridge';
  import { Button } from '../atoms';
  import { PromptDisplay } from '../molecules';
  import { Card } from '../organisms';
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

  <Card padding="md">
    <PixelCanvas size={280} readonly={$hasSubmitted} />
  </Card>

  <ColorPalette />

  <div class="actions">
    {#if $hasSubmitted}
      <Card padding="md">
        <span class="submitted-text">Submitted! Waiting for others...</span>
      </Card>
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

  .actions {
    display: flex;
    gap: var(--space-3);
    width: 100%;
    max-width: 280px;
  }

  .actions :global(button) {
    flex: 1;
  }

  .submitted-text {
    color: var(--color-success);
    text-align: center;
  }
</style>
