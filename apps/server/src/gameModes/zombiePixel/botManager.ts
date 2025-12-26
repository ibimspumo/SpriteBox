// apps/server/src/gameModes/zombiePixel/botManager.ts

import { randomInt } from 'crypto';
import { ZombiePixelBot } from './bot.js';
import type { ZombiePosition, ZombiePixelPlayer } from './types.js';
import { ZOMBIE_PIXEL_CONSTANTS } from './types.js';

/**
 * Manages the bot pool for Zombie Pixel game mode.
 * Handles creation, removal, and updates of all bots in an instance.
 */
export class ZombieBotManager {
  /** Map of bot ID to bot instance */
  private bots: Map<string, ZombiePixelBot> = new Map();

  /**
   * Gets all bots as an array.
   * @returns Array of all bots
   */
  getBots(): ZombiePixelBot[] {
    return Array.from(this.bots.values());
  }

  /**
   * Gets a bot by ID.
   * @param id - Bot ID to look up
   * @returns Bot instance or undefined if not found
   */
  getBot(id: string): ZombiePixelBot | undefined {
    return this.bots.get(id);
  }

  /**
   * Gets the current number of bots.
   */
  get count(): number {
    return this.bots.size;
  }

  /**
   * Creates bots to fill the lobby.
   * @param count - Number of bots to create
   * @param occupiedPositions - Positions already taken by real players
   * @returns Array of created bots as ZombiePixelPlayer
   */
  createBots(
    count: number,
    occupiedPositions: ZombiePosition[] = []
  ): ZombiePixelPlayer[] {
    const gridSize = ZOMBIE_PIXEL_CONSTANTS.GRID_SIZE;
    const createdBots: ZombiePixelPlayer[] = [];
    const allOccupied = new Set(occupiedPositions.map((p) => `${p.x},${p.y}`));

    for (let i = 0; i < count; i++) {
      // Find a random unoccupied position
      let position: ZombiePosition;
      let attempts = 0;
      const maxAttempts = 100;

      do {
        position = {
          x: randomInt(0, gridSize),
          y: randomInt(0, gridSize),
        };
        attempts++;
      } while (
        allOccupied.has(`${position.x},${position.y}`) &&
        attempts < maxAttempts
      );

      // Mark position as occupied
      allOccupied.add(`${position.x},${position.y}`);

      // Create bot
      const bot = new ZombiePixelBot(position);
      this.bots.set(bot.id, bot);
      createdBots.push(bot.toPlayer());
    }

    return createdBots;
  }

  /**
   * Removes a random bot from the pool.
   * @returns The removed bot's ID, or null if no bots
   */
  removeRandomBot(): string | null {
    if (this.bots.size === 0) return null;

    const botIds = Array.from(this.bots.keys());
    const randomIndex = randomInt(0, botIds.length);
    const botId = botIds[randomIndex];

    this.bots.delete(botId);
    return botId;
  }

  /**
   * Removes a specific bot by ID.
   * @param id - Bot ID to remove
   * @returns true if bot was found and removed, false otherwise
   */
  removeBot(id: string): boolean {
    return this.bots.delete(id);
  }

  /**
   * Removes multiple random bots.
   * @param count - Number of bots to remove
   * @returns Array of removed bot IDs
   */
  removeRandomBots(count: number): string[] {
    const removed: string[] = [];
    for (let i = 0; i < count && this.bots.size > 0; i++) {
      const id = this.removeRandomBot();
      if (id) removed.push(id);
    }
    return removed;
  }

  /**
   * Updates all bots for one game tick.
   * @param allPlayers - All players in the game (for pathfinding)
   * @returns Map of bot ID to new position (only bots that moved)
   */
  updateBots(allPlayers: ZombiePixelPlayer[]): Map<string, ZombiePosition> {
    const movements = new Map<string, ZombiePosition>();
    const gridSize = ZOMBIE_PIXEL_CONSTANTS.GRID_SIZE;

    for (const bot of this.bots.values()) {
      const newPos = bot.update(allPlayers, gridSize, gridSize);
      if (
        newPos &&
        (newPos.x !== bot.position.x || newPos.y !== bot.position.y)
      ) {
        bot.position = newPos;
        bot.lastMoveAt = Date.now();
        movements.set(bot.id, newPos);
      }
    }

    return movements;
  }

  /**
   * Gets all bots as ZombiePixelPlayer array.
   * @returns Array of all bots in ZombiePixelPlayer format
   */
  toPlayers(): ZombiePixelPlayer[] {
    return Array.from(this.bots.values()).map((bot) => bot.toPlayer());
  }

  /**
   * Infects a bot (turns them into a zombie).
   * @param botId - ID of the bot to infect
   * @param zombieId - ID of the zombie doing the infecting
   * @param timestamp - When the infection occurred
   * @returns true if bot was infected, false if not found or already zombie
   */
  infectBot(botId: string, zombieId: string, timestamp: number): boolean {
    const bot = this.bots.get(botId);
    if (!bot || bot.isZombie) return false;

    bot.infect(zombieId, timestamp);
    return true;
  }

  /**
   * Gets random bot IDs to become initial zombies.
   * @param count - Number of zombies needed
   * @returns Array of bot IDs selected as zombies
   */
  selectRandomZombies(count: number): string[] {
    const availableBots = Array.from(this.bots.values()).filter(
      (b) => !b.isZombie
    );
    const selected: string[] = [];

    // Fisher-Yates shuffle and pick
    const shuffled = [...availableBots];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = randomInt(0, i + 1);
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }

    for (let i = 0; i < Math.min(count, shuffled.length); i++) {
      const bot = shuffled[i];
      bot.isZombie = true;
      selected.push(bot.id);
    }

    return selected;
  }

  /**
   * Clears all bots.
   */
  clear(): void {
    this.bots.clear();
  }
}
