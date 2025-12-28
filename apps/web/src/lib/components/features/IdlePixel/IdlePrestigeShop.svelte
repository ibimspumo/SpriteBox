<script lang="ts">
	import { t, interpolate, balanceValues } from '$lib/i18n';
	import {
		allPrestigeUpgradesInfo,
		prestigeInfo,
		buyPrestigeUpgrade,
		showPrestigeConfirm
	} from '$lib/idle-pixel';
	import { formatBigNumber } from '$lib/idle-pixel/utils/format';

	interface Props {
		show?: boolean;
		onClose?: () => void;
	}

	let { show = true, onClose }: Props = $props();

	// Current prisma balance
	const prismaPixels = $derived($prestigeInfo.prismaPixels);
	const prestigeCount = $derived($prestigeInfo.prestigeCount);

	// Prestige progress info
	const canPrestige = $derived($prestigeInfo.canPrestige);
	const prismaGain = $derived($prestigeInfo.prismaGain);
	const progressPercent = $derived($prestigeInfo.progressToNext);
	const toNextPrisma = $derived($prestigeInfo.toNextPrisma);

	function handlePrestigeClick() {
		showPrestigeConfirm();
	}

	// Button feedback per upgrade
	let feedbackMap = $state<Map<string, 'idle' | 'success' | 'error'>>(new Map());

	function handlePurchase(upgradeId: string) {
		const info = $allPrestigeUpgradesInfo.find((u) => u.definition?.id === upgradeId);
		if (!info || info.isMaxed || !info.canAfford) {
			feedbackMap.set(upgradeId, 'error');
			setTimeout(() => feedbackMap.set(upgradeId, 'idle'), 200);
			return;
		}

		const success = buyPrestigeUpgrade(upgradeId);
		feedbackMap.set(upgradeId, success ? 'success' : 'error');
		setTimeout(() => feedbackMap.set(upgradeId, 'idle'), 200);
	}

	function getFeedback(upgradeId: string): 'idle' | 'success' | 'error' {
		return feedbackMap.get(upgradeId) ?? 'idle';
	}

	function formatEffect(info: typeof $allPrestigeUpgradesInfo[0]): string {
		if (!info.definition) return '';

		const effectType = info.definition.effectType;

		if (effectType === 'multiply_production' || effectType === 'golden_pixel_value') {
			// Multiplicative effects - show as multiplier
			return info.currentEffect.toFixed(1) + 'x';
		} else {
			// Additive effects
			return '+' + formatBigNumber(info.currentEffect);
		}
	}

	function formatNextEffect(info: typeof $allPrestigeUpgradesInfo[0]): string {
		if (!info.definition) return '';

		const effectType = info.definition.effectType;

		if (effectType === 'multiply_production' || effectType === 'golden_pixel_value') {
			return info.nextEffect.toFixed(1) + 'x';
		} else {
			return '+' + formatBigNumber(info.nextEffect);
		}
	}

	// Get localized upgrade name
	function getUpgradeName(id: string): string {
		switch (id) {
			case 'prisma_production':
				return $t.idlePixel.prestige.upgrades.production.name;
			case 'prisma_start_currency':
				return $t.idlePixel.prestige.upgrades.startCurrency.name;
			case 'prisma_unlock_slots':
				return $t.idlePixel.prestige.upgrades.unlockSlots.name;
			case 'prisma_golden_bonus':
				return $t.idlePixel.prestige.upgrades.goldenBonus.name;
			case 'prisma_base_pixel':
				return $t.idlePixel.prestige.upgrades.basePixel.name;
			case 'prisma_merge_unlock':
				return $t.idlePixel.prestige.upgrades.mergeUnlock.name;
			default:
				return id;
		}
	}

	// Get localized upgrade description with dynamic values
	function getUpgradeDescription(id: string): string {
		switch (id) {
			case 'prisma_production':
				return interpolate($t.idlePixel.prestige.upgrades.production.description, {
					value: balanceValues.prestigeProductionMultiplier
				});
			case 'prisma_start_currency':
				return interpolate($t.idlePixel.prestige.upgrades.startCurrency.description, {
					value: balanceValues.prestigeStartCurrency.toLocaleString()
				});
			case 'prisma_unlock_slots':
				return interpolate($t.idlePixel.prestige.upgrades.unlockSlots.description, {
					value: balanceValues.prestigeSlotsPerLevel
				});
			case 'prisma_golden_bonus':
				return interpolate($t.idlePixel.prestige.upgrades.goldenBonus.description, {
					value: balanceValues.prestigeGoldenBonusPercent
				});
			case 'prisma_base_pixel':
				return $t.idlePixel.prestige.upgrades.basePixel.description;
			case 'prisma_merge_unlock':
				return $t.idlePixel.prestige.upgrades.mergeUnlock.description;
			default:
				return '';
		}
	}

	function handleKeydown(event: KeyboardEvent) {
		if (event.key === 'Escape' && onClose) {
			onClose();
		}
	}
