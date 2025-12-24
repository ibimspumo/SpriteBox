/**
 * Modifiers Module - Public API
 *
 * @module engine/modifiers
 */

// Types
export type {
	ModifierSourceType,
	ModifierOperation,
	ModifierSource,
	ConditionType,
	ModifierCondition,
	StatModifier,
	ModifierTemplate,
	SerializedModifier
} from './types.js';

export {
	createModifier,
	serializeModifier,
	deserializeModifier,
	DEFAULT_PRIORITY_BY_SOURCE
} from './types.js';

// Stack Manager
export { ModifierStackManager } from './stack.js';
export type { ModifierStack, ConditionContext } from './stack.js';
export { DEFAULT_CONDITION_CONTEXT } from './stack.js';
