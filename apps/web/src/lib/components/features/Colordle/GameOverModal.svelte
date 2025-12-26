<script lang="ts">
	import { t } from '$lib/i18n';
	import { PALETTE } from '$lib/palette';
	import { Modal } from '$lib/components/organisms';
	import { Button } from '$lib/components/atoms';
	import type { ColorGuess } from './types';

	interface Props {
		show: boolean;
		won: boolean;
		solution: number[];
		guesses: ColorGuess[];
		onPlayAgain: () => void;
		onClose: () => void;
	}

	let { show, won, solution, guesses, onPlayAgain, onClose }: Props = $props();

	let attemptsUsed = $derived(guesses.length);
</script>

<Modal {show} onclose={onClose}>
	<div class="game-over">
		<div class="header">
			{#if won}
				<h2 class="title won">{$t.colordle.youWon}</h2>
				<p class="subtitle">{$t.colordle.guessedIn.replace('{n}', String(attemptsUsed))}</p>
			{:else}
				<h2 class="title lost">{$t.colordle.youLost}</h2>
				<p class="subtitle">{$t.colordle.correctAnswer}</p>
			{/if}
		</div>

		<div class="solution-display">
			<p class="solution-label">{$t.colordle.theSolution}</p>
			<div class="solution-colors">
				{#each solution as colorIndex}
					<div
						class="solution-cell"
						style:background-color={PALETTE[colorIndex].hex}
						title={PALETTE[colorIndex].name}
					></div>
				{/each}
			</div>
		</div>

		<div class="stats">
			<div class="stat">
				<span class="stat-value">{attemptsUsed}</span>
				<span class="stat-label">{$t.colordle.attempts}</span>
			</div>
		</div>

		<div class="actions">
			<Button variant="primary" onclick={onPlayAgain}>
				{$t.colordle.playAgain}
			</Button>
			<Button variant="secondary" onclick={onClose}>
				{$t.common.close}
			</Button>
		</div>
	</div>
</Modal>

<style>
	.game-over {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: var(--space-6);
		padding: var(--space-4);
		text-align: center;
	}

	.header {
		display: flex;
		flex-direction: column;
		gap: var(--space-2);
	}

	.title {
		font-size: var(--font-size-2xl);
		font-weight: bold;
		margin: 0;
	}

	.title.won {
		color: var(--color-success);
	}

	.title.lost {
		color: var(--color-danger);
	}

	.subtitle {
		color: var(--color-text-secondary);
		margin: 0;
	}

	.solution-display {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: var(--space-2);
	}

	.solution-label {
		color: var(--color-text-muted);
		font-size: var(--font-size-sm);
		margin: 0;
		text-transform: uppercase;
	}

	.solution-colors {
		display: flex;
		gap: var(--space-2);
	}

	.solution-cell {
		width: 40px;
		height: 40px;
		border: 2px solid var(--color-success);
		border-radius: var(--radius-sm);
		box-shadow: 0 0 10px var(--color-success);
	}

	.stats {
		display: flex;
		gap: var(--space-6);
	}

	.stat {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: var(--space-1);
	}

	.stat-value {
		font-size: var(--font-size-xl);
		font-weight: bold;
		color: var(--color-accent);
	}

	.stat-label {
		font-size: var(--font-size-xs);
		color: var(--color-text-muted);
		text-transform: uppercase;
	}

	.actions {
		display: flex;
		gap: var(--space-3);
	}
</style>
