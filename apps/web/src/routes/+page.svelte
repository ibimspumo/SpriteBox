<!-- apps/web/src/routes/+page.svelte -->
<script lang="ts">
  import { game, lobby, currentUser } from '$lib/stores';
  // Components werden in Phase 6 erstellt
  // import Lobby from '$lib/components/Lobby.svelte';
  // import Drawing from '$lib/components/Drawing.svelte';
  // import Voting from '$lib/components/Voting.svelte';
  // import Finale from '$lib/components/Finale.svelte';
  // import Results from '$lib/components/Results.svelte';
</script>

<main>
  <header>
    <h1>SpriteBox</h1>
    {#if $currentUser}
      <span class="user">{$currentUser.fullName}</span>
    {/if}
  </header>

  <div class="game-container">
    {#if $game.phase === 'idle'}
      <div class="welcome">
        <h2>Willkommen bei SpriteBox!</h2>
        <p>Zeichne 8x8 Pixel-Art und vote für die besten Werke.</p>
        <!-- Buttons kommen in Phase 6 -->
        <p class="dev-note">Phase 5 abgeschlossen - UI kommt in Phase 6</p>
      </div>
    {:else if $game.phase === 'lobby'}
      <div class="phase-placeholder">
        <h2>Lobby</h2>
        <p>{$lobby.players.length} Spieler</p>
        <p>Phase: {$game.phase}</p>
      </div>
    {:else if $game.phase === 'countdown'}
      <div class="phase-placeholder">
        <h2>Countdown</h2>
        <p>Prompt: {$game.prompt}</p>
      </div>
    {:else if $game.phase === 'drawing'}
      <div class="phase-placeholder">
        <h2>Zeichnen</h2>
        <p>Prompt: {$game.prompt}</p>
      </div>
    {:else if $game.phase === 'voting'}
      <div class="phase-placeholder">
        <h2>Voting</h2>
      </div>
    {:else if $game.phase === 'finale'}
      <div class="phase-placeholder">
        <h2>Finale</h2>
      </div>
    {:else if $game.phase === 'results'}
      <div class="phase-placeholder">
        <h2>Ergebnisse</h2>
      </div>
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

  .welcome, .phase-placeholder {
    text-align: center;
    max-width: 500px;
  }

  .welcome h2 {
    color: #e94560;
    margin-bottom: 1rem;
  }

  .dev-note {
    margin-top: 2rem;
    padding: 1rem;
    background: #0f3460;
    border-radius: 8px;
    color: #aaa;
  }

  .phase-placeholder {
    padding: 2rem;
    background: #16213e;
    border-radius: 12px;
    border: 1px solid #0f3460;
  }
</style>
