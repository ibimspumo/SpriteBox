<!-- Idle Pixel Page - /play/idle -->
<!-- Single-player idle/clicker game mode -->
<script lang="ts">
	import { onMount } from 'svelte';
	import { IdlePixelGame } from '$lib/components/features/IdlePixel';

	let mounted = $state(false);

	onMount(() => {
		setTimeout(() => {
			mounted = true;
		}, 100);
	});
</script>

<svelte:head>
	<title>Idle Pixel - SpriteBox</title>
	<meta name="description" content="Merge pixels, collect currency, and evolve your way to the top in this idle clicker game!" />
</svelte:head>

<div class="idle-page" class:mounted>
	<IdlePixelGame />
</div>

<style>
	.idle-page {
		min-height: 100vh;
		display: flex;
		flex-direction: column;
		opacity: 0;
		transition: opacity 0.3s ease;
		background: var(--color-bg-primary);
	}

	.idle-page.mounted {
		opacity: 1;
	}
</style>
