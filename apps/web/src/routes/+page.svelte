<!-- apps/web/src/routes/+page.svelte -->
<script lang="ts">
  import { game, sessionBlocked, idleWarning } from '$lib/stores';
  import { getSocket } from '$lib/socket';
  import { Lobby, Drawing, Voting, Finale, Results } from '$lib/components/features';
  import { Timer } from '$lib/components/utility';
  import { PromptDisplay } from '$lib/components/molecules';

  function handleStillHere() {
    // Send ping to reset idle timer
    const socket = getSocket();
    if (socket) {
      socket.emit('ping', () => {});
    }
    idleWarning.set({ show: false, timeLeft: 0 });
  }
</script>

<!-- Idle Warning Modal (shows on top of everything) -->
{#if $idleWarning.show}
  <div class="idle-warning-overlay" role="alertdialog" aria-modal="true">
    <div class="idle-warning-modal">
      <span class="idle-icon">👋</span>
      <h2>Are you still there?</h2>
      <p>You'll be disconnected soon due to inactivity.</p>
      <button onclick={handleStillHere}>I'm here!</button>
    </div>
  </div>
{/if}

<main>
  {#if $sessionBlocked}
    <div class="blocked-overlay">
      <div class="blocked-message">
        <span class="blocked-icon">🎮</span>
        <h2>Already Playing?</h2>
        <p>It looks like you have SpriteBox open in another window or tab.</p>
        <p>Close the other one first, then come back here!</p>
        <button onclick={() => window.location.reload()}>Try Again</button>
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
  /* Idle Warning Modal */
  .idle-warning-overlay {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.8);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
    padding: var(--space-4);
    animation: fadeIn 0.2s ease-out;
  }

  .idle-warning-modal {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--space-4);
    text-align: center;
    padding: var(--space-8);
    background: var(--color-bg-secondary);
    border: 3px solid var(--color-accent);
    border-radius: var(--radius-md);
    max-width: 360px;
    animation: scaleIn 0.2s ease-out;
  }

  .idle-icon {
    font-size: 3.5rem;
    animation: wave 1s ease-in-out infinite;
  }

  @keyframes wave {
    0%, 100% { transform: rotate(0deg); }
    25% { transform: rotate(20deg); }
    75% { transform: rotate(-20deg); }
  }

  .idle-warning-modal h2 {
    margin: 0;
    font-size: var(--font-size-xl);
    color: var(--color-text-primary);
  }

  .idle-warning-modal p {
    margin: 0;
    color: var(--color-text-secondary);
    font-size: var(--font-size-sm);
  }

  .idle-warning-modal button {
    margin-top: var(--space-2);
    padding: var(--space-4) var(--space-8);
    background: var(--color-accent);
    color: white;
    border: none;
    border-radius: var(--radius-sm);
    font-size: var(--font-size-lg);
    font-weight: 600;
    cursor: pointer;
    transition: transform 0.1s, background 0.2s;
  }

  .idle-warning-modal button:hover {
    background: var(--color-accent-hover);
    transform: scale(1.05);
  }

  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }

  @keyframes scaleIn {
    from { transform: scale(0.9); opacity: 0; }
    to { transform: scale(1); opacity: 1; }
  }

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
    border: 3px solid var(--color-warning);
    border-radius: var(--radius-md);
    max-width: 400px;
  }

  .blocked-icon {
    font-size: 3rem;
  }

  .blocked-message h2 {
    margin: 0;
    font-size: var(--font-size-xl);
    color: var(--color-warning);
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
