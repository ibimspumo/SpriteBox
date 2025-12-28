<script lang="ts">
	import { t } from '$lib/i18n';
	import { goldenPixelSystem } from '$lib/idle-pixel';
	import type { GoldenPixelPosition } from '$lib/idle-pixel';

	interface Props {
		active: boolean;
		timeLeft: number;
		bonusValue: number;
		onCollect: () => void;
	}

	let { active, timeLeft, bonusValue, onCollect }: Props = $props();

	// Random position when golden pixel appears
	let position = $state<GoldenPixelPosition>({ x: 50, y: 50 });

	// Generate new position when becoming active
	$effect(() => {
		if (active) {
			position = goldenPixelSystem.getRandomPosition();
		}
	});

	// Time progress (1 = full, 0 = expired)
	const timeProgress = $derived(active ? timeLeft / 4000 : 0);

	// Format bonus value
	function formatNumber(num: number): string {
		if (num >= 1e6) return (num / 1e6).toFixed(1) + 'M';
		if (num >= 1e3) return (num / 1e3).toFixed(1) + 'K';
		return Math.floor(num).toString();
	}

	function handleCollect() {
		if (active) {
			onCollect();
		}
	}

	function handleKeydown(e: KeyboardEvent) {
		if ((e.key === 'Enter' || e.key === ' ') && active) {
			e.preventDefault();
			onCollect();
		}
	}
</script>

