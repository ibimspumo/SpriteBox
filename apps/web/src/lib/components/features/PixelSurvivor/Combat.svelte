<!-- PixelSurvivor/Combat.svelte - Turn-based combat screen -->
<script lang="ts">
	import { Button, Icon, Badge } from '../../atoms';
	import { PixelCanvas, DamageNumber } from '../../utility';
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
	import { playSound } from '$lib/audio';
	import { onMount, onDestroy } from 'svelte';

	interface Props {
		onCombatEnd?: (result: 'victory' | 'defeat' | 'fled', xpGained: number) => void;
	}

	let { onCombatEnd }: Props = $props();

	// Log entry type for reactive i18n
	type CombatLogKey = 'encounterStart' | 'playerAttack' | 'monsterAttack' | 'victory' | 'defeat' | 'fledSuccess' | 'fledFailed';
	interface LogEntry {
		key: CombatLogKey;
		params: Record<string, string>;
		prefix?: 'criticalHit' | 'criticalFail';
		suffix?: 'superEffective' | 'notEffective';
	}

	// Combat state
	let combatEngine = $state<CombatEngine | null>(null);
	let combatState = $state<CombatState | null>(null);
	let isRollingDice = $state(false);
	let currentRoller = $state<'player' | 'monster' | null>(null); // Who is currently rolling
	let lastResult = $state<CombatActionResult | null>(null);
	let combatLogEntries = $state<LogEntry[]>([]);

	// Reactive translated combat log
	const combatLog = $derived(combatLogEntries.map(entry => {
		const translations = $t.pixelSurvivor.combat;
		let message = translations[entry.key] as string;

		// Replace params
		for (const [key, value] of Object.entries(entry.params)) {
			message = message.replace(`{${key}}`, value);
		}

		// Add prefix (critical hit/fail)
		if (entry.prefix) {
			message = `${translations[entry.prefix]} ${message}`;
		}

		// Add suffix (element effectiveness)
		if (entry.suffix) {
			message = `${message} ${translations[entry.suffix]}`;
		}

		return message;
	}));

	// Current monster
	let monster = $state<MonsterInstance | null>(null);

	// D20 roll subscription
	let d20Unsubscribe: (() => void) | null = null;

	// Prevent duplicate monster turn timers
	let monsterTurnTimerActive = $state(false);

	// Attack animation states
	let playerHit = $state(false);
	let monsterHit = $state(false);
	let playerAttacking = $state(false);
	let monsterAttacking = $state(false);

	// Floating damage numbers
	interface DamageNumberEntry {
		id: number;
		value: number;
		type: 'damage' | 'heal' | 'crit' | 'miss';
	}
	let playerDamageNumbers = $state<DamageNumberEntry[]>([]);
	let monsterDamageNumbers = $state<DamageNumberEntry[]>([]);
	let damageNumberId = 0;

	function showDamageNumber(target: 'player' | 'monster', value: number, isCrit: boolean): void {
		const entry: DamageNumberEntry = {
			id: damageNumberId++,
			value,
			type: isCrit ? 'crit' : 'damage'
		};

		if (target === 'player') {
			playerDamageNumbers = [...playerDamageNumbers, entry];
		} else {
			monsterDamageNumbers = [...monsterDamageNumbers, entry];
		}
	}

	function removeDamageNumber(target: 'player' | 'monster', id: number): void {
		if (target === 'player') {
			playerDamageNumbers = playerDamageNumbers.filter(n => n.id !== id);
		} else {
			monsterDamageNumbers = monsterDamageNumbers.filter(n => n.id !== id);
		}
	}

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

		// IMPORTANT: Set up state change callback BEFORE initializing combat
		// This ensures we capture the initial phase change (e.g., monster_turn if monster is faster)
		engine.setOnStateChange((newState) => {
			combatState = newState;
			handlePhaseChange(newState);
		});

		// Initialize combat - this triggers startNextTurn() which calls notifyStateChange()
		const state = engine.initializeCombat(character, [monster]);
		combatEngine = engine;
		combatState = state;

		// Add initial log entry
		addLogEntry({ key: 'encounterStart', params: { monster: getMonsterName() } });

		// Manually trigger phase check in case the callback fired before combatEngine was set
		handlePhaseChange(state);
	}

	function handlePhaseChange(state: CombatState): void {
		if (state.phase === 'monster_turn' && !monsterTurnTimerActive && !isRollingDice) {
			// Auto-start monster dice roll after delay (with guard against duplicate timers)
			monsterTurnTimerActive = true;
			setTimeout(() => {
				monsterTurnTimerActive = false;
				// Start the dice roll for monster attack
				startDiceRoll('monster');
			}, 1000);
		}
	}

	function getMonsterName(): string {
		if (!monster) return $t.pixelSurvivor.unknownName;
		// Try to get translated name, fallback to capitalized definitionId
		const monsters = $t.pixelSurvivor.monsters as Record<string, { name: string; description: string }>;
		const translatedName = monsters[monster.definitionId]?.name;
		return translatedName ?? monster.definitionId.charAt(0).toUpperCase() + monster.definitionId.slice(1);
	}

	function addLogEntry(entry: LogEntry): void {
		combatLogEntries = [...combatLogEntries, entry];
		// Keep only last 5 messages
		if (combatLogEntries.length > 5) {
			combatLogEntries = combatLogEntries.slice(-5);
		}
	}

	// Start dice roll for any attacker (player or monster)
	function startDiceRoll(roller: 'player' | 'monster'): void {
		currentRoller = roller;
		isRollingDice = true;

		// Roll D20 visual
		rollD20();

		// Subscribe to D20 result
		d20Unsubscribe = d20RollState.subscribe((state) => {
			if (state.result !== null && !state.isRolling) {
				// Create D20Roll with the visual result
				const roll = combatEngine!.rollD20();
				roll.value = state.result;
				roll.isNat20 = state.result === 20;
				roll.isNat1 = state.result === 1;
				roll.damageMultiplier = state.result === 20 ? 2.0 : state.result === 1 ? 0.5 : 1.0;

				// Execute the appropriate attack
				if (currentRoller === 'player') {
					executePlayerAttack(roll);
				} else {
					executeMonsterAttack(roll);
				}

				resetD20();
				isRollingDice = false;
				currentRoller = null;

				if (d20Unsubscribe) {
					d20Unsubscribe();
					d20Unsubscribe = null;
				}
			}
		});
	}

	// Player attack button handler
	function handleAttack(): void {
		if (!combatEngine || !combatState || combatState.phase !== 'player_turn') return;
		startDiceRoll('player');
	}

	function executePlayerAttack(d20Roll: CombatD20Roll): void {
		if (!combatEngine || !monster) return;

		const result = combatEngine.executePlayerAction(
			{ type: 'attack', actorId: combatState!.player.id, targetId: monster.instanceId },
			d20Roll
		);

		lastResult = result;

		// Trigger attack animations and damage number
		if (result.success && result.damage !== undefined) {
			playerAttacking = true;
			setTimeout(() => {
				playerAttacking = false;
				monsterHit = true;
				playSound('attack');
				// Show floating damage number on monster
				showDamageNumber('monster', result.damage!, d20Roll.isNat20);
				setTimeout(() => { monsterHit = false; }, 300);
			}, 200);
		}

		// Build log entry
		if (result.success && result.damage !== undefined) {
			const entry: LogEntry = {
				key: 'playerAttack',
				params: {
					damage: result.damage.toString(),
					roll: d20Roll.value.toString()
				}
			};

			// Add crit prefix
			if (d20Roll.isNat20) entry.prefix = 'criticalHit';
			else if (d20Roll.isNat1) entry.prefix = 'criticalFail';

			// Add element suffix
			if (result.elementMultiplier && result.elementMultiplier > 1) {
				entry.suffix = 'superEffective';
			} else if (result.elementMultiplier && result.elementMultiplier < 1) {
				entry.suffix = 'notEffective';
			}

			addLogEntry(entry);
		}

		// Check for victory after delay
		setTimeout(() => {
			if (result.targetDefeated) {
				handleVictory();
			}
		}, 1000);
	}

	// Monster attack with dice result
	function executeMonsterAttack(d20Roll: CombatD20Roll): void {
		if (!combatEngine || !combatState) return;

		// Execute monster turn with our visual dice result
		const result = combatEngine.executeMonsterTurn(d20Roll);

		lastResult = result;

		// Trigger attack animations and damage number
		if (result.success && result.damage !== undefined && result.d20Roll) {
			monsterAttacking = true;
			setTimeout(() => {
				monsterAttacking = false;
				playerHit = true;
				playSound('attack');
				// Show floating damage number on player
				showDamageNumber('player', result.damage!, result.d20Roll!.isNat20);
				setTimeout(() => { playerHit = false; }, 300);
			}, 200);
		}

		if (result.success && result.damage !== undefined && result.d20Roll) {
			// Apply damage to player's actual StatManager
			const damageResult = applyPlayerDamage(result.damage);

			// Build log entry
			const entry: LogEntry = {
				key: 'monsterAttack',
				params: {
					monster: getMonsterName(),
					damage: result.damage.toString(),
					roll: result.d20Roll.value.toString()
				}
			};

			// Add crit prefix
			if (result.d20Roll.isNat20) entry.prefix = 'criticalHit';
			else if (result.d20Roll.isNat1) entry.prefix = 'criticalFail';

			addLogEntry(entry);

			// Check for defeat
			if (damageResult.remainingHp <= 0) {
				setTimeout(() => {
					handleDefeat();
				}, 1000);
			}
		}
	}

	function handleFlee(): void {
		if (!combatEngine || !combatState) return;

		const d20Roll = combatEngine.rollD20();
		const result = combatEngine.executePlayerAction(
			{ type: 'flee', actorId: combatState.player.id },
			d20Roll
		);

		if (result.fleeSuccess) {
			addLogEntry({ key: 'fledSuccess', params: {} });
			setTimeout(() => {
				onCombatEnd?.('fled', 0);
			}, 1000);
		} else {
			addLogEntry({ key: 'fledFailed', params: {} });
		}
	}

	function handleVictory(): void {
		const xp = combatState?.xpReward ?? 0;
		addXp(xp);
		addLogEntry({ key: 'victory', params: { xp: xp.toString() } });

		setTimeout(() => {
			onCombatEnd?.('victory', xp);
		}, 2000);
	}

	function handleDefeat(): void {
		addLogEntry({ key: 'defeat', params: {} });

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
			<div class="combatant-sprite" class:attacking={playerAttacking} class:hit={playerHit}>
				{#if $currentGameCharacter}
					<PixelCanvas
						pixelData={$currentGameCharacter.pixels}
						size={80}
						editable={false}
					/>
				{/if}
				{#if playerHit}
					<div class="hit-effect"></div>
				{/if}
				<!-- Floating damage numbers -->
				<div class="damage-numbers-wrapper">
					{#each playerDamageNumbers as dmg (dmg.id)}
						<DamageNumber
							value={dmg.value}
							type={dmg.type}
							onComplete={() => removeDamageNumber('player', dmg.id)}
						/>
					{/each}
				</div>
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
			<div class="combatant-sprite monster-sprite" class:attacking={monsterAttacking} class:hit={monsterHit}>
				{#if monster}
					<PixelCanvas
						pixelData={monster.pixels}
						size={80}
						editable={false}
					/>
				{/if}
				{#if monsterHit}
					<div class="hit-effect"></div>
				{/if}
				<!-- Floating damage numbers -->
				<div class="damage-numbers-wrapper">
					{#each monsterDamageNumbers as dmg (dmg.id)}
						<DamageNumber
							value={dmg.value}
							type={dmg.type}
							onComplete={() => removeDamageNumber('monster', dmg.id)}
						/>
					{/each}
				</div>
			</div>
			<div class="combatant-info">
				<div class="monster-header">
					<span class="combatant-name">{getMonsterName()}</span>
					<Badge variant="warning" text={$t.pixelSurvivor.levelFormat.replace('{level}', String(monster?.level ?? 1))} />
				</div>
				<div class="hp-bar-container">
					<div class="hp-bar monster-hp" style:width="{monsterHpPercent}%" class:low={monsterHpPercent < 25}></div>
				</div>
				<span class="hp-text">{monster?.currentHp ?? 0} / {monster?.maxHp ?? 0}</span>
			</div>
		</div>
	</div>

	<!-- D20 Dice (always visible during combat to avoid layout shifts) -->
	{#if !isCombatOver}
		<div class="dice-container" class:rolling={isRollingDice}>
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
				<span class="xp-gained">{$t.pixelSurvivor.xpGained.replace('{xp}', String(combatState.xpReward))}</span>
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

	/* Counter-flip damage numbers container on monster so they're readable */
	.damage-numbers-wrapper {
		position: absolute;
		inset: 0;
		pointer-events: none;
	}

	.monster-sprite .damage-numbers-wrapper {
		transform: scaleX(-1);
	}

	/* Attack Animations */
	.combatant-sprite {
		position: relative;
		transition: transform 0.1s ease-out;
	}

	.combatant-sprite.attacking {
		animation: attack-lunge 0.2s ease-out;
	}

	.player-side .combatant-sprite.attacking {
		animation: attack-lunge-right 0.2s ease-out;
	}

	.monster-side .combatant-sprite.attacking {
		animation: attack-lunge-left 0.2s ease-out;
	}

	.combatant-sprite.hit {
		animation: hit-shake 0.3s ease-out;
	}

	.hit-effect {
		position: absolute;
		inset: 0;
		background: radial-gradient(circle, rgba(255, 100, 100, 0.8) 0%, transparent 70%);
		border-radius: var(--radius-md);
		animation: hit-flash 0.3s ease-out forwards;
		pointer-events: none;
	}

	@keyframes attack-lunge-right {
		0% { transform: translateX(0); }
		50% { transform: translateX(20px) scale(1.1); }
		100% { transform: translateX(0); }
	}

	@keyframes attack-lunge-left {
		0% { transform: scaleX(-1) translateX(0); }
		50% { transform: scaleX(-1) translateX(20px) scale(1.1); }
		100% { transform: scaleX(-1) translateX(0); }
	}

	@keyframes hit-shake {
		0%, 100% { transform: translateX(0); }
		20% { transform: translateX(-8px); }
		40% { transform: translateX(8px); }
		60% { transform: translateX(-6px); }
		80% { transform: translateX(4px); }
	}

	.monster-side .combatant-sprite.hit {
		animation: hit-shake-monster 0.3s ease-out;
	}

	@keyframes hit-shake-monster {
		0%, 100% { transform: scaleX(-1) translateX(0); }
		20% { transform: scaleX(-1) translateX(-8px); }
		40% { transform: scaleX(-1) translateX(8px); }
		60% { transform: scaleX(-1) translateX(-6px); }
		80% { transform: scaleX(-1) translateX(4px); }
	}

	@keyframes hit-flash {
		0% { opacity: 1; }
		100% { opacity: 0; }
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

	/* Dice Container */
	.dice-container {
		display: flex;
		justify-content: center;
		align-items: center;
		padding: var(--space-4);
		min-height: 180px;
		opacity: 0.3;
		transition: opacity 0.3s ease;
	}

	.dice-container.rolling {
		opacity: 1;
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
