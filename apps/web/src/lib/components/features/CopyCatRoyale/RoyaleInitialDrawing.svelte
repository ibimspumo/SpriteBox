<!-- CopyCat Royale - Initial Drawing Phase -->
<script lang="ts">
	import { hasSubmitted, pixels } from '$lib/stores';
	import { royaleSubmit } from '$lib/socketBridge';
	import { t } from '$lib/i18n';
	import { PixelCanvas, ColorPalette, Timer } from '$lib/components/utility';
	import { Button } from '$lib/components/atoms';

	// Handle drawing submission
	function handleSubmit(): void {
		royaleSubmit($pixels);
	}
</script>

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

	/* Mobile */
	@media (max-width: 480px) {
		.phase-title {
			font-size: var(--font-size-xl);
		}
	}
</style>
