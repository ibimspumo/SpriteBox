<script lang="ts">
	import {
		buyPixel,
		buyMaxPixels,
		nextPixelInfo,
		emptySlots,
		pixelCount,
		productionBreakdown
	} from '$lib/idle-pixel';
	import { formatBigNumber } from '$lib/idle-pixel/utils/format';
	import { IDLE_PIXEL_COLORS } from '@spritebox/types';

	// Button feedback state
	let buyButtonFeedback = $state<'idle' | 'success' | 'error'>('idle');
	let buyMaxFeedback = $state(0); // Number of pixels bought

	function handleBuyPixel() {
		const success = buyPixel();
		buyButtonFeedback = success ? 'success' : 'error';

		setTimeout(() => {
			buyButtonFeedback = 'idle';
		}, 200);
	}

	function handleBuyMax() {
		const count = buyMaxPixels();
		if (count > 0) {
			buyMaxFeedback = count;
			setTimeout(() => {
				buyMaxFeedback = 0;
			}, 800);
		}
	}

	// Get preview color for new pixel
	const previewColor = $derived(IDLE_PIXEL_COLORS[$nextPixelInfo.newColorLevel]);

	// Derived info
	const canBuy = $derived($nextPixelInfo.canAfford && $nextPixelInfo.hasSpace);
	const noSpace = $derived(!$nextPixelInfo.hasSpace);
</script>

