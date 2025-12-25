<script lang="ts">
	/**
	 * D20 Dice Tester - Development Only
	 *
	 * A floating panel for testing the D20 dice animation.
	 * Only visible in development mode.
	 */
	import { dev } from '$app/environment';
	import D20Dice from './D20Dice.svelte';
	import { rollD20, resetD20, d20RollState } from './store.js';

	// Panel state
	let isOpen = $state(false);
	let lastResults = $state<number[]>([]);
	let rollCount = $state(0);
	let critCount = $state(0);
	let fumbleCount = $state(0);

	// Current roll state
	let isRolling = $derived($d20RollState.isRolling);
	let currentResult = $derived($d20RollState.result);

	// Roll the dice - result is determined by physics
	async function roll(): Promise<void> {
		const result = await rollD20();
		recordResult(result);
	}

	// Record result for stats
	function recordResult(result: number): void {
		lastResults = [...lastResults.slice(-9), result];
		rollCount++;
		if (result === 20) critCount++;
		if (result === 1) fumbleCount++;
	}

	// Reset stats
	function resetStats(): void {
		lastResults = [];
		rollCount = 0;
		critCount = 0;
		fumbleCount = 0;
		resetD20();
	}

	// Toggle panel
	function toggle(): void {
		isOpen = !isOpen;
	}
</script>

{#if dev}
	<button
		class="d20-toggle"
		onclick={toggle}
		title="D20 Tester"
	>
		{isOpen ? '×' : '🎲'}
	</button>

	{#if isOpen}
		<div class="d20-tester">
			<div class="tester-header">
				<h3>D20 Tester</h3>
				<button class="close-btn" onclick={toggle}>×</button>
			</div>

			<!-- Dice Display -->
			<div class="dice-display">
				<D20Dice size={180} pixelScale={2} />
			</div>

			<!-- Roll Button -->
			<div class="controls">
				<button
					class="roll-btn primary"
					onclick={roll}
					disabled={isRolling}
				>
					Roll D20
				</button>
				<p class="hint">Watch the dice land on your result!</p>
			</div>

			<!-- Stats -->
			<div class="stats">
				<div class="stat">
					<span class="label">Rolls</span>
					<span class="value">{rollCount}</span>
				</div>
				<div class="stat crit">
					<span class="label">Crits</span>
					<span class="value">{critCount}</span>
				</div>
				<div class="stat fumble">
					<span class="label">Fumbles</span>
					<span class="value">{fumbleCount}</span>
				</div>
			</div>

			<!-- History -->
			{#if lastResults.length > 0}
				<div class="history">
					<span class="label">History:</span>
					<div class="results">
						{#each lastResults as result}
							<span
								class="result"
								class:crit={result === 20}
								class:fumble={result === 1}
							>
								{result}
							</span>
						{/each}
					</div>
				</div>
			{/if}

			<!-- Reset -->
			<button class="reset-btn" onclick={resetStats}>
				Reset Stats
			</button>
		</div>
	{/if}
{/if}

<style>
	.d20-toggle {
		position: fixed;
		bottom: var(--space-4);
		right: var(--space-4);
		z-index: 9999;
		width: 48px;
		height: 48px;
		border-radius: var(--radius-full);
		background: linear-gradient(135deg, #cc2222, #881111);
		color: white;
		border: 2px solid rgba(255, 255, 255, 0.2);
		font-size: var(--font-size-xl);
		cursor: pointer;
		box-shadow: var(--shadow-lg);
		transition: transform var(--transition-normal), box-shadow var(--transition-normal);
	}

	.d20-toggle:hover {
		transform: scale(1.1) rotate(15deg);
		box-shadow: 0 0 20px rgba(204, 34, 34, 0.5);
	}

	.d20-tester {
		position: fixed;
		bottom: 70px;
		right: var(--space-4);
		z-index: 9998;
		width: 260px;
		background: var(--color-bg-primary);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-lg);
		box-shadow: var(--shadow-lg);
		overflow: hidden;
	}

	.tester-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: var(--space-2) var(--space-3);
		background: linear-gradient(135deg, #cc2222, #881111);
		color: white;
	}

	.tester-header h3 {
		margin: 0;
		font-size: var(--font-size-sm);
		font-weight: bold;
	}

	.close-btn {
		background: transparent;
		border: none;
		color: white;
		font-size: var(--font-size-lg);
		cursor: pointer;
		padding: 0;
		line-height: 1;
	}

	.dice-display {
		display: flex;
		justify-content: center;
		align-items: center;
		padding: var(--space-2);
		background: rgba(0, 0, 0, 0.3);
	}

	.controls {
		padding: var(--space-3);
		display: flex;
		flex-direction: column;
		gap: var(--space-2);
	}

	.roll-btn {
		padding: var(--space-2) var(--space-3);
		border: none;
		border-radius: var(--radius-md);
		background: var(--color-bg-secondary);
		color: var(--color-text-primary);
		font-size: var(--font-size-sm);
		font-weight: bold;
		cursor: pointer;
		transition: all var(--transition-fast);
	}

	.roll-btn:hover:not(:disabled) {
		background: var(--color-bg-tertiary);
		transform: translateY(-1px);
	}

	.roll-btn:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.roll-btn.primary {
		background: linear-gradient(135deg, #cc2222, #881111);
		color: white;
	}

	.roll-btn.primary:hover:not(:disabled) {
		background: linear-gradient(135deg, #dd3333, #992222);
	}

	.hint {
		margin: var(--space-2) 0 0 0;
		font-size: var(--font-size-xs);
		color: var(--color-text-muted);
		text-align: center;
		font-style: italic;
	}

	.stats {
		display: flex;
		justify-content: space-around;
		padding: var(--space-2) var(--space-3);
		background: rgba(0, 0, 0, 0.2);
		border-top: 1px solid var(--color-border);
	}

	.stat {
		text-align: center;
	}

	.stat .label {
		display: block;
		font-size: var(--font-size-xs);
		color: var(--color-text-muted);
	}

	.stat .value {
		font-size: var(--font-size-lg);
		font-weight: bold;
		font-family: var(--font-family-mono);
	}

	.stat.crit .value {
		color: var(--color-warning);
	}

	.stat.fumble .value {
		color: var(--color-error);
	}

	.history {
		padding: var(--space-2) var(--space-3);
		border-top: 1px solid var(--color-border);
	}

	.history .label {
		font-size: var(--font-size-xs);
		color: var(--color-text-muted);
		display: block;
		margin-bottom: var(--space-1);
	}

	.results {
		display: flex;
		flex-wrap: wrap;
		gap: var(--space-1);
	}

	.result {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 24px;
		height: 24px;
		border-radius: var(--radius-sm);
		background: var(--color-bg-secondary);
		font-size: var(--font-size-xs);
		font-weight: bold;
		font-family: var(--font-family-mono);
	}

	.result.crit {
		background: linear-gradient(135deg, #ffd700, #ff8c00);
		color: #000;
	}

	.result.fumble {
		background: linear-gradient(135deg, #8b0000, #4a0000);
		color: #ff4444;
	}

	.reset-btn {
		width: 100%;
		padding: var(--space-2);
		border: none;
		background: transparent;
		color: var(--color-text-muted);
		font-size: var(--font-size-xs);
		cursor: pointer;
		transition: color var(--transition-fast);
	}

	.reset-btn:hover {
		color: var(--color-text-primary);
	}
</style>
