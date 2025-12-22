<!-- LobbyRoom - In-lobby view with players and host controls -->
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

<div class="in-lobby">
  <div class="lobby-header">
    <h2>
      {#if $lobby.type === 'private'}
        Room: {$lobby.code}
        {#if $lobby.hasPassword}
          <span class="lock-icon" title="Password protected">🔒</span>
        {/if}
      {:else}
        Public Lobby
      {/if}
    </h2>
    <Timer />
  </div>

  <PlayerList
    players={$lobby.players}
    currentPlayerName={$currentUser?.fullName}
  />

  {#if $lobby.isSpectator}
    <div class="spectator-notice">You are a spectator for this round</div>
  {/if}

  <div class="actions">
    {#if $lobby.isHost && $lobby.type === 'private'}
      <Button
        variant="primary"
        fullWidth
        onclick={hostStartGame}
        disabled={$lobby.players.length < 5}
      >
        Start Game
      </Button>

      {#if showPasswordSettings}
        <div class="password-settings">
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
            <Button size="sm" onclick={handleSetPassword} disabled={newPassword.length < 4}>
              {$lobby.hasPassword ? 'Change' : 'Set'} Password
            </Button>
            {#if $lobby.hasPassword}
              <Button size="sm" variant="danger" onclick={handleRemovePassword}>
                Remove Password
              </Button>
            {/if}
            <Button variant="text" size="sm" onclick={() => { showPasswordSettings = false; newPassword = ''; }}>
              Cancel
            </Button>
          </div>
        </div>
      {:else}
        <Button variant="text" size="sm" fullWidth onclick={() => showPasswordSettings = true}>
          {$lobby.hasPassword ? '🔒 Change Password' : '🔓 Set Password'}
        </Button>
      {/if}
    {:else if $lobby.type === 'public'}
      {#if $lobby.players.length < 5}
        <p class="info">Waiting for {5 - $lobby.players.length} more players...</p>
      {:else}
        <p class="info ready">Game starting soon...</p>
      {/if}
    {/if}

    <Button variant="text" fullWidth onclick={leaveLobby}>
      Leave Lobby
    </Button>
  </div>
</div>

<style>
  .in-lobby {
    display: flex;
    flex-direction: column;
    gap: var(--space-4);
  }

  .lobby-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    flex-wrap: wrap;
    gap: var(--space-3);
  }

  .lobby-header h2 {
    margin: 0;
    color: var(--color-accent);
  }

  .lock-icon {
    font-size: var(--font-size-sm);
    margin-left: var(--space-1);
  }

  .spectator-notice {
    padding: var(--space-3);
    background: #3b2d00;
    border: 1px solid var(--color-warning);
    border-radius: var(--radius-md);
    text-align: center;
  }

  .info {
    text-align: center;
    color: var(--color-text-secondary);
    margin: 0;
  }

  .info.ready {
    color: var(--color-success);
    font-weight: var(--font-weight-bold);
  }

  .actions {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
    margin-top: var(--space-4);
  }

  .password-settings {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
    padding: var(--space-3);
    background: var(--color-bg-secondary);
    border-radius: var(--radius-md);
  }

  .password-actions {
    display: flex;
    gap: var(--space-2);
    flex-wrap: wrap;
  }
</style>
