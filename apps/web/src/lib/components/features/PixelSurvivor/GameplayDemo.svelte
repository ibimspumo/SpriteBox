<!-- PixelSurvivor/GameplayDemo.svelte - Demo component for the game shell UI -->
<!-- This is a placeholder to demonstrate the game shell layout -->
<script lang="ts">
	import { Button, Icon } from '../../atoms';
	import { Card } from '../../organisms';
	import { t } from '$lib/i18n';
	import { exitGameplay, heal, takeDamage, addXp } from '$lib/survivor';

	// Demo state
	let eventText = $state($t.pixelSurvivor.gameplayDemo.merchantEvent);
	let eventOptions = $derived([
		{ label: $t.pixelSurvivor.gameplayDemo.tradeOption, action: 'trade', variant: 'primary' as const },
		{ label: $t.pixelSurvivor.gameplayDemo.ignoreOption, action: 'ignore', variant: 'secondary' as const },
		{ label: $t.pixelSurvivor.gameplayDemo.attackOption, action: 'attack', variant: 'danger' as const },
	]);

	function handleEventChoice(action: string): void {
		switch (action) {
			case 'trade':
				eventText = $t.pixelSurvivor.gameplayDemo.tradeResult;
				heal(10);
				break;
			case 'ignore':
				eventText = $t.pixelSurvivor.gameplayDemo.ignoreResult;
				break;
			case 'attack':
				eventText = $t.pixelSurvivor.gameplayDemo.attackResult;
				takeDamage(5);
				addXp(20);
				break;
		}

		// Reset after delay
		setTimeout(() => {
			eventText = $t.pixelSurvivor.gameplayDemo.merchantEvent;
		}, 3000);
	}

	function handleBackToMenu(): void {
		exitGameplay();
	}
</script>

<div class="gameplay-demo">
	<!-- Event Area -->
	<div class="event-area">
		<Card padding="md">
			<div class="event-content">
				<h3 class="event-title">{$t.pixelSurvivor.gameplayDemo.eventTitle}</h3>
				<p class="event-text">{eventText}</p>
				<div class="event-actions">
					{#each eventOptions as option}
						<Button
							variant={option.variant}
							size="sm"
							onclick={() => handleEventChoice(option.action)}
						>
							{option.label}
						</Button>
					{/each}
				</div>
			</div>
		</Card>
	</div>

	<!-- Game Area Placeholder -->
	<div class="game-area">
		<Card padding="md">
			<div class="game-placeholder">
				<Icon name="dice" size="xl" />
				<p class="placeholder-text">{$t.pixelSurvivor.gameplayDemo.placeholder}</p>
				<p class="placeholder-hint">{$t.pixelSurvivor.gameplayDemo.placeholderHint}</p>
			</div>
		</Card>
	</div>

	<!-- Back Button -->
	<div class="back-area">
		<Button variant="ghost" onclick={handleBackToMenu}>
			← {$t.pixelSurvivor.gameplayDemo.backToMenu}
		</Button>
	</div>
</div>

<style>
	.gameplay-demo {
		display: flex;
		flex-direction: column;
		gap: var(--space-4);
		width: 100%;
		max-width: 600px;
		margin: 0 auto;
	}

	.event-area {
		width: 100%;
	}

	.event-content {
		display: flex;
		flex-direction: column;
		gap: var(--space-3);
	}

	.event-title {
		margin: 0;
		font-size: var(--font-size-md);
		font-weight: var(--font-weight-bold);
		color: var(--color-warning);
		text-transform: uppercase;
	}

	.event-text {
		margin: 0;
		font-size: var(--font-size-sm);
		color: var(--color-text-primary);
		line-height: 1.5;
	}

	.event-actions {
		display: flex;
		gap: var(--space-2);
		flex-wrap: wrap;
	}

	.game-area {
		flex: 1;
		min-height: 200px;
	}

	.game-placeholder {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: var(--space-3);
		padding: var(--space-8);
		text-align: center;
	}

	.placeholder-text {
		margin: 0;
		font-size: var(--font-size-md);
		color: var(--color-text-secondary);
	}

	.placeholder-hint {
		margin: 0;
		font-size: var(--font-size-sm);
		color: var(--color-text-muted);
	}

	.back-area {
		display: flex;
		justify-content: center;
	}
</style>
