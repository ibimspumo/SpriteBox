<!-- LobbyMenu - Main menu for joining/creating games - Pixel Art Style -->
<script lang="ts">
  import { goto } from '$app/navigation';
  import { Button, Input, OnlineBadge } from '../../atoms';
  import { UsernameEditor } from '../../molecules';
  import { joinPublicGame, createPrivateRoom, joinPrivateRoom } from '$lib/socketBridge';
  import { currentUser, selectedGameMode, availableGameModes, currentModeOnlineCount } from '$lib/stores';
  import { t } from '$lib/i18n';
  import { get } from 'svelte/store';
  import { getSlugFromMode } from '$lib/modeRoutes';

  // Get current mode info for display
  let modeInfo = $derived($availableGameModes.find(m => m.id === $selectedGameMode));

  // Get localized mode name
  let modeName = $derived(() => {
    if (modeInfo?.i18nKey === 'gameModes.pixelBattle') {
      return $t.modeSelection.classic.name;
    } else if (modeInfo?.i18nKey === 'gameModes.copyCat') {
      return $t.modeSelection.copycat.name;
    }
    return modeInfo?.displayName ?? 'Pixel Battle';
  });

  // Get localized mode description
  let modeDescription = $derived(() => {
    if (modeInfo?.i18nKey === 'gameModes.pixelBattle') {
      return $t.modeSelection.classic.description;
    } else if (modeInfo?.i18nKey === 'gameModes.copyCat') {
      return $t.modeSelection.copycat.description;
    }
    return '';
  });

  function handleBackToModes() {
    goto('/play');
  }

  let roomCode = $state('');
  let showJoinInput = $state(false);
  let showCreateOptions = $state(false);
  let createPassword = $state('');

  function handlePlayNow() {
    joinPublicGame(get(selectedGameMode));
  }

  function handleCreateRoom() {
    const mode = get(selectedGameMode);
    if (showCreateOptions && createPassword) {
      createPrivateRoom(createPassword, mode);
    } else {
      createPrivateRoom(undefined, mode);
    }
    showCreateOptions = false;
    createPassword = '';
  }

  function handleJoinRoom() {
    if (roomCode.length === 4) {
      joinPrivateRoom(roomCode.toUpperCase());
      roomCode = '';
      showJoinInput = false;
    }
  }

  function handleKeyDown(e: KeyboardEvent) {
    if (e.key === 'Enter') {
      handleJoinRoom();
    }
  }
</script>

