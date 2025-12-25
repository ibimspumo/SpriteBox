/**
 * Combat Engine
 *
 * Handles turn-based combat between player and monsters.
 * Manages damage calculation, turn order, and combat resolution.
 *
 * @module engine/combat/engine
 */

import {
	type CombatState,
	type CombatPhase,
	type CombatParticipant,
	type CombatAction,
	type CombatActionResult,
	type CombatLogEntry,
	type CombatD20Roll,
	type DamageCalculationInput,
	type DamageCalculationResult,
	type CombatConfig,
	getCombatD20Result,
	DEFAULT_COMBAT_CONFIG
} from './types.js';
import type { MonsterInstance } from './monsters/types.js';
import type { GameCharacter } from '../character/types.js';
import type { ElementAffinity, InteractionType } from '../core/elements/types.js';
import type { TraitType } from '../character/traits/types.js';
import { OFFENSIVE_TRAITS, DEFENSIVE_TRAITS } from '../character/traits/types.js';
import { calculateElementMultiplier, createElementAffinity } from '../core/elements/index.js';
import { calculateXpReward } from './monsters/registry.js';
import { generateSecureId, secureRandomFloat, secureRandomInt } from '../core/random.js';

// ============================================
// TRAIT DAMAGE BONUS
// ============================================

/**
 * Calculate the trait-based damage bonus.
 * Offensive traits: +1 damage
 * Defensive traits: -1 damage
 * Utility/balanced traits: +0 damage
 */
function getTraitDamageBonus(trait: TraitType): number {
	if ((OFFENSIVE_TRAITS as readonly string[]).includes(trait)) {
		return 1;
	}
	if ((DEFENSIVE_TRAITS as readonly string[]).includes(trait)) {
		return -1;
	}
	return 0;
}

/**
 * Calculate player base damage including trait bonus.
 * Base: 5, modified by trait (+1/-1/0)
 * Minimum base damage is 1.
 */
function calculatePlayerBaseDamage(trait: TraitType): number {
	const base = 5;
	const traitBonus = getTraitDamageBonus(trait);
	return Math.max(1, base + traitBonus);
}

// ============================================
// COMBAT ENGINE CLASS
// ============================================

/**
 * Combat Engine - manages a single combat encounter.
 */
export class CombatEngine {
	private state: CombatState;
	private config: CombatConfig;
	private onStateChange?: (state: CombatState) => void;
	private activeTimers: Set<ReturnType<typeof setTimeout>> = new Set();

	constructor(config: Partial<CombatConfig> = {}) {
		this.config = { ...DEFAULT_COMBAT_CONFIG, ...config };
		this.state = this.createEmptyState();
	}

	/**
	 * Create an empty combat state.
	 */
	private createEmptyState(): CombatState {
		return {
			combatId: '',
			phase: 'initializing',
			turn: 0,
			currentTurnIndex: 0,
			player: this.createEmptyParticipant(),
			monsters: [],
			turnOrder: [],
			log: [],
			startedAt: 0
		};
	}

	/**
	 * Create an empty participant placeholder.
	 */
	private createEmptyParticipant(): CombatParticipant {
		return {
			id: '',
			name: '',
			isPlayer: false,
			pixels: '',
			element: createElementAffinity('neutral'),
			currentHp: 0,
			maxHp: 0,
			attack: 0,
			defense: 0,
			speed: 0,
			luck: 0,
			baseDamage: 5,
			isAlive: false
		};
	}

	/**
	 * Generate a unique combat ID.
	 */
	private generateCombatId(): string {
		const randomPart = Array.from(crypto.getRandomValues(new Uint8Array(4)))
			.map((b) => b.toString(16).padStart(2, '0'))
			.join('');
		return `combat_${Date.now()}_${randomPart}`;
	}

	/**
	 * Generate a unique log entry ID.
	 */
	private generateLogEntryId(): string {
		return generateSecureId('log', 6);
	}

	/**
	 * Set state change callback.
	 */
	public setOnStateChange(callback: (state: CombatState) => void): void {
		this.onStateChange = callback;
	}

	/**
	 * Notify state change.
	 */
	private notifyStateChange(): void {
		if (this.onStateChange) {
			this.onStateChange({ ...this.state });
		}
	}

	/**
	 * Get current combat state.
	 */
	public getState(): CombatState {
		return { ...this.state };
	}

