<!-- IdlePixelDebug - Debug Panel for Idle Pixel (DEV MODE ONLY) -->
<script lang="ts">
	import { dev } from '$app/environment';
	import {
		idlePixelState,
		idlePixelPhase,
		currency,
		productionPerSecond,
		resetGame,
		saveGame,
		buyUpgrade,
		buyPixel,
		buyMaxPixels,
		getStateSnapshot
	} from '$lib/idle-pixel';
	import { gameLoop } from '$lib/idle-pixel/game-loop.js';
	import { deleteSaveData, exportSaveData, importSaveData } from '$lib/idle-pixel/storage.js';
	import { UPGRADE_DEFINITIONS } from '$lib/idle-pixel/systems/upgrades.js';

	// Only render in dev mode
	if (!dev) {
		// Component won't render
	}

	// Panel state
	let isOpen = $state(false);
	let currencyToAdd = $state(1000);
	let offlineSecondsToSimulate = $state(3600);
	let importData = $state('');
	let statusMessage = $state<{ type: 'success' | 'error'; text: string } | null>(null);

	// Get current state info
	const stateInfo = $derived(() => {
		const state = $idlePixelState;
		if (!state) return null;

		const pixelCount = state.grid.filter(s => s.pixel !== null).length;
		const unlockedSlots = state.grid.filter(s => s.unlocked).length;
		const highestLevel = state.stats.highestColorLevel;
		const upgradeCount = state.upgrades.length;
		const totalUpgradeLevels = state.upgrades.reduce((sum, u) => sum + u.level, 0);

		return {
			currency: state.currency,
			pixelCount,
			unlockedSlots,
			highestLevel,
			upgradeCount,
			totalUpgradeLevels,
			playTime: state.stats.playTime,
			totalEarned: state.stats.totalEarned,
			mergesPerformed: state.stats.mergesPerformed,
			prestigeCount: state.prestige.prestigeCount
		};
	});

	function toggle() {
		isOpen = !isOpen;
	}

	function showStatus(type: 'success' | 'error', text: string) {
		statusMessage = { type, text };
		setTimeout(() => statusMessage = null, 2000);
	}

	// === DEBUG ACTIONS ===

	function addCurrency() {
		const state = getStateSnapshot();
		if (!state) return;

		idlePixelState.update(s => {
			if (!s) return s;
			return {
				...s,
				currency: s.currency + currencyToAdd,
				stats: {
					...s.stats,
					totalEarned: s.stats.totalEarned + currencyToAdd
				}
			};
		});
		gameLoop.setState(getStateSnapshot()!);
		showStatus('success', `+${formatNumber(currencyToAdd)} added`);
	}

	function setCurrency(amount: number) {
		idlePixelState.update(s => {
			if (!s) return s;
			return { ...s, currency: amount };
		});
		gameLoop.setState(getStateSnapshot()!);
		showStatus('success', `Set to ${formatNumber(amount)}`);
	}

	function simulateOfflineProgress() {
		gameLoop.applyOfflineProgress(offlineSecondsToSimulate);
		showStatus('success', `Simulated ${formatTime(offlineSecondsToSimulate)}`);
	}

	function handleResetGame() {
		if (confirm('Really reset ALL game data?')) {
			resetGame();
			showStatus('success', 'Game reset');
		}
	}

	function handleSaveGame() {
		const success = saveGame();
		showStatus(success ? 'success' : 'error', success ? 'Saved!' : 'Save failed');
	}

	function handleDeleteSave() {
		if (confirm('Delete save data? This cannot be undone!')) {
			deleteSaveData();
			showStatus('success', 'Save deleted');
		}
	}

	function handleExportSave() {
		const data = exportSaveData();
		if (data) {
			navigator.clipboard.writeText(data);
			showStatus('success', 'Copied to clipboard');
		} else {
			showStatus('error', 'No save data');
		}
	}

	function handleImportSave() {
		if (!importData.trim()) {
			showStatus('error', 'Paste save data first');
			return;
		}
		const success = importSaveData(importData);
		if (success) {
			showStatus('success', 'Imported! Reload to apply');
			importData = '';
		} else {
			showStatus('error', 'Invalid save data');
		}
	}

	function buyAllUpgrades() {
		let bought = 0;
		for (const def of UPGRADE_DEFINITIONS) {
			// Buy up to 10 levels of each upgrade
			for (let i = 0; i < 10; i++) {
				if (buyUpgrade(def.id)) {
					bought++;
				}
			}
		}
		showStatus('success', `Bought ${bought} upgrades`);
	}

	function fillGrid() {
		let bought = 0;
		// Buy max pixels until grid is full
		for (let i = 0; i < 64; i++) {
			if (buyPixel()) {
				bought++;
			} else {
				break;
			}
		}
		showStatus('success', `Added ${bought} pixels`);
	}

	function maxOutGame() {
		// Give lots of currency
		setCurrency(1e15);
		// Buy all upgrades
		buyAllUpgrades();
		// Fill grid
		fillGrid();
		showStatus('success', 'Maxed out!');
	}

	function toggleGameLoop() {
		if (gameLoop.isActive()) {
			gameLoop.stop();
			showStatus('success', 'Loop stopped');
		} else {
			gameLoop.start();
			showStatus('success', 'Loop started');
		}
	}

	function forceTick(seconds: number) {
		gameLoop.forceTick(seconds);
		showStatus('success', `Forced ${seconds}s tick`);
	}

	// === HELPERS ===

	function formatNumber(n: number): string {
		if (n >= 1e12) return (n / 1e12).toFixed(1) + 'T';
		if (n >= 1e9) return (n / 1e9).toFixed(1) + 'B';
		if (n >= 1e6) return (n / 1e6).toFixed(1) + 'M';
		if (n >= 1e3) return (n / 1e3).toFixed(1) + 'K';
		return Math.floor(n).toString();
	}

	function formatTime(seconds: number): string {
		const h = Math.floor(seconds / 3600);
		const m = Math.floor((seconds % 3600) / 60);
		const s = Math.floor(seconds % 60);
		if (h > 0) return `${h}h ${m}m`;
		if (m > 0) return `${m}m ${s}s`;
		return `${s}s`;
	}
