// apps/server/src/bots/handlers/DrawingHandler.ts
// Bot drawing phase handlers

import { randomInt } from 'crypto';
import type { Server } from 'socket.io';
import type { Instance, Submission } from '../../types.js';
import type { Bot, BotConfig } from '../types.js';
import { generateRandomDrawing } from '../drawing/index.js';
import { CANVAS } from '../../constants.js';
import { log } from '../../utils.js';

/**
 * Random number between min and max (inclusive)
 */
function randomBetween(min: number, max: number): number {
  return randomInt(min, max + 1);
}

export interface DrawingHandlerContext {
  io: Server | null;
  onDisconnect: (bot: Bot, instance: Instance) => void;
}

/**
 * Handler for bot drawing phases
 */
export class DrawingHandler {
  private context: DrawingHandlerContext;

  constructor(context: DrawingHandlerContext) {
    this.context = context;
  }

  /**
   * Handle bot drawing phase (standard mode)
   */
  handleDrawingPhase(bot: Bot, instance: Instance, config: BotConfig): void {
    // Check if already submitted
    if (instance.submissions.some((s) => s.playerId === bot.playerId)) {
      return;
    }

    // AFK chance
    if (randomInt(0, 100) < config.afkChance * 100) {
      log('Debug', `Bot ${bot.user.fullName} is AFK, won't draw`);
      return;
    }

    // Disconnect chance
    if (randomInt(0, 100) < config.disconnectChance * 100) {
      this.context.onDisconnect(bot, instance);
      return;
    }

    // Draw after delay
    const delay = randomBetween(config.drawTime.min, config.drawTime.max);
    const drawTimer = setTimeout(() => {
      if (bot.isActive && instance.phase === 'drawing') {
        const pixels = generateRandomDrawing();
        this.submitDrawing(bot, instance, pixels);
      }
    }, delay);

    bot.timers.push(drawTimer);
  }

  /**
   * Handle bot royale drawing phase (CopyCat Royale mode)
   */
  handleRoyaleDrawingPhase(bot: Bot, instance: Instance, config: BotConfig): void {
    // Check if already submitted
    if (instance.submissions.some((s) => s.playerId === bot.playerId)) {
      return;
    }

    // AFK chance (reduced for royale to ensure enough participants)
    if (randomInt(0, 100) < config.afkChance * 50) {
      log('Debug', `Bot ${bot.user.fullName} is AFK in royale, won't draw`);
      return;
    }

    // Draw after delay
    const delay = randomBetween(config.drawTime.min, config.drawTime.max);
    const drawTimer = setTimeout(() => {
      if (bot.isActive && (instance.phase === 'royale-initial-drawing' || instance.phase === 'royale-drawing')) {
        const pixels = generateRandomDrawing();
        this.submitDrawing(bot, instance, pixels);
      }
    }, delay);

    bot.timers.push(drawTimer);
  }

  /**
   * Submit a drawing for a bot
   */
  private submitDrawing(bot: Bot, instance: Instance, pixels: string): void {
    // Check if already submitted
    if (instance.submissions.some((s) => s.playerId === bot.playerId)) {
      return;
    }

    // Verify minimum pixels
    let setPixels = 0;
    for (const pixel of pixels) {
      if (pixel !== CANVAS.BACKGROUND_COLOR) setPixels++;
    }

    if (setPixels < CANVAS.MIN_PIXELS_SET) {
      log('Debug', `Bot ${bot.user.fullName} drawing invalid: only ${setPixels} pixels set`);
      return;
    }

    const submission: Submission = {
      playerId: bot.playerId,
      pixels: pixels.toUpperCase(),
      timestamp: Date.now(),
    };

    instance.submissions.push(submission);
    log('Debug', `Bot ${bot.user.fullName} submitted drawing (${setPixels} pixels)`);

    // Notify instance about submission count
    if (this.context.io) {
      this.context.io.to(instance.id).emit('submission-count', {
        count: instance.submissions.length,
        total: instance.players.size,
      });
    }
  }
}
