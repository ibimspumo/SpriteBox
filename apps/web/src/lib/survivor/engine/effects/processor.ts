/**
 * Effect Processor
 *
 * Manages active effects on a character and processes effect triggers.
 *
 * @module engine/effects/processor
 */

import type {
	EffectDefinition,
	ActiveEffect,
	EffectTrigger,
	TriggerEventData,
	TriggerResult,
	TriggerAction,
	SerializedActiveEffect,
	EffectPayload,
	HealPayload,
	DamagePayload,
	ShieldPayload,
	StatModifierPayload
} from './types.js';
import {
	generateEffectInstanceId,
	isStatModifierPayload,
	isHealPayload,
	isDamagePayload,
	isShieldPayload,
	isCompositePayload
} from './types.js';
import { getEffectDefinition } from './registry.js';
import { HookRegistry, defaultHookRegistry } from './hooks.js';
import type { StatManager } from '../stats/manager.js';
import type { ModifierSource } from '../modifiers/types.js';
import { createModifier } from '../modifiers/types.js';

// ============================================
// EFFECT PROCESSOR
// ============================================

/**
 * Processes and manages active effects.
 */
export class EffectProcessor {
	/** Active effects by instance ID */
	private activeEffects: Map<string, ActiveEffect> = new Map();

	/** Reference to stat manager */
	private statManager: StatManager;

	/** Hook registry for effect triggers */
	private hookRegistry: HookRegistry;

	/** Change callback */
	private onChangeCallback?: () => void;

	constructor(statManager: StatManager, hookRegistry?: HookRegistry) {
		this.statManager = statManager;
		this.hookRegistry = hookRegistry ?? defaultHookRegistry;
		this.registerDefaultHandlers();
	}

	// ============================================
	// EFFECT APPLICATION
	// ============================================

	/**
	 * Apply an effect by definition ID.
	 */
	applyEffect(effectId: string, source: ModifierSource): ActiveEffect | null {
		const definition = getEffectDefinition(effectId);
		if (!definition) {
			console.error(`[EffectProcessor] Unknown effect: ${effectId}`);
			return null;
		}

		return this.applyEffectDefinition(definition, source);
	}

	/**
	 * Apply an effect from a definition.
	 */
	applyEffectDefinition(definition: EffectDefinition, source: ModifierSource): ActiveEffect {
		const now = Date.now();

		// Check for existing effect (for stacking)
		const existing = this.findEffectByDefinition(definition.id);

		if (existing && definition.stackable) {
			return this.handleStacking(existing, definition);
		}

		if (existing && !definition.stackable) {
			// Remove old and replace
			this.removeEffect(existing.instanceId);
		}

		// Create new effect instance
		const effect: ActiveEffect = {
			instanceId: generateEffectInstanceId(),
			definitionId: definition.id,
			definition,
			source,
			appliedAt: now,
			expiresAt: definition.duration ? now + definition.duration * 1000 : undefined,
			remainingDuration: definition.duration,
			currentStacks: 1,
			enabled: true,
			tickCount: 0,
			totalDamageDealt: 0,
			totalHealingDone: 0,
			activeModifierIds: []
		};

		// Apply stat modifiers if payload is stat_modifier
		if (isStatModifierPayload(definition.payload)) {
			this.applyStatModifiers(effect, definition.payload, source);
		}

		// Add to active effects
		this.activeEffects.set(effect.instanceId, effect);

		// Trigger on_apply
		this.triggerEvent('on_apply', {
			trigger: 'on_apply',
			timestamp: now
		});

		this.notifyChange();
		return effect;
	}

