<!-- Lobby Feature Component - Pixel Art Style -->
<script lang="ts">
  import { lobby, passwordPrompt } from '$lib/stores';
  import { joinPrivateRoom } from '$lib/socketBridge';
  import { t } from '$lib/i18n';
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
    title={$t.passwordModal.title}
    onclose={handleCancelPasswordPrompt}
  >
    <div class="password-modal-content">
      <p class="modal-text">
        {$t.lobbyRoom.room} <strong>{$passwordPrompt.roomCode}</strong> {$t.passwordModal.roomRequiresPassword}
      </p>
      <PasswordInput
        bind:value={joinPassword}
        placeholder={$t.passwordInput.enterPassword}
        submitLabel={$t.common.join}
        error={$passwordPrompt.error}
        onsubmit={handleJoinWithPassword}
        oncancel={handleCancelPasswordPrompt}
      />
    </div>
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
    display: flex;
    justify-content: center;
    animation: fadeIn 0.3s ease-out;
  }

  .password-modal-content {
    display: flex;
    flex-direction: column;
    gap: var(--space-4);
  }

  .modal-text {
    margin: 0;
    text-align: center;
    color: var(--color-text-secondary);
    font-size: var(--font-size-sm);
  }

  .modal-text strong {
    color: var(--color-brand);
    letter-spacing: 2px;
  }

  @keyframes fadeIn {
    from {
      opacity: 0;
      transform: translateY(10px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
</style>
