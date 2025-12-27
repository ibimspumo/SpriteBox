// apps/server/src/gameModes/zombiePixel/gameLoop.ts
// ZombiePixel Game Loop - Orchestrator
//
// This file has been refactored. The implementation is now split into:
//   - systems/InfectionSystem.ts  - Infection processing
//   - systems/BroadcastSystem.ts  - Game state broadcasting
//   - systems/MovementSystem.ts   - Player movement

import { randomInt } from 'crypto';
import type { Server } from 'socket.io';
import type { Instance } from '../../types.js';
import type { ServerToClientEvents, ClientToServerEvents } from '../../types.js';
import { ZombieBotManager } from './botManager.js';
import type {
  ZombiePixelState,
  ZombiePixelPlayer,
  ZombiePosition,
  ZombiePixelStats,
  ZombiePixelWinner,
  ZombieDirection,
} from './types.js';
import { ZOMBIE_PIXEL_CONSTANTS } from './types.js';
import { log } from '../../utils.js';
import { ItemSystemManager } from './itemSystem.js';
import { InfectionSystem, BroadcastSystem, MovementSystem } from './systems/index.js';

type TypedServer = Server<ClientToServerEvents, ServerToClientEvents>;

// Subsystem instances
const infectionSystem = new InfectionSystem();
const broadcastSystem = new BroadcastSystem();
const movementSystem = new MovementSystem();

/**
 * Initialize the zombie pixel state for an instance
 */
export function initializeZombiePixelState(instance: Instance, _io: TypedServer): void {
  const botManager = new ZombieBotManager();
  const realPlayers = Array.from(instance.players.values());
  const maxPlayers = ZOMBIE_PIXEL_CONSTANTS.MAX_PLAYERS;

  // Private instances: no bots, only real players
  // Public instances: fill with bots up to max players
  const botsNeeded = instance.type === 'private' ? 0 : maxPlayers - realPlayers.length;

  // Create occupied positions from real players (they don't have positions yet)
  const occupiedPositions: ZombiePosition[] = [];

  // Create bots to fill the lobby (only for public instances)
  const bots = botManager.createBots(botsNeeded, occupiedPositions);

  // Create player entries with random positions
  const players = new Map<string, ZombiePixelPlayer>();
  const allOccupied = new Set<string>();

  // Add real players with random positions
  for (const player of realPlayers) {
    const position = movementSystem.getRandomPosition(allOccupied);
    allOccupied.add(`${position.x},${position.y}`);

    players.set(player.id, {
      id: player.id,
      sessionId: player.sessionId,
      user: player.user,
      isBot: false,
      isZombie: false,
      position,
      isAlive: true,
      lastMoveAt: 0,
      hasHealingItem: false,
    });
  }

  // Add bots
  for (const bot of bots) {
    players.set(bot.id, bot);
    allOccupied.add(`${bot.position.x},${bot.position.y}`);
  }

  // Create state
  const state: ZombiePixelState = {
    gridWidth: 32,
    gridHeight: 32,
    players,
    gameStartTime: Date.now(),
    infectionLog: [],
    moveCooldown: 100,
    tickRate: 50,
    gameDurationMs: ZOMBIE_PIXEL_CONSTANTS.GAME_DURATION_MS,
    timerExtensionsMs: 0,
  };

  // Store bot manager reference (attached to state for access in game loop)
  (state as ZombiePixelState & { botManager: ZombieBotManager }).botManager = botManager;

  // Initialize item system
  const itemManager = new ItemSystemManager(ZOMBIE_PIXEL_CONSTANTS.GRID_SIZE);
  (state as ZombiePixelState & { itemManager: ItemSystemManager }).itemManager = itemManager;

  instance.zombiePixel = state;

  log('ZombiePixel', `Initialized game with ${realPlayers.length} real players and ${botsNeeded} bots`);
}

/**
 * Assign zombie roles to players
 * 1 zombie per 20 players, bots and players equal chance
 */
export function assignZombieRoles(instance: Instance, io: TypedServer): void {
  const state = instance.zombiePixel;
  if (!state) return;

  const totalPlayers = state.players.size;
  const zombieCount = Math.max(
    ZOMBIE_PIXEL_CONSTANTS.MIN_ZOMBIES,
    Math.floor(totalPlayers / ZOMBIE_PIXEL_CONSTANTS.ZOMBIES_PER_PLAYERS)
  );

  // Shuffle all player IDs and pick zombies
  const playerIds = Array.from(state.players.keys());
  for (let i = playerIds.length - 1; i > 0; i--) {
    const j = randomInt(0, i + 1);
    [playerIds[i], playerIds[j]] = [playerIds[j], playerIds[i]];
  }

  // Assign zombie role to first N players
  for (let i = 0; i < zombieCount && i < playerIds.length; i++) {
    const player = state.players.get(playerIds[i]);
    if (player) {
      player.isZombie = true;
    }
  }

  // Notify each real player of their role
  for (const [playerId, player] of state.players) {
    if (!player.isBot) {
      const realPlayer = instance.players.get(playerId);
      if (realPlayer) {
        io.to(realPlayer.socketId).emit('zombie-roles-assigned', {
          yourId: playerId,
          yourRole: player.isZombie ? 'zombie' : 'survivor',
          yourPosition: player.position,
          zombieCount,
          survivorCount: totalPlayers - zombieCount,
        });
      }
    }
  }

  log('ZombiePixel', `Assigned ${zombieCount} zombies out of ${totalPlayers} players`);
}

