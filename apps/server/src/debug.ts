// apps/server/src/debug.ts
// Debug & Bot System - Only active in development mode

import type { Express, Request, Response, NextFunction } from 'express';
import type { Server } from 'socket.io';
import express from 'express';
import type { Instance, Player, User, VotingAssignment, Submission } from './types.js';
import {
  findOrCreatePublicInstance,
  addPlayerToInstance,
  removePlayerFromInstance,
  findInstance,
  getInstanceStats,
  startGameManually,
} from './instance.js';
import { getVotingState } from './phases.js';
import { processVote, processFinaleVote, type VotingState } from './voting.js';
import { generateId, generateDiscriminator, createFullName, log, randomItem, shuffleArray } from './utils.js';
import { CANVAS, TIMERS } from './constants.js';

// === Debug Configuration ===
export const DEBUG_CONFIG = {
  enabled: process.env.NODE_ENV !== 'production',
  botPrefix: 'Bot_',
  defaultBotCount: 10,
  maxBots: 100,
};

// === Bot Types ===
export type BotBehavior = 'normal' | 'slow' | 'afk' | 'disconnector' | 'fast';

interface BotConfig {
  voteDelay: { min: number; max: number };
  drawTime: { min: number; max: number };
  disconnectChance: number;
  afkChance: number;
}

export const BOT_BEHAVIORS: Record<BotBehavior, BotConfig> = {
  normal: {
    voteDelay: { min: 1000, max: 4000 },
    drawTime: { min: 5000, max: 25000 },
    disconnectChance: 0.02,
    afkChance: 0.05,
  },
  slow: {
    voteDelay: { min: 3500, max: 4800 },
    drawTime: { min: 20000, max: 28000 },
    disconnectChance: 0.01,
    afkChance: 0.1,
  },
  afk: {
    voteDelay: { min: 0, max: 0 },
    drawTime: { min: 0, max: 0 },
    disconnectChance: 0,
    afkChance: 1.0,  // Always AFK
  },
  disconnector: {
    voteDelay: { min: 1000, max: 2000 },
    drawTime: { min: 5000, max: 15000 },
    disconnectChance: 0.3,
    afkChance: 0,
  },
  fast: {
    voteDelay: { min: 100, max: 500 },
    drawTime: { min: 3500, max: 5000 },
    disconnectChance: 0,
    afkChance: 0,
  },
};

// === Bot Names ===
const BOT_NAMES = [
  'Pixel', 'Doodle', 'Sketch', 'Draw', 'Art', 'Canvas',
  'Brush', 'Paint', 'Color', 'Line', 'Shape', 'Blob',
  'Scribble', 'Squiggle', 'Dot', 'Stroke', 'Mark', 'Trace',
  'Splat', 'Smudge', 'Swirl', 'Zigzag', 'Star', 'Moon',
];

// === Bot Interface ===
interface Bot {
  id: string;
  playerId: string;
  user: User;
  behavior: BotBehavior;
  isActive: boolean;
  instanceId: string | null;
  timers: NodeJS.Timeout[];
}

// === Bot Controller ===
class BotController {
  private bots: Map<string, Bot> = new Map();
  private io: Server | null = null;

  setIo(io: Server): void {
    this.io = io;
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
   * Add bots to a specific instance
   */
  addBotsToInstance(instance: Instance, count: number, behavior: BotBehavior = 'normal'): Bot[] {
    const addedBots: Bot[] = [];

    for (let i = 0; i < count; i++) {
      if (this.bots.size >= DEBUG_CONFIG.maxBots) {
        log('Debug', `Max bot limit (${DEBUG_CONFIG.maxBots}) reached`);
        break;
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

      const result = addPlayerToInstance(instance, player);

      if (result.success && !result.spectator) {
        bot.instanceId = instance.id;
        addedBots.push(bot);
        this.setupBotBehavior(bot, instance);

        // Broadcast to all clients that a new player joined (like real players)
        if (this.io) {
          this.io.to(instance.id).emit('player-joined', { user: bot.user });
        }

        log('Debug', `Bot ${bot.user.fullName} joined instance ${instance.id}`);
      } else {
        // Remove bot if couldn't join
        this.bots.delete(bot.id);
      }
    }

    log('Debug', `Added ${addedBots.length} ${behavior} bots to instance ${instance.id}`);
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

      // Handle different phases
      switch (currentInstance.phase) {
        case 'drawing':
          this.handleDrawingPhase(bot, currentInstance, config);
          break;
        case 'voting':
          this.handleVotingPhase(bot, currentInstance, config);
          break;
        case 'finale':
          this.handleFinalePhase(bot, currentInstance, config);
          break;
      }
    }, 500);

    bot.timers.push(checkInterval);
  }

