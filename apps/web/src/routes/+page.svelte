<!-- apps/web/src/routes/+page.svelte -->
<script lang="ts">
  import { game, lobby, currentUser } from '$lib/stores';
  import Lobby from '$lib/components/Lobby.svelte';
  import Drawing from '$lib/components/Drawing.svelte';
  import Voting from '$lib/components/Voting.svelte';
  import Finale from '$lib/components/Finale.svelte';
  import Results from '$lib/components/Results.svelte';
  import Timer from '$lib/components/Timer.svelte';
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
        <p class="prompt">Prompt: <strong>{$game.prompt}</strong></p>
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
    padding: 1rem;
    background: #16213e;
    border-bottom: 1px solid #0f3460;
  }

  header h1 {
    margin: 0;
    font-size: 1.5rem;
  }

  .user {
    color: #aaa;
    font-size: 0.9rem;
  }

  .game-container {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 2rem;
  }

  .countdown {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 24px;
    text-align: center;
  }

  .countdown h2 {
    font-size: 2.5rem;
    color: #fbbf24;
    animation: pulse 1s ease-in-out infinite;
  }

  .countdown .prompt {
    font-size: 1.5rem;
    color: #e94560;
  }

  @keyframes pulse {
    0%, 100% { transform: scale(1); }
    50% { transform: scale(1.1); }
  }
</style>
