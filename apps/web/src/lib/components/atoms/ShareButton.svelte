<!-- ShareButton Atom - Share pixel art via URL -->
<script lang="ts">
	import { t } from '$lib/i18n';
	import { playSound } from '$lib/audio';
	import { generateShareUrl } from '$lib/utils/shareUrl';

	interface Props {
		pixels: string;
		username: string;
		size?: 'sm' | 'md';
	}

	let { pixels, username, size = 'sm' }: Props = $props();

	let showCopied = $state(false);

	async function handleShare(): Promise<void> {
		const shareData = {
			pixels,
			username,
			timestamp: Date.now(),
		};

		const url = generateShareUrl(shareData);
		const webShareData = {
			title: 'SpriteBox',
			text: $t.sharePage.shareText,
			url,
		};

		playSound('click');

		// Try Web Share API first (mobile)
		if (navigator.share && navigator.canShare?.(webShareData)) {
			try {
				await navigator.share(webShareData);
				return;
			} catch (err) {
				if ((err as Error).name === 'AbortError') return;
			}
		}

		// Fallback: Copy to clipboard
		try {
			await navigator.clipboard.writeText(url);
			showCopied = true;
			setTimeout(() => {
				showCopied = false;
			}, 2000);
		} catch {
			prompt($t.sharePage.invalidLink, url);
		}
	}
</script>

<button
	class="share-btn size-{size}"
	onclick={handleShare}
	title={$t.accessibility.shareArt}
	aria-label={$t.accessibility.shareArt}
>
	{#if showCopied}
		<span class="copied-indicator">{$t.common.linkCopied}</span>
	{:else}
		<svg class="share-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
			<path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8" />
			<polyline points="16,6 12,2 8,6" />
			<line x1="12" y1="2" x2="12" y2="15" />
		</svg>
	{/if}
</button>

<style>
	.share-btn {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		background: var(--color-bg-tertiary);
		border: 2px solid var(--color-border);
		border-radius: var(--radius-sm);
		color: var(--color-text-secondary);
		cursor: pointer;
		transition: all var(--transition-fast);
	}

	.share-btn:hover {
		background: var(--color-bg-elevated);
		border-color: var(--color-accent);
		color: var(--color-accent);
		transform: translateY(-1px);
	}

	.share-btn:active {
		transform: translateY(0);
	}

	/* Sizes */
	.share-btn.size-sm {
		padding: var(--space-1) var(--space-2);
		min-width: 28px;
		height: 28px;
	}

	.share-btn.size-md {
		padding: var(--space-2) var(--space-3);
		min-width: 36px;
		height: 36px;
	}

	.share-icon {
		width: 16px;
		height: 16px;
	}

	.size-md .share-icon {
		width: 20px;
		height: 20px;
	}

	.copied-indicator {
		font-size: var(--font-size-xs);
		font-weight: var(--font-weight-bold);
		color: var(--color-success);
		white-space: nowrap;
		animation: fadeIn 0.2s ease-out;
	}

	@keyframes fadeIn {
		from {
			opacity: 0;
			transform: scale(0.9);
		}
		to {
			opacity: 1;
			transform: scale(1);
		}
	}
</style>
