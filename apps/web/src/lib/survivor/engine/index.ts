/**
 * Pixel Survivor Engine
 *
 * A flexible RPG engine with:
 * - Stats & Modifiers system
 * - Effects & Buffs/Debuffs
 * - Dice rolling
 * - Element system (shared by all entities)
 * - Character creation from pixel art
 * - Trait system
 *
 * @module engine
 *
 * @example
 * ```typescript
 * import {
 *   CharacterFactory,
 *   StatManager,
 *   DiceRoller,
 *   getElementDefinition,
 *   getInteractionMultiplier
 * } from '$lib/survivor/engine';
 *
 * // Create character from pixel art
 * const character = CharacterFactory.create(pixelString, { name: 'Hero' });
 * console.log(character.elementAffinity.primary); // 'fire'
 * console.log(character.trait); // 'chaotic'
 *
 * // Calculate element advantage
 * const multiplier = getInteractionMultiplier('water', 'fire');
 * console.log(multiplier); // 2.0 (super effective!)
 *
 * // Roll dice
 * const roller = new DiceRoller();
 * const result = roller.skillCheck(character.statManager, 'attack', 15);
 * ```
 */

// ============================================
// CORE SYSTEMS (Shared by all entities)
// ============================================

export {
	// Element Types
	type ElementType,
	type InteractionType,
	type ElementDefinition,
	type ElementDamageType,
	type ElementTag,
	type ElementInteraction,
	type ElementAffinity,
	type ElementContext,
	type ElementConditions,
	// Element Constants
	ALL_ELEMENTS,
	PRIMARY_ELEMENTS,
	MYSTIC_ELEMENTS,
	INTERACTION_MULTIPLIERS,
	DEFAULT_ELEMENT,
	// Element Functions
	createElementAffinity,
	// Element Registry
	ELEMENT_DEFINITIONS,
	getElementDefinition,
	getAllElementDefinitions,
	getElementsByTag,
	getElementsByDamageType,
	isValidElement,
	getElementIcon,
	getElementColor,
	// Element Interactions
	INTERACTION_MATRIX,
	getInteractionType,
	getInteractionMultiplier,
	getElementInteraction,
	calculateElementMultiplier,
	calculateContextMultiplier,
	getStrongAgainst,
	getWeakAgainst,
	getResistedBy,
	hasAdvantage,
	hasDisadvantage,
	getElementMatchupSummary,
	// Damage Types
	type DamageCategory,
	type DamageInstance,
	type DamageSource,
	type DamageCalculationInput,
	type DamageCalculationResult,
	type DamageBreakdown,
	type DamageOverTime,
	type DamageModifier
} from './core/index.js';

// ============================================
// CHARACTER SYSTEM
// ============================================

export {
	// Factory
	CharacterFactory,
	serializeCharacter,
	deserializeCharacter,
	// Types
	type GameCharacter,
	type CharacterCreationOptions,
	type CharacterPreview,
	type SerializedGameCharacter,
	// Analyzer
	PixelAnalyzer,
	defaultPixelAnalyzer,
	analyzeCharacterPixels,
	getColorCategory,
	DEFAULT_ANALYZER_OPTIONS,
	type CharacterAnalysis,
	type Pixel,
	type ColorAnalysis,
	type ShapeAnalysis,
	type ProportionAnalysis,
	type ComplexityAnalysis,
	// Element Detection
	detectElement,
	getElementAffinities,
	matchesElement,
	getElementBreakdown,
	COLOR_ELEMENT_AFFINITY,
	type ElementDetectionResult,
	// Traits
	ALL_TRAITS,
	OFFENSIVE_TRAITS,
	DEFENSIVE_TRAITS,
	UTILITY_TRAITS,
	TRAIT_DEFINITIONS,
	getTraitDefinition,
	getAllTraitDefinitions,
	getTraitsByCategory,
	getTraitsByTag,
	isValidTrait,
	getTraitIcon,
	getTraitColor,
	getTraitsForElement,
	DETECTION_THRESHOLDS,
	detectTrait,
	getPossibleTraits,
	matchesTrait,
	getTraitBreakdown,
	type TraitType,
	type TraitCategory,
	type TraitDefinition,
	type TraitAbility,
	type TraitDetectionResult,
	// Stats Calculator
	STAT_BUDGET_CONFIG,
	STAT_CALCULATION_CONFIG,
	calculateBaseStats,
	getStatsSummary,
	compareStats,
	type StatCalculationResult
} from './character/index.js';

