<!-- CopyCat Royale - Results Phase -->
<script lang="ts">
	import type { CopyCatRoyaleState } from '$lib/stores';
	import { t } from '$lib/i18n';
	import { PixelCanvas, Timer } from '$lib/components/utility';

	interface Props {
		royaleState: CopyCatRoyaleState;
	}

	let { royaleState }: Props = $props();
</script>

<div class="phase-container results">
	<header class="phase-header">
		<h1 class="phase-title">{$t.copyCatRoyale.roundResults}</h1>
	</header>

	<div class="timer-section">
		<Timer />
	</div>

	<!-- Reference Image -->
	{#if royaleState.currentReference}
		<div class="reference-mini">
			<PixelCanvas pixelData={royaleState.currentReference} size={100} readonly />
		</div>
	{/if}

	<!-- Threshold info -->
	<div class="threshold-info">
		{$t.copyCatRoyale.threshold.replace('{value}', String(royaleState.eliminationThreshold))}
	</div>

	<!-- Results Grid -->
	<div class="results-grid">
		{#each royaleState.lastRoundResults as result, index (result.playerId)}
			{@const isEliminated = royaleState.eliminatedThisRound.includes(result.playerId)}
			<div
				class="result-card"
				class:eliminated={isEliminated}
				class:survived={!isEliminated}
				style="--delay: {index * 0.05}s"
			>
				<div class="result-canvas">
					<PixelCanvas pixelData={result.pixels} size={60} readonly />
				</div>
				<div class="result-info">
					<span class="player-name">{result.user.displayName}</span>
					<span class="accuracy" class:low={result.accuracy < royaleState.eliminationThreshold}>
						{$t.copyCatRoyale.accuracy.replace('{value}', String(Math.round(result.accuracy)))}
					</span>
					<span class="status">
						{#if isEliminated}
							<span class="eliminated-badge">{$t.copyCatRoyale.eliminated}</span>
						{:else}
							<span class="survived-badge">{$t.copyCatRoyale.survived}</span>
						{/if}
					</span>
				</div>
			</div>
		{/each}
	</div>
</div>

<style>
	.phase-container {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: var(--space-4);
		max-width: 600px;
		width: 100%;
	}

	.phase-header {
		text-align: center;
	}

	.phase-title {
		font-size: var(--font-size-2xl);
		color: var(--color-text-primary);
		margin: 0;
		text-transform: uppercase;
		letter-spacing: 2px;
	}

	.timer-section {
		margin: var(--space-2) 0;
	}

	.reference-mini {
		padding: var(--space-2);
		background: var(--color-bg-secondary);
		border: 2px solid var(--color-accent);
		border-radius: var(--radius-md);
	}

	.threshold-info {
		color: var(--color-text-muted);
		font-size: var(--font-size-sm);
		text-transform: uppercase;
		letter-spacing: 1px;
	}

	.results-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
		gap: var(--space-3);
		width: 100%;
		max-height: 400px;
		overflow-y: auto;
		padding: var(--space-2);
	}

	.result-card {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: var(--space-2);
		padding: var(--space-3);
		background: var(--color-bg-secondary);
		border: 2px solid var(--color-border);
		border-radius: var(--radius-md);
		opacity: 0;
		transform: scale(0.9);
		animation: cardReveal 0.3s ease-out forwards;
		animation-delay: var(--delay);
	}

	@keyframes cardReveal {
		to {
			opacity: 1;
			transform: scale(1);
		}
	}

	.result-card.eliminated {
		border-color: var(--color-error);
		background: rgba(239, 68, 68, 0.1);
	}

	.result-card.survived {
		border-color: var(--color-success);
	}

	.result-canvas {
		border-radius: var(--radius-sm);
		overflow: hidden;
	}

	.result-info {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: var(--space-1);
		text-align: center;
	}

	.player-name {
		font-weight: 600;
		font-size: var(--font-size-sm);
		color: var(--color-text-primary);
	}

	.accuracy {
		font-size: var(--font-size-xs);
		color: var(--color-success);
	}

	.accuracy.low {
		color: var(--color-error);
	}

	.status {
		font-size: var(--font-size-xs);
		text-transform: uppercase;
		letter-spacing: 0.5px;
	}

	.eliminated-badge {
		color: var(--color-error);
		font-weight: 700;
	}

	.survived-badge {
		color: var(--color-success);
	}

	/* Mobile */
	@media (max-width: 480px) {
		.phase-title {
			font-size: var(--font-size-xl);
		}

		.results-grid {
			grid-template-columns: repeat(2, 1fr);
		}
	}

	/* Reduce motion */
	@media (prefers-reduced-motion: reduce) {
		.result-card {
			animation: none;
			opacity: 1;
			transform: none;
		}
	}
</style>
