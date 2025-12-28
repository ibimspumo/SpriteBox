<script lang="ts">
	import { t } from '$lib/i18n';
	import {
		allUpgradesInfo,
		upgradeCategories,
		buyUpgrade
	} from '$lib/idle-pixel';
	import type { UpgradeCategory } from '@spritebox/types';
	import IdleUpgradeItem from './IdleUpgradeItem.svelte';

	interface Props {
		show?: boolean;
		onClose?: () => void;
	}

	let { show = true, onClose }: Props = $props();

	// Category order
	const categoryOrder: UpgradeCategory[] = ['production', 'economy', 'clicker', 'grid'];

	// Get category name from i18n
	function getCategoryName(category: UpgradeCategory): string {
		switch (category) {
			case 'production':
				return $t.idlePixel.categories.production;
			case 'economy':
				return $t.idlePixel.categories.economy;
			case 'clicker':
				return $t.idlePixel.categories.clicker;
			case 'grid':
				return $t.idlePixel.categories.grid;
		}
	}

	// Handle upgrade purchase
	function handlePurchase(upgradeId: string) {
		buyUpgrade(upgradeId);
	}

	// Get upgrade info by ID
	function getUpgradeInfo(upgradeId: string) {
		return $allUpgradesInfo.find((info) => info.definition?.id === upgradeId);
	}
</script>

{#if show}
	<div class="upgrade-panel">
		<!-- Only show header if onClose is provided (modal mode) -->
		{#if onClose}
			<div class="panel-header">
				<h2 class="panel-title">{$t.idlePixel.upgrades.title}</h2>
				<button class="close-btn" onclick={onClose} aria-label="Close">✕</button>
			</div>
		{/if}

		<div class="panel-content">
			{#each categoryOrder as category}
				{@const upgrades = upgradeCategories[category]}
				{#if upgrades.length > 0}
					<div class="category-section">
						<h3 class="category-title">{getCategoryName(category)}</h3>
						<div class="upgrade-list">
							{#each upgrades as upgrade (upgrade.id)}
								{@const info = getUpgradeInfo(upgrade.id)}
								{#if info?.definition}
									<IdleUpgradeItem
										definition={info.definition}
										currentLevel={info.currentLevel}
										cost={info.cost}
										canAfford={info.canAfford}
										canBuy={info.canBuy}
										isMaxed={info.isMaxed}
										currentEffect={info.currentEffect}
										nextEffect={info.nextEffect}
										onPurchase={() => handlePurchase(upgrade.id)}
									/>
								{/if}
							{/each}
						</div>
					</div>
				{/if}
			{/each}
		</div>
	</div>
{/if}

<style>
	.upgrade-panel {
		display: flex;
		flex-direction: column;
		height: 100%;
		background: rgba(0, 0, 0, 0.3);
		border: 1px solid var(--color-border);
		overflow: hidden;
	}

	.panel-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: var(--space-2) var(--space-3);
		background: rgba(78, 205, 196, 0.1);
		border-bottom: 1px solid var(--color-border);
		flex-shrink: 0;
	}

	.panel-title {
		font-family: var(--font-family);
		font-size: var(--font-size-sm);
		color: var(--color-accent);
		margin: 0;
		letter-spacing: 0.1em;
	}

	.close-btn {
		background: none;
		border: none;
		color: var(--color-text-muted);
		font-size: var(--font-size-sm);
		cursor: pointer;
		padding: var(--space-1);
		line-height: 1;
	}

	.close-btn:hover {
		color: var(--color-text-primary);
	}

	.panel-content {
		flex: 1;
		overflow-y: auto;
		padding: var(--space-2);
	}

	/* Custom scrollbar */
	.panel-content::-webkit-scrollbar {
		width: 6px;
	}

	.panel-content::-webkit-scrollbar-track {
		background: rgba(0, 0, 0, 0.2);
	}

	.panel-content::-webkit-scrollbar-thumb {
		background: var(--color-accent);
		opacity: 0.5;
	}

	.category-section {
		margin-bottom: var(--space-4);
	}

	.category-section:last-child {
		margin-bottom: 0;
	}

	.category-title {
		font-family: var(--font-family);
		font-size: 10px;
		color: var(--color-text-muted);
		margin: 0 0 var(--space-2) 0;
		letter-spacing: 0.15em;
		text-transform: uppercase;
	}

	.upgrade-list {
		display: flex;
		flex-direction: column;
		gap: var(--space-1);
	}
</style>
