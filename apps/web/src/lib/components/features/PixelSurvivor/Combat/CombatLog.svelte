<!-- CombatLog.svelte - Combat Log Display -->
<script lang="ts">
	interface Props {
		messages: string[];
	}

	let { messages }: Props = $props();
</script>

<div class="combat-log">
	{#each messages as message}
		<p class="log-entry">{message}</p>
	{/each}
</div>

<style>
	/* Combat Log */
	.combat-log {
		display: flex;
		flex-direction: column;
		gap: var(--space-1);
		padding: var(--space-3);
		background: var(--color-bg-secondary);
		border-radius: var(--radius-md);
		min-height: 80px;
		max-height: 120px;
		overflow-y: auto;
	}

	.log-entry {
		margin: 0;
		font-size: var(--font-size-sm);
		color: var(--color-text-secondary);
		line-height: 1.4;
	}

	.log-entry:last-child {
		color: var(--color-text-primary);
		font-weight: var(--font-weight-medium);
	}
</style>
