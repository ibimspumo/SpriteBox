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
			<ZombieGrid
				players={$zombiePixel.players}
				myId={$zombiePixel.yourId}
				yourRole={$zombiePixel.yourRole}
				lastInfection={$zombiePixel.lastInfection}
				items={$zombiePixel.items}
				zombieSpeedBoostActive={$zombiePixel.zombieSpeedBoostActive}
				zombieSpeedBoostRemaining={$zombiePixel.zombieSpeedBoostRemaining}
				playersWithHealingTouch={$zombiePixel.playersWithHealingTouch}
			/>
		</div>

		<!-- Speed Boost Indicator (for zombies) -->
		{#if $zombiePixel.yourRole === 'zombie' && $zombiePixel.zombieSpeedBoostActive}
			<div class="effect-indicator speed-boost" role="status">
				<span class="effect-icon" aria-hidden="true">⚡</span>
				<span class="effect-text">
					{Math.ceil($zombiePixel.zombieSpeedBoostRemaining / 1000)}s
				</span>
			</div>
		{/if}

		<!-- Healing Item Indicator (for survivors) -->
		{#if $zombiePixel.yourRole === 'survivor' && $zombiePixel.yourId && $zombiePixel.playersWithHealingTouch.includes($zombiePixel.yourId)}
			<div class="effect-indicator healing" role="status">
				<span class="effect-icon" aria-hidden="true">❤️</span>
				<span class="effect-text">{$t.zombiePixel.healingActive}</span>
			</div>
		{/if}

		<!-- Infection notification (subtle bottom-left toast) -->
		{#if $zombiePixel.lastInfection}
			<div class="infection-toast" role="status" aria-live="polite">
				<span class="infection-icon" aria-hidden="true">☠</span>
				<span class="infection-text">
					{$zombiePixel.lastInfection.victimName}
				</span>
			</div>
		{/if}

		<!-- Healing notification (green toast) -->
		{#if $zombiePixel.lastHealing}
			<div class="healing-toast" role="status" aria-live="polite">
				<span class="healing-icon" aria-hidden="true">💚</span>
				<span class="healing-text">
					{$t.zombiePixel.healed.replace('{name}', $zombiePixel.lastHealing.healedName)}
				</span>
			</div>
		{/if}

		<!-- Item Spawn Announcement (big dramatic banner) -->
		{#if $zombiePixel.lastItemSpawn}
			<div
				class="item-spawn-announcement"
				class:speed-boost={$zombiePixel.lastItemSpawn.type === 'speed-boost'}
				class:healing-touch={$zombiePixel.lastItemSpawn.type === 'healing-touch'}
				role="alert"
				aria-live="assertive"
			>
				<div class="spawn-icon-container">
					<span class="spawn-icon" aria-hidden="true">
						{#if $zombiePixel.lastItemSpawn.type === 'speed-boost'}
							⚡
						{:else}
							❤️
						{/if}
					</span>
				</div>
				<div class="spawn-text">
					<span class="spawn-title">{$t.zombiePixel.itemSpawned}</span>
					<span class="spawn-subtitle">
						{#if $zombiePixel.lastItemSpawn.type === 'speed-boost'}
							{$t.zombiePixel.speedBoostName}
						{:else}
							{$t.zombiePixel.healingTouchName}
						{/if}
					</span>
				</div>
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
		bottom: 120px;
		left: var(--space-4);
		display: flex;
		align-items: center;
		gap: var(--space-2);
		background: rgba(20, 20, 20, 0.9);
		color: var(--color-text-secondary);
		padding: var(--space-2) var(--space-3);
		border-radius: var(--radius-md);
		font-weight: 500;
		font-size: var(--font-size-sm);
		animation: slideInLeft 0.3s ease-out;
		z-index: 100;
		border-left: 3px solid #ef4444;
		backdrop-filter: blur(8px);
	}

	.effect-indicator {
		position: fixed;
		top: 80px;
		right: var(--space-4);
		display: flex;
		align-items: center;
		gap: var(--space-2);
		padding: var(--space-2) var(--space-4);
		border-radius: var(--radius-full);
		font-weight: 700;
		font-size: var(--font-size-md);
		animation: effectPulse 1s ease-in-out infinite;
		z-index: 100;
		backdrop-filter: blur(8px);
	}

	.effect-indicator.speed-boost {
		background: rgba(251, 191, 36, 0.2);
		color: #fbbf24;
		border: 2px solid #fbbf24;
		box-shadow: 0 0 20px rgba(251, 191, 36, 0.4);
	}

	.effect-indicator.healing {
		background: rgba(239, 68, 68, 0.2);
		color: #ef4444;
		border: 2px solid #ef4444;
		box-shadow: 0 0 20px rgba(239, 68, 68, 0.4);
	}

	.effect-icon {
		font-size: var(--font-size-lg);
	}

	.effect-text {
		text-transform: uppercase;
		letter-spacing: 1px;
	}

	@keyframes effectPulse {
		0%,
		100% {
			transform: scale(1);
			opacity: 1;
		}
		50% {
			transform: scale(1.05);
			opacity: 0.9;
		}
	}

	.healing-toast {
		position: fixed;
		bottom: 160px;
		left: var(--space-4);
		display: flex;
		align-items: center;
		gap: var(--space-2);
		background: rgba(20, 40, 20, 0.9);
		color: #22c55e;
		padding: var(--space-2) var(--space-3);
		border-radius: var(--radius-md);
		font-weight: 500;
		font-size: var(--font-size-sm);
		animation: slideInLeft 0.3s ease-out;
		z-index: 100;
		border-left: 3px solid #22c55e;
		backdrop-filter: blur(8px);
	}

	.healing-icon {
		font-size: var(--font-size-md);
	}

	.healing-text {
		opacity: 0.9;
	}

	.infection-icon {
		color: #ef4444;
		font-size: var(--font-size-md);
	}

	.infection-text {
		opacity: 0.9;
	}

	/* Item Spawn Announcement - Big dramatic banner */
	.item-spawn-announcement {
		position: fixed;
		top: 50%;
		left: 50%;
		transform: translate(-50%, -50%);
		display: flex;
		align-items: center;
		gap: var(--space-4);
		padding: var(--space-4) var(--space-6);
		border-radius: var(--radius-xl);
		z-index: 200;
		animation: spawnAnnounce 3s ease-out forwards;
		pointer-events: none;
	}

	.item-spawn-announcement.speed-boost {
		background: linear-gradient(135deg, rgba(251, 191, 36, 0.95) 0%, rgba(245, 158, 11, 0.95) 100%);
		border: 3px solid #fbbf24;
		box-shadow:
			0 0 60px rgba(251, 191, 36, 0.6),
			0 0 120px rgba(251, 191, 36, 0.3),
			inset 0 0 30px rgba(255, 255, 255, 0.2);
	}

	.item-spawn-announcement.healing-touch {
		background: linear-gradient(135deg, rgba(239, 68, 68, 0.95) 0%, rgba(220, 38, 38, 0.95) 100%);
		border: 3px solid #ef4444;
		box-shadow:
			0 0 60px rgba(239, 68, 68, 0.6),
			0 0 120px rgba(239, 68, 68, 0.3),
			inset 0 0 30px rgba(255, 255, 255, 0.2);
	}

	.spawn-icon-container {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 64px;
		height: 64px;
		background: rgba(0, 0, 0, 0.3);
		border-radius: var(--radius-lg);
		animation: iconPulse 0.5s ease-in-out infinite alternate;
	}

	.spawn-icon {
		font-size: 2.5rem;
		line-height: 1;
		filter: drop-shadow(0 0 10px currentColor);
	}

	.spawn-text {
		display: flex;
		flex-direction: column;
		gap: var(--space-1);
	}

	.spawn-title {
		font-size: var(--font-size-xl);
		font-weight: 800;
		color: #fff;
		text-transform: uppercase;
		letter-spacing: 3px;
		text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.5);
	}

	.spawn-subtitle {
		font-size: var(--font-size-md);
		color: rgba(255, 255, 255, 0.9);
		font-weight: 600;
		text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.5);
	}

	@keyframes spawnAnnounce {
		0% {
			opacity: 0;
			transform: translate(-50%, -50%) scale(0.5);
		}
		15% {
			opacity: 1;
			transform: translate(-50%, -50%) scale(1.1);
		}
		25% {
			transform: translate(-50%, -50%) scale(1);
		}
		75% {
			opacity: 1;
			transform: translate(-50%, -50%) scale(1);
		}
		100% {
			opacity: 0;
			transform: translate(-50%, -50%) scale(0.8);
		}
	}

	@keyframes iconPulse {
		from {
			transform: scale(1);
		}
		to {
			transform: scale(1.1);
		}
	}

	@keyframes slideInLeft {
		from {
			opacity: 0;
			transform: translateX(-20px);
		}
		to {
			opacity: 1;
			transform: translateX(0);
		}
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
		.loading-spinner {
			animation: none;
		}

		.infection-toast {
			animation: none;
			opacity: 1;
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
