<!-- Game Mode Page - /play/[mode] -->
<script lang="ts">
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  import { onMount } from 'svelte';
  import { t } from '$lib/i18n';
  import { getModeFromSlug } from '$lib/modeRoutes';
  import { game, selectedGameMode, lobby } from '$lib/stores';
  import { emitViewMode, emitLeaveMode } from '$lib/socket';
  import { leaveLobby } from '$lib/socketBridge';
  import { Lobby, Drawing, Voting, Finale, Results, Memorize, CopyCatResult, CopyCatRematch, Guessing, Reveal, FinalResults, ZombiePixelGame } from '$lib/components/features';
  import { Timer } from '$lib/components/utility';
  import { PromptDisplay } from '$lib/components/molecules';

  // Get mode from URL
  const modeSlug = $derived($page.params.mode ?? '');
  const gameModeId = $derived(modeSlug ? getModeFromSlug(modeSlug) : null);

  let mounted = $state(false);

  onMount(() => {
    // Validate mode
    if (!gameModeId) {
      goto('/play');
      return;
    }

    // Set selected game mode
    selectedGameMode.set(gameModeId);

    // Track mode page view for online count
    emitViewMode(gameModeId);

    setTimeout(() => {
      mounted = true;
    }, 100);

    // Cleanup on unmount
    return () => {
      emitLeaveMode();
    };
  });

  // Redirect to /play if mode is invalid
  $effect(() => {
    if (modeSlug && !gameModeId) {
      goto('/play');
    }
  });

  // If server restored a session with wrong game mode, leave that game
  // URL is the source of truth - if URL says guesser, we should be in guesser
  $effect(() => {
    if (gameModeId && $lobby.instanceId && $lobby.gameMode && $lobby.gameMode !== gameModeId) {
      console.log(`[Mode] URL mode (${gameModeId}) != lobby mode (${$lobby.gameMode}), leaving wrong game`);
      leaveLobby();
    }
  });
</script>

{#if gameModeId}
  <div class="game-page" class:mounted>
    <div class="game-container">
      {#if $game.phase === 'idle' || $game.phase === 'lobby'}
        <Lobby />
      {:else if $game.phase === 'countdown'}
        <div class="countdown">
          <h2>{$t.countdown.getReady}</h2>
          <PromptDisplay prompt={$game.prompt} label={$t.drawing.draw} size="lg" centered />
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
      {:else if $game.phase === 'memorize'}
        <Memorize />
      {:else if $game.phase === 'copycat-result'}
        <CopyCatResult />
      {:else if $game.phase === 'copycat-rematch'}
        <CopyCatRematch />
      {:else if $game.phase === 'guessing'}
        <Guessing />
      {:else if $game.phase === 'reveal'}
        <Reveal />
      {:else if $game.phase === 'pixelguesser-results'}
        <FinalResults />
      {:else if $game.phase === 'active'}
        <ZombiePixelGame />
      {/if}
    </div>
  </div>
{/if}

<style>
  .game-page {
    min-height: 100vh;
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

  @media (max-width: 640px) {
    .game-container {
      padding: var(--space-4);
    }
  }
</style>
