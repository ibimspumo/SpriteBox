// apps/server/src/gameModes/zombiePixel/bot.ts

import { randomInt } from 'crypto';
import { generateDiscriminator, createFullName, generateId } from '../../utils.js';
import type { User } from '../../types.js';
import type { ZombiePosition, ZombiePixelPlayer } from './types.js';
import { ZOMBIE_PIXEL_CONSTANTS } from './types.js';

/**
 * Guest names for bot naming (same as real players use).
 * This makes bots indistinguishable from players who haven't set a name.
 */
const GUEST_NAMES = [
  'Pixel', 'Artist', 'Painter', 'Doodler', 'Sketcher',
  'Creator', 'Designer', 'Drawer', 'Crafter', 'Maker',
];

/**
 * Bot AI for Zombie Pixel game mode.
 * Uses Manhattan distance for pathfinding and has intentional "mistakes"
 * to feel more human-like.
 */
export class ZombiePixelBot {
  /** Unique bot ID */
  id: string;

  /** Session ID for bot (mimics real player structure) */
  sessionId: string;

  /** User display info (name, discriminator) */
  user: User;

  /** Whether this bot is a zombie */
  isZombie: boolean;

  /** Current position on the grid */
  position: ZombiePosition;

  /** Whether the bot is still alive (not infected) */
  isAlive: boolean;

  /** Last movement timestamp */
  lastMoveAt: number;

  /** When this bot was infected (timestamp) */
  infectedAt?: number;

  /** ID of the player who infected this bot */
  infectedBy?: string;

  /** Number of ticks between moves (randomized per bot) */
  private moveCooldownTicks: number;

  /** Current cooldown counter */
  private currentCooldown: number;

  /** How far the bot can "see" for pathfinding */
  private sightRange: number;

  /**
   * Creates a new ZombiePixelBot at the specified position.
   * @param startPosition - Initial grid position for the bot
   */
  constructor(startPosition: ZombiePosition) {
    this.id = `bot_${generateId(8)}`;
    this.sessionId = `session_bot_${generateId(8)}`;

    // Generate authentic-looking name
    const displayName = GUEST_NAMES[randomInt(0, GUEST_NAMES.length)];
    const discriminator = generateDiscriminator();

    this.user = {
      displayName,
      discriminator,
      fullName: createFullName(displayName, discriminator),
    };

    this.isZombie = false;
    this.position = { ...startPosition };
    this.isAlive = true;
    this.lastMoveAt = 0;

    // Randomize bot speed (2-4 ticks between moves)
    // At 20 ticks/sec (50ms tick rate), this means 100-200ms between moves
    this.moveCooldownTicks = randomInt(2, 5);
    this.currentCooldown = 0;
    this.sightRange = ZOMBIE_PIXEL_CONSTANTS.BOT_SIGHT_RANGE;
  }

  /**
   * Converts bot to ZombiePixelPlayer format for external use.
   * @returns ZombiePixelPlayer representation of this bot
   */
  toPlayer(): ZombiePixelPlayer {
    return {
      id: this.id,
      sessionId: this.sessionId,
      user: this.user,
      isBot: true,
      isZombie: this.isZombie,
      position: { ...this.position },
      isAlive: this.isAlive,
      lastMoveAt: this.lastMoveAt,
      infectedAt: this.infectedAt,
      infectedBy: this.infectedBy,
    };
  }

  /**
   * Called every game tick. Returns new position if bot should move.
   * @param allPlayers - All players in the game (for pathfinding)
   * @param gridWidth - Width of the game grid
   * @param gridHeight - Height of the game grid
   * @returns New position if bot moved, null otherwise
   */
  update(
    allPlayers: ZombiePixelPlayer[],
    gridWidth: number,
    gridHeight: number
  ): ZombiePosition | null {
    // Dead bots don't move (they're zombies now, handled by isZombie)
    if (!this.isAlive && !this.isZombie) return null;

    // Cooldown check
    if (this.currentCooldown > 0) {
      this.currentCooldown--;
      return null;
    }

    // Find target based on role
    const target = this.findTarget(allPlayers);

    if (!target) {
      // No target found, random move occasionally
      if (Math.random() < 0.05) {
        const newPos = this.randomMove(gridWidth, gridHeight);
        this.currentCooldown = this.moveCooldownTicks;
        return newPos;
      }
      return null;
    }

    // Calculate next move
    const newPos = this.calculateNextMove(target, gridWidth, gridHeight);
    this.currentCooldown = this.moveCooldownTicks;

    return newPos;
  }

