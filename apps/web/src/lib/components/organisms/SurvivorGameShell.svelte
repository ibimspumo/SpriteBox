<!-- SurvivorGameShell Organism - Persistent game UI wrapper -->
<!-- Provides header, stats bars, and content area for all game phases -->
<script lang="ts">
	import { Icon } from '../atoms';
	import { ResourceBar, GameHeader } from '../molecules';
	import { PixelCanvas } from '../utility';
	import { t } from '$lib/i18n';
	import {
		currentHp,
		maxHp,
		currentMana,
		maxMana,
		currentShield,
		playerLevel,
		playerXp,
		playerXpToNext,
		playerAttack,
		playerDefense,
		playerSpeed,
		playerLuck,
		currentElement,
		currentTrait,
		survivorRun,
		showStatsScreen,
		showTutorial,
		activeBuffs,
		activeDebuffs,
	} from '$lib/survivor';
	import type { Snippet } from 'svelte';

	interface Props {
		/** Gold/currency amount */
		gold?: number;
		/** Show the stats sidebar on desktop */
		showSidebar?: boolean;
		/** Callback when home button clicked */
		onhome?: () => void;
		/** Main content slot */
		children: Snippet;
		/** Optional bottom bar content */
		bottomBar?: Snippet;
	}

	let {
		gold = 0,
		showSidebar = true,
		onhome,
		children,
		bottomBar,
	}: Props = $props();

	// Get character data from run
	let characterPixels = $derived($survivorRun?.character?.pixels);
	let characterName = $derived($survivorRun?.character?.name);

	// Shield visibility (only show if > 0)
	let hasShield = $derived($currentShield > 0);

	// Combat stats for sidebar
	const COMBAT_STATS = [
		{ key: 'attack', icon: 'zap', color: '#f87171' },
		{ key: 'defense', icon: 'shield', color: '#60a5fa' },
		{ key: 'speed', icon: 'speed-fast', color: '#fbbf24' },
		{ key: 'luck', icon: 'dice', color: '#a78bfa' },
	] as const;

	// Get stat value
	function getStatValue(key: string): number {
		switch (key) {
			case 'attack': return $playerAttack;
			case 'defense': return $playerDefense;
			case 'speed': return $playerSpeed;
			case 'luck': return $playerLuck;
			default: return 0;
		}
	}

	// Get element color
	function getElementColor(element: string): string {
		const colors: Record<string, string> = {
			fire: 'var(--color-danger)',
			water: 'var(--color-info)',
			earth: 'var(--color-warning)',
			air: 'var(--color-text-secondary)',
			dark: 'var(--color-text-primary)',
			light: 'var(--color-warning)',
			neutral: 'var(--color-text-muted)',
		};
		return colors[element] ?? colors.neutral;
	}

	function handleSettings(): void {
		showStatsScreen?.set(true);
	}

	function handleCharacterClick(): void {
		showStatsScreen?.set(true);
	}
</script>

