// apps/server/src/instance.ts
import type { Server, Socket } from 'socket.io';
import type { Instance, Player, InstanceType } from './types.js';
import { generateId, generateRoomCode, log } from './utils.js';
import { MAX_PLAYERS_PER_INSTANCE, MIN_PLAYERS_TO_START, TIMERS } from './constants.js';
import { startGame as startGamePhase } from './phases.js';
import { hashPassword, verifyPassword } from './password.js';
import { cleanupInstanceBrowserTracking } from './fingerprint.js';

// Disconnected players with grace period (sessionId -> {player, instanceId, timeout})
const disconnectedPlayers = new Map<string, {
  player: Player;
  instanceId: string;
  timeout: ReturnType<typeof setTimeout>;
}>();

// Global instance management
const instances = new Map<string, Instance>();
const privateRooms = new Map<string, Instance>(); // code -> instance

// Socket.io instance for broadcasting
let ioInstance: Server | null = null;

/**
 * Sets the Socket.io server instance for broadcasting
 */
export function setIoInstance(io: Server): void {
  ioInstance = io;
}

/**
 * Erstellt eine neue Instanz
 */
export function createInstance(options: {
  type: InstanceType;
  hostId?: string;
  code?: string;
  passwordHash?: string;
}): Instance {
  const instance: Instance = {
    id: generateId(),
    type: options.type,
    code: options.code,
    hostId: options.hostId,
    passwordHash: options.passwordHash,
    phase: 'lobby',
    players: new Map(),
    spectators: new Map(),
    submissions: [],
    votes: [],
    createdAt: Date.now(),
    lastActivity: Date.now(),
  };

  instances.set(instance.id, instance);

  if (options.type === 'private' && options.code) {
    privateRooms.set(options.code, instance);
  }

  log('Instance', `Created ${options.type} instance: ${instance.id}${options.passwordHash ? ' (password protected)' : ''}`);
  return instance;
}

/**
 * Finds an open public instance or creates a new one
 */
export function findOrCreatePublicInstance(): Instance {
  // Search for open instance (lobby phase, not full)
  for (const instance of instances.values()) {
    if (
      instance.type === 'public' &&
      instance.phase === 'lobby' &&
      instance.players.size < MAX_PLAYERS_PER_INSTANCE
    ) {
      return instance;
    }
  }

  // No suitable instance found -> create new one
  return createInstance({ type: 'public' });
}

/**
 * Creates a private room (with optional password)
 */
export async function createPrivateRoom(
  hostPlayer: Player,
  options: { password?: string } = {}
): Promise<{ code: string; instance: Instance; hasPassword: boolean }> {
  const code = generateUniqueRoomCode();

  let passwordHash: string | undefined;
  if (options.password) {
    passwordHash = await hashPassword(options.password);
  }

  const instance = createInstance({
    type: 'private',
    hostId: hostPlayer.id,
    code,
    passwordHash,
  });

  return { code, instance, hasPassword: !!passwordHash };
}

/**
 * Generates a unique room code
 */
function generateUniqueRoomCode(): string {
  let code: string;
  let attempts = 0;

  do {
    code = generateRoomCode();
    attempts++;
  } while (privateRooms.has(code) && attempts < 100);

  if (attempts >= 100) {
    throw new Error('Could not generate unique room code');
  }

  return code;
}

/**
 * Finds a private room by code
 */
export function findPrivateRoom(code: string): Instance | undefined {
  return privateRooms.get(code.toUpperCase());
}

/**
 * Checks if a private room has a password
 */
export function roomHasPassword(code: string): boolean {
  const instance = privateRooms.get(code.toUpperCase());
  return instance ? !!instance.passwordHash : false;
}

/**
 * Verifies the password for a private room
 */
export async function verifyRoomPassword(code: string, password: string): Promise<boolean> {
  const instance = privateRooms.get(code.toUpperCase());
  if (!instance || !instance.passwordHash) {
    return false;
  }
  return verifyPassword(password, instance.passwordHash);
}

/**
 * Changes the password of a private room (host only)
 */
export async function changeRoomPassword(
  instance: Instance,
  newPassword: string | null
): Promise<{ success: boolean; error?: string }> {
  if (instance.type !== 'private') {
    return { success: false, error: 'Not a private room' };
  }

  if (newPassword) {
    instance.passwordHash = await hashPassword(newPassword);
    log('Instance', `Password set for room ${instance.code}`);
  } else {
    instance.passwordHash = undefined;
    log('Instance', `Password removed for room ${instance.code}`);
  }

  return { success: true };
}

