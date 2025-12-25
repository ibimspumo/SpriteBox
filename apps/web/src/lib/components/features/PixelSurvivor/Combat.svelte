<!-- PixelSurvivor/Combat.svelte - Turn-based combat screen -->
<script lang="ts">
	import { Button, Icon, Badge } from '../../atoms';
	import { PixelCanvas } from '../../utility';
	import { t } from '$lib/i18n';
	import {
		currentGameCharacter,
		currentHp,
		maxHp,
		playerAttack,
		playerDefense,
		takeDamage as applyPlayerDamage,
		addXp,
		statManager
	} from '$lib/survivor';
	import {
		CombatEngine,
		createCombatEngine,
		spawnMonster,
		initializeMonsterRegistry,
		type CombatState,
		type CombatActionResult,
		type CombatD20Roll,
		type MonsterInstance
	} from '$lib/survivor/engine';
	import { D20Dice, rollD20, resetD20, d20RollState } from '$lib/survivor/engine';
	import { onMount, onDestroy } from 'svelte';

	interface Props {
		onCombatEnd?: (result: 'victory' | 'defeat' | 'fled', xpGained: number) => void;
	}

	let { onCombatEnd }: Props = $props();

	// Combat state
	let combatEngine = $state<CombatEngine | null>(null);
	let combatState = $state<CombatState | null>(null);
	let isRollingDice = $state(false);
	let showResult = $state(false);
	let lastResult = $state<CombatActionResult | null>(null);
	let resultMessage = $state('');
	let combatLog = $state<string[]>([]);

	// Current monster
	let monster = $state<MonsterInstance | null>(null);

	// D20 roll subscription
	let d20Unsubscribe: (() => void) | null = null;

	// Initialize combat
	onMount(() => {
		initializeCombat();
	});

	onDestroy(() => {
		if (d20Unsubscribe) {
			d20Unsubscribe();
		}
	});

	function initializeCombat(): void {
		// Initialize monster registry
		initializeMonsterRegistry();

		// Spawn a wolf for testing
		const spawnResult = spawnMonster({
			monsterId: 'wolf',
			level: 1
		});

		if (!spawnResult.success || !spawnResult.monster) {
			console.error('Failed to spawn monster:', spawnResult.error);
			return;
		}

		monster = spawnResult.monster;

		// Create combat engine
		const engine = createCombatEngine();

		// Get player character
		const character = $currentGameCharacter;
		if (!character) {
			console.error('No character found');
			return;
		}

		// Initialize combat
		const state = engine.initializeCombat(character, [monster]);
		combatEngine = engine;
		combatState = state;

		// Set up state change callback
		engine.setOnStateChange((newState) => {
			combatState = newState;
			handlePhaseChange(newState);
		});

		// Add initial log entry
		addLogMessage($t.pixelSurvivor.combat.encounterStart.replace('{monster}', getMonsterName()));
	}

	function handlePhaseChange(state: CombatState): void {
		if (state.phase === 'monster_turn') {
			// Auto-execute monster turn after delay
			setTimeout(() => {
				executeMonsterTurn();
			}, 1000);
		}
	}

	function getMonsterName(): string {
		if (!monster) return 'Monster';
		// TODO: Use i18n for monster names
		return monster.definitionId.charAt(0).toUpperCase() + monster.definitionId.slice(1);
	}

	function addLogMessage(message: string): void {
		combatLog = [...combatLog, message];
		// Keep only last 5 messages
		if (combatLog.length > 5) {
			combatLog = combatLog.slice(-5);
		}
	}

	// Player attack
	async function handleAttack(): Promise<void> {
		if (!combatEngine || !combatState || combatState.phase !== 'player_turn') return;

		isRollingDice = true;

		// Roll D20
		rollD20();

		// Subscribe to D20 result
		d20Unsubscribe = d20RollState.subscribe((state) => {
			if (state.result !== null && !state.isRolling) {
				const roll = combatEngine!.rollD20();
				// Use the visual roll result
				roll.value = state.result;

				executePlayerAttack(roll);
				resetD20();
				isRollingDice = false;

				if (d20Unsubscribe) {
					d20Unsubscribe();
					d20Unsubscribe = null;
				}
			}
		});
	}

	function executePlayerAttack(d20Roll: CombatD20Roll): void {
		if (!combatEngine || !monster) return;

		const result = combatEngine.executePlayerAction(
			{ type: 'attack', actorId: combatState!.player.id, targetId: monster.instanceId },
			d20Roll
		);

		lastResult = result;
		showResult = true;

		// Build result message
		let message = '';
		if (result.success && result.damage !== undefined) {
			const rollText = d20Roll.isNat20 ? $t.pixelSurvivor.combat.criticalHit :
				d20Roll.isNat1 ? $t.pixelSurvivor.combat.criticalFail : '';

			message = $t.pixelSurvivor.combat.playerAttack
				.replace('{damage}', result.damage.toString())
				.replace('{roll}', d20Roll.value.toString());

			if (rollText) {
				message = `${rollText} ${message}`;
			}

			// Check element effectiveness
			if (result.elementMultiplier && result.elementMultiplier > 1) {
				message += ` ${$t.pixelSurvivor.combat.superEffective}`;
			} else if (result.elementMultiplier && result.elementMultiplier < 1) {
				message += ` ${$t.pixelSurvivor.combat.notEffective}`;
			}
		}

		addLogMessage(message);
		resultMessage = message;

		// Hide result after delay
		setTimeout(() => {
			showResult = false;

			// Check for victory
			if (result.targetDefeated) {
				handleVictory();
			}
		}, 1500);
	}

	function executeMonsterTurn(): void {
		if (!combatEngine || !combatState || combatState.phase !== 'monster_turn') return;

		const result = combatEngine.executeMonsterTurn();
		lastResult = result;
		showResult = true;

		if (result.success && result.damage !== undefined && result.d20Roll) {
			// Apply damage to player's actual StatManager
			const damageResult = applyPlayerDamage(result.damage);

			const rollText = result.d20Roll.isNat20 ? $t.pixelSurvivor.combat.criticalHit :
				result.d20Roll.isNat1 ? $t.pixelSurvivor.combat.criticalFail : '';

			let message = $t.pixelSurvivor.combat.monsterAttack
				.replace('{monster}', getMonsterName())
				.replace('{damage}', result.damage.toString());

			if (rollText) {
				message = `${rollText} ${message}`;
			}

			addLogMessage(message);
			resultMessage = message;

			// Check for defeat
			if (damageResult.remainingHp <= 0) {
				setTimeout(() => {
					handleDefeat();
				}, 1500);
				return;
			}
		}

		// Hide result after delay
		setTimeout(() => {
			showResult = false;
		}, 1500);
	}

	function handleFlee(): void {
		if (!combatEngine || !combatState) return;

		const d20Roll = combatEngine.rollD20();
		const result = combatEngine.executePlayerAction(
			{ type: 'flee', actorId: combatState.player.id },
			d20Roll
		);

		if (result.fleeSuccess) {
			addLogMessage($t.pixelSurvivor.combat.fledSuccess);
			setTimeout(() => {
				onCombatEnd?.('fled', 0);
			}, 1000);
		} else {
			addLogMessage($t.pixelSurvivor.combat.fledFailed);
		}
	}

	function handleVictory(): void {
		const xp = combatState?.xpReward ?? 0;
		addXp(xp);
		addLogMessage($t.pixelSurvivor.combat.victory.replace('{xp}', xp.toString()));

		setTimeout(() => {
			onCombatEnd?.('victory', xp);
		}, 2000);
	}

	function handleDefeat(): void {
		addLogMessage($t.pixelSurvivor.combat.defeat);

		setTimeout(() => {
			onCombatEnd?.('defeat', 0);
		}, 2000);
	}

	// Calculate HP percentages
	const playerHpPercent = $derived(
		combatState ? Math.floor((combatState.player.currentHp / combatState.player.maxHp) * 100) : 100
	);

	const monsterHpPercent = $derived(
		monster ? Math.floor((monster.currentHp / monster.maxHp) * 100) : 100
	);

	// Is player's turn?
	const isPlayerTurn = $derived(combatState?.phase === 'player_turn');

	// Is combat over?
	const isCombatOver = $derived(
		combatState?.phase === 'victory' ||
		combatState?.phase === 'defeat' ||
		combatState?.phase === 'fled'
	);
