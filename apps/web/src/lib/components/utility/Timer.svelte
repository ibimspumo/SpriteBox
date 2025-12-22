<!-- Timer Utility Component -->
<script lang="ts">
  import { game } from '$lib/stores';
  import { ProgressBar } from '../atoms';

  let seconds = $derived($game.timer ? Math.ceil($game.timer.remaining / 1000) : 0);
  let progress = $derived($game.timer
    ? ($game.timer.remaining / $game.timer.duration) * 100
    : 100);
  let isLow = $derived(seconds <= 10);
</script>

{#if $game.timer}
  <div class="timer" class:low={isLow}>
    <div class="progress-wrapper">
      <ProgressBar
        {progress}
        color={isLow ? 'error' : 'success'}
        height="md"
      />
    </div>
    <span class="seconds">{seconds}s</span>
  </div>
{/if}

<style>
  .timer {
    display: flex;
    align-items: center;
    gap: var(--space-3);
    padding: var(--space-2) var(--space-4);
    background: var(--color-bg-secondary);
    border-radius: var(--radius-xl);
  }

  .progress-wrapper {
    width: 120px;
  }

  .seconds {
    font-size: var(--font-size-lg);
    font-weight: var(--font-weight-bold);
    min-width: 40px;
  }

  .timer.low .seconds {
    color: var(--color-error);
    animation: pulse 0.5s ease-in-out infinite;
  }

  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.5; }
  }
</style>
