<!-- CopyCat Royale Game - Main Orchestrator Component -->
<script lang="ts">
	import { game, copyCatRoyale, hasSubmitted, pixels } from '$lib/stores';
	import { onMount } from 'svelte';

	// Phase components
	import RoyaleInitialDrawing from './RoyaleInitialDrawing.svelte';
	import RoyaleShowReference from './RoyaleShowReference.svelte';
	import RoyaleDrawing from './RoyaleDrawing.svelte';
	import RoyaleResults from './RoyaleResults.svelte';
	import RoyaleWinner from './RoyaleWinner.svelte';

	let mounted = $state(false);
	let lastPhase = $state<string | null>(null);

	onMount(() => {
		requestAnimationFrame(() => {
			mounted = true;
		});
	});

	// Current phase
	let phase = $derived($game.phase);
	let royaleState = $derived($copyCatRoyale);

	// Reset canvas when entering drawing phases
	$effect(() => {
		const currentPhase = $game.phase;

		// Reset canvas when entering royale-drawing phase (not initial drawing)
		if (currentPhase === 'royale-drawing' && lastPhase !== 'royale-drawing') {
			pixels.set('1'.repeat(64));
			hasSubmitted.set(false);
		}

		// Also reset hasSubmitted when entering initial drawing
		if (currentPhase === 'royale-initial-drawing' && lastPhase !== 'royale-initial-drawing') {
			hasSubmitted.set(false);
		}

		lastPhase = currentPhase;
	});
</script>

<div class="royale-game" class:mounted>
	{#if phase === 'royale-initial-drawing'}
		<RoyaleInitialDrawing />
	{:else if phase === 'royale-show-reference'}
		<RoyaleShowReference {royaleState} />
	{:else if phase === 'royale-drawing'}
		<RoyaleDrawing {royaleState} />
	{:else if phase === 'royale-results'}
		<RoyaleResults {royaleState} />
	{:else if phase === 'royale-winner'}
		<RoyaleWinner {royaleState} />
	{/if}
</div>

<style>
	.royale-game {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		min-height: 100vh;
		min-height: 100dvh;
		padding: var(--space-4);
		background: var(--color-bg-primary);
	}

	.royale-game > :global(.phase-container) {
		opacity: 0;
		transform: translateY(20px);
		transition: all 0.4s ease-out;
	}

	.royale-game.mounted > :global(.phase-container) {
		opacity: 1;
		transform: translateY(0);
	}

	/* Mobile */
	@media (max-width: 480px) {
		.royale-game {
			padding: var(--space-2);
		}
	}

	/* Reduce motion */
	@media (prefers-reduced-motion: reduce) {
		.royale-game > :global(.phase-container) {
			transition: opacity 0.2s ease;
			transform: none;
		}
	}
</style>
