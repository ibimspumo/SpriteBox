<!-- CombatDiceRoll.svelte - D20 Dice Roll Visual with Rolling State -->
<script lang="ts">
	import { D20Dice } from '$lib/survivor/engine';

	interface Props {
		isRolling: boolean;
		isCombatOver: boolean;
	}

	let { isRolling, isCombatOver }: Props = $props();
</script>

{#if !isCombatOver}
	<div class="dice-container" class:rolling={isRolling}>
		<D20Dice size={150} />
	</div>
{/if}

<style>
	/* Dice Container */
	.dice-container {
		display: flex;
		justify-content: center;
		align-items: center;
		padding: var(--space-4);
		min-height: 180px;
		opacity: 0.3;
		transition: opacity 0.3s ease;
	}

	.dice-container.rolling {
		opacity: 1;
	}
</style>
