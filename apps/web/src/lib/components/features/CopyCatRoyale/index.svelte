<!-- CopyCat Royale Game - Main Component -->
<script lang="ts">
	import { game, copyCatRoyale, hasSubmitted, lobby, pixels } from '$lib/stores';
	import { royaleSubmit } from '$lib/socketBridge';
	import { t } from '$lib/i18n';
	import { PixelCanvas, ColorPalette, Timer } from '$lib/components/utility';
	import { Button } from '$lib/components/atoms';
	import { onMount } from 'svelte';

	let mounted = $state(false);
	let lastPhase = $state<string | null>(null);

	onMount(() => {
		requestAnimationFrame(() => {
			mounted = true;
		});
	});

	// Current phase
	let phase = $derived($game.phase);
	let royaleState = $derived($copyCatRoyale);

	// Reset canvas when entering drawing phases
	$effect(() => {
		const currentPhase = $game.phase;

		// Reset canvas when entering royale-drawing phase (not initial drawing)
		if (currentPhase === 'royale-drawing' && lastPhase !== 'royale-drawing') {
			pixels.set('1'.repeat(64));
			hasSubmitted.set(false);
		}

		// Also reset hasSubmitted when entering initial drawing
		if (currentPhase === 'royale-initial-drawing' && lastPhase !== 'royale-initial-drawing') {
			hasSubmitted.set(false);
		}

		lastPhase = currentPhase;
	});

	// Handle drawing submission
	function handleSubmit(): void {
		royaleSubmit($pixels);
	}
</script>