/**
 * Start the game loop
 */
export function startGameLoop(instance: Instance, io: TypedServer): void {
  const state = instance.zombiePixel;
  if (!state) return;

  const botManager = (state as ZombiePixelState & { botManager: ZombieBotManager }).botManager;
  const itemManager = (state as ZombiePixelState & { itemManager: ItemSystemManager }).itemManager;

  // Set up item system event handlers
  itemManager.onSpawn((item, definition) => {
    log('ZombiePixel', `Item spawned: ${definition.name} at (${item.position.x}, ${item.position.y})`);
    io.to(instance.id).emit('zombie-item-spawned', {
      id: item.id,
      type: definition.id,
      x: item.position.x,
      y: item.position.y,
      icon: definition.icon,
      color: definition.color,
      visibility: definition.visibility,
    });
  });

  itemManager.onCollect((item, definition, player) => {
    log('ZombiePixel', `${player.user.fullName} collected ${definition.name}`);
    if (definition.effect === 'healing-touch') {
      player.hasHealingItem = true;
    }
    io.to(instance.id).emit('zombie-item-collected', {
      itemId: item.id,
      playerId: player.id,
      playerName: player.user.fullName,
      itemType: definition.id,
      isZombie: player.isZombie,
    });
  });

  itemManager.onEffectStart((effect, definition) => {
    log('ZombiePixel', `Effect started: ${definition.name} for ${effect.affectedId}`);
    io.to(instance.id).emit('zombie-effect-started', {
      effectId: effect.id,
      type: definition.id,
      affectedId: effect.affectedId,
      expiresAt: effect.expiresAt,
      remainingUses: effect.remainingUses,
      sharedEffect: definition.sharedEffect,
      icon: definition.icon,
      color: definition.color,
    });
  });

  itemManager.onEffectEnd((effect, definition) => {
    log('ZombiePixel', `Effect ended: ${definition.name} for ${effect.affectedId}`);
    io.to(instance.id).emit('zombie-effect-ended', {
      effectId: effect.id,
      type: definition.id,
      affectedId: effect.affectedId,
    });
  });

  // Update player zombie status in item manager
  for (const player of state.players.values()) {
    itemManager.setPlayerZombieStatus(player.id, player.isZombie);
  }

  state.tickInterval = setInterval(() => {
    gameTick(instance, io, botManager, itemManager);
  }, state.tickRate);

  log('ZombiePixel', `Game loop started for instance ${instance.id}`);
}

/**
 * Stop the game loop
 */
export function stopGameLoop(instance: Instance): void {
  const state = instance.zombiePixel;
  if (!state || !state.tickInterval) return;

  clearInterval(state.tickInterval);
  state.tickInterval = undefined;

  log('ZombiePixel', `Game loop stopped for instance ${instance.id}`);
}

/**
 * Single game tick
 */
function gameTick(
  instance: Instance,
  io: TypedServer,
  botManager: ZombieBotManager,
  itemManager: ItemSystemManager
): void {
  const state = instance.zombiePixel;
  if (!state) return;

  const elapsed = Date.now() - state.gameStartTime;
  const hasSpeedBoost = itemManager.hasZombieSpeedBoost();

  // 1. Update bot movements (with speed boost awareness)
  const allPlayers = Array.from(state.players.values());
  const botMovements = botManager.updateBots(allPlayers, hasSpeedBoost, itemManager);

  // Sync bot positions to state
  for (const [botId, newPos] of botMovements) {
    const player = state.players.get(botId);
    if (player) {
      player.position = newPos;
      player.lastMoveAt = Date.now();
    }
  }

  // 2. Update item system (spawning, collection, effects)
  const occupiedPositions = new Set<string>();
  for (const player of state.players.values()) {
    occupiedPositions.add(`${player.position.x},${player.position.y}`);
  }
  itemManager.update(elapsed, state.players, occupiedPositions);

  // 3. Check collisions and process infections (using InfectionSystem)
  infectionSystem.processInfections(instance, io, itemManager);

  // 4. Check win conditions (re-filter after infections!)
  const survivors = Array.from(state.players.values()).filter((p) => !p.isZombie);

  // All survivors infected → Zombies win immediately
  if (survivors.length === 0) {
    endGame(instance, io, null);
    return;
  }

  // 5. Check timeout (with timer extensions)
  const totalDuration = state.gameDurationMs + state.timerExtensionsMs;
  if (elapsed >= totalDuration) {
    // Pick a random survivor as the "winner" for display purposes
    const winner = survivors[randomInt(0, survivors.length)];
    endGame(instance, io, winner);
    return;
  }

  // 6. Broadcast game state (using BroadcastSystem)
  broadcastSystem.broadcastGameState(instance, io, itemManager);
}

