<script lang="ts">
	import { PALETTE } from '$lib/palette';
	import { t } from '$lib/i18n';
	import type { KeyboardState } from './types';
	import { TOTAL_COLORS } from './types';

	interface Props {
		keyboardState: KeyboardState;
		onColorSelect: (colorIndex: number) => void;
		onDelete: () => void;
		onSubmit: () => void;
		canSubmit: boolean;
		disabled?: boolean;
	}

	let {
		keyboardState,
		onColorSelect,
		onDelete,
		onSubmit,
		canSubmit,
		disabled = false,
	}: Props = $props();

	// Split into 2 rows of 8
	let topRow = $derived(PALETTE.slice(0, 8));
	let bottomRow = $derived(PALETTE.slice(8, 16));

	function getKeyState(index: number): 'normal' | 'correct' | 'misplaced' | 'eliminated' {
		if (keyboardState.eliminated.has(index)) return 'eliminated';
		if (keyboardState.correct.has(index)) return 'correct';
		if (keyboardState.misplaced.has(index)) return 'misplaced';
		return 'normal';
	}

	function handleKeyClick(index: number): void {
		if (disabled || keyboardState.eliminated.has(index)) return;
		onColorSelect(index);
	}
</script>

<div class="keyboard">
	<div class="color-rows">
		<div class="color-row">
			{#each topRow as color, i}
				{@const state = getKeyState(i)}
				<button
					type="button"
					class="color-key {state}"
					style:background-color={color.hex}
					onclick={() => handleKeyClick(i)}
					disabled={disabled || state === 'eliminated'}
					aria-label={color.name}
				>
					{#if state === 'eliminated'}
						<span class="x-mark">✕</span>
					{/if}
				</button>
			{/each}
		</div>
		<div class="color-row">
			{#each bottomRow as color, i}
				{@const index = i + 8}
				{@const state = getKeyState(index)}
				<button
					type="button"
					class="color-key {state}"
					style:background-color={color.hex}
					onclick={() => handleKeyClick(index)}
					disabled={disabled || state === 'eliminated'}
					aria-label={color.name}
				>
					{#if state === 'eliminated'}
						<span class="x-mark">✕</span>
					{/if}
				</button>
			{/each}
		</div>
	</div>

	<div class="action-row">
		<button type="button" class="action-key delete" onclick={onDelete} {disabled}>
			{$t.colordle.delete}
		</button>
		<button
			type="button"
			class="action-key submit"
			onclick={onSubmit}
			disabled={disabled || !canSubmit}
		>
			{$t.colordle.guess}
		</button>
	</div>
</div>

<style>
	.keyboard {
		display: flex;
		flex-direction: column;
		gap: var(--space-3);
		padding: var(--space-4);
	}

	.color-rows {
		display: flex;
		flex-direction: column;
		gap: var(--space-2);
	}

	.color-row {
		display: flex;
		justify-content: center;
		gap: var(--space-2);
	}

	.color-key {
		width: 36px;
		height: 36px;
		border: 2px solid var(--color-bg-elevated);
		border-radius: var(--radius-sm);
		cursor: pointer;
		transition: all var(--transition-fast);
		position: relative;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.color-key:hover:not(:disabled) {
		transform: scale(1.15);
		z-index: 1;
	}

	.color-key:active:not(:disabled) {
		transform: scale(0.95);
	}

	.color-key.correct {
		border-color: var(--color-success);
		box-shadow: 0 0 8px var(--color-success);
	}

	.color-key.misplaced {
		border-color: var(--color-warning);
		box-shadow: 0 0 6px var(--color-warning);
	}

	.color-key.eliminated {
		opacity: 0.3;
		cursor: not-allowed;
		filter: grayscale(80%);
	}

	.x-mark {
		color: var(--color-text-primary);
		font-size: var(--font-size-sm);
		font-weight: bold;
		text-shadow: 0 0 4px rgba(0, 0, 0, 0.8);
	}

	.action-row {
		display: flex;
		justify-content: center;
		gap: var(--space-3);
	}

	.action-key {
		padding: var(--space-2) var(--space-4);
		border-radius: var(--radius-md);
		font-family: var(--font-family);
		font-size: var(--font-size-sm);
		font-weight: bold;
		cursor: pointer;
		transition: all var(--transition-fast);
		text-transform: uppercase;
	}

	.action-key.delete {
		background: var(--color-bg-tertiary);
		border: 2px solid var(--color-text-muted);
		color: var(--color-text-primary);
	}

	.action-key.delete:hover:not(:disabled) {
		background: var(--color-bg-elevated);
		border-color: var(--color-text-secondary);
	}

	.action-key.submit {
		background: var(--color-btn-primary);
		border: 2px solid var(--color-btn-primary);
		color: var(--color-text-primary);
	}

	.action-key.submit:hover:not(:disabled) {
		background: var(--color-btn-primary-hover);
		border-color: var(--color-btn-primary-hover);
	}

	.action-key:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	@media (max-width: 400px) {
		.color-key {
			width: 30px;
			height: 30px;
		}

		.action-key {
			padding: var(--space-2) var(--space-3);
			font-size: var(--font-size-xs);
		}
	}
</style>
