<!-- apps/web/src/lib/components/Timer.svelte -->
<script lang="ts">
  import { game } from '$lib/stores';

  let seconds = $derived($game.timer ? Math.ceil($game.timer.remaining / 1000) : 0);
  let progress = $derived($game.timer
    ? ($game.timer.remaining / $game.timer.duration) * 100
    : 100);
  let isLow = $derived(seconds <= 10);
</script>

{#if $game.timer}
  <div class="timer" class:low={isLow}>
    <div class="progress-bar">
      <div class="progress" style="width: {progress}%"></div>
    </div>
    <span class="seconds">{seconds}s</span>
  </div>
{/if}

<style>
  .timer {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 8px 16px;
    background: #16213e;
    border-radius: 20px;
  }

  .progress-bar {
    width: 120px;
    height: 8px;
    background: #0f3460;
    border-radius: 4px;
    overflow: hidden;
  }

  .progress {
    height: 100%;
    background: #4ade80;
    transition: width 0.1s linear;
  }

  .timer.low .progress {
    background: #ef4444;
  }

  .seconds {
    font-size: 1.25rem;
    font-weight: bold;
    min-width: 40px;
  }

  .timer.low .seconds {
    color: #ef4444;
    animation: pulse 0.5s ease-in-out infinite;
  }

  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.5; }
  }
</style>
