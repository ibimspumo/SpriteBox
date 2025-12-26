// Colordle Game Types

export type CellResult = 'correct' | 'misplaced' | 'absent';

export interface ColorGuess {
	colors: number[]; // 6 color indices (0-15)
	results: CellResult[]; // 6 results
}

export interface ColordleState {
	solution: number[]; // 6 color indices (0-15)
	guesses: ColorGuess[]; // Previous guesses
	currentGuess: number[]; // Current input (0-6 colors)
	gameStatus: 'playing' | 'won' | 'lost';
}

export interface KeyboardState {
	eliminated: Set<number>; // Colors not in solution
	correct: Set<number>; // Colors in correct position (green)
	misplaced: Set<number>; // Colors in wrong position (orange)
}

// Constants
export const SEQUENCE_LENGTH = 6;
export const MAX_GUESSES = 6;
export const TOTAL_COLORS = 16;
