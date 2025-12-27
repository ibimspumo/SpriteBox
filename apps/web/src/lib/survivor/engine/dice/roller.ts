/**
 * Dice Roller
 *
 * D20-based dice rolling system for combat and skill checks.
 * Uses cryptographic randomness for secure rolls.
 *
 * @module engine/dice/roller
 */

import type {
	DiceType,
	DiceRoll,
	RollResult,
	SkillCheck,
	SkillCheckResult,
	DamageRoll,
	DamageRollResult,
	ParsedDiceNotation,
	RandomFunction
} from './types.js';
import { DICE_MAX, DEFAULT_DICE_ROLL, DEFAULT_SKILL_CHECK, DEFAULT_DAMAGE_ROLL } from './types.js';
import type { StatManager } from '../stats/manager.js';

// ============================================
// RANDOM NUMBER GENERATION
// ============================================

/**
 * Default cryptographically secure random function.
 */
function secureRandom(min: number, max: number): number {
	const range = max - min + 1;
	const array = new Uint32Array(1);
	crypto.getRandomValues(array);
	return min + (array[0] % range);
}

// ============================================
// DICE ROLLER CLASS
// ============================================

/**
 * Dice roller for all game rolls.
 */
export class DiceRoller {
	/** Random function to use */
	private randomFn: RandomFunction;

	/** Roll history for debugging/display */
	private history: RollResult[] = [];

	/** Maximum history size */
	private maxHistory: number = 100;

	constructor(randomFn?: RandomFunction) {
		this.randomFn = randomFn ?? secureRandom;
	}

	// ============================================
	// BASIC DICE ROLLING
	// ============================================

	/**
	 * Roll a single die.
	 */
	rollDie(dice: DiceType): number {
		return this.randomFn(1, DICE_MAX[dice]);
	}

	/**
	 * Roll multiple dice of the same type.
	 */
	rollDice(dice: DiceType, count: number): number[] {
		const results: number[] = [];
		for (let i = 0; i < count; i++) {
			results.push(this.rollDie(dice));
		}
		return results;
	}

	/**
	 * Roll dice with full configuration.
	 */
	roll(config: Partial<DiceRoll> = {}): RollResult {
		const rollConfig: DiceRoll = { ...DEFAULT_DICE_ROLL, ...config };
		const { dice, count, modifier, advantage, disadvantage } = rollConfig;

		let rolls: number[];
		let originalRolls: number[][] | undefined;

		// Handle advantage/disadvantage
		if (advantage || disadvantage) {
			const roll1 = this.rollDice(dice, count);
			const roll2 = this.rollDice(dice, count);
			originalRolls = [roll1, roll2];

			const sum1 = roll1.reduce((a, b) => a + b, 0);
			const sum2 = roll2.reduce((a, b) => a + b, 0);

			if (advantage) {
				rolls = sum1 >= sum2 ? roll1 : roll2;
			} else {
				rolls = sum1 <= sum2 ? roll1 : roll2;
			}
		} else {
			rolls = this.rollDice(dice, count);
		}

		const diceTotal = rolls.reduce((a, b) => a + b, 0);
		let total = diceTotal + modifier;

		// Apply min/max constraints
		if (rollConfig.minimum !== undefined) {
			total = Math.max(total, rollConfig.minimum);
		}
		if (rollConfig.maximum !== undefined) {
			total = Math.min(total, rollConfig.maximum);
		}

		// Check for natural 20/1 (only on d20 with single die)
		const isNatural20 = dice === 'd20' && count === 1 && rolls[0] === 20;
		const isNatural1 = dice === 'd20' && count === 1 && rolls[0] === 1;

		const result: RollResult = {
			roll: rollConfig,
			rolls,
			diceTotal,
			total,
			originalRolls,
			isNatural20,
			isNatural1,
			isCrit: isNatural20,
			isFumble: isNatural1,
			notation: this.formatNotation(rollConfig, rolls, total)
		};

		// Add to history
		this.addToHistory(result);

		return result;
	}

