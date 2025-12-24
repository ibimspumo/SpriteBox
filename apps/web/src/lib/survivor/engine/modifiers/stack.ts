/**
 * Modifier Stack Manager
 *
 * Manages all active modifiers and calculates final stat values.
 * Uses a cached calculation system for performance.
 *
 * @module engine/modifiers/stack
 */

import type { StatModifier, ModifierSourceType, ModifierCondition, ModifierSource } from './types.js';
import type { StatType, StatDefinition } from '../stats/types.js';
import { getStatDefinition } from '../stats/registry.js';

// ============================================
// MODIFIER STACK
// ============================================

/**
 * Stack of modifiers for a single stat.
 */
export interface ModifierStack {
	/** The stat this stack is for */
	stat: StatType;

	/** All modifiers in this stack */
	modifiers: StatModifier[];

	/** Cached calculated value (null = needs recalculation) */
	cachedValue: number | null;

	/** Timestamp of last calculation */
	lastCalculated: number;
}

// ============================================
// CONDITION CONTEXT
// ============================================

/**
 * Context for evaluating modifier conditions.
 */
export interface ConditionContext {
	/** Current HP percentage (0-100) */
	hpPercent: number;

	/** Current Mana percentage (0-100) */
	manaPercent: number;

	/** Whether in combat */
	inCombat: boolean;

	/** Current level */
	level: number;

	/** Active buff IDs */
	activeBuffs: Set<string>;

	/** Active debuff IDs */
	activeDebuffs: Set<string>;

	/** Current element (player) */
	playerElement?: string;

	/** Target element (enemy) */
	targetElement?: string;

	/** Whether it's day time */
	isDay: boolean;
}

/**
 * Default condition context.
 */
export const DEFAULT_CONDITION_CONTEXT: ConditionContext = {
	hpPercent: 100,
	manaPercent: 100,
	inCombat: false,
	level: 1,
	activeBuffs: new Set(),
	activeDebuffs: new Set(),
	isDay: true
};

// ============================================
// MODIFIER STACK MANAGER
// ============================================

/**
 * Manages all modifier stacks and calculates stat values.
 */
export class ModifierStackManager {
	/** Stacks by stat type */
	private stacks: Map<StatType, ModifierStack> = new Map();

	/** All modifiers by ID for quick lookup */
	private modifiersById: Map<string, StatModifier> = new Map();

	/** Condition context for evaluating conditional modifiers */
	private context: ConditionContext = { ...DEFAULT_CONDITION_CONTEXT };

	/** Callback when modifiers change */
	private onChangeCallback?: () => void;

	constructor() {
		// Initialize empty
	}

	// ============================================
	// MODIFIER MANAGEMENT
	// ============================================

	/**
	 * Add a modifier to the stack.
	 */
	addModifier(modifier: StatModifier): void {
		// Check for existing modifier from same source
		const existing = this.findModifierBySource(modifier.source.id, modifier.source.type, modifier.stat);

		if (existing && modifier.stackable) {
			// Increment stacks
			existing.currentStacks = Math.min(
				(existing.currentStacks ?? 1) + 1,
				modifier.maxStacks ?? Infinity
			);
			this.invalidateStat(modifier.stat);
			this.notifyChange();
			return;
		}

		if (existing && !modifier.stackable) {
			// Replace existing modifier
			this.removeModifier(existing.id);
		}

		// Add to stack
		const stack = this.getOrCreateStack(modifier.stat);
		stack.modifiers.push(modifier);
		this.modifiersById.set(modifier.id, modifier);

		// Invalidate cache
		this.invalidateStat(modifier.stat);
		this.notifyChange();
	}

	/**
	 * Remove a modifier by ID.
	 */
	removeModifier(modifierId: string): boolean {
		const modifier = this.modifiersById.get(modifierId);
		if (!modifier) return false;

		const stack = this.stacks.get(modifier.stat);
		if (stack) {
			const index = stack.modifiers.findIndex((m) => m.id === modifierId);
			if (index !== -1) {
				stack.modifiers.splice(index, 1);
				stack.cachedValue = null;
			}
		}

		this.modifiersById.delete(modifierId);
		this.notifyChange();
		return true;
	}

	/**
	 * Remove all modifiers from a specific source.
	 */
	removeBySource(sourceId: string, sourceType?: ModifierSourceType): number {
		let removed = 0;

		for (const stack of this.stacks.values()) {
			const toRemove = stack.modifiers.filter(
				(m) => m.source.id === sourceId && (sourceType === undefined || m.source.type === sourceType)
			);

			for (const mod of toRemove) {
				this.modifiersById.delete(mod.id);
				removed++;
			}

			stack.modifiers = stack.modifiers.filter(
				(m) => !(m.source.id === sourceId && (sourceType === undefined || m.source.type === sourceType))
			);
			stack.cachedValue = null;
		}

		if (removed > 0) {
			this.notifyChange();
		}

		return removed;
	}

