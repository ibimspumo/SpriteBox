<script lang="ts">
	import { t, interpolate, balanceValues } from '$lib/i18n';
	import { formatBigNumber } from '$lib/idle-pixel/utils/format';
	import type { UpgradeDefinition } from '@spritebox/types';

	interface Props {
		definition: UpgradeDefinition;
		currentLevel: number;
		cost: number;
		canAfford: boolean;
		canBuy: boolean;
		isMaxed: boolean;
		currentEffect: number;
		nextEffect: number;
		onPurchase: () => void;
	}

	let {
		definition,
		currentLevel,
		cost,
		canAfford,
		canBuy,
		isMaxed,
		currentEffect,
		nextEffect,
		onPurchase
	}: Props = $props();

	// Button feedback state
	let feedback = $state<'idle' | 'success' | 'error'>('idle');

	function handleClick() {
		if (!canBuy) {
			feedback = 'error';
			setTimeout(() => (feedback = 'idle'), 200);
			return;
		}

		onPurchase();
		feedback = 'success';
		setTimeout(() => (feedback = 'idle'), 200);
	}

	function formatEffect(value: number): string {
		if (definition.effectType === 'increase_base_pixel_level') {
			return '+' + value.toFixed(0);
		}
		// Multiplicative effects - show as percentage change
		const percentChange = (value - 1) * 100;
		if (percentChange >= 0) {
			return '+' + percentChange.toFixed(0) + '%';
		}
		return percentChange.toFixed(0) + '%';
	}

	// Get localized name/description
	const upgradeName = $derived(() => {
		const id = definition.id;
		switch (id) {
			case 'prod_multiplier':
				return $t.idlePixel.upgrades.prodMultiplier.name;
			case 'cheaper_pixels':
				return $t.idlePixel.upgrades.cheaperPixels.name;
			case 'better_pixels':
				return $t.idlePixel.upgrades.betterPixels.name;
			case 'energy_capacity':
				return $t.idlePixel.upgrades.energyCapacity.name;
			case 'golden_frequency':
				return $t.idlePixel.upgrades.goldenFrequency.name;
			case 'unlock_merge_8':
				return $t.idlePixel.upgrades.mergeUnlock8.name;
			case 'unlock_merge_9':
				return $t.idlePixel.upgrades.mergeUnlock9.name;
			case 'unlock_merge_10':
				return $t.idlePixel.upgrades.mergeUnlock10.name;
			default:
				return id;
		}
	});

	const upgradeDescription = $derived(() => {
		const id = definition.id;
		switch (id) {
			case 'prod_multiplier':
				return interpolate($t.idlePixel.upgrades.prodMultiplier.description, {
					value: balanceValues.prodMultiplierPercent
				});
			case 'cheaper_pixels':
				return interpolate($t.idlePixel.upgrades.cheaperPixels.description, {
					value: balanceValues.cheaperPixelsPercent
				});
			case 'better_pixels':
				return $t.idlePixel.upgrades.betterPixels.description;
			case 'energy_capacity':
				return interpolate($t.idlePixel.upgrades.energyCapacity.description, {
					value: balanceValues.energyCapacityPercent
				});
			case 'golden_frequency':
				return interpolate($t.idlePixel.upgrades.goldenFrequency.description, {
					value: balanceValues.goldenFrequencyPercent
				});
			case 'unlock_merge_8':
				return $t.idlePixel.upgrades.mergeUnlock8.description;
			case 'unlock_merge_9':
				return $t.idlePixel.upgrades.mergeUnlock9.description;
			case 'unlock_merge_10':
				return $t.idlePixel.upgrades.mergeUnlock10.description;
			default:
				return '';
		}
	});
</script>

<button
	class="upgrade-item"
	class:can-buy={canBuy}
	class:maxed={isMaxed}
	class:success={feedback === 'success'}
	class:error={feedback === 'error'}
	onclick={handleClick}
	disabled={isMaxed}
