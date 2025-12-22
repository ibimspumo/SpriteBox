<!-- LobbyMenu - Main menu for joining/creating games - Pixel Art Style -->
<script lang="ts">
  import { Button, Input } from '../../atoms';
  import { UsernameEditor } from '../../molecules';
  import { joinPublicGame, createPrivateRoom, joinPrivateRoom } from '$lib/socketBridge';
  import { globalOnlineCount, currentUser } from '$lib/stores';

  let roomCode = $state('');
  let showJoinInput = $state(false);
  let showCreateOptions = $state(false);
  let createPassword = $state('');

  function handleCreateRoom() {
    if (showCreateOptions && createPassword) {
      createPrivateRoom(createPassword);
    } else {
      createPrivateRoom();
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
  <!-- Logo -->
  <div class="logo-container">
    <img src="/logo.png" alt="SpriteBox" class="logo" />
  </div>

  <!-- Menu Card -->
  <div class="lobby-menu">
    <!-- Player count badge -->
    {#if $globalOnlineCount > 0}
      <div class="online-badge">
        <span class="online-dot"></span>
        <span class="online-text">{$globalOnlineCount} Players Online</span>
      </div>
    {/if}

    <!-- Main CTA -->
    <Button variant="primary" size="lg" fullWidth onclick={joinPublicGame}>
      Play Now
    </Button>

    <!-- Divider -->
    <div class="divider">
      <span class="divider-line"></span>
      <span class="divider-text">or</span>
      <span class="divider-line"></span>
    </div>

    <!-- Private Room Options -->
    {#if showCreateOptions}
      <div class="option-panel">
        <h3>Create Private Room</h3>
        <Input
          type="password"
          bind:value={createPassword}
          placeholder="Password (optional)"
          minlength={4}
          maxlength={64}
          fullWidth
        />
        <div class="option-actions">
          <Button variant="action" onclick={handleCreateRoom}>
            Create
          </Button>
          <Button variant="ghost" onclick={() => { showCreateOptions = false; createPassword = ''; }}>
            Cancel
          </Button>
        </div>
      </div>
    {:else}
      <Button variant="secondary" fullWidth onclick={() => showCreateOptions = true}>
        Private Room
      </Button>
    {/if}

    <!-- Join Room -->
    {#if showJoinInput}
      <div class="option-panel">
        <h3>Join Room</h3>
        <div class="join-input-row">
          <Input
            bind:value={roomCode}
            placeholder="CODE"
            maxlength={4}
            uppercase
            centered
            size="lg"
            onkeydown={handleKeyDown}
          />
        </div>
        <div class="option-actions">
          <Button variant="action" onclick={handleJoinRoom} disabled={roomCode.length !== 4}>
            Join
          </Button>
          <Button variant="ghost" onclick={() => { showJoinInput = false; roomCode = ''; }}>
            Cancel
          </Button>
        </div>
      </div>
    {:else if !showCreateOptions}
      <Button variant="ghost" fullWidth onclick={() => showJoinInput = true}>
        Enter Room Code
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

  .logo-container {
    display: flex;
    justify-content: center;
  }

  .logo {
    width: 280px;
    height: auto;
    image-rendering: pixelated;
    image-rendering: crisp-edges;
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

  .online-badge {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: var(--space-2);
    padding: var(--space-2) var(--space-4);
    background: var(--color-bg-tertiary);
    border-radius: var(--radius-sm);
  }

  .online-dot {
    width: 8px;
    height: 8px;
    background: var(--color-success);
    animation: pulse 2s ease-in-out infinite;
  }

  .online-text {
    font-size: var(--font-size-sm);
    color: var(--color-text-secondary);
    text-transform: uppercase;
    letter-spacing: 1px;
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

  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.5; }
  }

  /* Mobile adjustments */
  @media (max-width: 480px) {
    .logo {
      width: 200px;
    }

    .lobby-menu {
      padding: var(--space-4);
    }
  }
</style>
