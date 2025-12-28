<script lang="ts">
	import type { IdlePixel } from '@spritebox/types';
	import { IDLE_PIXEL_COLORS } from '@spritebox/types';
	import type { MergeAnimation } from '$lib/idle-pixel';

	interface Props {
		pixel: IdlePixel | null;
		position: number;
		animating?: boolean;
		animData?: MergeAnimation | null;
	}

	let { pixel, position, animating = false, animData = null }: Props = $props();

	// Derive pixel color from color level
	const pixelColor = $derived(pixel ? IDLE_PIXEL_COLORS[pixel.colorLevel] : null);

	// Calculate glow intensity based on color level (higher = more glow)
	const glowIntensity = $derived(pixel ? Math.min(pixel.colorLevel / 14, 1) : 0);

	// Is this the target of a merge (receives the merged pixel)?
	const isMergeTarget = $derived(animData?.toPosition === position);

	// Is this pixel being merged away?
	const isMergeSource = $derived(
		animData?.fromPositions.includes(position) && animData?.toPosition !== position
	);
</script>

<div
	class="pixel-slot"
	class:has-pixel={pixel !== null}
	class:animating
	class:merge-target={isMergeTarget}
	class:merge-source={isMergeSource}
>
	{#if pixel}
		<div
			class="pixel"
			style="
				--pixel-color: {pixelColor};
				--glow-intensity: {glowIntensity};
				--color-level: {pixel.colorLevel};
			"
		>
			<!-- Pixel core -->
			<div class="pixel-core"></div>

			<!-- Glow effect for higher level pixels -->
			{#if pixel.colorLevel > 2}
				<div class="pixel-glow"></div>
			{/if}

			<!-- Shimmer effect for high level pixels -->
			{#if pixel.colorLevel > 8}
				<div class="pixel-shimmer"></div>
			{/if}

			<!-- Production indicator -->
			<div class="production-pulse"></div>
		</div>

		<!-- Color level indicator -->
		{#if pixel.colorLevel > 0}
			<div class="level-badge" style="--pixel-color: {pixelColor};">
				{pixel.colorLevel + 1}
			</div>
		{/if}
	{:else}
		<!-- Empty slot visual -->
		<div class="empty-slot"></div>
	{/if}
</div>

<style>
	.pixel-slot {
		width: 100%;
		height: 100%;
		position: relative;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.pixel {
		width: 85%;
		height: 85%;
		position: relative;
		display: flex;
		align-items: center;
		justify-content: center;
		transition: transform 0.15s ease;
	}

	.pixel-slot.has-pixel:hover .pixel {
		transform: scale(1.05);
	}

	.pixel-core {
		width: 100%;
		height: 100%;
		background: var(--pixel-color);
		box-shadow:
			inset -2px -2px 0 rgba(0, 0, 0, 0.3),
			inset 2px 2px 0 rgba(255, 255, 255, 0.15),
			0 0 calc(5px + var(--glow-intensity) * 15px) var(--pixel-color);
		animation: pixelProduce 2s ease-in-out infinite;
		animation-delay: calc(var(--color-level) * 0.1s);
	}

	@keyframes pixelProduce {
		0%, 100% {
			filter: brightness(1);
		}
		50% {
			filter: brightness(1.15);
		}
	}

	.pixel-glow {
		position: absolute;
		inset: -4px;
		background: var(--pixel-color);
		opacity: calc(0.2 + var(--glow-intensity) * 0.3);
		filter: blur(6px);
		z-index: -1;
		animation: glowPulse 1.5s ease-in-out infinite;
	}

	@keyframes glowPulse {
		0%, 100% { opacity: calc(0.2 + var(--glow-intensity) * 0.2); }
		50% { opacity: calc(0.3 + var(--glow-intensity) * 0.4); }
	}

	.pixel-shimmer {
		position: absolute;
		inset: 0;
		background: linear-gradient(
			135deg,
			transparent 40%,
			rgba(255, 255, 255, 0.4) 50%,
			transparent 60%
		);
		animation: shimmer 2s linear infinite;
	}

	@keyframes shimmer {
		0% { transform: translateX(-100%) translateY(-100%); }
		100% { transform: translateX(100%) translateY(100%); }
	}

	.production-pulse {
		position: absolute;
		inset: 0;
		border: 2px solid var(--pixel-color);
		opacity: 0;
		animation: productionRing 3s ease-out infinite;
	}

	@keyframes productionRing {
		0% {
			transform: scale(1);
			opacity: 0.6;
		}
		100% {
			transform: scale(1.8);
			opacity: 0;
		}
	}

	.level-badge {
		position: absolute;
		bottom: -2px;
		right: -2px;
		font-family: var(--font-family);
		font-size: 7px;
		background: rgba(0, 0, 0, 0.8);
		color: var(--pixel-color);
		padding: 1px 3px;
		border: 1px solid var(--pixel-color);
		text-shadow: 0 0 4px var(--pixel-color);
		z-index: 10;
	}

	.empty-slot {
		width: 60%;
		height: 60%;
		border: 1px dashed rgba(255, 255, 255, 0.1);
		opacity: 0.3;
	}

	/* Merge animations */
	.pixel-slot.merge-source .pixel {
		animation: mergeOut 0.3s ease-in forwards;
	}

	@keyframes mergeOut {
		0% {
			transform: scale(1);
			opacity: 1;
		}
		100% {
			transform: scale(0);
			opacity: 0;
		}
	}

	.pixel-slot.merge-target .pixel {
		animation: mergeIn 0.3s ease-out;
	}

	@keyframes mergeIn {
		0% {
			transform: scale(1.5);
			filter: brightness(2);
		}
		50% {
			transform: scale(0.8);
		}
		100% {
			transform: scale(1);
			filter: brightness(1);
		}
	}

	/* Pop effect when new pixel appears */
	.pixel-slot.has-pixel .pixel {
		animation: pixelPop 0.3s ease-out;
	}

	@keyframes pixelPop {
		0% {
			transform: scale(0);
		}
		60% {
			transform: scale(1.2);
		}
		100% {
			transform: scale(1);
		}
	}
</style>