	/**
	 * Initialize combat between player and monster(s).
	 */
	public initializeCombat(
		player: GameCharacter,
		monsters: MonsterInstance[]
	): CombatState {
		// Calculate player base damage (2 + trait bonus)
		const playerBaseDamage = calculatePlayerBaseDamage(player.trait);

		// Create player participant
		const playerParticipant: CombatParticipant = {
			id: player.id,
			name: player.name,
			isPlayer: true,
			pixels: player.pixels,
			element: player.elementAffinity,
			currentHp: player.statManager.getCurrentResource('hp'),
			maxHp: player.statManager.getStat('maxHp'),
			attack: player.statManager.getStat('attack'),
			defense: player.statManager.getStat('defense'),
			speed: player.statManager.getStat('speed'),
			luck: player.statManager.getStat('luck'),
			baseDamage: playerBaseDamage,
			isAlive: true
		};

		// Determine turn order based on speed
		const participants = [
			{ id: player.id, speed: playerParticipant.speed },
			...monsters.map((m) => ({ id: m.instanceId, speed: m.speed }))
		];

		// Sort by speed (highest first), with random tiebreaker
		participants.sort((a, b) => {
			if (b.speed !== a.speed) return b.speed - a.speed;
			return secureRandomFloat() - 0.5;
		});

		const turnOrder = participants.map((p) => p.id);

		// Initialize state
		this.state = {
			combatId: this.generateCombatId(),
			phase: 'initializing',
			turn: 1,
			currentTurnIndex: 0,
			player: playerParticipant,
			monsters: [...monsters],
			turnOrder,
			log: [],
			startedAt: Date.now()
		};

		// Start first turn
		this.startNextTurn();

		return this.getState();
	}

	/**
	 * Start the next turn in combat.
	 */
	private startNextTurn(): void {
		// Check if combat is over
		if (!this.state.player.isAlive) {
			this.cleanup();
			this.state.phase = 'defeat';
			this.state.endedAt = Date.now();
			this.notifyStateChange();
			return;
		}

		const aliveMonsters = this.state.monsters.filter((m) => m.isAlive);
		if (aliveMonsters.length === 0) {
			this.handleVictory();
			return;
		}

		// Get current turn participant
		const currentId = this.state.turnOrder[this.state.currentTurnIndex];

		if (currentId === this.state.player.id) {
			this.state.phase = 'player_turn';
		} else {
			this.state.phase = 'monster_turn';
		}

		this.notifyStateChange();
	}

	/**
	 * Handle player victory.
	 */
	private handleVictory(): void {
		// Clean up any pending timers
		this.cleanup();

		// Calculate total XP reward
		let totalXp = 0;
		const playerLevel = 1; // TODO: Get from player stats

		for (const monster of this.state.monsters) {
			totalXp += calculateXpReward(monster, playerLevel);
		}

		this.state.phase = 'victory';
		this.state.endedAt = Date.now();
		this.state.xpReward = totalXp;
		this.state.loot = []; // TODO: Calculate loot

		this.notifyStateChange();
	}

	/**
	 * Advance to next participant's turn.
	 */
	private advanceTurn(): void {
		// Move to next participant
		this.state.currentTurnIndex =
			(this.state.currentTurnIndex + 1) % this.state.turnOrder.length;

		// If we've gone through everyone, increment turn counter
		if (this.state.currentTurnIndex === 0) {
			this.state.turn++;

			// Reduce ability cooldowns for all monsters
			for (const monster of this.state.monsters) {
				for (const abilityId of Object.keys(monster.abilityCooldowns)) {
					if (monster.abilityCooldowns[abilityId] > 0) {
						monster.abilityCooldowns[abilityId]--;
					}
				}
			}
		}

		// Skip dead participants
		let currentId = this.state.turnOrder[this.state.currentTurnIndex];
		let loopCount = 0;

		while (loopCount < this.state.turnOrder.length) {
			if (currentId === this.state.player.id && this.state.player.isAlive) {
				break;
			}

			const monster = this.state.monsters.find((m) => m.instanceId === currentId);
			if (monster && monster.isAlive) {
				break;
			}

			this.state.currentTurnIndex =
				(this.state.currentTurnIndex + 1) % this.state.turnOrder.length;
			currentId = this.state.turnOrder[this.state.currentTurnIndex];
			loopCount++;
		}

		this.startNextTurn();
	}

	/**
	 * Roll a D20 for combat.
	 */
	public rollD20(): CombatD20Roll {
		const roll = crypto.getRandomValues(new Uint8Array(1))[0] % 20 + 1;
		return getCombatD20Result(roll);
	}

