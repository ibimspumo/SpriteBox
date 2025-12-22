<!-- Lobby Feature Component -->
<script lang="ts">
  import { lobby, passwordPrompt } from '$lib/stores';
  import { joinPrivateRoom } from '$lib/socketBridge';
  import { Modal } from '../../organisms';
  import { PasswordInput } from '../../molecules';
  import LobbyMenu from './LobbyMenu.svelte';
  import LobbyRoom from './LobbyRoom.svelte';

  let joinPassword = $state('');

  function handleJoinWithPassword() {
    if ($passwordPrompt.roomCode) {
      joinPrivateRoom($passwordPrompt.roomCode, joinPassword);
      joinPassword = '';
    }
  }

  function handleCancelPasswordPrompt() {
    passwordPrompt.set({ show: false, roomCode: null, error: null });
    joinPassword = '';
  }
</script>

<div class="lobby">
  <!-- Password prompt modal -->
  <Modal
    show={$passwordPrompt.show}
    title="Password Required"
    onclose={handleCancelPasswordPrompt}
  >
    <p class="modal-text">
      Room <strong>{$passwordPrompt.roomCode}</strong> is password protected.
    </p>
    <PasswordInput
      bind:value={joinPassword}
      placeholder="Enter password"
      submitLabel="Join"
      error={$passwordPrompt.error}
      onsubmit={handleJoinWithPassword}
      oncancel={handleCancelPasswordPrompt}
    />
  </Modal>

  {#if !$lobby.instanceId}
    <LobbyMenu />
  {:else}
    <LobbyRoom />
  {/if}
</div>

<style>
  .lobby {
    width: 100%;
    max-width: 400px;
    margin: 0 auto;
  }

  .modal-text {
    margin: 0;
    text-align: center;
    color: var(--color-text-secondary);
  }

  .modal-text strong {
    color: var(--color-text-primary);
  }
</style>
