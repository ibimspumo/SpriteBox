<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { goto } from '$app/navigation';
	import { t } from '$lib/i18n';
	import {
		idlePixelPhase,
		isInitialized,
		initializeIdlePixel,
		startNewGame,
		continueGame,
		cleanup,
		offlineReport,
		currency,
		productionPerSecond,
		clickerState,
		harvestEnergy,
		collectGoldenPixel,
		getGoldenPixelBonus,
		buyPixel,
		buyMaxPixels,
		nextPixelInfo,
		emptySlots,
		pixelCount,
		productionBreakdown,
		performPrestige,
		cancelPrestige
	} from '$lib/idle-pixel';
	import { IDLE_PIXEL_COLORS } from '@spritebox/types';
	import { formatBigNumber } from '$lib/idle-pixel/utils/format';
	import IdleGrid from './IdleGrid.svelte';
	import IdleCurrencyDisplay from './IdleCurrencyDisplay.svelte';
	import IdleOfflineReport from './IdleOfflineReport.svelte';
	import IdleUpgradePanel from './IdleUpgradePanel.svelte';
	import IdlePixelDebug from './IdlePixelDebug.svelte';
	import IdleSaveIndicator from './IdleSaveIndicator.svelte';
	import IdleEnergyBar from './IdleEnergyBar.svelte';
	import IdleGoldenPixel from './IdleGoldenPixel.svelte';
	import IdlePrestigeShop from './IdlePrestigeShop.svelte';
	import IdlePrestigeConfirmModal from './IdlePrestigeConfirmModal.svelte';
	import IdleAchievementPopup from './IdleAchievementPopup.svelte';

	// Active tab states
	type MobileTab = 'grid' | 'upgrades' | 'prestige';
	type RightPanelTab = 'upgrades' | 'prestige';
	let activeMobileTab = $state<MobileTab>('grid');
	let activeRightTab = $state<RightPanelTab>('upgrades');

	// Buy button feedback
	let buyButtonFeedback = $state<'idle' | 'success' | 'error'>('idle');
	let buyMaxFeedback = $state(0);

	// Derived clicker state
	const energyCurrent = $derived($clickerState?.energyBarCurrent ?? 0);
	const energyMax = $derived($clickerState?.energyBarMax ?? 100);
	const goldenActive = $derived($clickerState?.goldenPixelActive ?? false);
	const goldenTimeLeft = $derived($clickerState?.goldenPixelTimeLeft ?? 0);
	const goldenBonus = $derived(getGoldenPixelBonus());

	// Derived buy info
	const previewColor = $derived(IDLE_PIXEL_COLORS[$nextPixelInfo.newColorLevel]);
	const canBuy = $derived($nextPixelInfo.canAfford && $nextPixelInfo.hasSpace);
	const noSpace = $derived(!$nextPixelInfo.hasSpace);

	onMount(() => {
		initializeIdlePixel();
	});

	onDestroy(() => {
		cleanup();
	});

	function handleStartGame() {
		startNewGame();
	}

	function handleContinue() {
		continueGame();
	}

	function setMobileTab(tab: MobileTab) {
		activeMobileTab = tab;
	}

	function setRightTab(tab: RightPanelTab) {
		activeRightTab = tab;
	}

	function handleHarvestEnergy() {
		harvestEnergy();
	}

	function handleCollectGolden() {
		collectGoldenPixel();
	}

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

	// Prestige handlers
	function handlePrestigeConfirm() {
		performPrestige();
	}

	function handlePrestigeCancel() {
		cancelPrestige();
	}

	// Navigate back to mode selection
	function goBack(): void {
		goto('/play');
	}
</script>

