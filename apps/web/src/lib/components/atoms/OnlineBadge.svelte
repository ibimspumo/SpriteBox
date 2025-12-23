<!-- OnlineBadge Atom - Shows player count with pulsing dot -->
<script lang="ts">
  import { t } from '$lib/i18n';

  interface Props {
    count: number;
    size?: 'sm' | 'md';
    label?: string;
  }

  let {
    count,
    size = 'md',
    label
  }: Props = $props();

  // Use provided label or default to translation
  let displayLabel = $derived(label ?? $t.modeSelection.playersActive);
</script>

<div class="online-badge" class:sm={size === 'sm'}>
  <span class="online-dot"></span>
  <span class="online-text">{count} {displayLabel}</span>
</div>

<style>
  .online-badge {
    display: inline-flex;
    align-items: center;
    gap: var(--space-2);
    padding: var(--space-2) var(--space-4);
    background: var(--color-bg-tertiary);
    border-radius: var(--radius-full);
    font-size: var(--font-size-sm);
    color: var(--color-text-secondary);
  }

  .online-badge.sm {
    padding: var(--space-1) var(--space-3);
    font-size: var(--font-size-xs);
    color: var(--color-text-muted);
  }

  .online-dot {
    width: 8px;
    height: 8px;
    background: var(--color-success);
    border-radius: var(--radius-full);
    animation: pulse 2s ease-in-out infinite;
  }

  .online-badge.sm .online-dot {
    width: 6px;
    height: 6px;
  }

  .online-text {
    white-space: nowrap;
  }

  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.5; }
  }
</style>
