<!-- apps/web/src/lib/components/Lobby.svelte -->
<script lang="ts">
  import { lobby, currentUser } from '$lib/stores';
  import { joinPublicGame, createPrivateRoom, joinPrivateRoom, leaveLobby, hostStartGame } from '$lib/socketBridge';
  import Timer from './Timer.svelte';

  let roomCode = $state('');
  let showJoinInput = $state(false);
</script>

<div class="lobby">
  {#if !$lobby.instanceId}
    <!-- Not in a lobby -->
    <div class="menu">
      <h2>Play</h2>

      <button class="btn primary" onclick={joinPublicGame}>
        Public Game
      </button>

      <button class="btn secondary" onclick={createPrivateRoom}>
        Create Private Room
      </button>

      <div class="divider">or</div>

      {#if showJoinInput}
        <div class="join-input">
          <input
            type="text"
            bind:value={roomCode}
            placeholder="Enter code"
            maxlength={4}
          />
          <button class="btn" onclick={() => joinPrivateRoom(roomCode.toUpperCase())}>
            Join
          </button>
        </div>
      {:else}
        <button class="btn text" onclick={() => showJoinInput = true}>
          Enter Room Code
        </button>
      {/if}
    </div>
  {:else}
    <!-- In a lobby -->
    <div class="in-lobby">
      <div class="lobby-header">
        <h2>
          {#if $lobby.type === 'private'}
            Room: {$lobby.code}
          {:else}
            Public Lobby
          {/if}
        </h2>
        <Timer />
      </div>

      <div class="players">
        <h3>{$lobby.players.length} Players</h3>
        <ul>
          {#each $lobby.players as player}
            <li class:you={player.fullName === $currentUser?.fullName}>
              {player.fullName}
              {#if player.fullName === $currentUser?.fullName}
                <span class="tag">You</span>
              {/if}
            </li>
          {/each}
        </ul>
      </div>

      {#if $lobby.isSpectator}
        <p class="spectator-notice">You are a spectator for this round</p>
      {/if}

      <div class="actions">
        {#if $lobby.isHost && $lobby.type === 'private'}
          <button
            class="btn primary"
            onclick={hostStartGame}
            disabled={$lobby.players.length < 5}
          >
            Start Game
          </button>
        {:else if $lobby.type === 'public'}
          {#if $lobby.players.length < 5}
            <p class="info">Waiting for {5 - $lobby.players.length} more players...</p>
          {:else}
            <p class="info ready">Game starting soon...</p>
          {/if}
        {/if}

        <button class="btn text" onclick={leaveLobby}>
          Leave Lobby
        </button>
      </div>
    </div>
  {/if}
</div>

<style>
  .lobby {
    width: 100%;
    max-width: 400px;
    margin: 0 auto;
  }

  .menu, .in-lobby {
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  h2 {
    text-align: center;
    color: #e94560;
  }

  .btn {
    padding: 12px 24px;
    border: none;
    border-radius: 8px;
    font-size: 1rem;
    cursor: pointer;
    transition: transform 0.1s, opacity 0.1s;
  }

  .btn:hover:not(:disabled) {
    transform: translateY(-2px);
  }

  .btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .btn.primary {
    background: #e94560;
    color: white;
  }

  .btn.secondary {
    background: #0f3460;
    color: white;
  }

  .btn.text {
    background: transparent;
    color: #aaa;
    text-decoration: underline;
  }

  .divider {
    text-align: center;
    color: #666;
  }

  .join-input {
    display: flex;
    gap: 8px;
  }

  .join-input input {
    flex: 1;
    padding: 12px;
    border: 2px solid #0f3460;
    border-radius: 8px;
    background: #16213e;
    color: white;
    font-size: 1.25rem;
    text-transform: uppercase;
    text-align: center;
    letter-spacing: 4px;
  }

  .lobby-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    flex-wrap: wrap;
    gap: 12px;
  }

  .players ul {
    list-style: none;
    padding: 0;
    margin: 0;
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .players li {
    padding: 8px 12px;
    background: #16213e;
    border-radius: 4px;
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .players li.you {
    background: #0f3460;
  }

  .tag {
    font-size: 0.75rem;
    padding: 2px 6px;
    background: #e94560;
    border-radius: 4px;
  }

  .spectator-notice {
    padding: 12px;
    background: #3b2d00;
    border: 1px solid #fbbf24;
    border-radius: 8px;
    text-align: center;
  }

  .info {
    text-align: center;
    color: #aaa;
  }

  .info.ready {
    color: #4ade80;
    font-weight: bold;
  }

  .actions {
    display: flex;
    flex-direction: column;
    gap: 8px;
    margin-top: 16px;
  }
</style>