  /**
   * Handle bot drawing phase
   */
  private handleDrawingPhase(bot: Bot, instance: Instance, config: BotConfig): void {
    // Check if already submitted
    if (instance.submissions.some(s => s.playerId === bot.playerId)) {
      return;
    }

    // AFK chance
    if (Math.random() < config.afkChance) {
      log('Debug', `Bot ${bot.user.fullName} is AFK, won't draw`);
      return;
    }

    // Disconnect chance
    if (Math.random() < config.disconnectChance) {
      this.simulateDisconnect(bot, instance);
      return;
    }

    // Draw after delay
    const delay = randomBetween(config.drawTime.min, config.drawTime.max);
    const drawTimer = setTimeout(() => {
      if (bot.isActive && instance.phase === 'drawing') {
        const pixels = this.generateRandomDrawing();
        this.submitDrawing(bot, instance, pixels);
      }
    }, delay);

    bot.timers.push(drawTimer);
  }

  /**
   * Handle bot voting phase
   */
  private handleVotingPhase(bot: Bot, instance: Instance, config: BotConfig): void {
    const state = getVotingState(instance.id);
    if (!state) return;

    // Check if bot has an assignment for current round
    const assignment = state.assignments.find(a => a.voterId === bot.playerId);
    if (!assignment) return;

    // Check if already voted
    if (state.votersVoted.has(bot.playerId)) return;

    // AFK chance
    if (Math.random() < config.afkChance) {
      return;
    }

    // Disconnect chance
    if (Math.random() < config.disconnectChance) {
      this.simulateDisconnect(bot, instance);
      return;
    }

    // Vote after delay
    const delay = randomBetween(config.voteDelay.min, config.voteDelay.max);
    const voteTimer = setTimeout(() => {
      if (bot.isActive && instance.phase === 'voting') {
        this.submitVote(bot, instance, state, assignment);
      }
    }, delay);

    bot.timers.push(voteTimer);
  }

  /**
   * Handle bot finale phase
   */
  private handleFinalePhase(bot: Bot, instance: Instance, config: BotConfig): void {
    const state = getVotingState(instance.id);
    if (!state || state.finalists.length === 0) return;

    // Check if already voted in finale
    if (state.votersVoted.has(bot.playerId)) return;

    // AFK chance
    if (Math.random() < config.afkChance) {
      return;
    }

    // Vote after delay
    const delay = randomBetween(config.voteDelay.min, config.voteDelay.max);
    const finaleTimer = setTimeout(() => {
      if (bot.isActive && instance.phase === 'finale') {
        this.submitFinaleVote(bot, instance, state);
      }
    }, delay);

    bot.timers.push(finaleTimer);
  }

  /**
   * Generate a random drawing with at least MIN_PIXELS_SET colored pixels
   */
  generateRandomDrawing(): string {
    const patterns = [
      () => this.generateSmiley(),
      () => this.generateHouse(),
      () => this.generateHeart(),
      () => this.generateTree(),
      () => this.generateStar(),
      () => this.generateRandom(),
      () => this.generateStripes(),
      () => this.generateCheckerboard(),
    ];

    const pattern = randomItem(patterns);
    return pattern();
  }

  /**
   * Generate a smiley face
   */
  private generateSmiley(): string {
    // 8x8 smiley face
    const grid = [
      '11111111',
      '11566511',
      '15666651',
      '56006061',
      '56666661',
      '56066061',
      '15666651',
      '11566511',
    ];
    return grid.join('');
  }

  /**
   * Generate a simple house
   */
  private generateHouse(): string {
    const grid = [
      '11122111',
      '11222211',
      '12222221',
      '11FFFF11',
      '11F00F11',
      '11F00F11',
      '11FFFF11',
      '11111111',
    ];
    return grid.join('');
  }

