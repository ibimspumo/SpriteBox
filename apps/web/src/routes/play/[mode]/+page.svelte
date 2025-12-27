<!-- Game Mode Page - /play/[mode] -->
<script lang="ts">
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  import { onMount } from 'svelte';
  import { getModeFromSlug } from '$lib/modeRoutes';
  import { game, selectedGameMode, lobby } from '$lib/stores';
  import { emitViewMode, emitLeaveMode } from '$lib/socket';
  import { leaveLobby } from '$lib/socketBridge';
  import { getPhaseComponent } from '$lib/phaseRouter';

  // Get mode from URL
  const modeSlug = $derived($page.params.mode ?? '');
  const gameModeId = $derived(modeSlug ? getModeFromSlug(modeSlug) : null);

  // Get the component for current phase (with game mode for special cases)
  const PhaseComponent = $derived(getPhaseComponent($game.phase, $lobby.gameMode));

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
      {#if PhaseComponent}
        <PhaseComponent />
      {:else}
        <div class="unknown-phase">Unknown phase: {$game.phase}</div>
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

  .unknown-phase {
    padding: var(--space-4);
    background: var(--color-bg-secondary);
    border: 2px solid var(--color-warning);
    border-radius: var(--radius-md);
    color: var(--color-warning);
    font-family: monospace;
  }

  @media (max-width: 640px) {
    .game-container {
      padding: var(--space-4);
    }
  }
</style>
