<script lang="ts">
	import { t, interpolate, balanceValues } from '$lib/i18n';
	import { formatBigNumber, formatTime } from '$lib/idle-pixel/utils/format';

	interface Props {
		seconds: number;
		earnings: number;
		onContinue: () => void;
	}

	let { seconds, earnings, onContinue }: Props = $props();
</script>

<div class="offline-report">
	<div class="report-header">
		<span class="header-icon">⏰</span>
		<h2 class="header-title">{$t.idlePixel.offline.welcomeBack}</h2>
	</div>

	<div class="report-content">
		<div class="time-away">
			<span class="time-label">{$t.idlePixel.offline.timeAway}</span>
			<span class="time-value">{formatTime(seconds)}</span>
		</div>

		<div class="divider">
			<div class="divider-line"></div>
			<span class="divider-text">{$t.idlePixel.offline.earned}</span>
			<div class="divider-line"></div>
		</div>

		<div class="earnings-display">
			<div class="earnings-icon">
				<div class="icon-pixel"></div>
			</div>
			<span class="earnings-value">+{formatBigNumber(earnings)}</span>
		</div>

		<p class="earnings-note">
			{interpolate($t.idlePixel.offline.efficiencyNote, { value: balanceValues.offlineEfficiencyPercent })}
		</p>
	</div>

	<button class="continue-button" onclick={onContinue}>
		<span class="btn-icon">▶</span>
		{$t.idlePixel.offline.continue}
	</button>

	<!-- Decorative pixels -->
	<div class="deco-pixels">
		<span class="deco-px" style="--delay: 0s; --x: 10%; --y: 20%;">◼</span>
		<span class="deco-px" style="--delay: 0.5s; --x: 85%; --y: 15%;">◼</span>
		<span class="deco-px" style="--delay: 1s; --x: 15%; --y: 80%;">◼</span>
		<span class="deco-px" style="--delay: 1.5s; --x: 90%; --y: 75%;">◼</span>
	</div>
</div>

<style>
	.offline-report {
		flex: 1;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: var(--space-6);
		padding: var(--space-4);
		text-align: center;
		position: relative;
		overflow: hidden;
	}

	.report-header {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: var(--space-2);
		animation: slideDown 0.5s ease;
	}

	@keyframes slideDown {
		from {
			opacity: 0;
			transform: translateY(-20px);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}

	.header-icon {
		font-size: var(--font-size-3xl);
		animation: iconPulse 2s ease-in-out infinite;
	}

	@keyframes iconPulse {
		0%, 100% { transform: scale(1); }
		50% { transform: scale(1.1); }
	}

	.header-title {
		font-family: var(--font-family);
		font-size: var(--font-size-lg);
		color: var(--color-accent);
		margin: 0;
		text-shadow: 0 0 15px var(--color-accent);
	}

	.report-content {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: var(--space-4);
		animation: fadeIn 0.6s ease 0.2s backwards;
	}

	@keyframes fadeIn {
		from { opacity: 0; }
		to { opacity: 1; }
	}

	.time-away {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: var(--space-1);
	}

	.time-label {
		font-family: var(--font-family);
		font-size: var(--font-size-xs);
		color: var(--color-text-muted);
		letter-spacing: 0.1em;
	}

	.time-value {
		font-family: var(--font-family);
		font-size: var(--font-size-xl);
		color: var(--color-text-primary);
	}

	.divider {
		display: flex;
		align-items: center;
		gap: var(--space-3);
		width: 100%;
		max-width: 200px;
	}

	.divider-line {
		flex: 1;
		height: 2px;
		background: linear-gradient(90deg, transparent, var(--color-border-strong), transparent);
	}

	.divider-text {
		font-family: var(--font-family);
		font-size: 10px;
		color: var(--color-text-muted);
		letter-spacing: 0.2em;
	}

	.earnings-display {
		display: flex;
		align-items: center;
		gap: var(--space-3);
		animation: earningsPop 0.5s ease 0.5s backwards;
	}

	@keyframes earningsPop {
		0% {
			opacity: 0;
			transform: scale(0.5);
		}
		60% {
			transform: scale(1.1);
		}
		100% {
			opacity: 1;
			transform: scale(1);
		}
	}

	.earnings-icon {
		width: 32px;
		height: 32px;
		position: relative;
	}

	.icon-pixel {
		width: 100%;
		height: 100%;
		background: linear-gradient(135deg, var(--color-brand) 0%, var(--color-brand-dark) 100%);
		box-shadow:
			inset -3px -3px 0 rgba(0, 0, 0, 0.3),
			inset 3px 3px 0 rgba(255, 255, 255, 0.2),
			0 0 20px var(--color-brand);
		animation: iconBounce 1s ease-in-out infinite;
	}

	@keyframes iconBounce {
		0%, 100% { transform: rotate(0deg); }
		25% { transform: rotate(-5deg); }
		75% { transform: rotate(5deg); }
	}

	.earnings-value {
		font-family: var(--font-family);
		font-size: var(--font-size-2xl);
		color: var(--color-brand);
		text-shadow:
			0 0 15px var(--color-brand),
			3px 3px 0 rgba(0, 0, 0, 0.5);
	}

	.earnings-note {
		font-family: var(--font-family);
		font-size: 9px;
		color: var(--color-text-muted);
		margin: 0;
		opacity: 0.7;
	}

	.continue-button {
		font-family: var(--font-family);
		font-size: var(--font-size-md);
		padding: var(--space-3) var(--space-6);
		background: linear-gradient(180deg, #22c55e 0%, #16a34a 100%);
		color: white;
		border: 4px solid #14532d;
		cursor: pointer;
		box-shadow:
			0 6px 0 #14532d,
			0 0 20px rgba(34, 197, 94, 0.4);
		transition: all 0.15s ease;
		display: flex;
		align-items: center;
		gap: var(--space-3);
		animation: buttonAppear 0.5s ease 0.8s backwards;
	}

	@keyframes buttonAppear {
		from {
			opacity: 0;
			transform: translateY(20px);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}

	.continue-button:hover {
		transform: translateY(-2px);
		box-shadow:
			0 8px 0 #14532d,
			0 0 30px rgba(34, 197, 94, 0.6);
	}

	.continue-button:active {
		transform: translateY(4px);
		box-shadow:
			0 2px 0 #14532d,
			0 0 15px rgba(34, 197, 94, 0.3);
	}

	.btn-icon {
		font-size: 1.2em;
	}

	/* Decorative floating pixels */
	.deco-pixels {
		position: absolute;
		inset: 0;
		pointer-events: none;
		overflow: hidden;
	}

	.deco-px {
		position: absolute;
		left: var(--x);
		top: var(--y);
		font-size: 12px;
		color: var(--color-accent);
		opacity: 0.3;
		text-shadow: 0 0 8px var(--color-accent);
		animation: float 3s ease-in-out infinite;
		animation-delay: var(--delay);
	}

	@keyframes float {
		0%, 100% {
			transform: translateY(0) rotate(0deg);
		}
		50% {
			transform: translateY(-10px) rotate(180deg);
		}
	}
</style>