/**
 * Finds an instance by ID
 */
export function findInstance(instanceId: string): Instance | undefined {
  return instances.get(instanceId);
}

/**
 * Adds a player to an instance
 */
export function addPlayerToInstance(instance: Instance, player: Player): {
  success: boolean;
  spectator: boolean;
  error?: string;
} {
  // Instance full?
  if (instance.players.size >= MAX_PLAYERS_PER_INSTANCE) {
    return { success: false, spectator: false, error: 'Instance is full' };
  }

  // Game already running?
  if (instance.phase !== 'lobby') {
    // Add as spectator
    instance.spectators.set(player.id, player);
    log('Instance', `Player ${player.id} joined as spectator`);
    return { success: true, spectator: true };
  }

  // Add as active player
  instance.players.set(player.id, player);
  instance.lastActivity = Date.now();

  log('Instance', `Player ${player.id} joined instance ${instance.id}`);

  // Lobby-Timer-Logik prüfen
  checkLobbyTimer(instance);

  return { success: true, spectator: false };
}

/**
 * Removes a player from an instance
 */
export function removePlayerFromInstance(instance: Instance, playerId: string): void {
  instance.players.delete(playerId);
  instance.spectators.delete(playerId);
  instance.lastActivity = Date.now();

  log('Instance', `Player ${playerId} left instance ${instance.id}`);

  // Prüfen ob Instanz noch valide
  checkInstanceCleanup(instance);
}

/**
 * Checks and starts the lobby timer
 * Exported for use in phases.ts after round reset
 */
export function checkLobbyTimer(instance: Instance): void {
  if (instance.phase !== 'lobby') return;

  const playerCount = instance.players.size;

  // Start immediately if full
  if (playerCount >= MAX_PLAYERS_PER_INSTANCE) {
    clearTimeout(instance.lobbyTimer);
    startGame(instance);
    return;
  }

  // Start timer when minimum reached
  if (playerCount >= MIN_PLAYERS_TO_START && !instance.lobbyTimer) {
    log('Instance', `Lobby timer started for instance ${instance.id}`);

    instance.lobbyTimer = setTimeout(() => {
      instance.lobbyTimer = undefined; // Clear reference after execution
      if (instance.players.size >= MIN_PLAYERS_TO_START) {
        startGame(instance);
      }
    }, TIMERS.LOBBY_TIMEOUT);

    // Send event to all players
    emitToInstance(instance, 'lobby-timer-started', {
      duration: TIMERS.LOBBY_TIMEOUT,
      startsAt: Date.now() + TIMERS.LOBBY_TIMEOUT,
    });
  }
}

/**
 * Starts the game (delegates to phases.ts)
 */
function startGame(instance: Instance): void {
  startGamePhase(instance);
}

/**
 * Starts the game manually (for host in private rooms)
 */
export function startGameManually(instance: Instance): { success: boolean; error?: string } {
  if (instance.phase !== 'lobby') {
    return { success: false, error: 'Game already in progress' };
  }

  if (instance.players.size < MIN_PLAYERS_TO_START) {
    return { success: false, error: `Need at least ${MIN_PLAYERS_TO_START} players` };
  }

  startGame(instance);
  return { success: true };
}

/**
 * Checks if an instance should be cleaned up
 */
function checkInstanceCleanup(instance: Instance): void {
  // Leere Instanz in Lobby -> sofort löschen
  if (instance.phase === 'lobby' && instance.players.size === 0) {
    cleanupInstance(instance);
  }
}

/**
 * Cleans up an instance
 */
export function cleanupInstance(instance: Instance): void {
  clearTimeout(instance.lobbyTimer);
  clearTimeout(instance.phaseTimer);

  instances.delete(instance.id);

  if (instance.code) {
    privateRooms.delete(instance.code);
  }

  // Clean up browser tracking for this instance
  cleanupInstanceBrowserTracking(instance.id);

  log('Instance', `Cleaned up instance ${instance.id}`);
}

/**
 * Sends an event to all players in an instance
 */
function emitToInstance(instance: Instance, event: string, data: unknown): void {
  if (ioInstance) {
    ioInstance.to(instance.id).emit(event, data);
  }
}

/**
 * Returns all players in an instance as an array
 */
export function getInstancePlayers(instance: Instance): Player[] {
  return Array.from(instance.players.values());
}

/**
 * Returns statistics about all instances
 */
