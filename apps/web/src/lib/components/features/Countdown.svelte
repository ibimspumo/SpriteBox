<!-- Countdown Phase - Shows prompt and timer before drawing starts -->
<script lang="ts">
	import { game } from '$lib/stores';
	import { t } from '$lib/i18n';
	import { Timer } from '$lib/components/utility';
	import { PromptDisplay } from '$lib/components/molecules';
</script>

<div class="countdown">
	<h2>{$t.countdown.getReady}</h2>
	<PromptDisplay prompt={$game.prompt} label={$t.drawing.draw} size="lg" centered />
	<Timer />
</div>

<style>
	.countdown {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: var(--space-6);
		text-align: center;
		padding: var(--space-8);
		background: var(--color-bg-secondary);
		border: 3px solid var(--color-bg-tertiary);
		border-radius: var(--radius-md);
	}

	.countdown h2 {
		margin: 0;
		font-size: var(--font-size-2xl);
		color: var(--color-warning);
		animation: pulse 1s ease-in-out infinite;
		text-transform: uppercase;
		letter-spacing: 2px;
	}
</style>