// ============================================
// STATS SYSTEM
// ============================================

export {
	// Types
	type StatType,
	type StatCategory,
	type CalculationType,
	type DisplayFormat,
	type StatDefinition,
	type StatValue,
	type StatBreakdown as EngineStatBreakdown,
	type StatModifierBreakdown,
	type BaseStats,
	type SerializedStatValue,
	type SerializedStats,
	// Constants
	DEFAULT_BASE_STATS,
	// Registry
	STAT_DEFINITIONS,
	getStatDefinition,
	getAllStatDefinitions,
	getStatsByCategory,
	isValidStatType,
	ALL_STAT_TYPES,
	RESOURCE_STATS,
	COMBAT_STATS,
	UTILITY_STATS,
	// Manager
	StatManager,
	type SerializedStatManager,
	type CardDefinition,
	type ItemDefinition
} from './stats/index.js';

// ============================================
// MODIFIERS SYSTEM
// ============================================

export {
	// Types
	type ModifierSourceType,
	type ModifierOperation,
	type ModifierSource,
	type ConditionType,
	type ModifierCondition,
	type StatModifier,
	type ModifierTemplate,
	type SerializedModifier,
	// Functions
	createModifier,
	serializeModifier,
	deserializeModifier,
	DEFAULT_PRIORITY_BY_SOURCE,
	// Stack Manager
	ModifierStackManager,
	type ModifierStack,
	type ConditionContext,
	DEFAULT_CONDITION_CONTEXT
} from './modifiers/index.js';

// ============================================
// EFFECTS SYSTEM
// ============================================

export {
	// Types
	type EffectTrigger,
	type EffectTimingCategory,
	type EffectType,
	type EffectPayload,
	type StatModifierPayload,
	type HealPayload,
	type DamagePayload as EffectDamagePayload,
	type ShieldPayload,
	type ManaRestorePayload,
	type ManaDrainPayload,
	type XpBonusPayload,
	type CleansePayload,
	type StatusPayload,
	type ImmunityPayload,
	type CompositePayload,
	type EffectDefinition,
	type ActiveEffect,
	type TriggerEventData,
	type TriggerResult,
	type TriggerAction,
	type SerializedActiveEffect,
	// Functions
	generateEffectInstanceId,
	isStatModifierPayload,
	isHealPayload,
	isDamagePayload,
	isShieldPayload,
	isCompositePayload,
	// Registry
	EFFECT_DEFINITIONS,
	registerEffect,
	getEffectDefinition,
	getAllEffectDefinitions,
	getEffectsByCategory,
	getEffectsByTag,
	// Hooks
	HookRegistry,
	defaultHookRegistry,
	type HookHandler,
	createHandler,
	createConditionalHandler,
	createDebouncedHandler,
	combineHandlers,
	// Processor
	EffectProcessor
} from './effects/index.js';

// ============================================
// DICE SYSTEM
// ============================================

export {
	// Types
	type DiceType,
	type DiceRoll,
	type RollResult,
	type SkillCheckType,
	type SkillCheck,
	type SkillCheckResult,
	type DamageType as DiceDamageType,
	type DamageRoll,
	type DamageRollResult,
	type ParsedDiceNotation,
	type RandomFunction,
	// Constants
	DICE_MAX,
	DEFAULT_DICE_ROLL,
	DEFAULT_SKILL_CHECK,
	DEFAULT_DAMAGE_ROLL,
	// Roller
	DiceRoller,
	defaultDiceRoller
} from './dice/index.js';

// ============================================
// DICE VISUAL (3D Animated D20)
// ============================================

export {
	// Store & Actions
	d20RollState,
	rollD20,
	resetD20,
	completeRoll,
	isRolling,
	type D20RollState,
	type RollOptions,
	// Components
	D20Dice,
	D20Tester
} from './dice-visual/index.js';
