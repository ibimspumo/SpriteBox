<script lang="ts">
	import { t } from '$lib/i18n';

	interface Props {
		current: number;
		max: number;
		onHarvest: () => void;
	}

	let { current, max, onHarvest }: Props = $props();

	// Derived values
	const percentage = $derived(max > 0 ? (current / max) * 100 : 0);
	const isFull = $derived(percentage >= 100);
	const canHarvest = $derived(current > 0);

	// Format numbers nicely
	function formatNumber(num: number): string {
		if (num >= 1e6) return (num / 1e6).toFixed(1) + 'M';
		if (num >= 1e3) return (num / 1e3).toFixed(1) + 'K';
		return Math.floor(num).toString();
	}

	function handleHarvest() {
		if (canHarvest) {
			onHarvest();
		}
	}

	function handleKeydown(e: KeyboardEvent) {
		if ((e.key === 'Enter' || e.key === ' ') && canHarvest) {
			e.preventDefault();
			onHarvest();
		}
	}
</script>

<div class="energy-bar-compact" class:full={isFull}>
	<!-- Icon and label -->
	<div class="energy-label">
		<span class="energy-icon">⚡</span>
	</div>

	<!-- Progress bar -->
	<div class="energy-bar-wrapper">
		<div class="energy-bar-bg">
			<div
				class="energy-bar-fill"
				class:full={isFull}
				style="width: {Math.min(percentage, 100)}%"
			>
				<div class="energy-bar-shine"></div>
			</div>
		</div>
		<span class="energy-values">
			{formatNumber(current)}/{formatNumber(max)}
		</span>
	</div>

	<!-- Harvest button -->
	<button
		class="harvest-btn"
		class:disabled={!canHarvest}
		class:full={isFull}
		onclick={handleHarvest}
		onkeydown={handleKeydown}
		disabled={!canHarvest}
		aria-label={$t.idlePixel.clicker.energyBar.harvest}
	>
		{#if canHarvest}
			<span class="btn-value">+{formatNumber(current)}</span>
		{:else}
			<span class="btn-text">—</span>
		{/if}
	</button>
</div>

<style>
	.energy-bar-compact {
		display: flex;
		align-items: center;
		gap: var(--space-2);
		background: rgba(0, 0, 0, 0.5);
		border: 2px solid var(--color-border);
		padding: var(--space-2);
		position: relative;
		overflow: hidden;
	}

	/* Glow effect when full */
	.energy-bar-compact.full {
		border-color: var(--color-accent);
		box-shadow: 0 0 10px rgba(78, 205, 196, 0.3);
	}

	.energy-bar-compact.full::before {
		content: '';
		position: absolute;
		inset: 0;
		background: radial-gradient(ellipse at center, rgba(78, 205, 196, 0.1) 0%, transparent 70%);
		animation: containerPulse 1.5s ease-in-out infinite;
		pointer-events: none;
	}

	@keyframes containerPulse {
		0%, 100% { opacity: 0.5; }
		50% { opacity: 1; }
	}

	/* Icon label */
	.energy-label {
		display: flex;
		align-items: center;
		flex-shrink: 0;
	}

	.energy-icon {
		font-size: 14px;
		animation: iconPulse 2s ease-in-out infinite;
	}

	@keyframes iconPulse {
		0%, 100% {
			filter: drop-shadow(0 0 2px var(--color-warning));
		}
		50% {
			filter: drop-shadow(0 0 6px var(--color-warning));
		}
	}

	/* Progress bar wrapper */
	.energy-bar-wrapper {
		flex: 1;
		display: flex;
		align-items: center;
		gap: var(--space-2);
		min-width: 0;
	}

	.energy-bar-bg {
		flex: 1;
		position: relative;
		height: 14px;
		background: rgba(0, 0, 0, 0.6);
		border: 1px solid rgba(255, 255, 255, 0.1);
		overflow: hidden;
	}

	.energy-bar-fill {
		position: absolute;
		top: 0;
		left: 0;
		height: 100%;
		background: linear-gradient(
			180deg,
			var(--color-accent) 0%,
			#3ab0a9 50%,
			var(--color-success) 100%
		);
		transition: width 0.15s ease-out;
		box-shadow: 0 0 8px rgba(78, 205, 196, 0.5);
	}

	.energy-bar-fill.full {
		animation: fillPulse 1s ease-in-out infinite;
	}

	@keyframes fillPulse {
		0%, 100% {
			box-shadow: 0 0 8px rgba(78, 205, 196, 0.5);
			filter: brightness(1);
		}
		50% {
			box-shadow: 0 0 15px rgba(78, 205, 196, 0.8);
			filter: brightness(1.2);
		}
	}

	.energy-bar-shine {
		position: absolute;
		top: 0;
		left: 0;
		right: 0;
		height: 40%;
		background: linear-gradient(
			180deg,
			rgba(255, 255, 255, 0.3) 0%,
			transparent 100%
		);
	}

	/* Values display */
	.energy-values {
		font-family: var(--font-family);
		font-size: 8px;
		color: var(--color-text-secondary);
		white-space: nowrap;
		min-width: 50px;
		text-align: right;
	}

	/* Harvest button */
	.harvest-btn {
		display: flex;
		align-items: center;
		justify-content: center;
		padding: var(--space-1) var(--space-2);
		min-width: 50px;
		font-family: var(--font-family);
		font-size: 9px;
		background: linear-gradient(180deg, var(--color-accent) 0%, #3ab0a9 100%);
		color: var(--color-bg-primary);
		border: 2px solid rgba(255, 255, 255, 0.2);
		cursor: pointer;
		transition: all 0.1s ease;
		flex-shrink: 0;
	}

	.harvest-btn:hover:not(.disabled) {
		transform: scale(1.05);
		box-shadow: 0 0 10px rgba(78, 205, 196, 0.5);
		filter: brightness(1.1);
	}

	.harvest-btn:active:not(.disabled) {
		transform: scale(0.98);
	}

	.harvest-btn.disabled {
		background: linear-gradient(180deg, #3a3a5a 0%, #2a2a4a 100%);
		color: var(--color-text-muted);
		cursor: not-allowed;
		opacity: 0.5;
	}

	.harvest-btn.full:not(.disabled) {
		animation: harvestPulse 0.8s ease-in-out infinite;
	}

	@keyframes harvestPulse {
		0%, 100% {
			box-shadow: 0 0 8px rgba(78, 205, 196, 0.5);
		}
		50% {
			box-shadow: 0 0 15px rgba(78, 205, 196, 0.8);
		}
	}

	.btn-value {
		color: var(--color-bg-primary);
		font-weight: bold;
	}

	.btn-text {
		opacity: 0.5;
	}
</style>
