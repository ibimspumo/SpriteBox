<!-- CopyCat Royale - Winner Phase -->
<script lang="ts">
	import type { CopyCatRoyaleState } from '$lib/stores';
	import { t } from '$lib/i18n';
	import { PixelCanvas, Timer } from '$lib/components/utility';

	interface Props {
		royaleState: CopyCatRoyaleState;
	}

	let { royaleState }: Props = $props();
</script>

<div class="phase-container winner">
	<header class="phase-header winner-header">
		<span class="crown-icon">👑</span>
		<h1 class="phase-title winner-title">{$t.copyCatRoyale.winner}</h1>
	</header>

	{#if royaleState.winner}
		<div class="winner-display">
			<div class="winner-name">
				{$t.copyCatRoyale.winnerAnnounce.replace('{name}', royaleState.winner.displayName)}
			</div>
			{#if royaleState.winnerPixels}
				<div class="winner-art">
					<PixelCanvas pixelData={royaleState.winnerPixels} size={160} readonly />
				</div>
			{/if}
			{#if royaleState.winningAccuracy !== null}
				<div class="winner-accuracy">
					{$t.copyCatRoyale.winnerAccuracy.replace('{value}', String(Math.round(royaleState.winningAccuracy)))}
				</div>
			{/if}
		</div>
	{/if}

	<!-- Final Rankings -->
	<div class="final-rankings">
		<h2 class="rankings-title">{$t.copyCatRoyale.finalRankings}</h2>
		<div class="rankings-list">
			{#each royaleState.finalRankings.slice(0, 10) as ranking, index (ranking.playerId)}
				<div class="ranking-row" class:winner={ranking.finalRank === 1}>
					<span class="rank">#{ranking.finalRank}</span>
					<span class="name">{ranking.user.displayName}</span>
					<span class="avg-accuracy">
						{$t.copyCatRoyale.averageAccuracy.replace('{value}', String(Math.round(ranking.averageAccuracy)))}
					</span>
				</div>
			{/each}
		</div>
	</div>

	<div class="timer-section">
		<Timer />
	</div>

	<p class="returning">{$t.copyCatRoyale.waitingForLobby}</p>
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

	.winner-header {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: var(--space-2);
	}

	.crown-icon {
		font-size: 4rem;
		animation: crownBounce 1s ease-in-out infinite;
	}

	@keyframes crownBounce {
		0%, 100% { transform: translateY(0) rotate(-5deg); }
		50% { transform: translateY(-10px) rotate(5deg); }
	}

	.winner-title {
		color: var(--color-warning);
		text-shadow: 0 0 20px rgba(250, 204, 21, 0.5);
	}

	.winner-display {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: var(--space-4);
		padding: var(--space-6);
		background: linear-gradient(145deg, var(--color-bg-secondary) 0%, var(--color-bg-tertiary) 100%);
		border: 3px solid var(--color-warning);
		border-radius: var(--radius-xl);
		box-shadow: 0 0 50px rgba(250, 204, 21, 0.3);
	}

	.winner-name {
		font-size: var(--font-size-xl);
		font-weight: 800;
		color: var(--color-warning);
		text-transform: uppercase;
		letter-spacing: 2px;
	}

	.winner-art {
		padding: var(--space-3);
		background: var(--color-bg-primary);
		border: 3px solid var(--color-warning);
		border-radius: var(--radius-lg);
	}

	.winner-accuracy {
		color: var(--color-text-secondary);
		font-size: var(--font-size-md);
	}

	.final-rankings {
		width: 100%;
		max-width: 400px;
		padding: var(--space-4);
		background: var(--color-bg-secondary);
		border-radius: var(--radius-lg);
	}

	.rankings-title {
		font-size: var(--font-size-md);
		color: var(--color-text-primary);
		margin: 0 0 var(--space-3);
		text-transform: uppercase;
		letter-spacing: 1px;
		text-align: center;
	}

	.rankings-list {
		display: flex;
		flex-direction: column;
		gap: var(--space-2);
	}

	.ranking-row {
		display: flex;
		align-items: center;
		gap: var(--space-3);
		padding: var(--space-2) var(--space-3);
		background: var(--color-bg-tertiary);
		border-radius: var(--radius-sm);
	}

	.ranking-row.winner {
		background: rgba(250, 204, 21, 0.2);
		border: 1px solid var(--color-warning);
	}

	.ranking-row .rank {
		font-weight: 700;
		color: var(--color-accent);
		min-width: 30px;
	}

	.ranking-row .name {
		flex: 1;
		color: var(--color-text-primary);
	}

	.ranking-row .avg-accuracy {
		font-size: var(--font-size-sm);
		color: var(--color-text-muted);
	}

	.returning {
		color: var(--color-text-muted);
		font-size: var(--font-size-sm);
		text-transform: uppercase;
		letter-spacing: 1px;
	}

	/* Mobile */
	@media (max-width: 480px) {
		.phase-title {
			font-size: var(--font-size-xl);
		}

		.winner-display {
			padding: var(--space-4);
		}
	}

	/* Reduce motion */
	@media (prefers-reduced-motion: reduce) {
		.crown-icon {
			animation: none;
		}
	}
</style>
