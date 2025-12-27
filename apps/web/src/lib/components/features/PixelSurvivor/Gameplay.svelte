<!-- PixelSurvivor/Gameplay.svelte - Main gameplay component with combat integration -->
<script lang="ts">
	import { Button, Icon } from '../../atoms';
	import { Card } from '../../organisms';
	import { t } from '$lib/i18n';
	import {
		survivorRun,
		exitGameplay,
		startCombat,
		onCombatVictory,
		onCombatDefeat,
		onCombatFled,
		proceedToNextRound,
		currentHp,
		maxHp,
		playerLevel
	} from '$lib/survivor';
	import Combat from './Combat/index.svelte';

	// Get current gameplay state
	const gameplayState = $derived($survivorRun?.gameplay);
	const subPhase = $derived(gameplayState?.subPhase ?? 'exploring');
	const currentRound = $derived(gameplayState?.round ?? 1);
	const monstersDefeated = $derived(gameplayState?.monstersDefeated ?? 0);

	// Track last XP gained for victory screen
	let lastXpGained = $state(0);

	// Handle combat end
	function handleCombatEnd(result: 'victory' | 'defeat' | 'fled', xpGained: number): void {
		lastXpGained = xpGained;

		switch (result) {
			case 'victory':
				onCombatVictory(xpGained);
				break;
			case 'defeat':
				onCombatDefeat();
				break;
			case 'fled':
				onCombatFled();
				break;
		}
	}

	// Start next encounter
	function handleStartEncounter(): void {
		startCombat();
	}

	// Continue after victory
	function handleContinue(): void {
		proceedToNextRound();
	}

	// Return to menu after defeat
	function handleReturnToMenu(): void {
		exitGameplay();
	}

	// Check if player is low on HP
	const isLowHp = $derived($currentHp < $maxHp * 0.3);
</script>

