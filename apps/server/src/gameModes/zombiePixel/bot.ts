// apps/server/src/gameModes/zombiePixel/bot.ts

import { randomInt } from 'crypto';
import { generateDiscriminator, createFullName, generateId } from '../../utils.js';
import type { User } from '../../types.js';
import type { ZombiePosition, ZombiePixelPlayer } from './types.js';
import { ZOMBIE_PIXEL_CONSTANTS } from './types.js';
import type { ItemSystemManager } from './itemSystem.js';

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

  /** Whether this bot has a healing item */
  hasHealingItem: boolean;

  /** Base number of ticks between moves (based on role speed) */
  private baseMoveCooldownTicks: number;

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
    this.hasHealingItem = false;

    // Base speed - will be adjusted based on role
    this.baseMoveCooldownTicks = ZOMBIE_PIXEL_CONSTANTS.SURVIVOR_BASE_SPEED;
    this.currentCooldown = 0;
    this.sightRange = ZOMBIE_PIXEL_CONSTANTS.BOT_SIGHT_RANGE;
  }

  /**
   * Gets the current movement cooldown based on role and effects.
   */
  private getMoveCooldownTicks(hasSpeedBoost: boolean): number {
    if (this.isZombie) {
      if (hasSpeedBoost) {
        return ZOMBIE_PIXEL_CONSTANTS.ZOMBIE_BOOST_SPEED;
      }
      return ZOMBIE_PIXEL_CONSTANTS.ZOMBIE_BASE_SPEED;
    }
    return ZOMBIE_PIXEL_CONSTANTS.SURVIVOR_BASE_SPEED;
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
      hasHealingItem: this.hasHealingItem,
    };
  }

  /**
   * Called every game tick. Returns new position if bot should move.
   * @param allPlayers - All players in the game (for pathfinding)
   * @param gridWidth - Width of the game grid
   * @param gridHeight - Height of the game grid
   * @param hasSpeedBoost - Whether zombies have speed boost active
   * @param itemManager - Item system manager for item awareness
   * @returns New position if bot moved, null otherwise
   */
  update(
    allPlayers: ZombiePixelPlayer[],
    gridWidth: number,
    gridHeight: number,
    hasSpeedBoost: boolean = false,
    itemManager?: ItemSystemManager
  ): ZombiePosition | null {
    // Dead bots don't move (they're zombies now, handled by isZombie)
    if (!this.isAlive && !this.isZombie) return null;

    // Get current movement cooldown based on role and effects
    const moveCooldown = this.getMoveCooldownTicks(hasSpeedBoost);

    // Cooldown check
    if (this.currentCooldown > 0) {
      this.currentCooldown--;
      return null;
    }

    // Check for nearby items first (if item manager provided)
    if (itemManager) {
      const itemTarget = this.findItemTarget(itemManager, gridWidth, gridHeight);
      if (itemTarget) {
        const newPos = this.calculateNextMove(itemTarget, gridWidth, gridHeight, false);
        this.currentCooldown = moveCooldown;
        return newPos;
      }
    }

    // Find target based on role (player or zombie to chase/flee)
    const target = this.findTarget(allPlayers);

    if (!target) {
      // No target found, random move occasionally
      if (Math.random() < 0.05) {
        const newPos = this.randomMove(gridWidth, gridHeight);
        this.currentCooldown = moveCooldown;
        return newPos;
      }
      return null;
    }

    // Calculate next move (zombies chase, survivors flee)
    // But if zombie is chasing a survivor with healing item, be more cautious
    const avoidHealers = this.isZombie && this.shouldAvoidHealers(allPlayers, target);
    const newPos = this.calculateNextMove(target, gridWidth, gridHeight, avoidHealers);
    this.currentCooldown = moveCooldown;

    return newPos;
  }

  /**
   * Find nearby item to collect (based on visibility).
   */
  private findItemTarget(
    itemManager: ItemSystemManager,
    _gridWidth: number,
    _gridHeight: number
  ): ZombiePosition | null {
    const visibleItems = itemManager.getVisibleItems(this.isZombie);
    if (visibleItems.length === 0) return null;

    // Find closest item within sight range
    let closest: ZombiePosition | null = null;
    let closestDist = Infinity;

    for (const item of visibleItems) {
      const dist = Math.abs(this.position.x - item.position.x) +
                   Math.abs(this.position.y - item.position.y);

      if (dist <= this.sightRange && dist < closestDist) {
        closestDist = dist;
        closest = item.position;
      }
    }

    return closest;
  }

  /**
   * Check if zombie should avoid this target (has healing item).
   */
  private shouldAvoidHealers(players: ZombiePixelPlayer[], target: ZombiePosition): boolean {
    // Check if target position has a player with healing item
    for (const player of players) {
      if (!player.isZombie &&
          player.hasHealingItem &&
          player.position.x === target.x &&
          player.position.y === target.y) {
        // 70% chance to avoid players with healing items
        return Math.random() < 0.7;
      }
    }
    return false;
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
   * @param avoidTarget - If true, maximize distance instead of minimize (for avoiding healers)
   * @returns New position after move
   */
  private calculateNextMove(
    target: ZombiePosition,
    gridWidth: number,
    gridHeight: number,
    avoidTarget: boolean = false
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
    // Determine whether to minimize or maximize distance
    const shouldChase = this.isZombie && !avoidTarget;
    const shouldFlee = !this.isZombie || avoidTarget;
    let bestScore = shouldChase ? Infinity : -1;

    for (const move of moves) {
      const newX = this.position.x + move.x;
      const newY = this.position.y + move.y;

      // Check bounds
      if (newX < 0 || newX >= gridWidth || newY < 0 || newY >= gridHeight) {
        continue;
      }

      const dist = Math.abs(newX - target.x) + Math.abs(newY - target.y);

      if (shouldChase) {
        // Chase: minimize distance
        if (dist < bestScore) {
          bestScore = dist;
          bestMove = { x: newX, y: newY };
        }
      } else if (shouldFlee) {
        // Flee: maximize distance
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
    this.hasHealingItem = false;  // Lose healing item on infection
  }

  /**
   * Called when this bot gets healed (converted back to survivor).
   */
  heal(): void {
    this.isAlive = true;
    this.isZombie = false;
    this.infectedAt = undefined;
    this.infectedBy = undefined;
  }
}