  /**
   * Generate a heart
   */
  private generateHeart(): string {
    const grid = [
      '11211211',
      '12221221',
      '22222221',
      '22222221',
      '12222221',
      '11222211',
      '11122111',
      '11111111',
    ];
    return grid.join('');
  }

  /**
   * Generate a tree
   */
  private generateTree(): string {
    const grid = [
      '11133111',
      '11333311',
      '13333331',
      '33333333',
      '1133F111',
      '1133F111',
      '11FFF111',
      '11111111',
    ];
    return grid.join('');
  }

  /**
   * Generate a star
   */
  private generateStar(): string {
    const grid = [
      '11151111',
      '11151111',
      '55555555',
      '11555111',
      '11555111',
      '11515111',
      '15111151',
      '11111111',
    ];
    return grid.join('');
  }

  /**
   * Generate random colored pixels (guaranteed minimum)
   */
  private generateRandom(): string {
    let pixels = '';
    // Fill with white background
    for (let i = 0; i < CANVAS.TOTAL_PIXELS; i++) {
      pixels += CANVAS.BACKGROUND_COLOR;
    }

    // Add at least MIN_PIXELS_SET + some extra random colored pixels
    const colorCount = randomBetween(CANVAS.MIN_PIXELS_SET + 2, CANVAS.TOTAL_PIXELS / 2);
    const usedPositions = new Set<number>();
    const colors = '023456789ABCDEF'; // All colors except white (1)

    for (let i = 0; i < colorCount; i++) {
      let pos: number;
      do {
        pos = Math.floor(Math.random() * CANVAS.TOTAL_PIXELS);
      } while (usedPositions.has(pos));

      usedPositions.add(pos);
      const color = colors[Math.floor(Math.random() * colors.length)];
      pixels = pixels.substring(0, pos) + color + pixels.substring(pos + 1);
    }

    return pixels;
  }

  /**
   * Generate stripes pattern
   */
  private generateStripes(): string {
    let pixels = '';
    const colors = '023456789ABCDEF';
    const color1 = colors[Math.floor(Math.random() * colors.length)];
    const color2 = colors[Math.floor(Math.random() * colors.length)];

    for (let y = 0; y < 8; y++) {
      for (let x = 0; x < 8; x++) {
        pixels += y % 2 === 0 ? color1 : color2;
      }
    }
    return pixels;
  }

  /**
   * Generate checkerboard pattern
   */
  private generateCheckerboard(): string {
    let pixels = '';
    const colors = '023456789ABCDEF';
    const color1 = colors[Math.floor(Math.random() * colors.length)];
    const color2 = colors[Math.floor(Math.random() * colors.length)];

    for (let y = 0; y < 8; y++) {
      for (let x = 0; x < 8; x++) {
        pixels += (x + y) % 2 === 0 ? color1 : color2;
      }
    }
    return pixels;
  }