</script>

{#if dev}
	<button class="debug-toggle" onclick={toggle} title="Idle Pixel Debug">
		{isOpen ? '×' : '🔧'}
	</button>

	{#if isOpen}
		<div class="debug-panel">
			<div class="panel-header">
				<h3>🎮 Idle Pixel Debug</h3>
				<span class="phase-badge">{$idlePixelPhase}</span>
			</div>

			{#if statusMessage}
				<div class="status-msg" class:success={statusMessage.type === 'success'} class:error={statusMessage.type === 'error'}>
					{statusMessage.text}
				</div>
			{/if}

			<!-- Current State -->
			{#if stateInfo()}
				{@const info = stateInfo()!}
				<section class="section">
					<h4>State</h4>
					<div class="info-grid">
						<div class="info-item">
							<span class="label">Currency</span>
							<span class="value">{formatNumber(info.currency)}</span>
						</div>
						<div class="info-item">
							<span class="label">/sec</span>
							<span class="value">{formatNumber($productionPerSecond)}</span>
						</div>
						<div class="info-item">
							<span class="label">Pixels</span>
							<span class="value">{info.pixelCount}</span>
						</div>
						<div class="info-item">
							<span class="label">Slots</span>
							<span class="value">{info.unlockedSlots}/64</span>
						</div>
						<div class="info-item">
							<span class="label">Upgrades</span>
							<span class="value">{info.totalUpgradeLevels}</span>
						</div>
						<div class="info-item">
							<span class="label">Max Color</span>
							<span class="value">Lv.{info.highestLevel}</span>
						</div>
						<div class="info-item">
							<span class="label">Playtime</span>
							<span class="value">{formatTime(info.playTime)}</span>
						</div>
						<div class="info-item">
							<span class="label">Merges</span>
							<span class="value">{info.mergesPerformed}</span>
						</div>
					</div>
				</section>
			{:else}
				<section class="section">
					<p class="muted">No game state</p>
				</section>
			{/if}

			<!-- Currency Controls -->
			<section class="section">
				<h4>Currency</h4>
				<div class="control-row">
					<input type="number" bind:value={currencyToAdd} min="1" />
					<button class="btn" onclick={addCurrency}>+ Add</button>
				</div>
				<div class="button-grid">
					<button class="btn-sm" onclick={() => setCurrency(1e3)}>1K</button>
					<button class="btn-sm" onclick={() => setCurrency(1e6)}>1M</button>
					<button class="btn-sm" onclick={() => setCurrency(1e9)}>1B</button>
					<button class="btn-sm" onclick={() => setCurrency(1e12)}>1T</button>
				</div>
			</section>

			<!-- Offline Progress -->
			<section class="section">
				<h4>Simulate Offline</h4>
				<div class="control-row">
					<input type="number" bind:value={offlineSecondsToSimulate} min="1" />
					<button class="btn" onclick={simulateOfflineProgress}>Apply</button>
				</div>
				<div class="button-grid">
					<button class="btn-sm" onclick={() => { offlineSecondsToSimulate = 60; simulateOfflineProgress(); }}>1m</button>
					<button class="btn-sm" onclick={() => { offlineSecondsToSimulate = 3600; simulateOfflineProgress(); }}>1h</button>
					<button class="btn-sm" onclick={() => { offlineSecondsToSimulate = 28800; simulateOfflineProgress(); }}>8h</button>
					<button class="btn-sm" onclick={() => { offlineSecondsToSimulate = 86400; simulateOfflineProgress(); }}>24h</button>
				</div>
			</section>

			<!-- Game Loop -->
			<section class="section">
				<h4>Game Loop</h4>
				<div class="loop-status">
					<span class="status-dot" class:active={gameLoop.isActive()}></span>
					<span>{gameLoop.isActive() ? 'Running' : 'Stopped'}</span>
				</div>
				<div class="button-grid">
					<button class="btn-sm" onclick={toggleGameLoop}>
						{gameLoop.isActive() ? 'Stop' : 'Start'}
					</button>
					<button class="btn-sm" onclick={() => forceTick(1)}>+1s</button>
					<button class="btn-sm" onclick={() => forceTick(10)}>+10s</button>
					<button class="btn-sm" onclick={() => forceTick(60)}>+60s</button>
				</div>
			</section>

			<!-- Quick Actions -->
			<section class="section">
				<h4>Quick Actions</h4>
				<div class="button-grid">
					<button class="btn" onclick={fillGrid}>Fill Grid</button>
					<button class="btn" onclick={buyAllUpgrades}>Buy Upgrades</button>
					<button class="btn accent" onclick={maxOutGame}>Max Out</button>
				</div>
			</section>

			<!-- Save/Load -->
			<section class="section">
				<h4>Save Data</h4>
				<div class="button-grid">
					<button class="btn" onclick={handleSaveGame}>Save</button>
					<button class="btn" onclick={handleExportSave}>Export</button>
					<button class="btn danger" onclick={handleDeleteSave}>Delete</button>
					<button class="btn danger" onclick={handleResetGame}>Reset All</button>
				</div>
				<div class="import-row">
					<input type="text" bind:value={importData} placeholder="Paste save data..." />
					<button class="btn-sm" onclick={handleImportSave}>Import</button>
				</div>
			</section>
		</div>
	{/if}
{/if}

<style>
	.debug-toggle {
		position: fixed;
		bottom: var(--space-4);
		right: var(--space-4);
		z-index: 9999;
		width: 44px;
		height: 44px;
		border-radius: var(--radius-full);
		background: #f59e0b;
		color: white;
		border: none;
		font-size: var(--font-size-lg);
		cursor: pointer;
		box-shadow: 0 4px 12px rgba(245, 158, 11, 0.4);
		transition: transform 0.15s ease, background 0.15s ease;
	}

	.debug-toggle:hover {
		transform: scale(1.1);
		background: #d97706;
	}

	.debug-panel {
		position: fixed;
		bottom: 70px;
		right: var(--space-4);
		z-index: 9998;
		width: 320px;
		max-height: calc(100vh - 100px);
		overflow-y: auto;
		background: #1a1a2e;
		border: 2px solid #f59e0b;
		border-radius: var(--radius-lg);
		box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
		font-size: var(--font-size-sm);
		font-family: var(--font-family);
	}

	.panel-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: var(--space-3) var(--space-4);
		background: rgba(245, 158, 11, 0.15);
		border-bottom: 1px solid rgba(245, 158, 11, 0.3);
	}

	.panel-header h3 {
		margin: 0;
		font-size: var(--font-size-sm);
		color: #f59e0b;
	}

	.phase-badge {
		padding: 2px 8px;
		background: rgba(245, 158, 11, 0.3);
		border-radius: var(--radius-xl);
		font-size: 10px;
		color: #fcd34d;
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}

	.status-msg {
		padding: var(--space-2) var(--space-4);
		font-size: var(--font-size-xs);
		text-align: center;
	}

	.status-msg.success {
		background: rgba(34, 197, 94, 0.2);
		color: #86efac;
	}

	.status-msg.error {
		background: rgba(239, 68, 68, 0.2);
		color: #fca5a5;
	}

	.section {
		padding: var(--space-3) var(--space-4);
		border-bottom: 1px solid rgba(255, 255, 255, 0.05);
	}

	.section h4 {
		margin: 0 0 var(--space-2) 0;
		font-size: 10px;
		text-transform: uppercase;
		letter-spacing: 0.1em;
		color: rgba(255, 255, 255, 0.4);
	}

	.info-grid {
		display: grid;
		grid-template-columns: repeat(4, 1fr);
		gap: var(--space-2);
	}

	.info-item {
		background: rgba(0, 0, 0, 0.3);
		padding: var(--space-2);
		border-radius: var(--radius-sm);
		text-align: center;
	}

	.info-item .label {
		display: block;
		font-size: 8px;
		color: rgba(255, 255, 255, 0.4);
		text-transform: uppercase;
		margin-bottom: 2px;
	}

	.info-item .value {
		display: block;
		font-size: var(--font-size-xs);
		color: var(--color-accent);
		font-weight: 600;
	}

	.control-row {
		display: flex;
		gap: var(--space-2);
		margin-bottom: var(--space-2);
	}

	.control-row input {
		flex: 1;
		padding: var(--space-2);
		background: rgba(0, 0, 0, 0.4);
		border: 1px solid rgba(255, 255, 255, 0.1);
		border-radius: var(--radius-sm);
		color: white;
		font-size: var(--font-size-sm);
		font-family: monospace;
	}

	.button-grid {
		display: flex;
		gap: var(--space-2);
		flex-wrap: wrap;
	}

	.btn, .btn-sm {
		padding: var(--space-2) var(--space-3);
		background: rgba(255, 255, 255, 0.1);
		border: 1px solid rgba(255, 255, 255, 0.2);
		border-radius: var(--radius-sm);
		color: white;
		font-size: var(--font-size-xs);
		cursor: pointer;
		transition: all 0.15s ease;
		flex: 1;
		min-width: 60px;
	}

	.btn-sm {
		padding: var(--space-1) var(--space-2);
		font-size: 10px;
	}

	.btn:hover, .btn-sm:hover {
		background: rgba(255, 255, 255, 0.2);
		border-color: rgba(255, 255, 255, 0.3);
	}

	.btn.accent {
		background: rgba(245, 158, 11, 0.3);
		border-color: #f59e0b;
		color: #fcd34d;
	}

	.btn.accent:hover {
		background: rgba(245, 158, 11, 0.5);
	}

	.btn.danger {
		background: rgba(239, 68, 68, 0.2);
		border-color: #ef4444;
		color: #fca5a5;
	}

	.btn.danger:hover {
		background: rgba(239, 68, 68, 0.4);
	}

	.loop-status {
		display: flex;
		align-items: center;
		gap: var(--space-2);
		margin-bottom: var(--space-2);
		font-size: var(--font-size-xs);
		color: rgba(255, 255, 255, 0.6);
	}

	.status-dot {
		width: 8px;
		height: 8px;
		border-radius: 50%;
		background: #ef4444;
	}

	.status-dot.active {
		background: #22c55e;
		animation: pulse 1s infinite;
	}

	@keyframes pulse {
		0%, 100% { opacity: 1; }
		50% { opacity: 0.5; }
	}

	.import-row {
		display: flex;
		gap: var(--space-2);
		margin-top: var(--space-2);
	}

	.import-row input {
		flex: 1;
		padding: var(--space-2);
		background: rgba(0, 0, 0, 0.4);
		border: 1px solid rgba(255, 255, 255, 0.1);
		border-radius: var(--radius-sm);
		color: white;
		font-size: var(--font-size-xs);
	}

	.muted {
		color: rgba(255, 255, 255, 0.4);
		text-align: center;
		padding: var(--space-2);
	}

	/* Scrollbar */
	.debug-panel::-webkit-scrollbar {
		width: 6px;
	}

	.debug-panel::-webkit-scrollbar-track {
		background: transparent;
	}

	.debug-panel::-webkit-scrollbar-thumb {
		background: rgba(245, 158, 11, 0.3);
		border-radius: 3px;
	}
</style>
