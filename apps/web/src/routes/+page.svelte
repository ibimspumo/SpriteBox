<!-- apps/web/src/routes/+page.svelte -->
<script lang="ts">
  import { game } from '$lib/stores';
  import { Lobby, Drawing, Voting, Finale, Results } from '$lib/components/features';
  import { Timer } from '$lib/components/utility';
  import { PromptDisplay } from '$lib/components/molecules';
</script>

<main>
  <div class="game-container">
    {#if $game.phase === 'idle' || $game.phase === 'lobby'}
      <Lobby />
    {:else if $game.phase === 'countdown'}
      <div class="countdown">
        <h2>Get Ready!</h2>
        <PromptDisplay prompt={$game.prompt} label="Draw:" size="lg" centered />
        <Timer />
      </div>
    {:else if $game.phase === 'drawing'}
      <Drawing />
    {:else if $game.phase === 'voting'}
      <Voting />
    {:else if $game.phase === 'finale'}
      <Finale />
    {:else if $game.phase === 'results'}
      <Results />
    {/if}
  </div>
</main>

<style>
  main {
    flex: 1;
    display: flex;
    flex-direction: column;
  }

  .game-container {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: var(--space-6);
  }

  .countdown {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--space-6);
    text-align: center;
    padding: var(--space-8);
    background: var(--color-bg-secondary);
    border: 3px solid var(--color-bg-tertiary);
    border-radius: var(--radius-md);
  }

  .countdown h2 {
    margin: 0;
    font-size: var(--font-size-2xl);
    color: var(--color-warning);
    animation: pulse 1s ease-in-out infinite;
    text-transform: uppercase;
    letter-spacing: 2px;
  }

  @keyframes pulse {
    0%, 100% { transform: scale(1); opacity: 1; }
    50% { transform: scale(1.05); opacity: 0.9; }
  }

  /* Mobile adjustments */
  @media (max-width: 480px) {
    .game-container {
      padding: var(--space-4);
    }
  }
</style>
