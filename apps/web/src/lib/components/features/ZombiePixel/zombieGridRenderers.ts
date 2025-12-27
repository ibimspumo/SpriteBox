// ZombieGrid Rendering Functions
import type { ZombieItemClient } from '$lib/stores';
import { COLORS, GRID_SIZE, VIEWPORT_SIZE, BOUNCE_AMPLITUDE, type InterpolatedPlayer } from './zombieGridConstants';

export interface RenderContext {
	ctx: CanvasRenderingContext2D;
	canvasSize: number;
	cellSize: number;
	camX: number;
	camY: number;
	glowPhase: number;
}

export interface PlayerRenderOptions {
	myId: string | null;
	yourRole: 'zombie' | 'survivor' | null;
	playersWithHealingTouch: string[];
}

// Draw grid lines
export function drawGridLines(renderCtx: RenderContext): void {
	const { ctx, canvasSize, cellSize, camX, camY } = renderCtx;

	ctx.strokeStyle = COLORS.grid;
	ctx.lineWidth = 1;
	for (let i = 0; i <= VIEWPORT_SIZE; i++) {
		const x = i * cellSize - (camX % 1) * cellSize;
		const y = i * cellSize - (camY % 1) * cellSize;
		ctx.beginPath();
		ctx.moveTo(x, 0);
		ctx.lineTo(x, canvasSize);
		ctx.stroke();
		ctx.beginPath();
		ctx.moveTo(0, y);
		ctx.lineTo(canvasSize, y);
		ctx.stroke();
	}
}

// Draw fog at world boundaries
export function drawFog(renderCtx: RenderContext): void {
	const { ctx, cellSize, camX, camY } = renderCtx;

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
}

// Draw items on the grid
export function drawItems(
	renderCtx: RenderContext,
	items: ZombieItemClient[],
	yourRole: 'zombie' | 'survivor' | null
): void {
	const { ctx, canvasSize, cellSize, camX, camY, glowPhase } = renderCtx;

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
			screenX > canvasSize + cellSize ||
			screenY < -cellSize * 2 ||
			screenY > canvasSize + cellSize
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
}

// Draw a single player
export function drawPlayer(
	renderCtx: RenderContext,
	player: InterpolatedPlayer,
	options: PlayerRenderOptions
): void {
	const { ctx, canvasSize, cellSize, camX, camY, glowPhase } = renderCtx;
	const { myId, yourRole, playersWithHealingTouch } = options;

	const screenX = (player.visualX - camX) * cellSize;
	const screenY = (player.visualY - camY) * cellSize;

	// Skip if outside viewport (with margin)
	if (
		screenX < -cellSize * 2 ||
		screenX > canvasSize + cellSize ||
		screenY < -cellSize * 2 ||
		screenY > canvasSize + cellSize
	) {
		return;
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

// Draw off-screen item indicators (arrows at edge)
export function drawOffScreenItemIndicators(
	renderCtx: RenderContext,
	items: ZombieItemClient[],
	yourRole: 'zombie' | 'survivor' | null
): void {
	const { ctx, canvasSize, cellSize, camX, camY, glowPhase } = renderCtx;
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

// Draw minimap
export function drawMinimap(
	renderCtx: RenderContext,
	interpolatedPlayers: Map<string, InterpolatedPlayer>,
	myId: string | null
): void {
	const { ctx, canvasSize, camX, camY } = renderCtx;
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