	/**
	 * Calculate damage for an attack.
	 *
	 * Formula:
	 * 1. Start with base damage (player: 2+trait, monster: 1)
	 * 2. Apply D20 modifier
	 * 3. Apply ability multiplier
	 * 4. Apply attack stat multiplier (1 + attack/100, so 40 attack = 1.4x)
	 * 5. Apply defense multiplier (1 - defense/100, capped at soft cap)
	 * 6. Apply element modifier
	 * 7. Add bonus damage
	 */
	public calculateDamage(input: DamageCalculationInput): DamageCalculationResult {
		// Step 1: Base damage (default 5 for monsters, 5 for players - passed via baseDamage)
		const baseDamage = input.baseDamage ?? 5;

		// Step 2: Apply D20 modifier
		const d20ModifiedDamage = Math.round(baseDamage * input.d20Roll.damageMultiplier);

		// Step 3: Apply ability multiplier if present
		const abilityMod = input.abilityMultiplier ?? 1.0;
		const afterAbility = Math.round(d20ModifiedDamage * abilityMod);

		// Step 4: Apply attack stat multiplier (1 + attack/100)
		// Examples: 40 attack = 1.4x, 100 attack = 2.0x, 0 attack = 1.0x
		const attackMultiplier = 1 + input.attackStat / 100;
		const afterAttack = Math.round(afterAbility * attackMultiplier);

		// Step 5: Apply defense multiplier (1 - defense/100)
		// Soft cap: defense reduction is capped (default 50%, can be increased by items)
		const defenseCap = input.defenseCapOverride ?? this.config.defenseReductionCap;
		const effectiveDefense = Math.min(input.defenseStat, defenseCap);
		const defenseMultiplier = Math.max(0.1, 1 - effectiveDefense / 100);
		const afterDefense = Math.max(this.config.minimumDamage, Math.round(afterAttack * defenseMultiplier));

		// Step 6: Apply element modifier
		const elementResult = calculateElementMultiplier(
			input.attackerElement,
			input.defenderElement
		);
		const afterElement = Math.round(afterDefense * elementResult.multiplier);

		// Step 7: Add bonus damage
		const finalDamage = afterElement + (input.bonusDamage ?? 0);

		// Build breakdown string
		const breakdown = [
			`Base: ${baseDamage}`,
			`D20 (${input.d20Roll.value}): x${input.d20Roll.damageMultiplier}`,
			abilityMod !== 1.0 ? `Ability: x${abilityMod}` : null,
			`Attack: x${attackMultiplier.toFixed(2)}`,
			`Defense: x${defenseMultiplier.toFixed(2)}`,
			elementResult.multiplier !== 1.0 ? `Element: x${elementResult.multiplier}` : null,
			input.bonusDamage ? `Bonus: +${input.bonusDamage}` : null
		]
			.filter(Boolean)
			.join(' → ');

		return {
			finalDamage: Math.max(this.config.minimumDamage, finalDamage),
			baseDamage,
			d20ModifiedDamage,
			afterDefense,
			afterElement,
			d20Multiplier: input.d20Roll.damageMultiplier,
			defenseReduction: Math.floor((1 - defenseMultiplier) * 100),
			elementMultiplier: elementResult.multiplier,
			elementInteraction: elementResult.effectiveInteraction,
			breakdown
		};
	}

	/**
	 * Execute a player action.
	 */
	public executePlayerAction(action: CombatAction, d20Roll: CombatD20Roll): CombatActionResult {
		if (this.state.phase !== 'player_turn' && this.state.phase !== 'player_rolling') {
			return {
				action,
				success: false,
				messageKey: 'pixelSurvivor.combat.notPlayerTurn'
			};
		}

		let result: CombatActionResult;

		switch (action.type) {
			case 'attack':
				result = this.executeAttack(this.state.player, action, d20Roll);
				break;

			case 'flee':
				result = this.executeFlee();
				break;

			case 'defend':
				result = this.executeDefend(this.state.player);
				break;

			default:
				result = {
					action,
					success: false,
					messageKey: 'pixelSurvivor.combat.invalidAction'
				};
		}

		// Add to combat log
		this.addLogEntry(result);

		// Check for victory/defeat
		if (result.targetDefeated) {
			const aliveMonsters = this.state.monsters.filter((m) => m.isAlive);
			if (aliveMonsters.length === 0) {
				this.handleVictory();
				return result;
			}
		}

		// Advance turn
		if (result.success) {
			this.state.phase = 'player_attack';
			this.notifyStateChange();

			// After animation, advance to next turn
			const timerId = setTimeout(() => {
				this.activeTimers.delete(timerId);
				this.advanceTurn();
			}, this.config.attackAnimationDuration);
			this.activeTimers.add(timerId);
		}

		return result;
	}

