<!-- Share Page - Display shared pixel art -->
<script lang="ts">
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';
	import { t } from '$lib/i18n';
	import { decodeShareData, type ShareData } from '$lib/utils/shareUrl';
	import { ShareCard } from '$lib/components/organisms';
	import { Button, LanguageToggle } from '$lib/components/atoms';

	let shareData = $state<ShareData | null>(null);
	let isInvalid = $state(false);

	onMount(() => {
		const encoded = $page.params.data;
		if (!encoded) {
			isInvalid = true;
			return;
		}

		const decoded = decodeShareData(encoded);
		if (decoded) {
			shareData = decoded;
		} else {
			isInvalid = true;
		}
	});
</script>

<svelte:head>
	<title>{$t.sharePage.title} | SpriteBox</title>
</svelte:head>

<div class="share-page">
	<div class="language-toggle-container">
		<LanguageToggle />
	</div>

	<div class="content">
		<!-- Logo -->
		<a href="/" class="logo-link">
			<img src="/logo.png" alt="SpriteBox" class="logo" />
		</a>

		{#if isInvalid}
			<div class="error-state">
				<p class="error-text">{$t.sharePage.invalidLink}</p>
				<a href="/" class="home-link">
					<Button variant="primary">
						{$t.common.backToHome}
					</Button>
				</a>
			</div>
		{:else if shareData}
			<ShareCard pixels={shareData.pixels} username={shareData.username} timestamp={shareData.timestamp} />
		{:else}
			<div class="loading">
				<p>{$t.common.loading}</p>
			</div>
		{/if}
	</div>
</div>

<style>
	.share-page {
		min-height: 100vh;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		padding: var(--space-6);
		background: var(--color-bg-primary);
	}

	.language-toggle-container {
		position: fixed;
		top: var(--space-4);
		right: var(--space-4);
		z-index: 100;
	}

	.content {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: var(--space-8);
		width: 100%;
		max-width: 500px;
	}

	.logo-link {
		text-decoration: none;
		transition: transform var(--transition-normal);
	}

	.logo-link:hover {
		transform: scale(1.05);
	}

	.logo {
		height: 60px;
		width: auto;
		filter: drop-shadow(0 4px 8px rgba(0, 0, 0, 0.3));
	}

	.error-state {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: var(--space-6);
		padding: var(--space-8);
		background: var(--color-bg-secondary);
		border-radius: var(--radius-lg);
		border: 3px solid var(--color-danger);
		text-align: center;
	}

	.error-text {
		font-size: var(--font-size-lg);
		color: var(--color-text-secondary);
		margin: 0;
	}

	.home-link {
		text-decoration: none;
	}

	.loading {
		padding: var(--space-8);
		color: var(--color-text-muted);
		font-size: var(--font-size-lg);
	}

	@media (max-width: 480px) {
		.share-page {
			padding: var(--space-4);
		}

		.logo {
			height: 48px;
		}
	}
</style>