	/**
	 * Roll with advantage (roll twice, take higher).
	 */
	rollWithAdvantage(config: Partial<DiceRoll> = {}): RollResult {
		return this.roll({ ...config, advantage: true, disadvantage: false });
	}

	/**
	 * Roll with disadvantage (roll twice, take lower).
	 */
	rollWithDisadvantage(config: Partial<DiceRoll> = {}): RollResult {
		return this.roll({ ...config, advantage: false, disadvantage: true });
	}

	/**
	 * Roll a d20.
	 */
	rollD20(modifier: number = 0): RollResult {
		return this.roll({ dice: 'd20', count: 1, modifier });
	}

	/**
	 * Roll for percentile (1-100).
	 */
	rollPercentile(): number {
		return this.rollDie('d100');
	}

	// ============================================
	// SKILL CHECKS
	// ============================================

	/**
	 * Perform a skill check.
	 */
	skillCheck(stats: StatManager, config: Partial<SkillCheck> = {}): SkillCheckResult {
		const check: SkillCheck = { ...DEFAULT_SKILL_CHECK, ...config };

		// Get stat value and calculate modifier
		const statValue = stats.getStat(check.stat);
		const statModifier = Math.floor(statValue / 10); // D&D style: stat/10 = modifier

		// Calculate total bonuses and penalties
		const totalBonus = check.bonuses.reduce((a, b) => a + b, 0);
		const totalPenalty = check.penalties.reduce((a, b) => a + b, 0);

		// Roll the d20
		const rollResult = this.roll({
			dice: 'd20',
			count: 1,
			modifier: 0,
			advantage: check.advantage,
			disadvantage: check.disadvantage
		});

		// Calculate final result
		let finalResult = rollResult.total + statModifier + totalBonus - totalPenalty;

		// Apply minimum
		if (check.minimum !== undefined) {
			finalResult = Math.max(finalResult, check.minimum);
		}

		// Determine success/failure
		let success: boolean | undefined;
		let margin: number | undefined;
		let criticalSuccess = false;
		let criticalFailure = false;

		if (check.dc !== undefined) {
			// Natural 20 auto-success
			if (rollResult.isNatural20 && check.nat20AutoSuccess) {
				success = true;
				criticalSuccess = true;
			}
			// Natural 1 auto-failure
			else if (rollResult.isNatural1 && check.nat1AutoFail) {
				success = false;
				criticalFailure = true;
			}
			// Normal comparison
			else {
				success = finalResult >= check.dc;
			}

			margin = finalResult - check.dc;
		}

		return {
			check,
			rollResult,
			statValue,
			statModifier,
			totalBonus,
			totalPenalty,
			finalResult,
			dc: check.dc,
			success,
			margin,
			criticalSuccess,
			criticalFailure
		};
	}

	/**
	 * Attack roll.
	 */
	attackRoll(stats: StatManager, dc: number, bonuses: number[] = []): SkillCheckResult {
		return this.skillCheck(stats, {
			type: 'attack',
			stat: 'attack',
			dc,
			bonuses
		});
	}

	/**
	 * Defense roll.
	 */
	defenseRoll(stats: StatManager, dc: number, bonuses: number[] = []): SkillCheckResult {
		return this.skillCheck(stats, {
			type: 'defense',
			stat: 'defense',
			dc,
			bonuses
		});
	}

	/**
	 * Dodge roll.
	 */
	dodgeRoll(stats: StatManager, dc: number): SkillCheckResult {
		const dodgeChance = stats.getStat('dodgeChance');
		return this.skillCheck(stats, {
			type: 'dodge',
			stat: 'speed',
			dc,
			bonuses: [Math.floor(dodgeChance / 5)] // Convert dodge% to bonus
		});
	}

