// apps/server/src/bots/endpoints.ts
// Debug REST API endpoints

import type { Express, Request, Response, NextFunction } from 'express';
import type { Server } from 'socket.io';
import express from 'express';
import type { Instance } from '../types.js';
import type { BotBehavior } from './types.js';
import { DEBUG_CONFIG, BOT_BEHAVIORS } from './config.js';
import { botController } from './BotController.js';
import { findOrCreatePublicInstance, findInstance, getInstanceStats, startGameManually } from '../instance.js';
import { getVotingState, startGame } from '../phases.js';
import { log } from '../utils.js';

/**
 * Setup debug endpoints for bot management and testing
 */
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
        list: botController.getBots().map((b) => ({
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
   * POST /debug/game/force-start - Force start a game (bypasses all validation)
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

    // Force start - directly call startGame, bypassing strategy validation
    startGame(instance);
    log('Debug', `Force started game in instance ${instance.id}`);

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
      players: Array.from(instance.players.values()).map((p) => ({
        id: p.id,
        name: p.user.fullName,
        isBot: p.user.displayName.startsWith(DEBUG_CONFIG.botPrefix),
      })),
      spectators: instance.spectators.size,
      submissions: instance.submissions.length,
      votes: instance.votes.length,
      bots: bots.map((b) => ({
        id: b.id,
        name: b.user.fullName,
        behavior: b.behavior,
        isActive: b.isActive,
      })),
      votingState: state
        ? {
            currentRound: state.currentRound,
            totalRounds: state.totalRounds,
            pendingAssignments: state.assignments.length,
            votersVoted: state.votersVoted.size,
            finalists: state.finalists.length,
          }
        : null,
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
      bots: botController.getBots().map((b) => ({
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