	/**
	 * Handle stacking behavior.
	 */
	private handleStacking(existing: ActiveEffect, definition: EffectDefinition): ActiveEffect {
		const maxStacks = definition.maxStacks ?? Infinity;

		switch (definition.stackBehavior) {
			case 'refresh':
				// Reset duration, keep stacks
				existing.expiresAt = definition.duration
					? Date.now() + definition.duration * 1000
					: undefined;
				existing.remainingDuration = definition.duration;
				break;

			case 'extend':
				// Extend duration
				if (existing.remainingDuration !== undefined && definition.duration) {
					existing.remainingDuration = Math.min(
						existing.remainingDuration + definition.duration,
						definition.maxDuration ?? Infinity
					);
					existing.expiresAt = Date.now() + existing.remainingDuration * 1000;
				}
				break;

			case 'add':
				// Add stack
				if (existing.currentStacks < maxStacks) {
					existing.currentStacks++;

					// Update modifiers if stat_modifier
					if (isStatModifierPayload(definition.payload)) {
						this.updateModifierStacks(existing);
					}
				}
				break;

			case 'replace':
				// Remove and re-apply
				this.removeEffect(existing.instanceId);
				return this.applyEffectDefinition(definition, existing.source);
		}

		this.notifyChange();
		return existing;
	}

	/**
	 * Apply stat modifiers from an effect.
	 */
	private applyStatModifiers(
		effect: ActiveEffect,
		payload: StatModifierPayload,
		source: ModifierSource
	): void {
		const modifierIds: string[] = [];

		for (const template of payload.modifiers) {
			const modifier = createModifier(template, {
				...source,
				type: effect.definition.category === 'buff' ? 'buff' : 'debuff'
			});
			this.statManager.addModifier(modifier);
			modifierIds.push(modifier.id);
		}

		effect.activeModifierIds = modifierIds;
	}

	/**
	 * Update modifier stacks when effect stacks change.
	 */
	private updateModifierStacks(effect: ActiveEffect): void {
		for (const modifierId of effect.activeModifierIds) {
			const modifier = this.statManager
				.getModifiers()
				.find((m) => m.id === modifierId);

			if (modifier && modifier.stackable) {
				modifier.currentStacks = effect.currentStacks;
			}
		}
	}

	// ============================================
	// EFFECT REMOVAL
	// ============================================

	/**
	 * Remove an effect by instance ID.
	 */
	removeEffect(instanceId: string): boolean {
		const effect = this.activeEffects.get(instanceId);
		if (!effect) return false;

		// Remove associated modifiers
		for (const modifierId of effect.activeModifierIds) {
			this.statManager.removeModifier(modifierId);
		}

		// Trigger on_remove
		this.triggerEvent('on_remove', {
			trigger: 'on_remove',
			timestamp: Date.now()
		});

		this.activeEffects.delete(instanceId);
		this.notifyChange();
		return true;
	}

	/**
	 * Remove all effects with a specific definition ID.
	 */
	removeEffectsByDefinition(definitionId: string): number {
		let removed = 0;
		for (const effect of this.activeEffects.values()) {
			if (effect.definitionId === definitionId) {
				this.removeEffect(effect.instanceId);
				removed++;
			}
		}
		return removed;
	}

	/**
	 * Remove all effects from a specific source.
	 */
	removeEffectsBySource(sourceId: string): number {
		let removed = 0;
		for (const effect of this.activeEffects.values()) {
			if (effect.source.id === sourceId) {
				this.removeEffect(effect.instanceId);
				removed++;
			}
		}
		return removed;
	}

	/**
	 * Remove all effects of a category.
	 */
	removeEffectsByCategory(category: 'buff' | 'debuff' | 'neutral'): number {
		let removed = 0;
		for (const effect of this.activeEffects.values()) {
			if (effect.definition.category === category) {
				this.removeEffect(effect.instanceId);
				removed++;
			}
		}
		return removed;
	}

	/**
	 * Remove expired effects.
	 */
	removeExpired(currentTime: number = Date.now()): number {
		let removed = 0;
		for (const effect of this.activeEffects.values()) {
			if (effect.expiresAt !== undefined && effect.expiresAt <= currentTime) {
				this.removeEffect(effect.instanceId);
				removed++;
			}
		}
		return removed;
	}

