<!-- ZombiePixel Game - Main Component -->
<script lang="ts">
	import { zombiePixel } from '$lib/stores';
	import { t } from '$lib/i18n';
	import ZombieGrid from './ZombieGrid.svelte';
	import ZombieControls from './ZombieControls.svelte';
	import ZombieHUD from './ZombieHUD.svelte';
	import ZombieResults from './ZombieResults.svelte';
	import { onMount } from 'svelte';

	let mounted = $state(false);

	onMount(() => {
		requestAnimationFrame(() => {
			mounted = true;
		});
	});
</script>

<div class="zombie-pixel-game" class:mounted>
	{#if $zombiePixel.isGameActive}
		<!-- HUD -->
		<ZombieHUD
			timeRemaining={$zombiePixel.timeRemaining}
			survivorCount={$zombiePixel.survivorCount}
			zombieCount={$zombiePixel.zombieCount}
			yourRole={$zombiePixel.yourRole}
		/>

		<!-- Game Grid -->
		<div class="grid-container">
			<ZombieGrid players={$zombiePixel.players} myId={$zombiePixel.yourId} yourRole={$zombiePixel.yourRole} />
		</div>

		<!-- Infection notification -->
		{#if $zombiePixel.lastInfection}
			<div class="infection-toast" role="alert">
				{$zombiePixel.lastInfection.victimName}
				{$t.zombiePixel.infected.replace('{name}', '')}
			</div>
		{/if}

		<!-- Controls -->
		<ZombieControls />
	{:else if $zombiePixel.winner || $zombiePixel.zombiesWin}
		<ZombieResults
			winner={$zombiePixel.winner}
			zombiesWin={$zombiePixel.zombiesWin}
			stats={$zombiePixel.stats}
		/>
	{:else}
		<!-- Waiting / Role Reveal state -->
		<div class="waiting">
			<div class="role-reveal" class:zombie={$zombiePixel.yourRole === 'zombie'}>
				{#if $zombiePixel.yourRole === 'zombie'}
					<span class="role-icon" aria-hidden="true">&#x1F9DF;</span>
					<h2>{$t.zombiePixel.youAreZombie}</h2>
					<p class="role-hint">{$t.zombiePixel.controls.swipe}</p>
				{:else if $zombiePixel.yourRole === 'survivor'}
					<span class="role-icon" aria-hidden="true">&#x1F464;</span>
					<h2>{$t.zombiePixel.youAreSurvivor}</h2>
					<p class="role-hint">{$t.zombiePixel.controls.swipe}</p>
				{:else}
					<div class="loading-spinner"></div>
					<p>{$t.zombiePixel.waiting}</p>
				{/if}
			</div>
		</div>
	{/if}
</div>

<style>
	.zombie-pixel-game {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		min-height: 100vh;
		min-height: 100dvh;
		padding: var(--space-4);
		background: var(--color-bg-primary);
		position: relative;
		overflow: hidden;
	}

	.grid-container {
		flex: 1;
		display: flex;
		align-items: center;
		justify-content: center;
		width: 100%;
		max-width: min(90vw, 70vh);
		margin-block: var(--space-6);
	}

	.infection-toast {
		position: fixed;
		top: 50%;
		left: 50%;
		transform: translate(-50%, -50%);
		background: rgba(239, 68, 68, 0.95);
		color: white;
		padding: var(--space-3) var(--space-5);
		border-radius: var(--radius-lg);
		font-weight: 700;
		font-size: var(--font-size-lg);
		animation: pulseIn 0.5s ease-out;
		z-index: 100;
		box-shadow: 0 0 40px rgba(239, 68, 68, 0.5);
		text-transform: uppercase;
		letter-spacing: 1px;
	}

	.waiting {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		height: 100%;
		flex: 1;
	}

	.role-reveal {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: var(--space-4);
		padding: var(--space-8);
		background: var(--color-bg-secondary);
		border-radius: var(--radius-xl);
		border: 3px solid var(--color-border);
		box-shadow: var(--shadow-pixel-lg);
		opacity: 0;
		transform: scale(0.9);
		transition:
			opacity 0.4s ease-out,
			transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
	}

	.mounted .role-reveal {
		opacity: 1;
		transform: scale(1);
	}

	.role-reveal.zombie {
		background: linear-gradient(135deg, #1a4d1a 0%, #0d260d 100%);
		border-color: #22c55e;
		box-shadow:
			var(--shadow-pixel-lg),
			0 0 40px rgba(34, 197, 94, 0.3);
	}

	.role-icon {
		font-size: 5rem;
		line-height: 1;
		animation: iconBounce 1s ease-in-out infinite;
	}

	.role-reveal h2 {
		color: var(--color-text-primary);
		font-size: var(--font-size-xl);
		text-align: center;
		margin: 0;
		text-transform: uppercase;
		letter-spacing: 2px;
	}

	.role-hint {
		color: var(--color-text-secondary);
		font-size: var(--font-size-sm);
		margin: 0;
	}

	.loading-spinner {
		width: 48px;
		height: 48px;
		border: 4px solid var(--color-bg-tertiary);
		border-top-color: var(--color-accent);
		border-radius: 50%;
		animation: spin 1s linear infinite;
	}

	@keyframes pulseIn {
		0% {
			transform: translate(-50%, -50%) scale(1.3);
			opacity: 0;
		}
		50% {
			transform: translate(-50%, -50%) scale(1.1);
			opacity: 1;
		}
		100% {
			transform: translate(-50%, -50%) scale(1);
			opacity: 1;
		}
	}

	@keyframes iconBounce {
		0%,
		100% {
			transform: translateY(0);
		}
		50% {
			transform: translateY(-8px);
		}
	}

	@keyframes spin {
		to {
			transform: rotate(360deg);
		}
	}

	/* Reduce motion */
	@media (prefers-reduced-motion: reduce) {
		.role-icon,
		.loading-spinner,
		.infection-toast {
			animation: none;
		}

		.role-reveal {
			transition: opacity 0.2s ease;
			transform: none;
		}
	}

	/* Mobile adjustments */
	@media (max-width: 480px) {
		.zombie-pixel-game {
			padding: var(--space-2);
		}

		.grid-container {
			max-width: 95vw;
			margin-block: var(--space-4);
		}

		.role-reveal {
			padding: var(--space-6);
		}

		.role-icon {
			font-size: 4rem;
		}
	}
</style>