	/**
	 * Remove all modifiers of a specific source type.
	 */
	removeAllBySourceType(sourceType: ModifierSourceType): number {
		let removed = 0;

		for (const stack of this.stacks.values()) {
			const toRemove = stack.modifiers.filter((m) => m.source.type === sourceType);

			for (const mod of toRemove) {
				this.modifiersById.delete(mod.id);
				removed++;
			}

			stack.modifiers = stack.modifiers.filter((m) => m.source.type !== sourceType);
			stack.cachedValue = null;
		}

		if (removed > 0) {
			this.notifyChange();
		}

		return removed;
	}

	/**
	 * Remove expired modifiers.
	 */
	removeExpired(currentTime: number = Date.now()): number {
		let removed = 0;

		for (const stack of this.stacks.values()) {
			const toRemove = stack.modifiers.filter(
				(m) => m.source.expiresAt !== undefined && m.source.expiresAt <= currentTime
			);

			for (const mod of toRemove) {
				this.modifiersById.delete(mod.id);
				removed++;
			}

			stack.modifiers = stack.modifiers.filter(
				(m) => m.source.expiresAt === undefined || m.source.expiresAt > currentTime
			);
			stack.cachedValue = null;
		}

		if (removed > 0) {
			this.notifyChange();
		}

		return removed;
	}

	/**
	 * Find a modifier by source.
	 */
	private findModifierBySource(
		sourceId: string,
		sourceType: ModifierSourceType,
		stat: StatType
	): StatModifier | undefined {
		const stack = this.stacks.get(stat);
		if (!stack) return undefined;

		return stack.modifiers.find((m) => m.source.id === sourceId && m.source.type === sourceType);
	}

	// ============================================
	// STAT CALCULATION
	// ============================================

	/**
	 * Calculate the final value of a stat.
	 *
	 * Calculation order:
	 * 1. Base Value
	 * 2. Flat modifiers (+10, -5)
	 * 3. Percent of Base (+10% of base)
	 * 4. Percent of Total (+10% of current total)
	 * 5. Multiply (*1.5)
	 * 6. Override (if any)
	 * 7. Clamp to min/max
	 */
	calculateStat(stat: StatType, baseValue: number): number {
		const stack = this.stacks.get(stat);
		const statDef = getStatDefinition(stat);

		if (!stack || stack.modifiers.length === 0) {
			return this.clamp(baseValue, statDef);
		}

		// Check cache
		if (stack.cachedValue !== null) {
			return stack.cachedValue;
		}

		// Filter active modifiers and sort by priority
		const activeModifiers = stack.modifiers
			.filter((m) => m.enabled && this.evaluateCondition(m.condition))
			.sort((a, b) => b.priority - a.priority);

		// Check for override (highest priority)
		const override = activeModifiers.find((m) => m.operation === 'override');
		if (override) {
			const value = this.clamp(this.getEffectiveValue(override), statDef);
			stack.cachedValue = value;
			stack.lastCalculated = Date.now();
			return value;
		}

		let value = baseValue;

		// Phase 1: Flat modifiers
		const flatSum = activeModifiers
			.filter((m) => m.operation === 'flat')
			.reduce((sum, m) => sum + this.getEffectiveValue(m), 0);
		value += flatSum;

		// Phase 2: Percent of Base
		const percentBaseSum = activeModifiers
			.filter((m) => m.operation === 'percent_base')
			.reduce((sum, m) => sum + this.getEffectiveValue(m), 0);
		value += baseValue * (percentBaseSum / 100);

		// Phase 3: Percent of Total
		const percentTotalSum = activeModifiers
			.filter((m) => m.operation === 'percent_total')
			.reduce((sum, m) => sum + this.getEffectiveValue(m), 0);
		value *= 1 + percentTotalSum / 100;

		// Phase 4: Multiply
		const multipliers = activeModifiers.filter((m) => m.operation === 'multiply');
		for (const m of multipliers) {
			value *= this.getEffectiveValue(m);
		}

		// Phase 5: Clamp
		const finalValue = this.clamp(value, statDef);

		// Cache result
		stack.cachedValue = finalValue;
		stack.lastCalculated = Date.now();

		return finalValue;
	}

	/**
	 * Get the effective value of a modifier (accounting for stacks).
	 */
	private getEffectiveValue(modifier: StatModifier): number {
		if (!modifier.stackable) return modifier.value;
		return modifier.value * (modifier.currentStacks ?? 1);
	}

	/**
	 * Clamp a value to the stat's min/max.
	 * All stats are rounded to integers for cleaner display.
	 */
	private clamp(value: number, statDef: StatDefinition): number {
		return Math.max(statDef.min, Math.min(statDef.max, Math.round(value)));
	}

	// ============================================
	// CONDITION EVALUATION
	// ============================================

	/**
	 * Update the condition context.
	 */
	setContext(context: Partial<ConditionContext>): void {
		const oldContext = { ...this.context };
		this.context = { ...this.context, ...context };

		// Check if any conditional modifiers might have changed
		if (this.hasConditionalModifiers()) {
			this.invalidateAll();
		}
	}

