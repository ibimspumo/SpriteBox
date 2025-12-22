<!-- LobbyMenu - Main menu for joining/creating games -->
<script lang="ts">
  import { Button, Input } from '../../atoms';
  import { joinPublicGame, createPrivateRoom, joinPrivateRoom } from '$lib/socketBridge';

  let roomCode = $state('');
  let showJoinInput = $state(false);
  let showCreateWithPassword = $state(false);
  let createPassword = $state('');

  function handleCreateRoom() {
    if (showCreateWithPassword && createPassword) {
      createPrivateRoom(createPassword);
    } else {
      createPrivateRoom();
    }
    showCreateWithPassword = false;
    createPassword = '';
  }

  function handleJoinRoom() {
    joinPrivateRoom(roomCode.toUpperCase());
    roomCode = '';
  }
</script>

<div class="menu">
  <h2>Play</h2>

  <Button variant="primary" fullWidth onclick={joinPublicGame}>
    Public Game
  </Button>

  {#if showCreateWithPassword}
    <div class="create-with-password">
      <Input
        type="password"
        bind:value={createPassword}
        placeholder="Room password (optional)"
        minlength={4}
        maxlength={64}
        fullWidth
      />
      <div class="create-actions">
        <Button variant="secondary" onclick={handleCreateRoom}>
          Create Room
        </Button>
        <Button variant="text" size="sm" onclick={() => { showCreateWithPassword = false; createPassword = ''; }}>
          Cancel
        </Button>
      </div>
    </div>
  {:else}
    <Button variant="secondary" fullWidth onclick={() => showCreateWithPassword = true}>
      Create Private Room
    </Button>
  {/if}

  <div class="divider">or</div>

  {#if showJoinInput}
    <div class="join-input">
      <Input
        bind:value={roomCode}
        placeholder="Code"
        maxlength={4}
        uppercase
        centered
        size="lg"
      />
      <Button onclick={handleJoinRoom} disabled={roomCode.length !== 4}>
        Join
      </Button>
    </div>
  {:else}
    <Button variant="text" fullWidth onclick={() => showJoinInput = true}>
      Enter Room Code
    </Button>
  {/if}
</div>

<style>
  .menu {
    display: flex;
    flex-direction: column;
    gap: var(--space-4);
  }

  h2 {
    text-align: center;
    color: var(--color-accent);
    margin: 0;
  }

  .divider {
    text-align: center;
    color: var(--color-text-muted);
  }

  .join-input {
    display: flex;
    gap: var(--space-2);
  }

  .join-input :global(input) {
    flex: 1;
  }

  .create-with-password {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
  }

  .create-actions {
    display: flex;
    gap: var(--space-2);
  }

  .create-actions :global(button) {
    flex: 1;
  }
</style>
