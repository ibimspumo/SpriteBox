<!-- ShareCard Organism - Display shared pixel art with metadata -->
<script lang="ts">
	import { t, getLanguage } from '$lib/i18n';
	import { PixelCanvas } from '../utility';
	import { Button } from '../atoms';

	interface Props {
		pixels: string;
		username: string;
		timestamp: number;
	}

	let { pixels, username, timestamp }: Props = $props();

	const formattedDate = $derived(() => {
		const date = new Date(timestamp);
		const lang = getLanguage();
		return date.toLocaleDateString(lang === 'de' ? 'de-DE' : 'en-US', {
			year: 'numeric',
			month: 'short',
			day: 'numeric',
		});
	});
</script>

<div class="share-card">
	<div class="canvas-container">
		<div class="canvas-frame">
			<PixelCanvas pixelData={pixels} size={200} readonly />
		</div>
	</div>

	<div class="metadata">
		<span class="artist-name">
			{$t.sharePage.createdBy} <strong>{username}</strong>
		</span>
		<span class="creation-date">{$t.sharePage.createdOn} {formattedDate()}</span>
	</div>

	<div class="cta-section">
		<p class="challenge-text">{$t.sharePage.canYouDoBetter}</p>
		<a href="/" class="play-link">
			<Button variant="primary" size="lg">
				{$t.sharePage.playNow}
			</Button>
		</a>
	</div>
</div>

<style>
	.share-card {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: var(--space-6);
		padding: var(--space-8);
		background: var(--color-bg-secondary);
		border-radius: var(--radius-lg);
		border: 4px solid var(--color-brand);
		box-shadow: var(--shadow-pixel-lg), 0 0 40px rgba(245, 158, 11, 0.15);
		max-width: 400px;
		width: 100%;
	}

	.canvas-container {
		display: flex;
		justify-content: center;
		align-items: center;
	}

	.canvas-frame {
		padding: var(--space-4);
		background: var(--color-bg-tertiary);
		border-radius: var(--radius-md);
		border: 4px solid var(--color-bg-elevated);
		box-shadow:
			inset 3px 3px 0 rgba(0, 0, 0, 0.3),
			0 0 20px rgba(0, 0, 0, 0.2);
	}

	.metadata {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: var(--space-2);
		text-align: center;
	}

	.artist-name {
		font-size: var(--font-size-lg);
		color: var(--color-text-secondary);
	}

	.artist-name strong {
		color: var(--color-brand-light);
		font-weight: var(--font-weight-bold);
	}

	.creation-date {
		font-size: var(--font-size-sm);
		color: var(--color-text-muted);
	}

	.cta-section {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: var(--space-4);
		padding-top: var(--space-4);
		border-top: 2px solid var(--color-border);
		width: 100%;
	}

	.challenge-text {
		font-size: var(--font-size-xl);
		font-weight: var(--font-weight-bold);
		color: var(--color-accent);
		text-transform: uppercase;
		letter-spacing: 1px;
		margin: 0;
		text-align: center;
		animation: pulse 2s ease-in-out infinite;
	}

	.play-link {
		text-decoration: none;
	}

	@keyframes pulse {
		0%,
		100% {
			opacity: 1;
		}
		50% {
			opacity: 0.7;
		}
	}

	@media (max-width: 480px) {
		.share-card {
			padding: var(--space-5);
		}

		.challenge-text {
			font-size: var(--font-size-lg);
		}
	}
</style>
