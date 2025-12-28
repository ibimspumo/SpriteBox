// apps/web/src/lib/idle-pixel/systems/grid.ts
// Grid System - handles slot management and expansion

import type { IdlePixelGameState, GridSlot, SlotPurchaseOption } from '@spritebox/types';
import {
	GridUtils,
	GRID_START_POSITIONS,
	GRID_SIZE,
	GRID_TOTAL_SLOTS,
	calculateSlotCost
} from '@spritebox/types';

// Cast for use with .includes()
const START_POSITIONS: readonly number[] = GRID_START_POSITIONS;

/**
 * Grid System - manages grid slots and expansion
 */
export class GridSystem {
	/**
	 * Create initial grid with start positions unlocked
	 */
	createInitialGrid(): GridSlot[] {
		const grid: GridSlot[] = [];

		for (let i = 0; i < GRID_TOTAL_SLOTS; i++) {
			grid.push({
				position: i,
				unlocked: START_POSITIONS.includes(i),
				pixel: null
			});
		}

		return grid;
	}

	/**
	 * Get all unlocked slots
	 */
	getUnlockedSlots(grid: GridSlot[]): GridSlot[] {
		return grid.filter((slot) => slot.unlocked);
	}

	/**
	 * Get all locked slots
	 */
	getLockedSlots(grid: GridSlot[]): GridSlot[] {
		return grid.filter((slot) => !slot.unlocked);
	}

	/**
	 * Count unlocked slots
	 */
	getUnlockedCount(grid: GridSlot[]): number {
		return grid.filter((slot) => slot.unlocked).length;
	}

	/**
	 * Count pixels on the grid
	 */
	getPixelCount(grid: GridSlot[]): number {
		return grid.filter((slot) => slot.pixel !== null).length;
	}

	/**
	 * Count empty unlocked slots
	 */
	getEmptySlotCount(grid: GridSlot[]): number {
		return grid.filter((slot) => slot.unlocked && slot.pixel === null).length;
	}

	/**
	 * Find the first empty unlocked slot
	 * @returns Position of empty slot, or null if none available
	 */
	findFirstEmptySlot(grid: GridSlot[]): number | null {
		for (const slot of grid) {
			if (slot.unlocked && slot.pixel === null) {
				return slot.position;
			}
		}
		return null;
	}

	/**
	 * Get all available slot purchase options
	 * Rule: Slot must be adjacent to at least one unlocked slot
	 * Costs are now exponential based on slots already purchased
	 */
	getAvailableSlotOptions(grid: GridSlot[]): SlotPurchaseOption[] {
		const unlockedPositions = new Set(
			grid.filter((slot) => slot.unlocked).map((slot) => slot.position)
		);

		const availablePositions = new Set<number>();

		// Find all positions adjacent to unlocked slots
		for (const pos of unlockedPositions) {
			const neighbors = GridUtils.getAdjacentPositions(pos);
			for (const neighbor of neighbors) {
				if (!unlockedPositions.has(neighbor)) {
					availablePositions.add(neighbor);
				}
			}
		}

		// Calculate how many slots have been purchased (unlocked - start slots)
		const slotsPurchased = this.getUnlockedCount(grid) - START_POSITIONS.length;

		// All available slots have the same cost (based on purchase count)
		const cost = calculateSlotCost(slotsPurchased);

		// Create purchase options with costs
		const options: SlotPurchaseOption[] = [];

		for (const position of availablePositions) {
			const ringDistance = Math.ceil(GridUtils.getRingDistance(position));
			const adjacentUnlocked = GridUtils.getAdjacentPositions(position).filter((p) =>
				unlockedPositions.has(p)
			);

			options.push({
				position,
				coords: GridUtils.positionToCoords(position),
				cost, // All slots have the same cost now
				ringDistance, // Keep for reference (position info)
				adjacentUnlocked
			});
		}

		// Sort by position (no cost difference anymore)
		return options.sort((a, b) => a.position - b.position);
	}

	/**
	 * Get the cost to unlock a specific slot
	 * @returns Cost, or null if slot is not available for purchase
	 */
	getSlotCost(grid: GridSlot[], position: number): number | null {
		const options = this.getAvailableSlotOptions(grid);
		const option = options.find((o) => o.position === position);
		return option?.cost ?? null;
	}

	/**
	 * Check if a slot can be purchased
	 */
	canPurchaseSlot(state: IdlePixelGameState, position: number): boolean {
		const cost = this.getSlotCost(state.grid, position);
		if (cost === null) return false;
		return state.currency >= cost;
	}

	/**
	 * Purchase a slot and unlock it
	 * @returns Updated state, or null if purchase failed
	 */
	purchaseSlot(state: IdlePixelGameState, position: number): IdlePixelGameState | null {
		const options = this.getAvailableSlotOptions(state.grid);
		const option = options.find((o) => o.position === position);

		if (!option) {
			console.warn('Slot is not available for purchase:', position);
			return null;
		}

		if (state.currency < option.cost) {
			console.warn('Not enough currency to purchase slot');
			return null;
		}

		// Unlock the slot
		const newGrid = [...state.grid];
		newGrid[position] = {
			...newGrid[position],
			unlocked: true
		};

		return {
			...state,
			currency: state.currency - option.cost,
			grid: newGrid
		};
	}

	/**
	 * Get grid dimensions for rendering
	 */
	getGridDimensions(): { rows: number; cols: number; total: number } {
		return {
			rows: GRID_SIZE,
			cols: GRID_SIZE,
			total: GRID_TOTAL_SLOTS
		};
	}

	/**
	 * Get the visual bounds of unlocked slots
	 * Useful for centering the view on active area
	 */
	getUnlockedBounds(grid: GridSlot[]): {
		minX: number;
		maxX: number;
		minY: number;
		maxY: number;
		centerX: number;
		centerY: number;
	} {
		let minX = GRID_SIZE;
		let maxX = 0;
		let minY = GRID_SIZE;
		let maxY = 0;

		for (const slot of grid) {
			if (slot.unlocked) {
				const coords = GridUtils.positionToCoords(slot.position);
				minX = Math.min(minX, coords.x);
				maxX = Math.max(maxX, coords.x);
				minY = Math.min(minY, coords.y);
				maxY = Math.max(maxY, coords.y);
			}
		}

		return {
			minX,
			maxX,
			minY,
			maxY,
			centerX: (minX + maxX) / 2,
			centerY: (minY + maxY) / 2
		};
	}

	/**
	 * Check if grid is full (no empty unlocked slots)
	 */
	isGridFull(grid: GridSlot[]): boolean {
		return this.getEmptySlotCount(grid) === 0;
	}

	/**
	 * Check if all slots are unlocked
	 */
	isFullyExpanded(grid: GridSlot[]): boolean {
		return this.getUnlockedCount(grid) === GRID_TOTAL_SLOTS;
	}

	/**
	 * Get progress towards full expansion (0-1)
	 */
	getExpansionProgress(grid: GridSlot[]): number {
		return this.getUnlockedCount(grid) / GRID_TOTAL_SLOTS;
	}
}

// Singleton instance
export const gridSystem = new GridSystem();