	/**
	 * Cleanse debuffs.
	 */
	cleanse(count: number | 'all' = 'all'): number {
		const debuffs = Array.from(this.activeEffects.values())
			.filter((e) => e.definition.category === 'debuff' && e.definition.canBeCleansed !== false)
			.sort((a, b) => a.appliedAt - b.appliedAt); // Remove oldest first

		const toRemove = count === 'all' ? debuffs : debuffs.slice(0, count);
		let removed = 0;

		for (const effect of toRemove) {
			if (this.removeEffect(effect.instanceId)) {
				removed++;
			}
		}

		return removed;
	}

	// ============================================
	// TICK PROCESSING
	// ============================================

	/**
	 * Process a tick (for time-based effects).
	 * Call this every game tick/round.
	 */
	processTick(): TriggerResult[] {
		const results: TriggerResult[] = [];
		const now = Date.now();

		// Remove expired effects first
		this.removeExpired(now);

		// Process tick for remaining effects
		for (const effect of this.activeEffects.values()) {
			if (!effect.enabled) continue;

			// Update remaining duration
			if (effect.remainingDuration !== undefined) {
				effect.remainingDuration--;
			}

			// Increment tick count
			effect.tickCount++;

			// Process effect payload on tick
			if (effect.definition.triggers.includes('on_tick')) {
				const tickResult = this.processEffectPayload(effect, 'on_tick');
				if (tickResult) {
					results.push(tickResult);
				}
			}
		}

		return results;
	}

	/**
	 * Process effect payload for a trigger.
	 */
	private processEffectPayload(effect: ActiveEffect, trigger: EffectTrigger): TriggerResult | null {
		const payload = effect.definition.payload;
		const actions: TriggerAction[] = [];
		const messages: string[] = [];

		// Handle composite payloads
		if (isCompositePayload(payload)) {
			for (const subPayload of payload.effects) {
				const result = this.processPayload(effect, subPayload, trigger);
				if (result) {
					actions.push(...result.actions);
					messages.push(...result.messages);
				}
			}
		} else {
			const result = this.processPayload(effect, payload, trigger);
			if (result) {
				actions.push(...result.actions);
				messages.push(...result.messages);
			}
		}

		if (actions.length === 0) {
			return null;
		}

		return {
			effect,
			processed: true,
			actions,
			messages
		};
	}

	/**
	 * Process a single payload.
	 */
	private processPayload(
		effect: ActiveEffect,
		payload: EffectPayload,
		_trigger: EffectTrigger
	): { actions: TriggerAction[]; messages: string[] } | null {
		const stacks = effect.currentStacks;

		if (isHealPayload(payload)) {
			return this.processHealPayload(effect, payload, stacks);
		}

		if (isDamagePayload(payload)) {
			return this.processDamagePayload(effect, payload, stacks);
		}

		if (isShieldPayload(payload)) {
			return this.processShieldPayload(effect, payload, stacks);
		}

		// Stat modifiers are handled on apply, not on tick
		return null;
	}

	/**
	 * Process a heal payload.
	 */
	private processHealPayload(
		effect: ActiveEffect,
		payload: HealPayload,
		stacks: number
	): { actions: TriggerAction[]; messages: string[] } {
		let amount: number;

		if (typeof payload.amount === 'number') {
			amount = payload.amount * stacks;
		} else {
			const maxHp = this.statManager.getStat('maxHp');
			amount = Math.round((maxHp * payload.amount.percent * stacks) / 100);
		}

		const oldHp = this.statManager.getCurrentResource('hp');
		const healed = this.statManager.heal(amount);
		const newHp = this.statManager.getCurrentResource('hp');

		effect.totalHealingDone += healed;

		return {
			actions: [
				{
					type: 'heal',
					stat: 'hp',
					oldValue: oldHp,
					newValue: newHp,
					change: healed,
					source: effect.definition.name
				}
			],
			messages: healed > 0 ? [`+${healed} HP`] : []
		};
	}

