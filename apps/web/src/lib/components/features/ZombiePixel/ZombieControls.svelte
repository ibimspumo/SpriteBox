<!-- ZombieControls - Virtual joystick and keyboard controls with diagonal support -->
<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { t } from '$lib/i18n';
	import { getSocket } from '$lib/socket';

	type Direction = 'up' | 'down' | 'left' | 'right' | 'up-left' | 'up-right' | 'down-left' | 'down-right';

	// Joystick state
	let joystickContainer: HTMLDivElement;
	let isDragging = $state(false);
	let joystickX = $state(0);
	let joystickY = $state(0);
	let currentDirection: Direction | null = $state(null);

	// Keyboard state for diagonal movement
	let keysPressed = new Set<string>();
	let keyboardInterval: ReturnType<typeof setInterval> | null = null;

	// Movement rate limiting
	const MOVE_INTERVAL = 100; // 10 moves per second (matches server)
	let lastMoveTime = 0;

	// Joystick dimensions
	const JOYSTICK_SIZE = 120;
	const KNOB_SIZE = 48;
	const DEAD_ZONE = 10;
	const MAX_DISTANCE = (JOYSTICK_SIZE - KNOB_SIZE) / 2;

	function sendMove(direction: Direction): void {
		const now = Date.now();
		if (now - lastMoveTime < MOVE_INTERVAL) return;

		const socket = getSocket();
		if (socket) {
			socket.emit('zombie-move', { direction });
			lastMoveTime = now;
		}
	}

	// Calculate direction from joystick position
	function getDirectionFromPosition(x: number, y: number): Direction | null {
		const distance = Math.sqrt(x * x + y * y);
		if (distance < DEAD_ZONE) return null;

		// Calculate angle (0 = right, 90 = down, etc.)
		const angle = Math.atan2(y, x) * (180 / Math.PI);

		// 8 directions, each covers 45 degrees
		// Offset by 22.5 so each direction is centered
		if (angle >= -22.5 && angle < 22.5) return 'right';
		if (angle >= 22.5 && angle < 67.5) return 'down-right';
		if (angle >= 67.5 && angle < 112.5) return 'down';
		if (angle >= 112.5 && angle < 157.5) return 'down-left';
		if (angle >= 157.5 || angle < -157.5) return 'left';
		if (angle >= -157.5 && angle < -112.5) return 'up-left';
		if (angle >= -112.5 && angle < -67.5) return 'up';
		if (angle >= -67.5 && angle < -22.5) return 'up-right';

		return null;
	}

	// Keyboard handling with diagonal support
	function handleKeydown(e: KeyboardEvent): void {
		if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
			return;
		}

		const key = e.key.toLowerCase();
		if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', 'w', 'a', 's', 'd'].includes(key)) {
			e.preventDefault();
			keysPressed.add(key);

			// Start interval if not already running
			if (!keyboardInterval) {
				sendKeyboardMove();
				keyboardInterval = setInterval(sendKeyboardMove, MOVE_INTERVAL);
			}
		}
	}

	function handleKeyup(e: KeyboardEvent): void {
		const key = e.key.toLowerCase();
		keysPressed.delete(key);

		// Stop interval if no keys pressed
		if (keysPressed.size === 0 && keyboardInterval) {
			clearInterval(keyboardInterval);
			keyboardInterval = null;
		}
	}

	function sendKeyboardMove(): void {
		const up = keysPressed.has('arrowup') || keysPressed.has('w');
		const down = keysPressed.has('arrowdown') || keysPressed.has('s');
		const left = keysPressed.has('arrowleft') || keysPressed.has('a');
		const right = keysPressed.has('arrowright') || keysPressed.has('d');

		// Determine direction (diagonals take priority)
		let direction: Direction | null = null;

		if (up && left) direction = 'up-left';
		else if (up && right) direction = 'up-right';
		else if (down && left) direction = 'down-left';
		else if (down && right) direction = 'down-right';
		else if (up) direction = 'up';
		else if (down) direction = 'down';
		else if (left) direction = 'left';
		else if (right) direction = 'right';

		if (direction) {
			sendMove(direction);
		}
	}

	// Touch/mouse handlers for joystick
	function handleJoystickStart(e: TouchEvent | MouseEvent): void {
		e.preventDefault();
		isDragging = true;
		updateJoystickPosition(e);
	}

	function handleJoystickMove(e: TouchEvent | MouseEvent): void {
		if (!isDragging) return;
		updateJoystickPosition(e);
	}

	function handleJoystickEnd(): void {
		isDragging = false;
		joystickX = 0;
		joystickY = 0;
		currentDirection = null;
	}

	function updateJoystickPosition(e: TouchEvent | MouseEvent): void {
		if (!joystickContainer) return;

		const rect = joystickContainer.getBoundingClientRect();
		const centerX = rect.left + rect.width / 2;
		const centerY = rect.top + rect.height / 2;

		let clientX: number, clientY: number;
		if ('touches' in e) {
			clientX = e.touches[0].clientX;
			clientY = e.touches[0].clientY;
		} else {
			clientX = e.clientX;
			clientY = e.clientY;
		}

		let dx = clientX - centerX;
		let dy = clientY - centerY;

		// Clamp to max distance
		const distance = Math.sqrt(dx * dx + dy * dy);
		if (distance > MAX_DISTANCE) {
			dx = (dx / distance) * MAX_DISTANCE;
			dy = (dy / distance) * MAX_DISTANCE;
		}

		joystickX = dx;
		joystickY = dy;

		const direction = getDirectionFromPosition(dx, dy);
		if (direction && direction !== currentDirection) {
			currentDirection = direction;
			sendMove(direction);
		}
	}

	// Continuous movement while joystick is held
	let joystickInterval: ReturnType<typeof setInterval> | null = null;

	$effect(() => {
		if (isDragging && currentDirection) {
			if (!joystickInterval) {
				joystickInterval = setInterval(() => {
					if (currentDirection) {
						sendMove(currentDirection);
					}
				}, MOVE_INTERVAL);
			}
		} else {
			if (joystickInterval) {
				clearInterval(joystickInterval);
				joystickInterval = null;
			}
		}
	});

	onMount(() => {
		window.addEventListener('keydown', handleKeydown);
		window.addEventListener('keyup', handleKeyup);

		// Global touch/mouse listeners for joystick (so it works outside the element)
		window.addEventListener('touchmove', handleJoystickMove, { passive: false });
		window.addEventListener('touchend', handleJoystickEnd);
		window.addEventListener('mousemove', handleJoystickMove);
		window.addEventListener('mouseup', handleJoystickEnd);
	});

	onDestroy(() => {
		window.removeEventListener('keydown', handleKeydown);
		window.removeEventListener('keyup', handleKeyup);
		window.removeEventListener('touchmove', handleJoystickMove);
		window.removeEventListener('touchend', handleJoystickEnd);
		window.removeEventListener('mousemove', handleJoystickMove);
		window.removeEventListener('mouseup', handleJoystickEnd);

		if (keyboardInterval) clearInterval(keyboardInterval);
		if (joystickInterval) clearInterval(joystickInterval);
	});
