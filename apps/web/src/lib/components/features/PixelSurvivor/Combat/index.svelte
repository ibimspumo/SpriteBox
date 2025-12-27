<!-- PixelSurvivor/Combat/index.svelte - Turn-based combat screen orchestrator -->
<script lang="ts">
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
	import { rollD20, resetD20, d20RollState } from '$lib/survivor/engine';
	import { playSound } from '$lib/audio';
	import { onMount, onDestroy } from 'svelte';

	// Sub-components
	import CombatArena from './CombatArena.svelte';
	import CombatDiceRoll from './CombatDiceRoll.svelte';
	import CombatLog from './CombatLog.svelte';
	import CombatActions from './CombatActions.svelte';
	import CombatResult from './CombatResult.svelte';

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
	<CombatArena
		character={$currentGameCharacter}
		{monster}
		{combatState}
		currentHp={$currentHp}
		maxHp={$maxHp}
		{playerHit}
		{monsterHit}
		{playerAttacking}
		{monsterAttacking}
		{playerDamageNumbers}
		{monsterDamageNumbers}
		onRemoveDamageNumber={removeDamageNumber}
		{getMonsterName}
	/>

	<!-- D20 Dice -->
	<CombatDiceRoll isRolling={isRollingDice} {isCombatOver} />

	<!-- Combat Log -->
	<CombatLog messages={combatLog} />

	<!-- Action Buttons or Combat Result -->
	{#if !isCombatOver}
		<CombatActions
			{isPlayerTurn}
			{isRollingDice}
			onAttack={handleAttack}
			onFlee={handleFlee}
		/>
	{:else}
		<CombatResult
			phase={combatState?.phase ?? 'victory'}
			xpReward={combatState?.xpReward ?? 0}
		/>
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
</style>