<div class="lobby-wrapper">
  <!-- Hero Section with Logo, Mode Name & Description -->
  <div class="hero-section">
    <div class="logo-container">
      <img src="/logo.png" alt="SpriteBox" class="logo" />
    </div>
    <h1 class="mode-title">{modeName()}</h1>
    {#if modeDescription()}
      <p class="mode-description">{modeDescription()}</p>
    {/if}
    <OnlineBadge count={$currentModeOnlineCount} size="sm" />
  </div>

  <!-- Menu Card -->
  <div class="lobby-menu">
    <!-- Main CTA -->
    <Button variant="primary" size="lg" fullWidth onclick={handlePlayNow}>
      {$t.lobbyMenu.playNow}
    </Button>

    <!-- Divider -->
    <div class="divider">
      <span class="divider-line"></span>
      <span class="divider-text">{$t.common.or}</span>
      <span class="divider-line"></span>
    </div>

    <!-- Private Room Options -->
    {#if showCreateOptions}
      <div class="option-panel">
        <h3>{$t.lobbyMenu.createPrivateRoom}</h3>
        <Input
          type="password"
          bind:value={createPassword}
          placeholder={$t.lobbyMenu.passwordOptional}
          minlength={4}
          maxlength={64}
          fullWidth
        />
        <div class="option-actions">
          <Button variant="action" onclick={handleCreateRoom}>
            {$t.common.create}
          </Button>
          <Button variant="ghost" onclick={() => { showCreateOptions = false; createPassword = ''; }}>
            {$t.common.cancel}
          </Button>
        </div>
      </div>
    {:else}
      <Button variant="secondary" fullWidth onclick={() => showCreateOptions = true}>
        {$t.lobbyMenu.privateRoom}
      </Button>
    {/if}

    <!-- Join Room -->
    {#if showJoinInput}
      <div class="option-panel">
        <h3>{$t.lobbyMenu.joinRoom}</h3>
        <div class="join-input-row">
          <Input
            bind:value={roomCode}
            placeholder={$t.lobbyMenu.codePlaceholder}
            maxlength={4}
            uppercase
            centered
            size="lg"
            onkeydown={handleKeyDown}
          />
        </div>
        <div class="option-actions">
          <Button variant="action" onclick={handleJoinRoom} disabled={roomCode.length !== 4}>
            {$t.common.join}
          </Button>
          <Button variant="ghost" onclick={() => { showJoinInput = false; roomCode = ''; }}>
            {$t.common.cancel}
          </Button>
        </div>
      </div>
    {:else if !showCreateOptions}
      <Button variant="ghost" fullWidth onclick={() => showJoinInput = true}>
        {$t.lobbyMenu.enterRoomCode}
      </Button>
    {/if}
  </div>

  <!-- Username at bottom -->
  {#if $currentUser}
    <div class="user-section">
      <UsernameEditor
        displayName={$currentUser.displayName}
        discriminator={$currentUser.discriminator}
      />
    </div>
  {/if}

  <!-- Back to mode selection -->
  <button class="back-link" onclick={handleBackToModes}>
    ← {$t.common.backToModes}
  </button>
</div>

<style>
  .lobby-wrapper {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--space-6);
    width: 100%;
    max-width: 320px;
  }

  .hero-section {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--space-3);
    text-align: center;
  }

  .logo-container {
    display: flex;
    justify-content: center;
  }

  .logo {
    width: 200px;
    height: auto;
    image-rendering: pixelated;
    image-rendering: crisp-edges;
  }

  .mode-title {
    margin: 0;
    font-size: var(--font-size-2xl);
    font-weight: var(--font-weight-bold);
    color: var(--color-brand);
    text-transform: uppercase;
    letter-spacing: 3px;
  }

  .mode-description {
    margin: 0;
    font-size: var(--font-size-sm);
    color: var(--color-text-secondary);
    max-width: 280px;
    line-height: 1.5;
  }

  .lobby-menu {
    width: 100%;
    display: flex;
    flex-direction: column;
    gap: var(--space-4);
    padding: var(--space-6);
    background: var(--color-bg-secondary);
    border: 3px solid var(--color-bg-tertiary);
    border-radius: var(--radius-md);
  }

  .divider {
    display: flex;
    align-items: center;
    gap: var(--space-3);
    margin: var(--space-2) 0;
  }

  .divider-line {
    flex: 1;
    height: 2px;
    background: var(--color-bg-tertiary);
  }

  .divider-text {
    font-size: var(--font-size-sm);
    color: var(--color-text-muted);
    text-transform: uppercase;
    letter-spacing: 2px;
  }

  .option-panel {
    display: flex;
    flex-direction: column;
    gap: var(--space-3);
    padding: var(--space-4);
    padding-bottom: calc(var(--space-4) + 6px);
    background: var(--color-bg-tertiary);
    border-radius: var(--radius-sm);
  }

  .option-panel h3 {
    margin: 0;
    font-size: var(--font-size-sm);
    color: var(--color-text-secondary);
    text-transform: uppercase;
    letter-spacing: 1px;
    text-align: center;
  }

  .join-input-row {
    display: flex;
    justify-content: center;
  }

  .join-input-row :global(input) {
    max-width: 140px;
    font-size: var(--font-size-xl);
    letter-spacing: 8px;
  }

  .option-actions {
    display: flex;
    gap: var(--space-2);
    width: 100%;
  }

  .option-actions :global(button) {
    flex: 1;
    min-width: 0;
  }

  .user-section {
    display: flex;
    justify-content: center;
    width: 100%;
    padding: var(--space-3);
    padding-bottom: calc(var(--space-3) + 6px);
    background: var(--color-bg-secondary);
    border: 2px solid var(--color-bg-tertiary);
    border-radius: var(--radius-sm);
  }

  .back-link {
    display: inline-flex;
    align-items: center;
    gap: var(--space-1);
    padding: var(--space-2) var(--space-3);
    background: transparent;
    border: none;
    font-family: var(--font-family);
    font-size: var(--font-size-sm);
    color: var(--color-text-muted);
    cursor: pointer;
    transition: color var(--transition-fast);
  }

  .back-link:hover {
    color: var(--color-accent);
  }

  /* Mobile adjustments */
  @media (max-width: 480px) {
    .logo {
      width: 160px;
    }

    .mode-title {
      font-size: var(--font-size-xl);
    }

    .lobby-menu {
      padding: var(--space-4);
    }
  }
</style>
