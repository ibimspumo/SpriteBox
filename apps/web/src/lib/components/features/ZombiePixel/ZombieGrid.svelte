<!-- ZombieGrid - Smooth canvas-based grid with interpolation and camera smoothing -->
<script lang="ts">
	import { onMount } from 'svelte';
	import { t } from '$lib/i18n';
	import type { ZombiePixelPlayerClient, ZombieItemClient } from '$lib/stores';

	interface Props {
		players: ZombiePixelPlayerClient[];
		myId: string | null;
		yourRole: 'zombie' | 'survivor' | null;
		lastInfection?: { victimName: string; zombieName: string } | null;
		items?: ZombieItemClient[];
		zombieSpeedBoostActive?: boolean;
		zombieSpeedBoostRemaining?: number;
		playersWithHealingTouch?: string[];
	}

	let {
		players,
		myId,
		yourRole,
		lastInfection,
		items = [],
		zombieSpeedBoostActive = false,
		zombieSpeedBoostRemaining = 0,
		playersWithHealingTouch = []
	}: Props = $props();

	let canvas: HTMLCanvasElement;
	let ctx: CanvasRenderingContext2D | null = $state(null);
	let containerRef: HTMLDivElement;
	let canvasSize = $state(320);

	const GRID_SIZE = 32;
	const VIEWPORT_SIZE = 13;

	const COLORS = {
		background: '#0a0a0a',
		survivor: '#ffffff',
		zombie: '#22c55e',
		myPlayer: '#fbbf24',
		grid: '#1a1a1a',
		fog: '#050505',
		healingItem: '#ef4444',
		speedBoostItem: '#fbbf24',
		healingPlayer: '#ef4444'
	};

	// Animation settings
	const LERP_SPEED = 0.2; // Position interpolation speed (0-1)
	const CAMERA_LERP_SPEED = 0.08; // Camera follows slower for smoothness
	const CAMERA_DEAD_ZONE = 1.5; // Tiles before camera starts following
	const BOUNCE_AMPLITUDE = 0.08; // Bounce scale amount
	const GLOW_PULSE_SPEED = 2; // Glow pulse frequency

	// Interpolation state - tracks visual positions separate from server positions
	interface InterpolatedPlayer {
		id: string;
		visualX: number;
		visualY: number;
		targetX: number;
		targetY: number;
		isZombie: boolean;
		isBot: boolean;
		bouncePhase: number;
	}

	let interpolatedPlayers: Map<string, InterpolatedPlayer> = new Map();
	let smoothCameraX = $state(GRID_SIZE / 2 - VIEWPORT_SIZE / 2);
	let smoothCameraY = $state(GRID_SIZE / 2 - VIEWPORT_SIZE / 2);
	let targetCameraX = $state(GRID_SIZE / 2 - VIEWPORT_SIZE / 2);
	let targetCameraY = $state(GRID_SIZE / 2 - VIEWPORT_SIZE / 2);

	// Screen shake for infection effect
	let shakeIntensity = $state(0);
	let shakeOffsetX = $state(0);
	let shakeOffsetY = $state(0);

	// Animation frame tracking
	let animationFrame: number;
	let lastTime = 0;
	let glowPhase = 0;

	let cellSize = $derived(canvasSize / VIEWPORT_SIZE);
	let myPlayer = $derived(players.find((p) => p.id === myId));

	// Trigger screen shake on infection
	$effect(() => {
		if (lastInfection) {
			shakeIntensity = 8;
		}
	});

	// Update interpolated players when server data changes
	$effect(() => {
		for (const player of players) {
			const existing = interpolatedPlayers.get(player.id);

			if (existing) {
				// Check if position changed
				if (existing.targetX !== player.x || existing.targetY !== player.y) {
					existing.targetX = player.x;
					existing.targetY = player.y;
					existing.bouncePhase = 0;
				}
				existing.isZombie = player.isZombie;
			} else {
				// New player - start at target position
				interpolatedPlayers.set(player.id, {
					id: player.id,
					visualX: player.x,
					visualY: player.y,
					targetX: player.x,
					targetY: player.y,
					isZombie: player.isZombie,
					isBot: player.isBot,
					bouncePhase: Math.PI // Start at rest
				});
			}
		}

		// Remove disconnected players
		const currentIds = new Set(players.map((p) => p.id));
		for (const id of interpolatedPlayers.keys()) {
			if (!currentIds.has(id)) {
				interpolatedPlayers.delete(id);
			}
		}
	});

	// Update camera target based on my player position
	$effect(() => {
		if (myPlayer) {
			const rawTargetX = myPlayer.x - Math.floor(VIEWPORT_SIZE / 2);
			const rawTargetY = myPlayer.y - Math.floor(VIEWPORT_SIZE / 2);

			// Clamp to grid bounds
			targetCameraX = Math.max(0, Math.min(GRID_SIZE - VIEWPORT_SIZE, rawTargetX));
			targetCameraY = Math.max(0, Math.min(GRID_SIZE - VIEWPORT_SIZE, rawTargetY));
		}
	});

	onMount(() => {
		ctx = canvas.getContext('2d');

		const updateSize = (): void => {
			if (containerRef) {
				const containerWidth = containerRef.clientWidth;
				const containerHeight = containerRef.clientHeight;
				const size = Math.min(containerWidth, containerHeight, 512);
				canvasSize = Math.floor(size / VIEWPORT_SIZE) * VIEWPORT_SIZE;
			}
		};

		updateSize();

		const resizeObserver = new ResizeObserver(updateSize);
		resizeObserver.observe(containerRef);

		// Start animation loop
		lastTime = performance.now();
		animationFrame = requestAnimationFrame(gameLoop);

		return () => {
			resizeObserver.disconnect();
			cancelAnimationFrame(animationFrame);
		};
	});

	function lerp(a: number, b: number, t: number): number {
		return a + (b - a) * t;
	}

	function gameLoop(currentTime: number): void {
		const deltaTime = Math.min((currentTime - lastTime) / 16.67, 2); // Normalize to ~60fps, cap at 2x
		lastTime = currentTime;

		// Update glow phase
		glowPhase += deltaTime * 0.1 * GLOW_PULSE_SPEED;

		// Update screen shake
		if (shakeIntensity > 0.1) {
			shakeOffsetX = (Math.random() - 0.5) * shakeIntensity * 2;
			shakeOffsetY = (Math.random() - 0.5) * shakeIntensity * 2;
			shakeIntensity *= 0.85; // Decay
		} else {
			shakeIntensity = 0;
			shakeOffsetX = 0;
			shakeOffsetY = 0;
		}

		// Update camera with dead zone
		const cameraDiffX = targetCameraX - smoothCameraX;
		const cameraDiffY = targetCameraY - smoothCameraY;
		const cameraDistance = Math.sqrt(cameraDiffX * cameraDiffX + cameraDiffY * cameraDiffY);

		if (cameraDistance > CAMERA_DEAD_ZONE) {
			// Only move camera when outside dead zone
			const cameraLerp = CAMERA_LERP_SPEED * deltaTime;
			smoothCameraX = lerp(smoothCameraX, targetCameraX, cameraLerp);
			smoothCameraY = lerp(smoothCameraY, targetCameraY, cameraLerp);
		} else if (cameraDistance > 0.01) {
			// Very slow movement inside dead zone
			const slowLerp = 0.02 * deltaTime;
			smoothCameraX = lerp(smoothCameraX, targetCameraX, slowLerp);
			smoothCameraY = lerp(smoothCameraY, targetCameraY, slowLerp);
		}

		// Update player interpolation
		for (const player of interpolatedPlayers.values()) {
			const dx = player.targetX - player.visualX;
			const dy = player.targetY - player.visualY;
			const distance = Math.sqrt(dx * dx + dy * dy);

			if (distance > 0.01) {
				// Interpolate towards target
				const lerpAmount = LERP_SPEED * deltaTime;
				player.visualX = lerp(player.visualX, player.targetX, lerpAmount);
				player.visualY = lerp(player.visualY, player.targetY, lerpAmount);

				// Update bounce phase (active when moving)
				player.bouncePhase += deltaTime * 0.5;
			} else {
				// Snap when very close
				player.visualX = player.targetX;
				player.visualY = player.targetY;

				// Decay bounce
				if (player.bouncePhase < Math.PI) {
					player.bouncePhase = Math.min(player.bouncePhase + deltaTime * 0.3, Math.PI);
				}
			}
		}

		render();
		animationFrame = requestAnimationFrame(gameLoop);
	}

	function render(): void {
		if (!ctx) return;

		const size = canvasSize;
		const camX = smoothCameraX;
		const camY = smoothCameraY;

		// Apply shake offset
		ctx.save();
		ctx.translate(shakeOffsetX, shakeOffsetY);

		// Clear canvas
		ctx.fillStyle = COLORS.background;
		ctx.fillRect(-10, -10, size + 20, size + 20);

		// Draw grid lines
		ctx.strokeStyle = COLORS.grid;
		ctx.lineWidth = 1;
		for (let i = 0; i <= VIEWPORT_SIZE; i++) {
			const x = i * cellSize - (camX % 1) * cellSize;
			const y = i * cellSize - (camY % 1) * cellSize;
			ctx.beginPath();
			ctx.moveTo(x, 0);
			ctx.lineTo(x, size);
			ctx.stroke();
			ctx.beginPath();
			ctx.moveTo(0, y);
			ctx.lineTo(size, y);
			ctx.stroke();
		}

		// Draw fog at world boundaries
		ctx.fillStyle = COLORS.fog;
		for (let vx = -1; vx <= VIEWPORT_SIZE; vx++) {
			for (let vy = -1; vy <= VIEWPORT_SIZE; vy++) {
				const worldX = Math.floor(camX) + vx;
				const worldY = Math.floor(camY) + vy;
				if (worldX < 0 || worldX >= GRID_SIZE || worldY < 0 || worldY >= GRID_SIZE) {
					const screenX = (vx - (camX % 1)) * cellSize;
					const screenY = (vy - (camY % 1)) * cellSize;
					ctx.fillRect(screenX, screenY, cellSize + 1, cellSize + 1);
				}
			}
		}

		// Draw items (filtered by visibility based on role)
		for (const item of items) {
			// Filter items by visibility
			const isZombie = yourRole === 'zombie';
			const canSee =
				(item.type === 'speed-boost' && isZombie) ||
				(item.type === 'healing-touch' && !isZombie);

			if (!canSee) continue;

			const screenX = (item.x - camX) * cellSize;
			const screenY = (item.y - camY) * cellSize;

			// Skip if outside viewport
			if (
				screenX < -cellSize * 2 ||
				screenX > size + cellSize ||
				screenY < -cellSize * 2 ||
				screenY > size + cellSize
			) {
				continue;
			}

			// Draw item with pulsing glow
			const itemPulse = 0.6 + Math.sin(glowPhase * 2 + item.x + item.y) * 0.3;
			ctx.save();
			ctx.globalAlpha = itemPulse;
			ctx.shadowColor = item.color;
			ctx.shadowBlur = 8 + Math.sin(glowPhase * 3) * 4;
			ctx.fillStyle = item.color;

			// Draw diamond shape for items
			const centerX = screenX + cellSize / 2;
			const centerY = screenY + cellSize / 2;
			const itemSize = cellSize * 0.35;

			ctx.beginPath();
			ctx.moveTo(centerX, centerY - itemSize);
			ctx.lineTo(centerX + itemSize, centerY);
			ctx.lineTo(centerX, centerY + itemSize);
			ctx.lineTo(centerX - itemSize, centerY);
			ctx.closePath();
			ctx.fill();

			ctx.restore();
		}

		// Draw players
		const sortedPlayers = Array.from(interpolatedPlayers.values());
		for (const player of sortedPlayers) {
			const screenX = (player.visualX - camX) * cellSize;
			const screenY = (player.visualY - camY) * cellSize;

			// Skip if outside viewport (with margin)
			if (
				screenX < -cellSize * 2 ||
				screenX > size + cellSize ||
				screenY < -cellSize * 2 ||
				screenY > size + cellSize
			) {
				continue;
			}

			const isMe = player.id === myId;

			// Calculate bounce
			const bounceScale = isMe ? 1 + Math.sin(player.bouncePhase * 4) * BOUNCE_AMPLITUDE : 1;
			const bounceOffset = ((1 - bounceScale) * cellSize) / 2;

			// Determine color
			let color: string;
			if (isMe) {
				color = COLORS.myPlayer;
			} else if (player.isZombie) {
				color = COLORS.zombie;
			} else {
				color = COLORS.survivor;
			}

			const padding = 2;
			const baseSize = cellSize - padding * 2;
			const scaledSize = baseSize * bounceScale;
			const x = screenX + padding + bounceOffset;
			const y = screenY + padding + bounceOffset;

			// Check if this player has healing item (warning for zombies)
			const hasHealingItem = playersWithHealingTouch.includes(player.id);

			// Draw zombie glow (pulsing)
			if (player.isZombie && !isMe) {
				const glowIntensity = 0.3 + Math.sin(glowPhase + player.visualX + player.visualY) * 0.15;
				ctx.shadowColor = COLORS.zombie;
				ctx.shadowBlur = 12 + Math.sin(glowPhase) * 4;
				ctx.globalAlpha = glowIntensity + 0.4;
			}

			// Draw healing player glow (red, warning for zombies)
			if (hasHealingItem && !player.isZombie && yourRole === 'zombie') {
				const healGlow = 0.5 + Math.sin(glowPhase * 4) * 0.3;
				ctx.shadowColor = COLORS.healingPlayer;
				ctx.shadowBlur = 15 + Math.sin(glowPhase * 2) * 5;
				ctx.globalAlpha = healGlow;
			}

			// Draw player
			ctx.fillStyle = color;
			ctx.fillRect(x, y, scaledSize, scaledSize);

			// Reset shadow
			ctx.shadowBlur = 0;
			ctx.globalAlpha = 1;

			// Draw healing indicator (red border for survivors with healing item)
			if (hasHealingItem && !player.isZombie) {
				const healPulse = 0.6 + Math.sin(glowPhase * 3) * 0.4;
				ctx.strokeStyle = `rgba(239, 68, 68, ${healPulse})`;
				ctx.lineWidth = 2;
				ctx.strokeRect(screenX + 1, screenY + 1, cellSize - 2, cellSize - 2);
			}

			// Draw border for current player
			if (isMe) {
				const borderPulse = 0.7 + Math.sin(glowPhase * 3) * 0.3;
				ctx.strokeStyle = `rgba(255, 255, 255, ${borderPulse})`;
				ctx.lineWidth = 3;
				ctx.strokeRect(screenX + 1, screenY + 1, cellSize - 2, cellSize - 2);
			}
		}

		ctx.restore();

		// Draw minimap (unaffected by shake)
		drawMinimap(ctx, camX, camY);

		// Draw off-screen item indicators (arrows at edge)
		drawOffScreenItemIndicators(ctx, camX, camY);
	}

	function drawOffScreenItemIndicators(
		ctx: CanvasRenderingContext2D,
		camX: number,
		camY: number
	): void {
		const padding = 20; // Distance from edge
		const arrowSize = 16;
		const centerX = canvasSize / 2;
		const centerY = canvasSize / 2;

		for (const item of items) {
			// Filter items by visibility (same logic as in render)
			const isZombie = yourRole === 'zombie';
			const canSee =
				(item.type === 'speed-boost' && isZombie) || (item.type === 'healing-touch' && !isZombie);

			if (!canSee) continue;

			// Calculate screen position
			const screenX = (item.x - camX) * cellSize + cellSize / 2;
			const screenY = (item.y - camY) * cellSize + cellSize / 2;

			// Check if item is outside viewport
			const isOffScreen =
				screenX < 0 || screenX > canvasSize || screenY < 0 || screenY > canvasSize;

			if (!isOffScreen) continue;

			// Calculate direction to item
			const dx = screenX - centerX;
			const dy = screenY - centerY;
			const angle = Math.atan2(dy, dx);

			// Calculate position on edge of screen
			let edgeX = centerX;
			let edgeY = centerY;

			// Find intersection with screen edge
			const halfWidth = canvasSize / 2 - padding;
			const halfHeight = canvasSize / 2 - padding;

			const tanAngle = Math.tan(angle);
			const cotAngle = 1 / tanAngle;

			// Check horizontal edges
			if (Math.abs(dx) > Math.abs(dy)) {
				edgeX = dx > 0 ? canvasSize - padding : padding;
				edgeY = centerY + (edgeX - centerX) * tanAngle;
			} else {
				edgeY = dy > 0 ? canvasSize - padding : padding;
				edgeX = centerX + (edgeY - centerY) * cotAngle;
			}

			// Clamp to screen bounds
			edgeX = Math.max(padding, Math.min(canvasSize - padding, edgeX));
			edgeY = Math.max(padding, Math.min(canvasSize - padding, edgeY));

			// Draw pulsing arrow
			const pulse = 0.7 + Math.sin(glowPhase * 3 + item.x + item.y) * 0.3;

			ctx.save();
			ctx.translate(edgeX, edgeY);
			ctx.rotate(angle);

			// Glow effect
			ctx.shadowColor = item.color;
			ctx.shadowBlur = 10 + Math.sin(glowPhase * 2) * 5;
			ctx.globalAlpha = pulse;

			// Draw arrow shape
			ctx.fillStyle = item.color;
			ctx.beginPath();
			ctx.moveTo(arrowSize, 0);
			ctx.lineTo(-arrowSize * 0.5, -arrowSize * 0.6);
			ctx.lineTo(-arrowSize * 0.3, 0);
			ctx.lineTo(-arrowSize * 0.5, arrowSize * 0.6);
			ctx.closePath();
			ctx.fill();

			// Draw distance indicator (small dots)
			const distance = Math.sqrt(dx * dx + dy * dy);
			const normalizedDist = Math.min(distance / (canvasSize * 2), 1);
			const dotCount = Math.max(1, Math.floor((1 - normalizedDist) * 3) + 1);

			ctx.globalAlpha = pulse * 0.6;
			for (let i = 0; i < dotCount; i++) {
				const dotX = -arrowSize - 8 - i * 6;
				ctx.beginPath();
				ctx.arc(dotX, 0, 2, 0, Math.PI * 2);
				ctx.fill();
			}

			ctx.restore();
		}
	}

	function drawMinimap(ctx: CanvasRenderingContext2D, camX: number, camY: number): void {
		const minimapSize = 60;
		const minimapCellSize = minimapSize / GRID_SIZE;
		const minimapX = canvasSize - minimapSize - 8;
		const minimapY = 8;

		// Minimap background
		ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
		ctx.fillRect(minimapX - 2, minimapY - 2, minimapSize + 4, minimapSize + 4);

		ctx.fillStyle = COLORS.background;
		ctx.fillRect(minimapX, minimapY, minimapSize, minimapSize);

		// Draw all players on minimap
		for (const player of interpolatedPlayers.values()) {
			const isMe = player.id === myId;

			if (isMe) {
				ctx.fillStyle = COLORS.myPlayer;
			} else if (player.isZombie) {
				ctx.fillStyle = COLORS.zombie;
			} else {
				ctx.fillStyle = COLORS.survivor;
			}

			ctx.fillRect(
				minimapX + player.targetX * minimapCellSize,
				minimapY + player.targetY * minimapCellSize,
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
		class:shaking={shakeIntensity > 0}
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
		transition: box-shadow 0.2s ease;
	}

	.zombie-grid.shaking {
		box-shadow:
			var(--shadow-pixel-lg),
			0 0 50px rgba(239, 68, 68, 0.4);
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
