<!-- LanguageToggle Atom - Flag-based language switcher -->
<script lang="ts">
	import { currentLanguage, toggleLanguage } from '$lib/i18n';

	// Use actual flag emojis
	const flags: Record<string, string> = {
		en: '🇬🇧',
		de: '🇩🇪',
	};

	// Tooltip text based on current language
	const tooltips: Record<string, string> = {
		en: 'Zu Deutsch wechseln',
		de: 'Switch to English',
	};
</script>

<button
	class="language-toggle"
	onclick={toggleLanguage}
	title={tooltips[$currentLanguage]}
	aria-label={tooltips[$currentLanguage]}
>
	<span class="flag">{flags[$currentLanguage]}</span>
</button>

<style>
	.language-toggle {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 44px;
		height: 44px;
		padding: 0;
		background: var(--color-bg-secondary);
		border: var(--border-width) solid var(--color-bg-tertiary);
		border-radius: var(--radius-full);
		cursor: pointer;
		transition: var(--transition-normal);
		box-shadow: var(--shadow-pixel-sm);
	}

	.language-toggle:hover {
		background: var(--color-bg-tertiary);
		transform: translateY(-2px);
		box-shadow: var(--shadow-pixel);
	}

	.language-toggle:active {
		transform: translateY(0);
		box-shadow: var(--shadow-pixel-sm);
	}

	.flag {
		font-size: var(--font-size-xl);
		line-height: 1;
	}
</style>