<div class="royale-game" class:mounted>
	{#if phase === 'royale-initial-drawing'}
		<!-- Initial Drawing Phase - Create art for the pool -->
		<div class="phase-container initial-drawing">
			<header class="phase-header">
				<h1 class="phase-title">{$t.copyCatRoyale.createYourArt}</h1>
				<p class="phase-desc">{$t.copyCatRoyale.createDesc}</p>
			</header>

			<div class="timer-section">
				<Timer />
			</div>

			<div class="canvas-section">
				<PixelCanvas size={200} readonly={$hasSubmitted} />
			</div>

			<div class="palette-section">
				<ColorPalette />
			</div>

			{#if !$hasSubmitted}
				<Button variant="action" size="lg" onclick={handleSubmit}>
					{$t.common.submit}
				</Button>
			{:else}
				<div class="submitted-notice">
					<span class="check-icon">✓</span>
					<span>{$t.drawing.submitted}</span>
				</div>
			{/if}
		</div>

	{:else if phase === 'royale-show-reference'}
		<!-- Memorize Phase - Study the reference image -->
		<div class="phase-container memorize">
			<header class="phase-header">
				<h1 class="phase-title">{$t.copyCatRoyale.memorize}</h1>
				<p class="phase-desc">{$t.copyCatRoyale.memorizeDesc}</p>
			</header>

			<div class="round-info">
				<span class="round-badge">
					{$t.copyCatRoyale.round
						.replace('{current}', String(royaleState.currentRound))
						.replace('{total}', String(royaleState.totalRounds))}
				</span>
				<span class="remaining">
					{$t.copyCatRoyale.remaining.replace('{count}', String(royaleState.remainingPlayers))}
				</span>
			</div>

			<div class="timer-section">
				<Timer />
			</div>

			{#if royaleState.currentReference}
				<div class="reference-display">
					<div class="reference-frame">
						<PixelCanvas pixelData={royaleState.currentReference} size={240} readonly />
					</div>
					{#if royaleState.imageCreator}
						<p class="creator-name">
							{$t.copyCatRoyale.createdBy.replace('{name}', royaleState.imageCreator)}
						</p>
					{/if}
				</div>
			{/if}

			<!-- Eliminated spectator notice -->
			{#if royaleState.isEliminated}
				<div class="eliminated-notice">
					<span class="skull-icon">💀</span>
					<span>{$t.copyCatRoyale.youWereEliminated}</span>
					<span class="rank">{$t.copyCatRoyale.yourRank.replace('{rank}', String(royaleState.myFinalRank))}</span>
				</div>
			{/if}
		</div>

	{:else if phase === 'royale-drawing'}
		<!-- Drawing Phase - Recreate from memory -->
		<div class="phase-container drawing">
			<header class="phase-header">
				<h1 class="phase-title">{$t.copyCatRoyale.drawFromMemory}</h1>
			</header>

			<div class="round-info">
				<span class="round-badge">
					{$t.copyCatRoyale.round
						.replace('{current}', String(royaleState.currentRound))
						.replace('{total}', String(royaleState.totalRounds))}
				</span>
			</div>

			<div class="timer-section">
				<Timer />
			</div>

			{#if !royaleState.isEliminated}
				<div class="canvas-section">
					<PixelCanvas size={200} readonly={$hasSubmitted} />
				</div>

				<div class="palette-section">
					<ColorPalette />
				</div>

				{#if !$hasSubmitted}
					<Button variant="action" size="lg" onclick={handleSubmit}>
						{$t.common.submit}
					</Button>
				{:else}
					<div class="submitted-notice">
						<span class="check-icon">✓</span>
						<span>{$t.drawing.submitted}</span>
					</div>
				{/if}
			{:else}
				<!-- Spectator view -->
				<div class="spectator-notice">
					<span class="skull-icon">💀</span>
					<span>{$t.copyCatRoyale.youWereEliminated}</span>
				</div>
			{/if}
		</div>

	{:else if phase === 'royale-results'}
		<!-- Results Phase - Show round results -->
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

	{:else if phase === 'royale-winner'}
		<!-- Winner Phase - Show final winner -->
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
	{/if}
</div>

<style>
	.royale-game {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		min-height: 100vh;
		min-height: 100dvh;
		padding: var(--space-4);
		background: var(--color-bg-primary);
	}

	.phase-container {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: var(--space-4);
		max-width: 600px;
		width: 100%;
		opacity: 0;
		transform: translateY(20px);
		transition: all 0.4s ease-out;
	}

	.mounted .phase-container {
		opacity: 1;
		transform: translateY(0);
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

	.phase-desc {
		color: var(--color-text-secondary);
		margin: var(--space-2) 0 0;
	}

	.timer-section {
		margin: var(--space-2) 0;
	}

	.round-info {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: var(--space-2);
	}

	.round-badge {
		background: var(--color-accent);
		color: var(--color-bg-primary);
		padding: var(--space-2) var(--space-4);
		border-radius: var(--radius-full);
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 1px;
	}

	.remaining {
		color: var(--color-text-secondary);
		font-size: var(--font-size-sm);
	}

	.canvas-section {
		padding: var(--space-4);
		background: var(--color-bg-secondary);
		border-radius: var(--radius-lg);
		border: 3px solid var(--color-border);
	}

	.palette-section {
		width: 100%;
		max-width: 280px;
	}

	.submitted-notice {
		display: flex;
		align-items: center;
		gap: var(--space-2);
		color: var(--color-success);
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 1px;
	}

	.check-icon {
		font-size: 1.5rem;
	}

	/* Memorize Phase */
	.reference-display {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: var(--space-3);
	}

	.reference-frame {
		padding: var(--space-4);
		background: var(--color-bg-secondary);
		border: 4px solid var(--color-accent);
		border-radius: var(--radius-xl);
		box-shadow: 0 0 40px rgba(78, 205, 196, 0.3);
		animation: pulseGlow 2s ease-in-out infinite;
	}

	@keyframes pulseGlow {
		0%, 100% { box-shadow: 0 0 40px rgba(78, 205, 196, 0.3); }
		50% { box-shadow: 0 0 60px rgba(78, 205, 196, 0.5); }
	}

	.creator-name {
		color: var(--color-text-muted);
		font-size: var(--font-size-sm);
		margin: 0;
	}

	.eliminated-notice,
	.spectator-notice {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: var(--space-2);
		padding: var(--space-4) var(--space-6);
		background: rgba(239, 68, 68, 0.2);
		border: 2px solid var(--color-error);
		border-radius: var(--radius-lg);
		color: var(--color-error);
	}

	.skull-icon {
		font-size: 2rem;
	}

	.rank {
		font-size: var(--font-size-lg);
		font-weight: 700;
	}

	/* Results Phase */
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

	/* Winner Phase */
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
		.royale-game {
			padding: var(--space-2);
		}

		.phase-title {
			font-size: var(--font-size-xl);
		}

		.results-grid {
			grid-template-columns: repeat(2, 1fr);
		}

		.winner-display {
			padding: var(--space-4);
		}
	}

	/* Reduce motion */
	@media (prefers-reduced-motion: reduce) {
		.phase-container {
			transition: opacity 0.2s ease;
			transform: none;
		}

		.reference-frame {
			animation: none;
		}

		.crown-icon {
			animation: none;
		}

		.result-card {
			animation: none;
			opacity: 1;
			transform: none;
		}
	}
</style>
