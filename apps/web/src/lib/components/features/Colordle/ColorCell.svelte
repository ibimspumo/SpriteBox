<script lang="ts">
	import type { CellResult } from './types';
	import { getColorByIndex } from '$lib/palette';

	interface Props {
		colorIndex: number | null;
		result?: CellResult;
		isActive?: boolean;
		animate?: boolean;
		animationDelay?: number;
	}

	let {
		colorIndex,
		result,
		isActive = false,
		animate = false,
		animationDelay = 0,
	}: Props = $props();

	let backgroundColor = $derived(
		colorIndex !== null ? getColorByIndex(colorIndex) : 'transparent'
	);

	let cellClass = $derived(() => {
		const classes = ['cell'];
		if (colorIndex === null) {
			classes.push('empty');
		} else {
			classes.push('filled');
		}
		if (result) {
			classes.push(result);
		}
		if (isActive) {
			classes.push('active');
		}
		if (animate) {
			classes.push('animate');
		}
		return classes.join(' ');
	});
</script>

<div
	class={cellClass()}
	style:background-color={backgroundColor}
	style:animation-delay="{animationDelay}ms"
>
	{#if colorIndex !== null && result}
		<div class="result-indicator"></div>
	{/if}
</div>

<style>
	.cell {
		width: 44px;
		height: 44px;
		border: 3px solid var(--color-bg-elevated);
		border-radius: var(--radius-sm);
		transition: all var(--transition-fast);
		position: relative;
		box-sizing: border-box;
	}

	.cell.empty {
		background: var(--color-bg-tertiary);
	}

	.cell.active {
		border-color: var(--color-accent);
		box-shadow: 0 0 8px var(--color-accent);
	}

	.cell.filled {
		border-color: var(--color-text-secondary);
	}

	.cell.correct {
		border-color: var(--color-success);
		box-shadow: 0 0 10px var(--color-success);
	}

	.cell.misplaced {
		border-color: var(--color-warning);
		box-shadow: 0 0 8px var(--color-warning);
	}

	.cell.absent {
		opacity: 0.6;
		border-color: var(--color-text-muted);
	}

	.cell.animate {
		animation: flip 0.5s ease forwards;
	}

	.result-indicator {
		position: absolute;
		bottom: 2px;
		right: 2px;
		width: 8px;
		height: 8px;
		border-radius: 50%;
	}

	.correct .result-indicator {
		background: var(--color-success);
	}

	.misplaced .result-indicator {
		background: var(--color-warning);
	}

	@keyframes flip {
		0% {
			transform: rotateX(0);
		}
		50% {
			transform: rotateX(90deg);
		}
		100% {
			transform: rotateX(0);
		}
	}

	@media (max-width: 400px) {
		.cell {
			width: 36px;
			height: 36px;
		}
	}
</style>
