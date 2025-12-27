<!-- CopyCat Royale - Show Reference Phase (Memorize) -->
<script lang="ts">
	import type { CopyCatRoyaleState } from '$lib/stores';
	import { t } from '$lib/i18n';
	import { PixelCanvas, Timer } from '$lib/components/utility';

	interface Props {
		royaleState: CopyCatRoyaleState;
	}

	let { royaleState }: Props = $props();
</script>

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

	.eliminated-notice {
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

	/* Mobile */
	@media (max-width: 480px) {
		.phase-title {
			font-size: var(--font-size-xl);
		}
	}

	/* Reduce motion */
	@media (prefers-reduced-motion: reduce) {
		.reference-frame {
			animation: none;
		}
	}
</style>