</script>

<div class="combat-screen">
	<!-- Combat Arena -->
	<div class="combat-arena">
		<!-- Player Side -->
		<div class="combatant player-side">
			<div class="combatant-sprite">
				{#if $currentGameCharacter}
					<PixelCanvas
						pixelData={$currentGameCharacter.pixels}
						size={80}
						editable={false}
					/>
				{/if}
			</div>
			<div class="combatant-info">
				<span class="combatant-name">{$currentGameCharacter?.name ?? 'Hero'}</span>
				<div class="hp-bar-container">
					<div class="hp-bar" style:width="{playerHpPercent}%" class:low={playerHpPercent < 25}></div>
				</div>
				<span class="hp-text">{combatState?.player.currentHp ?? $currentHp} / {combatState?.player.maxHp ?? $maxHp}</span>
			</div>
		</div>

		<!-- VS Indicator -->
		<div class="vs-indicator">
			<span class="vs-text">VS</span>
		</div>

		<!-- Monster Side -->
		<div class="combatant monster-side">
			<div class="combatant-sprite monster-sprite">
				{#if monster}
					<PixelCanvas
						pixelData={monster.pixels}
						size={80}
						editable={false}
					/>
				{/if}
			</div>
			<div class="combatant-info">
				<div class="monster-header">
					<span class="combatant-name">{getMonsterName()}</span>
					<Badge variant="warning" text={`Lv.${monster?.level ?? 1}`} />
				</div>
				<div class="hp-bar-container">
					<div class="hp-bar monster-hp" style:width="{monsterHpPercent}%" class:low={monsterHpPercent < 25}></div>
				</div>
				<span class="hp-text">{monster?.currentHp ?? 0} / {monster?.maxHp ?? 0}</span>
			</div>
		</div>
	</div>

	<!-- Result Display -->
	{#if showResult && resultMessage}
		<div class="result-display" class:critical={lastResult?.d20Roll?.isNat20} class:failure={lastResult?.d20Roll?.isNat1}>
			<span class="result-message">{resultMessage}</span>
		</div>
	{/if}

	<!-- D20 Dice -->
	{#if isRollingDice}
		<div class="dice-container">
			<D20Dice size={150} />
		</div>
	{/if}

	<!-- Combat Log -->
	<div class="combat-log">
		{#each combatLog as message}
			<p class="log-entry">{message}</p>
		{/each}
	</div>

	<!-- Action Buttons -->
	{#if !isCombatOver}
		<div class="combat-actions">
			<Button
				variant="danger"
				size="lg"
				onclick={handleAttack}
				disabled={!isPlayerTurn || isRollingDice}
			>
				<Icon name="zap" size="sm" />
				{$t.pixelSurvivor.combat.attack}
			</Button>
			<Button
				variant="secondary"
				size="md"
				onclick={handleFlee}
				disabled={!isPlayerTurn || isRollingDice}
			>
				{$t.pixelSurvivor.combat.flee}
			</Button>
		</div>

		<!-- Turn Indicator -->
		<div class="turn-indicator">
			{#if isPlayerTurn}
				<span class="your-turn">{$t.pixelSurvivor.combat.yourTurn}</span>
			{:else}
				<span class="enemy-turn">{$t.pixelSurvivor.combat.enemyTurn}</span>
			{/if}
		</div>
	{:else}
		<!-- Combat Over Message -->
		<div class="combat-over">
			{#if combatState?.phase === 'victory'}
				<span class="victory-text">{$t.pixelSurvivor.combat.victoryTitle}</span>
				<span class="xp-gained">+{combatState.xpReward} XP</span>
			{:else if combatState?.phase === 'defeat'}
				<span class="defeat-text">{$t.pixelSurvivor.combat.defeatTitle}</span>
			{:else}
				<span class="fled-text">{$t.pixelSurvivor.combat.fledTitle}</span>
			{/if}
		</div>
	{/if}
</div>

<style>
	.combat-screen {
		display: flex;
		flex-direction: column;
		gap: var(--space-4);
		padding: var(--space-4);
		width: 100%;
		max-width: 500px;
		margin: 0 auto;
	}

	/* Combat Arena */
	.combat-arena {
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: var(--space-4);
		padding: var(--space-4);
		background: var(--color-bg-tertiary);
		border-radius: var(--radius-lg);
	}

	.combatant {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: var(--space-2);
		flex: 1;
	}

	.combatant-sprite {
		padding: var(--space-2);
		background: var(--color-bg-secondary);
		border-radius: var(--radius-md);
		border: 2px solid var(--color-bg-elevated);
	}

	.monster-sprite {
		transform: scaleX(-1); /* Face the player */
	}

	.combatant-info {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: var(--space-1);
		width: 100%;
	}

	.monster-header {
		display: flex;
		align-items: center;
		gap: var(--space-2);
	}

	.combatant-name {
		font-size: var(--font-size-sm);
		font-weight: var(--font-weight-bold);
		color: var(--color-text-primary);
		text-transform: uppercase;
	}

	.hp-bar-container {
		width: 100%;
		height: 8px;
		background: var(--color-bg-primary);
		border-radius: var(--radius-sm);
		overflow: hidden;
	}

	.hp-bar {
		height: 100%;
		background: var(--color-success);
		transition: width 0.3s ease-out;
	}

	.hp-bar.low {
		background: var(--color-error);
	}

	.hp-bar.monster-hp {
		background: var(--color-danger);
	}

	.hp-text {
		font-size: var(--font-size-xs);
		color: var(--color-text-muted);
		font-variant-numeric: tabular-nums;
	}

	/* VS Indicator */
	.vs-indicator {
		display: flex;
		align-items: center;
		justify-content: center;
		padding: var(--space-2);
	}

	.vs-text {
		font-size: var(--font-size-xl);
		font-weight: var(--font-weight-black);
		color: var(--color-warning);
		text-shadow: 2px 2px 0 var(--color-bg-primary);
	}

	/* Result Display */
	.result-display {
		padding: var(--space-3);
		background: var(--color-bg-secondary);
		border-radius: var(--radius-md);
		text-align: center;
		animation: result-pop 0.3s ease-out;
	}

	.result-display.critical {
		background: var(--color-warning);
		color: var(--color-bg-primary);
	}

	.result-display.failure {
		background: var(--color-error);
		color: var(--color-text-primary);
	}

	.result-message {
		font-size: var(--font-size-md);
		font-weight: var(--font-weight-bold);
	}

	@keyframes result-pop {
		0% { transform: scale(0.8); opacity: 0; }
		50% { transform: scale(1.1); }
		100% { transform: scale(1); opacity: 1; }
	}

	/* Dice Container */
	.dice-container {
		display: flex;
		justify-content: center;
		padding: var(--space-4);
	}

	/* Combat Log */
	.combat-log {
		display: flex;
		flex-direction: column;
		gap: var(--space-1);
		padding: var(--space-3);
		background: var(--color-bg-secondary);
		border-radius: var(--radius-md);
		min-height: 80px;
		max-height: 120px;
		overflow-y: auto;
	}

	.log-entry {
		margin: 0;
		font-size: var(--font-size-sm);
		color: var(--color-text-secondary);
		line-height: 1.4;
	}

	.log-entry:last-child {
		color: var(--color-text-primary);
		font-weight: var(--font-weight-medium);
	}

	/* Combat Actions */
	.combat-actions {
		display: flex;
		justify-content: center;
		gap: var(--space-3);
	}

	/* Turn Indicator */
	.turn-indicator {
		text-align: center;
		padding: var(--space-2);
	}

	.your-turn {
		font-size: var(--font-size-md);
		font-weight: var(--font-weight-bold);
		color: var(--color-success);
		text-transform: uppercase;
		animation: pulse 1s ease-in-out infinite;
	}

	.enemy-turn {
		font-size: var(--font-size-md);
		font-weight: var(--font-weight-bold);
		color: var(--color-error);
		text-transform: uppercase;
	}

	@keyframes pulse {
		0%, 100% { opacity: 1; }
		50% { opacity: 0.6; }
	}

	/* Combat Over */
	.combat-over {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: var(--space-2);
		padding: var(--space-6);
		text-align: center;
	}

	.victory-text {
		font-size: var(--font-size-2xl);
		font-weight: var(--font-weight-black);
		color: var(--color-warning);
		text-transform: uppercase;
		animation: victory-bounce 0.5s ease-out;
	}

	.xp-gained {
		font-size: var(--font-size-lg);
		font-weight: var(--font-weight-bold);
		color: var(--color-success);
	}

	.defeat-text {
		font-size: var(--font-size-2xl);
		font-weight: var(--font-weight-black);
		color: var(--color-error);
		text-transform: uppercase;
	}

	.fled-text {
		font-size: var(--font-size-xl);
		font-weight: var(--font-weight-bold);
		color: var(--color-text-secondary);
		text-transform: uppercase;
	}

	@keyframes victory-bounce {
		0% { transform: scale(0.5); opacity: 0; }
		60% { transform: scale(1.2); }
		100% { transform: scale(1); opacity: 1; }
	}

	/* Mobile */
	@media (max-width: 400px) {
		.combat-arena {
			flex-direction: column;
			gap: var(--space-2);
		}

		.vs-indicator {
			transform: rotate(90deg);
		}

		.combatant {
			flex-direction: row;
			width: 100%;
		}

		.combatant-info {
			align-items: flex-start;
		}
	}
</style>
