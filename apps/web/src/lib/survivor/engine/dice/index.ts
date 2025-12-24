/**
 * Dice Module - Public API
 *
 * @module engine/dice
 */

// Types
export type {
	DiceType,
	DiceRoll,
	RollResult,
	SkillCheckType,
	SkillCheck,
	SkillCheckResult,
	DamageType,
	DamageRoll,
	DamageRollResult,
	ParsedDiceNotation,
	RandomFunction
} from './types.js';

export {
	DICE_MAX,
	DEFAULT_DICE_ROLL,
	DEFAULT_SKILL_CHECK,
	DEFAULT_DAMAGE_ROLL
} from './types.js';

// Roller
export { DiceRoller, defaultDiceRoller } from './roller.js';