	/**
	 * Initiative roll.
	 */
	initiativeRoll(stats: StatManager): SkillCheckResult {
		return this.skillCheck(stats, {
			type: 'initiative',
			stat: 'speed',
			nat20AutoSuccess: false,
			nat1AutoFail: false
		});
	}

	/**
	 * Saving throw.
	 */
	savingThrow(stats: StatManager, dc: number, stat: 'defense' | 'luck'): SkillCheckResult {
		return this.skillCheck(stats, {
			type: 'save',
			stat,
			dc
		});
	}

	// ============================================
	// DAMAGE ROLLS
	// ============================================

	/**
	 * Roll for damage.
	 */
	damageRoll(stats: StatManager, config: Partial<DamageRoll> = {}, isCrit: boolean = false): DamageRollResult {
		const damageConfig: DamageRoll = { ...DEFAULT_DAMAGE_ROLL, ...config };

		// Roll base damage dice
		// On crit, double the number of dice
		const diceCount = isCrit && damageConfig.canCrit ? damageConfig.baseDice.count * 2 : damageConfig.baseDice.count;

		const rollResult = this.roll({
			...damageConfig.baseDice,
			count: diceCount
		});

		const baseDamage = rollResult.total;

		// Calculate scaling damage from stat
		const statValue = stats.getStat(damageConfig.scalingStat);
		const scalingDamage = Math.floor(statValue * damageConfig.scalingFactor);

		// Add bonus damage
		const bonusDamage = damageConfig.bonusDamage;

		// Calculate subtotal
		const subtotal = baseDamage + scalingDamage + bonusDamage;

		// Apply crit multiplier to non-dice damage if crit
		// (Dice are already doubled)
		let finalDamage = subtotal;
		if (isCrit && damageConfig.canCrit) {
			// Crit already doubled dice, now apply multiplier to rest
			const nonDiceDamage = scalingDamage + bonusDamage;
			finalDamage = baseDamage + Math.floor(nonDiceDamage * damageConfig.critMultiplier);
		}

		// Apply minimum damage
		finalDamage = Math.max(finalDamage, damageConfig.minimumDamage);

		// Create breakdown string
		const breakdown = this.formatDamageBreakdown(
			damageConfig,
			rollResult,
			baseDamage,
			scalingDamage,
			bonusDamage,
			finalDamage,
			isCrit
		);

		return {
			damageRoll: damageConfig,
			rollResult,
			baseDamage,
			scalingDamage,
			bonusDamage,
			subtotal,
			isCrit: isCrit && damageConfig.canCrit,
			finalDamage,
			damageType: damageConfig.damageType,
			breakdown
		};
	}

	/**
	 * Quick weapon damage roll.
	 */
	weaponDamage(
		stats: StatManager,
		dice: DiceType,
		count: number,
		isCrit: boolean = false,
		bonusDamage: number = 0
	): DamageRollResult {
		return this.damageRoll(
			stats,
			{
				baseDice: { dice, count, modifier: 0, advantage: false, disadvantage: false },
				scalingStat: 'attack',
				scalingFactor: 0.3,
				bonusDamage
			},
			isCrit
		);
	}

	// ============================================
	// UTILITY METHODS
	// ============================================

	/**
	 * Parse dice notation (e.g., "2d6+5").
	 */
	parseNotation(notation: string): ParsedDiceNotation {
		const regex = /^(\d+)?d(\d+)([+-]\d+)?$/i;
		const match = notation.trim().match(regex);

		if (!match) {
			return { count: 0, dice: 'd20', modifier: 0, isValid: false };
		}

		const count = match[1] ? parseInt(match[1], 10) : 1;
		const diceValue = parseInt(match[2], 10);
		const modifier = match[3] ? parseInt(match[3], 10) : 0;

		// Validate dice type
		const validDice = [4, 6, 8, 10, 12, 20, 100];
		if (!validDice.includes(diceValue)) {
			return { count: 0, dice: 'd20', modifier: 0, isValid: false };
		}

		return {
			count,
			dice: `d${diceValue}` as DiceType,
			modifier,
			isValid: true
		};
	}

