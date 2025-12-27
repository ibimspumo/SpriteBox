// apps/server/src/gameModes/zombiePixel/systems/MovementSystem.ts
// Player and bot movement system

import { randomInt } from 'crypto';
import type { ZombiePosition, ZombieDirection } from '../types.js';
import { ZOMBIE_PIXEL_CONSTANTS } from '../types.js';

/**
 * System for handling player and bot movement
 */
export class MovementSystem {
  private gridWidth: number;
  private gridHeight: number;

  constructor(gridWidth: number = 32, gridHeight: number = 32) {
    this.gridWidth = gridWidth;
    this.gridHeight = gridHeight;
  }

  /**
   * Calculate new position based on direction
   */
  calculateNewPosition(currentPos: ZombiePosition, direction: ZombieDirection): ZombiePosition {
    const newPos = { ...currentPos };

    switch (direction) {
      case 'up':
        newPos.y = Math.max(0, newPos.y - 1);
        break;
      case 'down':
        newPos.y = Math.min(this.gridHeight - 1, newPos.y + 1);
        break;
      case 'left':
        newPos.x = Math.max(0, newPos.x - 1);
        break;
      case 'right':
        newPos.x = Math.min(this.gridWidth - 1, newPos.x + 1);
        break;
      case 'up-left':
        newPos.y = Math.max(0, newPos.y - 1);
        newPos.x = Math.max(0, newPos.x - 1);
        break;
      case 'up-right':
        newPos.y = Math.max(0, newPos.y - 1);
        newPos.x = Math.min(this.gridWidth - 1, newPos.x + 1);
        break;
      case 'down-left':
        newPos.y = Math.min(this.gridHeight - 1, newPos.y + 1);
        newPos.x = Math.max(0, newPos.x - 1);
        break;
      case 'down-right':
        newPos.y = Math.min(this.gridHeight - 1, newPos.y + 1);
        newPos.x = Math.min(this.gridWidth - 1, newPos.x + 1);
        break;
    }

    return newPos;
  }

  /**
   * Check if movement is allowed (cooldown check)
   */
  canMove(lastMoveAt: number, moveCooldown: number): boolean {
    return Date.now() - lastMoveAt >= moveCooldown;
  }

  /**
   * Get a random unoccupied position
   */
  getRandomPosition(occupied: Set<string>): ZombiePosition {
    const gridSize = ZOMBIE_PIXEL_CONSTANTS.GRID_SIZE;
    let position: ZombiePosition;
    let attempts = 0;

    do {
      position = {
        x: randomInt(0, gridSize),
        y: randomInt(0, gridSize),
      };
      attempts++;
    } while (occupied.has(`${position.x},${position.y}`) && attempts < 100);

    return position;
  }
}
