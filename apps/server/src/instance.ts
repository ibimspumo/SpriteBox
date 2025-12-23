// apps/server/src/instance.ts
import type { Server, Socket } from 'socket.io';
import type { Instance, Player, InstanceType } from './types.js';
import { generateId, generateRoomCode, log } from './utils.js';
import { TIMERS } from './constants.js';
import { startGame as startGamePhase } from './phases.js';
import {
  gameModes,
  getInstanceConfig,
  getPlayerLimits,
} from './gameModes/index.js';
import { getLobbyStrategy } from './lobby/index.js';
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

// Track player counts by game mode
const playerCountByMode = new Map<string, number>();

// Track mode page viewers (socket ID -> game mode)
const modeViewers = new Map<string, string>();

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
  gameMode?: string;  // Defaults to 'pixel-battle'
}): Instance {
  // Validate game mode (defaults to 'pixel-battle')
  const modeId = options.gameMode ?? gameModes.getDefaultId();
  if (!gameModes.has(modeId)) {
    throw new Error(`Unknown game mode: ${modeId}`);
  }

  const instance: Instance = {
    id: generateId(),
    type: options.type,
    gameMode: modeId,
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

  log('Instance', `Created ${options.type} instance: ${instance.id} [${modeId}]${options.passwordHash ? ' (password protected)' : ''}`);
  return instance;
}

/**
 * Finds an open public instance or creates a new one
 * @param gameMode - Game mode to find/create (defaults to 'pixel-battle')
 */
export function findOrCreatePublicInstance(gameMode?: string): Instance {
  const modeId = gameMode ?? gameModes.getDefaultId();
  const config = gameModes.get(modeId);

  // Search for open instance (same mode, lobby phase, not full)
  for (const instance of instances.values()) {
    if (
      instance.type === 'public' &&
      instance.gameMode === modeId &&
      instance.phase === 'lobby' &&
      instance.players.size < config.players.max
    ) {
      return instance;
    }
  }

  // No suitable instance found -> create new one
  return createInstance({ type: 'public', gameMode: modeId });
}

/**
 * Creates a private room (with optional password)
 */
export async function createPrivateRoom(
  hostPlayer: Player,
  options: { password?: string; gameMode?: string } = {}
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
    gameMode: options.gameMode,
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
 * Uses LobbyStrategy to determine join rules
 */
export function addPlayerToInstance(instance: Instance, player: Player): {
  success: boolean;
  spectator: boolean;
  error?: string;
} {
  const lobbyStrategy = getLobbyStrategy(instance);

  // Use LobbyStrategy to check if player can join
  const joinResult = lobbyStrategy.canJoin(instance, player);

  if (!joinResult.success) {
    return joinResult;
  }

  // Join as spectator if indicated
  if (joinResult.spectator) {
    instance.spectators.set(player.id, player);
    log('Instance', `Player ${player.id} joined as spectator`);
    return { success: true, spectator: true };
  }

  // Add as active player
  instance.players.set(player.id, player);
  instance.lastActivity = Date.now();

  // Update player count for this game mode
  const currentCount = playerCountByMode.get(instance.gameMode) ?? 0;
  playerCountByMode.set(instance.gameMode, currentCount + 1);

  log('Instance', `Player ${player.id} joined instance ${instance.id}`);

  // Notify strategy of player join
  lobbyStrategy.onPlayerJoin(instance, player);

  // Check lobby timer logic
  checkLobbyTimer(instance);

  return { success: true, spectator: false };
}

/**
 * Removes a player from an instance
 * Uses LobbyStrategy to handle player leave events
 */
export function removePlayerFromInstance(instance: Instance, playerId: string): void {
  const lobbyStrategy = getLobbyStrategy(instance);

  // Check if player was active (not spectator) before removing
  const wasActivePlayer = instance.players.has(playerId);

  instance.players.delete(playerId);
  instance.spectators.delete(playerId);
  instance.lastActivity = Date.now();

  // Update player count for this game mode (only for active players)
  if (wasActivePlayer) {
    const currentCount = playerCountByMode.get(instance.gameMode) ?? 1;
    playerCountByMode.set(instance.gameMode, Math.max(0, currentCount - 1));
  }

  log('Instance', `Player ${playerId} left instance ${instance.id}`);

  // Notify strategy of player leave
  lobbyStrategy.onPlayerLeave(instance, playerId);

  // Check if lobby timer should be cancelled (players dropped below threshold)
  checkCancelLobbyTimer(instance);

  // Check if instance should be cleaned up
  checkInstanceCleanup(instance);
}

/**
 * Checks and starts the lobby timer
 * Exported for use in phases.ts after round reset
 * Uses LobbyStrategy to determine auto-start behavior
 */
export function checkLobbyTimer(instance: Instance): void {
  if (instance.phase !== 'lobby') return;

  const lobbyStrategy = getLobbyStrategy(instance);

  // Check if auto-start is enabled for this lobby type
  if (!lobbyStrategy.shouldAutoStart(instance)) {
    return;
  }

  // Check if should start immediately (e.g., lobby is full)
  if (lobbyStrategy.shouldStartImmediately(instance)) {
    clearTimeout(instance.lobbyTimer);
    instance.lobbyTimer = undefined;
    instance.lobbyTimerEndsAt = undefined;
    startGame(instance);
    return;
  }

  // Check if timer should start
  const timerConfig = lobbyStrategy.shouldStartTimer(instance);
  if (timerConfig.shouldStart && !instance.lobbyTimer) {
    log('Instance', `Lobby timer started for instance ${instance.id}`);

    const endsAt = Date.now() + timerConfig.duration;
    instance.lobbyTimerEndsAt = endsAt;

    const minPlayers = lobbyStrategy.getMinPlayers(instance);

    instance.lobbyTimer = setTimeout(() => {
      instance.lobbyTimer = undefined;
      instance.lobbyTimerEndsAt = undefined;
      if (instance.players.size >= minPlayers) {
        startGame(instance);
      }
    }, timerConfig.duration);

    // Send event to all players
    emitToInstance(instance, 'lobby-timer-started', {
      duration: timerConfig.duration,
      startsAt: endsAt,
    });
  }
}

/**
 * Checks if lobby timer should be cancelled (when players drop below threshold)
 */
function checkCancelLobbyTimer(instance: Instance): void {
  if (instance.phase !== 'lobby') return;
  if (!instance.lobbyTimer) return;

  const lobbyStrategy = getLobbyStrategy(instance);
  const threshold = lobbyStrategy.getAutoStartThreshold(instance);

  // Cancel timer if players dropped below threshold
  if (instance.players.size < threshold) {
    clearTimeout(instance.lobbyTimer);
    instance.lobbyTimer = undefined;
    instance.lobbyTimerEndsAt = undefined;

    log('Instance', `Lobby timer cancelled for instance ${instance.id} (players: ${instance.players.size} < ${threshold})`);

    // Notify all players
    emitToInstance(instance, 'lobby-timer-cancelled', {});
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
 * Uses LobbyStrategy to validate start conditions
 */
export function startGameManually(instance: Instance, requesterId?: string): { success: boolean; error?: string } {
  const lobbyStrategy = getLobbyStrategy(instance);

  // Use strategy to check if manual start is allowed
  const result = lobbyStrategy.canStartManually(instance, requesterId ?? instance.hostId ?? '');

  if (!result.success) {
    return result;
  }

  startGame(instance);
  return { success: true };
}

/**
 * Checks if an instance should be cleaned up
 * Uses LobbyStrategy to determine cleanup conditions
 */
function checkInstanceCleanup(instance: Instance): void {
  const lobbyStrategy = getLobbyStrategy(instance);

  if (lobbyStrategy.shouldCleanup(instance)) {
    cleanupInstance(instance);
  }
}

/**
 * Cleans up an instance
 */
export function cleanupInstance(instance: Instance): void {
  clearTimeout(instance.lobbyTimer);
  instance.lobbyTimer = undefined;
  instance.lobbyTimerEndsAt = undefined;
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
 * Returns player counts grouped by game mode (includes lobby players + page viewers)
 */
export function getPlayerCountsByMode(): Record<string, number> {
  const result: Record<string, number> = {};

  // Add players in instances
  for (const [mode, count] of playerCountByMode) {
    result[mode] = count;
  }

  // Add mode page viewers (not yet in a lobby)
  for (const mode of modeViewers.values()) {
    result[mode] = (result[mode] ?? 0) + 1;
  }

  return result;
}

/**
 * Tracks a socket viewing a game mode page
 */
export function addModeViewer(socketId: string, gameMode: string): void {
  // Remove from previous mode if any
  modeViewers.delete(socketId);
  // Add to new mode
  modeViewers.set(socketId, gameMode);
  log('ModeViewer', `Socket ${socketId} viewing ${gameMode}`);
}

/**
 * Removes a socket from mode viewers
 */
export function removeModeViewer(socketId: string): void {
  const mode = modeViewers.get(socketId);
  if (mode) {
    modeViewers.delete(socketId);
    log('ModeViewer', `Socket ${socketId} left ${mode}`);
  }
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
