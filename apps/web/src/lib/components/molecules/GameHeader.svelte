<!-- GameHeader Molecule - Top bar with logo, character portrait, and actions -->
<script lang="ts">
	import { Icon } from '../atoms';
	import { PixelCanvas } from '../utility';
	import { t } from '$lib/i18n';

	interface Props {
		/** Character pixel data (64-char hex string) */
		characterPixels?: string;
		/** Character name */
		characterName?: string;
		/** Show settings button */
		showSettings?: boolean;
		/** Show home/menu button */
		showHome?: boolean;
		/** Callback when settings clicked */
		onsettings?: () => void;
		/** Callback when home clicked */
		onhome?: () => void;
		/** Callback when character portrait clicked */
		oncharacter?: () => void;
		/** Title override (default: "PIXEL SURVIVOR") */
		title?: string;
	}

	let {
		characterPixels,
		characterName,
		showSettings = true,
		showHome = false,
		onsettings,
		onhome,
		oncharacter,
		title,
	}: Props = $props();

	// Get display title
	let displayTitle = $derived(title ?? $t.gameModes.pixelSurvivor);
</script>

<header class="game-header">
	<div class="header-left">
		{#if showHome}
			<button
				class="header-btn"
				onclick={() => onhome?.()}
				aria-label={$t.common.backToHome}
			>
				<Icon name="home" size="md" />
			</button>
		{/if}
		<h1 class="title">{displayTitle}</h1>
	</div>

	<div class="header-right">
		{#if characterPixels}
			<button
				class="character-portrait"
				onclick={() => oncharacter?.()}
				aria-label={characterName ?? $t.pixelSurvivor.viewCharacter}
				title={characterName}
			>
				<PixelCanvas
					pixelData={characterPixels}
					size={40}
					editable={false}
				/>
			</button>
		{/if}

		{#if showSettings}
			<button
				class="header-btn"
				onclick={() => onsettings?.()}
				aria-label={$t.pixelSurvivor.gameShell.settings}
			>
				<Icon name="sliders" size="md" />
			</button>
		{/if}
	</div>
</header>

<style>
	.game-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: var(--space-2) var(--space-4);
		background: var(--color-bg-secondary);
		border-bottom: 3px solid var(--color-bg-tertiary);
		min-height: calc(var(--space-4) * 3.5);
	}

	.header-left {
		display: flex;
		align-items: center;
		gap: var(--space-3);
	}

	.header-right {
		display: flex;
		align-items: center;
		gap: var(--space-2);
	}

	.title {
		margin: 0;
		font-size: var(--font-size-lg);
		font-weight: var(--font-weight-bold);
		color: var(--color-danger);
		text-transform: uppercase;
		letter-spacing: 2px;
	}

	.header-btn {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 40px;
		height: 40px;
		padding: 0;
		background: var(--color-bg-tertiary);
		border: 2px solid var(--color-bg-elevated);
		border-radius: var(--radius-sm);
		color: var(--color-text-secondary);
		cursor: pointer;
		transition: all var(--transition-fast);
	}

	.header-btn:hover {
		background: var(--color-bg-elevated);
		color: var(--color-accent);
		border-color: var(--color-accent);
	}

	.header-btn:focus-visible {
		outline: 2px solid var(--color-accent);
		outline-offset: 2px;
	}

	.character-portrait {
		display: flex;
		align-items: center;
		justify-content: center;
		padding: var(--space-1);
		background: var(--color-bg-tertiary);
		border: 2px solid var(--color-bg-elevated);
		border-radius: var(--radius-sm);
		cursor: pointer;
		transition: all var(--transition-fast);
	}

	.character-portrait:hover {
		border-color: var(--color-accent);
		transform: scale(1.05);
	}

	.character-portrait:focus-visible {
		outline: 2px solid var(--color-accent);
		outline-offset: 2px;
	}

	/* Mobile adjustments */
	@media (max-width: 480px) {
		.game-header {
			padding: var(--space-2) var(--space-3);
		}

		.title {
			font-size: var(--font-size-md);
			letter-spacing: 1px;
		}

		.header-btn,
		.character-portrait {
			width: 36px;
			height: 36px;
		}
	}
</style>
