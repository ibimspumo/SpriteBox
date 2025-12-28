// apps/web/src/lib/idle-pixel/game-loop.ts
// Game Loop - requestAnimationFrame-based main loop

import type { IdlePixelGameState } from '@spritebox/types';
import { productionSystem } from './systems/production.js';
import { mergeSystem } from './systems/merge.js';
import type { MergeAnimation } from './systems/merge.js';
import { updateClickerSystems } from './systems/clicker.js';

/**
 * Callback for state updates
 */
type StateUpdateCallback = (state: IdlePixelGameState) => void;

/**
 * Callback for animations
 */
type AnimationCallback = (animations: MergeAnimation[]) => void;

/**
 * Game Loop class - manages the main update cycle
 */
export class GameLoop {
	private isRunning = false;
	private animationFrameId: number | null = null;
	private lastTickTime = 0;
	private state: IdlePixelGameState | null = null;

	/** Callback when state is updated */
	private onStateUpdate: StateUpdateCallback | null = null;

	/** Callback when merge animations occur */
	private onMergeAnimations: AnimationCallback | null = null;

	/** Minimum time between ticks in ms (60fps = ~16.67ms) */
	private readonly MIN_TICK_INTERVAL = 16;

	/** Maximum delta time to prevent huge jumps */
	private readonly MAX_DELTA_SECONDS = 1;

	/**
	 * Initialize the game loop with a state
	 */
	initialize(state: IdlePixelGameState): void {
		this.state = state;
		this.lastTickTime = Date.now();
	}

	/**
	 * Set the current state
	 */
	setState(state: IdlePixelGameState): void {
		this.state = state;
	}

	/**
	 * Get the current state
	 */
	getState(): IdlePixelGameState | null {
		return this.state;
	}

	/**
	 * Set callback for state updates
	 */
	setStateUpdateCallback(callback: StateUpdateCallback): void {
		this.onStateUpdate = callback;
	}

	/**
	 * Set callback for merge animations
	 */
	setAnimationCallback(callback: AnimationCallback): void {
		this.onMergeAnimations = callback;
	}

	/**
	 * Start the game loop
	 */
	start(): void {
		if (this.isRunning) return;
		if (!this.state) {
			console.error('Cannot start game loop: no state initialized');
			return;
		}

		this.isRunning = true;
		this.lastTickTime = Date.now();
		this.tick();
	}

	/**
	 * Stop the game loop
	 */
	stop(): void {
		this.isRunning = false;
		if (this.animationFrameId !== null) {
			cancelAnimationFrame(this.animationFrameId);
			this.animationFrameId = null;
		}
	}

	/**
	 * Check if the loop is running
	 */
	isActive(): boolean {
		return this.isRunning;
	}

	/**
	 * Main tick function
	 */
	private tick = (): void => {
		if (!this.isRunning || !this.state) {
			return;
		}

		const now = Date.now();
		const deltaMs = now - this.lastTickTime;

		// Skip if not enough time has passed
		if (deltaMs < this.MIN_TICK_INTERVAL) {
			this.animationFrameId = requestAnimationFrame(this.tick);
			return;
		}

		this.lastTickTime = now;

		// Convert to seconds and cap
		const deltaSeconds = Math.min(deltaMs / 1000, this.MAX_DELTA_SECONDS);

		// Update state
		let newState = this.state;

		// Get current production rate for clicker systems
		const productionPerSecond = productionSystem.getTotalProductionPerSecond(newState);

		// 1. Apply production
		newState = productionSystem.applyProduction(newState, deltaSeconds);

		// 2. Check for merges
		const mergeResult = mergeSystem.checkAndPerformMerges(newState);
		newState = mergeResult.newState;

		// 3. Trigger animations if any
		if (mergeResult.hasMerges && this.onMergeAnimations) {
			this.onMergeAnimations(mergeResult.animations);
		}

		// 4. Update merge animation states
		mergeSystem.updateAnimations();

		// 5. Update clicker systems (energy bar, golden pixel)
		newState = updateClickerSystems(newState, deltaSeconds, now, productionPerSecond);

		// 6. Store updated state
		this.state = newState;

		// 7. Notify listeners
		if (this.onStateUpdate) {
			this.onStateUpdate(newState);
		}

		// Schedule next tick
		this.animationFrameId = requestAnimationFrame(this.tick);
	};

	/**
	 * Force a single tick (useful for testing or manual updates)
	 */
	forceTick(deltaSeconds: number = 1): void {
		if (!this.state) return;

		// Apply production
		let newState = productionSystem.applyProduction(this.state, deltaSeconds);

		// Check for merges
		const mergeResult = mergeSystem.checkAndPerformMerges(newState);
		newState = mergeResult.newState;

		// Trigger animations
		if (mergeResult.hasMerges && this.onMergeAnimations) {
			this.onMergeAnimations(mergeResult.animations);
		}

		// Update state
		this.state = newState;

		// Notify
		if (this.onStateUpdate) {
			this.onStateUpdate(newState);
		}
	}

	/**
	 * Apply offline progress
	 * Called when loading a saved game after time away
	 */
	applyOfflineProgress(offlineSeconds: number, productionMultiplier: number = 0.5): void {
		if (!this.state) return;

		// Calculate offline earnings with multiplier
		const offlineEarnings = productionSystem.calculateProduction(
			this.state,
			offlineSeconds * productionMultiplier
		);

		if (offlineEarnings > 0) {
			this.state = {
				...this.state,
				currency: this.state.currency + offlineEarnings,
				stats: {
					...this.state.stats,
					totalEarned: this.state.stats.totalEarned + offlineEarnings
				},
				lastTick: Date.now()
			};

			if (this.onStateUpdate) {
				this.onStateUpdate(this.state);
			}
		}
	}

	/**
	 * Get statistics about the game loop
	 */
	getLoopStats(): {
		isRunning: boolean;
		lastTickTime: number;
		timeSinceLastTick: number;
	} {
		return {
			isRunning: this.isRunning,
			lastTickTime: this.lastTickTime,
			timeSinceLastTick: Date.now() - this.lastTickTime
		};
	}
}

// Singleton instance
export const gameLoop = new GameLoop();
