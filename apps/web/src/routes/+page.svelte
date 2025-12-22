<!-- apps/web/src/routes/+page.svelte -->
<script lang="ts">
  import { game, sessionBlocked } from '$lib/stores';
  import { Lobby, Drawing, Voting, Finale, Results } from '$lib/components/features';
  import { Timer } from '$lib/components/utility';
  import { PromptDisplay } from '$lib/components/molecules';
</script>

<main>
  {#if $sessionBlocked}
    <div class="blocked-overlay">
      <div class="blocked-message">
        <span class="blocked-icon">🚫</span>
        <h2>Session Limit Reached</h2>
        <p>You already have multiple tabs open with SpriteBox.</p>
        <p>Please close other tabs and refresh this page.</p>
        <button onclick={() => window.location.reload()}>Refresh Page</button>
      </div>
    </div>
  {:else}
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
  {/if}
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

  .blocked-overlay {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: var(--space-6);
  }

  .blocked-message {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--space-4);
    text-align: center;
    padding: var(--space-8);
    background: var(--color-bg-secondary);
    border: 3px solid var(--color-error);
    border-radius: var(--radius-md);
    max-width: 400px;
  }

  .blocked-icon {
    font-size: 3rem;
  }

  .blocked-message h2 {
    margin: 0;
    font-size: var(--font-size-xl);
    color: var(--color-error);
  }

  .blocked-message p {
    margin: 0;
    color: var(--color-text-secondary);
    font-size: var(--font-size-sm);
  }

  .blocked-message button {
    margin-top: var(--space-4);
    padding: var(--space-3) var(--space-6);
    background: var(--color-accent);
    color: white;
    border: none;
    border-radius: var(--radius-sm);
    font-size: var(--font-size-md);
    font-weight: 600;
    cursor: pointer;
    transition: background 0.2s;
  }

  .blocked-message button:hover {
    background: var(--color-accent-hover);
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
