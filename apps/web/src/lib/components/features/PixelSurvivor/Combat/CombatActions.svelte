<!-- CombatActions.svelte - Attack/Flee Buttons with Turn Indicator -->
<script lang="ts">
	import { Button, Icon } from '../../../atoms';
	import { t } from '$lib/i18n';

	interface Props {
		isPlayerTurn: boolean;
		isRollingDice: boolean;
		onAttack: () => void;
		onFlee: () => void;
	}

	let { isPlayerTurn, isRollingDice, onAttack, onFlee }: Props = $props();
</script>

<div class="combat-actions">
	<Button
		variant="danger"
		size="lg"
		onclick={onAttack}
		disabled={!isPlayerTurn || isRollingDice}
	>
		<Icon name="zap" size="sm" />
		{$t.pixelSurvivor.combat.attack}
	</Button>
	<Button
		variant="secondary"
		size="md"
		onclick={onFlee}
		disabled={!isPlayerTurn || isRollingDice}
	>
		{$t.pixelSurvivor.combat.flee}
	</Button>
</div>

<!-- Turn Indicator -->
<div class="turn-indicator">
	{#if isPlayerTurn}
		<span class="your-turn">{$t.pixelSurvivor.combat.yourTurn}</span>
	{:else}
		<span class="enemy-turn">{$t.pixelSurvivor.combat.enemyTurn}</span>
	{/if}
</div>

<style>
	/* Combat Actions */
	.combat-actions {
		display: flex;
		justify-content: center;
		gap: var(--space-3);
	}

	/* Turn Indicator */
	.turn-indicator {
		text-align: center;
		padding: var(--space-2);
	}

	.your-turn {
		font-size: var(--font-size-md);
		font-weight: var(--font-weight-bold);
		color: var(--color-success);
		text-transform: uppercase;
		animation: pulse 1s ease-in-out infinite;
	}

	.enemy-turn {
		font-size: var(--font-size-md);
		font-weight: var(--font-weight-bold);
		color: var(--color-error);
		text-transform: uppercase;
	}

	@keyframes pulse {
		0%, 100% { opacity: 1; }
		50% { opacity: 0.6; }
	}
</style>