</script>

<!-- Desktop keyboard hint -->
<div class="keyboard-hint">
	<span class="hint-keys">WASD</span>
	<span class="hint-text">{$t.zombiePixel.controls.keyboard}</span>
</div>

<!-- Virtual Joystick (shown on touch devices) -->
<div
	class="joystick-container"
	bind:this={joystickContainer}
	ontouchstart={handleJoystickStart}
	onmousedown={handleJoystickStart}
	role="application"
	aria-label={$t.zombiePixel.controls.joystick}
>
	<!-- Direction indicators -->
	<div class="direction-indicator up" class:active={currentDirection?.includes('up')}>
		<span aria-hidden="true">&#x25B2;</span>
	</div>
	<div class="direction-indicator down" class:active={currentDirection?.includes('down')}>
		<span aria-hidden="true">&#x25BC;</span>
	</div>
	<div class="direction-indicator left" class:active={currentDirection === 'left' || currentDirection?.includes('left')}>
		<span aria-hidden="true">&#x25C0;</span>
	</div>
	<div class="direction-indicator right" class:active={currentDirection === 'right' || currentDirection?.includes('right')}>
		<span aria-hidden="true">&#x25B6;</span>
	</div>

	<!-- Joystick base -->
	<div class="joystick-base">
		<!-- Joystick knob -->
		<div
			class="joystick-knob"
			class:dragging={isDragging}
			style="transform: translate({joystickX}px, {joystickY}px)"
		></div>
	</div>
</div>

