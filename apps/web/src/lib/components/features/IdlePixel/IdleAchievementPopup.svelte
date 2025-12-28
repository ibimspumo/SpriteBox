<script lang="ts">
	import { t } from '$lib/i18n';
	import { achievementPopup, dismissAchievement } from '$lib/idle-pixel';
	import { IDLE_PIXEL_COLORS } from '@spritebox/types';

	// Get the achievement data
	const achievement = $derived($achievementPopup);
	const colorLevel = $derived(achievement?.colorLevel ?? 0);
	const pixelColor = $derived(IDLE_PIXEL_COLORS[colorLevel] ?? IDLE_PIXEL_COLORS[0]);

	function handleDismiss() {
		dismissAchievement();
	}

	function handleKeydown(event: KeyboardEvent) {
		if (event.key === 'Escape' || event.key === 'Enter' || event.key === ' ') {
			event.preventDefault();
			handleDismiss();
		}
	}
</script>

{#if achievement?.show}
	<!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
	<div
		class="achievement-overlay"
		onclick={handleDismiss}
		onkeydown={handleKeydown}
		role="alertdialog"
		aria-modal="true"
		aria-label={$t.idlePixel.achievement.newRecord}
		tabindex="-1"
	>
		<div class="achievement-popup" onclick={(e) => e.stopPropagation()}>
			<!-- Animated background glow -->
			<div class="popup-glow" style="--pixel-color: {pixelColor}"></div>

			<!-- Content -->
			<div class="popup-content">
				<!-- Trophy/Star icon -->
				<div class="achievement-icon">
					<span class="icon-star">⭐</span>
					<span class="icon-sparkle left">✨</span>
					<span class="icon-sparkle right">✨</span>
				</div>

				<!-- Title -->
				<h2 class="achievement-title">{$t.idlePixel.achievement.newRecord}</h2>

				<!-- Color pixel preview -->
				<div class="pixel-preview" style="--pixel-color: {pixelColor}">
					<div class="pixel-inner"></div>
					<div class="pixel-shine"></div>
				</div>

				<!-- Level text -->
				<p class="achievement-level">
					Level <span class="level-number">{colorLevel}</span>
				</p>

				<!-- Click to dismiss hint -->
				<span class="dismiss-hint">{$t.common.close}</span>
			</div>

			<!-- Particle effects -->
			<div class="particles">
				{#each Array(12) as _, i}
					<div class="particle" style="--i: {i}; --pixel-color: {pixelColor}"></div>
				{/each}
			</div>

			<!-- Shine sweep -->
			<div class="popup-shine"></div>
		</div>
	</div>
{/if}

<style>
	.achievement-overlay {
		position: fixed;
		top: 0;
		left: 0;
		right: 0;
		z-index: 1000;
		display: flex;
		justify-content: center;
		padding-top: var(--space-4);
		pointer-events: auto;
		animation: fadeIn 0.3s ease-out;
	}

	@keyframes fadeIn {
		from {
			opacity: 0;
		}
		to {
			opacity: 1;
		}
	}

	.achievement-popup {
		position: relative;
		padding: var(--space-4) var(--space-6);
		background: linear-gradient(135deg, rgba(30, 30, 40, 0.95) 0%, rgba(20, 20, 30, 0.98) 100%);
		border: 2px solid rgba(255, 215, 0, 0.6);
		box-shadow:
			0 0 30px rgba(255, 215, 0, 0.3),
			0 0 60px rgba(255, 215, 0, 0.1),
			0 4px 20px rgba(0, 0, 0, 0.5);
		overflow: hidden;
		animation: popIn 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
		cursor: pointer;
	}

	@keyframes popIn {
		0% {
			transform: scale(0.5) translateY(-20px);
			opacity: 0;
		}
		100% {
			transform: scale(1) translateY(0);
			opacity: 1;
		}
	}

	.popup-glow {
		position: absolute;
		inset: -20px;
		background: radial-gradient(circle at center, var(--pixel-color) 0%, transparent 70%);
		opacity: 0.2;
		filter: blur(20px);
		animation: pulse 2s ease-in-out infinite;
	}

	@keyframes pulse {
		0%,
		100% {
			opacity: 0.2;
			transform: scale(1);
		}
		50% {
			opacity: 0.3;
			transform: scale(1.1);
		}
	}

	.popup-content {
		position: relative;
		z-index: 2;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: var(--space-2);
	}

	.achievement-icon {
		position: relative;
		font-size: 32px;
		animation: bounce 1s ease-in-out infinite;
	}

	@keyframes bounce {
		0%,
		100% {
			transform: translateY(0);
		}
		50% {
			transform: translateY(-5px);
		}
	}

	.icon-star {
		display: block;
		filter: drop-shadow(0 0 10px rgba(255, 215, 0, 0.8));
	}

	.icon-sparkle {
		position: absolute;
		top: -5px;
		font-size: 16px;
		animation: sparkle 1.5s ease-in-out infinite;
	}

	.icon-sparkle.left {
		left: -15px;
		animation-delay: 0s;
	}

	.icon-sparkle.right {
		right: -15px;
		animation-delay: 0.5s;
	}

	@keyframes sparkle {
		0%,
		100% {
			opacity: 0.5;
			transform: scale(0.8) rotate(0deg);
		}
		50% {
			opacity: 1;
			transform: scale(1.2) rotate(180deg);
		}
	}

	.achievement-title {
		margin: 0;
		font-family: var(--font-family);
		font-size: var(--font-size-lg);
		color: #ffd700;
		text-transform: uppercase;
		letter-spacing: 0.15em;
		text-shadow: 0 0 20px rgba(255, 215, 0, 0.5);
		animation: glow 2s ease-in-out infinite;
	}

	@keyframes glow {
		0%,
		100% {
			text-shadow: 0 0 20px rgba(255, 215, 0, 0.5);
		}
		50% {
			text-shadow:
				0 0 30px rgba(255, 215, 0, 0.8),
				0 0 40px rgba(255, 215, 0, 0.4);
		}
	}

	.pixel-preview {
		position: relative;
		width: 48px;
		height: 48px;
		margin: var(--space-2) 0;
	}

	.pixel-inner {
		width: 100%;
		height: 100%;
		background: var(--pixel-color);
		box-shadow:
			0 0 20px var(--pixel-color),
			0 0 40px var(--pixel-color),
			inset 0 2px 0 rgba(255, 255, 255, 0.3),
			inset 0 -2px 0 rgba(0, 0, 0, 0.3);
		animation: pixelPulse 1s ease-in-out infinite;
	}

	@keyframes pixelPulse {
		0%,
		100% {
			transform: scale(1);
			box-shadow:
				0 0 20px var(--pixel-color),
				0 0 40px var(--pixel-color),
				inset 0 2px 0 rgba(255, 255, 255, 0.3),
				inset 0 -2px 0 rgba(0, 0, 0, 0.3);
		}
		50% {
			transform: scale(1.1);
			box-shadow:
				0 0 30px var(--pixel-color),
				0 0 60px var(--pixel-color),
				inset 0 2px 0 rgba(255, 255, 255, 0.4),
				inset 0 -2px 0 rgba(0, 0, 0, 0.4);
		}
	}

	.pixel-shine {
		position: absolute;
		top: 0;
		left: -100%;
		width: 100%;
		height: 100%;
		background: linear-gradient(90deg, transparent 0%, rgba(255, 255, 255, 0.5) 50%, transparent 100%);
		animation: shine 2s ease-in-out infinite;
	}

	@keyframes shine {
		0% {
			left: -100%;
		}
		50%,
		100% {
			left: 100%;
		}
	}

	.achievement-level {
		margin: 0;
		font-family: var(--font-family);
		font-size: var(--font-size-md);
		color: var(--color-text);
	}

	.level-number {
		font-size: var(--font-size-lg);
		font-weight: bold;
		color: var(--pixel-color);
		text-shadow: 0 0 10px var(--pixel-color);
	}

	.dismiss-hint {
		font-family: var(--font-family);
		font-size: var(--font-size-xs);
		color: var(--color-text-muted);
		margin-top: var(--space-2);
		opacity: 0.7;
	}

	/* Particle effects */
	.particles {
		position: absolute;
		inset: 0;
		overflow: hidden;
		pointer-events: none;
	}

	.particle {
		position: absolute;
		width: 6px;
		height: 6px;
		background: var(--pixel-color);
		left: 50%;
		top: 50%;
		animation: particleFly 2s ease-out infinite;
		animation-delay: calc(var(--i) * 0.15s);
		opacity: 0;
	}

	@keyframes particleFly {
		0% {
			transform: translate(-50%, -50%) rotate(calc(var(--i) * 30deg)) translateY(0);
			opacity: 1;
		}
		100% {
			transform: translate(-50%, -50%) rotate(calc(var(--i) * 30deg)) translateY(-80px);
			opacity: 0;
		}
	}

	.popup-shine {
		position: absolute;
		top: 0;
		left: -100%;
		width: 50%;
		height: 100%;
		background: linear-gradient(90deg, transparent 0%, rgba(255, 255, 255, 0.1) 50%, transparent 100%);
		animation: popupShine 3s ease-in-out infinite;
	}

	@keyframes popupShine {
		0% {
			left: -50%;
		}
		100% {
			left: 150%;
		}
	}

	/* Mobile responsive */
	@media (max-width: 400px) {
		.achievement-popup {
			padding: var(--space-3) var(--space-4);
		}

		.achievement-icon {
			font-size: 24px;
		}

		.achievement-title {
			font-size: var(--font-size-md);
		}

		.pixel-preview {
			width: 36px;
			height: 36px;
		}
	}
</style>