<div class="game-shell">
	<!-- Header -->
	<GameHeader
		{characterPixels}
		{characterName}
		showHome={!!onhome}
		showSettings={true}
		{onhome}
		onsettings={handleSettings}
		oncharacter={handleCharacterClick}
	/>

	<!-- Stats Bar (Mobile: horizontal, Desktop: below header) -->
	<div class="stats-bar">
		<div class="stats-row">
			<!-- HP Bar -->
			<div class="stat-item hp">
				<ResourceBar
					type="hp"
					current={$currentHp}
					max={$maxHp}
					icon="heart"
					compact
					showPercent
				/>
			</div>

			<!-- Mana Bar -->
			<div class="stat-item mana">
				<ResourceBar
					type="mana"
					current={$currentMana}
					max={$maxMana}
					icon="drop"
					compact
					showPercent
				/>
			</div>
		</div>

		<div class="stats-row secondary">
			<!-- Level & XP -->
			<div class="level-xp">
				<span class="level-badge">
					<span class="level-label">LVL</span>
					<span class="level-value">{$playerLevel}</span>
				</span>
				<div class="xp-bar">
					<ResourceBar
						type="xp"
						current={$playerXp}
						max={$playerXpToNext}
						compact
						showValues={false}
					/>
					<span class="xp-text">{$playerXp}/{$playerXpToNext}</span>
				</div>
			</div>

			<!-- Gold -->
			<div class="gold-display">
				<Icon name="coin" size="sm" />
				<span class="gold-value">{gold}</span>
			</div>

			<!-- Shield (if active) -->
			{#if hasShield}
				<div class="shield-display">
					<Icon name="shield" size="sm" />
					<span class="shield-value">{$currentShield}</span>
				</div>
			{/if}
		</div>
	</div>

	<!-- Main Layout -->
	<div class="main-layout" class:has-sidebar={showSidebar}>
		<!-- Main Content Area -->
		<main class="content-area">
			{@render children()}
		</main>

		<!-- Sidebar (Desktop only) -->
		{#if showSidebar}
			<aside class="sidebar">
				<!-- Character Info -->
				<div class="sidebar-section character-info">
					{#if characterPixels}
						<div class="character-preview">
							<PixelCanvas
								pixelData={characterPixels}
								size={80}
								editable={false}
							/>
						</div>
					{/if}
					<div class="character-details">
						<span class="char-name">{characterName ?? 'Unknown'}</span>
						<span class="char-element" style="color: {getElementColor($currentElement)}">
							{$t.pixelSurvivor.elements[$currentElement] ?? $currentElement}
						</span>
						<span class="char-trait">
							{$t.pixelSurvivor.traits[$currentTrait] ?? $currentTrait}
						</span>
					</div>
				</div>

				<!-- Combat Stats -->
				<div class="sidebar-section combat-stats">
					<h3 class="section-title">{$t.pixelSurvivor.previewStats}</h3>
					<div class="stats-grid">
						{#each COMBAT_STATS as stat}
							<div class="combat-stat">
								<span class="stat-icon" style="color: {stat.color}">
									<Icon name={stat.icon} size="sm" />
								</span>
								<span class="stat-name">{$t.pixelSurvivor.statAbbr[stat.key]}</span>
								<span class="stat-val">{getStatValue(stat.key)}</span>
							</div>
						{/each}
					</div>
				</div>

				<!-- Active Effects -->
				{#if $activeBuffs.length > 0 || $activeDebuffs.length > 0}
					<div class="sidebar-section effects">
						<h3 class="section-title">{$t.pixelSurvivor.gameShell.effects}</h3>
						<div class="effects-list">
							{#each $activeBuffs as buff}
								<span class="effect-badge buff" title={buff.definition.name}>
									{buff.definition.name.slice(0, 3)}
								</span>
							{/each}
							{#each $activeDebuffs as debuff}
								<span class="effect-badge debuff" title={debuff.definition.name}>
									{debuff.definition.name.slice(0, 3)}
								</span>
							{/each}
						</div>
					</div>
				{/if}
			</aside>
		{/if}
	</div>

	<!-- Bottom Bar (optional, mainly for mobile actions) -->
	{#if bottomBar}
		<div class="bottom-bar">
			{@render bottomBar()}
		</div>
	{/if}
</div>

<style>
	.game-shell {
		display: flex;
		flex-direction: column;
		min-height: 100vh;
		background:
			radial-gradient(ellipse at 30% 20%, rgba(255, 100, 100, 0.08) 0%, transparent 50%),
			radial-gradient(ellipse at 70% 80%, rgba(255, 200, 100, 0.06) 0%, transparent 50%),
			var(--color-bg-primary);
	}

	/* Stats Bar */
	.stats-bar {
		display: flex;
		flex-direction: column;
		gap: var(--space-2);
		padding: var(--space-3) var(--space-4);
		background: var(--color-bg-secondary);
		border-bottom: var(--space-half) solid var(--color-bg-tertiary);
	}

	.stats-row {
		display: flex;
		gap: var(--space-3);
		align-items: center;
	}

	.stats-row.secondary {
		gap: var(--space-4);
	}

	.stat-item {
		flex: 1;
		min-width: calc(var(--space-8) * 3.75);
	}

	.stat-item.hp {
		max-width: calc(var(--space-8) * 6.25);
		min-width: calc(var(--space-8) * 4.688);
	}

	.stat-item.mana {
		max-width: calc(var(--space-8) * 4.688);
		min-width: calc(var(--space-8) * 3.75);
	}

	/* Level & XP */
	.level-xp {
		display: flex;
		align-items: center;
		gap: var(--space-2);
		flex: 1;
	}

	.level-badge {
		display: flex;
		align-items: center;
		gap: var(--space-1);
		padding: var(--space-1) var(--space-2);
		background: var(--color-warning);
		border-radius: var(--radius-sm);
		color: var(--color-bg-primary);
		font-weight: var(--font-weight-bold);
		font-size: var(--font-size-xs);
		flex-shrink: 0;
	}

	.level-label {
		opacity: 0.8;
	}

	.level-value {
		font-size: var(--font-size-sm);
	}

	.xp-bar {
		flex: 1;
		display: flex;
		align-items: center;
		gap: var(--space-2);
		max-width: calc(var(--space-8) * 4.688);
	}

	.xp-text {
		font-size: var(--font-size-xs);
		color: var(--color-text-muted);
		white-space: nowrap;
	}

	/* Gold Display */
	.gold-display {
		display: flex;
		align-items: center;
		gap: var(--space-1);
		padding: var(--space-1) var(--space-2);
		background: var(--color-bg-tertiary);
		border-radius: var(--radius-sm);
		color: var(--color-warning);
	}

	.gold-value {
		font-weight: var(--font-weight-bold);
		font-size: var(--font-size-sm);
		font-variant-numeric: tabular-nums;
	}

	/* Shield Display */
	.shield-display {
		display: flex;
		align-items: center;
		gap: var(--space-1);
		padding: var(--space-1) var(--space-2);
		background: var(--color-bg-tertiary);
		border-radius: var(--radius-sm);
		color: var(--color-accent);
	}

	.shield-value {
		font-weight: var(--font-weight-bold);
		font-size: var(--font-size-sm);
	}

	/* Main Layout */
	.main-layout {
		flex: 1;
		display: flex;
		overflow: hidden;
	}

	.content-area {
		flex: 1;
		display: flex;
		flex-direction: column;
		overflow-y: auto;
		padding: var(--space-4);
	}

	/* Sidebar (Desktop) */
	.sidebar {
		display: none;
		width: calc(var(--space-8) * 8.75);
		background: var(--color-bg-secondary);
		border-left: var(--space-half) solid var(--color-bg-tertiary);
		padding: var(--space-4);
		overflow-y: auto;
		flex-direction: column;
		gap: var(--space-4);
	}

	.sidebar-section {
		display: flex;
		flex-direction: column;
		gap: var(--space-2);
		padding-bottom: var(--space-4);
		border-bottom: var(--space-half) solid var(--color-bg-tertiary);
	}

	.sidebar-section:last-child {
		border-bottom: none;
		padding-bottom: 0;
	}

	.section-title {
		margin: 0;
		font-size: var(--font-size-xs);
		font-weight: var(--font-weight-bold);
		color: var(--color-text-muted);
		text-transform: uppercase;
		letter-spacing: var(--space-quarter);
	}

	/* Character Info */
	.character-info {
		align-items: center;
		text-align: center;
	}

	.character-preview {
		padding: var(--space-2);
		background: var(--color-bg-tertiary);
		border: var(--space-half) solid var(--color-bg-elevated);
		border-radius: var(--radius-md);
	}

	.character-details {
		display: flex;
		flex-direction: column;
		gap: var(--space-1);
	}

	.char-name {
		font-size: var(--font-size-md);
		font-weight: var(--font-weight-bold);
		color: var(--color-text-primary);
	}

	.char-element {
		font-size: var(--font-size-sm);
		font-weight: var(--font-weight-medium);
		text-transform: uppercase;
	}

	.char-trait {
		font-size: var(--font-size-xs);
		color: var(--color-accent);
	}

	/* Combat Stats Grid */
	.stats-grid {
		display: grid;
		grid-template-columns: repeat(2, 1fr);
		gap: var(--space-2);
	}

	.combat-stat {
		display: flex;
		align-items: center;
		gap: var(--space-2);
		padding: var(--space-2);
		background: var(--color-bg-tertiary);
		border-radius: var(--radius-sm);
	}

	.stat-icon {
		display: flex;
	}

	.stat-name {
		flex: 1;
		font-size: var(--font-size-xs);
		color: var(--color-text-secondary);
		text-transform: uppercase;
	}

	.stat-val {
		font-size: var(--font-size-sm);
		font-weight: var(--font-weight-bold);
		color: var(--color-text-primary);
	}

	/* Effects */
	.effects-list {
		display: flex;
		flex-wrap: wrap;
		gap: var(--space-1);
	}

	.effect-badge {
		padding: var(--space-1) var(--space-2);
		border-radius: var(--radius-sm);
		font-size: var(--font-size-xs);
		font-weight: var(--font-weight-bold);
		text-transform: uppercase;
	}

	.effect-badge.buff {
		background: rgba(34, 197, 94, 0.2);
		color: var(--color-success);
		border: var(--space-quarter) solid var(--color-success);
	}

	.effect-badge.debuff {
		background: rgba(239, 68, 68, 0.2);
		color: var(--color-error);
		border: var(--space-quarter) solid var(--color-error);
	}

	/* Bottom Bar */
	.bottom-bar {
		padding: var(--space-3) var(--space-4);
		background: var(--color-bg-secondary);
		border-top: var(--space-half) solid var(--color-bg-tertiary);
	}

	/* Desktop Layout */
	@media (min-width: 1024px) {
		.stats-bar {
			flex-direction: row;
			justify-content: space-between;
			align-items: center;
			padding: var(--space-3) var(--space-6);
		}

		.stats-row {
			display: flex;
			gap: var(--space-4);
			align-items: center;
		}

		.stats-row.secondary {
			gap: var(--space-6);
		}

		.stat-item {
			flex: 0 0 auto;
			width: auto;
		}

		.stat-item.hp {
			width: calc(var(--space-8) * 6.875);
			min-width: calc(var(--space-8) * 5.625);
			max-width: calc(var(--space-8) * 8.75);
		}

		.stat-item.mana {
			width: calc(var(--space-8) * 5.625);
			min-width: calc(var(--space-8) * 4.375);
			max-width: calc(var(--space-8) * 6.875);
		}

		.xp-bar {
			width: calc(var(--space-8) * 5.625);
			min-width: calc(var(--space-8) * 4.375);
			max-width: calc(var(--space-8) * 6.875);
		}

		.main-layout.has-sidebar .sidebar {
			display: flex;
		}

		.content-area {
			padding: var(--space-6);
		}
	}

	/* Tablet Layout */
	@media (min-width: 768px) and (max-width: 1023px) {
		.stats-bar {
			padding: var(--space-3) var(--space-5);
		}

		.content-area {
			padding: var(--space-5);
		}
	}

	/* Mobile Layout */
	@media (max-width: 640px) {
		.stats-bar {
			padding: var(--space-2) var(--space-3);
		}

		.stats-row {
			gap: var(--space-2);
		}

		.stats-row.secondary {
			flex-wrap: wrap;
			gap: var(--space-2);
		}

		.level-xp {
			flex: 1 1 100%;
			order: -1;
		}

		.xp-bar {
			max-width: none;
		}

		.content-area {
			padding: var(--space-3);
		}

		.gold-display,
		.shield-display {
			font-size: var(--font-size-xs);
		}
	}
</style>