>
	<!-- Icon -->
	<div class="upgrade-icon">{definition.icon}</div>

	<!-- Info -->
	<div class="upgrade-info">
		<div class="upgrade-header">
			<span class="upgrade-name">{upgradeName()}</span>
			<span class="upgrade-level">
				{$t.idlePixel.level}{currentLevel}
				{#if definition.maxLevel > 0}
					<span class="max-level">/{definition.maxLevel}</span>
				{/if}
			</span>
		</div>
		<div class="upgrade-desc">{upgradeDescription()}</div>
		{#if !isMaxed}
			<div class="upgrade-effect">
				<span class="current">{formatEffect(currentEffect)}</span>
				<span class="arrow">→</span>
				<span class="next">{formatEffect(nextEffect)}</span>
			</div>
		{/if}
	</div>

	<!-- Cost / Max badge -->
	<div class="upgrade-cost">
		{#if isMaxed}
			<span class="max-badge">{$t.idlePixel.max}</span>
		{:else}
			<span class="cost-value" class:affordable={canAfford}>
				{formatBigNumber(cost)}
			</span>
		{/if}
	</div>
</button>

<style>
	.upgrade-item {
		display: flex;
		align-items: center;
		gap: var(--space-3);
		width: 100%;
		padding: var(--space-2) var(--space-3);
		background: rgba(0, 0, 0, 0.4);
		border: 2px solid var(--color-border);
		cursor: pointer;
		transition: all 0.15s ease;
		text-align: left;
		font-family: var(--font-family);
	}

	.upgrade-item:hover:not(:disabled) {
		background: rgba(78, 205, 196, 0.1);
		border-color: var(--color-accent);
	}

	.upgrade-item.can-buy {
		border-color: var(--color-success);
		background: rgba(34, 197, 94, 0.1);
	}

	.upgrade-item.can-buy:hover {
		background: rgba(34, 197, 94, 0.2);
	}

	.upgrade-item.maxed {
		opacity: 0.6;
		cursor: default;
	}

	.upgrade-item.success {
		animation: successPop 0.2s ease;
	}

	.upgrade-item.error {
		animation: errorShake 0.2s ease;
	}

	@keyframes successPop {
		0%, 100% { transform: scale(1); }
		50% { transform: scale(0.98); }
	}

	@keyframes errorShake {
		0%, 100% { transform: translateX(0); }
		25% { transform: translateX(-3px); }
		75% { transform: translateX(3px); }
	}

	.upgrade-icon {
		font-size: var(--font-size-xl);
		width: 36px;
		height: 36px;
		display: flex;
		align-items: center;
		justify-content: center;
		background: rgba(0, 0, 0, 0.3);
		flex-shrink: 0;
	}

	.upgrade-info {
		flex: 1;
		min-width: 0;
	}

	.upgrade-header {
		display: flex;
		align-items: baseline;
		gap: var(--space-2);
		margin-bottom: 2px;
	}

	.upgrade-name {
		font-size: var(--font-size-sm);
		color: var(--color-text-primary);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.upgrade-level {
		font-size: 10px;
		color: var(--color-accent);
		white-space: nowrap;
	}

	.max-level {
		color: var(--color-text-muted);
	}

	.upgrade-desc {
		font-size: 9px;
		color: var(--color-text-muted);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.upgrade-effect {
		display: flex;
		align-items: center;
		gap: var(--space-1);
		font-size: 9px;
		margin-top: 2px;
	}

	.upgrade-effect .current {
		color: var(--color-text-secondary);
	}

	.upgrade-effect .arrow {
		color: var(--color-text-muted);
	}

	.upgrade-effect .next {
		color: var(--color-success);
	}

	.upgrade-cost {
		flex-shrink: 0;
		text-align: right;
	}

	.cost-value {
		font-size: var(--font-size-sm);
		color: #fca5a5;
		font-weight: 500;
	}

	.cost-value.affordable {
		color: #86efac;
	}

	.max-badge {
		font-size: 10px;
		color: var(--color-accent);
		background: rgba(78, 205, 196, 0.2);
		padding: 2px 6px;
		letter-spacing: 0.1em;
	}
</style>
