<!-- ProgressBar Atom -->
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
    background: var(--color-bg-tertiary);
    border-radius: var(--radius-sm);
    overflow: hidden;
  }

  /* Heights */
  .progress-container.sm .progress-track {
    height: 4px;
  }

  .progress-container.md .progress-track {
    height: 8px;
  }

  .progress-container.lg .progress-track {
    height: 12px;
  }

  .progress-fill {
    height: 100%;
    border-radius: var(--radius-sm);
  }

  .progress-fill.animated {
    transition: width 0.1s linear;
  }

  /* Colors */
  .progress-fill.default {
    background: var(--color-text-secondary);
  }

  .progress-fill.success {
    background: var(--color-success);
  }

  .progress-fill.warning {
    background: var(--color-warning);
  }

  .progress-fill.error {
    background: var(--color-error);
  }

  .progress-fill.accent {
    background: var(--color-accent);
  }

  .progress-label {
    font-size: var(--font-size-sm);
    color: var(--color-text-secondary);
    min-width: 40px;
    text-align: right;
  }
</style>
