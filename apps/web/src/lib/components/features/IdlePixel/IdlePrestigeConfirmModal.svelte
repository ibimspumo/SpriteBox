<script lang="ts">
	import { t } from '$lib/i18n';
	import { prestigeInfo } from '$lib/idle-pixel';

	interface Props {
		show: boolean;
		onConfirm: () => void;
		onCancel: () => void;
	}

	let { show, onConfirm, onCancel }: Props = $props();

	// Prestige info
	const prismaGain = $derived($prestigeInfo.prismaGain);
	const currentPrisma = $derived($prestigeInfo.prismaPixels);

	// Animation state
	let confirmHover = $state(false);

	function handleKeydown(event: KeyboardEvent) {
		if (event.key === 'Escape') {
			onCancel();
		} else if (event.key === 'Enter') {
			onConfirm();
		}
	}

	function handleBackdropClick(event: MouseEvent) {
		if (event.target === event.currentTarget) {
			onCancel();
		}
	}
</script>

{#if show}
	<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
	<div
		class="modal-backdrop"
		role="dialog"
		aria-modal="true"
		aria-labelledby="prestige-title"
		tabindex="-1"
		onclick={handleBackdropClick}
		onkeydown={handleKeydown}
	>
		<div class="modal-container">
			<!-- Prismatic border animation -->
			<div class="modal-border"></div>

			<!-- Modal content -->
			<div class="modal-content">
				<!-- Header -->
				<div class="modal-header">
					<div class="header-icon">
						<span class="icon-inner">💎</span>
						<div class="icon-rings"></div>
					</div>
					<h2 id="prestige-title" class="header-title">
						{$t.idlePixel.prestige.confirmTitle}
					</h2>
				</div>

				<!-- Body -->
				<div class="modal-body">
					<p class="confirm-text">{$t.idlePixel.prestige.confirmText}</p>

					<!-- Prisma gain preview -->
					<div class="gain-preview">
						<div class="gain-label">{$t.idlePixel.prestige.confirmGain}</div>
						<div class="gain-display">
							<span class="gain-icon">💎</span>
							<span class="gain-value">+{prismaGain}</span>
						</div>
						<div class="gain-total">
							<span class="total-label">Total:</span>
							<span class="total-value">{currentPrisma} → {currentPrisma + prismaGain}</span>
						</div>
					</div>

					<!-- Warning -->
					<div class="warning-box">
						<span class="warning-icon">⚠️</span>
						<p class="warning-text">{$t.idlePixel.prestige.confirmWarning}</p>
					</div>
				</div>

				<!-- Footer -->
				<div class="modal-footer">
					<button
						class="btn-cancel"
						onclick={onCancel}
						aria-label={$t.idlePixel.prestige.cancel}
					>
						{$t.idlePixel.prestige.cancel}
					</button>
					<button
						class="btn-confirm"
						onclick={onConfirm}
						onmouseenter={() => confirmHover = true}
						onmouseleave={() => confirmHover = false}
						aria-label={$t.idlePixel.prestige.confirm}
					>
						<span class="confirm-icon">✨</span>
						<span class="confirm-text">{$t.idlePixel.prestige.confirm}</span>
						{#if confirmHover}
							<div class="confirm-sparkles">
								<span class="sparkle s1">✦</span>
								<span class="sparkle s2">✦</span>
								<span class="sparkle s3">✦</span>
							</div>
						{/if}
					</button>
				</div>
			</div>

			<!-- Corner decorations -->
			<div class="corner tl"></div>
			<div class="corner tr"></div>
			<div class="corner bl"></div>
			<div class="corner br"></div>
		</div>
	</div>
{/if}

<style>
	.modal-backdrop {
		position: fixed;
		inset: 0;
		background: rgba(0, 0, 0, 0.85);
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 1000;
		padding: var(--space-4);
		animation: backdropFadeIn 0.2s ease;
	}

	@keyframes backdropFadeIn {
		from { opacity: 0; }
		to { opacity: 1; }
	}

	.modal-container {
		position: relative;
		width: 100%;
		max-width: 380px;
		background: linear-gradient(180deg, #1a0a2e 0%, #0f0f1a 100%);
		border: 4px solid #581c87;
		box-shadow:
			0 0 0 2px #1a0a2e,
			0 0 60px rgba(139, 92, 246, 0.4),
			inset 0 0 40px rgba(0, 0, 0, 0.5);
		animation: modalSlideIn 0.3s ease;
	}

	@keyframes modalSlideIn {
		from {
			opacity: 0;
			transform: scale(0.9) translateY(20px);
		}
		to {
			opacity: 1;
			transform: scale(1) translateY(0);
		}
	}

	/* Prismatic border animation */
	.modal-border {
		position: absolute;
		inset: -4px;
		background: linear-gradient(45deg, #8b5cf6, #ec4899, #f59e0b, #10b981, #8b5cf6);
		background-size: 400% 400%;
		animation: borderGlow 4s linear infinite;
		z-index: -1;
	}

	@keyframes borderGlow {
		0% { background-position: 0% 50%; }
		50% { background-position: 100% 50%; }
		100% { background-position: 0% 50%; }
	}

	.modal-content {
		position: relative;
		z-index: 1;
	}

	/* Corner decorations */
	.corner {
		position: absolute;
		width: 12px;
		height: 12px;
		z-index: 10;
	}

	.corner::before,
	.corner::after {
		content: '';
		position: absolute;
		background: linear-gradient(135deg, #8b5cf6, #ec4899);
	}

	.corner.tl { top: -2px; left: -2px; }
	.corner.tl::before { width: 12px; height: 4px; top: 0; left: 0; }
	.corner.tl::after { width: 4px; height: 12px; top: 0; left: 0; }

	.corner.tr { top: -2px; right: -2px; }
	.corner.tr::before { width: 12px; height: 4px; top: 0; right: 0; }
	.corner.tr::after { width: 4px; height: 12px; top: 0; right: 0; }

	.corner.bl { bottom: -2px; left: -2px; }
	.corner.bl::before { width: 12px; height: 4px; bottom: 0; left: 0; }
	.corner.bl::after { width: 4px; height: 12px; bottom: 0; left: 0; }

	.corner.br { bottom: -2px; right: -2px; }
	.corner.br::before { width: 12px; height: 4px; bottom: 0; right: 0; }
	.corner.br::after { width: 4px; height: 12px; bottom: 0; right: 0; }

	/* Header */
	.modal-header {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: var(--space-3);
		padding: var(--space-4);
		background: linear-gradient(180deg, rgba(139, 92, 246, 0.2) 0%, transparent 100%);
		border-bottom: 2px solid rgba(139, 92, 246, 0.3);
	}

	.header-icon {
		position: relative;
		font-size: 40px;
	}

	.icon-inner {
		position: relative;
		z-index: 2;
		animation: iconFloat 2s ease-in-out infinite;
	}

	@keyframes iconFloat {
		0%, 100% { transform: translateY(0); }
		50% { transform: translateY(-6px); }
	}

	.icon-rings {
		position: absolute;
		inset: -10px;
		border: 2px solid rgba(139, 92, 246, 0.5);
		border-radius: 50%;
		animation: ringPulse 1.5s ease-out infinite;
	}

	.icon-rings::before {
		content: '';
		position: absolute;
		inset: -8px;
		border: 2px solid rgba(236, 72, 153, 0.4);
		border-radius: 50%;
		animation: ringPulse 1.5s ease-out infinite 0.3s;
	}

	@keyframes ringPulse {
		0% {
			transform: scale(0.8);
			opacity: 1;
		}
		100% {
			transform: scale(1.5);
			opacity: 0;
		}
	}

	.header-title {
		font-family: var(--font-family);
		font-size: var(--font-size-lg);
		margin: 0;
		background: linear-gradient(90deg, #8b5cf6, #ec4899, #8b5cf6);
		background-size: 200% 100%;
		-webkit-background-clip: text;
		-webkit-text-fill-color: transparent;
		background-clip: text;
		animation: titleGradient 3s linear infinite;
		text-align: center;
		letter-spacing: 0.1em;
	}

	@keyframes titleGradient {
		0% { background-position: 0% 50%; }
		100% { background-position: 200% 50%; }
	}

	/* Body */
	.modal-body {
		padding: var(--space-4);
		display: flex;
		flex-direction: column;
		gap: var(--space-4);
	}

	.confirm-text {
		font-family: var(--font-family);
		font-size: var(--font-size-sm);
		color: var(--color-text-secondary);
		text-align: center;
		margin: 0;
		line-height: 1.5;
	}

	/* Gain Preview */
	.gain-preview {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: var(--space-2);
		padding: var(--space-4);
		background: linear-gradient(135deg, rgba(139, 92, 246, 0.15) 0%, rgba(236, 72, 153, 0.15) 100%);
		border: 2px solid rgba(139, 92, 246, 0.4);
		position: relative;
		overflow: hidden;
	}

	.gain-preview::before {
		content: '';
		position: absolute;
		inset: 0;
		background: linear-gradient(
			45deg,
			transparent 30%,
			rgba(255, 255, 255, 0.1) 50%,
			transparent 70%
		);
		animation: gainShimmer 2s ease-in-out infinite;
	}

	@keyframes gainShimmer {
		0% { transform: translateX(-100%); }
		100% { transform: translateX(100%); }
	}

	.gain-label {
		font-family: var(--font-family);
		font-size: 10px;
		color: var(--color-text-muted);
		letter-spacing: 0.15em;
		text-transform: uppercase;
	}

	.gain-display {
		display: flex;
		align-items: center;
		gap: var(--space-2);
	}

	.gain-icon {
		font-size: var(--font-size-2xl);
		animation: gainPulse 1s ease-in-out infinite;
	}

	@keyframes gainPulse {
		0%, 100% {
			transform: scale(1);
			filter: drop-shadow(0 0 8px rgba(139, 92, 246, 0.8));
		}
		50% {
			transform: scale(1.15);
			filter: drop-shadow(0 0 16px rgba(236, 72, 153, 1));
		}
	}

	.gain-value {
		font-family: var(--font-family);
		font-size: var(--font-size-2xl);
		font-weight: bold;
		background: linear-gradient(90deg, #fde047, #f59e0b, #fde047);
		background-size: 200% 100%;
		-webkit-background-clip: text;
		-webkit-text-fill-color: transparent;
		background-clip: text;
		animation: valueGlow 2s linear infinite;
		text-shadow: 0 0 30px rgba(253, 224, 71, 0.5);
	}

	@keyframes valueGlow {
		0% { background-position: 0% 50%; }
		100% { background-position: 200% 50%; }
	}

	.gain-total {
		display: flex;
		gap: var(--space-2);
		font-family: var(--font-family);
		font-size: var(--font-size-xs);
	}

	.total-label {
		color: var(--color-text-muted);
	}

	.total-value {
		color: #c084fc;
	}

	/* Warning */
	.warning-box {
		display: flex;
		align-items: flex-start;
		gap: var(--space-2);
		padding: var(--space-3);
		background: rgba(234, 88, 12, 0.1);
		border: 1px solid rgba(234, 88, 12, 0.4);
	}

	.warning-icon {
		font-size: var(--font-size-md);
		flex-shrink: 0;
	}

	.warning-text {
		font-family: var(--font-family);
		font-size: 10px;
		color: #fb923c;
		margin: 0;
		line-height: 1.4;
	}

	/* Footer */
	.modal-footer {
		display: flex;
		gap: var(--space-3);
		padding: var(--space-4);
		border-top: 2px solid rgba(139, 92, 246, 0.2);
	}

	.btn-cancel,
	.btn-confirm {
		flex: 1;
		font-family: var(--font-family);
		font-size: var(--font-size-sm);
		padding: var(--space-3);
		cursor: pointer;
		transition: all 0.15s ease;
		letter-spacing: 0.05em;
	}

	.btn-cancel {
		background: rgba(0, 0, 0, 0.4);
		border: 2px solid var(--color-border);
		color: var(--color-text-secondary);
	}

	.btn-cancel:hover {
		background: rgba(78, 205, 196, 0.1);
		border-color: var(--color-accent);
		color: var(--color-text-primary);
	}

	.btn-cancel:focus-visible {
		outline: 2px solid var(--color-accent);
		outline-offset: 2px;
	}

	.btn-confirm {
		position: relative;
		background: linear-gradient(135deg, #7c3aed 0%, #db2777 100%);
		border: 3px solid #581c87;
		color: white;
		display: flex;
		align-items: center;
		justify-content: center;
		gap: var(--space-2);
		box-shadow:
			0 4px 0 #581c87,
			0 0 20px rgba(139, 92, 246, 0.3);
		overflow: hidden;
	}

	.btn-confirm:hover {
		transform: translateY(-2px);
		box-shadow:
			0 6px 0 #581c87,
			0 0 30px rgba(139, 92, 246, 0.5);
	}

	.btn-confirm:active {
		transform: translateY(2px);
		box-shadow:
			0 2px 0 #581c87,
			0 0 15px rgba(139, 92, 246, 0.3);
	}

	.btn-confirm:focus-visible {
		outline: 2px solid #ec4899;
		outline-offset: 2px;
	}

	.confirm-icon {
		font-size: var(--font-size-md);
	}

	.confirm-sparkles {
		position: absolute;
		inset: 0;
		pointer-events: none;
	}

	.sparkle {
		position: absolute;
		font-size: 10px;
		color: #fde047;
		animation: sparkleFloat 0.6s ease-out forwards;
	}

	.sparkle.s1 { top: 20%; left: 10%; animation-delay: 0s; }
	.sparkle.s2 { top: 40%; right: 15%; animation-delay: 0.1s; }
	.sparkle.s3 { bottom: 20%; left: 25%; animation-delay: 0.2s; }

	@keyframes sparkleFloat {
		0% {
			opacity: 1;
			transform: translateY(0) scale(1);
		}
		100% {
			opacity: 0;
			transform: translateY(-20px) scale(0.5);
		}
	}

	/* Mobile responsive */
	@media (max-width: 400px) {
		.modal-container {
			margin: var(--space-2);
		}

		.modal-header,
		.modal-body,
		.modal-footer {
			padding: var(--space-3);
		}

		.header-title {
			font-size: var(--font-size-md);
		}
	}
</style>
