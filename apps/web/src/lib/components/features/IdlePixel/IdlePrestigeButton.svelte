<script lang="ts">
	import { t } from '$lib/i18n';
	import { prestigeInfo, showPrestigeConfirm } from '$lib/idle-pixel';
	import { formatBigNumber } from '$lib/idle-pixel/utils/format';

	// Derived state from store
	const canPrestige = $derived($prestigeInfo.canPrestige);
	const prismaGain = $derived($prestigeInfo.prismaGain);
	const progressToNext = $derived($prestigeInfo.progressToNext);
	const prismaPixels = $derived($prestigeInfo.prismaPixels);
	const toNextPrisma = $derived($prestigeInfo.toNextPrisma);

	function handleClick() {
		if (canPrestige) {
			showPrestigeConfirm();
		}
	}

	function handleKeydown(event: KeyboardEvent) {
		if (event.key === 'Enter' || event.key === ' ') {
			event.preventDefault();
			handleClick();
		}
	}
</script>

<div class="prestige-container">
	<!-- Prisma balance display -->
	<div class="prisma-balance">
		<span class="prisma-icon">💎</span>
		<span class="prisma-value">{formatBigNumber(prismaPixels)}</span>
	</div>

	{#if canPrestige}
		<!-- Prestige available - glowing button -->
		<button
			class="prestige-button available"
			onclick={handleClick}
			onkeydown={handleKeydown}
			aria-label="{$t.idlePixel.prestige.button} - {$t.idlePixel.prestige.confirmGain} {prismaGain}"
		>
			<div class="button-glow"></div>
			<div class="button-content">
				<span class="prestige-icon">✨</span>
				<span class="prestige-label">{$t.idlePixel.prestige.button}</span>
				<span class="prestige-gain">+{prismaGain}</span>
			</div>
			<div class="button-shine"></div>
		</button>
	{:else}
		<!-- Prestige not available - progress display -->
		<div class="prestige-progress" role="progressbar" aria-valuenow={progressToNext} aria-valuemin="0" aria-valuemax="100">
			<div class="progress-label">
				<span class="label-text">{$t.idlePixel.prestige.nextAt}</span>
				<span class="label-value">{formatBigNumber(toNextPrisma)}</span>
			</div>
			<div class="progress-track">
				<div class="progress-fill" style="width: {progressToNext}%"></div>
				<div class="progress-glow" style="left: {progressToNext}%"></div>
			</div>
		</div>
	{/if}
</div>

<style>
	.prestige-container {
		display: flex;
		flex-direction: column;
		gap: var(--space-2);
		padding: var(--space-2);
		background: linear-gradient(135deg, rgba(139, 92, 246, 0.1) 0%, rgba(236, 72, 153, 0.1) 100%);
		border: 2px solid rgba(139, 92, 246, 0.3);
		position: relative;
		overflow: hidden;
	}

	/* Prismatic shimmer overlay */
	.prestige-container::before {
		content: '';
		position: absolute;
		inset: 0;
		background: linear-gradient(
			45deg,
			transparent 30%,
			rgba(255, 255, 255, 0.05) 50%,
			transparent 70%
		);
		animation: shimmer 3s ease-in-out infinite;
		pointer-events: none;
	}

	@keyframes shimmer {
		0% { transform: translateX(-100%); }
		100% { transform: translateX(100%); }
	}

	/* Prisma balance */
	.prisma-balance {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: var(--space-2);
		position: relative;
		z-index: 1;
	}

	.prisma-icon {
		font-size: var(--font-size-md);
		animation: prismaGlow 2s ease-in-out infinite;
	}

	@keyframes prismaGlow {
		0%, 100% {
			filter: drop-shadow(0 0 4px rgba(139, 92, 246, 0.8));
			transform: scale(1);
		}
		50% {
			filter: drop-shadow(0 0 8px rgba(236, 72, 153, 0.8));
			transform: scale(1.1);
		}
	}

	.prisma-value {
		font-family: var(--font-family);
		font-size: var(--font-size-lg);
		background: linear-gradient(90deg, #8b5cf6, #ec4899, #8b5cf6);
		background-size: 200% 100%;
		-webkit-background-clip: text;
		-webkit-text-fill-color: transparent;
		background-clip: text;
		animation: gradientShift 3s linear infinite;
		font-weight: bold;
		text-shadow: 0 0 20px rgba(139, 92, 246, 0.5);
	}

	@keyframes gradientShift {
		0% { background-position: 0% 50%; }
		100% { background-position: 200% 50%; }
	}

	/* Prestige Button - Available State */
	.prestige-button {
		position: relative;
		padding: var(--space-3) var(--space-4);
		background: linear-gradient(135deg, #7c3aed 0%, #db2777 100%);
		border: 3px solid #581c87;
		color: white;
		font-family: var(--font-family);
		cursor: pointer;
		overflow: hidden;
		z-index: 1;
		box-shadow:
			0 4px 0 #581c87,
			0 0 20px rgba(139, 92, 246, 0.4),
			inset 0 1px 0 rgba(255, 255, 255, 0.2);
		transition: all 0.15s ease;
	}

	.prestige-button:hover {
		transform: translateY(-2px);
		box-shadow:
			0 6px 0 #581c87,
			0 0 30px rgba(139, 92, 246, 0.6),
			inset 0 1px 0 rgba(255, 255, 255, 0.3);
	}

	.prestige-button:active {
		transform: translateY(2px);
		box-shadow:
			0 2px 0 #581c87,
			0 0 15px rgba(139, 92, 246, 0.3),
			inset 0 1px 0 rgba(255, 255, 255, 0.1);
	}

	.prestige-button:focus-visible {
		outline: 2px solid #ec4899;
		outline-offset: 2px;
	}

	.button-glow {
		position: absolute;
		inset: -4px;
		background: linear-gradient(45deg, #8b5cf6, #ec4899, #f59e0b, #8b5cf6);
		background-size: 300% 300%;
		animation: borderGlow 2s linear infinite;
		z-index: -1;
		filter: blur(8px);
		opacity: 0.6;
	}

	@keyframes borderGlow {
		0% { background-position: 0% 50%; }
		50% { background-position: 100% 50%; }
		100% { background-position: 0% 50%; }
	}

	.button-content {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: var(--space-2);
		position: relative;
		z-index: 2;
	}

	.prestige-icon {
		font-size: var(--font-size-md);
		animation: sparkle 1s ease-in-out infinite;
	}

	@keyframes sparkle {
		0%, 100% { transform: rotate(0deg) scale(1); }
		50% { transform: rotate(180deg) scale(1.2); }
	}

	.prestige-label {
		font-size: var(--font-size-sm);
		letter-spacing: 0.15em;
		text-transform: uppercase;
	}

	.prestige-gain {
		font-size: var(--font-size-sm);
		color: #fde047;
		text-shadow: 0 0 10px #fde047;
		font-weight: bold;
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
			rgba(255, 255, 255, 0.3) 50%,
			transparent 100%
		);
		animation: buttonShine 2s ease-in-out infinite;
	}

	@keyframes buttonShine {
		0% { left: -100%; }
		50%, 100% { left: 100%; }
	}

	/* Progress Display - Not Available State */
	.prestige-progress {
		display: flex;
		flex-direction: column;
		gap: var(--space-1);
		position: relative;
		z-index: 1;
	}

	.progress-label {
		display: flex;
		justify-content: space-between;
		align-items: center;
	}

	.label-text {
		font-family: var(--font-family);
		font-size: 9px;
		color: var(--color-text-muted);
		letter-spacing: 0.1em;
		text-transform: uppercase;
	}

	.label-value {
		font-family: var(--font-family);
		font-size: var(--font-size-xs);
		color: rgba(139, 92, 246, 0.8);
	}

	.progress-track {
		height: 8px;
		background: rgba(0, 0, 0, 0.4);
		border: 1px solid rgba(139, 92, 246, 0.3);
		position: relative;
		overflow: hidden;
	}

	.progress-fill {
		height: 100%;
		background: linear-gradient(90deg, #8b5cf6, #ec4899);
		transition: width 0.3s ease;
		position: relative;
	}

	.progress-fill::after {
		content: '';
		position: absolute;
		inset: 0;
		background: linear-gradient(
			90deg,
			transparent 0%,
			rgba(255, 255, 255, 0.3) 50%,
			transparent 100%
		);
		animation: progressShine 1.5s ease-in-out infinite;
	}

	@keyframes progressShine {
		0% { transform: translateX(-100%); }
		100% { transform: translateX(100%); }
	}

	.progress-glow {
		position: absolute;
		top: 50%;
		transform: translate(-50%, -50%);
		width: 8px;
		height: 16px;
		background: #ec4899;
		filter: blur(4px);
		opacity: 0.8;
		transition: left 0.3s ease;
	}

	/* Mobile responsive */
	@media (max-width: 400px) {
		.prestige-container {
			padding: var(--space-1);
		}

		.prestige-button {
			padding: var(--space-2) var(--space-3);
		}

		.prestige-label {
			font-size: 10px;
		}
	}
</style>
