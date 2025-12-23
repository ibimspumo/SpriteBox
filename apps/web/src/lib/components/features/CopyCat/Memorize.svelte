<!-- Memorize - CopyCat memorize phase component -->
<script lang="ts">
  import { PixelCanvas } from '../../utility';
  import { Timer } from '../../utility';
  import { copyCat, game } from '$lib/stores';
  import { t } from '$lib/i18n';

  let referenceImage = $derived($copyCat.referenceImage);
</script>

<div class="memorize-container">
  <div class="header">
    <h1 class="title">{$t.copyCat.memorize}</h1>
    <p class="subtitle">{$t.copyCat.memorizeDesc}</p>
  </div>

  <div class="timer-section">
    <Timer />
  </div>

  <div class="canvas-section">
    {#if referenceImage}
      <div class="canvas-wrapper">
        <PixelCanvas pixelData={referenceImage} size={280} readonly />
      </div>
      <div class="hint">
        <span class="eye-icon">👁️</span>
      </div>
    {:else}
      <div class="loading">{$t.common.loading}</div>
    {/if}
  </div>
</div>

<style>
  .memorize-container {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--space-6);
    padding: var(--space-6);
    width: 100%;
    max-width: 400px;
    margin: 0 auto;
  }

  .header {
    text-align: center;
  }

  .title {
    font-size: var(--font-size-2xl);
    color: var(--color-accent);
    margin: 0;
    text-transform: uppercase;
    letter-spacing: 2px;
    animation: pulse-glow 1s ease-in-out infinite alternate;
  }

  .subtitle {
    font-size: var(--font-size-md);
    color: var(--color-text-secondary);
    margin: var(--space-2) 0 0;
  }

  .timer-section {
    width: 100%;
    display: flex;
    justify-content: center;
  }

  .canvas-section {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--space-4);
  }

  .canvas-wrapper {
    padding: var(--space-4);
    background: var(--color-bg-secondary);
    border: 4px solid var(--color-accent);
    border-radius: var(--radius-md);
    box-shadow: 0 0 20px rgba(var(--color-accent-rgb), 0.3);
    animation: border-pulse 2s ease-in-out infinite;
  }

  .hint {
    font-size: var(--font-size-2xl);
    animation: bounce 1s ease-in-out infinite;
  }

  .loading {
    font-size: var(--font-size-lg);
    color: var(--color-text-muted);
  }

  @keyframes pulse-glow {
    from {
      text-shadow: 0 0 5px rgba(var(--color-accent-rgb), 0.5);
    }
    to {
      text-shadow: 0 0 15px rgba(var(--color-accent-rgb), 0.8);
    }
  }

  @keyframes border-pulse {
    0%, 100% {
      box-shadow: 0 0 20px rgba(var(--color-accent-rgb), 0.3);
    }
    50% {
      box-shadow: 0 0 40px rgba(var(--color-accent-rgb), 0.6);
    }
  }

  @keyframes bounce {
    0%, 100% {
      transform: translateY(0);
    }
    50% {
      transform: translateY(-10px);
    }
  }

  @media (max-width: 480px) {
    .memorize-container {
      padding: var(--space-4);
    }

    .title {
      font-size: var(--font-size-xl);
    }

    .canvas-wrapper {
      padding: var(--space-3);
    }
  }
</style>