</script>

{#if show}
	<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
	<div
		class="prestige-shop"
		role="region"
		aria-label={$t.idlePixel.prestige.shopTitle}
		onkeydown={handleKeydown}
	>
		<!-- Header -->
		<div class="shop-header">
			<div class="header-title">
				<span class="title-icon">💎</span>
				<h2 class="title-text">{$t.idlePixel.prestige.shopTitle}</h2>
			</div>

			<div class="header-stats">
				<div class="prisma-display">
					<span class="prisma-icon">💎</span>
					<span class="prisma-amount">{formatBigNumber(prismaPixels)}</span>
				</div>
				{#if prestigeCount > 0}
					<div class="prestige-count">
						{$t.idlePixel.prestige.prestigeCount} #{prestigeCount}
					</div>
				{/if}
			</div>

			{#if onClose}
				<button
					class="close-btn"
					onclick={onClose}
					aria-label={$t.common.close}
				>
					✕
				</button>
			{/if}
		</div>

		<!-- Prestige Progress Section -->
		<div class="prestige-progress-section">
			{#if canPrestige}
				<!-- Can prestige - show button -->
				<button
					class="prestige-action-btn"
					onclick={handlePrestigeClick}
					aria-label={$t.idlePixel.prestige.button}
				>
					<div class="prestige-btn-glow"></div>
					<div class="prestige-btn-content">
						<span class="prestige-sparkle">✨</span>
						<span class="prestige-label">{$t.idlePixel.prestige.button}</span>
						<span class="prestige-sparkle">✨</span>
					</div>
					<div class="prestige-gain-badge">
						<span class="gain-icon">💎</span>
						<span class="gain-value">+{prismaGain}</span>
					</div>
				</button>
			{:else}
				<!-- Progress to next prisma -->
				<div class="progress-container">
					<div class="progress-header">
						<span class="progress-label">{$t.idlePixel.prestige.nextAt}</span>
						<span class="progress-value">
							<span class="progress-icon">💎</span>
							{formatBigNumber(toNextPrisma)}
						</span>
					</div>
					<div class="progress-bar-container">
						<div class="progress-bar-bg">
							<div
								class="progress-bar-fill"
								style="width: {progressPercent}%"
							></div>
							<div class="progress-bar-shimmer"></div>
						</div>
						<span class="progress-percent">{Math.floor(progressPercent)}%</span>
					</div>
				</div>
			{/if}
		</div>

		<!-- Upgrade Grid -->
		<div class="upgrades-grid">
			{#each $allPrestigeUpgradesInfo as info (info.definition?.id)}
				{#if info.definition}
					{@const upgradeId = info.definition.id}
					{@const feedback = getFeedback(upgradeId)}
					<button
						class="upgrade-card"
						class:can-afford={info.canAfford && !info.isMaxed}
						class:maxed={info.isMaxed}
						class:success={feedback === 'success'}
						class:error={feedback === 'error'}
						onclick={() => handlePurchase(upgradeId)}
						disabled={info.isMaxed}
						aria-label="{getUpgradeName(upgradeId)} - {$t.idlePixel.level}{info.currentLevel}"
					>
						<!-- Prismatic border effect for affordable -->
						{#if info.canAfford && !info.isMaxed}
							<div class="card-glow"></div>
						{/if}

						<!-- Icon -->
						<div class="card-icon">
							{info.definition.icon}
						</div>

						<!-- Content -->
						<div class="card-content">
							<div class="card-header">
								<span class="card-name">{getUpgradeName(upgradeId)}</span>
								<span class="card-level">
									{$t.idlePixel.level}{info.currentLevel}/{info.definition.maxLevel}
								</span>
							</div>

							<div class="card-desc">
								{getUpgradeDescription(upgradeId)}
							</div>

							{#if !info.isMaxed}
								<div class="card-effect">
									<span class="effect-current">{formatEffect(info)}</span>
									<span class="effect-arrow">→</span>
									<span class="effect-next">{formatNextEffect(info)}</span>
								</div>
							{/if}
						</div>

						<!-- Cost / Max badge -->
						<div class="card-cost">
							{#if info.isMaxed}
								<span class="max-badge">{$t.idlePixel.prestige.maxed}</span>
							{:else}
								<div class="cost-display" class:affordable={info.canAfford}>
									<span class="cost-icon">💎</span>
									<span class="cost-value">{formatBigNumber(info.cost)}</span>
								</div>
							{/if}
						</div>
					</button>
				{/if}
			{/each}
		</div>

		<!-- Empty state -->
		{#if $allPrestigeUpgradesInfo.length === 0}
			<div class="empty-state">
				<span class="empty-icon">💎</span>
				<p class="empty-text">{$t.idlePixel.prestige.noPrestigeYet}</p>
			</div>
		{/if}
	</div>
{/if}

<style>
	.prestige-shop {
		display: flex;
		flex-direction: column;
		height: 100%;
		background: linear-gradient(180deg, rgba(88, 28, 135, 0.15) 0%, rgba(0, 0, 0, 0.3) 100%);
		border: 2px solid rgba(139, 92, 246, 0.4);
		overflow: hidden;
		position: relative;
	}

	/* Animated prismatic border */
	.prestige-shop::before {
		content: '';
		position: absolute;
		inset: -2px;
		background: linear-gradient(45deg, #8b5cf6, #ec4899, #f59e0b, #10b981, #8b5cf6);
		background-size: 400% 400%;
		animation: borderPrisma 8s linear infinite;
		z-index: -1;
		opacity: 0.3;
	}

	@keyframes borderPrisma {
		0% { background-position: 0% 50%; }
		50% { background-position: 100% 50%; }
		100% { background-position: 0% 50%; }
	}

	/* Header */
	.shop-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: var(--space-2);
		padding: var(--space-3);
		background: rgba(139, 92, 246, 0.15);
		border-bottom: 2px solid rgba(139, 92, 246, 0.3);
		flex-shrink: 0;
	}

	.header-title {
		display: flex;
		align-items: center;
		gap: var(--space-2);
	}

	.title-icon {
		font-size: var(--font-size-lg);
		animation: titlePulse 2s ease-in-out infinite;
	}

	@keyframes titlePulse {
		0%, 100% { transform: scale(1); filter: drop-shadow(0 0 4px rgba(139, 92, 246, 0.6)); }
		50% { transform: scale(1.1); filter: drop-shadow(0 0 8px rgba(236, 72, 153, 0.8)); }
	}

	.title-text {
		font-family: var(--font-family);
		font-size: var(--font-size-sm);
		margin: 0;
		background: linear-gradient(90deg, #8b5cf6, #ec4899);
		-webkit-background-clip: text;
		-webkit-text-fill-color: transparent;
		background-clip: text;
		letter-spacing: 0.15em;
	}

	.header-stats {
		display: flex;
		flex-direction: column;
		align-items: flex-end;
		gap: 2px;
	}

	.prisma-display {
		display: flex;
		align-items: center;
		gap: var(--space-1);
	}

	.prisma-icon {
		font-size: var(--font-size-sm);
	}

	.prisma-amount {
		font-family: var(--font-family);
		font-size: var(--font-size-md);
		color: #c084fc;
		font-weight: bold;
	}

	.prestige-count {
		font-family: var(--font-family);
		font-size: 9px;
		color: var(--color-text-muted);
		letter-spacing: 0.05em;
	}

	.close-btn {
		background: rgba(0, 0, 0, 0.3);
		border: 1px solid var(--color-border);
		color: var(--color-text-muted);
		font-size: var(--font-size-sm);
		padding: var(--space-1) var(--space-2);
		cursor: pointer;
		transition: all 0.15s ease;
	}

	.close-btn:hover {
		color: var(--color-text-primary);
		border-color: var(--color-accent);
	}

	.close-btn:focus-visible {
		outline: 2px solid #ec4899;
		outline-offset: 2px;
	}

	/* Upgrades Grid */
	.upgrades-grid {
		flex: 1;
		display: flex;
		flex-direction: column;
		gap: var(--space-2);
		padding: var(--space-3);
		overflow-y: auto;
	}

	/* Custom scrollbar */
	.upgrades-grid::-webkit-scrollbar {
		width: 6px;
	}

	.upgrades-grid::-webkit-scrollbar-track {
		background: rgba(0, 0, 0, 0.2);
	}

	.upgrades-grid::-webkit-scrollbar-thumb {
		background: linear-gradient(180deg, #8b5cf6, #ec4899);
		opacity: 0.5;
	}

	/* Upgrade Card */
	.upgrade-card {
		display: flex;
		align-items: center;
		gap: var(--space-3);
		padding: var(--space-3);
		background: rgba(0, 0, 0, 0.4);
		border: 2px solid rgba(139, 92, 246, 0.2);
		cursor: pointer;
		transition: all 0.15s ease;
		text-align: left;
		font-family: var(--font-family);
		position: relative;
		overflow: hidden;
	}

	.upgrade-card:hover:not(:disabled) {
		background: rgba(139, 92, 246, 0.15);
		border-color: rgba(139, 92, 246, 0.5);
	}

	.upgrade-card.can-afford {
		border-color: rgba(236, 72, 153, 0.6);
		background: rgba(139, 92, 246, 0.1);
	}

	.upgrade-card.can-afford:hover {
		background: rgba(139, 92, 246, 0.2);
		border-color: #ec4899;
	}

	.upgrade-card.maxed {
		opacity: 0.5;
		cursor: default;
	}

	.upgrade-card.success {
		animation: cardSuccess 0.2s ease;
	}

	.upgrade-card.error {
		animation: cardError 0.2s ease;
	}

	@keyframes cardSuccess {
		0%, 100% { transform: scale(1); }
		50% { transform: scale(0.98); }
	}

	@keyframes cardError {
		0%, 100% { transform: translateX(0); }
		25% { transform: translateX(-3px); }
		75% { transform: translateX(3px); }
	}

	.card-glow {
		position: absolute;
		inset: -2px;
		background: linear-gradient(45deg, #8b5cf6, #ec4899, #8b5cf6);
		background-size: 200% 200%;
		animation: cardGlow 2s linear infinite;
		z-index: -1;
		filter: blur(4px);
		opacity: 0.4;
	}

	@keyframes cardGlow {
		0% { background-position: 0% 50%; }
		100% { background-position: 200% 50%; }
	}

	.card-icon {
		font-size: var(--font-size-2xl);
		width: 44px;
		height: 44px;
		display: flex;
		align-items: center;
		justify-content: center;
		background: linear-gradient(135deg, rgba(139, 92, 246, 0.2) 0%, rgba(236, 72, 153, 0.2) 100%);
		border: 1px solid rgba(139, 92, 246, 0.3);
		flex-shrink: 0;
	}

	.card-content {
		flex: 1;
		min-width: 0;
	}

	.card-header {
		display: flex;
		align-items: baseline;
		gap: var(--space-2);
		margin-bottom: 4px;
	}

	.card-name {
		font-size: var(--font-size-sm);
		color: var(--color-text-primary);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.card-level {
		font-size: 10px;
		color: #c084fc;
		white-space: nowrap;
	}

	.card-desc {
		font-size: 9px;
		color: var(--color-text-muted);
		margin-bottom: 4px;
	}

	.card-effect {
		display: flex;
		align-items: center;
		gap: var(--space-1);
		font-size: 10px;
	}

	.effect-current {
		color: var(--color-text-secondary);
	}

	.effect-arrow {
		color: var(--color-text-muted);
	}

	.effect-next {
		color: #ec4899;
		text-shadow: 0 0 6px rgba(236, 72, 153, 0.5);
	}

	.card-cost {
		flex-shrink: 0;
	}

	.cost-display {
		display: flex;
		align-items: center;
		gap: var(--space-1);
		padding: var(--space-1) var(--space-2);
		background: rgba(0, 0, 0, 0.3);
		border: 1px solid rgba(139, 92, 246, 0.3);
	}

	.cost-display.affordable {
		border-color: rgba(236, 72, 153, 0.6);
		background: rgba(236, 72, 153, 0.1);
	}

	.cost-icon {
		font-size: 10px;
	}

	.cost-value {
		font-size: var(--font-size-sm);
		color: #fca5a5;
	}

	.cost-display.affordable .cost-value {
		color: #86efac;
	}

	.max-badge {
		font-size: 10px;
		color: #c084fc;
		background: rgba(139, 92, 246, 0.2);
		padding: var(--space-1) var(--space-2);
		letter-spacing: 0.1em;
		border: 1px solid rgba(139, 92, 246, 0.4);
	}

	/* Empty State */
	.empty-state {
		flex: 1;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: var(--space-3);
		padding: var(--space-6);
	}

	.empty-icon {
		font-size: 48px;
		opacity: 0.3;
	}

	.empty-text {
		font-family: var(--font-family);
		font-size: var(--font-size-sm);
		color: var(--color-text-muted);
		text-align: center;
		margin: 0;
	}

	/* ============================================
	   PRESTIGE PROGRESS SECTION
	   ============================================ */
	.prestige-progress-section {
		flex-shrink: 0;
		padding: var(--space-3);
		background: rgba(0, 0, 0, 0.3);
		border-bottom: 1px solid rgba(139, 92, 246, 0.2);
	}

	/* Progress Container */
	.progress-container {
		display: flex;
		flex-direction: column;
		gap: var(--space-2);
	}

	.progress-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
	}

	.progress-label {
		font-family: var(--font-family);
		font-size: 10px;
		color: var(--color-text-muted);
		letter-spacing: 0.1em;
		text-transform: uppercase;
	}

	.progress-value {
		display: flex;
		align-items: center;
		gap: var(--space-1);
		font-family: var(--font-family);
		font-size: var(--font-size-xs);
		color: #c084fc;
	}

	.progress-icon {
		font-size: 10px;
	}

	.progress-bar-container {
		display: flex;
		align-items: center;
		gap: var(--space-2);
	}

	.progress-bar-bg {
		flex: 1;
		height: 8px;
		background: rgba(0, 0, 0, 0.5);
		border: 1px solid rgba(139, 92, 246, 0.3);
		position: relative;
		overflow: hidden;
	}

	.progress-bar-fill {
		height: 100%;
		background: linear-gradient(90deg, #8b5cf6 0%, #ec4899 100%);
		transition: width 0.3s ease;
	}

	.progress-bar-shimmer {
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
		animation: progressShimmer 2s linear infinite;
	}

	@keyframes progressShimmer {
		0% { left: -100%; }
		100% { left: 100%; }
	}

	.progress-percent {
		font-family: var(--font-family);
		font-size: 10px;
		color: var(--color-text-muted);
		width: 32px;
		text-align: right;
	}

	/* Prestige Action Button */
	.prestige-action-btn {
		position: relative;
		width: 100%;
		font-family: var(--font-family);
		padding: var(--space-3);
		background: linear-gradient(135deg, #7c3aed 0%, #db2777 100%);
		border: 3px solid #581c87;
		color: white;
		cursor: pointer;
		overflow: hidden;
		box-shadow:
			0 4px 0 #581c87,
			0 0 20px rgba(139, 92, 246, 0.4);
		transition: all 0.15s ease;
	}

	.prestige-action-btn:hover {
		transform: translateY(-2px);
		box-shadow:
			0 6px 0 #581c87,
			0 0 30px rgba(139, 92, 246, 0.6);
	}

	.prestige-action-btn:active {
		transform: translateY(2px);
		box-shadow:
			0 2px 0 #581c87,
			0 0 15px rgba(139, 92, 246, 0.3);
	}

	.prestige-btn-glow {
		position: absolute;
		inset: -4px;
		background: linear-gradient(45deg, #8b5cf6, #ec4899, #f59e0b, #10b981, #8b5cf6);
		background-size: 400% 400%;
		animation: btnGlow 3s linear infinite;
		z-index: -1;
		filter: blur(8px);
		opacity: 0.6;
	}

	@keyframes btnGlow {
		0% { background-position: 0% 50%; }
		50% { background-position: 100% 50%; }
		100% { background-position: 0% 50%; }
	}

	.prestige-btn-content {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: var(--space-2);
		position: relative;
		z-index: 1;
	}

	.prestige-sparkle {
		font-size: var(--font-size-md);
		animation: sparkleFloat 1s ease-in-out infinite;
	}

	.prestige-sparkle:last-child {
		animation-delay: 0.5s;
	}

	@keyframes sparkleFloat {
		0%, 100% { transform: translateY(0) scale(1); }
		50% { transform: translateY(-3px) scale(1.1); }
	}

	.prestige-label {
		font-size: var(--font-size-sm);
		font-weight: bold;
		letter-spacing: 0.1em;
		text-shadow: 0 2px 4px rgba(0, 0, 0, 0.5);
	}

	.prestige-gain-badge {
		position: absolute;
		top: -8px;
		right: -8px;
		display: flex;
		align-items: center;
		gap: var(--space-1);
		padding: var(--space-1) var(--space-2);
		background: linear-gradient(135deg, #fde047 0%, #f59e0b 100%);
		border: 2px solid #92400e;
		font-size: 10px;
		color: #1c1917;
		font-weight: bold;
		animation: badgePulse 1.5s ease-in-out infinite;
		z-index: 2;
	}

	@keyframes badgePulse {
		0%, 100% { transform: scale(1); }
		50% { transform: scale(1.05); }
	}

	.gain-icon {
		font-size: 10px;
	}

	.gain-value {
		font-family: var(--font-family);
	}

	/* Mobile responsive */
	@media (max-width: 400px) {
		.shop-header {
			flex-wrap: wrap;
			padding: var(--space-2);
		}

		.prestige-progress-section {
			padding: var(--space-2);
		}

		.upgrades-grid {
			padding: var(--space-2);
		}

		.upgrade-card {
			padding: var(--space-2);
		}

		.card-icon {
			width: 36px;
			height: 36px;
			font-size: var(--font-size-xl);
		}
	}
</style>
