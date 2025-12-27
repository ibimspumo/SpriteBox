<!-- ZombieGridLegend - Legend for the zombie grid showing player types -->
<script lang="ts">
	import { t } from '$lib/i18n';
</script>

<div class="legend">
	<div class="legend-item">
		<span class="legend-color you"></span>
		<span class="legend-label">{$t.common.you}</span>
	</div>
	<div class="legend-item">
		<span class="legend-color survivor"></span>
		<span class="legend-label"
			>{$t.zombiePixel.survivorsRemaining.replace('{count}', '').trim()}</span
		>
	</div>
	<div class="legend-item">
		<span class="legend-color zombie"></span>
		<span class="legend-label">{$t.zombiePixel.zombiesCount.replace('{count}', '').trim()}</span>
	</div>
</div>

<style>
	.legend {
		display: flex;
		gap: var(--space-4);
		padding: var(--space-2) var(--space-4);
		background: var(--color-bg-secondary);
		border-radius: var(--radius-full);
		border: 1px solid var(--color-border);
	}

	.legend-item {
		display: flex;
		align-items: center;
		gap: var(--space-1);
	}

	.legend-color {
		width: 12px;
		height: 12px;
		border-radius: var(--radius-sm);
	}

	.legend-color.you {
		background: #fbbf24;
		box-shadow: 0 0 4px rgba(251, 191, 36, 0.5);
	}

	.legend-color.survivor {
		background: #ffffff;
	}

	.legend-color.zombie {
		background: #22c55e;
		box-shadow: 0 0 4px rgba(34, 197, 94, 0.5);
	}

	.legend-label {
		font-size: var(--font-size-xs);
		color: var(--color-text-secondary);
		text-transform: uppercase;
		letter-spacing: 0.5px;
	}

	/* Mobile adjustments */
	@media (max-width: 480px) {
		.legend {
			gap: var(--space-2);
			padding: var(--space-1) var(--space-3);
		}

		.legend-label {
			font-size: 10px;
		}
	}
</style>