<style>
	/* Desktop keyboard hint */
	.keyboard-hint {
		position: fixed;
		bottom: var(--space-4);
		left: 50%;
		transform: translateX(-50%);
		display: flex;
		align-items: center;
		gap: var(--space-2);
		padding: var(--space-2) var(--space-4);
		background: rgba(0, 0, 0, 0.8);
		border-radius: var(--radius-full);
		color: var(--color-text-secondary);
		font-size: var(--font-size-sm);
		border: 1px solid var(--color-border);
		backdrop-filter: blur(8px);
		z-index: 10;
	}

	.hint-keys {
		font-family: monospace;
		font-weight: bold;
		color: var(--color-text-primary);
		background: var(--color-bg-tertiary);
		padding: var(--space-1) var(--space-2);
		border-radius: var(--radius-sm);
		border: 1px solid var(--color-border-strong);
	}

	.hint-text {
		text-transform: uppercase;
		letter-spacing: 0.5px;
	}

	/* Hide keyboard hint on touch devices */
	@media (pointer: coarse) {
		.keyboard-hint {
			display: none;
		}
	}

	/* Virtual Joystick */
	.joystick-container {
		position: fixed;
		bottom: var(--space-8);
		left: 50%;
		transform: translateX(-50%);
		width: 160px;
		height: 160px;
		display: none;
		align-items: center;
		justify-content: center;
		z-index: 20;
		touch-action: none;
		user-select: none;
		-webkit-user-select: none;
	}

	/* Show joystick on touch devices */
	@media (pointer: coarse) {
		.joystick-container {
			display: flex;
		}
	}

	/* Direction indicators */
	.direction-indicator {
		position: absolute;
		width: 24px;
		height: 24px;
		display: flex;
		align-items: center;
		justify-content: center;
		color: var(--color-text-muted);
		font-size: var(--font-size-sm);
		opacity: 0.3;
		transition: opacity 0.1s, color 0.1s, transform 0.1s;
	}

	.direction-indicator.active {
		opacity: 1;
		color: var(--color-accent);
		transform: scale(1.2);
	}

	.direction-indicator.up {
		top: 0;
		left: 50%;
		transform: translateX(-50%);
	}

	.direction-indicator.up.active {
		transform: translateX(-50%) scale(1.2);
	}

	.direction-indicator.down {
		bottom: 0;
		left: 50%;
		transform: translateX(-50%);
	}

	.direction-indicator.down.active {
		transform: translateX(-50%) scale(1.2);
	}

	.direction-indicator.left {
		left: 0;
		top: 50%;
		transform: translateY(-50%);
	}

	.direction-indicator.left.active {
		transform: translateY(-50%) scale(1.2);
	}

	.direction-indicator.right {
		right: 0;
		top: 50%;
		transform: translateY(-50%);
	}

	.direction-indicator.right.active {
		transform: translateY(-50%) scale(1.2);
	}

	/* Joystick base */
	.joystick-base {
		width: 120px;
		height: 120px;
		border-radius: 50%;
		background: radial-gradient(circle, var(--color-bg-tertiary) 0%, var(--color-bg-secondary) 100%);
		border: 3px solid var(--color-border-strong);
		display: flex;
		align-items: center;
		justify-content: center;
		box-shadow:
			inset 0 4px 8px rgba(0, 0, 0, 0.4),
			0 4px 12px rgba(0, 0, 0, 0.3);
	}

	/* Joystick knob */
	.joystick-knob {
		width: 48px;
		height: 48px;
		border-radius: 50%;
		background: linear-gradient(145deg, var(--color-bg-elevated), var(--color-bg-secondary));
		border: 2px solid var(--color-border-strong);
		box-shadow:
			0 4px 8px rgba(0, 0, 0, 0.3),
			inset 0 2px 4px rgba(255, 255, 255, 0.1);
		transition: box-shadow 0.1s;
		cursor: grab;
	}

	.joystick-knob.dragging {
		cursor: grabbing;
		box-shadow:
			0 2px 4px rgba(0, 0, 0, 0.2),
			inset 0 2px 4px rgba(255, 255, 255, 0.1),
			0 0 20px rgba(34, 197, 94, 0.3);
		border-color: var(--color-accent);
	}

	/* Larger joystick on tablets */
	@media (min-width: 768px) and (pointer: coarse) {
		.joystick-container {
			width: 180px;
			height: 180px;
		}

		.joystick-base {
			width: 140px;
			height: 140px;
		}

		.joystick-knob {
			width: 56px;
			height: 56px;
		}
	}
</style>
