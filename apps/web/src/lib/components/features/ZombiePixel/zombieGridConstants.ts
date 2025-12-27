// ZombieGrid Constants and Types

// Grid configuration
export const GRID_SIZE = 32;
export const VIEWPORT_SIZE = 13;

// Animation settings
export const LERP_SPEED = 0.2; // Position interpolation speed (0-1)
export const CAMERA_LERP_SPEED = 0.08; // Camera follows slower for smoothness
export const CAMERA_DEAD_ZONE = 1.5; // Tiles before camera starts following
export const BOUNCE_AMPLITUDE = 0.08; // Bounce scale amount
export const GLOW_PULSE_SPEED = 2; // Glow pulse frequency

// Color palette
export const COLORS = {
	background: '#0a0a0a',
	survivor: '#ffffff',
	zombie: '#22c55e',
	myPlayer: '#fbbf24',
	grid: '#1a1a1a',
	fog: '#050505',
	healingItem: '#ef4444',
	speedBoostItem: '#fbbf24',
	healingPlayer: '#ef4444'
} as const;

// Interpolated player state for smooth movement
export interface InterpolatedPlayer {
	id: string;
	visualX: number;
	visualY: number;
	targetX: number;
	targetY: number;
	isZombie: boolean;
	isBot: boolean;
	bouncePhase: number;
}

// Linear interpolation helper
export function lerp(a: number, b: number, t: number): number {
	return a + (b - a) * t;
}