<div class="control-panel">
	<!-- Stats row -->
	<div class="stats-row">
		<div class="stat">
			<span class="stat-label">PIXELS</span>
			<span class="stat-value">{$pixelCount}</span>
		</div>
		<div class="stat">
			<span class="stat-label">EMPTY</span>
			<span class="stat-value">{$emptySlots}</span>
		</div>
		<div class="stat">
			<span class="stat-label">BEST</span>
			<span class="stat-value" style="color: {IDLE_PIXEL_COLORS[$productionBreakdown.highestColorLevel]};">
				Lv{$productionBreakdown.highestColorLevel + 1}
			</span>
		</div>
	</div>

	<!-- Buy buttons row -->
	<div class="buttons-row">
		<!-- Main buy button -->
		<button
			class="buy-button"
			class:success={buyButtonFeedback === 'success'}
			class:error={buyButtonFeedback === 'error'}
			class:disabled={!canBuy}
			onclick={handleBuyPixel}
			disabled={!canBuy}
		>
			<div class="button-content">
				<!-- Pixel preview -->
				<div class="pixel-preview" style="--preview-color: {previewColor};"></div>

				<div class="button-text">
					{#if noSpace}
						<span class="btn-label">NO SPACE</span>
					{:else}
						<span class="btn-label">BUY PIXEL</span>
						<span class="btn-cost" class:affordable={$nextPixelInfo.canAfford}>
							{formatBigNumber($nextPixelInfo.cost)}
						</span>
					{/if}
				</div>
			</div>

			<!-- Button shine effect -->
			<div class="button-shine"></div>
		</button>

		<!-- Buy max button -->
		<button
			class="buy-max-button"
			class:active={buyMaxFeedback > 0}
			onclick={handleBuyMax}
			disabled={!canBuy}
		>
			{#if buyMaxFeedback > 0}
				<span class="max-feedback">+{buyMaxFeedback}</span>
			{:else}
				<span class="max-icon">▲▲</span>
				<span class="max-label">MAX</span>
			{/if}
		</button>
	</div>

	<!-- Production info -->
	<div class="production-info">
		<div class="prod-item">
			<span class="prod-label">BASE</span>
			<span class="prod-value">{formatBigNumber($productionBreakdown.baseProduction)}</span>
		</div>
		<span class="prod-operator">×</span>
		<div class="prod-item">
			<span class="prod-label">BONUS</span>
			<span class="prod-value">{$productionBreakdown.colorBonus.toFixed(2)}</span>
		</div>
		<span class="prod-equals">=</span>
		<div class="prod-item total">
			<span class="prod-value">{formatBigNumber($productionBreakdown.totalPerSecond)}/s</span>
		</div>
	</div>
</div>

<style>
	.control-panel {
		display: flex;
		flex-direction: column;
		gap: var(--space-3);
	}

	/* Stats row */
	.stats-row {
		display: flex;
		justify-content: space-around;
		background: rgba(0, 0, 0, 0.4);
		border: 1px solid var(--color-border);
		padding: var(--space-2);
	}

	.stat {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 2px;
	}

	.stat-label {
		font-family: var(--font-family);
		font-size: 8px;
		color: var(--color-text-muted);
		letter-spacing: 0.1em;
	}

	.stat-value {
		font-family: var(--font-family);
		font-size: var(--font-size-sm);
		color: var(--color-text-primary);
	}

	/* Buttons row */
	.buttons-row {
		display: flex;
		gap: var(--space-2);
	}

	.buy-button {
		flex: 1;
		position: relative;
		font-family: var(--font-family);
		background: linear-gradient(180deg, #2563eb 0%, #1d4ed8 100%);
		border: 3px solid #1e3a8a;
		color: white;
		padding: var(--space-3);
		cursor: pointer;
		overflow: hidden;
		transition: all 0.15s ease;
		box-shadow: 0 4px 0 #1e3a8a;
	}

	.buy-button:hover:not(:disabled) {
		transform: translateY(-2px);
		box-shadow: 0 6px 0 #1e3a8a;
	}

	.buy-button:active:not(:disabled) {
		transform: translateY(2px);
		box-shadow: 0 2px 0 #1e3a8a;
	}

	.buy-button.disabled {
		background: linear-gradient(180deg, #4b5563 0%, #374151 100%);
		border-color: #1f2937;
		box-shadow: 0 4px 0 #1f2937;
		cursor: not-allowed;
		opacity: 0.7;
	}

	.buy-button.success {
		animation: buttonSuccess 0.2s ease;
	}

	@keyframes buttonSuccess {
		0%, 100% { transform: scale(1); }
		50% { transform: scale(0.95); }
	}

	.buy-button.error {
		animation: buttonError 0.2s ease;
	}

	@keyframes buttonError {
		0%, 100% { transform: translateX(0); }
		25% { transform: translateX(-4px); }
		75% { transform: translateX(4px); }
	}

	.button-content {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: var(--space-3);
		position: relative;
		z-index: 1;
	}

	.pixel-preview {
		width: 20px;
		height: 20px;
		background: var(--preview-color);
		box-shadow:
			inset -2px -2px 0 rgba(0, 0, 0, 0.3),
			inset 2px 2px 0 rgba(255, 255, 255, 0.2),
			0 0 8px var(--preview-color);
		animation: previewPulse 1.5s ease-in-out infinite;
	}

	@keyframes previewPulse {
		0%, 100% { transform: scale(1); }
		50% { transform: scale(1.1); }
	}

	.button-text {
		display: flex;
		flex-direction: column;
		align-items: flex-start;
		gap: 2px;
	}

	.btn-label {
		font-size: var(--font-size-sm);
		letter-spacing: 0.05em;
	}

	.btn-cost {
		font-size: var(--font-size-xs);
		color: #fca5a5;
	}

	.btn-cost.affordable {
		color: #86efac;
	}

	.button-shine {
		position: absolute;
		top: 0;
		left: -100%;
		width: 100%;
		height: 100%;
		background: linear-gradient(
			90deg,
			transparent 0%,
			rgba(255, 255, 255, 0.2) 50%,
			transparent 100%
		);
		animation: shine 3s linear infinite;
	}

	@keyframes shine {
		0% { left: -100%; }
		100% { left: 100%; }
	}

	/* Buy max button */
	.buy-max-button {
		width: 60px;
		font-family: var(--font-family);
		font-size: var(--font-size-xs);
		background: linear-gradient(180deg, #16a34a 0%, #15803d 100%);
		border: 3px solid #14532d;
		color: white;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 2px;
		cursor: pointer;
		box-shadow: 0 4px 0 #14532d;
		transition: all 0.15s ease;
	}

	.buy-max-button:hover:not(:disabled) {
		transform: translateY(-2px);
		box-shadow: 0 6px 0 #14532d;
	}

	.buy-max-button:active:not(:disabled) {
		transform: translateY(2px);
		box-shadow: 0 2px 0 #14532d;
	}

	.buy-max-button:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.buy-max-button.active {
		animation: maxPop 0.3s ease;
	}

	@keyframes maxPop {
		0%, 100% { transform: scale(1); }
		50% { transform: scale(1.1); }
	}

	.max-icon {
		font-size: 10px;
		line-height: 1;
	}

	.max-label {
		font-size: 9px;
	}

	.max-feedback {
		font-size: var(--font-size-md);
		color: #86efac;
		text-shadow: 0 0 10px #86efac;
		animation: feedbackPop 0.3s ease;
	}

	@keyframes feedbackPop {
		0% { transform: scale(0); }
		50% { transform: scale(1.3); }
		100% { transform: scale(1); }
	}

	/* Production info */
	.production-info {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: var(--space-2);
		font-family: var(--font-family);
		font-size: 9px;
		color: var(--color-text-muted);
		padding: var(--space-2);
		background: rgba(0, 0, 0, 0.3);
		border: 1px solid var(--color-border);
	}

	.prod-item {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 1px;
	}

	.prod-label {
		font-size: 7px;
		opacity: 0.7;
	}

	.prod-value {
		color: var(--color-text-secondary);
	}

	.prod-item.total .prod-value {
		color: var(--color-accent);
		font-size: 11px;
		text-shadow: 0 0 8px var(--color-accent);
	}

	.prod-operator, .prod-equals {
		color: var(--color-text-muted);
		opacity: 0.5;
	}

	.prod-equals {
		margin-left: var(--space-1);
	}
</style>
