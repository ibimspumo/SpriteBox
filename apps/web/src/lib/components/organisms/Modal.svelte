<!-- Modal Organism - Pixel Art Style -->
<script lang="ts">
  import type { Snippet } from 'svelte';

  interface Props {
    show: boolean;
    title?: string;
    maxWidth?: string;
    onclose?: () => void;
    children: Snippet;
  }

  let {
    show,
    title,
    maxWidth = '320px',
    onclose,
    children
  }: Props = $props();

  function handleOverlayClick(e: MouseEvent) {
    if (e.target === e.currentTarget && onclose) {
      onclose();
    }
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape' && onclose) {
      onclose();
    }
  }
</script>

<svelte:window onkeydown={handleKeydown} />

{#if show}
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <div class="modal-overlay" onclick={handleOverlayClick} role="dialog" aria-modal="true" tabindex="-1">
    <div class="modal" style="max-width: {maxWidth}">
      {#if title}
        <div class="modal-header">
          <h3 class="modal-title">{title}</h3>
          {#if onclose}
            <button class="close-btn" onclick={onclose} aria-label="Close">
              <span class="close-icon">×</span>
            </button>
          {/if}
        </div>
      {/if}
      <div class="modal-content">
        {@render children()}
      </div>
    </div>
  </div>
{/if}

<style>
  .modal-overlay {
    position: fixed;
    inset: 0;
    background: var(--color-overlay);
    display: flex;
    align-items: center;
    justify-content: center;
    padding: var(--space-4);
    z-index: var(--z-modal);
    animation: fadeIn var(--transition-fast);
  }

  .modal {
    background: var(--color-bg-secondary);
    border: 3px solid var(--color-bg-tertiary);
    border-radius: var(--radius-md);
    padding: var(--space-5);
    width: 100%;
    display: flex;
    flex-direction: column;
    gap: var(--space-4);
    animation: slideUp var(--transition-normal);
    box-shadow: var(--shadow-pixel-lg);
  }

  .modal-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding-bottom: var(--space-3);
    border-bottom: 2px solid var(--color-bg-tertiary);
  }

  .modal-title {
    margin: 0;
    color: var(--color-brand);
    font-size: var(--font-size-lg);
    text-transform: uppercase;
    letter-spacing: 1px;
  }

  .close-btn {
    background: none;
    border: none;
    padding: var(--space-1);
    cursor: pointer;
    color: var(--color-text-muted);
    font-size: var(--font-size-xl);
    line-height: 1;
    transition: color var(--transition-fast);
  }

  .close-btn:hover {
    color: var(--color-text-primary);
  }

  .close-icon {
    display: block;
    font-weight: var(--font-weight-bold);
  }

  .modal-content {
    display: flex;
    flex-direction: column;
    gap: var(--space-4);
  }

  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }

  @keyframes slideUp {
    from {
      transform: translateY(20px);
      opacity: 0;
    }
    to {
      transform: translateY(0);
      opacity: 1;
    }
  }
</style>
