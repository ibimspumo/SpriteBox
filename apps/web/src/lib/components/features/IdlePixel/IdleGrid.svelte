<script lang="ts">
	import { grid, mergeAnimations, slotPurchaseOptions, buySlot, currency } from '$lib/idle-pixel';
	import { formatBigNumber } from '$lib/idle-pixel/utils/format';
	import { IDLE_PIXEL_COLORS, GridUtils } from '@spritebox/types';
	import IdlePixelSlot from './IdlePixelSlot.svelte';

	// Track which slot is being hovered for expansion preview
	let hoveredSlot: number | null = $state(null);

	function handleSlotClick(position: number, isUnlocked: boolean) {
		if (isUnlocked) return; // Clicking unlocked slots does nothing for now

		// Try to buy the slot
		const options = $slotPurchaseOptions;
		const option = options.find((o) => o.position === position);
		if (option && $currency >= option.cost) {
			buySlot(position);
		}
	}

	function getSlotCost(position: number): number | null {
		const options = $slotPurchaseOptions;
		const option = options.find((o) => o.position === position);
		return option?.cost ?? null;
	}

	function canAffordSlot(position: number): boolean {
		const cost = getSlotCost(position);
		return cost !== null && $currency >= cost;
	}

	// Check if a position has an active merge animation
	function hasActiveAnimation(position: number): boolean {
		return $mergeAnimations.some(
			(anim) => anim.fromPositions.includes(position) || anim.toPosition === position
		);
	}

	// Get animation data for a position
	function getAnimationData(position: number) {
		return $mergeAnimations.find(
			(anim) => anim.fromPositions.includes(position) || anim.toPosition === position
		);
	}
</script>

<div class="grid-container">
	<div class="grid-frame">
		<div class="grid">
			{#each $grid as slot (slot.position)}
				{@const coords = GridUtils.positionToCoords(slot.position)}
				{@const slotCost = getSlotCost(slot.position)}
				{@const isAvailable = slotCost !== null}
				{@const canAfford = canAffordSlot(slot.position)}
				{@const animData = getAnimationData(slot.position)}

				<div
					class="grid-cell"
					class:unlocked={slot.unlocked}
					class:locked={!slot.unlocked}
					class:available={isAvailable}
					class:affordable={canAfford}
					class:hovered={hoveredSlot === slot.position}
					style="--cell-x: {coords.x}; --cell-y: {coords.y};"
					role="button"
					tabindex={isAvailable ? 0 : -1}
					onclick={() => handleSlotClick(slot.position, slot.unlocked)}
					onkeydown={(e) => e.key === 'Enter' && handleSlotClick(slot.position, slot.unlocked)}
					onmouseenter={() => (hoveredSlot = slot.position)}
					onmouseleave={() => (hoveredSlot = null)}
				>
					{#if slot.unlocked}
						<IdlePixelSlot
							pixel={slot.pixel}
							position={slot.position}
							animating={hasActiveAnimation(slot.position)}
							animData={animData}
						/>
					{:else if isAvailable}
						<div class="slot-locked available">
							<span class="lock-icon">+</span>
							{#if hoveredSlot === slot.position}
								<span class="slot-cost" class:can-afford={canAfford}>
									{formatBigNumber(slotCost)}
								</span>
							{/if}
						</div>
					{:else}
						<div class="slot-locked">
							<span class="lock-icon dim">■</span>
						</div>
					{/if}
				</div>
			{/each}
		</div>

		<!-- Grid border glow -->
		<div class="grid-glow"></div>
	</div>
</div>

<style>
	.grid-container {
		width: 100%;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.grid-frame {
		position: relative;
		background: rgba(0, 0, 0, 0.6);
		border: 3px solid var(--color-border-strong);
		padding: var(--space-1);
		box-shadow:
			inset 0 0 30px rgba(0, 0, 0, 0.5),
			0 0 20px rgba(78, 205, 196, 0.1);
	}

	.grid-glow {
		position: absolute;
		inset: -4px;
		border: 2px solid rgba(78, 205, 196, 0.2);
		pointer-events: none;
		animation: gridPulse 3s ease-in-out infinite;
	}

	@keyframes gridPulse {
		0%, 100% { border-color: rgba(78, 205, 196, 0.2); }
		50% { border-color: rgba(78, 205, 196, 0.4); }
	}

	.grid {
		display: grid;
		grid-template-columns: repeat(8, 1fr);
		grid-template-rows: repeat(8, 1fr);
		gap: 2px;
		aspect-ratio: 1;
		width: min(280px, 70vw);
		background: rgba(0, 0, 0, 0.4);
	}

	.grid-cell {
		aspect-ratio: 1;
		position: relative;
		transition: all 0.15s ease;
		cursor: default;
	}

	.grid-cell.unlocked {
		background: rgba(30, 30, 50, 0.8);
		box-shadow: inset 0 0 10px rgba(0, 0, 0, 0.3);
	}

	.grid-cell.locked {
		background: rgba(10, 10, 20, 0.9);
	}

	.grid-cell.available {
		cursor: pointer;
		background: rgba(20, 20, 40, 0.8);
	}

	.grid-cell.available:hover {
		background: rgba(40, 40, 70, 0.9);
	}

	.grid-cell.available.affordable:hover {
		background: rgba(34, 197, 94, 0.2);
		box-shadow: 0 0 10px rgba(34, 197, 94, 0.3);
	}

	.slot-locked {
		width: 100%;
		height: 100%;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 2px;
	}

	.lock-icon {
		font-family: var(--font-family);
		font-size: 12px;
		color: var(--color-text-muted);
		opacity: 0.5;
		transition: all 0.15s ease;
	}

	.lock-icon.dim {
		opacity: 0.15;
		font-size: 8px;
	}

	.available:hover .lock-icon {
		opacity: 1;
		color: var(--color-accent);
		text-shadow: 0 0 8px var(--color-accent);
	}

	.affordable:hover .lock-icon {
		color: var(--color-success);
		text-shadow: 0 0 8px var(--color-success);
	}

	.slot-cost {
		font-family: var(--font-family);
		font-size: 8px;
		color: var(--color-danger);
		animation: fadeIn 0.1s ease;
	}

	.slot-cost.can-afford {
		color: var(--color-success);
	}

	@keyframes fadeIn {
		from { opacity: 0; transform: translateY(2px); }
		to { opacity: 1; transform: translateY(0); }
	}

	/* Staggered entrance animation */
	.grid-cell {
		animation: cellAppear 0.3s ease backwards;
		animation-delay: calc((var(--cell-x) + var(--cell-y)) * 0.02s);
	}

	@keyframes cellAppear {
		from {
			opacity: 0;
			transform: scale(0.8);
		}
		to {
			opacity: 1;
			transform: scale(1);
		}
	}
</style>
