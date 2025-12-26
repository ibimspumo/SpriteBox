<!-- ZombieHUD - Game status display -->
<script lang="ts">
	import { t } from '$lib/i18n';

	interface Props {
		timeRemaining: number;
		survivorCount: number;
		zombieCount: number;
		yourRole: 'zombie' | 'survivor' | null;
	}

	let { timeRemaining, survivorCount, zombieCount, yourRole }: Props = $props();

	let isUrgent = $derived(timeRemaining <= 10);
</script>

<div class="zombie-hud" role="status" aria-live="polite">
	<div class="hud-left">
		<div class="role-badge" class:zombie={yourRole === 'zombie'}>
			{#if yourRole === 'zombie'}
				<span class="role-icon" aria-hidden="true">&#x1F9DF;</span>
				<span class="role-text">{$t.zombiePixel.youAreZombie}</span>
			{:else}
				<span class="role-icon" aria-hidden="true">&#x1F464;</span>
				<span class="role-text">{$t.zombiePixel.youAreSurvivor}</span>
			{/if}
		</div>
	</div>

	<div class="hud-center">
		<div class="timer" class:urgent={isUrgent} aria-label={$t.zombiePixel.timeRemaining.replace('{seconds}', String(timeRemaining))}>
			<span class="timer-value">{timeRemaining}</span>
			<span class="timer-unit">s</span>
		</div>
	</div>

	<div class="hud-right">
		<div class="stat survivor" aria-label={$t.zombiePixel.survivorsRemaining.replace('{count}', String(survivorCount))}>
			<span class="stat-icon" aria-hidden="true">&#x1F464;</span>
			<span class="stat-value">{survivorCount}</span>
		</div>
		<div class="stat zombie" aria-label={$t.zombiePixel.zombiesCount.replace('{count}', String(zombieCount))}>
			<span class="stat-icon" aria-hidden="true">&#x1F9DF;</span>
			<span class="stat-value">{zombieCount}</span>
		</div>
	</div>
</div>

<style>
	.zombie-hud {
		position: fixed;
		top: 0;
		left: 0;
		right: 0;
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: var(--space-3) var(--space-4);
		background: linear-gradient(to bottom, rgba(0, 0, 0, 0.9), rgba(0, 0, 0, 0.5) 80%, transparent);
		z-index: 50;
	}

	.hud-left,
	.hud-right {
		display: flex;
		align-items: center;
		gap: var(--space-3);
	}

	.hud-center {
		position: absolute;
		left: 50%;
		transform: translateX(-50%);
	}

	.role-badge {
		display: flex;
		align-items: center;
		gap: var(--space-2);
		padding: var(--space-1) var(--space-3);
		background: var(--color-bg-secondary);
		border-radius: var(--radius-full);
		border: 2px solid var(--color-border);
	}

	.role-badge.zombie {
		background: rgba(34, 197, 94, 0.2);
		border-color: #22c55e;
	}

	.role-icon {
		font-size: 1.2em;
		line-height: 1;
	}

	.role-text {
		font-size: var(--font-size-xs);
		font-weight: 600;
		color: var(--color-text-primary);
		text-transform: uppercase;
		letter-spacing: 0.5px;
	}

	.role-badge.zombie .role-text {
		color: #22c55e;
	}

	.timer {
		display: flex;
		align-items: baseline;
		gap: 2px;
		padding: var(--space-2) var(--space-4);
		background: var(--color-bg-secondary);
		border-radius: var(--radius-lg);
		border: 2px solid var(--color-border);
	}

	.timer-value {
		font-size: var(--font-size-2xl);
		font-weight: 700;
		color: var(--color-text-primary);
		font-variant-numeric: tabular-nums;
		line-height: 1;
	}

	.timer-unit {
		font-size: var(--font-size-md);
		font-weight: 600;
		color: var(--color-text-secondary);
	}

	.timer.urgent {
		border-color: #ef4444;
		animation: pulseUrgent 0.5s ease-in-out infinite;
	}

	.timer.urgent .timer-value {
		color: #ef4444;
	}

	.stat {
		display: flex;
		align-items: center;
		gap: var(--space-1);
		padding: var(--space-1) var(--space-2);
		background: var(--color-bg-secondary);
		border-radius: var(--radius-md);
		border: 1px solid var(--color-border);
	}

	.stat-icon {
		font-size: 1em;
		line-height: 1;
	}

	.stat-value {
		font-weight: 600;
		font-variant-numeric: tabular-nums;
		min-width: 1.5em;
		text-align: center;
	}

	.stat.survivor .stat-value {
		color: #ffffff;
	}

	.stat.zombie .stat-value {
		color: #22c55e;
	}

	@keyframes pulseUrgent {
		0%,
		100% {
			opacity: 1;
			box-shadow: 0 0 0 rgba(239, 68, 68, 0);
		}
		50% {
			opacity: 0.8;
			box-shadow: 0 0 20px rgba(239, 68, 68, 0.5);
		}
	}

	/* Mobile adjustments */
	@media (max-width: 480px) {
		.zombie-hud {
			padding: var(--space-2) var(--space-3);
		}

		.role-text {
			display: none;
		}

		.role-badge {
			padding: var(--space-1) var(--space-2);
		}

		.timer {
			padding: var(--space-1) var(--space-3);
		}

		.timer-value {
			font-size: var(--font-size-xl);
		}

		.hud-left,
		.hud-right {
			gap: var(--space-2);
		}
	}

	/* Reduce motion */
	@media (prefers-reduced-motion: reduce) {
		.timer.urgent {
			animation: none;
		}
	}
</style>
