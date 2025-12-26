<!-- ZombieGrid - Canvas-based 50x50 grid renderer with player-centered camera -->
<script lang="ts">
	import { onMount } from 'svelte';
	import { t } from '$lib/i18n';
	import type { ZombiePixelPlayerClient } from '$lib/stores';

	interface Props {
		players: ZombiePixelPlayerClient[];
		myId: string | null;
		yourRole: 'zombie' | 'survivor' | null;
	}

	let { players, myId, yourRole }: Props = $props();

	let canvas: HTMLCanvasElement;
	let ctx: CanvasRenderingContext2D | null = $state(null);
	let containerRef: HTMLDivElement;
	let canvasSize = $state(320);

	const GRID_SIZE = 50;
	const VIEWPORT_SIZE = 13; // 13x13 visible area centered on player

	const COLORS = {
		background: '#0a0a0a',
		survivor: '#ffffff',
		zombie: '#22c55e',
		myPlayer: '#fbbf24',
		grid: '#1a1a1a',
		fog: '#050505'
	};

	// Calculate cell size based on canvas size and viewport
	let cellSize = $derived(canvasSize / VIEWPORT_SIZE);

	// Find my player's position for camera centering
	let myPlayer = $derived(players.find((p) => p.id === myId));

	// Calculate camera offset (center on player)
	let cameraX = $derived(() => {
		if (!myPlayer) return Math.floor((GRID_SIZE - VIEWPORT_SIZE) / 2);
		// Center player in viewport
		const targetX = myPlayer.x - Math.floor(VIEWPORT_SIZE / 2);
		// Clamp to grid bounds
		return Math.max(0, Math.min(GRID_SIZE - VIEWPORT_SIZE, targetX));
	});

	let cameraY = $derived(() => {
		if (!myPlayer) return Math.floor((GRID_SIZE - VIEWPORT_SIZE) / 2);
		const targetY = myPlayer.y - Math.floor(VIEWPORT_SIZE / 2);
		return Math.max(0, Math.min(GRID_SIZE - VIEWPORT_SIZE, targetY));
	});

	onMount(() => {
		ctx = canvas.getContext('2d');

		// Calculate initial size based on container
		const updateSize = (): void => {
			if (containerRef) {
				const containerWidth = containerRef.clientWidth;
				const containerHeight = containerRef.clientHeight;
				const size = Math.min(containerWidth, containerHeight, 512);
				// Round to nearest multiple of VIEWPORT_SIZE for crisp pixels
				canvasSize = Math.floor(size / VIEWPORT_SIZE) * VIEWPORT_SIZE;
			}
		};

		updateSize();

		const resizeObserver = new ResizeObserver(() => {
			updateSize();
		});

		resizeObserver.observe(containerRef);

		return () => {
			resizeObserver.disconnect();
		};
	});

	// Re-render when players or canvas size changes
	$effect(() => {
		if (ctx && players) {
			render();
		}
	});

	function render(): void {
		if (!ctx) return;

		const size = canvasSize;
		const camX = cameraX();
		const camY = cameraY();

		// Clear canvas
		ctx.fillStyle = COLORS.background;
		ctx.fillRect(0, 0, size, size);

		// Draw grid lines within viewport
		ctx.strokeStyle = COLORS.grid;
		ctx.lineWidth = 1;
		for (let i = 0; i <= VIEWPORT_SIZE; i++) {
			ctx.beginPath();
			ctx.moveTo(i * cellSize, 0);
			ctx.lineTo(i * cellSize, size);
			ctx.stroke();
			ctx.beginPath();
			ctx.moveTo(0, i * cellSize);
			ctx.lineTo(size, i * cellSize);
			ctx.stroke();
		}

		// Draw world boundary indicators (fog at edges)
		ctx.fillStyle = COLORS.fog;
		for (let vx = 0; vx < VIEWPORT_SIZE; vx++) {
			for (let vy = 0; vy < VIEWPORT_SIZE; vy++) {
				const worldX = camX + vx;
				const worldY = camY + vy;
				// If outside grid, draw fog
				if (worldX < 0 || worldX >= GRID_SIZE || worldY < 0 || worldY >= GRID_SIZE) {
					ctx.fillRect(vx * cellSize, vy * cellSize, cellSize, cellSize);
				}
			}
		}

		// Draw players (only those in viewport)
		for (const player of players) {
			// Calculate screen position
			const screenX = player.x - camX;
			const screenY = player.y - camY;

			// Skip if outside viewport
			if (screenX < 0 || screenX >= VIEWPORT_SIZE || screenY < 0 || screenY >= VIEWPORT_SIZE) {
				continue;
			}

			const isMe = player.id === myId;
			let color: string;

			if (isMe) {
				color = COLORS.myPlayer;
			} else if (player.isZombie) {
				color = COLORS.zombie;
			} else {
				color = COLORS.survivor;
			}

			// Draw player cell
			const padding = 2;
			ctx.fillStyle = color;
			ctx.fillRect(
				screenX * cellSize + padding,
				screenY * cellSize + padding,
				cellSize - padding * 2,
				cellSize - padding * 2
			);

			// Highlight current player with pulsing border
			if (isMe) {
				ctx.strokeStyle = '#ffffff';
				ctx.lineWidth = 3;
				ctx.strokeRect(
					screenX * cellSize + 1,
					screenY * cellSize + 1,
					cellSize - 2,
					cellSize - 2
				);
			}

			// Draw zombie glow effect
			if (player.isZombie && !isMe) {
				ctx.shadowColor = COLORS.zombie;
				ctx.shadowBlur = 10;
				ctx.fillStyle = COLORS.zombie;
				ctx.fillRect(
					screenX * cellSize + padding,
					screenY * cellSize + padding,
					cellSize - padding * 2,
					cellSize - padding * 2
				);
				ctx.shadowBlur = 0;
			}
		}

		// Draw minimap in corner
		drawMinimap(ctx, camX, camY);
	}

	function drawMinimap(ctx: CanvasRenderingContext2D, camX: number, camY: number): void {
		const minimapSize = 60;
		const minimapCellSize = minimapSize / GRID_SIZE;
		const minimapX = canvasSize - minimapSize - 8;
		const minimapY = 8;

		// Minimap background
		ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
		ctx.fillRect(minimapX - 2, minimapY - 2, minimapSize + 4, minimapSize + 4);

		ctx.fillStyle = COLORS.background;
		ctx.fillRect(minimapX, minimapY, minimapSize, minimapSize);

		// Draw all players on minimap
		for (const player of players) {
			const isMe = player.id === myId;

			if (isMe) {
				ctx.fillStyle = COLORS.myPlayer;
			} else if (player.isZombie) {
				ctx.fillStyle = COLORS.zombie;
			} else {
				ctx.fillStyle = COLORS.survivor;
			}

			ctx.fillRect(
				minimapX + player.x * minimapCellSize,
				minimapY + player.y * minimapCellSize,
				Math.max(2, minimapCellSize),
				Math.max(2, minimapCellSize)
			);
		}

		// Draw viewport rectangle
		ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
		ctx.lineWidth = 1;
		ctx.strokeRect(
			minimapX + camX * minimapCellSize,
			minimapY + camY * minimapCellSize,
			VIEWPORT_SIZE * minimapCellSize,
			VIEWPORT_SIZE * minimapCellSize
		);
	}
</script>

<div class="grid-wrapper" bind:this={containerRef}>
	<canvas
		bind:this={canvas}
		width={canvasSize}
		height={canvasSize}
		class="zombie-grid"
		aria-label={$t.zombiePixel.survivorsRemaining.replace(
			'{count}',
			String(players.filter((p) => !p.isZombie).length)
		)}
	></canvas>

	<!-- Legend -->
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
</div>

<style>
	.grid-wrapper {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: var(--space-3);
		width: 100%;
		height: 100%;
	}

	.zombie-grid {
		border: 3px solid var(--color-border-strong);
		border-radius: var(--radius-md);
		image-rendering: pixelated;
		image-rendering: crisp-edges;
		max-width: 100%;
		height: auto;
		box-shadow:
			var(--shadow-pixel-lg),
			0 0 30px rgba(34, 197, 94, 0.2);
	}

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
