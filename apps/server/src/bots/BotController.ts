// apps/server/src/bots/BotController.ts
// Core bot orchestration controller

import type { Server } from 'socket.io';
import type { Instance, Player } from '../types.js';
import type { Bot, BotBehavior, BotConfig } from './types.js';
import { DEBUG_CONFIG, BOT_BEHAVIORS, BOT_NAMES } from './config.js';
import { DrawingHandler } from './handlers/DrawingHandler.js';
import { VotingHandler } from './handlers/VotingHandler.js';
import { generateRandomDrawing } from './drawing/index.js';
import {
  findOrCreatePublicInstance,
  addPlayerToInstance,
  removePlayerFromInstance,
  findInstance,
} from '../instance.js';
import { generateId, generateDiscriminator, createFullName, log, randomItem } from '../utils.js';
import { MAX_PLAYERS_PER_INSTANCE } from '../constants.js';

/**
 * Central controller for managing bot instances
 */
export class BotController {
  private bots: Map<string, Bot> = new Map();
  private io: Server | null = null;
  private drawingHandler: DrawingHandler;
  private votingHandler: VotingHandler;

  constructor() {
    // Initialize handlers with callbacks
    this.drawingHandler = new DrawingHandler({
      io: null,
      onDisconnect: this.simulateDisconnect.bind(this),
    });

    this.votingHandler = new VotingHandler({
      onDisconnect: this.simulateDisconnect.bind(this),
    });
  }

  /**
   * Set Socket.io server reference
   */
  setIo(io: Server): void {
    this.io = io;
    // Update handler context
    // @ts-expect-error: Updating private property for dependency injection
    this.drawingHandler.context.io = io;
  }

  /**
   * Create a new bot with given behavior
   */
  createBot(behavior: BotBehavior = 'normal'): Bot {
    const name = randomItem(BOT_NAMES);
    const discriminator = generateDiscriminator();
    const playerId = `bot_${generateId(8)}`;

    const bot: Bot = {
      id: generateId(8),
      playerId,
      user: {
        displayName: `${DEBUG_CONFIG.botPrefix}${name}`,
        discriminator,
        fullName: createFullName(`${DEBUG_CONFIG.botPrefix}${name}`, discriminator),
      },
      behavior,
      isActive: true,
      instanceId: null,
      timers: [],
    };

    this.bots.set(bot.id, bot);
    log('Debug', `Created bot: ${bot.user.fullName} (${behavior})`);
    return bot;
  }

  /**
   * Add bots to a specific instance (creates new instances when full)
   */
  addBotsToInstance(instance: Instance, count: number, behavior: BotBehavior = 'normal'): Bot[] {
    const addedBots: Bot[] = [];
    let currentInstance = instance;

    for (let i = 0; i < count; i++) {
      if (this.bots.size >= DEBUG_CONFIG.maxBots) {
        log('Debug', `Max bot limit (${DEBUG_CONFIG.maxBots}) reached`);
        break;
      }

      // Check if current instance is full - create new one if needed
      if (currentInstance.players.size >= MAX_PLAYERS_PER_INSTANCE) {
        log(
          'Debug',
          `Instance ${currentInstance.id} is full (${currentInstance.players.size}/${MAX_PLAYERS_PER_INSTANCE}), creating new instance`
        );
        currentInstance = findOrCreatePublicInstance();
        log('Debug', `New instance created: ${currentInstance.id}`);
      }

      const bot = this.createBot(behavior);

      // Create player object for this bot
      const player: Player = {
        id: bot.playerId,
        sessionId: `bot_session_${bot.id}`,
        user: bot.user,
        socketId: `bot_socket_${bot.id}`,
        joinedAt: Date.now(),
        status: 'connected',
      };

      const result = addPlayerToInstance(currentInstance, player);

      if (result.success && !result.spectator) {
        bot.instanceId = currentInstance.id;
        addedBots.push(bot);
        this.setupBotBehavior(bot, currentInstance);

        // Broadcast to all clients that a new player joined (like real players)
        if (this.io) {
          this.io.to(currentInstance.id).emit('player-joined', { user: bot.user });
        }

        log('Debug', `Bot ${bot.user.fullName} joined instance ${currentInstance.id}`);
      } else {
        // Remove bot if couldn't join
        this.bots.delete(bot.id);
      }
    }

    const instanceCount = new Set(addedBots.map((b) => b.instanceId)).size;
    log('Debug', `Added ${addedBots.length} ${behavior} bots across ${instanceCount} instance(s)`);
    return addedBots;
  }