/**
 * Handle player movement
 */
export function handlePlayerMove(instance: Instance, playerId: string, direction: ZombieDirection): boolean {
  const state = instance.zombiePixel;
  if (!state) return false;

  const player = state.players.get(playerId);
  if (!player) return false;

  // Check cooldown using MovementSystem
  if (!movementSystem.canMove(player.lastMoveAt, state.moveCooldown)) {
    return false;
  }

  // Calculate new position using MovementSystem
  const newPos = movementSystem.calculateNewPosition(player.position, direction);

  // Update position
  player.position = newPos;
  player.lastMoveAt = Date.now();

  return true;
}

/**
 * End the game
 */
function endGame(instance: Instance, io: TypedServer, winner: ZombiePixelPlayer | null): void {
  const state = instance.zombiePixel;
  if (!state) return;

  // Stop the game loop
  stopGameLoop(instance);

  state.gameEndTime = Date.now();
  const duration = state.gameEndTime - state.gameStartTime;

  // Calculate stats
  const stats = calculateStats(state, duration);

  // Set winner
  let winnerData: ZombiePixelWinner | null = null;
  if (winner) {
    winnerData = {
      id: winner.id,
      name: winner.user.fullName,
      isBot: winner.isBot,
      survivalTime: duration,
    };
    state.winner = winnerData;
  }

  // Emit game end
  io.to(instance.id).emit('zombie-game-end', {
    winner: winnerData
      ? {
          id: winnerData.id,
          name: winnerData.name,
          isBot: winnerData.isBot,
        }
      : null,
    zombiesWin: winner === null,
    duration,
    stats,
  });

  log('ZombiePixel', `Game ended. Winner: ${winner?.user.fullName || 'Zombies'}`);
}

/**
 * Calculate end-of-game statistics
 */
function calculateStats(state: ZombiePixelState, duration: number): ZombiePixelStats {
  const infectionLog = state.infectionLog;

  // Count infections per zombie
  const infectionCounts = new Map<string, { name: string; count: number }>();
  for (const event of infectionLog) {
    const existing = infectionCounts.get(event.zombieId);
    if (existing) {
      existing.count++;
    } else {
      infectionCounts.set(event.zombieId, { name: event.zombieName, count: 1 });
    }
  }

  // Find most infections
  let mostInfections: { playerId: string; name: string; count: number } | null = null;
  for (const [playerId, data] of infectionCounts) {
    if (!mostInfections || data.count > mostInfections.count) {
      mostInfections = { playerId, name: data.name, count: data.count };
    }
  }

  // Find longest survivor (excluding winner)
  let longestSurvivor: { playerId: string; name: string; survivalTime: number } | null = null;
  for (const player of state.players.values()) {
    if (player.infectedAt) {
      const survivalTime = player.infectedAt - state.gameStartTime;
      if (!longestSurvivor || survivalTime > longestSurvivor.survivalTime) {
        longestSurvivor = {
          playerId: player.id,
          name: player.user.fullName,
          survivalTime,
        };
      }
    }
  }

  return {
    totalInfections: infectionLog.length,
    gameDuration: duration,
    firstInfectionTime: infectionLog.length > 0 ? infectionLog[0].timestamp - state.gameStartTime : null,
    mostInfections,
    longestSurvivor,
  };
}

/**
 * Check if game should end due to timeout
 */
export function checkGameTimeout(instance: Instance, io: TypedServer): void {
  const state = instance.zombiePixel;
  if (!state) return;

  const elapsed = Date.now() - state.gameStartTime;
  if (elapsed >= ZOMBIE_PIXEL_CONSTANTS.GAME_DURATION_MS) {
    // Find remaining survivors
    const survivors = Array.from(state.players.values()).filter((p) => !p.isZombie);
    // Winner is a random survivor (or null if none)
    const winner = survivors.length > 0 ? survivors[randomInt(0, survivors.length)] : null;
    endGame(instance, io, winner);
  }
}

/**
 * Clean up zombie pixel state
 */
export function cleanupZombiePixelState(instance: Instance): void {
  stopGameLoop(instance);
  instance.zombiePixel = undefined;
}
