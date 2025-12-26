<!-- Drawing Feature Component - Immersive Mobile-First Design -->
<script lang="ts">
  import { game, pixels, hasSubmitted, localizedPrompt } from '$lib/stores';
  import { submitDrawing } from '$lib/socketBridge';
  import { t } from '$lib/i18n';
  import { Button } from '../atoms';
  import { PromptDisplay } from '../molecules';
  import { PixelCanvas, ColorPalette, Timer } from '../utility';
  import { onMount } from 'svelte';

  let mounted = $state(false);

  onMount(() => {
    requestAnimationFrame(() => {
      mounted = true;
    });
  });

  function handleSubmit(): void {
    submitDrawing($pixels);
  }

  function handleClear(): void {
    pixels.set('1'.repeat(64));
  }

  // Generate floating pixel positions for background
  const floatingPixels = Array.from({ length: 8 }, (_, i) => ({
    id: i,
    left: 10 + Math.random() * 80,
    top: 10 + Math.random() * 80,
    delay: Math.random() * 4,
    duration: 6 + Math.random() * 4,
    size: 4 + Math.random() * 6,
    color: ['#4ecdc4', '#f5a623', '#22c55e', '#ff6b6b', '#a78bfa'][Math.floor(Math.random() * 5)]
  }));
</script>

