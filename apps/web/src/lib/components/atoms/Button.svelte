<!-- Button Atom -->
<script lang="ts">
  import type { Snippet } from 'svelte';

  interface Props {
    variant?: 'primary' | 'secondary' | 'text' | 'danger';
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
  class="btn {variant} {size}"
  class:full-width={fullWidth}
  {onclick}
>
  {@render children()}
</button>

<style>
  .btn {
    border: none;
    border-radius: var(--radius-md);
    font-family: var(--font-family);
    cursor: pointer;
    transition: transform var(--transition-fast), opacity var(--transition-fast);
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: var(--space-2);
  }

  .btn:hover:not(:disabled) {
    transform: translateY(-2px);
  }

  .btn:active:not(:disabled) {
    transform: translateY(0);
  }

  .btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  /* Sizes */
  .btn.sm {
    padding: var(--space-2) var(--space-4);
    font-size: var(--font-size-sm);
  }

  .btn.md {
    padding: var(--space-3) var(--space-6);
    font-size: var(--font-size-md);
  }

  .btn.lg {
    padding: var(--space-4) var(--space-8);
    font-size: var(--font-size-lg);
  }

  /* Variants */
  .btn.primary {
    background: var(--color-accent);
    color: white;
  }

  .btn.primary:hover:not(:disabled) {
    background: var(--color-accent-hover);
  }

  .btn.secondary {
    background: var(--color-bg-tertiary);
    color: white;
  }

  .btn.secondary:hover:not(:disabled) {
    background: #1a4a80;
  }

  .btn.text {
    background: transparent;
    color: var(--color-text-secondary);
    text-decoration: underline;
  }

  .btn.text:hover:not(:disabled) {
    color: var(--color-text-primary);
    transform: none;
  }

  .btn.danger {
    background: var(--color-danger);
    color: white;
  }

  .btn.danger:hover:not(:disabled) {
    background: #ef4444;
  }

  /* Full width */
  .full-width {
    width: 100%;
  }
</style>
