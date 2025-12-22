<!-- UsernameEditor Molecule - Inline editable username with discriminator -->
<script lang="ts">
  import { Button, Input } from '$lib/components/atoms';
  import { changeName } from '$lib/socketBridge';
  import { lastError } from '$lib/stores';

  interface Props {
    displayName: string;
    discriminator: string;
  }

  let { displayName, discriminator }: Props = $props();

  let isEditing = $state(false);
  let editValue = $state('');
  let error = $state<string | null>(null);
  let isSubmitting = $state(false);
  let pendingName = $state<string | null>(null);

  // Watch for successful name change (displayName prop changed)
  $effect(() => {
    if (pendingName && displayName === pendingName) {
      // Success - server confirmed the change
      isSubmitting = false;
      isEditing = false;
      editValue = '';
      pendingName = null;
      error = null;
    }
  });

  // Watch for server errors
  $effect(() => {
    if (isSubmitting && $lastError?.code === 'INVALID_NAME') {
      error = $lastError.message || 'Name wurde abgelehnt';
      isSubmitting = false;
      pendingName = null;
      // Clear the global error
      lastError.set(null);
    }
  });

  function startEditing() {
    editValue = displayName;
    error = null;
    isEditing = true;
  }

  function cancelEditing() {
    isEditing = false;
    editValue = '';
    error = null;
    isSubmitting = false;
    pendingName = null;
  }

  function handleSubmit() {
    const trimmed = editValue.trim();

    // Client-side validation
    if (!trimmed) {
      error = 'Name darf nicht leer sein';
      return;
    }

    if (trimmed.length > 20) {
      error = 'Max. 20 Zeichen';
      return;
    }

    // No change needed
    if (trimmed === displayName) {
      cancelEditing();
      return;
    }

    isSubmitting = true;
    error = null;
    pendingName = trimmed;

    // Send to server - wait for response via effects
    changeName(trimmed);
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSubmit();
    } else if (e.key === 'Escape') {
      cancelEditing();
    }
  }
</script>

<div class="username-editor">
  {#if isEditing}
    <div class="edit-form">
      <div class="input-wrapper">
        <Input
          bind:value={editValue}
          placeholder="Name"
          size="sm"
          maxlength={20}
          disabled={isSubmitting}
          onkeydown={handleKeydown}
        />
        <span class="discriminator">#{discriminator}</span>
      </div>
      {#if error}
        <span class="error">{error}</span>
      {/if}
      <div class="actions">
        <Button variant="primary" size="sm" onclick={handleSubmit} disabled={isSubmitting}>
          {isSubmitting ? '...' : 'OK'}
        </Button>
        <Button variant="text" size="sm" onclick={cancelEditing} disabled={isSubmitting}>
          Abbrechen
        </Button>
      </div>
    </div>
  {:else}
    <button class="display-name" onclick={startEditing} title="Name ändern">
      <span class="name">{displayName}</span><span class="disc">#{discriminator}</span>
      <svg class="edit-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
      </svg>
    </button>
  {/if}
</div>

<style>
  .username-editor {
    display: inline-flex;
    align-items: center;
  }

  .display-name {
    display: inline-flex;
    align-items: center;
    gap: var(--space-2);
    background: transparent;
    border: none;
    padding: var(--space-1) var(--space-2);
    border-radius: var(--radius-sm);
    cursor: pointer;
    color: var(--color-text-secondary);
    font-size: var(--font-size-sm);
    font-family: var(--font-family);
    transition: background var(--transition-fast), color var(--transition-fast);
  }

  .display-name:hover {
    background: var(--color-bg-tertiary);
    color: var(--color-text-primary);
  }

  .display-name .name {
    color: var(--color-text-primary);
  }

  .display-name .disc {
    color: var(--color-text-muted);
  }

  .edit-icon {
    width: 14px;
    height: 14px;
    opacity: 0;
    transition: opacity var(--transition-fast);
  }

  .display-name:hover .edit-icon {
    opacity: 0.7;
  }

  .edit-form {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
  }

  .input-wrapper {
    display: flex;
    align-items: center;
    gap: var(--space-1);
  }

  .input-wrapper :global(input) {
    width: 120px;
  }

  .discriminator {
    color: var(--color-text-muted);
    font-size: var(--font-size-sm);
    white-space: nowrap;
  }

  .actions {
    display: flex;
    gap: var(--space-2);
    align-items: center;
  }

  .error {
    color: var(--color-danger);
    font-size: var(--font-size-xs);
  }
</style>