	/**
	 * Execute an attack action.
	 */
	private executeAttack(
		attacker: CombatParticipant,
		action: CombatAction,
		d20Roll: CombatD20Roll
	): CombatActionResult {
		// Find target
		let target: CombatParticipant | MonsterInstance | undefined;
		let targetIsMonster = false;

		if (attacker.isPlayer) {
			// Player attacks monster
			if (action.targetId) {
				target = this.state.monsters.find((m) => m.instanceId === action.targetId);
			} else {
				// Default to first alive monster
				target = this.state.monsters.find((m) => m.isAlive);
			}
			targetIsMonster = true;
		} else {
			// Monster attacks player
			target = this.state.player;
		}

		if (!target) {
			return {
				action,
				success: false,
				messageKey: 'pixelSurvivor.combat.noTarget'
			};
		}

		// Calculate damage
		const defenderElement = targetIsMonster
			? createElementAffinity((target as MonsterInstance).element)
			: (target as CombatParticipant).element;

		const damageInput: DamageCalculationInput = {
			attackStat: attacker.attack,
			defenseStat: targetIsMonster
				? (target as MonsterInstance).defense
				: (target as CombatParticipant).defense,
			d20Roll,
			attackerElement: attacker.element,
			defenderElement,
			baseDamage: attacker.baseDamage
		};

		const damageResult = this.calculateDamage(damageInput);

		// Apply damage
		if (targetIsMonster) {
			const monster = target as MonsterInstance;
			monster.currentHp = Math.max(0, monster.currentHp - damageResult.finalDamage);
			monster.isAlive = monster.currentHp > 0;
		} else {
			const player = target as CombatParticipant;
			player.currentHp = Math.max(0, player.currentHp - damageResult.finalDamage);
			player.isAlive = player.currentHp > 0;
			this.state.player = player;
		}

		const targetDefeated = targetIsMonster
			? !(target as MonsterInstance).isAlive
			: !(target as CombatParticipant).isAlive;

		return {
			action,
			success: true,
			d20Roll,
			damage: damageResult.finalDamage,
			baseDamage: damageResult.baseDamage,
			elementInteraction: damageResult.elementInteraction,
			elementMultiplier: damageResult.elementMultiplier,
			targetDefeated,
			messageKey: targetDefeated
				? 'pixelSurvivor.combat.defeated'
				: 'pixelSurvivor.combat.attacked'
		};
	}

	/**
	 * Execute a defend action.
	 */
	private executeDefend(participant: CombatParticipant): CombatActionResult {
		// TODO: Apply defense buff for this turn
		return {
			action: { type: 'defend', actorId: participant.id },
			success: true,
			messageKey: 'pixelSurvivor.combat.defended'
		};
	}

	/**
	 * Execute a flee action.
	 */
	private executeFlee(): CombatActionResult {
		if (!this.config.canFlee) {
			return {
				action: { type: 'flee', actorId: this.state.player.id },
				success: false,
				fleeSuccess: false,
				messageKey: 'pixelSurvivor.combat.cannotFlee'
			};
		}

		// Calculate flee chance based on speed
		const playerSpeed = this.state.player.speed;
		const avgMonsterSpeed =
			this.state.monsters.reduce((sum, m) => sum + m.speed, 0) / this.state.monsters.length;

		let fleeChance = this.config.baseFleeChance;
		if (playerSpeed > avgMonsterSpeed) {
			fleeChance += (playerSpeed - avgMonsterSpeed) * 0.01;
		} else {
			fleeChance -= (avgMonsterSpeed - playerSpeed) * 0.01;
		}

		fleeChance = Math.max(0.1, Math.min(0.9, fleeChance));

		const roll = secureRandomFloat();
		const success = roll < fleeChance;

		if (success) {
			this.cleanup();
			this.state.phase = 'fled';
			this.state.endedAt = Date.now();
			this.notifyStateChange();
		}

		return {
			action: { type: 'flee', actorId: this.state.player.id },
			success,
			fleeSuccess: success,
			messageKey: success
				? 'pixelSurvivor.combat.fledSuccess'
				: 'pixelSurvivor.combat.fledFailed'
		};
	}

