// apps/server/src/gameModes/zombiePixel/gameLoop.ts

/**
 * ZombiePixel Game Loop
 *
 * Handles the real-time game logic during the 'active' phase:
 * - Bot AI movement
 * - Collision detection
 * - Infection processing
 * - Game state broadcasting
 * - Win condition checking
 */

import { randomInt } from 'crypto';
import type { Server } from 'socket.io';
import type { Instance } from '../../types.js';
import type { ServerToClientEvents, ClientToServerEvents } from '../../types.js';
import { ZombieBotManager } from './botManager.js';
import type {
  ZombiePixelState,
  ZombiePixelPlayer,
  ZombiePosition,
  ZombieInfectionEvent,
  ZombiePixelStats,
  ZombiePixelWinner,
  ZombieDirection,
} from './types.js';
import { ZOMBIE_PIXEL_CONSTANTS } from './types.js';
import { log } from '../../utils.js';

type TypedServer = Server<ClientToServerEvents, ServerToClientEvents>;

/**
 * Initialize the zombie pixel state for an instance
 */
export function initializeZombiePixelState(
  instance: Instance,
  _io: TypedServer
): void {
  const botManager = new ZombieBotManager();
  const realPlayers = Array.from(instance.players.values());
  const maxPlayers = ZOMBIE_PIXEL_CONSTANTS.MAX_PLAYERS;
  const botsNeeded = maxPlayers - realPlayers.length;

  // Create occupied positions from real players (they don't have positions yet)
  const occupiedPositions: ZombiePosition[] = [];

  // Create bots to fill the lobby
  const bots = botManager.createBots(botsNeeded, occupiedPositions);

  // Create player entries with random positions
  const players = new Map<string, ZombiePixelPlayer>();
  const allOccupied = new Set<string>();

  // Add real players with random positions
  for (const player of realPlayers) {
    const position = getRandomPosition(allOccupied);
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
    });
  }

  // Add bots
  for (const bot of bots) {
    players.set(bot.id, bot);
    allOccupied.add(`${bot.position.x},${bot.position.y}`);
  }

  // Create state
  const state: ZombiePixelState = {
    gridWidth: 50,
    gridHeight: 50,
    players,
    gameStartTime: Date.now(),
    infectionLog: [],
    moveCooldown: 100,
    tickRate: 50,
  };

  // Store bot manager reference (attached to state for access in game loop)
  (state as ZombiePixelState & { botManager: ZombieBotManager }).botManager = botManager;

  instance.zombiePixel = state;

  log('ZombiePixel', `Initialized game with ${realPlayers.length} real players and ${botsNeeded} bots`);
}

/**
 * Get a random unoccupied position
 */
