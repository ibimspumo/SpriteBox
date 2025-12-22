<!-- Timer Utility Component - Pixel Art Style -->
<script lang="ts">
  import { game } from '$lib/stores';
  import { ProgressBar } from '../atoms';

  let seconds = $derived($game.timer ? Math.ceil($game.timer.remaining / 1000) : 0);
  let progress = $derived($game.timer
    ? ($game.timer.remaining / $game.timer.duration) * 100
    : 100);
  let isLow = $derived(seconds <= 10);
  let isCritical = $derived(seconds <= 5);

  // Format seconds as MM:SS for longer durations
  function formatTime(s: number): string {
    if (s >= 60) {
      const mins = Math.floor(s / 60);
      const secs = s % 60;
      return `${mins}:${secs.toString().padStart(2, '0')}`;
    }
    return `0:${s.toString().padStart(2, '0')}`;
  }
</script>

{#if $game.timer}
  <div class="timer" class:low={isLow} class:critical={isCritical}>
    <div class="timer-display">
      <span class="time-value">{formatTime(seconds)}</span>
    </div>
    <div class="progress-wrapper">
      <ProgressBar
        {progress}
        color={isCritical ? 'error' : isLow ? 'warning' : 'accent'}
        height="sm"
      />
    </div>
  </div>
{/if}

<style>
  .timer {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--space-1);
    padding: var(--space-2) var(--space-3);
    background: var(--color-bg-tertiary);
    border: 2px solid var(--color-bg-elevated);
    border-radius: var(--radius-sm);
    min-width: 80px;
  }

  .timer-display {
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .time-value {
    font-size: var(--font-size-lg);
    font-weight: var(--font-weight-bold);
    color: var(--color-text-primary);
    font-variant-numeric: tabular-nums;
    letter-spacing: 2px;
  }

  .progress-wrapper {
    width: 100%;
  }

  /* Low time state */
  .timer.low .time-value {
    color: var(--color-warning);
  }

  /* Critical time state */
  .timer.critical .time-value {
    color: var(--color-error);
    animation: blink 0.5s step-end infinite;
  }

  .timer.critical {
    border-color: var(--color-error);
    animation: shake 0.5s ease-in-out infinite;
  }

  @keyframes blink {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.5; }
  }

  @keyframes shake {
    0%, 100% { transform: translateX(0); }
    25% { transform: translateX(-2px); }
    75% { transform: translateX(2px); }
  }
</style>
