<script lang="ts">
	import type { ColorGuess } from './types';
	import { MAX_GUESSES } from './types';
	import GuessRow from './GuessRow.svelte';

	interface Props {
		guesses: ColorGuess[];
		currentGuess: number[];
		lastGuessAnimating?: boolean;
	}

	let { guesses, currentGuess, lastGuessAnimating = false }: Props = $props();

	let currentRowIndex = $derived(guesses.length);
</script>

<div class="guess-grid">
	{#each Array(MAX_GUESSES) as _, rowIndex}
		{#if rowIndex < guesses.length}
			<!-- Submitted guess -->
			<GuessRow
				guess={guesses[rowIndex]}
				animate={lastGuessAnimating && rowIndex === guesses.length - 1}
			/>
		{:else if rowIndex === currentRowIndex}
			<!-- Current input row -->
			<GuessRow currentInput={currentGuess} isCurrentRow />
		{:else}
			<!-- Future empty row -->
			<GuessRow />
		{/if}
	{/each}
</div>

<style>
	.guess-grid {
		display: flex;
		flex-direction: column;
		gap: var(--space-2);
		padding: var(--space-4);
	}
</style>