  /**
   * Finds the nearest target based on role.
   * - Zombies look for survivors
   * - Survivors look for zombies (to run away from)
   * @param players - All players in the game
   * @returns Position of nearest target, or null if none found
   */
  private findTarget(players: ZombiePixelPlayer[]): ZombiePosition | null {
    let nearestDist = Infinity;
    let target: ZombiePosition | null = null;

    // If zombie: find nearest survivor. If survivor: find nearest zombie.
    const lookingForZombie = !this.isZombie;

    for (const player of players) {
      // Skip self
      if (player.id === this.id) continue;

      // Skip players of same type
      if (player.isZombie !== lookingForZombie) continue;

      // Calculate Manhattan distance
      const dist =
        Math.abs(this.position.x - player.position.x) +
        Math.abs(this.position.y - player.position.y);

      // Only consider targets within sight range
      if (dist < nearestDist && dist <= this.sightRange) {
        nearestDist = dist;
        target = player.position;
      }
    }

    return target;
  }

  /**
   * Calculates the next move towards (zombie) or away from (survivor) target.
   * @param target - Target position to move towards/away from
   * @param gridWidth - Width of the game grid
   * @param gridHeight - Height of the game grid
   * @returns New position after move
   */
  private calculateNextMove(
    target: ZombiePosition,
    gridWidth: number,
    gridHeight: number
  ): ZombiePosition {
    const moves = [
      { x: 0, y: -1 }, // Up
      { x: 0, y: 1 }, // Down
      { x: -1, y: 0 }, // Left
      { x: 1, y: 0 }, // Right
    ];

    // Random chance of making a random move (makes bots feel more human)
    if (Math.random() < ZOMBIE_PIXEL_CONSTANTS.BOT_RANDOM_MOVE_CHANCE) {
      return this.randomMove(gridWidth, gridHeight);
    }

    let bestMove = this.position;
    // Zombies minimize distance, survivors maximize distance
    let bestScore = this.isZombie ? Infinity : -1;

    for (const move of moves) {
      const newX = this.position.x + move.x;
      const newY = this.position.y + move.y;

      // Check bounds
      if (newX < 0 || newX >= gridWidth || newY < 0 || newY >= gridHeight) {
        continue;
      }

      const dist = Math.abs(newX - target.x) + Math.abs(newY - target.y);

      if (this.isZombie) {
        // Zombie: minimize distance
        if (dist < bestScore) {
          bestScore = dist;
          bestMove = { x: newX, y: newY };
        }
      } else {
        // Survivor: maximize distance
        if (dist > bestScore) {
          bestScore = dist;
          bestMove = { x: newX, y: newY };
        }
      }
    }

    return bestMove;
  }

  /**
   * Makes a random valid move.
   * @param gridWidth - Width of the game grid
   * @param gridHeight - Height of the game grid
   * @returns Random valid position adjacent to current position
   */
  private randomMove(gridWidth: number, gridHeight: number): ZombiePosition {
    const moves = [
      { x: 0, y: -1 },
      { x: 0, y: 1 },
      { x: -1, y: 0 },
      { x: 1, y: 0 },
    ];

    const validMoves: ZombiePosition[] = [];

    for (const move of moves) {
      const newX = this.position.x + move.x;
      const newY = this.position.y + move.y;

      if (newX >= 0 && newX < gridWidth && newY >= 0 && newY < gridHeight) {
        validMoves.push({ x: newX, y: newY });
      }
    }

    if (validMoves.length === 0) {
      return this.position;
    }

    return validMoves[randomInt(0, validMoves.length)];
  }

  /**
   * Called when this bot gets infected.
   * @param zombieId - ID of the zombie that infected this bot
   * @param timestamp - When the infection occurred
   */
  infect(zombieId: string, timestamp: number): void {
    this.isAlive = false;
    this.isZombie = true;
    this.infectedAt = timestamp;
    this.infectedBy = zombieId;
  }
}