<div class="drawing-phase" class:mounted>
  <!-- Background -->
  <div class="phase-background" aria-hidden="true">
    <div class="bg-gradient"></div>
  </div>

  <!-- Main Content -->
  <div class="drawing-content">
    <!-- Timer -->
    <div class="timer-section">
      <Timer />
    </div>

    <!-- Prompt Card -->
    <div class="prompt-card">
      <PromptDisplay prompt={$localizedPrompt} label={$t.drawing.draw} size="md" />
    </div>

    <!-- Canvas Frame - The Star of the Show -->
    <div class="canvas-stage">
      <div class="canvas-frame" class:submitted={$hasSubmitted}>
        <div class="frame-corner top-left"></div>
        <div class="frame-corner top-right"></div>
        <div class="frame-corner bottom-left"></div>
        <div class="frame-corner bottom-right"></div>
        <div class="canvas-inner">
          <PixelCanvas size={280} readonly={$hasSubmitted} />
        </div>
        {#if $hasSubmitted}
          <div class="submitted-overlay">
            <span class="check-icon">✓</span>
          </div>
        {/if}
      </div>
    </div>

    <!-- Color Palette -->
    {#if !$hasSubmitted}
      <div class="palette-section">
        <ColorPalette />
      </div>
    {/if}

    <!-- Actions -->
    <div class="actions-section">
      {#if $hasSubmitted}
        <div class="submitted-card">
          <div class="submitted-content">
            <span class="submitted-icon">🎨</span>
            <span class="submitted-text">{$t.drawing.submitted}</span>
            <span class="waiting-text">{$t.drawing.waitingForOthers}</span>
          </div>
          <div class="submitted-pulse"></div>
        </div>
      {:else}
        <div class="action-buttons">
          <Button variant="secondary" onclick={handleClear}>
            {$t.drawing.clear}
          </Button>
          <Button variant="primary" onclick={handleSubmit}>
            {$t.common.submit}
          </Button>
        </div>
      {/if}
    </div>
  </div>
</div>

<style>
  .drawing-phase {
    position: relative;
    min-height: 100dvh;
    width: 100%;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }

  /* ===== Background ===== */
  .phase-background {
    position: fixed;
    inset: 0;
    pointer-events: none;
    z-index: 0;
  }

  .bg-gradient {
    position: absolute;
    inset: 0;
    background: radial-gradient(ellipse at 50% 30%, rgba(78, 205, 196, 0.08) 0%, transparent 50%);
  }

  /* ===== Main Content ===== */
  .drawing-content {
    position: relative;
    z-index: 1;
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: var(--space-4);
    padding-bottom: env(safe-area-inset-bottom, var(--space-4));
    gap: var(--space-4);
    max-width: 100%;
    margin: 0 auto;
  }

  /* ===== Timer ===== */
  .timer-section {
    opacity: 0;
    transform: translateY(-10px);
    transition: all 0.4s ease;
  }

  .mounted .timer-section {
    opacity: 1;
    transform: translateY(0);
  }

  /* ===== Prompt Card ===== */
  .prompt-card {
    width: 100%;
    max-width: 340px;
    padding: var(--space-4);
    background: rgba(26, 26, 62, 0.9);
    border: 2px solid var(--color-border-strong);
    border-radius: var(--radius-lg);
    backdrop-filter: blur(10px);
    opacity: 0;
    transform: translateY(20px);
    transition: all 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) 0.1s;
  }

  .mounted .prompt-card {
    opacity: 1;
    transform: translateY(0);
  }

  /* ===== Canvas Stage ===== */
  .canvas-stage {
    flex: 0 0 auto;
    width: 100%;
    display: flex;
    justify-content: center;
    align-items: center;
    opacity: 0;
    transform: scale(0.9);
    transition: all 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) 0.15s;
  }

  .mounted .canvas-stage {
    opacity: 1;
    transform: scale(1);
  }

  .canvas-frame {
    position: relative;
    padding: var(--space-4);
    max-width: 100%;
    box-sizing: border-box;
    background: linear-gradient(145deg, var(--color-bg-secondary) 0%, var(--color-bg-tertiary) 100%);
    border: 3px solid var(--color-bg-elevated);
    border-radius: var(--radius-lg);
    box-shadow:
      var(--shadow-pixel-lg),
      0 0 40px rgba(78, 205, 196, 0.1),
      inset 0 1px 0 rgba(255, 255, 255, 0.05);
    transition: all 0.3s ease;
  }

  .canvas-frame:not(.submitted):hover {
    border-color: var(--color-accent);
    box-shadow:
      var(--shadow-pixel-lg),
      0 0 60px rgba(78, 205, 196, 0.2);
  }

  .canvas-frame.submitted {
    border-color: var(--color-success);
    box-shadow:
      var(--shadow-pixel-lg),
      0 0 40px rgba(34, 197, 94, 0.3);
  }

  /* Frame Corner Decorations */
  .frame-corner {
    position: absolute;
    width: 12px;
    height: 12px;
    border: 2px solid var(--color-accent);
    opacity: 0.5;
  }

  .frame-corner.top-left {
    top: 6px;
    left: 6px;
    border-right: none;
    border-bottom: none;
  }

  .frame-corner.top-right {
    top: 6px;
    right: 6px;
    border-left: none;
    border-bottom: none;
  }

  .frame-corner.bottom-left {
    bottom: 6px;
    left: 6px;
    border-right: none;
    border-top: none;
  }

  .frame-corner.bottom-right {
    bottom: 6px;
    right: 6px;
    border-left: none;
    border-top: none;
  }

  .canvas-inner {
    position: relative;
    border-radius: var(--radius-sm);
    overflow: hidden;
  }

  .submitted-overlay {
    position: absolute;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(34, 197, 94, 0.15);
    border-radius: var(--radius-sm);
    animation: fadeIn 0.3s ease;
  }

  .check-icon {
    font-size: 3rem;
    color: var(--color-success);
    text-shadow: 0 0 20px rgba(34, 197, 94, 0.5);
    animation: popIn 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
  }

  @keyframes popIn {
    0% { transform: scale(0); opacity: 0; }
    70% { transform: scale(1.2); }
    100% { transform: scale(1); opacity: 1; }
  }

  /* ===== Palette Section ===== */
  .palette-section {
    width: 100%;
    max-width: 320px;
    opacity: 0;
    transform: translateY(20px);
    transition: all 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) 0.2s;
  }

  .mounted .palette-section {
    opacity: 1;
    transform: translateY(0);
  }

  /* ===== Actions ===== */
  .actions-section {
    width: 100%;
    max-width: 320px;
    opacity: 0;
    transform: translateY(20px);
    transition: all 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) 0.25s;
  }

  .mounted .actions-section {
    opacity: 1;
    transform: translateY(0);
  }

  .action-buttons {
    display: flex;
    gap: var(--space-3);
    width: 100%;
  }

  .action-buttons :global(button) {
    flex: 1;
  }

  /* ===== Submitted State ===== */
  .submitted-card {
    position: relative;
    overflow: hidden;
    padding: var(--space-5);
    background: linear-gradient(145deg, rgba(34, 197, 94, 0.15) 0%, rgba(34, 197, 94, 0.05) 100%);
    border: 2px solid var(--color-success);
    border-radius: var(--radius-lg);
    box-shadow: 0 0 30px rgba(34, 197, 94, 0.2);
  }

  .submitted-content {
    position: relative;
    z-index: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--space-2);
    text-align: center;
  }

  .submitted-icon {
    font-size: 2rem;
    animation: bounce 1s ease-in-out infinite;
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

  .submitted-pulse {
    position: absolute;
    inset: 0;
    background: radial-gradient(circle at center, rgba(34, 197, 94, 0.2) 0%, transparent 70%);
    animation: pulseOut 2s ease-out infinite;
  }

  @keyframes pulseOut {
    0% { transform: scale(0.8); opacity: 0.5; }
    100% { transform: scale(1.5); opacity: 0; }
  }

  /* ===== Responsive ===== */
  @media (max-width: 380px) {
    .drawing-content {
      padding: var(--space-3);
      gap: var(--space-3);
    }

    .canvas-frame {
      padding: var(--space-3);
    }
  }

  @media (min-height: 800px) {
    .drawing-content {
      justify-content: center;
      gap: var(--space-5);
    }
  }

  /* Reduce motion */
  @media (prefers-reduced-motion: reduce) {
    .submitted-pulse,
    .check-icon,
    .submitted-icon {
      animation: none;
    }

    .timer-section,
    .prompt-card,
    .canvas-stage,
    .palette-section,
    .actions-section {
      transition: opacity 0.2s ease;
      transform: none;
    }
  }
</style>
