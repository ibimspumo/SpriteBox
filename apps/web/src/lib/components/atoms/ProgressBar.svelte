<!-- ProgressBar Atom - Pixel Art Style -->
<script lang="ts">
  interface Props {
    progress: number; // 0-100
    color?: 'default' | 'success' | 'warning' | 'error' | 'accent';
    height?: 'sm' | 'md' | 'lg';
    showLabel?: boolean;
    animated?: boolean;
  }

  let {
    progress,
    color = 'success',
    height = 'md',
    showLabel = false,
    animated = true
  }: Props = $props();

  let clampedProgress = $derived(Math.max(0, Math.min(100, progress)));
</script>

<div class="progress-container {height}">
  <div class="progress-track">
    <div
      class="progress-fill {color}"
      class:animated
      style="width: {clampedProgress}%"
    ></div>
  </div>
  {#if showLabel}
    <span class="progress-label">{Math.round(clampedProgress)}%</span>
  {/if}
</div>

<style>
  .progress-container {
    display: flex;
    align-items: center;
    gap: var(--space-2);
  }

  .progress-track {
    flex: 1;
    background: var(--color-bg-primary);
    border: 2px solid var(--color-bg-elevated);
    border-radius: var(--radius-none);
    overflow: hidden;
  }

  /* Heights */
  .progress-container.sm .progress-track {
    height: 6px;
  }

  .progress-container.md .progress-track {
    height: 10px;
  }

  .progress-container.lg .progress-track {
    height: 14px;
  }

  .progress-fill {
    height: 100%;
    border-radius: var(--radius-none);
  }

  .progress-fill.animated {
    transition: width 0.1s linear;
  }

  /* Colors - Pixelated look with no gradients */
  .progress-fill.default {
    background: var(--color-text-secondary);
  }

  .progress-fill.success {
    background: var(--color-success);
    box-shadow: inset 0 -2px 0 rgba(0, 0, 0, 0.2);
  }

  .progress-fill.warning {
    background: var(--color-warning);
    box-shadow: inset 0 -2px 0 rgba(0, 0, 0, 0.2);
  }

  .progress-fill.error {
    background: var(--color-error);
    box-shadow: inset 0 -2px 0 rgba(0, 0, 0, 0.2);
  }

  .progress-fill.accent {
    background: var(--color-accent);
    box-shadow: inset 0 -2px 0 rgba(0, 0, 0, 0.2);
  }

  .progress-label {
    font-size: var(--font-size-sm);
    font-weight: var(--font-weight-bold);
    color: var(--color-text-secondary);
    min-width: 40px;
    text-align: right;
  }
</style>
