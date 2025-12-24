<!-- ResourceBar Molecule - Game resource display (HP, Mana, XP, Shield) -->
<script lang="ts">
	import { Icon } from '../atoms';

	interface Props {
		/** Current value */
		current: number;
		/** Maximum value */
		max: number;
		/** Resource type for styling */
		type: 'hp' | 'mana' | 'xp' | 'shield';
		/** Icon name to display */
		icon?: string;
		/** Show current/max numbers */
		showValues?: boolean;
		/** Show percentage instead of values */
		showPercent?: boolean;
		/** Compact mode (smaller height) */
		compact?: boolean;
		/** Label text (optional) */
		label?: string;
		/** Additional class */
		class?: string;
	}

	let {
		current,
		max,
		type,
		icon,
		showValues = true,
		showPercent = false,
		compact = false,
		label,
		class: className = '',
	}: Props = $props();

	// Calculate percentage
	let percent = $derived(max > 0 ? Math.min(100, Math.max(0, (current / max) * 100)) : 0);

	// Get default icon based on type
	let displayIcon = $derived(
		icon ?? { hp: 'heart', mana: 'drop', xp: 'zap', shield: 'shield' }[type]
	);

	// Format display value
	let displayValue = $derived(
		showPercent
			? `${Math.round(percent)}%`
			: `${Math.round(current)}/${Math.round(max)}`
	);
</script>

<div
	class="resource-bar {type} {className}"
	class:compact
	role="progressbar"
	aria-valuenow={Math.round(current)}
	aria-valuemin={0}
	aria-valuemax={Math.round(max)}
	aria-label={label ?? type}
>
	<div class="bar-content">
		{#if displayIcon}
			<span class="icon-wrapper">
				<Icon name={displayIcon} size={compact ? 'sm' : 'md'} />
			</span>
		{/if}
		{#if label}
			<span class="label">{label}</span>
		{/if}
		<div class="bar-track">
			<div class="bar-fill" style="width: {percent}%"></div>
		</div>
		{#if showValues}
			<span class="value">{displayValue}</span>
		{/if}
	</div>
</div>

<style>
	.resource-bar {
		display: flex;
		align-items: center;
		width: 100%;
	}

	.bar-content {
		display: flex;
		align-items: center;
		gap: var(--space-2);
		width: 100%;
	}

	.icon-wrapper {
		display: flex;
		align-items: center;
		justify-content: center;
		flex-shrink: 0;
	}

	.label {
		font-size: var(--font-size-xs);
		font-weight: var(--font-weight-bold);
		color: var(--color-text-secondary);
		text-transform: uppercase;
		flex-shrink: 0;
	}

	.bar-track {
		flex: 1;
		min-width: calc(var(--space-4) * 3);
		height: calc(var(--space-1) * 3.5);
		background: var(--color-bg-primary);
		border: 2px solid var(--color-bg-elevated);
		border-radius: var(--radius-none);
		overflow: hidden;
		position: relative;
	}

	.compact .bar-track {
		height: calc(var(--space-2) + 2px);
	}

	.bar-fill {
		height: 100%;
		transition: width 0.3s ease;
		position: relative;
	}

	/* HP Bar - Green to Red gradient based on health */
	.resource-bar.hp .bar-fill {
		background: var(--color-success);
		box-shadow: inset 0 -2px 0 rgba(0, 0, 0, 0.2);
	}

	.resource-bar.hp .icon-wrapper {
		color: var(--color-error);
	}

	/* Mana Bar - Blue/Purple */
	.resource-bar.mana .bar-fill {
		background: var(--color-info);
		box-shadow: inset 0 -2px 0 rgba(0, 0, 0, 0.2);
	}

	.resource-bar.mana .icon-wrapper {
		color: var(--color-info);
	}

	/* XP Bar - Gold/Yellow */
	.resource-bar.xp .bar-fill {
		background: var(--color-warning);
		box-shadow: inset 0 -2px 0 rgba(0, 0, 0, 0.2);
	}

	.resource-bar.xp .icon-wrapper {
		color: var(--color-warning);
	}

	/* Shield Bar - Cyan */
	.resource-bar.shield .bar-fill {
		background: var(--color-accent);
		box-shadow: inset 0 -2px 0 rgba(0, 0, 0, 0.2);
	}

	.resource-bar.shield .icon-wrapper {
		color: var(--color-accent);
	}

	.value {
		font-size: var(--font-size-sm);
		font-weight: var(--font-weight-bold);
		color: var(--color-text-primary);
		min-width: 60px;
		text-align: right;
		flex-shrink: 0;
		font-variant-numeric: tabular-nums;
	}

	.compact .value {
		font-size: var(--font-size-xs);
		min-width: 45px;
	}
</style>
