/**
 * Dice Visual Module
 *
 * Visual 3D D20 dice roller with pixel art styling.
 *
 * @module engine/dice-visual
 *
 * @example
 * ```svelte
 * <script>
 *   import { D20Dice, rollD20 } from '$lib/survivor/engine';
 *
 *   async function handleRoll() {
 *     const result = await rollD20();
 *     console.log('Rolled:', result);
 *   }
 * </script>
 *
 * <D20Dice size={200} pixelScale={2} />
 * <button onclick={handleRoll}>Roll!</button>
 * ```
 */

// Store and actions
export {
	d20RollState,
	rollD20,
	resetD20,
	completeRoll,
	isRolling,
	type D20RollState,
	type RollOptions,
} from './store.js';

// Components
export { default as D20Dice } from './D20Dice.svelte';
export { default as D20Tester } from './D20Tester.svelte';
