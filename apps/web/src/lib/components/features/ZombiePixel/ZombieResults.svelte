<!-- ZombieResults - End game results -->
<script lang="ts">
	import { t } from '$lib/i18n';
	import { Button } from '../../atoms';
	import { leaveLobby } from '$lib/socketBridge';
	import type { ZombiePixelStats } from '$lib/stores';
	import { onMount } from 'svelte';

	interface Props {
		winner: { id: string; name: string; isBot: boolean } | null;
		zombiesWin: boolean;
		stats: ZombiePixelStats | null;
	}

	let { winner, zombiesWin, stats }: Props = $props();
	let mounted = $state(false);

	onMount(() => {
		requestAnimationFrame(() => {
			mounted = true;
		});
	});

	function formatTime(ms: number): string {
		const seconds = Math.floor(ms / 1000);
		return `${seconds}s`;
	}

	function handleBackToLobby(): void {
		leaveLobby();
	}
</script>

<div class="results-screen" class:mounted>
	<div class="results-card">
		<!-- Winner section -->
		<div class="winner-section" class:zombies-win={zombiesWin}>
			{#if zombiesWin}
				<span class="winner-icon" aria-hidden="true">&#x1F9DF;</span>
				<h1>{$t.zombiePixel.zombiesWin}</h1>
				<p class="winner-subtitle">{$t.zombiePixel.noSurvivors}</p>
			{:else if winner}
				<span class="winner-icon" aria-hidden="true">&#x1F3C6;</span>
				<h1>{$t.zombiePixel.survivorWins.replace('{name}', winner.name)}</h1>
				{#if winner.isBot}
					<span class="bot-badge">Bot</span>
				{/if}
			{/if}
		</div>

		<!-- Stats section -->
		{#if stats}
			<div class="stats-section">
				<h2>{$t.zombiePixel.stats.title}</h2>

				<div class="stats-grid">
					<div class="stat-item">
						<span class="stat-label">{$t.zombiePixel.stats.totalInfections}</span>
						<span class="stat-value">{stats.totalInfections}</span>
					</div>

					<div class="stat-item">
						<span class="stat-label">{$t.zombiePixel.stats.gameDuration}</span>
						<span class="stat-value">{formatTime(stats.gameDuration)}</span>
					</div>

					{#if stats.firstInfectionTime !== null}
						<div class="stat-item">
							<span class="stat-label">{$t.zombiePixel.stats.firstInfection}</span>
							<span class="stat-value">{formatTime(stats.firstInfectionTime)}</span>
						</div>
					{/if}

					{#if stats.mostInfections}
						<div class="stat-item highlight">
							<span class="stat-label">{$t.zombiePixel.stats.mostInfections}</span>
							<span class="stat-value"
								>{stats.mostInfections.name} ({stats.mostInfections.count})</span
							>
						</div>
					{/if}

					{#if stats.longestSurvivor}
						<div class="stat-item highlight">
							<span class="stat-label">{$t.zombiePixel.stats.longestSurvival}</span>
							<span class="stat-value"
								>{stats.longestSurvivor.name} ({formatTime(stats.longestSurvivor.survivalTime)})</span
							>
						</div>
					{/if}
				</div>
			</div>
		{/if}

		<!-- Action button -->
		<div class="actions">
			<Button variant="secondary" onclick={handleBackToLobby}>
				{$t.common.backToModes}
			</Button>
		</div>
	</div>
</div>

<style>
	.results-screen {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		min-height: 100vh;
		min-height: 100dvh;
		padding: var(--space-4);
	}

	.results-card {
		background: var(--color-bg-secondary);
		border-radius: var(--radius-xl);
		border: 3px solid var(--color-border);
		padding: var(--space-6);
		max-width: 400px;
		width: 100%;
		box-shadow: var(--shadow-pixel-lg);
		opacity: 0;
		transform: translateY(20px);
		transition:
			opacity 0.4s ease-out,
			transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
	}

	.mounted .results-card {
		opacity: 1;
		transform: translateY(0);
	}

	.winner-section {
		text-align: center;
		margin-bottom: var(--space-6);
		padding-bottom: var(--space-6);
		border-bottom: 2px solid var(--color-border);
	}

	.winner-section.zombies-win h1 {
		color: #22c55e;
		text-shadow: 0 0 20px rgba(34, 197, 94, 0.5);
	}

	.winner-icon {
		font-size: 5rem;
		display: block;
		margin-bottom: var(--space-3);
		line-height: 1;
		animation: iconBounce 1s ease-in-out infinite;
	}

	.winner-section h1 {
		font-size: var(--font-size-xl);
		color: var(--color-text-primary);
		margin: 0 0 var(--space-2);
		text-transform: uppercase;
		letter-spacing: 1px;
	}

	.winner-subtitle {
		color: var(--color-text-secondary);
		font-size: var(--font-size-md);
		margin: 0;
	}

	.bot-badge {
		display: inline-block;
		padding: var(--space-1) var(--space-2);
		background: var(--color-bg-tertiary);
		border-radius: var(--radius-sm);
		font-size: var(--font-size-xs);
		color: var(--color-text-secondary);
		text-transform: uppercase;
		letter-spacing: 0.5px;
	}

	.stats-section {
		margin-bottom: var(--space-6);
	}

	.stats-section h2 {
		font-size: var(--font-size-md);
		color: var(--color-text-secondary);
		margin: 0 0 var(--space-4);
		text-align: center;
		text-transform: uppercase;
		letter-spacing: 1px;
	}

	.stats-grid {
		display: flex;
		flex-direction: column;
		gap: var(--space-3);
	}

	.stat-item {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: var(--space-2) var(--space-3);
		background: var(--color-bg-tertiary);
		border-radius: var(--radius-md);
		border: 1px solid var(--color-border);
	}

	.stat-item.highlight {
		background: rgba(34, 197, 94, 0.1);
		border-color: rgba(34, 197, 94, 0.3);
	}

	.stat-label {
		color: var(--color-text-secondary);
		font-size: var(--font-size-sm);
	}

	.stat-value {
		color: var(--color-text-primary);
		font-weight: 600;
		font-variant-numeric: tabular-nums;
	}

	.actions {
		display: flex;
		justify-content: center;
	}

	@keyframes iconBounce {
		0%,
		100% {
			transform: translateY(0);
		}
		50% {
			transform: translateY(-8px);
		}
	}

	/* Mobile adjustments */
	@media (max-width: 480px) {
		.results-card {
			padding: var(--space-4);
		}

		.winner-icon {
			font-size: 4rem;
		}

		.winner-section h1 {
			font-size: var(--font-size-lg);
		}
	}

	/* Reduce motion */
	@media (prefers-reduced-motion: reduce) {
		.winner-icon {
			animation: none;
		}

		.results-card {
			transition: opacity 0.2s ease;
			transform: none;
		}
	}
</style>
