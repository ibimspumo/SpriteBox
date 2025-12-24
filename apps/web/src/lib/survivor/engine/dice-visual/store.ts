/**
 * Dice Visual Store
 *
 * Controls the visual D20 dice roller animation.
 * The result is determined by detecting which face is up after rolling.
 */

import { writable, get } from 'svelte/store';

// ============================================
// TYPES
// ============================================

export interface D20RollState {
	/** Whether the dice is currently rolling */
	isRolling: boolean;
	/** The detected result after rolling (1-20) */
	result: number | null;
	/** Whether this was a critical hit (nat 20) */
	isCrit: boolean;
	/** Whether this was a fumble (nat 1) */
	isFumble: boolean;
	/** Callback to execute when roll animation completes */
	onComplete?: (result: number) => void;
}

export interface RollOptions {
	/** Callback when animation completes with the result */
	onComplete?: (result: number) => void;
}

// ============================================
// STORE
// ============================================

const initialState: D20RollState = {
	isRolling: false,
	result: null,
	isCrit: false,
	isFumble: false,
	onComplete: undefined,
};

export const d20RollState = writable<D20RollState>(initialState);

// Store the promise resolver for current roll
let currentRollResolver: ((result: number) => void) | null = null;

// ============================================
// ACTIONS
// ============================================

/**
 * Trigger a D20 roll animation.
 * The result is determined by physics - whichever face ends up on top.
 * @param options - Roll options including callback
 * @returns Promise that resolves with the result when animation completes
 */
export function rollD20(options: RollOptions = {}): Promise<number> {
	return new Promise((resolve) => {
		currentRollResolver = resolve;

		d20RollState.set({
			isRolling: true,
			result: null, // Result is unknown until dice settles
			isCrit: false,
			isFumble: false,
			onComplete: (finalResult: number) => {
				options.onComplete?.(finalResult);
				resolve(finalResult);
			},
		});
	});
}

/**
 * Reset the dice to idle state.
 */
export function resetD20(): void {
	currentRollResolver = null;
	d20RollState.set(initialState);
}

/**
 * Complete the current roll with the detected result.
 * Called by the D20Dice component after detecting which face is up.
 */
export function completeRoll(detectedResult: number): void {
	const state = get(d20RollState);

	// Update state with actual result
	d20RollState.set({
		isRolling: false,
		result: detectedResult,
		isCrit: detectedResult === 20,
		isFumble: detectedResult === 1,
		onComplete: undefined,
	});

	// Call the completion callback
	if (state.onComplete) {
		state.onComplete(detectedResult);
	}

	currentRollResolver = null;
}

/**
 * Check if dice is currently rolling.
 */
export function isRolling(): boolean {
	return get(d20RollState).isRolling;
}
