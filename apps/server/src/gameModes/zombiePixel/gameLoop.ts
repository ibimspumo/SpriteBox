// apps/server/src/gameModes/zombiePixel/gameLoop.ts

/**
 * ZombiePixel Game Loop
 *
 * Handles the real-time game logic during the 'active' phase:
 * - Bot AI movement
 * - Collision detection
 * - Infection processing
 * - Item spawning and collection
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
  ZombieItemClient,
  ZombieEffectClient,
} from './types.js';
import { ZOMBIE_PIXEL_CONSTANTS } from './types.js';
import { log } from '../../utils.js';
import { ItemSystemManager, ITEM_DEFINITIONS, type SpawnedItem, type ActiveEffect, type ItemDefinition } from './itemSystem.js';

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
  const itemManager = (state as ZombiePixelState & { itemManager: ItemSystemManager }).itemManager;

  // Set up item system event handlers
  itemManager.onSpawn((item, definition) => {
    log('ZombiePixel', `Item spawned: ${definition.name} at (${item.position.x}, ${item.position.y})`);
    // Broadcast item spawn to relevant players
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

    // Update player's healing item status
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

  // 3. Check collisions and process infections
  processInfections(instance, io, itemManager);

  // 4. Check win conditions (re-filter after infections!)
  const survivors = Array.from(state.players.values()).filter(p => !p.isZombie);

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

  // 6. Broadcast game state (including items and effects)
  broadcastGameState(instance, io, itemManager);
}

/**
 * Process infections (zombie touching survivor)
 */
function processInfections(instance: Instance, io: TypedServer, itemManager: ItemSystemManager): void {
  const state = instance.zombiePixel;
  if (!state) return;

  const zombies = Array.from(state.players.values()).filter(p => p.isZombie);
  const survivors = Array.from(state.players.values()).filter(p => !p.isZombie);

  for (const zombie of zombies) {
    for (const survivor of survivors) {
      // Check if on same position
      if (zombie.position.x === survivor.position.x && zombie.position.y === survivor.position.y) {
        // Check if survivor has healing touch - if so, heal the zombie instead!
        if (survivor.hasHealingItem) {
          // Consume the healing effect
          itemManager.consumeEffectUse('healing-touch', survivor.id);
          survivor.hasHealingItem = false;

          // "Heal" the zombie - they become a survivor again!
          zombie.isZombie = false;
          zombie.isAlive = true;
          zombie.infectedAt = undefined;
          zombie.infectedBy = undefined;

          // Update item manager zombie status
          itemManager.setPlayerZombieStatus(zombie.id, false);

          // Update bot manager if it's a bot
          const botManager = (state as ZombiePixelState & { botManager: ZombieBotManager }).botManager;
          if (zombie.isBot) {
            botManager.healBot(zombie.id);
          }

          // Broadcast healing event
          io.to(instance.id).emit('zombie-healed', {
            healedId: zombie.id,
            healedName: zombie.user.fullName,
            healerId: survivor.id,
            healerName: survivor.user.fullName,
          });

          log('ZombiePixel', `${zombie.user.fullName} was healed by ${survivor.user.fullName}!`);
          continue;
        }

        // Normal infection
        survivor.isZombie = true;
        survivor.isAlive = false;
        survivor.infectedAt = Date.now();
        survivor.infectedBy = zombie.id;

        // Update item manager zombie status
        itemManager.setPlayerZombieStatus(survivor.id, true);

        // Add +1 second to timer on infection
        state.timerExtensionsMs += ZOMBIE_PIXEL_CONSTANTS.TIMER_EXTENSION_MS;

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

        // Broadcast infection event (including timer extension)
        io.to(instance.id).emit('zombie-infection', {
          victimId: survivor.id,
          victimName: survivor.user.fullName,
          zombieId: zombie.id,
          zombieName: zombie.user.fullName,
          survivorsRemaining: survivors.length - 1,
          timerExtendedBy: ZOMBIE_PIXEL_CONSTANTS.TIMER_EXTENSION_MS,
        });

        log('ZombiePixel', `${survivor.user.fullName} infected by ${zombie.user.fullName} (+1s timer)`);
      }
    }
  }
}

/**
 * Broadcast current game state to all players
 */
function broadcastGameState(instance: Instance, io: TypedServer, itemManager: ItemSystemManager): void {
  const state = instance.zombiePixel;
  if (!state) return;

  const players = Array.from(state.players.values()).map(p => ({
    id: p.id,
    name: p.user.fullName,
    x: p.position.x,
    y: p.position.y,
    isZombie: p.isZombie,
    isBot: p.isBot,
    hasHealingItem: p.hasHealingItem,
  }));

  const survivorCount = players.filter(p => !p.isZombie).length;
  const zombieCount = players.filter(p => p.isZombie).length;

  const elapsed = Date.now() - state.gameStartTime;
  const totalDuration = state.gameDurationMs + state.timerExtensionsMs;
  const timeRemaining = Math.max(0, Math.ceil((totalDuration - elapsed) / 1000));

  // Get items and effects for broadcast
  // We'll send all items - client will filter by visibility
  const allItems = itemManager.getState().items;
  const items: ZombieItemClient[] = [];
  for (const item of allItems.values()) {
    if (item.collected) continue;
    const def = itemManager.getDefinition(item.definitionId);
    if (!def) continue;
    items.push({
      id: item.id,
      type: def.id,
      x: item.position.x,
      y: item.position.y,
      icon: def.icon,
      color: def.color,
    });
  }

  // Get active effects
  const effects: ZombieEffectClient[] = itemManager.getActiveEffects().map(e => ({
    id: e.id,
    type: e.type,
    affectedId: e.affectedId,
    expiresAt: e.expiresAt,
    remainingUses: e.remainingUses,
  }));

  // Speed boost info for zombies
  const zombieSpeedBoostActive = itemManager.hasZombieSpeedBoost();
  const zombieSpeedBoostRemaining = itemManager.getZombieSpeedBoostRemaining();

  // Players with healing touch (warning for zombies)
  const playersWithHealingTouch = itemManager.getPlayersWithHealingTouch();

  io.to(instance.id).emit('zombie-game-state', {
    players,
    timeRemaining,
    survivorCount,
    zombieCount,
    items,
    effects,
    zombieSpeedBoostActive,
    zombieSpeedBoostRemaining,
    playersWithHealingTouch,
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
