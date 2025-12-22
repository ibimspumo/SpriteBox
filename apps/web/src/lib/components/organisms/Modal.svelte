<!-- Modal Organism -->
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
        <h3 class="modal-title">{title}</h3>
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
    z-index: var(--z-modal);
    animation: fadeIn var(--transition-fast);
  }

  .modal {
    background: var(--color-bg-primary);
    padding: var(--space-6);
    border-radius: var(--radius-lg);
    width: 90%;
    display: flex;
    flex-direction: column;
    gap: var(--space-4);
    animation: scaleIn var(--transition-normal);
  }

  .modal-title {
    margin: 0;
    color: var(--color-accent);
    text-align: center;
    font-size: var(--font-size-lg);
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

  @keyframes scaleIn {
    from { transform: scale(0.95); opacity: 0; }
    to { transform: scale(1); opacity: 1; }
  }
</style>
