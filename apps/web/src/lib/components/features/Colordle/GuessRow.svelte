<script lang="ts">
	import type { ColorGuess } from './types';
	import { SEQUENCE_LENGTH } from './types';
	import ColorCell from './ColorCell.svelte';

	interface Props {
		guess?: ColorGuess;
		currentInput?: number[];
		isCurrentRow?: boolean;
		animate?: boolean;
	}

	let { guess, currentInput = [], isCurrentRow = false, animate = false }: Props = $props();

	// Build cells array with 6 positions
	let cells = $derived(() => {
		const result: Array<{
			colorIndex: number | null;
			result?: 'correct' | 'misplaced' | 'absent';
			isActive: boolean;
		}> = [];

		for (let i = 0; i < SEQUENCE_LENGTH; i++) {
			if (guess) {
				// Submitted guess - show colors with results
				result.push({
					colorIndex: guess.colors[i],
					result: guess.results[i],
					isActive: false,
				});
			} else if (isCurrentRow) {
				// Current row - show input or empty
				result.push({
					colorIndex: currentInput[i] ?? null,
					result: undefined,
					isActive: i === currentInput.length,
				});
			} else {
				// Future row - all empty
				result.push({
					colorIndex: null,
					result: undefined,
					isActive: false,
				});
			}
		}

		return result;
	});
</script>

<div class="guess-row" class:shake={isCurrentRow && currentInput.length === SEQUENCE_LENGTH}>
	{#each cells() as cell, i}
		<ColorCell
			colorIndex={cell.colorIndex}
			result={cell.result}
			isActive={cell.isActive}
			{animate}
			animationDelay={animate ? i * 100 : 0}
		/>
	{/each}
</div>

<style>
	.guess-row {
		display: flex;
		gap: var(--space-2);
		justify-content: center;
	}

	.shake {
		animation: shake 0.3s ease;
	}

	@keyframes shake {
		0%,
		100% {
			transform: translateX(0);
		}
		25% {
			transform: translateX(-4px);
		}
		75% {
			transform: translateX(4px);
		}
	}
</style>