  /**
   * Setup bot behavior listeners
   */
  private setupBotBehavior(bot: Bot, instance: Instance): void {
    const config = BOT_BEHAVIORS[bot.behavior];

    // Monitor phase changes
    this.monitorPhaseChanges(bot, instance, config);
  }

  /**
   * Monitor instance phase changes and react accordingly
   */
  private monitorPhaseChanges(bot: Bot, instance: Instance, config: BotConfig): void {
    // Poll for phase changes (simplified approach without socket events)
    const checkInterval = setInterval(() => {
      if (!bot.isActive || bot.instanceId !== instance.id) {
        clearInterval(checkInterval);
        return;
      }

      const currentInstance = findInstance(instance.id);
      if (!currentInstance) {
        clearInterval(checkInterval);
        return;
      }

      // Handle different phases using handlers
      switch (currentInstance.phase) {
        case 'drawing':
          this.drawingHandler.handleDrawingPhase(bot, currentInstance, config);
          break;
        case 'voting':
          this.votingHandler.handleVotingPhase(bot, currentInstance, config);
          break;
        case 'finale':
          this.votingHandler.handleFinalePhase(bot, currentInstance, config);
          break;
        case 'royale-initial-drawing':
        case 'royale-drawing':
          this.drawingHandler.handleRoyaleDrawingPhase(bot, currentInstance, config);
          break;
      }
    }, 500);

    bot.timers.push(checkInterval);
  }

  /**
   * Simulate a bot disconnecting
   */
  private simulateDisconnect(bot: Bot, instance: Instance): void {
    log('Debug', `Bot ${bot.user.fullName} disconnected (simulated)`);
    bot.isActive = false;

    // Clear all timers
    bot.timers.forEach((t) => clearTimeout(t));
    bot.timers = [];

    // Remove from instance
    removePlayerFromInstance(instance, bot.playerId);

    // Notify others
    if (this.io) {
      this.io.to(instance.id).emit('player-left', { playerId: bot.playerId, user: bot.user });
    }

    // Remove bot
    this.bots.delete(bot.id);
  }

  /**
   * Remove a specific bot
   */
  removeBot(botId: string): boolean {
    const bot = this.bots.get(botId);
    if (!bot) return false;

    bot.isActive = false;
    bot.timers.forEach((t) => clearTimeout(t));
    bot.timers = [];

    if (bot.instanceId) {
      const instance = findInstance(bot.instanceId);
      if (instance) {
        removePlayerFromInstance(instance, bot.playerId);
        if (this.io) {
          this.io.to(instance.id).emit('player-left', { playerId: bot.playerId, user: bot.user });
        }
      }
    }

    this.bots.delete(botId);
    log('Debug', `Removed bot ${bot.user.fullName}`);
    return true;
  }

  /**
   * Remove all bots from a specific instance
   */
  removeBotsFromInstance(instanceId: string): number {
    let removed = 0;

    for (const [id, bot] of this.bots) {
      if (bot.instanceId === instanceId) {
        this.removeBot(id);
        removed++;
      }
    }

    log('Debug', `Removed ${removed} bots from instance ${instanceId}`);
    return removed;
  }

  /**
   * Remove all bots
   */
  removeAllBots(): number {
    const count = this.bots.size;

    for (const [id] of this.bots) {
      this.removeBot(id);
    }

    log('Debug', `Removed all ${count} bots`);
    return count;
  }

  /**
   * Get all bots
   */
  getBots(): Bot[] {
    return Array.from(this.bots.values());
  }

  /**
   * Get bot count
   */
  getBotCount(): number {
    return this.bots.size;
  }

  /**
   * Get bots for a specific instance
   */
  getBotsForInstance(instanceId: string): Bot[] {
    return Array.from(this.bots.values()).filter((b) => b.instanceId === instanceId);
  }

  /**
   * Generate a random drawing (exposed for external use)
   */
  generateRandomDrawing(): string {
    return generateRandomDrawing();
  }
}

// Singleton instance
export const botController = new BotController();
