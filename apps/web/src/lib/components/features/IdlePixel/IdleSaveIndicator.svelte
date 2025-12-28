<!-- IdleSaveIndicator - Shows auto-save status -->
<script lang="ts">
	import { lastSaveTime } from '$lib/idle-pixel';
	import { t } from '$lib/i18n';

	// Calculate time since last save
	let now = $state(Date.now());

	// Update "now" every second for relative time display
	$effect(() => {
		const interval = setInterval(() => {
			now = Date.now();
		}, 1000);
		return () => clearInterval(interval);
	});

	// Format relative time
	function formatRelativeTime(timestamp: number): string {
		if (timestamp === 0) return '';

		const seconds = Math.floor((now - timestamp) / 1000);

		if (seconds < 5) return $t.idlePixel.save.justNow;
		if (seconds < 60) return `${seconds}s`;
		if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
		return `${Math.floor(seconds / 3600)}h`;
	}

	const relativeTime = $derived(formatRelativeTime($lastSaveTime));
	const isRecent = $derived($lastSaveTime > 0 && (now - $lastSaveTime) < 5000);
</script>

{#if $lastSaveTime > 0}
	<div class="save-indicator" class:recent={isRecent}>
		<span class="save-icon" class:pulse={isRecent}>
			{isRecent ? '✓' : '💾'}
		</span>
		<span class="save-text">
			{#if isRecent}
				{$t.idlePixel.save.saved}
			{:else}
				{relativeTime}
			{/if}
		</span>
	</div>
{/if}

<style>
	.save-indicator {
		display: flex;
		align-items: center;
		gap: 4px;
		font-size: 9px;
		color: var(--color-text-muted);
		padding: 2px 6px;
		background: rgba(0, 0, 0, 0.3);
		border: 1px solid rgba(255, 255, 255, 0.1);
		transition: all 0.3s ease;
	}

	.save-indicator.recent {
		color: var(--color-success);
		border-color: rgba(34, 197, 94, 0.3);
		background: rgba(34, 197, 94, 0.1);
	}

	.save-icon {
		font-size: 10px;
		opacity: 0.7;
	}

	.save-icon.pulse {
		opacity: 1;
		animation: savePulse 0.5s ease;
	}

	@keyframes savePulse {
		0% { transform: scale(1.3); }
		50% { transform: scale(0.9); }
		100% { transform: scale(1); }
	}

	.save-text {
		letter-spacing: 0.05em;
		text-transform: uppercase;
	}
</style>