<div class="gameplay">
	{#if subPhase === 'exploring'}
		<!-- Exploration Phase - Ready for next encounter -->
		<div class="exploring-phase">
			<Card padding="lg">
				<div class="phase-content">
					<div class="round-indicator">
						<span class="round-label">{$t.pixelSurvivor.gameplay.round}</span>
						<span class="round-number">{currentRound}</span>
					</div>

					<div class="stats-summary">
						<div class="stat-item">
							<Icon name="heart" size="md" />
							<span class="stat-value" class:low={isLowHp}>{$currentHp}/{$maxHp}</span>
						</div>
						<div class="stat-item">
							<Icon name="star" size="md" />
							<span class="stat-value">{$t.pixelSurvivor.levelFormat.replace('{level}', String($playerLevel))}</span>
						</div>
						<div class="stat-item">
							<Icon name="skull" size="md" />
							<span class="stat-value">{monstersDefeated}</span>
						</div>
					</div>

					<p class="exploring-text">{$t.pixelSurvivor.gameplay.exploringText}</p>

					<div class="action-buttons">
						<Button variant="danger" size="lg" onclick={handleStartEncounter}>
							<Icon name="zap" size="sm" />
							{$t.pixelSurvivor.gameplay.findEnemy}
						</Button>
					</div>

					<Button variant="ghost" size="sm" onclick={handleReturnToMenu}>
						← {$t.pixelSurvivor.gameplay.backToMenu}
					</Button>
				</div>
			</Card>
		</div>

	{:else if subPhase === 'combat'}
		<!-- Combat Phase -->
		<Combat onCombatEnd={handleCombatEnd} />

	{:else if subPhase === 'victory'}
		<!-- Victory Phase -->
		<div class="victory-phase">
			<Card padding="lg">
				<div class="phase-content victory">
					<div class="victory-icon">🏆</div>
					<h2 class="victory-title">{$t.pixelSurvivor.gameplay.victoryTitle}</h2>

					<div class="rewards">
						<div class="reward-item">
							<span class="reward-label">{$t.pixelSurvivor.gameplay.xpGained}</span>
							<span class="reward-value xp">{$t.pixelSurvivor.xpGained.replace('{xp}', String(lastXpGained))}</span>
						</div>
						<div class="reward-item">
							<span class="reward-label">{$t.pixelSurvivor.gameplay.monstersDefeated}</span>
							<span class="reward-value">{monstersDefeated}</span>
						</div>
					</div>

					<Button variant="primary" size="lg" onclick={handleContinue}>
						{$t.pixelSurvivor.gameplay.continue}
					</Button>
				</div>
			</Card>
		</div>

	{:else if subPhase === 'defeat'}
		<!-- Defeat Phase -->
		<div class="defeat-phase">
			<Card padding="lg">
				<div class="phase-content defeat">
					<div class="defeat-icon">💀</div>
					<h2 class="defeat-title">{$t.pixelSurvivor.gameplay.defeatTitle}</h2>

					<div class="run-summary">
						<div class="summary-item">
							<span class="summary-label">{$t.pixelSurvivor.gameplay.roundsReached}</span>
							<span class="summary-value">{currentRound}</span>
						</div>
						<div class="summary-item">
							<span class="summary-label">{$t.pixelSurvivor.gameplay.monstersDefeated}</span>
							<span class="summary-value">{monstersDefeated}</span>
						</div>
					</div>

					<Button variant="primary" size="lg" onclick={handleReturnToMenu}>
						{$t.pixelSurvivor.gameplay.returnToMenu}
					</Button>
				</div>
			</Card>
		</div>
	{/if}
</div>

<style>
	.gameplay {
		width: 100%;
		max-width: 600px;
		margin: 0 auto;
	}

	/* Exploring Phase */
	.exploring-phase {
		width: 100%;
	}

	.phase-content {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: var(--space-4);
		text-align: center;
	}

	.round-indicator {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: var(--space-1);
	}

	.round-label {
		font-size: var(--font-size-xs);
		font-weight: var(--font-weight-bold);
		color: var(--color-text-muted);
		text-transform: uppercase;
		letter-spacing: 2px;
	}

	.round-number {
		font-size: var(--font-size-3xl);
		font-weight: var(--font-weight-black);
		color: var(--color-warning);
	}

	.stats-summary {
		display: flex;
		gap: var(--space-4);
		padding: var(--space-3);
		background: var(--color-bg-tertiary);
		border-radius: var(--radius-md);
	}

	.stat-item {
		display: flex;
		align-items: center;
		gap: var(--space-2);
	}

	.stat-item :global(.icon) {
		color: var(--color-text-muted);
	}

	.stat-item:first-child :global(.icon) {
		color: var(--color-error);
	}

	.stat-item:nth-child(2) :global(.icon) {
		color: var(--color-warning);
	}

	.stat-value {
		font-size: var(--font-size-md);
		font-weight: var(--font-weight-bold);
		color: var(--color-text-primary);
		font-variant-numeric: tabular-nums;
	}

	.stat-value.low {
		color: var(--color-error);
		animation: pulse-warning 1s ease-in-out infinite;
	}

	@keyframes pulse-warning {
		0%, 100% { opacity: 1; }
		50% { opacity: 0.6; }
	}

	.exploring-text {
		margin: 0;
		font-size: var(--font-size-md);
		color: var(--color-text-secondary);
		max-width: 300px;
	}

	.action-buttons {
		display: flex;
		flex-direction: column;
		gap: var(--space-3);
		width: 100%;
		max-width: 250px;
	}

	/* Victory Phase */
	.victory-phase,
	.defeat-phase {
		width: 100%;
	}

	.phase-content.victory {
		animation: victory-appear 0.5s ease-out;
	}

	.phase-content.defeat {
		animation: defeat-appear 0.5s ease-out;
	}

	@keyframes victory-appear {
		0% { transform: scale(0.8); opacity: 0; }
		60% { transform: scale(1.05); }
		100% { transform: scale(1); opacity: 1; }
	}

	@keyframes defeat-appear {
		0% { transform: translateY(20px); opacity: 0; }
		100% { transform: translateY(0); opacity: 1; }
	}

	.victory-icon,
	.defeat-icon {
		font-size: 64px;
		line-height: 1;
	}

	.victory-title {
		margin: 0;
		font-size: var(--font-size-2xl);
		font-weight: var(--font-weight-black);
		color: var(--color-warning);
		text-transform: uppercase;
	}

	.defeat-title {
		margin: 0;
		font-size: var(--font-size-2xl);
		font-weight: var(--font-weight-black);
		color: var(--color-error);
		text-transform: uppercase;
	}

	.rewards,
	.run-summary {
		display: flex;
		flex-direction: column;
		gap: var(--space-2);
		padding: var(--space-4);
		background: var(--color-bg-tertiary);
		border-radius: var(--radius-md);
		width: 100%;
		max-width: 250px;
	}

	.reward-item,
	.summary-item {
		display: flex;
		justify-content: space-between;
		align-items: center;
	}

	.reward-label,
	.summary-label {
		font-size: var(--font-size-sm);
		color: var(--color-text-secondary);
	}

	.reward-value,
	.summary-value {
		font-size: var(--font-size-md);
		font-weight: var(--font-weight-bold);
		color: var(--color-text-primary);
	}

	.reward-value.xp {
		color: var(--color-success);
	}

	/* Mobile */
	@media (max-width: 480px) {
		.stats-summary {
			flex-wrap: wrap;
			justify-content: center;
		}
	}
</style>