	/**
	 * Process a damage payload.
	 */
	private processDamagePayload(
		effect: ActiveEffect,
		payload: DamagePayload,
		stacks: number
	): { actions: TriggerAction[]; messages: string[] } {
		let amount: number;

		if (typeof payload.amount === 'number') {
			amount = payload.amount * stacks;
		} else {
			const maxHp = this.statManager.getStat('maxHp');
			amount = Math.round((maxHp * payload.amount.percent * stacks) / 100);
		}

		const oldHp = this.statManager.getCurrentResource('hp');

		// Handle can't kill
		if (!payload.canKill) {
			const currentHp = this.statManager.getCurrentResource('hp');
			amount = Math.min(amount, currentHp - 1);
		}

		const result = this.statManager.takeDamage(amount);
		const newHp = this.statManager.getCurrentResource('hp');
		const totalDamage = result.shieldDamage + result.hpDamage;

		effect.totalDamageDealt += totalDamage;

		const actions: TriggerAction[] = [];
		const messages: string[] = [];

		if (result.shieldDamage > 0) {
			actions.push({
				type: 'damage',
				stat: 'shield',
				change: -result.shieldDamage,
				source: effect.definition.name
			});
		}

		if (result.hpDamage > 0) {
			actions.push({
				type: 'damage',
				stat: 'hp',
				oldValue: oldHp,
				newValue: newHp,
				change: -result.hpDamage,
				source: effect.definition.name
			});
			messages.push(`-${result.hpDamage} HP`);
		}

		return { actions, messages };
	}

	/**
	 * Process a shield payload.
	 */
	private processShieldPayload(
		effect: ActiveEffect,
		payload: ShieldPayload,
		stacks: number
	): { actions: TriggerAction[]; messages: string[] } {
		let amount: number;

		if (typeof payload.amount === 'number') {
			amount = payload.amount * stacks;
		} else {
			const maxHp = this.statManager.getStat('maxHp');
			amount = Math.round((maxHp * payload.amount.percent * stacks) / 100);
		}

		const oldShield = this.statManager.getCurrentResource('shield');
		const added = this.statManager.addShield(amount);
		const newShield = this.statManager.getCurrentResource('shield');

		return {
			actions: [
				{
					type: 'shield',
					stat: 'shield',
					oldValue: oldShield,
					newValue: newShield,
					change: added,
					source: effect.definition.name
				}
			],
			messages: added > 0 ? [`+${added} Shield`] : []
		};
	}

	// ============================================
	// EVENT TRIGGERING
	// ============================================

	/**
	 * Trigger an event for all active effects.
	 */
	triggerEvent(trigger: EffectTrigger, eventData?: Partial<TriggerEventData>): TriggerResult[] {
		const fullEventData: TriggerEventData = {
			trigger,
			timestamp: Date.now(),
			...eventData
		};

		const effects = Array.from(this.activeEffects.values());
		return this.hookRegistry.fire(trigger, effects, this.statManager, fullEventData);
	}

	// ============================================
	// QUERY METHODS
	// ============================================

	/**
	 * Get all active effects.
	 */
	getActiveEffects(): ActiveEffect[] {
		return Array.from(this.activeEffects.values());
	}

	/**
	 * Get buffs.
	 */
	getBuffs(): ActiveEffect[] {
		return this.getActiveEffects().filter((e) => e.definition.category === 'buff');
	}

	/**
	 * Get debuffs.
	 */
	getDebuffs(): ActiveEffect[] {
		return this.getActiveEffects().filter((e) => e.definition.category === 'debuff');
	}

	/**
	 * Get an effect by instance ID.
	 */
	getEffect(instanceId: string): ActiveEffect | undefined {
		return this.activeEffects.get(instanceId);
	}

	/**
	 * Find effect by definition ID.
	 */
	findEffectByDefinition(definitionId: string): ActiveEffect | undefined {
		for (const effect of this.activeEffects.values()) {
			if (effect.definitionId === definitionId) {
				return effect;
			}
		}
		return undefined;
	}

