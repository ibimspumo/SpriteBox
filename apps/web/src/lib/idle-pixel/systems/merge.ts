// apps/web/src/lib/idle-pixel/systems/merge.ts
// Merge System - handles pixel merging with animations

import type { IdlePixelGameState, IdlePixel, GridSlot } from '@spritebox/types';
import { getProductionForLevel, MAX_COLOR_LEVEL, BALANCE } from '@spritebox/types';

/**
 * Animation state for a merge
 */
export interface MergeAnimation {
	/** Positions of the two merging pixels */
	fromPositions: [number, number];
	/** Target position for the merged pixel */
	toPosition: number;
	/** Color level of the new pixel */
	newColorLevel: number;
	/** Animation start time */
	startTime: number;
	/** Animation duration in ms */
	duration: number;
	/** Unique ID for this animation */
	id: string;
}

/**
 * Result of checking for merges
 */
export interface MergeCheckResult {
	/** Updated game state after all merges */
	newState: IdlePixelGameState;
	/** Animations to play */
	animations: MergeAnimation[];
	/** Whether any merges occurred */
	hasMerges: boolean;
}

/**
 * Generate a unique ID for animations
 */
function generateAnimationId(): string {
	return `merge_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Generate a unique pixel ID
 */
function generatePixelId(): string {
	return `px_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Get the maximum auto-merge level based on upgrades and prestige
 * - Level 0-7: Always free (DEFAULT_MAX_MERGE_LEVEL = 7)
 * - Level 8-10: Requires currency upgrades
 * - Level 11+: Requires prestige upgrade (prisma_merge_unlock)
 */
export function getMaxAutoMergeLevel(state: IdlePixelGameState): number {
	let maxLevel: number = BALANCE.DEFAULT_MAX_MERGE_LEVEL; // 7

	// Check currency upgrades for levels 8, 9, 10 (must be sequential)
	const hasUnlock8 = state.upgrades.some(u => u.upgradeId === 'unlock_merge_8' && u.level >= 1);
	const hasUnlock9 = state.upgrades.some(u => u.upgradeId === 'unlock_merge_9' && u.level >= 1);
	const hasUnlock10 = state.upgrades.some(u => u.upgradeId === 'unlock_merge_10' && u.level >= 1);

	// Require sequential unlocking: 8 must come before 9, 9 must come before 10
	if (hasUnlock8) {
		maxLevel = 8;
		if (hasUnlock9) {
			maxLevel = 9;
			if (hasUnlock10) {
				maxLevel = 10;
			}
		}
	}

	// Check prestige upgrade for levels 11+
	const prismaMergeUpgrade = state.prestige.prestigeUpgrades.find(
		u => u.upgradeId === 'prisma_merge_unlock'
	);
	if (prismaMergeUpgrade) {
		maxLevel += prismaMergeUpgrade.level; // +1 per level
	}

	// Cap at MAX_COLOR_LEVEL (14)
	return Math.min(maxLevel, MAX_COLOR_LEVEL);
}

/**
 * Find all possible merge pairs in the grid
 * Rule: Two pixels with the same color level can merge
 * Priority: Lower position index first
 * @param grid The game grid
 * @param maxAutoMergeLevel Maximum level that can be auto-merged (pixels at or above this level won't merge)
 */
function findMergePairs(grid: GridSlot[], maxAutoMergeLevel: number = MAX_COLOR_LEVEL): [number, number][] {
	const pairs: [number, number][] = [];
	const used = new Set<number>();

	// Group pixels by color level
	const byColor: Map<number, number[]> = new Map();

	for (const slot of grid) {
		if (slot.pixel && slot.unlocked) {
			const level = slot.pixel.colorLevel;
			// Skip max level pixels - they can't merge further
			if (level >= MAX_COLOR_LEVEL) continue;
			// Skip pixels at or above maxAutoMergeLevel - they require upgrades to merge
			if (level >= maxAutoMergeLevel) continue;

			if (!byColor.has(level)) {
				byColor.set(level, []);
			}
			byColor.get(level)!.push(slot.position);
		}
	}

	// Form pairs from each color group (sorted by position)
	for (const [_level, positions] of byColor) {
		// Sort positions ascending
		positions.sort((a, b) => a - b);

		// Pair up adjacent positions
		for (let i = 0; i < positions.length - 1; i += 2) {
			const pos1 = positions[i];
			const pos2 = positions[i + 1];

			if (!used.has(pos1) && !used.has(pos2)) {
				pairs.push([pos1, pos2]);
				used.add(pos1);
				used.add(pos2);
			}
		}
	}

	return pairs;
}

/**
 * Perform a single merge operation
 */
function performMerge(
	state: IdlePixelGameState,
	pos1: number,
	pos2: number,
	mergeBonus: number = 1
): IdlePixelGameState {
	const pixel1 = state.grid[pos1].pixel;
	const pixel2 = state.grid[pos2].pixel;

	if (!pixel1 || !pixel2) {
		throw new Error('Cannot merge: missing pixel');
	}

	if (pixel1.colorLevel !== pixel2.colorLevel) {
		throw new Error('Cannot merge: different color levels');
	}

	// Calculate new color level (capped at max)
	const newColorLevel = Math.min(pixel1.colorLevel + 1, MAX_COLOR_LEVEL);
	const targetPos = Math.min(pos1, pos2);
	const removePos = Math.max(pos1, pos2);

	// Create merged pixel
	const mergedPixel: IdlePixel = {
		id: generatePixelId(),
		colorLevel: newColorLevel,
		position: targetPos,
		baseProduction: getProductionForLevel(newColorLevel) * mergeBonus
	};

	// Update grid
	const newGrid = [...state.grid];
	newGrid[targetPos] = { ...newGrid[targetPos], pixel: mergedPixel };
	newGrid[removePos] = { ...newGrid[removePos], pixel: null };

	return {
		...state,
		grid: newGrid,
		stats: {
			...state.stats,
			mergesPerformed: state.stats.mergesPerformed + 1,
			highestColorLevel: Math.max(state.stats.highestColorLevel, newColorLevel)
		}
	};
}

/**
 * Compact the grid by moving pixels to fill gaps
 * Pixels move to the lowest available unlocked positions
 */
function compactGrid(state: IdlePixelGameState): IdlePixelGameState {
	// Get all unlocked slots sorted by position
	const unlockedSlots = state.grid
		.filter((slot) => slot.unlocked)
		.sort((a, b) => a.position - b.position);

	// Get all pixels from unlocked slots
	const pixels = unlockedSlots
		.filter((slot) => slot.pixel !== null)
		.map((slot) => slot.pixel!);

	// Create new grid
	const newGrid = [...state.grid];

	// Clear all unlocked slots and refill
	let pixelIndex = 0;
	for (const slot of unlockedSlots) {
		if (pixelIndex < pixels.length) {
			newGrid[slot.position] = {
				...newGrid[slot.position],
				pixel: { ...pixels[pixelIndex], position: slot.position }
			};
			pixelIndex++;
		} else {
			newGrid[slot.position] = {
				...newGrid[slot.position],
				pixel: null
			};
		}
	}

	return { ...state, grid: newGrid };
}

/**
 * Merge System - handles automatic pixel merging with animations
 */
export class MergeSystem {
	/** Active animations */
	private animations: MergeAnimation[] = [];

	/** Default merge animation duration in ms */
	readonly MERGE_DURATION = 300;

	/** Merge bonus from upgrades (default 1 = no bonus) */
	private mergeBonus = 1;

	/**
	 * Set the merge bonus multiplier
	 */
	setMergeBonus(bonus: number): void {
		this.mergeBonus = bonus;
	}

	/**
	 * Get current merge bonus
	 */
	getMergeBonus(): number {
		return this.mergeBonus;
	}

	/**
	 * Check for and perform all possible merges
	 * Returns updated state and animations to play
	 * Respects the max auto-merge level based on upgrades
	 */
	checkAndPerformMerges(state: IdlePixelGameState): MergeCheckResult {
		const allAnimations: MergeAnimation[] = [];
		let currentState = state;
		let mergesOccurred = true;

		// Get max merge level based on upgrades
		const maxAutoMergeLevel = getMaxAutoMergeLevel(state);

		// Keep merging until no more pairs
		while (mergesOccurred) {
			const pairs = findMergePairs(currentState.grid, maxAutoMergeLevel);

			if (pairs.length === 0) {
				mergesOccurred = false;
				break;
			}

			// Process all pairs in this round
			for (const [pos1, pos2] of pairs) {
				const pixel = currentState.grid[Math.min(pos1, pos2)].pixel;
				const newColorLevel = pixel ? Math.min(pixel.colorLevel + 1, MAX_COLOR_LEVEL) : 0;

				// Create animation
				const animation: MergeAnimation = {
					fromPositions: [pos1, pos2],
					toPosition: Math.min(pos1, pos2),
					newColorLevel,
					startTime: Date.now(),
					duration: this.MERGE_DURATION,
					id: generateAnimationId()
				};
				allAnimations.push(animation);

				// Perform merge
				currentState = performMerge(currentState, pos1, pos2, this.mergeBonus);
			}

			// Compact grid after each round of merges
			currentState = compactGrid(currentState);
		}

		return {
			newState: currentState,
			animations: allAnimations,
			hasMerges: allAnimations.length > 0
		};
	}

	/**
	 * Get all active animations
	 */
	getActiveAnimations(): MergeAnimation[] {
		return this.animations;
	}

	/**
	 * Add animations to the queue
	 */
	addAnimations(animations: MergeAnimation[]): void {
		this.animations.push(...animations);
	}

	/**
	 * Update animations - remove completed ones
	 * @returns List of completed animation IDs
	 */
	updateAnimations(): string[] {
		const now = Date.now();
		const completed: string[] = [];

		this.animations = this.animations.filter((anim) => {
			const elapsed = now - anim.startTime;
			if (elapsed >= anim.duration) {
				completed.push(anim.id);
				return false;
			}
			return true;
		});

		return completed;
	}

	/**
	 * Clear all animations
	 */
	clearAnimations(): void {
		this.animations = [];
	}

	/**
	 * Check if there are pending animations
	 */
	hasAnimations(): boolean {
		return this.animations.length > 0;
	}

	/**
	 * Get animation progress (0-1)
	 */
	getAnimationProgress(animationId: string): number {
		const anim = this.animations.find((a) => a.id === animationId);
		if (!anim) return 1;

		const elapsed = Date.now() - anim.startTime;
		return Math.min(elapsed / anim.duration, 1);
	}
}

// Singleton instance
export const mergeSystem = new MergeSystem();
