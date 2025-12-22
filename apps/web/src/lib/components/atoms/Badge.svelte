<!-- Badge Atom -->
<script lang="ts">
  interface Props {
    variant?: 'default' | 'success' | 'warning' | 'error' | 'accent';
    size?: 'sm' | 'md';
    text: string;
  }

  let {
    variant = 'default',
    size = 'sm',
    text
  }: Props = $props();
</script>

<span class="badge {variant} {size}">
  {text}
</span>

<style>
  .badge {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border-radius: var(--radius-sm);
    font-weight: var(--font-weight-medium);
    white-space: nowrap;
  }

  /* Sizes */
  .badge.sm {
    padding: 2px var(--space-2);
    font-size: var(--font-size-xs);
  }

  .badge.md {
    padding: var(--space-1) var(--space-3);
    font-size: var(--font-size-sm);
  }

  /* Variants */
  .badge.default {
    background: var(--color-bg-tertiary);
    color: var(--color-text-secondary);
  }

  .badge.success {
    background: rgba(74, 222, 128, 0.2);
    color: var(--color-success);
  }

  .badge.warning {
    background: rgba(251, 191, 36, 0.2);
    color: var(--color-warning);
  }

  .badge.error {
    background: rgba(239, 68, 68, 0.2);
    color: var(--color-error);
  }

  .badge.accent {
    background: var(--color-accent);
    color: white;
  }
</style>
