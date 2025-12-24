/**
 * Effect Hooks System
 *
 * Manages event handlers for effect triggers.
 * Effects can register handlers that fire on specific game events.
 *
 * @module engine/effects/hooks
 */

import type { EffectTrigger, TriggerEventData, TriggerResult, ActiveEffect } from './types.js';
import type { StatManager } from '../stats/manager.js';

// ============================================
// HOOK HANDLER TYPE
// ============================================

/**
 * Handler function for effect triggers.
 */
export type HookHandler = (
	effect: ActiveEffect,
	stats: StatManager,
	eventData: TriggerEventData
) => TriggerResult | null;

// ============================================
// HOOK REGISTRY
// ============================================

/**
 * Registry for effect hooks.
 */
export class HookRegistry {
	/** Handlers by trigger type */
	private handlers: Map<EffectTrigger, Set<HookHandler>> = new Map();

	/** Global handlers (fire on all triggers) */
	private globalHandlers: Set<HookHandler> = new Set();

	/**
	 * Register a handler for a specific trigger.
	 * @returns Unregister function
	 */
	register(trigger: EffectTrigger, handler: HookHandler): () => void {
		if (!this.handlers.has(trigger)) {
			this.handlers.set(trigger, new Set());
		}
		this.handlers.get(trigger)!.add(handler);

		return () => {
			this.handlers.get(trigger)?.delete(handler);
		};
	}

	/**
	 * Register a global handler (fires on all triggers).
	 * @returns Unregister function
	 */
	registerGlobal(handler: HookHandler): () => void {
		this.globalHandlers.add(handler);
		return () => {
			this.globalHandlers.delete(handler);
		};
	}

	/**
	 * Fire handlers for a trigger.
	 */
	fire(
		trigger: EffectTrigger,
		effects: ActiveEffect[],
		stats: StatManager,
		eventData: TriggerEventData
	): TriggerResult[] {
		const results: TriggerResult[] = [];
		const handlers = this.handlers.get(trigger);

		// Filter effects that have this trigger
		const relevantEffects = effects.filter(
			(e) => e.enabled && e.definition.triggers.includes(trigger)
		);

		if (relevantEffects.length === 0) {
			return results;
		}

		// Process each relevant effect
		for (const effect of relevantEffects) {
			// Fire trigger-specific handlers
			if (handlers) {
				for (const handler of handlers) {
					try {
						const result = handler(effect, stats, eventData);
						if (result && result.processed) {
							results.push(result);
						}
					} catch (error) {
						console.error(`[HookRegistry] Handler error for ${trigger}:`, error);
					}
				}
			}

			// Fire global handlers
			for (const handler of this.globalHandlers) {
				try {
					const result = handler(effect, stats, eventData);
					if (result && result.processed) {
						results.push(result);
					}
				} catch (error) {
					console.error(`[HookRegistry] Global handler error for ${trigger}:`, error);
				}
			}
		}

		return results;
	}

	/**
	 * Check if there are handlers for a trigger.
	 */
	hasHandlers(trigger: EffectTrigger): boolean {
		return (this.handlers.get(trigger)?.size ?? 0) > 0 || this.globalHandlers.size > 0;
	}

	/**
	 * Get all registered triggers.
	 */
	getRegisteredTriggers(): EffectTrigger[] {
		return Array.from(this.handlers.keys());
	}

	/**
	 * Clear all handlers.
	 */
	clear(): void {
		this.handlers.clear();
		this.globalHandlers.clear();
	}

	/**
	 * Clear handlers for a specific trigger.
	 */
	clearTrigger(trigger: EffectTrigger): void {
		this.handlers.delete(trigger);
	}
}

// ============================================
// DEFAULT HOOK REGISTRY
// ============================================

/**
 * Default global hook registry.
 */
export const defaultHookRegistry = new HookRegistry();

// ============================================
// HOOK UTILITIES
// ============================================

/**
 * Create a simple handler that processes all effects with a callback.
 */
export function createHandler(
	processor: (
		effect: ActiveEffect,
		stats: StatManager,
		eventData: TriggerEventData
	) => TriggerResult | null
): HookHandler {
	return processor;
}

/**
 * Create a conditional handler that only fires when a condition is met.
 */
export function createConditionalHandler(
	condition: (effect: ActiveEffect, stats: StatManager, eventData: TriggerEventData) => boolean,
	processor: (
		effect: ActiveEffect,
		stats: StatManager,
		eventData: TriggerEventData
	) => TriggerResult | null
): HookHandler {
	return (effect, stats, eventData) => {
		if (!condition(effect, stats, eventData)) {
			return null;
		}
		return processor(effect, stats, eventData);
	};
}

/**
 * Create a debounced handler that only fires once per time period.
 */
export function createDebouncedHandler(
	handler: HookHandler,
	debounceMs: number
): HookHandler {
	let lastFired = 0;

	return (effect, stats, eventData) => {
		const now = Date.now();
		if (now - lastFired < debounceMs) {
			return null;
		}
		lastFired = now;
		return handler(effect, stats, eventData);
	};
}

/**
 * Combine multiple handlers into one.
 */
export function combineHandlers(...handlers: HookHandler[]): HookHandler {
	return (effect, stats, eventData) => {
		const allResults: TriggerResult[] = [];

		for (const handler of handlers) {
			const result = handler(effect, stats, eventData);
			if (result) {
				allResults.push(result);
			}
		}

		if (allResults.length === 0) {
			return null;
		}

		// Combine all results into one
		return {
			effect,
			processed: allResults.some((r) => r.processed),
			actions: allResults.flatMap((r) => r.actions),
			messages: allResults.flatMap((r) => r.messages)
		};
	};
}
