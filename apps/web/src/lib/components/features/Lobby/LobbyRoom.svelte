<!-- LobbyRoom - In-lobby view with players and host controls - Pixel Art Style -->
<script lang="ts">
  import { lobby, currentUser } from '$lib/stores';
  import { leaveLobby, hostStartGame, hostChangePassword } from '$lib/socketBridge';
  import { Button, Input } from '../../atoms';
  import { PlayerList } from '../../organisms';
  import { Timer } from '../../utility';

  let showPasswordSettings = $state(false);
  let newPassword = $state('');

  function handleSetPassword() {
    if (newPassword.length >= 4) {
      hostChangePassword(newPassword);
      newPassword = '';
      showPasswordSettings = false;
    }
  }

  function handleRemovePassword() {
    hostChangePassword(null);
    showPasswordSettings = false;
  }
</script>

<div class="lobby-wrapper">
  <!-- Logo -->
  <div class="logo-container">
    <img src="/logo.png" alt="SpriteBox" class="logo" />
  </div>

  <div class="lobby-room">
  <!-- Room Header -->
  <div class="room-header">
    <div class="room-info">
      {#if $lobby.type === 'private'}
        <div class="room-code-display">
          <span class="room-label">Room</span>
          <span class="room-code">{$lobby.code}</span>
          {#if $lobby.hasPassword}
            <span class="lock-badge" title="Password protected">
              <img src="/icons/lock.svg" alt="Locked" class="lock-icon" />
            </span>
          {/if}
        </div>
      {:else}
        <div class="room-code-display">
          <span class="room-label">Public Lobby</span>
        </div>
      {/if}
    </div>
    <Timer />
  </div>

  <!-- Player List -->
  <div class="players-section">
    <PlayerList
      players={$lobby.players}
      currentPlayerName={$currentUser?.fullName}
    />
  </div>

  <!-- Spectator Notice -->
  {#if $lobby.isSpectator}
    <div class="spectator-notice">
      <span class="spectator-icon">👁</span>
      <span>You are spectating this round</span>
    </div>
  {/if}

  <!-- Actions -->
  <div class="actions">
    {#if $lobby.isHost && $lobby.type === 'private'}
      <!-- Host Controls -->
      <Button
        variant="primary"
        size="lg"
        fullWidth
        onclick={hostStartGame}
        disabled={$lobby.players.length < 5}
      >
        Start Game
      </Button>

      {#if $lobby.players.length < 5}
        <p class="waiting-info">
          Need {5 - $lobby.players.length} more player{5 - $lobby.players.length !== 1 ? 's' : ''}
        </p>
      {/if}

      <!-- Password Settings -->
      {#if showPasswordSettings}
        <div class="password-panel">
          <Input
            type="password"
            bind:value={newPassword}
            placeholder="New password (min 4 chars)"
            size="sm"
            minlength={4}
            maxlength={64}
            fullWidth
          />
          <div class="password-actions">
            <Button size="sm" variant="action" onclick={handleSetPassword} disabled={newPassword.length < 4}>
              {$lobby.hasPassword ? 'Change' : 'Set'}
            </Button>
            {#if $lobby.hasPassword}
              <Button size="sm" variant="danger" onclick={handleRemovePassword}>
                Remove
              </Button>
            {/if}
            <Button variant="ghost" size="sm" onclick={() => { showPasswordSettings = false; newPassword = ''; }}>
              Cancel
            </Button>
          </div>
        </div>
      {:else}
        <Button variant="ghost" size="sm" fullWidth onclick={() => showPasswordSettings = true}>
          {$lobby.hasPassword ? 'Change Password' : 'Set Password'}
        </Button>
      {/if}

    {:else if $lobby.type === 'public'}
      <!-- Public Lobby Status -->
      {#if $lobby.players.length < 5}
        <div class="status-message waiting">
          <span class="status-dot"></span>
          Waiting for {5 - $lobby.players.length} more player{5 - $lobby.players.length !== 1 ? 's' : ''}...
        </div>
      {:else}
        <div class="status-message ready">
          <span class="status-dot"></span>
          Game starting soon...
        </div>
      {/if}
    {/if}

    <!-- Leave Button -->
    <Button variant="ghost" fullWidth onclick={leaveLobby}>
      Leave Lobby
    </Button>
  </div>
  </div>
</div>

<style>
  .lobby-wrapper {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--space-6);
    width: 100%;
    max-width: 400px;
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

  .lobby-room {
    width: 100%;
    max-width: 400px;
    display: flex;
    flex-direction: column;
    gap: var(--space-4);
    padding: var(--space-5);
    background: var(--color-bg-secondary);
    border: 3px solid var(--color-bg-elevated);
    border-radius: var(--radius-md);
    box-shadow: var(--shadow-pixel-lg);
  }

  .room-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    flex-wrap: wrap;
    gap: var(--space-3);
    padding-bottom: var(--space-3);
    border-bottom: 3px solid var(--color-bg-tertiary);
  }

  .room-info {
    display: flex;
    align-items: center;
    gap: var(--space-2);
  }

  .room-code-display {
    display: flex;
    align-items: center;
    gap: var(--space-3);
    padding: var(--space-3) var(--space-4);
    background: var(--color-bg-tertiary);
    border: 3px solid var(--color-bg-elevated);
    border-radius: var(--radius-sm);
    box-shadow: var(--shadow-pixel-sm);
  }

  .room-label {
    font-size: var(--font-size-sm);
    color: var(--color-text-muted);
    text-transform: uppercase;
    letter-spacing: 2px;
    font-weight: var(--font-weight-bold);
  }

  .room-code {
    font-size: var(--font-size-2xl);
    font-weight: var(--font-weight-bold);
    color: var(--color-brand);
    letter-spacing: 6px;
    text-shadow: 2px 2px 0 rgba(0, 0, 0, 0.5);
  }

  .lock-badge {
    display: flex;
    align-items: center;
    padding: var(--space-2);
    background: var(--color-bg-elevated);
    border: 2px solid var(--color-warning);
    border-radius: var(--radius-sm);
    box-shadow: var(--shadow-pixel-sm);
  }

  .lock-icon {
    width: 16px;
    height: 16px;
    filter: brightness(0) saturate(100%) invert(72%) sepia(95%) saturate(422%) hue-rotate(2deg) brightness(97%) contrast(93%);
  }

  .players-section {
    max-height: 200px;
    overflow-y: auto;
    padding: var(--space-2);
    background: var(--color-bg-tertiary);
    border: 3px solid var(--color-bg-elevated);
    border-radius: var(--radius-sm);
  }

  .spectator-notice {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: var(--space-2);
    padding: var(--space-3) var(--space-4);
    background: rgba(245, 158, 11, 0.15);
    border: 3px solid var(--color-warning);
    border-radius: var(--radius-sm);
    font-size: var(--font-size-sm);
    color: var(--color-warning);
    font-weight: var(--font-weight-bold);
    text-transform: uppercase;
    letter-spacing: 1px;
    box-shadow: var(--shadow-pixel-sm);
  }

  .spectator-icon {
    font-size: var(--font-size-lg);
    animation: pixelBlink 2s step-end infinite;
  }

  .actions {
    display: flex;
    flex-direction: column;
    gap: var(--space-3);
    margin-top: var(--space-2);
  }

  .waiting-info {
    margin: 0;
    text-align: center;
    font-size: var(--font-size-sm);
    color: var(--color-text-muted);
    text-transform: uppercase;
    letter-spacing: 1px;
    animation: pulse 2s ease-in-out infinite;
  }

  .password-panel {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
    padding: var(--space-3);
    background: var(--color-bg-tertiary);
    border: 3px solid var(--color-bg-elevated);
    border-radius: var(--radius-sm);
    box-shadow: inset 2px 2px 0 rgba(0, 0, 0, 0.3);
  }

  .password-actions {
    display: flex;
    gap: var(--space-2);
    flex-wrap: wrap;
  }

  .password-actions :global(button) {
    flex: 1;
    min-width: 70px;
  }

  .status-message {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: var(--space-3);
    padding: var(--space-4);
    border-radius: var(--radius-sm);
    font-size: var(--font-size-sm);
    text-align: center;
    font-weight: var(--font-weight-bold);
    text-transform: uppercase;
    letter-spacing: 1px;
    border: 3px solid;
    box-shadow: var(--shadow-pixel-sm);
  }

  .status-message.waiting {
    background: var(--color-bg-tertiary);
    border-color: var(--color-bg-elevated);
    color: var(--color-text-secondary);
  }

  .status-message.ready {
    background: rgba(34, 197, 94, 0.2);
    border-color: var(--color-success);
    color: var(--color-success);
  }

  .status-dot {
    width: 12px;
    height: 12px;
    border-radius: 0;
    box-shadow: var(--shadow-pixel-sm);
  }

  .status-message.waiting .status-dot {
    background: var(--color-text-muted);
    animation: pixelPulse 1.5s ease-in-out infinite;
  }

  .status-message.ready .status-dot {
    background: var(--color-success);
    animation: pixelBlink 0.8s step-end infinite;
  }

  @keyframes pixelPulse {
    0%, 100% {
      opacity: 1;
      transform: scale(1);
    }
    50% {
      opacity: 0.4;
      transform: scale(0.8);
    }
  }

  @keyframes pixelBlink {
    0%, 100% { opacity: 1; }
    50% { opacity: 0; }
  }

  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.6; }
  }

  /* Mobile adjustments */
  @media (max-width: 480px) {
    .logo {
      width: 200px;
    }

    .lobby-room {
      padding: var(--space-4);
    }
  }
</style>