export function getInstanceStats(): {
  total: number;
  public: number;
  private: number;
  totalPlayers: number;
} {
  let publicCount = 0;
  let privateCount = 0;
  let totalPlayers = 0;

  for (const instance of instances.values()) {
    if (instance.type === 'public') publicCount++;
    else privateCount++;
    totalPlayers += instance.players.size + instance.spectators.size;
  }

  return {
    total: instances.size,
    public: publicCount,
    private: privateCount,
    totalPlayers,
  };
}

/**
 * Handles player disconnect with grace period
 */
export function handlePlayerDisconnect(instance: Instance, player: Player): void {
  // Mark as disconnected
  player.status = 'disconnected';
  player.disconnectedAt = Date.now();

  // Immediately notify other players about temporary disconnect
  if (ioInstance) {
    ioInstance.to(instance.id).emit('player-disconnected', {
      playerId: player.id,
      user: player.user,
      timestamp: Date.now(),
    });
  }

  // Grace-Period Timer
  const timeout = setTimeout(() => {
    // Still disconnected?
    const entry = disconnectedPlayers.get(player.sessionId);
    if (entry && entry.player.status === 'disconnected') {
      // Permanently remove
      removePlayerFromInstance(instance, player.id);
      disconnectedPlayers.delete(player.sessionId);
      log('Reconnect', `Grace period expired for ${player.user.fullName}`);

      // Notify others
      if (ioInstance) {
        ioInstance.to(instance.id).emit('player-left', { playerId: player.id, user: player.user });
      }
    }
  }, TIMERS.RECONNECT_GRACE);

  // Store for potential reconnect
  disconnectedPlayers.set(player.sessionId, {
    player,
    instanceId: instance.id,
    timeout,
  });

  log('Reconnect', `${player.user.fullName} disconnected, grace period started (${TIMERS.RECONNECT_GRACE}ms)`);
}

/**
 * Handles player reconnect
 */
export function handlePlayerReconnect(
  sessionId: string,
  newSocketId: string
): { success: boolean; player?: Player; instanceId?: string } {
  const entry = disconnectedPlayers.get(sessionId);

  if (!entry) {
    return { success: false };
  }

  const { player, instanceId, timeout } = entry;

  // Clear grace period timer
  clearTimeout(timeout);
  disconnectedPlayers.delete(sessionId);

  // Check if instance still exists
  const instance = instances.get(instanceId);
  if (!instance) {
    return { success: false };
  }

  // Check if player is still in instance (might have been removed)
  if (!instance.players.has(player.id) && !instance.spectators.has(player.id)) {
    return { success: false };
  }

  // Reconnect successful
  player.status = 'connected';
  player.disconnectedAt = undefined;
  player.socketId = newSocketId;

  // Notify other players about reconnection
  if (ioInstance) {
    ioInstance.to(instanceId).emit('player-reconnected', {
      playerId: player.id,
      user: player.user,
      timestamp: Date.now(),
    });
  }

  log('Reconnect', `${player.user.fullName} reconnected to instance ${instanceId}`);

  return { success: true, player, instanceId };
}

/**
 * Gets the current instance ID for a disconnected player's session
 */
export function getDisconnectedPlayerInstance(sessionId: string): string | undefined {
  return disconnectedPlayers.get(sessionId)?.instanceId;
}

/**
 * Starts periodic cleanup interval
 */
export function startCleanupInterval(): void {
  setInterval(() => {
    const now = Date.now();

    for (const [id, instance] of instances) {
      // Empty instances in lobby -> delete
      if (instance.players.size === 0 && instance.spectators.size === 0) {
        if (now - instance.lastActivity > 30_000) {
          cleanupInstance(instance);
          continue;
        }
      }

      // Stale instances (>1h without activity)
      if (now - instance.lastActivity > 60 * 60 * 1000) {
        // Warn players
        if (ioInstance) {
          ioInstance.to(instance.id).emit('instance-closing', { reason: 'inactivity' });
        }
        cleanupInstance(instance);
      }
    }

    // Log memory usage
    logMemoryUsage();
  }, 60_000); // Every minute
}

function logMemoryUsage(): void {
  const usage = process.memoryUsage();
  const stats = getInstanceStats();
  log(
    'Memory',
    `Heap: ${Math.round(usage.heapUsed / 1024 / 1024)}MB/${Math.round(usage.heapTotal / 1024 / 1024)}MB, ` +
      `Instances: ${stats.total}, Players: ${stats.totalPlayers}`
  );
}
