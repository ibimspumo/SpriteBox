<!-- UsernameEditor Molecule - Inline editable username with discriminator -->
<script lang="ts">
  import { Button, Input, Icon } from '$lib/components/atoms';
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
      error = $lastError.message || 'Name rejected';
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
      error = 'Name cannot be empty';
      return;
    }

    if (trimmed.length > 20) {
      error = 'Max. 20 characters';
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
      <div class="input-row">
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
        <Button variant="ghost" size="sm" onclick={cancelEditing} disabled={isSubmitting}>
          Cancel
        </Button>
      </div>
    </div>
  {:else}
    <button class="display-name" onclick={startEditing} title="Click to change name">
      <span class="name">{displayName}</span><span class="disc">#{discriminator}</span>
      <span class="edit-icon">
        <Icon name="edit" size="sm" />
      </span>
    </button>
  {/if}
</div>

<style>
  .username-editor {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 100%;
  }

  .display-name {
    display: inline-flex;
    align-items: center;
    gap: var(--space-2);
    background: transparent;
    border: none;
    padding: var(--space-2) var(--space-3);
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
    display: inline-flex;
    opacity: 0.4;
    transition: opacity var(--transition-fast);
  }

  .display-name:hover .edit-icon {
    opacity: 1;
  }

  .edit-form {
    display: flex;
    flex-direction: column;
    gap: var(--space-3);
    width: 100%;
  }

  .input-row {
    display: flex;
    align-items: center;
    gap: var(--space-2);
  }

  .input-row :global(input) {
    flex: 1;
    min-width: 0;
  }

  .discriminator {
    color: var(--color-text-muted);
    font-size: var(--font-size-sm);
    white-space: nowrap;
    flex-shrink: 0;
  }

  .actions {
    display: flex;
    gap: var(--space-2);
    align-items: center;
  }

  .actions :global(button) {
    flex: 1;
  }

  .error {
    color: var(--color-danger);
    font-size: var(--font-size-xs);
    text-align: center;
  }
</style>