	/**
	 * Evaluate a modifier condition.
	 */
	private evaluateCondition(condition?: ModifierCondition): boolean {
		if (!condition || condition.type === 'always') return true;

		let result = false;

		switch (condition.type) {
			case 'hp_below_percent':
				result = this.context.hpPercent < (condition.threshold ?? 50);
				break;

			case 'hp_above_percent':
				result = this.context.hpPercent > (condition.threshold ?? 50);
				break;

			case 'mana_below_percent':
				result = this.context.manaPercent < (condition.threshold ?? 50);
				break;

			case 'mana_above_percent':
				result = this.context.manaPercent > (condition.threshold ?? 50);
				break;

			case 'has_buff':
				result = condition.targetId ? this.context.activeBuffs.has(condition.targetId) : false;
				break;

			case 'has_debuff':
				result = condition.targetId ? this.context.activeDebuffs.has(condition.targetId) : false;
				break;

			case 'in_combat':
				result = this.context.inCombat;
				break;

			case 'out_of_combat':
				result = !this.context.inCombat;
				break;

			case 'element_match':
				result =
					this.context.playerElement !== undefined &&
					this.context.targetElement !== undefined &&
					this.context.playerElement === this.context.targetElement;
				break;

			case 'element_mismatch':
				result =
					this.context.playerElement !== undefined &&
					this.context.targetElement !== undefined &&
					this.context.playerElement !== this.context.targetElement;
				break;

			case 'is_day':
				result = this.context.isDay;
				break;

			case 'is_night':
				result = !this.context.isDay;
				break;

			case 'level_above':
				result = this.context.level > (condition.threshold ?? 1);
				break;

			case 'level_below':
				result = this.context.level < (condition.threshold ?? 1);
				break;

			default:
				result = true;
		}

		return condition.inverted ? !result : result;
	}

	/**
	 * Check if there are any conditional modifiers.
	 */
	private hasConditionalModifiers(): boolean {
		for (const stack of this.stacks.values()) {
			if (stack.modifiers.some((m) => m.condition && m.condition.type !== 'always')) {
				return true;
			}
		}
		return false;
	}

	// ============================================
	// CACHE MANAGEMENT
	// ============================================

	/**
	 * Invalidate cache for a specific stat.
	 */
	invalidateStat(stat: StatType): void {
		const stack = this.stacks.get(stat);
		if (stack) {
			stack.cachedValue = null;
		}
	}

	/**
	 * Invalidate all caches.
	 */
	invalidateAll(): void {
		for (const stack of this.stacks.values()) {
			stack.cachedValue = null;
		}
	}

	// ============================================
	// QUERY METHODS
	// ============================================

	/**
	 * Get all modifiers for a stat.
	 */
	getModifiersForStat(stat: StatType): StatModifier[] {
		return this.stacks.get(stat)?.modifiers ?? [];
	}

	/**
	 * Get all modifiers.
	 */
	getAllModifiers(): StatModifier[] {
		return Array.from(this.modifiersById.values());
	}

	/**
	 * Get modifiers by source type.
	 */
	getModifiersBySourceType(sourceType: ModifierSourceType): StatModifier[] {
		return this.getAllModifiers().filter((m) => m.source.type === sourceType);
	}

	/**
	 * Get modifiers by source ID.
	 */
	getModifiersBySourceId(sourceId: string): StatModifier[] {
		return this.getAllModifiers().filter((m) => m.source.id === sourceId);
	}

	/**
	 * Get a modifier by ID.
	 */
	getModifier(modifierId: string): StatModifier | undefined {
		return this.modifiersById.get(modifierId);
	}

	/**
	 * Check if a modifier exists.
	 */
	hasModifier(modifierId: string): boolean {
		return this.modifiersById.has(modifierId);
	}

	/**
	 * Get unique sources affecting a stat.
	 */
	getSourcesForStat(stat: StatType): ModifierSource[] {
		const modifiers = this.getModifiersForStat(stat);
		const sourcesMap = new Map<string, ModifierSource>();

		for (const mod of modifiers) {
			const key = `${mod.source.type}_${mod.source.id}`;
			if (!sourcesMap.has(key)) {
				sourcesMap.set(key, mod.source);
			}
		}

		return Array.from(sourcesMap.values());
	}

	// ============================================
	// UTILITY METHODS
	// ============================================

	/**
	 * Get or create a stack for a stat.
	 */
	private getOrCreateStack(stat: StatType): ModifierStack {
		if (!this.stacks.has(stat)) {
			this.stacks.set(stat, {
				stat,
				modifiers: [],
				cachedValue: null,
				lastCalculated: 0
			});
		}
		return this.stacks.get(stat)!;
	}

	/**
	 * Set change callback.
	 */
	onChange(callback: () => void): void {
		this.onChangeCallback = callback;
	}

	/**
	 * Notify that modifiers changed.
	 */
	private notifyChange(): void {
		this.onChangeCallback?.();
	}

	/**
	 * Clear all modifiers.
	 */
	clear(): void {
		this.stacks.clear();
		this.modifiersById.clear();
		this.notifyChange();
	}

	/**
	 * Get the total number of active modifiers.
	 */
	get modifierCount(): number {
		return this.modifiersById.size;
	}
}