<div class="idle-pixel-container">
	<!-- CRT Monitor Frame -->
	<div class="crt-frame">
		<!-- Scanline overlay -->
		<div class="scanlines"></div>

		<!-- Screen glow -->
		<div class="screen-glow"></div>

		<!-- Main content -->
		<div class="screen-content">
			{#if !$isInitialized}
				<!-- Loading state -->
				<div class="loading-screen">
					<div class="loading-pixel"></div>
					<span class="loading-text">{$t.idlePixel.loading}</span>
				</div>
			{:else if $idlePixelPhase === 'menu'}
				<!-- Main Menu -->
				<div class="menu-screen">
					<h1 class="game-title">
						<span class="title-pixel">◼</span>
						{$t.idlePixel.title}
						<span class="title-pixel">◼</span>
					</h1>

					<div class="menu-subtitle">{$t.idlePixel.subtitle}</div>

					<div class="menu-decoration">
						<span class="deco-pixel c0">◼</span>
						<span class="deco-pixel c1">◼</span>
						<span class="deco-pixel c2">◼</span>
						<span class="deco-pixel c3">◼</span>
						<span class="deco-pixel c4">◼</span>
					</div>

					<button class="start-button" onclick={handleStartGame}>
						<span class="btn-icon">▶</span>
						{$t.idlePixel.menu.startGame}
					</button>

					<div class="menu-hints">
						<p>{$t.idlePixel.menu.hint1}</p>
						<p>{$t.idlePixel.menu.hint2}</p>
					</div>

					<button class="back-link" onclick={goBack}>
						← {$t.common.backToModes}
					</button>
				</div>
			{:else if $idlePixelPhase === 'offline-report'}
				<!-- Offline Report -->
				<IdleOfflineReport
					seconds={$offlineReport?.seconds ?? 0}
					earnings={$offlineReport?.earnings ?? 0}
					onContinue={handleContinue}
				/>
			{:else if $idlePixelPhase === 'playing'}
				<!-- Game Screen - Responsive Layout -->
				<div class="game-screen">
					<!-- Header with currency (sticky on mobile) -->
					<header class="game-header">
						<button class="header-back-btn" onclick={goBack} aria-label={$t.common.backToModes}>
							←
						</button>
						<IdleCurrencyDisplay
							value={$currency}
							perSecond={$productionPerSecond}
						/>
						<div class="header-status">
							<IdleSaveIndicator />
						</div>
					</header>

					<!-- Tab navigation (mobile only) -->
					<nav class="game-tabs mobile-only">
						<button
							class="tab-btn"
							class:active={activeMobileTab === 'grid'}
							onclick={() => setMobileTab('grid')}
						>
							<span class="tab-icon">◼</span>
							{$t.idlePixel.tabs.grid}
						</button>
						<button
							class="tab-btn"
							class:active={activeMobileTab === 'upgrades'}
							onclick={() => setMobileTab('upgrades')}
						>
							<span class="tab-icon">⚡</span>
							{$t.idlePixel.upgrades.title}
						</button>
						<button
							class="tab-btn prestige-tab"
							class:active={activeMobileTab === 'prestige'}
							onclick={() => setMobileTab('prestige')}
						>
							<span class="tab-icon">💎</span>
							{$t.idlePixel.prestige.title}
						</button>
					</nav>

					<!-- Desktop: Two-column layout -->
					<!-- Mobile: Tab-switched content -->
					<div class="game-layout">
						<!-- Left Column: Grid Area -->
						<section class="grid-column" class:hidden-mobile={activeMobileTab !== 'grid'}>
							<!-- Energy bar -->
							<div class="energy-section">
								<IdleEnergyBar
									current={energyCurrent}
									max={energyMax}
									onHarvest={handleHarvestEnergy}
								/>
							</div>

							<!-- Grid with golden pixel overlay -->
							<div class="grid-wrapper">
								<IdleGrid />
								<IdleGoldenPixel
									active={goldenActive}
									timeLeft={goldenTimeLeft}
									bonusValue={goldenBonus}
									onCollect={handleCollectGolden}
								/>
							</div>

							<!-- Stats row (desktop) -->
							<div class="stats-row desktop-only">
								<div class="stat">
									<span class="stat-label">{$t.idlePixel.stats.pixels}</span>
									<span class="stat-value">{$pixelCount}</span>
								</div>
								<div class="stat">
									<span class="stat-label">{$t.idlePixel.stats.empty}</span>
									<span class="stat-value">{$emptySlots}</span>
								</div>
								<div class="stat">
									<span class="stat-label">{$t.idlePixel.stats.best}</span>
									<span class="stat-value" style="color: {IDLE_PIXEL_COLORS[$productionBreakdown.highestColorLevel]};">
										{$t.idlePixel.level}{$productionBreakdown.highestColorLevel + 1}
									</span>
								</div>
							</div>

							<!-- Buy buttons (desktop) -->
							<div class="buy-section desktop-only">
								<button
									class="buy-button"
									class:success={buyButtonFeedback === 'success'}
									class:error={buyButtonFeedback === 'error'}
									class:disabled={!canBuy}
									onclick={handleBuyPixel}
									disabled={!canBuy}
								>
									<div class="button-content">
										<div class="pixel-preview" style="--preview-color: {previewColor};"></div>
										<div class="button-text">
											{#if noSpace}
												<span class="btn-label">{$t.idlePixel.buy.noSpace}</span>
											{:else}
												<span class="btn-label">{$t.idlePixel.buy.buyPixel}</span>
												<span class="btn-cost" class:affordable={$nextPixelInfo.canAfford}>
													{formatBigNumber($nextPixelInfo.cost)}
												</span>
											{/if}
										</div>
									</div>
									<div class="button-shine"></div>
								</button>
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
										<span class="max-label">{$t.idlePixel.max}</span>
									{/if}
								</button>
							</div>
						</section>

						<!-- Right Column: Upgrades / Prestige with tabs on desktop -->
						<section class="right-column" class:hidden-mobile={activeMobileTab === 'grid'}>
							<!-- Desktop tabs for right panel -->
							<nav class="right-panel-tabs desktop-only">
								<button
									class="right-tab-btn"
									class:active={activeRightTab === 'upgrades'}
									onclick={() => setRightTab('upgrades')}
								>
									<span class="tab-icon">⚡</span>
									{$t.idlePixel.upgrades.title}
								</button>
								<button
									class="right-tab-btn prestige-tab"
									class:active={activeRightTab === 'prestige'}
									onclick={() => setRightTab('prestige')}
								>
									<span class="tab-icon">💎</span>
									{$t.idlePixel.prestige.title}
								</button>
							</nav>

							<!-- Upgrades Panel (mobile: own tab, desktop: right tab) -->
							<div
								class="panel-content upgrades-panel"
								class:hidden-mobile={activeMobileTab !== 'upgrades'}
								class:hidden-desktop={activeRightTab !== 'upgrades'}
							>
								<div class="upgrades-scroll">
									<IdleUpgradePanel />
								</div>
							</div>

							<!-- Prestige Panel (mobile: own tab, desktop: right tab) -->
							<div
								class="panel-content prestige-panel"
								class:hidden-mobile={activeMobileTab !== 'prestige'}
								class:hidden-desktop={activeRightTab !== 'prestige'}
							>
								<IdlePrestigeShop />
							</div>
						</section>
					</div>

					<!-- Mobile Bottom Action Bar -->
					<footer class="mobile-action-bar mobile-only">
						<!-- Stats -->
						<div class="mobile-stats">
							<div class="mini-stat">
								<span class="mini-label">{$t.idlePixel.stats.pixelsShort}</span>
								<span class="mini-value">{$pixelCount}</span>
							</div>
							<div class="mini-stat">
								<span class="mini-label">{$t.idlePixel.stats.empty}</span>
								<span class="mini-value">{$emptySlots}</span>
							</div>
							<div class="mini-stat">
								<span class="mini-label">{$t.idlePixel.stats.best}</span>
								<span class="mini-value" style="color: {IDLE_PIXEL_COLORS[$productionBreakdown.highestColorLevel]};">
									{$t.idlePixel.level}{$productionBreakdown.highestColorLevel + 1}
								</span>
							</div>
						</div>

						<!-- Buy buttons -->
						<div class="mobile-buy-row">
							<button
								class="mobile-buy-button"
								class:success={buyButtonFeedback === 'success'}
								class:error={buyButtonFeedback === 'error'}
								class:disabled={!canBuy}
								onclick={handleBuyPixel}
								disabled={!canBuy}
							>
								<div class="pixel-preview-small" style="--preview-color: {previewColor};"></div>
								<div class="mobile-buy-text">
									{#if noSpace}
										<span>{$t.idlePixel.buy.noSpace}</span>
									{:else}
										<span>{$t.idlePixel.buy.buyPixel}</span>
										<span class="mobile-cost" class:affordable={$nextPixelInfo.canAfford}>
											{formatBigNumber($nextPixelInfo.cost)}
										</span>
									{/if}
								</div>
							</button>
							<button
								class="mobile-max-button"
								class:active={buyMaxFeedback > 0}
								onclick={handleBuyMax}
								disabled={!canBuy}
							>
								{#if buyMaxFeedback > 0}
									<span class="max-feedback">+{buyMaxFeedback}</span>
								{:else}
									<span>{$t.idlePixel.max}</span>
								{/if}
							</button>
						</div>
					</footer>
				</div>
			{/if}
		</div>

		<!-- Corner decorations -->
		<div class="corner-deco top-left"></div>
		<div class="corner-deco top-right"></div>
		<div class="corner-deco bottom-left"></div>
		<div class="corner-deco bottom-right"></div>
	</div>
</div>

<!-- Debug Panel (DEV MODE ONLY) -->
<IdlePixelDebug />

<!-- Prestige Confirmation Modal -->
<IdlePrestigeConfirmModal
	show={$idlePixelPhase === 'prestige-confirm'}
	onConfirm={handlePrestigeConfirm}
	onCancel={handlePrestigeCancel}
/>

<!-- Achievement Popup -->
<IdleAchievementPopup />

<style>
	/* ============================================
	   BASE CONTAINER & CRT FRAME
	   ============================================ */
	.idle-pixel-container {
		width: 100%;
		min-height: 100vh;
		min-height: 100dvh;
		background: linear-gradient(135deg, #0a0a1a 0%, #1a0a2e 50%, #0a1a2a 100%);
		display: flex;
		align-items: center;
		justify-content: center;
		padding: var(--space-2);
		box-sizing: border-box;
		overflow: hidden;
		position: relative;
	}

	/* Ambient background glow */
	.idle-pixel-container::before {
		content: '';
		position: absolute;
		top: 50%;
		left: 50%;
		transform: translate(-50%, -50%);
		width: 150%;
		height: 150%;
		background: radial-gradient(ellipse at center, rgba(78, 205, 196, 0.05) 0%, transparent 60%);
		pointer-events: none;
	}

	.crt-frame {
		position: relative;
		background: linear-gradient(145deg, #1a1a2e 0%, #0f0f1a 100%);
		border: 6px solid #2a2a4a;
		border-radius: 20px;
		padding: var(--space-3);
		box-shadow:
			0 0 0 4px #1a1a3a,
			0 0 40px rgba(78, 205, 196, 0.15),
			inset 0 0 60px rgba(0, 0, 0, 0.5);
		width: 100%;
		max-width: 480px;
		height: calc(100vh - var(--space-4));
		height: calc(100dvh - var(--space-4));
		max-height: 800px;
		overflow: hidden;
		display: flex;
		flex-direction: column;
	}

	/* CRT Scanlines */
	.scanlines {
		position: absolute;
		inset: 0;
		background: repeating-linear-gradient(
			0deg,
			transparent 0px,
			transparent 2px,
			rgba(0, 0, 0, 0.15) 2px,
			rgba(0, 0, 0, 0.15) 4px
		);
		pointer-events: none;
		z-index: 100;
		border-radius: 16px;
	}

	/* Screen glow effect */
	.screen-glow {
		position: absolute;
		inset: 10px;
		background: radial-gradient(ellipse at center, rgba(78, 205, 196, 0.03) 0%, transparent 70%);
		pointer-events: none;
		z-index: 1;
		border-radius: 12px;
		animation: screenFlicker 4s ease-in-out infinite;
	}

	@keyframes screenFlicker {
		0%, 100% { opacity: 1; }
		50% { opacity: 0.97; }
		52% { opacity: 1; }
		54% { opacity: 0.98; }
	}

	.screen-content {
		position: relative;
		z-index: 10;
		flex: 1;
		display: flex;
		flex-direction: column;
		min-height: 0;
		overflow: hidden;
	}

	/* Corner decorations */
	.corner-deco {
		position: absolute;
		width: 12px;
		height: 12px;
		background: #4ecdc4;
		z-index: 50;
	}

	.corner-deco::before {
		content: '';
		position: absolute;
		background: #4ecdc4;
	}

	.top-left { top: 8px; left: 8px; }
	.top-left::before { width: 4px; height: 20px; top: 12px; left: 0; }

	.top-right { top: 8px; right: 8px; }
	.top-right::before { width: 4px; height: 20px; top: 12px; right: 0; }

	.bottom-left { bottom: 8px; left: 8px; }
	.bottom-left::before { width: 4px; height: 20px; bottom: 12px; left: 0; }

	.bottom-right { bottom: 8px; right: 8px; }
	.bottom-right::before { width: 4px; height: 20px; bottom: 12px; right: 0; }

	/* ============================================
	   LOADING SCREEN
	   ============================================ */
	.loading-screen {
		flex: 1;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: var(--space-4);
	}

	.loading-pixel {
		width: 32px;
		height: 32px;
		background: var(--color-accent);
		animation: loadingPulse 0.6s ease-in-out infinite;
		box-shadow: 0 0 20px var(--color-accent);
	}

	@keyframes loadingPulse {
		0%, 100% { transform: scale(1); opacity: 1; }
		50% { transform: scale(0.8); opacity: 0.6; }
	}

	.loading-text {
		font-family: var(--font-family);
		font-size: var(--font-size-sm);
		color: var(--color-text-muted);
		letter-spacing: 0.2em;
		animation: blink 1s step-end infinite;
	}

	@keyframes blink {
		0%, 100% { opacity: 1; }
		50% { opacity: 0; }
	}

	/* ============================================
	   MENU SCREEN
	   ============================================ */
	.menu-screen {
		flex: 1;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: var(--space-6);
		padding: var(--space-4);
		text-align: center;
	}

	.game-title {
		font-family: var(--font-family);
		font-size: clamp(1.5rem, 6vw, 2.5rem);
		color: var(--color-brand);
		text-shadow:
			0 0 10px var(--color-brand),
			0 0 30px var(--color-brand),
			4px 4px 0 rgba(0, 0, 0, 0.5);
		margin: 0;
		display: flex;
		align-items: center;
		gap: var(--space-3);
		animation: titleGlow 2s ease-in-out infinite;
	}

	@keyframes titleGlow {
		0%, 100% { filter: brightness(1); }
		50% { filter: brightness(1.2); }
	}

	.title-pixel {
		font-size: 0.6em;
		color: var(--color-accent);
		animation: pixelPop 1.5s ease-in-out infinite;
	}

	.title-pixel:last-child {
		animation-delay: 0.75s;
	}

	@keyframes pixelPop {
		0%, 100% { transform: scale(1) rotate(0deg); }
		50% { transform: scale(1.2) rotate(45deg); }
	}

	.menu-subtitle {
		font-family: var(--font-family);
		font-size: var(--font-size-xs);
		color: var(--color-text-muted);
		letter-spacing: 0.3em;
	}

	.menu-decoration {
		display: flex;
		gap: var(--space-2);
		padding: var(--space-4) 0;
	}

	.deco-pixel {
		font-size: var(--font-size-lg);
		animation: decoFloat 2s ease-in-out infinite;
	}

	.deco-pixel.c0 { color: #000000; animation-delay: 0s; text-shadow: 0 0 5px #333; }
	.deco-pixel.c1 { color: #5c3a21; animation-delay: 0.2s; text-shadow: 0 0 5px #5c3a21; }
	.deco-pixel.c2 { color: #ff0000; animation-delay: 0.4s; text-shadow: 0 0 8px #ff0000; }
	.deco-pixel.c3 { color: #ff8800; animation-delay: 0.6s; text-shadow: 0 0 8px #ff8800; }
	.deco-pixel.c4 { color: #ffff00; animation-delay: 0.8s; text-shadow: 0 0 10px #ffff00; }

	@keyframes decoFloat {
		0%, 100% { transform: translateY(0); }
		50% { transform: translateY(-6px); }
	}

	.start-button {
		font-family: var(--font-family);
		font-size: var(--font-size-md);
		padding: var(--space-4) var(--space-8);
		background: linear-gradient(180deg, #22c55e 0%, #16a34a 100%);
		color: white;
		border: 4px solid #14532d;
		cursor: pointer;
		box-shadow:
			0 6px 0 #14532d,
			0 0 20px rgba(34, 197, 94, 0.4);
		transition: all 0.1s ease;
		display: flex;
		align-items: center;
		gap: var(--space-3);
	}

	.start-button:hover {
		transform: translateY(-2px);
		box-shadow:
			0 8px 0 #14532d,
			0 0 30px rgba(34, 197, 94, 0.6);
	}

	.start-button:active {
		transform: translateY(4px);
		box-shadow:
			0 2px 0 #14532d,
			0 0 15px rgba(34, 197, 94, 0.3);
	}

	.btn-icon {
		font-size: 1.2em;
	}

	.menu-hints {
		font-family: var(--font-family);
		font-size: var(--font-size-xs);
		color: var(--color-text-muted);
		line-height: 2;
	}

	.menu-hints p {
		margin: 0;
	}

	/* Back link in menu */
	.back-link {
		display: inline-flex;
		align-items: center;
		gap: var(--space-1);
		padding: var(--space-2) var(--space-3);
		background: transparent;
		border: none;
		font-family: var(--font-family);
		font-size: var(--font-size-sm);
		color: var(--color-text-muted);
		cursor: pointer;
		transition: color 0.15s ease;
		margin-top: var(--space-2);
	}

	.back-link:hover {
		color: var(--color-accent);
	}

	/* ============================================
	   GAME SCREEN - MOBILE FIRST
	   ============================================ */
	.game-screen {
		flex: 1;
		display: flex;
		flex-direction: column;
		min-height: 0;
		overflow: hidden;
	}

	.game-header {
		flex-shrink: 0;
		display: flex;
		flex-direction: row;
		align-items: center;
		gap: var(--space-2);
		padding: var(--space-1);
	}

	.header-back-btn {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 32px;
		height: 32px;
		background: rgba(0, 0, 0, 0.4);
		border: 2px solid var(--color-border);
		color: var(--color-text-muted);
		font-size: var(--font-size-md);
		cursor: pointer;
		transition: all 0.15s ease;
		flex-shrink: 0;
	}

	.header-back-btn:hover {
		color: var(--color-accent);
		border-color: var(--color-accent);
		background: rgba(78, 205, 196, 0.1);
	}

	.header-status {
		display: flex;
		justify-content: flex-end;
		margin-left: auto;
	}

	/* Tab Navigation (Mobile) */
	.game-tabs {
		display: flex;
		gap: var(--space-1);
		flex-shrink: 0;
		padding: 0 var(--space-1);
	}

	.tab-btn {
		flex: 1;
		display: flex;
		align-items: center;
		justify-content: center;
		gap: var(--space-2);
		font-family: var(--font-family);
		font-size: 10px;
		padding: var(--space-2);
		background: rgba(0, 0, 0, 0.4);
		border: 2px solid var(--color-border);
		color: var(--color-text-muted);
		cursor: pointer;
		transition: all 0.15s ease;
		letter-spacing: 0.1em;
	}

	.tab-btn:hover {
		background: rgba(78, 205, 196, 0.1);
		border-color: var(--color-accent);
		color: var(--color-text-secondary);
	}

	.tab-btn.active {
		background: rgba(78, 205, 196, 0.2);
		border-color: var(--color-accent);
		color: var(--color-accent);
		box-shadow: 0 0 10px rgba(78, 205, 196, 0.2);
	}

	.tab-icon {
		font-size: 12px;
	}

	/* Game Layout Container */
	.game-layout {
		flex: 1;
		display: flex;
		flex-direction: column;
		min-height: 0;
		overflow: hidden;
		padding: var(--space-1);
	}

	/* Grid Column */
	.grid-column {
		flex: 1;
		display: flex;
		flex-direction: column;
		gap: var(--space-2);
		min-height: 0;
	}

	.energy-section {
		flex-shrink: 0;
	}

	.grid-wrapper {
		position: relative;
		flex: 1;
		display: flex;
		align-items: center;
		justify-content: center;
		min-height: 0;
	}

	/* ============================================
	   RIGHT COLUMN (Upgrades / Prestige)
	   ============================================ */
	.right-column {
		flex: 1;
		display: flex;
		flex-direction: column;
		min-height: 0;
		overflow: hidden;
	}

	/* Desktop tabs for right panel */
	.right-panel-tabs {
		display: flex;
		gap: var(--space-1);
		flex-shrink: 0;
		padding: var(--space-2);
		background: rgba(0, 0, 0, 0.2);
		border-bottom: 1px solid var(--color-border);
	}

	.right-tab-btn {
		flex: 1;
		display: flex;
		align-items: center;
		justify-content: center;
		gap: var(--space-2);
		font-family: var(--font-family);
		font-size: 11px;
		padding: var(--space-2);
		background: rgba(0, 0, 0, 0.3);
		border: 2px solid var(--color-border);
		color: var(--color-text-muted);
		cursor: pointer;
		transition: all 0.15s ease;
		letter-spacing: 0.1em;
	}

	.right-tab-btn:hover {
		background: rgba(78, 205, 196, 0.1);
		border-color: var(--color-accent);
		color: var(--color-text-secondary);
	}

	.right-tab-btn.active {
		background: rgba(78, 205, 196, 0.2);
		border-color: var(--color-accent);
		color: var(--color-accent);
		box-shadow: 0 0 10px rgba(78, 205, 196, 0.2);
	}

	.right-tab-btn.prestige-tab {
		background: linear-gradient(135deg, rgba(139, 92, 246, 0.1) 0%, rgba(236, 72, 153, 0.1) 100%);
		border-color: rgba(139, 92, 246, 0.3);
	}

	.right-tab-btn.prestige-tab:hover {
		background: linear-gradient(135deg, rgba(139, 92, 246, 0.2) 0%, rgba(236, 72, 153, 0.2) 100%);
		border-color: rgba(139, 92, 246, 0.5);
	}

	.right-tab-btn.prestige-tab.active {
		background: linear-gradient(135deg, rgba(139, 92, 246, 0.3) 0%, rgba(236, 72, 153, 0.3) 100%);
		border-color: #8b5cf6;
		color: #c084fc;
		box-shadow: 0 0 10px rgba(139, 92, 246, 0.3);
	}

	/* Panel content */
	.panel-content {
		flex: 1;
		display: flex;
		flex-direction: column;
		min-height: 0;
		overflow: hidden;
	}

	.upgrades-scroll {
		flex: 1;
		overflow-y: auto;
		overflow-x: hidden;
		min-height: 0;
	}

	/* Custom scrollbar for upgrades */
	.upgrades-scroll::-webkit-scrollbar {
		width: 6px;
	}

	.upgrades-scroll::-webkit-scrollbar-track {
		background: rgba(0, 0, 0, 0.2);
	}

	.upgrades-scroll::-webkit-scrollbar-thumb {
		background: var(--color-accent);
		opacity: 0.5;
	}

	/* Mobile prestige tab styling */
	.prestige-tab {
		background: linear-gradient(135deg, rgba(139, 92, 246, 0.1) 0%, rgba(236, 72, 153, 0.1) 100%);
		border-color: rgba(139, 92, 246, 0.3);
	}

	.prestige-tab:hover {
		background: linear-gradient(135deg, rgba(139, 92, 246, 0.2) 0%, rgba(236, 72, 153, 0.2) 100%);
		border-color: rgba(139, 92, 246, 0.5);
	}

	.prestige-tab.active {
		background: linear-gradient(135deg, rgba(139, 92, 246, 0.3) 0%, rgba(236, 72, 153, 0.3) 100%);
		border-color: #8b5cf6;
		color: #c084fc;
	}

	/* ============================================
	   STATS ROW (Desktop)
	   ============================================ */
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

	/* ============================================
	   BUY SECTION (Desktop)
	   ============================================ */
	.buy-section {
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

	.buy-button.error {
		animation: buttonError 0.2s ease;
	}

	@keyframes buttonSuccess {
		0%, 100% { transform: scale(1); }
		50% { transform: scale(0.95); }
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

	/* Buy Max Button */
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

	/* ============================================
	   MOBILE BOTTOM ACTION BAR
	   ============================================ */
	.mobile-action-bar {
		flex-shrink: 0;
		display: flex;
		flex-direction: column;
		gap: var(--space-2);
		padding: var(--space-2);
		background: rgba(0, 0, 0, 0.6);
		border-top: 2px solid var(--color-border);
	}

	.mobile-stats {
		display: flex;
		justify-content: space-around;
		padding: var(--space-1) 0;
	}

	.mini-stat {
		display: flex;
		align-items: center;
		gap: var(--space-1);
	}

	.mini-label {
		font-family: var(--font-family);
		font-size: 8px;
		color: var(--color-text-muted);
	}

	.mini-value {
		font-family: var(--font-family);
		font-size: var(--font-size-xs);
		color: var(--color-text-primary);
	}

	.mobile-buy-row {
		display: flex;
		gap: var(--space-2);
	}

	.mobile-buy-button {
		flex: 1;
		display: flex;
		align-items: center;
		justify-content: center;
		gap: var(--space-2);
		font-family: var(--font-family);
		font-size: var(--font-size-xs);
		padding: var(--space-2) var(--space-3);
		background: linear-gradient(180deg, #2563eb 0%, #1d4ed8 100%);
		border: 2px solid #1e3a8a;
		color: white;
		cursor: pointer;
		transition: all 0.15s ease;
	}

	.mobile-buy-button:disabled,
	.mobile-buy-button.disabled {
		background: linear-gradient(180deg, #4b5563 0%, #374151 100%);
		border-color: #1f2937;
		opacity: 0.7;
		cursor: not-allowed;
	}

	.mobile-buy-button.success {
		animation: buttonSuccess 0.2s ease;
	}

	.mobile-buy-button.error {
		animation: buttonError 0.2s ease;
	}

	.pixel-preview-small {
		width: 14px;
		height: 14px;
		background: var(--preview-color);
		box-shadow: 0 0 6px var(--preview-color);
	}

	.mobile-buy-text {
		display: flex;
		flex-direction: column;
		align-items: flex-start;
		gap: 1px;
	}

	.mobile-cost {
		font-size: 9px;
		color: #fca5a5;
	}

	.mobile-cost.affordable {
		color: #86efac;
	}

	.mobile-max-button {
		width: 50px;
		font-family: var(--font-family);
		font-size: var(--font-size-xs);
		background: linear-gradient(180deg, #16a34a 0%, #15803d 100%);
		border: 2px solid #14532d;
		color: white;
		display: flex;
		align-items: center;
		justify-content: center;
		cursor: pointer;
		transition: all 0.15s ease;
	}

	.mobile-max-button:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.mobile-max-button.active {
		animation: maxPop 0.3s ease;
	}

	/* ============================================
	   VISIBILITY HELPERS
	   ============================================ */
	.mobile-only {
		display: flex;
	}

	.desktop-only {
		display: none;
	}

	.hidden-mobile {
		display: none !important;
	}

	.hidden-desktop {
		display: flex; /* Show on mobile by default */
	}

	/* ============================================
	   DESKTOP LAYOUT (min-width: 768px)
	   ============================================ */
	@media (min-width: 768px) {
		.idle-pixel-container {
			padding: var(--space-4);
		}

		.crt-frame {
			max-width: 900px;
			max-height: none;
			height: auto;
			min-height: 500px;
			max-height: calc(100vh - var(--space-8));
			aspect-ratio: auto;
			padding: var(--space-4);
		}

		.screen-content {
			overflow: visible;
		}

		.game-screen {
			gap: var(--space-3);
		}

		.game-header {
			flex-direction: row;
			justify-content: space-between;
			align-items: center;
			padding: var(--space-2);
		}

		/* Hide mobile elements */
		.mobile-only {
			display: none !important;
		}

		/* Show desktop elements */
		.desktop-only {
			display: flex;
		}

		/* Hide elements with hidden-desktop on desktop */
		.hidden-desktop {
			display: none !important;
		}

		/* Two-column layout */
		.game-layout {
			flex: 1;
			flex-direction: row;
			gap: var(--space-4);
			padding: var(--space-2);
			min-height: 0;
		}

		.grid-column {
			flex: 0 0 auto;
			width: 320px;
			min-width: 280px;
		}

		.grid-column.hidden-mobile {
			display: flex;
		}

		/* Right column on desktop - always visible */
		.right-column {
			flex: 1;
			min-width: 200px;
			border-left: 2px solid var(--color-border);
			padding-left: var(--space-3);
		}

		.right-column.hidden-mobile {
			display: flex !important;
		}

		/* Panel content visible on desktop based on tab state */
		/* Override hidden-mobile for panels - desktop uses hidden-desktop instead */
		/* Use higher specificity to ensure this overrides the global .hidden-mobile rule */
		.right-column .panel-content.hidden-mobile:not(.hidden-desktop) {
			display: flex !important;
		}

		.right-column .panel-content.hidden-desktop {
			display: none !important;
		}

		.upgrades-scroll {
			flex: 1;
		}

		/* Larger grid on desktop */
		.grid-wrapper {
			flex: 0 0 auto;
		}
	}

	/* ============================================
	   LARGE DESKTOP (min-width: 1024px)
	   ============================================ */
	@media (min-width: 1024px) {
		.crt-frame {
			max-width: 1000px;
		}

		.grid-column {
			width: 360px;
		}
	}

	/* ============================================
	   SMALL MOBILE (max-width: 400px)
	   ============================================ */
	@media (max-width: 400px) {
		.crt-frame {
			border-radius: 12px;
			border-width: 4px;
			padding: var(--space-2);
		}

		.corner-deco {
			width: 8px;
			height: 8px;
		}

		.game-header {
			padding: var(--space-1);
		}

		.game-tabs {
			padding: 0;
		}

		.tab-btn {
			padding: var(--space-1);
			font-size: 9px;
		}
	}
</style>
