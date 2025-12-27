<!-- ZombieGrid - Smooth canvas-based grid with interpolation and camera smoothing -->
<script lang="ts">
	import { onMount } from 'svelte';
	import { t } from '$lib/i18n';
	import type { ZombiePixelPlayerClient, ZombieItemClient } from '$lib/stores';
	import ZombieGridLegend from './ZombieGridLegend.svelte';
	import {
		GRID_SIZE,
		VIEWPORT_SIZE,
		COLORS,
		LERP_SPEED,
		CAMERA_LERP_SPEED,
		CAMERA_DEAD_ZONE,
		GLOW_PULSE_SPEED,
		lerp,
		type InterpolatedPlayer
	} from './zombieGridConstants';
	import {
		drawGridLines,
		drawFog,
		drawItems,
		drawPlayer,
		drawMinimap,
		drawOffScreenItemIndicators,
		type RenderContext
	} from './zombieGridRenderers';

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

	// Interpolation state - tracks visual positions separate from server positions
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

		// Create render context for helper functions
		const renderCtx: RenderContext = {
			ctx,
			canvasSize: size,
			cellSize,
			camX,
			camY,
			glowPhase
		};

		// Apply shake offset
		ctx.save();
		ctx.translate(shakeOffsetX, shakeOffsetY);

		// Clear canvas
		ctx.fillStyle = COLORS.background;
		ctx.fillRect(-10, -10, size + 20, size + 20);

		// Draw grid lines
		drawGridLines(renderCtx);

		// Draw fog at world boundaries
		drawFog(renderCtx);

		// Draw items
		drawItems(renderCtx, items, yourRole);

		// Draw players
		const sortedPlayers = Array.from(interpolatedPlayers.values());
		const playerRenderOptions = {
			myId,
			yourRole,
			playersWithHealingTouch
		};
		for (const player of sortedPlayers) {
			drawPlayer(renderCtx, player, playerRenderOptions);
		}

		ctx.restore();

		// Draw minimap (unaffected by shake)
		drawMinimap(renderCtx, interpolatedPlayers, myId);

		// Draw off-screen item indicators (arrows at edge)
		drawOffScreenItemIndicators(renderCtx, items, yourRole);
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

	<ZombieGridLegend />
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
</style>