	/**
	 * Check if an effect is active.
	 */
	hasEffect(definitionId: string): boolean {
		return this.findEffectByDefinition(definitionId) !== undefined;
	}

	/**
	 * Get effect stacks.
	 */
	getEffectStacks(definitionId: string): number {
		const effect = this.findEffectByDefinition(definitionId);
		return effect?.currentStacks ?? 0;
	}

	// ============================================
	// DEFAULT HANDLERS
	// ============================================

	/**
	 * Register default effect handlers.
	 */
	private registerDefaultHandlers(): void {
		// Handle round-based effects
		this.hookRegistry.register('on_round_end', (effect, stats, eventData) => {
			if (
				effect.definition.timingCategory === 'per_tick' &&
				effect.definition.triggers.includes('on_round_end')
			) {
				return this.processEffectPayload(effect, 'on_round_end');
			}
			return null;
		});

		this.hookRegistry.register('on_round_start', (effect, stats, eventData) => {
			if (
				effect.definition.timingCategory === 'per_tick' &&
				effect.definition.triggers.includes('on_round_start')
			) {
				return this.processEffectPayload(effect, 'on_round_start');
			}
			return null;
		});
	}

	// ============================================
	// CHANGE NOTIFICATION
	// ============================================

	/**
	 * Register a change callback.
	 */
	onChange(callback: () => void): () => void {
		this.onChangeCallback = callback;
		return () => {
			this.onChangeCallback = undefined;
		};
	}

	/**
	 * Notify of changes.
	 */
	private notifyChange(): void {
		this.onChangeCallback?.();
	}

	// ============================================
	// SERIALIZATION
	// ============================================

	/**
	 * Serialize active effects for storage.
	 */
	serialize(): SerializedActiveEffect[] {
		return Array.from(this.activeEffects.values()).map((effect) => ({
			instanceId: effect.instanceId,
			definitionId: effect.definitionId,
			sourceType: effect.source.type,
			sourceId: effect.source.id,
			sourceName: effect.source.name,
			appliedAt: effect.appliedAt,
			expiresAt: effect.expiresAt,
			remainingDuration: effect.remainingDuration,
			currentStacks: effect.currentStacks,
			enabled: effect.enabled,
			tickCount: effect.tickCount,
			totalDamageDealt: effect.totalDamageDealt,
			totalHealingDone: effect.totalHealingDone,
			activeModifierIds: effect.activeModifierIds
		}));
	}

	/**
	 * Restore effects from storage.
	 */
	restore(serialized: SerializedActiveEffect[]): void {
		for (const data of serialized) {
			const definition = getEffectDefinition(data.definitionId);
			if (!definition) {
				console.warn(`[EffectProcessor] Unknown effect in save: ${data.definitionId}`);
				continue;
			}

			const effect: ActiveEffect = {
				instanceId: data.instanceId,
				definitionId: data.definitionId,
				definition,
				source: {
					type: data.sourceType as ModifierSource['type'],
					id: data.sourceId,
					name: data.sourceName,
					appliedAt: data.appliedAt,
					expiresAt: data.expiresAt
				},
				appliedAt: data.appliedAt,
				expiresAt: data.expiresAt,
				remainingDuration: data.remainingDuration,
				currentStacks: data.currentStacks,
				enabled: data.enabled,
				tickCount: data.tickCount,
				totalDamageDealt: data.totalDamageDealt,
				totalHealingDone: data.totalHealingDone,
				activeModifierIds: data.activeModifierIds
			};

			this.activeEffects.set(effect.instanceId, effect);
		}
	}

	/**
	 * Clear all effects.
	 */
	clear(): void {
		for (const effect of this.activeEffects.values()) {
			for (const modifierId of effect.activeModifierIds) {
				this.statManager.removeModifier(modifierId);
			}
		}
		this.activeEffects.clear();
		this.notifyChange();
	}

	/**
	 * Get effect count.
	 */
	get effectCount(): number {
		return this.activeEffects.size;
	}
}