	/**
	 * Roll from notation string.
	 */
	rollFromNotation(notation: string): RollResult | null {
		const parsed = this.parseNotation(notation);
		if (!parsed.isValid) {
			return null;
		}

		return this.roll({
			dice: parsed.dice,
			count: parsed.count,
			modifier: parsed.modifier
		});
	}

	/**
	 * Format roll result as notation string.
	 */
	private formatNotation(config: DiceRoll, rolls: number[], total: number): string {
		const diceStr = `${config.count}d${DICE_MAX[config.dice]}`;
		const modStr = config.modifier > 0 ? `+${config.modifier}` : config.modifier < 0 ? `${config.modifier}` : '';
		const rollsStr = rolls.length > 1 ? `[${rolls.join(', ')}]` : `${rolls[0]}`;

		return `${diceStr}${modStr} (${rollsStr}) = ${total}`;
	}

	/**
	 * Format damage breakdown.
	 */
	private formatDamageBreakdown(
		config: DamageRoll,
		rollResult: RollResult,
		baseDamage: number,
		scalingDamage: number,
		bonusDamage: number,
		finalDamage: number,
		isCrit: boolean
	): string {
		const parts: string[] = [];

		parts.push(`${rollResult.roll.count}d${DICE_MAX[rollResult.roll.dice]} = ${baseDamage}`);

		if (scalingDamage > 0) {
			parts.push(`+${scalingDamage} (${config.scalingStat})`);
		}

		if (bonusDamage > 0) {
			parts.push(`+${bonusDamage} bonus`);
		}

		if (isCrit) {
			parts.push('CRIT!');
		}

		parts.push(`= ${finalDamage} ${config.damageType}`);

		return parts.join(' ');
	}

	// ============================================
	// HISTORY
	// ============================================

	/**
	 * Add a roll to history.
	 */
	private addToHistory(result: RollResult): void {
		this.history.push(result);
		if (this.history.length > this.maxHistory) {
			this.history.shift();
		}
	}

	/**
	 * Get roll history.
	 */
	getHistory(): RollResult[] {
		return [...this.history];
	}

	/**
	 * Get last roll.
	 */
	getLastRoll(): RollResult | undefined {
		return this.history[this.history.length - 1];
	}

	/**
	 * Clear history.
	 */
	clearHistory(): void {
		this.history = [];
	}

	// ============================================
	// STATISTICAL HELPERS
	// ============================================

	/**
	 * Calculate average roll for a dice configuration.
	 */
	static calculateAverage(dice: DiceType, count: number, modifier: number): number {
		const avgPerDie = (DICE_MAX[dice] + 1) / 2;
		return count * avgPerDie + modifier;
	}

	/**
	 * Calculate minimum possible roll.
	 */
	static calculateMinimum(dice: DiceType, count: number, modifier: number): number {
		return count + modifier; // Minimum is 1 per die + modifier
	}

	/**
	 * Calculate maximum possible roll.
	 */
	static calculateMaximum(dice: DiceType, count: number, modifier: number): number {
		return count * DICE_MAX[dice] + modifier;
	}

	/**
	 * Calculate probability of beating a DC with a d20 roll.
	 * @param dc Difficulty Class
	 * @param modifier Total modifier
	 * @returns Probability (0-1)
	 */
	static calculateSuccessChance(dc: number, modifier: number): number {
		// Need to roll (dc - modifier) or higher on d20
		const needed = dc - modifier;

		if (needed <= 1) return 1.0; // Auto-success
		if (needed > 20) return 0.05; // Only nat 20 can succeed

		// Success on rolling 'needed' to 20
		const successes = 20 - needed + 1;
		return successes / 20;
	}
}

// ============================================
// DEFAULT ROLLER INSTANCE
// ============================================

/**
 * Default dice roller instance.
 */
export const defaultDiceRoller = new DiceRoller();
