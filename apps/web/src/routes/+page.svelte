<!-- apps/web/src/routes/+page.svelte -->
<script lang="ts">
  import { game, currentUser } from '$lib/stores';
  import { Lobby, Drawing, Voting, Finale, Results } from '$lib/components/features';
  import { Timer } from '$lib/components/utility';
  import { PromptDisplay } from '$lib/components/molecules';
</script>

<main>
  <header>
    <h1>SpriteBox</h1>
    {#if $currentUser}
      <span class="user">{$currentUser.fullName}</span>
    {/if}
  </header>

  <div class="game-container">
    {#if $game.phase === 'idle' || $game.phase === 'lobby'}
      <Lobby />
    {:else if $game.phase === 'countdown'}
      <div class="countdown">
        <h2>Bereit machen!</h2>
        <PromptDisplay prompt={$game.prompt} label="Prompt:" size="lg" centered />
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

  header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: var(--space-4);
    background: var(--color-bg-secondary);
    border-bottom: 1px solid var(--color-border);
  }

  header h1 {
    margin: 0;
    font-size: var(--font-size-xl);
    color: var(--color-text-primary);
  }

  .user {
    color: var(--color-text-secondary);
    font-size: var(--font-size-sm);
  }

  .game-container {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: var(--space-8);
  }

  .countdown {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--space-6);
    text-align: center;
  }

  .countdown h2 {
    font-size: var(--font-size-2xl);
    color: var(--color-warning);
    animation: pulse 1s ease-in-out infinite;
  }

  @keyframes pulse {
    0%, 100% { transform: scale(1); }
    50% { transform: scale(1.1); }
  }
</style>
