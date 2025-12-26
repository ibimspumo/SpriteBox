<!-- Memorize - CopyCat memorize phase with focus-enhancing visuals -->
<script lang="ts">
  import { PixelCanvas } from '../../utility';
  import { Timer } from '../../utility';
  import { copyCat } from '$lib/stores';
  import { t } from '$lib/i18n';
  import { onMount } from 'svelte';

  let referenceImage = $derived($copyCat.referenceImage);
  let mounted = $state(false);

  onMount(() => {
    requestAnimationFrame(() => {
      mounted = true;
    });
  });

</script>

<div class="memorize-phase" class:mounted>
  <!-- Background -->
  <div class="phase-background" aria-hidden="true">
    <div class="bg-gradient"></div>
  </div>

  <!-- Main Content -->
  <div class="memorize-content">
    <!-- Header -->
    <header class="memorize-header">
      <div class="title-container">
        <span class="brain-icon">🧠</span>
        <h1 class="title">{$t.copyCat.memorize}</h1>
      </div>
      <p class="subtitle">{$t.copyCat.memorizeDesc}</p>
    </header>

    <!-- Timer -->
    <div class="timer-section">
      <Timer />
    </div>

    <!-- Canvas Section - The Focus Area -->
    <div class="canvas-section">
      {#if referenceImage}
        <div class="focus-container">
          <!-- Main Canvas Frame -->
          <div class="canvas-frame">
            <div class="frame-glow"></div>
            <div class="corner-accent top-left"></div>
            <div class="corner-accent top-right"></div>
            <div class="corner-accent bottom-left"></div>
            <div class="corner-accent bottom-right"></div>
            <div class="canvas-inner">
              <PixelCanvas pixelData={referenceImage} size={280} readonly />
            </div>
          </div>
        </div>

        <!-- Hint -->
        <div class="hint-section">
          <span class="eye-icon">👁️</span>
          <span class="hint-text">{$t.copyCat.lookCarefully}</span>
        </div>
      {:else}
        <div class="loading-container">
          <div class="loading-spinner"></div>
          <span class="loading-text">{$t.common.loading}</span>
        </div>
      {/if}
    </div>
  </div>
</div>

<style>
  .memorize-phase {
    position: relative;
    min-height: 100dvh;
    width: 100%;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }

  /* ===== Animated Background - Focus Enhancing ===== */
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
  .memorize-content {
    position: relative;
    z-index: 1;
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: var(--space-4);
    gap: var(--space-5);
    max-width: 400px;
    margin: 0 auto;
    width: 100%;
  }

  /* ===== Header ===== */
  .memorize-header {
    text-align: center;
    opacity: 0;
    transform: translateY(-20px);
    transition: all 0.5s cubic-bezier(0.34, 1.56, 0.64, 1);
  }

  .mounted .memorize-header {
    opacity: 1;
    transform: translateY(0);
  }

  .title-container {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: var(--space-3);
  }

  .brain-icon {
    font-size: 2rem;
    animation: brainPulse 2s ease-in-out infinite;
  }

  @keyframes brainPulse {
    0%, 100% { transform: scale(1); }
    50% { transform: scale(1.1); }
  }

  .title {
    margin: 0;
    font-size: var(--font-size-2xl);
    font-weight: var(--font-weight-bold);
    color: var(--color-accent);
    text-transform: uppercase;
    letter-spacing: 3px;
    text-shadow: 0 0 30px rgba(78, 205, 196, 0.5);
    animation: titleGlow 2s ease-in-out infinite alternate;
  }

  @keyframes titleGlow {
    from { text-shadow: 0 0 20px rgba(78, 205, 196, 0.4); }
    to { text-shadow: 0 0 40px rgba(78, 205, 196, 0.7); }
  }

  .subtitle {
    margin: var(--space-2) 0 0;
    font-size: var(--font-size-md);
    color: var(--color-text-secondary);
  }

  /* ===== Timer Section ===== */
  .timer-section {
    position: relative;
    opacity: 0;
    transform: translateY(10px);
    transition: all 0.5s ease 0.1s;
  }

  .mounted .timer-section {
    opacity: 1;
    transform: translateY(0);
  }

  /* ===== Canvas Section ===== */
  .canvas-section {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--space-4);
    width: 100%;
    opacity: 0;
    transform: scale(0.9);
    transition: all 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) 0.15s;
  }

  .mounted .canvas-section {
    opacity: 1;
    transform: scale(1);
  }

  .focus-container {
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  /* Canvas Frame */
  .canvas-frame {
    position: relative;
    padding: var(--space-4);
    max-width: 100%;
    box-sizing: border-box;
    background: linear-gradient(145deg, var(--color-bg-secondary) 0%, var(--color-bg-tertiary) 100%);
    border: 4px solid var(--color-accent);
    border-radius: var(--radius-lg);
    box-shadow:
      var(--shadow-pixel-lg),
      0 0 40px rgba(78, 205, 196, 0.3);
    z-index: 1;
  }

  .frame-glow {
    position: absolute;
    inset: -20px;
    background: radial-gradient(circle at center, rgba(78, 205, 196, 0.2) 0%, transparent 70%);
    animation: frameGlow 3s ease-in-out infinite;
    pointer-events: none;
    z-index: -1;
  }

  @keyframes frameGlow {
    0%, 100% { opacity: 0.5; transform: scale(1); }
    50% { opacity: 1; transform: scale(1.05); }
  }

  /* Corner Accents */
  .corner-accent {
    position: absolute;
    width: 16px;
    height: 16px;
    border: 3px solid var(--color-accent);
  }

  .corner-accent.top-left {
    top: 8px;
    left: 8px;
    border-right: none;
    border-bottom: none;
  }

  .corner-accent.top-right {
    top: 8px;
    right: 8px;
    border-left: none;
    border-bottom: none;
  }

  .corner-accent.bottom-left {
    bottom: 8px;
    left: 8px;
    border-right: none;
    border-top: none;
  }

  .corner-accent.bottom-right {
    bottom: 8px;
    right: 8px;
    border-left: none;
    border-top: none;
  }

  .canvas-inner {
    position: relative;
    border-radius: var(--radius-sm);
    overflow: hidden;
  }

  /* Hint Section */
  .hint-section {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    padding: var(--space-2) var(--space-4);
    background: rgba(26, 26, 62, 0.8);
    border: 2px solid var(--color-border-strong);
    border-radius: var(--radius-full);
    backdrop-filter: blur(10px);
  }

  .eye-icon {
    font-size: 1.5rem;
    animation: blink 3s ease-in-out infinite;
  }

  @keyframes blink {
    0%, 90%, 100% { transform: scaleY(1); }
    95% { transform: scaleY(0.1); }
  }

  .hint-text {
    font-size: var(--font-size-sm);
    font-weight: var(--font-weight-bold);
    color: var(--color-text-secondary);
    text-transform: uppercase;
    letter-spacing: 1px;
  }

  /* Loading State */
  .loading-container {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--space-4);
    padding: var(--space-8);
    background: var(--color-bg-secondary);
    border: 2px solid var(--color-border);
    border-radius: var(--radius-xl);
  }

  .loading-spinner {
    width: 50px;
    height: 50px;
    border: 4px solid var(--color-bg-tertiary);
    border-top-color: var(--color-accent);
    border-radius: 50%;
    animation: spin 1s linear infinite;
  }

  .loading-text {
    font-size: var(--font-size-md);
    color: var(--color-text-secondary);
    text-transform: uppercase;
    letter-spacing: 1px;
  }

  /* ===== Responsive ===== */
  @media (max-width: 380px) {
    .memorize-content {
      padding: var(--space-3);
      gap: var(--space-4);
    }

    .canvas-frame {
      padding: var(--space-3);
    }

    .title {
      font-size: var(--font-size-xl);
    }
  }

  /* Reduce motion */
  @media (prefers-reduced-motion: reduce) {
    .brain-icon,
    .title,
    .frame-glow,
    .eye-icon,
    .loading-spinner {
      animation: none;
    }

    .memorize-header,
    .timer-section,
    .canvas-section {
      transition: opacity 0.2s ease;
      transform: none;
    }
  }
</style>
