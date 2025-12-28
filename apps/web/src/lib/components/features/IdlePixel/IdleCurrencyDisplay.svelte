<script lang="ts">
	import { spring } from 'svelte/motion';
	import { formatBigNumber, formatRate as formatRateUtil } from '$lib/idle-pixel/utils/format';

	interface Props {
		value: number;
		perSecond: number;
	}

	let { value, perSecond }: Props = $props();

	// Smooth animated value for rolling counter effect
	const animatedValue = spring(0, {
		stiffness: 0.15,
		damping: 0.8
	});

	// Update spring when value changes
	$effect(() => {
		animatedValue.set(value);
	});

	// Calculate digits for animated counter
	const displayValue = $derived(formatBigNumber($animatedValue));

	// Format rate without /s suffix (we add it manually in template)
	function formatRateValue(rate: number): string {
		return formatBigNumber(rate);
	}
</script>

<div class="currency-display">
	<!-- Currency icon -->
	<div class="currency-icon">
		<div class="icon-pixel"></div>
		<div class="icon-glow"></div>
	</div>

	<!-- Main value -->
	<div class="currency-value">
		<span class="value-digits">
			{#each displayValue.split('') as char, i (i)}
				<span
					class="digit"
					class:suffix={isNaN(parseInt(char)) && char !== '.'}
					style="--digit-index: {i};"
				>
					{char}
				</span>
			{/each}
		</span>
	</div>

	<!-- Production rate -->
	<div class="production-rate">
		<span class="rate-prefix">+</span>
		<span class="rate-value">{formatRateValue(perSecond)}</span>
		<span class="rate-suffix">/s</span>
	</div>

	<!-- Decorative bar -->
	<div class="currency-bar">
		<div class="bar-fill" style="--fill-percent: {Math.min(perSecond / 100, 1) * 100}%;"></div>
		<div class="bar-glow"></div>
	</div>
</div>

<style>
	.currency-display {
		background: linear-gradient(180deg, rgba(0, 0, 0, 0.6) 0%, rgba(0, 0, 0, 0.4) 100%);
		border: 2px solid var(--color-border-strong);
		padding: var(--space-3);
		display: flex;
		align-items: center;
		gap: var(--space-3);
		position: relative;
		overflow: hidden;
	}

	.currency-display::before {
		content: '';
		position: absolute;
		inset: 0;
		background: linear-gradient(90deg, transparent 0%, rgba(245, 166, 35, 0.05) 50%, transparent 100%);
		pointer-events: none;
	}

	.currency-icon {
		position: relative;
		width: 28px;
		height: 28px;
		flex-shrink: 0;
	}

	.icon-pixel {
		width: 100%;
		height: 100%;
		background: linear-gradient(135deg, var(--color-brand) 0%, var(--color-brand-dark) 100%);
		box-shadow:
			inset -3px -3px 0 rgba(0, 0, 0, 0.3),
			inset 3px 3px 0 rgba(255, 255, 255, 0.2);
		animation: iconBounce 2s ease-in-out infinite;
	}

	@keyframes iconBounce {
		0%, 100% { transform: translateY(0) rotate(0deg); }
		25% { transform: translateY(-2px) rotate(-2deg); }
		75% { transform: translateY(-2px) rotate(2deg); }
	}

	.icon-glow {
		position: absolute;
		inset: -4px;
		background: var(--color-brand);
		opacity: 0.4;
		filter: blur(8px);
		z-index: -1;
		animation: glowPulse 1.5s ease-in-out infinite;
	}

	@keyframes glowPulse {
		0%, 100% { opacity: 0.3; }
		50% { opacity: 0.5; }
	}

	.currency-value {
		flex: 1;
		min-width: 0;
	}

	.value-digits {
		font-family: var(--font-family);
		font-size: var(--font-size-xl);
		color: var(--color-brand);
		text-shadow:
			0 0 10px var(--color-brand),
			2px 2px 0 rgba(0, 0, 0, 0.5);
		display: flex;
		align-items: baseline;
	}

	.digit {
		display: inline-block;
		animation: digitPop 0.2s ease;
		animation-delay: calc(var(--digit-index) * 0.02s);
	}

	.digit.suffix {
		font-size: 0.7em;
		color: var(--color-brand-light);
		margin-left: 2px;
	}

	@keyframes digitPop {
		0% { transform: scale(1.2); }
		100% { transform: scale(1); }
	}

	.production-rate {
		font-family: var(--font-family);
		font-size: var(--font-size-xs);
		color: var(--color-success);
		display: flex;
		align-items: baseline;
		gap: 2px;
		text-shadow: 0 0 8px var(--color-success);
		animation: rateGlow 2s ease-in-out infinite;
	}

	@keyframes rateGlow {
		0%, 100% { opacity: 0.8; }
		50% { opacity: 1; }
	}

	.rate-prefix {
		font-size: 1.2em;
	}

	.rate-value {
		font-size: 1.1em;
	}

	.rate-suffix {
		font-size: 0.9em;
		opacity: 0.7;
	}

	.currency-bar {
		position: absolute;
		bottom: 0;
		left: 0;
		right: 0;
		height: 3px;
		background: rgba(0, 0, 0, 0.5);
		overflow: hidden;
	}

	.bar-fill {
		height: 100%;
		width: var(--fill-percent, 0%);
		background: linear-gradient(90deg, var(--color-brand-dark) 0%, var(--color-brand) 100%);
		transition: width 0.5s ease;
	}

	.bar-glow {
		position: absolute;
		top: -2px;
		left: 0;
		width: var(--fill-percent, 0%);
		height: 4px;
		background: var(--color-brand);
		filter: blur(4px);
		opacity: 0.6;
	}
</style>
