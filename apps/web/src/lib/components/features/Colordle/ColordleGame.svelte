<script lang="ts">
	import { goto } from '$app/navigation';
	import { t } from '$lib/i18n';
	import type { ColorGuess, KeyboardState, CellResult } from './types';
	import { SEQUENCE_LENGTH, MAX_GUESSES, TOTAL_COLORS } from './types';
	import GuessGrid from './GuessGrid.svelte';
	import ColorKeyboard from './ColorKeyboard.svelte';
	import GameOverModal from './GameOverModal.svelte';

	// Game state
	let solution = $state<number[]>([]);
	let guesses = $state<ColorGuess[]>([]);
	let currentGuess = $state<number[]>([]);
	let gameStatus = $state<'playing' | 'won' | 'lost'>('playing');
	let lastGuessAnimating = $state(false);
	let showGameOver = $state(false);

	// Keyboard state tracking
	let keyboardState = $state<KeyboardState>({
		eliminated: new Set(),
		correct: new Set(),
		misplaced: new Set(),
	});

	// Derived state
	let canSubmit = $derived(currentGuess.length === SEQUENCE_LENGTH);
	let isGameOver = $derived(gameStatus !== 'playing');

	// Generate a new solution
	function generateSolution(): number[] {
		return Array.from({ length: SEQUENCE_LENGTH }, () =>
			Math.floor(Math.random() * TOTAL_COLORS)
		);
	}

	// Evaluate a guess using Wordle algorithm
	function evaluateGuess(guess: number[], sol: number[]): CellResult[] {
		const results: CellResult[] = Array(SEQUENCE_LENGTH).fill('absent');
		const solutionCopy = [...sol];

		// Pass 1: Mark correct positions (green)
		for (let i = 0; i < SEQUENCE_LENGTH; i++) {
			if (guess[i] === sol[i]) {
				results[i] = 'correct';
				solutionCopy[i] = -1; // Mark as used
			}
		}

		// Pass 2: Mark misplaced positions (orange)
		for (let i = 0; i < SEQUENCE_LENGTH; i++) {
			if (results[i] !== 'correct') {
				const idx = solutionCopy.indexOf(guess[i]);
				if (idx !== -1) {
					results[i] = 'misplaced';
					solutionCopy[idx] = -1; // Mark as used
				}
			}
		}

		return results;
	}

	// Update keyboard state based on guess results
	function updateKeyboardState(guess: number[], results: CellResult[]): void {
		for (let i = 0; i < SEQUENCE_LENGTH; i++) {
			const colorIndex = guess[i];
			const result = results[i];

			if (result === 'correct') {
				keyboardState.correct.add(colorIndex);
				keyboardState.misplaced.delete(colorIndex);
			} else if (result === 'misplaced') {
				if (!keyboardState.correct.has(colorIndex)) {
					keyboardState.misplaced.add(colorIndex);
				}
			} else if (result === 'absent') {
				// Only eliminate if this color is not used elsewhere in solution
				const colorInSolution = solution.includes(colorIndex);
				if (!colorInSolution) {
					keyboardState.eliminated.add(colorIndex);
				}
			}
		}
		// Trigger reactivity
		keyboardState = { ...keyboardState };
	}

	// Handle color selection from keyboard
	function handleColorSelect(colorIndex: number): void {
		if (isGameOver || currentGuess.length >= SEQUENCE_LENGTH) return;
		currentGuess = [...currentGuess, colorIndex];
	}

	// Handle delete
	function handleDelete(): void {
		if (isGameOver || currentGuess.length === 0) return;
		currentGuess = currentGuess.slice(0, -1);
	}

	// Handle submit guess
	function handleSubmit(): void {
		if (!canSubmit || isGameOver) return;

		const results = evaluateGuess(currentGuess, solution);
		const newGuess: ColorGuess = {
			colors: [...currentGuess],
			results,
		};

		// Add guess and animate
		guesses = [...guesses, newGuess];
		lastGuessAnimating = true;
		setTimeout(() => {
			lastGuessAnimating = false;
		}, 600);

		// Update keyboard state
		updateKeyboardState(currentGuess, results);

		// Check win/lose
		const allCorrect = results.every((r) => r === 'correct');
		if (allCorrect) {
			gameStatus = 'won';
			setTimeout(() => {
				showGameOver = true;
			}, 800);
		} else if (guesses.length >= MAX_GUESSES) {
			gameStatus = 'lost';
			setTimeout(() => {
				showGameOver = true;
			}, 800);
		}

		// Reset current guess
		currentGuess = [];
	}

	// Start a new game
	function startNewGame(): void {
		solution = generateSolution();
		guesses = [];
		currentGuess = [];
		gameStatus = 'playing';
		showGameOver = false;
		keyboardState = {
			eliminated: new Set(),
			correct: new Set(),
			misplaced: new Set(),
		};
	}

	// Handle keyboard input
	function handleKeydown(event: KeyboardEvent): void {
		if (isGameOver) return;

		if (event.key === 'Backspace') {
			event.preventDefault();
			handleDelete();
		} else if (event.key === 'Enter') {
			event.preventDefault();
			if (canSubmit) handleSubmit();
		}
	}

	// Initialize game on mount
	$effect(() => {
		startNewGame();
	});

	// Navigate back to mode selection
	function goBack(): void {
		goto('/play');
	}
</script>

<svelte:window onkeydown={handleKeydown} />

<div class="colordle-wrapper">
	<header class="game-header">
		<h1 class="title">{$t.colordle.title}</h1>
		<p class="subtitle">{$t.colordle.subtitle}</p>
	</header>

	<main class="game-content">
		<GuessGrid {guesses} {currentGuess} {lastGuessAnimating} />

		<ColorKeyboard
			{keyboardState}
			onColorSelect={handleColorSelect}
			onDelete={handleDelete}
			onSubmit={handleSubmit}
			{canSubmit}
			disabled={isGameOver}
		/>
	</main>

	<!-- Back to mode selection -->
	<button class="back-link" onclick={goBack}>
		← {$t.common.backToModes}
	</button>

	<GameOverModal
		show={showGameOver}
		won={gameStatus === 'won'}
		{solution}
		{guesses}
		onPlayAgain={startNewGame}
		onClose={() => (showGameOver = false)}
	/>
</div>

<style>
	.colordle-wrapper {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: var(--space-6);
		min-height: 100vh;
		padding: var(--space-6);
		background: var(--color-bg-primary);
	}

	.game-header {
		text-align: center;
	}

	.title {
		font-size: var(--font-size-2xl);
		font-weight: bold;
		color: var(--color-accent);
		margin: 0;
		text-transform: uppercase;
		letter-spacing: 0.1em;
	}

	.subtitle {
		font-size: var(--font-size-sm);
		color: var(--color-text-secondary);
		margin: var(--space-2) 0 0 0;
	}

	.game-content {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: var(--space-4);
		width: 100%;
		max-width: 400px;
	}

	.back-link {
		display: inline-flex;
		align-items: center;
		gap: var(--space-1);
		padding: var(--space-2) var(--space-3);
		background: transparent;
		border: none;
		font-family: var(--font-family);
		font-size: var(--font-size-sm);
		color: var(--color-text-muted);
		cursor: pointer;
		transition: color var(--transition-fast);
	}

	.back-link:hover {
		color: var(--color-accent);
	}

	@media (max-width: 400px) {
		.colordle-wrapper {
			padding: var(--space-4);
		}

		.title {
			font-size: var(--font-size-xl);
		}

		.subtitle {
			font-size: var(--font-size-xs);
		}
	}
</style>