	/**
	 * Execute monster turn (AI).
	 * @param externalD20Roll - Optional external D20 roll (e.g., from visual dice). If not provided, rolls internally.
	 */
	public executeMonsterTurn(externalD20Roll?: CombatD20Roll): CombatActionResult {
		if (this.state.phase !== 'monster_turn') {
			return {
				action: { type: 'attack', actorId: '' },
				success: false,
				messageKey: 'pixelSurvivor.combat.notMonsterTurn'
			};
		}

		const currentId = this.state.turnOrder[this.state.currentTurnIndex];
		const monster = this.state.monsters.find((m) => m.instanceId === currentId);

		if (!monster || !monster.isAlive) {
			this.advanceTurn();
			return {
				action: { type: 'attack', actorId: '' },
				success: false,
				messageKey: 'pixelSurvivor.combat.monsterNotFound'
			};
		}

		// Use external D20 roll if provided, otherwise roll internally
		const d20Roll = externalD20Roll ?? this.rollD20();

		// Create monster participant for attack (base damage is 1 for monsters)
		const monsterParticipant: CombatParticipant = {
			id: monster.instanceId,
			name: monster.name,
			isPlayer: false,
			pixels: monster.pixels,
			element: createElementAffinity(monster.element),
			currentHp: monster.currentHp,
			maxHp: monster.maxHp,
			attack: monster.attack,
			defense: monster.defense,
			speed: monster.speed,
			luck: monster.luck,
			baseDamage: 5,
			isAlive: monster.isAlive
		};

		const action: CombatAction = {
			type: 'attack',
			actorId: monster.instanceId,
			targetId: this.state.player.id
		};

		const result = this.executeAttack(monsterParticipant, action, d20Roll);

		// Add to combat log
		this.addLogEntry(result);

		// Check for player defeat
		if (!this.state.player.isAlive) {
			this.cleanup();
			this.state.phase = 'defeat';
			this.state.endedAt = Date.now();
			this.notifyStateChange();
			return result;
		}

		// Advance turn after animation
		this.state.phase = 'monster_attack';
		this.notifyStateChange();

		const timerId = setTimeout(() => {
			this.activeTimers.delete(timerId);
			this.advanceTurn();
		}, this.config.attackAnimationDuration);
		this.activeTimers.add(timerId);

		return result;
	}

	/**
	 * Add entry to combat log.
	 */
	private addLogEntry(result: CombatActionResult): void {
		const entry: CombatLogEntry = {
			id: this.generateLogEntryId(),
			timestamp: Date.now(),
			turn: this.state.turn,
			result
		};

		this.state.log.push(entry);
		this.state.lastResult = result;
	}

	/**
	 * Check if combat is over.
	 */
	public isCombatOver(): boolean {
		return (
			this.state.phase === 'victory' ||
			this.state.phase === 'defeat' ||
			this.state.phase === 'fled'
		);
	}

	/**
	 * Check if it's the player's turn.
	 */
	public isPlayerTurn(): boolean {
		return this.state.phase === 'player_turn' || this.state.phase === 'player_rolling';
	}

	/**
	 * Check if it's a monster's turn.
	 */
	public isMonsterTurn(): boolean {
		return this.state.phase === 'monster_turn' || this.state.phase === 'monster_rolling';
	}

	/**
	 * Get the current active monster (whose turn it is).
	 */
	public getCurrentMonster(): MonsterInstance | undefined {
		if (!this.isMonsterTurn()) return undefined;

		const currentId = this.state.turnOrder[this.state.currentTurnIndex];
		return this.state.monsters.find((m) => m.instanceId === currentId);
	}

	/**
	 * Sync player HP from external StatManager.
	 */
	public syncPlayerHp(currentHp: number, maxHp: number): void {
		this.state.player.currentHp = currentHp;
		this.state.player.maxHp = maxHp;
		this.state.player.isAlive = currentHp > 0;
		this.notifyStateChange();
	}

	/**
	 * Apply damage to player from external source.
	 */
	public applyDamageToPlayer(damage: number): void {
		this.state.player.currentHp = Math.max(0, this.state.player.currentHp - damage);
		this.state.player.isAlive = this.state.player.currentHp > 0;

		if (!this.state.player.isAlive) {
			this.cleanup();
			this.state.phase = 'defeat';
			this.state.endedAt = Date.now();
		}

		this.notifyStateChange();
	}

	/**
	 * Cleanup all active timers.
	 * Should be called when combat ends or when the engine is being destroyed.
	 */
	public cleanup(): void {
		for (const timerId of this.activeTimers) {
			clearTimeout(timerId);
		}
		this.activeTimers.clear();
	}
}

// ============================================
// FACTORY FUNCTION
// ============================================

/**
 * Create a new combat engine.
 */
export function createCombatEngine(config?: Partial<CombatConfig>): CombatEngine {
	return new CombatEngine(config);
}
