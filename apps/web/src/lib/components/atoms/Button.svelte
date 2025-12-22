<!-- Button Atom - Pixel Art Style -->
<script lang="ts">
  import type { Snippet } from 'svelte';

  interface Props {
    variant?: 'primary' | 'secondary' | 'action' | 'danger' | 'ghost';
    size?: 'sm' | 'md' | 'lg';
    disabled?: boolean;
    fullWidth?: boolean;
    type?: 'button' | 'submit' | 'reset';
    onclick?: (e: MouseEvent) => void;
    children: Snippet;
  }

  let {
    variant = 'primary',
    size = 'md',
    disabled = false,
    fullWidth = false,
    type = 'button',
    onclick,
    children
  }: Props = $props();
</script>

<button
  {type}
  {disabled}
  class="pixel-btn {variant} {size}"
  class:full-width={fullWidth}
  {onclick}
>
  <span class="btn-content">
    {@render children()}
  </span>
</button>

<style>
  .pixel-btn {
    position: relative;
    border: none;
    background: none;
    font-family: var(--font-family);
    font-weight: var(--font-weight-bold);
    text-transform: uppercase;
    letter-spacing: 1px;
    cursor: pointer;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    transition: transform var(--transition-fast), filter var(--transition-fast);
  }

  .btn-content {
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: var(--space-2);
    width: 100%;
    border-radius: var(--radius-sm);
  }

  /* Pixel border effect using box-shadow */
  .pixel-btn::before {
    content: '';
    position: absolute;
    inset: 0;
    border-radius: var(--radius-sm);
    pointer-events: none;
  }

  .pixel-btn:hover:not(:disabled) {
    transform: translateY(-2px);
    filter: brightness(1.1);
  }

  .pixel-btn:active:not(:disabled) {
    transform: translateY(1px);
  }

  .pixel-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    filter: grayscale(0.5);
  }

  /* ===== Sizes ===== */
  .pixel-btn.sm {
    font-size: var(--font-size-sm);
  }

  .pixel-btn.sm .btn-content {
    padding: var(--space-2) var(--space-4);
  }

  .pixel-btn.md {
    font-size: var(--font-size-md);
  }

  .pixel-btn.md .btn-content {
    padding: var(--space-3) var(--space-6);
  }

  .pixel-btn.lg {
    font-size: var(--font-size-lg);
  }

  .pixel-btn.lg .btn-content {
    padding: var(--space-4) var(--space-8);
  }

  /* ===== Variants ===== */

  /* Primary - Green (Play Now, Submit) */
  .pixel-btn.primary .btn-content {
    background: var(--color-btn-primary);
    color: var(--color-btn-primary-text);
    border: 3px solid;
    border-color: #4ade80 #166534 #166534 #4ade80;
    box-shadow:
      inset 2px 2px 0 rgba(255, 255, 255, 0.2),
      inset -2px -2px 0 rgba(0, 0, 0, 0.2),
      4px 4px 0 rgba(0, 0, 0, 0.3);
  }

  .pixel-btn.primary:hover:not(:disabled) .btn-content {
    background: var(--color-btn-primary-hover);
  }

  .pixel-btn.primary:active:not(:disabled) .btn-content {
    box-shadow:
      inset 2px 2px 0 rgba(0, 0, 0, 0.2),
      inset -2px -2px 0 rgba(255, 255, 255, 0.1),
      2px 2px 0 rgba(0, 0, 0, 0.3);
  }

  /* Secondary - Gray (Private Room) */
  .pixel-btn.secondary .btn-content {
    background: var(--color-btn-secondary);
    color: var(--color-btn-secondary-text);
    border: 3px solid;
    border-color: #9ca3af #374151 #374151 #9ca3af;
    box-shadow:
      inset 2px 2px 0 rgba(255, 255, 255, 0.15),
      inset -2px -2px 0 rgba(0, 0, 0, 0.2),
      4px 4px 0 rgba(0, 0, 0, 0.3);
  }

  .pixel-btn.secondary:hover:not(:disabled) .btn-content {
    background: var(--color-btn-secondary-hover);
  }

  .pixel-btn.secondary:active:not(:disabled) .btn-content {
    box-shadow:
      inset 2px 2px 0 rgba(0, 0, 0, 0.2),
      inset -2px -2px 0 rgba(255, 255, 255, 0.1),
      2px 2px 0 rgba(0, 0, 0, 0.3);
  }

  /* Action - Blue (Vote, Join) */
  .pixel-btn.action .btn-content {
    background: var(--color-btn-action);
    color: var(--color-btn-action-text);
    border: 3px solid;
    border-color: #60a5fa #1d4ed8 #1d4ed8 #60a5fa;
    box-shadow:
      inset 2px 2px 0 rgba(255, 255, 255, 0.2),
      inset -2px -2px 0 rgba(0, 0, 0, 0.2),
      4px 4px 0 rgba(0, 0, 0, 0.3);
  }

  .pixel-btn.action:hover:not(:disabled) .btn-content {
    background: var(--color-btn-action-hover);
  }

  .pixel-btn.action:active:not(:disabled) .btn-content {
    box-shadow:
      inset 2px 2px 0 rgba(0, 0, 0, 0.2),
      inset -2px -2px 0 rgba(255, 255, 255, 0.1),
      2px 2px 0 rgba(0, 0, 0, 0.3);
  }

  /* Danger - Red */
  .pixel-btn.danger .btn-content {
    background: var(--color-btn-danger);
    color: var(--color-btn-danger-text);
    border: 3px solid;
    border-color: #f87171 #991b1b #991b1b #f87171;
    box-shadow:
      inset 2px 2px 0 rgba(255, 255, 255, 0.2),
      inset -2px -2px 0 rgba(0, 0, 0, 0.2),
      4px 4px 0 rgba(0, 0, 0, 0.3);
  }

  .pixel-btn.danger:hover:not(:disabled) .btn-content {
    background: var(--color-btn-danger-hover);
  }

  .pixel-btn.danger:active:not(:disabled) .btn-content {
    box-shadow:
      inset 2px 2px 0 rgba(0, 0, 0, 0.2),
      inset -2px -2px 0 rgba(255, 255, 255, 0.1),
      2px 2px 0 rgba(0, 0, 0, 0.3);
  }

  /* Ghost - Transparent/Text style */
  .pixel-btn.ghost .btn-content {
    background: transparent;
    color: var(--color-text-secondary);
    border: 2px solid var(--color-border-strong);
    box-shadow: none;
  }

  .pixel-btn.ghost:hover:not(:disabled) .btn-content {
    color: var(--color-text-primary);
    background: var(--color-bg-tertiary);
    border-color: var(--color-accent);
  }

  .pixel-btn.ghost:active:not(:disabled) .btn-content {
    background: var(--color-bg-elevated);
  }

  /* Full width */
  .full-width {
    width: 100%;
  }
</style>
