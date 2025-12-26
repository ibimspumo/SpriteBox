<!-- LobbyRoom - In-lobby view with players and host controls - Pixel Art Style -->
<script lang="ts">
  import { lobby, currentUser, currentGameModeInfo } from '$lib/stores';
  import { leaveLobby, hostStartGame, hostChangePassword } from '$lib/socketBridge';
  import { getPrivateRoomUrl } from '$lib/modeRoutes';
  import { Button, Input } from '../../atoms';
  import { PlayerList } from '../../organisms';
  import { Timer } from '../../utility';
  import { t } from '$lib/i18n';

  let showPasswordSettings = $state(false);
  let newPassword = $state('');
  let showCopiedToast = $state(false);

  // Get minimum players for current game mode (use privateMin for private rooms if available)
  let minPlayers = $derived(
    $lobby.type === 'private' && $currentGameModeInfo.players.privateMin
      ? $currentGameModeInfo.players.privateMin
      : $currentGameModeInfo.players.min
  );
  let playersNeeded = $derived(Math.max(0, minPlayers - $lobby.players.length));

  // Zombie Pixel mode fills with bots (100 max players)
  let isZombiePixel = $derived($lobby.gameMode === 'zombie-pixel');
  let botsCount = $derived(isZombiePixel ? 100 - $lobby.players.length : 0);

  function getRoomShareUrl(): string {
    const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
    if ($lobby.code && $lobby.gameMode) {
      return `${baseUrl}${getPrivateRoomUrl($lobby.gameMode, $lobby.code)}`;
    }
    return baseUrl;
  }

  async function handleShareRoom() {
    const shareUrl = getRoomShareUrl();
    const shareData = {
      title: 'SpriteBox',
      text: `Join my SpriteBox room: ${$lobby.code}`,
      url: shareUrl
    };

    // Try Web Share API first (mobile)
    if (navigator.share && navigator.canShare?.(shareData)) {
      try {
        await navigator.share(shareData);
        return;
      } catch (err) {
        if ((err as Error).name === 'AbortError') return;
      }
    }

    // Fallback: Copy to clipboard
    try {
      await navigator.clipboard.writeText(shareUrl);
      showCopiedToast = true;
      setTimeout(() => { showCopiedToast = false; }, 2000);
    } catch {
      prompt('Copy this link:', shareUrl);
    }
  }

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
  <!-- Copied Toast -->
  {#if showCopiedToast}
    <div class="copied-toast">{$t.common.linkCopied}</div>
  {/if}

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
          <span class="room-label">{$t.lobbyRoom.room}</span>
          <span class="room-code">{$lobby.code}</span>
          {#if $lobby.hasPassword}
            <span class="lock-badge" title={$t.lobbyRoom.passwordProtected}>
              <img src="/icons/lock.svg" alt="Locked" class="lock-icon" />
            </span>
          {/if}
        </div>
        <button class="share-room-btn" onclick={handleShareRoom} title={$t.lobbyRoom.inviteFriends} aria-label={$t.accessibility.shareRoom}>
          <img src="/icons/link.svg" alt="" class="share-room-icon" />
        </button>
      {:else}
        <div class="room-code-display">
          <span class="room-label">{$t.lobbyRoom.publicLobby}</span>
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
      <span>{$t.lobbyRoom.spectatorNotice}</span>
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
        disabled={$lobby.players.length < minPlayers}
      >
        {$t.lobbyRoom.startGame}
      </Button>

      {#if playersNeeded > 0}
        <p class="waiting-info">
          {playersNeeded === 1
            ? $t.lobbyRoom.needMorePlayer.replace('{{count}}', String(playersNeeded))
            : $t.lobbyRoom.needMorePlayers.replace('{{count}}', String(playersNeeded))
          }
        </p>
      {/if}

      <!-- Password Settings -->
      {#if showPasswordSettings}
        <div class="password-panel">
          <Input
            type="password"
            bind:value={newPassword}
            placeholder={$t.lobbyRoom.newPasswordPlaceholder}
            size="sm"
            minlength={4}
            maxlength={64}
            fullWidth
          />
          <div class="password-actions">
            <Button size="sm" variant="action" onclick={handleSetPassword} disabled={newPassword.length < 4}>
              {$lobby.hasPassword ? $t.common.change : $t.common.set}
            </Button>
            {#if $lobby.hasPassword}
              <Button size="sm" variant="danger" onclick={handleRemovePassword}>
                {$t.common.remove}
              </Button>
            {/if}
            <Button variant="ghost" size="sm" onclick={() => { showPasswordSettings = false; newPassword = ''; }}>
              {$t.common.cancel}
            </Button>
          </div>
        </div>
      {:else}
        <Button variant="ghost" size="sm" fullWidth onclick={() => showPasswordSettings = true}>
          {$lobby.hasPassword ? $t.lobbyRoom.changePassword : $t.lobbyRoom.setPassword}
        </Button>
      {/if}

    {:else if $lobby.type === 'public'}
      <!-- Public Lobby Status -->
      {#if isZombiePixel}
        <!-- Zombie Pixel shows bot fill message -->
        <div class="status-message ready">
          <span class="status-dot"></span>
          {$t.zombiePixel.lobby.fillingWithBots.replace('{count}', String(botsCount))}
        </div>
      {:else if playersNeeded > 0}
        <div class="status-message waiting">
          <span class="status-dot"></span>
          {playersNeeded === 1
            ? $t.lobbyRoom.waitingForPlayer.replace('{{count}}', String(playersNeeded))
            : $t.lobbyRoom.waitingForPlayers.replace('{{count}}', String(playersNeeded))
          }
        </div>
      {:else}
        <div class="status-message ready">
          <span class="status-dot"></span>
          {$t.lobbyRoom.gameStartingSoon}
        </div>
      {/if}
    {/if}

    <!-- Leave Button -->
    <Button variant="ghost" fullWidth onclick={leaveLobby}>
      {$t.lobbyRoom.leaveLobby}
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

  .share-room-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 44px;
    height: 44px;
    padding: 0;
    background: var(--color-bg-tertiary);
    border: 3px solid var(--color-accent);
    border-radius: var(--radius-sm);
    cursor: pointer;
    transition: var(--transition-fast);
    box-shadow: var(--shadow-pixel-sm);
  }

  .share-room-btn:hover {
    background: var(--color-accent);
    transform: translateY(-2px);
  }

  .share-room-btn:active {
    transform: translateY(0);
    box-shadow: none;
  }

  .share-room-icon {
    width: 20px;
    height: 20px;
    filter: brightness(0) invert(1);
  }

  .copied-toast {
    position: fixed;
    top: var(--space-6);
    left: 50%;
    transform: translateX(-50%);
    padding: var(--space-3) var(--space-5);
    background: var(--color-success);
    color: white;
    font-size: var(--font-size-sm);
    font-weight: var(--font-weight-bold);
    text-transform: uppercase;
    letter-spacing: 1px;
    border: 3px solid rgba(255, 255, 255, 0.3);
    border-radius: var(--radius-sm);
    box-shadow: var(--shadow-pixel);
    z-index: var(--z-notification);
    animation: toastIn 0.2s ease-out;
  }

  @keyframes toastIn {
    from {
      opacity: 0;
      transform: translateX(-50%) translateY(-10px);
    }
    to {
      opacity: 1;
      transform: translateX(-50%) translateY(0);
    }
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