{#if active}
	<button
		class="golden-pixel"
		style="left: {position.x}%; top: {position.y}%"
		onclick={handleCollect}
		onkeydown={handleKeydown}
		aria-label={$t.idlePixel.clicker.goldenPixel.collect}
	>
		<!-- Outer glow rings -->
		<div class="glow-ring ring-1"></div>
		<div class="glow-ring ring-2"></div>
		<div class="glow-ring ring-3"></div>

		<!-- Main star body -->
		<div class="star-body">
			<span class="star-icon">⭐</span>
			<div class="star-shine"></div>
		</div>

		<!-- Bonus preview -->
		<div class="bonus-preview">
			<span class="bonus-plus">+</span>
			<span class="bonus-value">{formatNumber(bonusValue)}</span>
		</div>

		<!-- Timer ring -->
		<svg class="timer-ring" viewBox="0 0 100 100">
			<circle
				class="timer-bg"
				cx="50"
				cy="50"
				r="46"
			/>
			<circle
				class="timer-progress"
				cx="50"
				cy="50"
				r="46"
				style="stroke-dashoffset: {289 * (1 - timeProgress)}"
			/>
		</svg>

		<!-- Sparkle particles -->
		<div class="sparkles">
			{#each Array(6) as _, i}
				<div class="sparkle" style="--sparkle-index: {i}"></div>
			{/each}
		</div>
	</button>
{/if}

<style>
	.golden-pixel {
		position: absolute;
		transform: translate(-50%, -50%);
		width: 70px;
		height: 70px;
		background: transparent;
		border: none;
		cursor: pointer;
		z-index: 100;
		display: flex;
		align-items: center;
		justify-content: center;
		animation: goldenAppear 0.3s ease-out;
	}

	@keyframes goldenAppear {
		0% {
			transform: translate(-50%, -50%) scale(0);
			opacity: 0;
		}
		50% {
			transform: translate(-50%, -50%) scale(1.2);
		}
		100% {
			transform: translate(-50%, -50%) scale(1);
			opacity: 1;
		}
	}

	/* Glow rings */
	.glow-ring {
		position: absolute;
		border-radius: 50%;
		border: 2px solid #ffd700;
		opacity: 0.5;
		animation: ringPulse 1.5s ease-in-out infinite;
	}

	.ring-1 {
		inset: -8px;
		animation-delay: 0s;
	}

	.ring-2 {
		inset: -16px;
		animation-delay: 0.3s;
		opacity: 0.3;
	}

	.ring-3 {
		inset: -24px;
		animation-delay: 0.6s;
		opacity: 0.15;
	}

	@keyframes ringPulse {
		0%, 100% {
			transform: scale(1);
			opacity: 0.5;
		}
		50% {
			transform: scale(1.1);
			opacity: 0.2;
		}
	}

	/* Star body */
	.star-body {
		position: relative;
		width: 50px;
		height: 50px;
		background: radial-gradient(circle at 30% 30%, #fff6a9, #ffd700 40%, #ff8c00 100%);
		border-radius: 50%;
		display: flex;
		align-items: center;
		justify-content: center;
		box-shadow:
			0 0 20px #ffd700,
			0 0 40px rgba(255, 215, 0, 0.5),
			inset 0 -3px 6px rgba(255, 140, 0, 0.5);
		animation: starBounce 0.6s ease-in-out infinite alternate;
	}

	@keyframes starBounce {
		0% {
			transform: translateY(0) scale(1);
		}
		100% {
			transform: translateY(-3px) scale(1.05);
		}
	}

	.star-icon {
		font-size: 24px;
		filter: drop-shadow(0 0 4px #fff);
		z-index: 1;
	}

	.star-shine {
		position: absolute;
		top: 8px;
		left: 12px;
		width: 10px;
		height: 10px;
		background: rgba(255, 255, 255, 0.8);
		border-radius: 50%;
		filter: blur(2px);
	}

	/* Bonus preview */
	.bonus-preview {
		position: absolute;
		bottom: -8px;
		left: 50%;
		transform: translateX(-50%);
		display: flex;
		align-items: baseline;
		gap: 2px;
		font-family: var(--font-family);
		font-size: 10px;
		color: #ffd700;
		text-shadow:
			0 0 6px #ffd700,
			0 1px 2px rgba(0, 0, 0, 0.8);
		white-space: nowrap;
		animation: bonusPulse 1s ease-in-out infinite;
	}

	@keyframes bonusPulse {
		0%, 100% { transform: translateX(-50%) scale(1); }
		50% { transform: translateX(-50%) scale(1.1); }
	}

	.bonus-plus {
		font-size: 8px;
	}

	.bonus-value {
		font-weight: bold;
	}

	/* Timer ring */
	.timer-ring {
		position: absolute;
		inset: -4px;
		width: calc(100% + 8px);
		height: calc(100% + 8px);
		transform: rotate(-90deg);
	}

	.timer-bg {
		fill: none;
		stroke: rgba(255, 255, 255, 0.1);
		stroke-width: 4;
	}

	.timer-progress {
		fill: none;
		stroke: rgba(255, 255, 255, 0.8);
		stroke-width: 4;
		stroke-linecap: round;
		stroke-dasharray: 289;
		transition: stroke-dashoffset 0.1s linear;
	}

	/* Sparkles */
	.sparkles {
		position: absolute;
		inset: -20px;
		pointer-events: none;
	}

	.sparkle {
		position: absolute;
		width: 4px;
		height: 4px;
		background: #fff;
		border-radius: 50%;
		animation: sparkleFloat 2s ease-in-out infinite;
		animation-delay: calc(var(--sparkle-index) * 0.3s);
	}

	.sparkle:nth-child(1) { top: 10%; left: 20%; }
	.sparkle:nth-child(2) { top: 20%; right: 15%; }
	.sparkle:nth-child(3) { bottom: 25%; left: 10%; }
	.sparkle:nth-child(4) { bottom: 15%; right: 20%; }
	.sparkle:nth-child(5) { top: 50%; left: 5%; }
	.sparkle:nth-child(6) { top: 40%; right: 5%; }

	@keyframes sparkleFloat {
		0%, 100% {
			opacity: 0;
			transform: scale(0);
		}
		50% {
			opacity: 1;
			transform: scale(1);
		}
	}

	/* Hover state */
	.golden-pixel:hover .star-body {
		animation-play-state: paused;
		transform: scale(1.15);
		box-shadow:
			0 0 30px #ffd700,
			0 0 60px rgba(255, 215, 0, 0.7),
			inset 0 -3px 6px rgba(255, 140, 0, 0.5);
	}

	.golden-pixel:active .star-body {
		transform: scale(0.95);
	}

	/* Focus state for accessibility */
	.golden-pixel:focus-visible {
		outline: none;
	}

	.golden-pixel:focus-visible .star-body {
		box-shadow:
			0 0 0 3px var(--color-bg-primary),
			0 0 0 6px #ffd700,
			0 0 30px #ffd700;
	}
</style>
