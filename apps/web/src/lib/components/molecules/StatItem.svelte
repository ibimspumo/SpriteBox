<!-- StatItem Molecule -->
<script lang="ts">
  interface Props {
    label: string;
    value: string | number;
    variant?: 'default' | 'highlight' | 'muted';
    size?: 'sm' | 'md';
    inline?: boolean;
  }

  let {
    label,
    value,
    variant = 'default',
    size = 'md',
    inline = false
  }: Props = $props();
</script>

<div class="stat-item {variant} {size}" class:inline>
  <span class="label">{label}</span>
  <span class="value">{value}</span>
</div>

<style>
  .stat-item {
    display: flex;
    flex-direction: column;
    gap: var(--space-1);
  }

  .stat-item.inline {
    flex-direction: row;
    justify-content: space-between;
    align-items: center;
    gap: var(--space-3);
  }

  .label {
    color: var(--color-text-secondary);
    font-weight: var(--font-weight-normal);
  }

  .value {
    font-weight: var(--font-weight-semibold);
    color: var(--color-text-primary);
  }

  /* Sizes */
  .stat-item.sm .label {
    font-size: var(--font-size-xs);
  }

  .stat-item.sm .value {
    font-size: var(--font-size-sm);
  }

  .stat-item.md .label {
    font-size: var(--font-size-sm);
  }

  .stat-item.md .value {
    font-size: var(--font-size-md);
  }

  /* Variants */
  .stat-item.default .value {
    color: var(--color-text-primary);
  }

  .stat-item.highlight .value {
    color: var(--color-accent);
  }

  .stat-item.muted .value {
    color: var(--color-text-secondary);
  }
</style>
