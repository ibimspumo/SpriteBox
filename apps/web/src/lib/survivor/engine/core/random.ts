/**
 * Secure Random Utilities
 *
 * Cryptographically secure random number generation for game fairness.
 * Uses crypto.getRandomValues() instead of Math.random().
 *
 * @module engine/core/random
 */

// ============================================
// SECURE RANDOM FUNCTIONS
// ============================================

/**
 * Generate a cryptographically secure random integer in range [min, max] (inclusive).
 */
export function secureRandomInt(min: number, max: number): number {
	const range = max - min + 1;
	const array = new Uint32Array(1);
	crypto.getRandomValues(array);
	return min + (array[0] % range);
}

/**
 * Generate a cryptographically secure random float in range [0, 1).
 * Similar to Math.random() but using crypto.getRandomValues().
 */
export function secureRandomFloat(): number {
	const array = new Uint32Array(1);
	crypto.getRandomValues(array);
	// Divide by max uint32 + 1 to get [0, 1)
	return array[0] / 4294967296;
}

/**
 * Generate a cryptographically secure random string of specified length.
 * Uses base36 characters (0-9, a-z).
 */
export function secureRandomString(length: number): string {
	const bytes = new Uint8Array(length);
	crypto.getRandomValues(bytes);
	return Array.from(bytes)
		.map((b) => b.toString(36).padStart(2, '0').slice(-1))
		.join('')
		.slice(0, length);
}

/**
 * Generate a cryptographically secure random hex string of specified length.
 */
export function secureRandomHex(length: number): string {
	const bytes = new Uint8Array(Math.ceil(length / 2));
	crypto.getRandomValues(bytes);
	return Array.from(bytes)
		.map((b) => b.toString(16).padStart(2, '0'))
		.join('')
		.slice(0, length);
}

/**
 * Shuffle an array in place using Fisher-Yates with secure randomness.
 * Returns the same array for chaining.
 */
export function secureShuffleArray<T>(array: T[]): T[] {
	for (let i = array.length - 1; i > 0; i--) {
		const j = secureRandomInt(0, i);
		[array[i], array[j]] = [array[j], array[i]];
	}
	return array;
}

/**
 * Select a random element from an array using secure randomness.
 */
export function secureRandomChoice<T>(array: T[]): T | undefined {
	if (array.length === 0) return undefined;
	return array[secureRandomInt(0, array.length - 1)];
}

/**
 * Weighted random selection using secure randomness.
 * @param items Array of items to select from
 * @param weights Array of weights corresponding to each item
 * @returns The selected item, or undefined if arrays are empty
 */
export function secureWeightedChoice<T>(items: T[], weights: number[]): T | undefined {
	if (items.length === 0 || weights.length === 0) return undefined;
	if (items.length !== weights.length) {
		throw new Error('Items and weights arrays must have the same length');
	}

	const totalWeight = weights.reduce((sum, w) => sum + w, 0);
	if (totalWeight <= 0) return items[0];

	const randomValue = secureRandomFloat() * totalWeight;

	let cumulative = 0;
	for (let i = 0; i < items.length; i++) {
		cumulative += weights[i];
		if (randomValue <= cumulative) {
			return items[i];
		}
	}

	// Fallback (should not normally reach here)
	return items[items.length - 1];
}

/**
 * Generate a unique ID with timestamp and secure random suffix.
 * @param prefix The prefix for the ID (e.g., 'log', 'mod', 'eff')
 * @param randomLength Length of the random suffix (default: 7)
 */
export function generateSecureId(prefix: string, randomLength: number = 7): string {
	return `${prefix}_${Date.now()}_${secureRandomString(randomLength)}`;
}