  /**
   * Submit a drawing for a bot
   */
  private submitDrawing(bot: Bot, instance: Instance, pixels: string): void {
    // Check if already submitted
    if (instance.submissions.some(s => s.playerId === bot.playerId)) {
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
    if (this.io) {
      this.io.to(instance.id).emit('submission-count', {
        count: instance.submissions.length,
        total: instance.players.size,
      });
    }
  }

  /**
   * Submit a vote for a bot
   */
  private submitVote(bot: Bot, instance: Instance, state: VotingState, assignment: VotingAssignment): void {
    // Random choice between imageA and imageB
    const chosenId = Math.random() > 0.5 ? assignment.imageA : assignment.imageB;

    const result = processVote(instance, state, bot.playerId, chosenId);

    if (result.success) {
      log('Debug', `Bot ${bot.user.fullName} voted for ${chosenId.slice(0, 8)}...`);
    }
  }

  /**
   * Submit a finale vote for a bot
   */
  private submitFinaleVote(bot: Bot, instance: Instance, state: VotingState): void {
    // Filter out self from finalists
    const choices = state.finalists.filter(f => f.playerId !== bot.playerId);

    if (choices.length === 0) return;

    const choice = randomItem(choices);
    const result = processFinaleVote(state, bot.playerId, choice.playerId);

    if (result.success) {
      log('Debug', `Bot ${bot.user.fullName} finale voted for ${choice.playerId.slice(0, 8)}...`);
    }
  }

  /**
   * Simulate a bot disconnecting
   */
  private simulateDisconnect(bot: Bot, instance: Instance): void {
    log('Debug', `Bot ${bot.user.fullName} disconnected (simulated)`);
    bot.isActive = false;

    // Clear all timers
    bot.timers.forEach(t => clearTimeout(t));
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
    bot.timers.forEach(t => clearTimeout(t));
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
    return Array.from(this.bots.values()).filter(b => b.instanceId === instanceId);
  }
}

// === Singleton Instance ===
export const botController = new BotController();

// === Helper Functions ===
function randomBetween(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// === Debug Endpoints ===
export function setupDebugEndpoints(app: Express, io: Server): void {
  if (!DEBUG_CONFIG.enabled) {
    log('Debug', 'Debug mode disabled (production)');
    return;
  }

  botController.setIo(io);

  // CORS for debug routes (development only)
  app.use('/debug', (req: Request, res: Response, next: NextFunction) => {
    // Only allow in development
    if (process.env.NODE_ENV === 'production') {
      return res.status(403).json({ error: 'Debug endpoints disabled in production' });
    }

    // CORS headers for development
    res.header('Access-Control-Allow-Origin', 'http://localhost:5173');
    res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type');

    // Handle preflight
    if (req.method === 'OPTIONS') {
      return res.sendStatus(200);
    }

    next();
  });

  // JSON body parser for debug routes
  app.use('/debug', express.json());

  /**
   * GET /debug/info - Get debug info
   */
  app.get('/debug/info', (_req: Request, res: Response) => {
    const instanceStats = getInstanceStats();

    res.json({
      enabled: DEBUG_CONFIG.enabled,
      bots: {
        total: botController.getBotCount(),
        maxAllowed: DEBUG_CONFIG.maxBots,
        list: botController.getBots().map(b => ({
          id: b.id,
          name: b.user.fullName,
          behavior: b.behavior,
          instanceId: b.instanceId,
          isActive: b.isActive,
        })),
      },
      instances: instanceStats,
      memory: {
        heapUsed: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
        heapTotal: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
      },
      uptime: process.uptime(),
    });
  });

  /**
   * POST /debug/bots/add - Add bots to an instance
   */
  app.post('/debug/bots/add', (req: Request, res: Response) => {
    const { instanceId, count = DEBUG_CONFIG.defaultBotCount, behavior = 'normal' } = req.body;

    // Validate behavior
    if (!BOT_BEHAVIORS[behavior as BotBehavior]) {
      return res.status(400).json({ error: 'Invalid behavior', validBehaviors: Object.keys(BOT_BEHAVIORS) });
    }

    // Find or create instance
    let instance: Instance;
    if (instanceId) {
      const found = findInstance(instanceId);
      if (!found) {
        return res.status(404).json({ error: 'Instance not found' });
      }
      instance = found;
    } else {
      instance = findOrCreatePublicInstance();
    }

    // Add bots
    const bots = botController.addBotsToInstance(instance, count, behavior as BotBehavior);

    res.json({
      success: true,
      botsAdded: bots.length,
      instanceId: instance.id,
      totalPlayers: instance.players.size,
      totalBots: botController.getBotsForInstance(instance.id).length,
    });
  });

  /**
   * POST /debug/bots/remove - Remove bots from an instance
   */
  app.post('/debug/bots/remove', (req: Request, res: Response) => {
    const { instanceId, all = false } = req.body;

    let removed: number;

    if (all) {
      removed = botController.removeAllBots();
    } else if (instanceId) {
      removed = botController.removeBotsFromInstance(instanceId);
    } else {
      return res.status(400).json({ error: 'Provide instanceId or set all=true' });
    }

    res.json({
      success: true,
      botsRemoved: removed,
      remainingBots: botController.getBotCount(),
    });
  });

  /**
   * POST /debug/bots/remove/:botId - Remove a specific bot
   */
  app.post('/debug/bots/remove/:botId', (req: Request, res: Response) => {
    const { botId } = req.params;
    const success = botController.removeBot(botId);

    if (!success) {
      return res.status(404).json({ error: 'Bot not found' });
    }

    res.json({
      success: true,
      remainingBots: botController.getBotCount(),
    });
  });

  /**
   * POST /debug/game/force-start - Force start a game
   */
  app.post('/debug/game/force-start', (req: Request, res: Response) => {
    const { instanceId } = req.body;

    if (!instanceId) {
      return res.status(400).json({ error: 'instanceId required' });
    }

    const instance = findInstance(instanceId);
    if (!instance) {
      return res.status(404).json({ error: 'Instance not found' });
    }

    if (instance.phase !== 'lobby') {
      return res.status(400).json({ error: 'Game already in progress', currentPhase: instance.phase });
    }

    if (instance.players.size < 2) {
      return res.status(400).json({ error: 'Need at least 2 players to start' });
    }

    // Force start (bypass minimum player check)
    const result = startGameManually(instance);

    if (!result.success) {
      // If normal start fails, we could force it here
      return res.status(400).json({ error: result.error });
    }

    res.json({
      success: true,
      instanceId: instance.id,
      phase: instance.phase,
      players: instance.players.size,
    });
  });

  /**
   * POST /debug/quick-start - Quick start: create instance with bots and start game
   */
  app.post('/debug/quick-start', (req: Request, res: Response) => {
    const { botCount = 6, behavior = 'fast' } = req.body;

    // Create new public instance
    const instance = findOrCreatePublicInstance();

    // Add bots
    const bots = botController.addBotsToInstance(instance, botCount, behavior as BotBehavior);

    if (bots.length < 2) {
      return res.status(500).json({ error: 'Failed to add enough bots' });
    }

    // Force start game
    const result = startGameManually(instance);

    res.json({
      success: result.success,
      instanceId: instance.id,
      phase: instance.phase,
      botsAdded: bots.length,
      error: result.error,
    });
  });

  /**
   * GET /debug/instance/:instanceId - Get detailed instance info
   */
  app.get('/debug/instance/:instanceId', (req: Request, res: Response) => {
    const { instanceId } = req.params;
    const instance = findInstance(instanceId);

    if (!instance) {
      return res.status(404).json({ error: 'Instance not found' });
    }

    const bots = botController.getBotsForInstance(instanceId);
    const state = getVotingState(instanceId);

    res.json({
      id: instance.id,
      type: instance.type,
      code: instance.code,
      phase: instance.phase,
      prompt: instance.prompt,
      players: Array.from(instance.players.values()).map(p => ({
        id: p.id,
        name: p.user.fullName,
        isBot: p.user.displayName.startsWith(DEBUG_CONFIG.botPrefix),
      })),
      spectators: instance.spectators.size,
      submissions: instance.submissions.length,
      votes: instance.votes.length,
      bots: bots.map(b => ({
        id: b.id,
        name: b.user.fullName,
        behavior: b.behavior,
        isActive: b.isActive,
      })),
      votingState: state ? {
        currentRound: state.currentRound,
        totalRounds: state.totalRounds,
        pendingAssignments: state.assignments.length,
        votersVoted: state.votersVoted.size,
        finalists: state.finalists.length,
      } : null,
      createdAt: instance.createdAt,
      lastActivity: instance.lastActivity,
    });
  });

  /**
   * GET /debug/bots - List all bots
   */
  app.get('/debug/bots', (_req: Request, res: Response) => {
    res.json({
      total: botController.getBotCount(),
      maxAllowed: DEBUG_CONFIG.maxBots,
      bots: botController.getBots().map(b => ({
        id: b.id,
        playerId: b.playerId,
        name: b.user.fullName,
        behavior: b.behavior,
        instanceId: b.instanceId,
        isActive: b.isActive,
      })),
    });
  });

  log('Debug', 'Debug endpoints enabled at /debug/*');
  log('Debug', 'Available endpoints:');
  log('Debug', '  GET  /debug/info');
  log('Debug', '  GET  /debug/bots');
  log('Debug', '  GET  /debug/instance/:instanceId');
  log('Debug', '  POST /debug/bots/add');
  log('Debug', '  POST /debug/bots/remove');
  log('Debug', '  POST /debug/bots/remove/:botId');
  log('Debug', '  POST /debug/game/force-start');
  log('Debug', '  POST /debug/quick-start');
}
