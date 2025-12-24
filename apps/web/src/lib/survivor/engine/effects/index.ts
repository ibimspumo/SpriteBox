/**
 * Effects Module - Public API
 *
 * @module engine/effects
 */

// Types
export type {
	EffectTrigger,
	EffectTimingCategory,
	EffectType,
	EffectPayload,
	StatModifierPayload,
	HealPayload,
	DamagePayload,
	ShieldPayload,
	ManaRestorePayload,
	ManaDrainPayload,
	XpBonusPayload,
	CleansePayload,
	StatusPayload,
	ImmunityPayload,
	CompositePayload,
	EffectDefinition,
	ActiveEffect,
	TriggerEventData,
	TriggerResult,
	TriggerAction,
	SerializedActiveEffect
} from './types.js';

export {
	generateEffectInstanceId,
	isStatModifierPayload,
	isHealPayload,
	isDamagePayload,
	isShieldPayload,
	isCompositePayload
} from './types.js';

// Registry
export {
	EFFECT_DEFINITIONS,
	registerEffect,
	getEffectDefinition,
	getAllEffectDefinitions,
	getEffectsByCategory,
	getEffectsByTag
} from './registry.js';

// Hooks
export { HookRegistry, defaultHookRegistry } from './hooks.js';
export type { HookHandler } from './hooks.js';
export {
	createHandler,
	createConditionalHandler,
	createDebouncedHandler,
	combineHandlers
} from './hooks.js';

// Processor
export { EffectProcessor } from './processor.js';
