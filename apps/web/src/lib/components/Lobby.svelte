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
    <!-- Nicht in einer Lobby -->
    <div class="menu">
      <h2>Spielen</h2>

      <button class="btn primary" onclick={joinPublicGame}>
        Offentliches Spiel
      </button>

      <button class="btn secondary" onclick={createPrivateRoom}>
        Privaten Raum erstellen
      </button>

      <div class="divider">oder</div>

      {#if showJoinInput}
        <div class="join-input">
          <input
            type="text"
            bind:value={roomCode}
            placeholder="Code eingeben"
            maxlength={4}
          />
          <button class="btn" onclick={() => joinPrivateRoom(roomCode.toUpperCase())}>
            Beitreten
          </button>
        </div>
      {:else}
        <button class="btn text" onclick={() => showJoinInput = true}>
          Raum-Code eingeben
        </button>
      {/if}
    </div>
  {:else}
    <!-- In einer Lobby -->
    <div class="in-lobby">
      <div class="lobby-header">
        <h2>
          {#if $lobby.type === 'private'}
            Raum: {$lobby.code}
          {:else}
            Offentliche Lobby
          {/if}
        </h2>
        <Timer />
      </div>

      <div class="players">
        <h3>{$lobby.players.length} Spieler</h3>
        <ul>
          {#each $lobby.players as player}
            <li class:you={player.fullName === $currentUser?.fullName}>
              {player.fullName}
              {#if player.fullName === $currentUser?.fullName}
                <span class="tag">Du</span>
              {/if}
            </li>
          {/each}
        </ul>
      </div>

      {#if $lobby.isSpectator}
        <p class="spectator-notice">Du bist Zuschauer fur diese Runde</p>
      {/if}

      <div class="actions">
        {#if $lobby.isHost && $lobby.type === 'private'}
          <button
            class="btn primary"
            onclick={hostStartGame}
            disabled={$lobby.players.length < 5}
          >
            Spiel starten
          </button>
        {:else if $lobby.type === 'public'}
          <p class="info">Warte auf {5 - $lobby.players.length} weitere Spieler...</p>
        {/if}

        <button class="btn text" onclick={leaveLobby}>
          Lobby verlassen
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

  .actions {
    display: flex;
    flex-direction: column;
    gap: 8px;
    margin-top: 16px;
  }
</style>
