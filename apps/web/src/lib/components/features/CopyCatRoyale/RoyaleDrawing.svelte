<!-- CopyCat Royale - Drawing Phase (Recreate from Memory) -->
<script lang="ts">
	import type { CopyCatRoyaleState } from '$lib/stores';
	import { hasSubmitted, pixels } from '$lib/stores';
	import { royaleSubmit } from '$lib/socketBridge';
	import { t } from '$lib/i18n';
	import { PixelCanvas, ColorPalette, Timer } from '$lib/components/utility';
	import { Button } from '$lib/components/atoms';

	interface Props {
		royaleState: CopyCatRoyaleState;
	}

	let { royaleState }: Props = $props();

	// Handle drawing submission
	function handleSubmit(): void {
		royaleSubmit($pixels);
	}
</script>

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

	/* Mobile */
	@media (max-width: 480px) {
		.phase-title {
			font-size: var(--font-size-xl);
		}
	}
</style>
