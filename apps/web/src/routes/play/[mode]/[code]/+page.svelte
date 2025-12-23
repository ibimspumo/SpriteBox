<!-- Direct Room Join - /play/[mode]/[code] -->
<script lang="ts">
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  import { onMount } from 'svelte';
  import { t } from '$lib/i18n';
  import { getModeFromSlug } from '$lib/modeRoutes';
  import {
    game,
    lobby,
    selectedGameMode,
    connectionStatus,
    lastError,
    passwordPrompt,
  } from '$lib/stores';
  import { joinPrivateRoom } from '$lib/socketBridge';
  import { emitViewMode, emitLeaveMode } from '$lib/socket';
  import { Lobby, Drawing, Voting, Finale, Results, Memorize, CopyCatResult, CopyCatRematch } from '$lib/components/features';
  import { Timer } from '$lib/components/utility';
  import { PromptDisplay, PasswordInput } from '$lib/components/molecules';
  import { Button } from '$lib/components/atoms';
  import { Modal } from '$lib/components/organisms';

  // Get mode and code from URL
  const modeSlug = $derived($page.params.mode ?? '');
  const roomCode = $derived($page.params.code?.toUpperCase() ?? '');
  const gameModeId = $derived(modeSlug ? getModeFromSlug(modeSlug) : null);

  let hasAttemptedJoin = $state(false);
  let joinError = $state<string | null>(null);
  let passwordValue = $state('');

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

    // Cleanup on unmount
    return () => {
      emitLeaveMode();
    };
  });

  // Auto-join when connected and not already in a lobby
  $effect(() => {
    if (
      $connectionStatus === 'connected' &&
      roomCode &&
      !$lobby.instanceId &&
      !hasAttemptedJoin &&
      !$passwordPrompt.show
    ) {
      hasAttemptedJoin = true;
      joinPrivateRoom(roomCode);
    }
  });

  // Handle errors
  $effect(() => {
    if ($lastError?.code === 'ROOM_NOT_FOUND') {
      joinError = $t.errors.roomNotFound;
    } else if ($lastError?.code === 'JOIN_FAILED') {
      joinError = $t.errors.joinFailed;
    }
  });

  function handlePasswordSubmit() {
    if (roomCode && passwordValue) {
      joinPrivateRoom(roomCode, passwordValue);
    }
  }

  function handlePasswordCancel() {
    passwordPrompt.set({ show: false, roomCode: null, error: null });
    goto(`/play/${modeSlug}`);
  }

  function goToModeSelection() {
    goto('/play');
  }

  function goToModePage() {
    goto(`/play/${modeSlug}`);
  }

  // Determine if we're in the game
  const isInGame = $derived($lobby.instanceId !== null);
</script>

{#if gameModeId}
  <!-- Password Modal -->
  {#if $passwordPrompt.show}
    <Modal
      show={true}
      title={$t.passwordModal.title}
      onclose={handlePasswordCancel}
    >
      <p class="password-hint">{$t.passwordModal.roomRequiresPassword}</p>
      <PasswordInput
        bind:value={passwordValue}
        onsubmit={handlePasswordSubmit}
        oncancel={handlePasswordCancel}
        error={$passwordPrompt.error}
      />
    </Modal>
  {/if}

  <div class="room-page">
    {#if joinError && !isInGame}
      <!-- Error State -->
      <div class="error-container">
        <div class="error-box">
          <span class="error-icon">&#128533;</span>
          <h2>{$t.errors.roomNotFound}</h2>
          <p class="room-code">Code: {roomCode}</p>
          <div class="error-actions">
            <Button variant="secondary" onclick={goToModePage}>
              {$t.common.backToModes}
            </Button>
            <Button variant="primary" onclick={() => { hasAttemptedJoin = false; joinError = null; joinPrivateRoom(roomCode!); }}>
              {$t.common.submit}
            </Button>
          </div>
        </div>
      </div>
    {:else if !isInGame}
      <!-- Loading State -->
      <div class="loading-container">
        <div class="loading-box">
          <div class="loading-dots">
            <span></span>
            <span></span>
            <span></span>
          </div>
          <p>{$t.common.loading}</p>
          <p class="room-code">Room: {roomCode}</p>
        </div>
      </div>
    {:else}
      <!-- Game View -->
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
        {/if}
      </div>
    {/if}
  </div>
{/if}

<style>
  .room-page {
    min-height: 100vh;
    display: flex;
    flex-direction: column;
  }

  .loading-container,
  .error-container {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: var(--space-6);
  }

  .loading-box,
  .error-box {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--space-4);
    padding: var(--space-8);
    background: var(--color-bg-secondary);
    border: 3px solid var(--color-bg-tertiary);
    border-radius: var(--radius-md);
    text-align: center;
  }

  .loading-dots {
    display: flex;
    gap: var(--space-2);
  }

  .loading-dots span {
    width: 12px;
    height: 12px;
    background: var(--color-accent);
    animation: dotPulse 1.4s ease-in-out infinite;
  }

  .loading-dots span:nth-child(1) { animation-delay: 0s; }
  .loading-dots span:nth-child(2) { animation-delay: 0.2s; }
  .loading-dots span:nth-child(3) { animation-delay: 0.4s; }

  @keyframes dotPulse {
    0%, 80%, 100% {
      transform: scale(0.6);
      opacity: 0.5;
    }
    40% {
      transform: scale(1);
      opacity: 1;
    }
  }

  .room-code {
    font-size: var(--font-size-lg);
    font-weight: var(--font-weight-bold);
    color: var(--color-accent);
    letter-spacing: 2px;
    margin: 0;
  }

  .error-icon {
    font-size: 3rem;
  }

  .error-box h2 {
    margin: 0;
    font-size: var(--font-size-xl);
    color: var(--color-text-primary);
  }

  .error-actions {
    display: flex;
    gap: var(--space-3);
    margin-top: var(--space-2);
  }

  .password-hint {
    margin: 0 0 var(--space-4);
    color: var(--color-text-secondary);
    text-align: center;
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
</style>