function getRandomPosition(occupied: Set<string>): ZombiePosition {
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

  state.tickInterval = setInterval(() => {
    gameTick(instance, io, botManager);
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
function gameTick(instance: Instance, io: TypedServer, botManager: ZombieBotManager): void {
  const state = instance.zombiePixel;
  if (!state) return;

  // 1. Update bot movements
  const allPlayers = Array.from(state.players.values());
  const botMovements = botManager.updateBots(allPlayers);

  // Sync bot positions to state
  for (const [botId, newPos] of botMovements) {
    const player = state.players.get(botId);
    if (player) {
      player.position = newPos;
      player.lastMoveAt = Date.now();
    }
  }

  // 2. Check collisions and process infections
  processInfections(instance, io);

  // 3. Check win condition
  const survivors = allPlayers.filter(p => !p.isZombie);
  if (survivors.length <= 1) {
    endGame(instance, io, survivors[0] || null);
    return;
  }

  // 4. Broadcast game state
  broadcastGameState(instance, io);
}

/**
 * Process infections (zombie touching survivor)
 */
function processInfections(instance: Instance, io: TypedServer): void {
  const state = instance.zombiePixel;
  if (!state) return;

  const zombies = Array.from(state.players.values()).filter(p => p.isZombie);
  const survivors = Array.from(state.players.values()).filter(p => !p.isZombie);

  for (const zombie of zombies) {
    for (const survivor of survivors) {
      // Check if on same position
      if (zombie.position.x === survivor.position.x && zombie.position.y === survivor.position.y) {
        // Infect the survivor
        survivor.isZombie = true;
        survivor.isAlive = false;
        survivor.infectedAt = Date.now();
        survivor.infectedBy = zombie.id;

        // Log the infection
        const event: ZombieInfectionEvent = {
          timestamp: Date.now(),
          victimId: survivor.id,
          victimName: survivor.user.fullName,
          zombieId: zombie.id,
          zombieName: zombie.user.fullName,
          survivorsRemaining: survivors.length - 1,
        };
        state.infectionLog.push(event);

        // Update bot manager if it's a bot
        const botManager = (state as ZombiePixelState & { botManager: ZombieBotManager }).botManager;
        if (survivor.isBot) {
          botManager.infectBot(survivor.id, zombie.id, Date.now());
        }

        // Broadcast infection event
        io.to(instance.id).emit('zombie-infection', {
          victimId: survivor.id,
          victimName: survivor.user.fullName,
          zombieId: zombie.id,
          zombieName: zombie.user.fullName,
          survivorsRemaining: survivors.length - 1,
        });

        log('ZombiePixel', `${survivor.user.fullName} infected by ${zombie.user.fullName}`);
      }
    }
  }
}

/**
 * Broadcast current game state to all players
 */
function broadcastGameState(instance: Instance, io: TypedServer): void {
  const state = instance.zombiePixel;
  if (!state) return;

  const players = Array.from(state.players.values()).map(p => ({
    id: p.id,
    name: p.user.fullName,
    x: p.position.x,
    y: p.position.y,
    isZombie: p.isZombie,
    isBot: p.isBot,
  }));

  const survivorCount = players.filter(p => !p.isZombie).length;
  const zombieCount = players.filter(p => p.isZombie).length;

  const elapsed = Date.now() - state.gameStartTime;
  const duration = ZOMBIE_PIXEL_CONSTANTS.GAME_DURATION_MS;
  const timeRemaining = Math.max(0, Math.ceil((duration - elapsed) / 1000));

  io.to(instance.id).emit('zombie-game-state', {
    players,
    timeRemaining,
    survivorCount,
    zombieCount,
  });
}

/**
 * Handle player movement
 */
export function handlePlayerMove(
  instance: Instance,
  playerId: string,
  direction: ZombieDirection
): boolean {
  const state = instance.zombiePixel;
  if (!state) return false;

  const player = state.players.get(playerId);
  if (!player) return false;

  // Check cooldown
  const now = Date.now();
  if (now - player.lastMoveAt < state.moveCooldown) {
    return false;
  }

  // Calculate new position
  const newPos = { ...player.position };
  switch (direction) {
    case 'up':
      newPos.y = Math.max(0, newPos.y - 1);
      break;
    case 'down':
      newPos.y = Math.min(state.gridHeight - 1, newPos.y + 1);
      break;
    case 'left':
      newPos.x = Math.max(0, newPos.x - 1);
      break;
    case 'right':
      newPos.x = Math.min(state.gridWidth - 1, newPos.x + 1);
      break;
    case 'up-left':
      newPos.y = Math.max(0, newPos.y - 1);
      newPos.x = Math.max(0, newPos.x - 1);
      break;
    case 'up-right':
      newPos.y = Math.max(0, newPos.y - 1);
      newPos.x = Math.min(state.gridWidth - 1, newPos.x + 1);
      break;
    case 'down-left':
      newPos.y = Math.min(state.gridHeight - 1, newPos.y + 1);
      newPos.x = Math.max(0, newPos.x - 1);
      break;
    case 'down-right':
      newPos.y = Math.min(state.gridHeight - 1, newPos.y + 1);
      newPos.x = Math.min(state.gridWidth - 1, newPos.x + 1);
      break;
  }

  // Update position
  player.position = newPos;
  player.lastMoveAt = now;

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
    winner: winnerData ? {
      id: winnerData.id,
      name: winnerData.name,
      isBot: winnerData.isBot,
    } : null,
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
    const survivors = Array.from(state.players.values()).filter(p => !p.isZombie);
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
