<!-- CombatResult.svelte - Victory/Defeat/Fled Display -->
<script lang="ts">
	import { t } from '$lib/i18n';
	import type { CombatState } from '$lib/survivor/engine';

	interface Props {
		phase: CombatState['phase'];
		xpReward: number;
	}

	let { phase, xpReward }: Props = $props();
</script>

<div class="combat-over">
	{#if phase === 'victory'}
		<span class="victory-text">{$t.pixelSurvivor.combat.victoryTitle}</span>
		<span class="xp-gained">{$t.pixelSurvivor.xpGained.replace('{xp}', String(xpReward))}</span>
	{:else if phase === 'defeat'}
		<span class="defeat-text">{$t.pixelSurvivor.combat.defeatTitle}</span>
	{:else}
		<span class="fled-text">{$t.pixelSurvivor.combat.fledTitle}</span>
	{/if}
</div>

<style>
	/* Combat Over */
	.combat-over {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: var(--space-2);
		padding: var(--space-6);
		text-align: center;
	}

	.victory-text {
		font-size: var(--font-size-2xl);
		font-weight: var(--font-weight-black);
		color: var(--color-warning);
		text-transform: uppercase;
		animation: victory-bounce 0.5s ease-out;
	}

	.xp-gained {
		font-size: var(--font-size-lg);
		font-weight: var(--font-weight-bold);
		color: var(--color-success);
	}

	.defeat-text {
		font-size: var(--font-size-2xl);
		font-weight: var(--font-weight-black);
		color: var(--color-error);
		text-transform: uppercase;
	}

	.fled-text {
		font-size: var(--font-size-xl);
		font-weight: var(--font-weight-bold);
		color: var(--color-text-secondary);
		text-transform: uppercase;
	}

	@keyframes victory-bounce {
		0% { transform: scale(0.5); opacity: 0; }
		60% { transform: scale(1.2); }
		100% { transform: scale(1); opacity: 1; }
	}
</style>
