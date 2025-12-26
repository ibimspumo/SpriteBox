<!-- DamageNumber.svelte - Floating RPG-style damage/heal numbers -->
<script lang="ts">
	import { onMount } from 'svelte';

	interface Props {
		value: number;
		type?: 'damage' | 'heal' | 'crit' | 'miss';
		onComplete?: () => void;
	}

	let { value, type = 'damage', onComplete }: Props = $props();

	// Random offset for variety (-20 to +20 pixels)
	const offsetX = Math.floor(Math.random() * 40) - 20;
	const offsetY = Math.floor(Math.random() * 20) - 10;

	// Format the display value
	const displayValue = $derived(() => {
		if (type === 'miss') return 'MISS';
		if (type === 'heal') return `+${value}`;
		return `-${value}`;
	});

	onMount(() => {
		// Remove after animation completes
		const timer = setTimeout(() => {
			onComplete?.();
		}, 1800);

		return () => clearTimeout(timer);
	});
</script>

<div
	class="damage-number"
	class:damage={type === 'damage'}
	class:heal={type === 'heal'}
	class:crit={type === 'crit'}
	class:miss={type === 'miss'}
	style:--offset-x="{offsetX}px"
	style:--offset-y="{offsetY}px"
>
	{displayValue()}
</div>

<style>
	.damage-number {
		position: absolute;
		top: 50%;
		left: 50%;
		transform: translate(calc(-50% + var(--offset-x)), calc(-50% + var(--offset-y)));
		font-family: var(--font-family-mono);
		font-size: var(--font-size-2xl);
		font-weight: var(--font-weight-black);
		text-shadow:
			3px 3px 0 var(--color-bg-primary),
			-2px -2px 0 var(--color-bg-primary),
			2px -2px 0 var(--color-bg-primary),
			-2px 2px 0 var(--color-bg-primary),
			0 0 8px rgba(0, 0, 0, 0.8);
		pointer-events: none;
		z-index: 10;
		animation: damage-float 1.8s ease-out forwards;
	}

	.damage-number.damage {
		color: #ff4444;
	}

	.damage-number.heal {
		color: #44ff88;
	}

	.damage-number.crit {
		color: #ffdd00;
		font-size: 2rem;
		animation: crit-float 1.8s ease-out forwards;
		text-shadow:
			0 0 15px var(--color-warning),
			0 0 30px var(--color-warning),
			3px 3px 0 var(--color-bg-primary),
			-2px -2px 0 var(--color-bg-primary);
	}

	.damage-number.miss {
		color: var(--color-text-muted);
		font-size: var(--font-size-lg);
	}

	@keyframes damage-float {
		0% {
			opacity: 1;
			transform: translate(calc(-50% + var(--offset-x)), calc(-50% + var(--offset-y))) scale(0.5);
		}
		10% {
			opacity: 1;
			transform: translate(calc(-50% + var(--offset-x)), calc(-50% + var(--offset-y) - 8px)) scale(1.3);
		}
		25% {
			opacity: 1;
			transform: translate(calc(-50% + var(--offset-x)), calc(-50% + var(--offset-y) - 15px)) scale(1.1);
		}
		60% {
			opacity: 1;
			transform: translate(calc(-50% + var(--offset-x)), calc(-50% + var(--offset-y) - 25px)) scale(1);
		}
		100% {
			opacity: 0;
			transform: translate(calc(-50% + var(--offset-x)), calc(-50% + var(--offset-y) - 45px)) scale(0.9);
		}
	}

	@keyframes crit-float {
		0% {
			opacity: 1;
			transform: translate(calc(-50% + var(--offset-x)), calc(-50% + var(--offset-y))) scale(0.3);
		}
		10% {
			opacity: 1;
			transform: translate(calc(-50% + var(--offset-x)), calc(-50% + var(--offset-y) - 5px)) scale(1.6);
		}
		20% {
			opacity: 1;
			transform: translate(calc(-50% + var(--offset-x)), calc(-50% + var(--offset-y) - 12px)) scale(1.3);
		}
		60% {
			opacity: 1;
			transform: translate(calc(-50% + var(--offset-x)), calc(-50% + var(--offset-y) - 25px)) scale(1.2);
		}
		100% {
			opacity: 0;
			transform: translate(calc(-50% + var(--offset-x)), calc(-50% + var(--offset-y) - 50px)) scale(1);
		}
	}
</style>
