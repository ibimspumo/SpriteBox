// apps/server/src/handlers/lobby.ts
// Lobby event handlers: join-public, create-room, join-room, leave-lobby, etc.

import type { TypedSocket, TypedServer, Player, Instance } from './types.js';
import type { InstanceType, User, GamePhase, Prompt, PromptIndices } from '../types.js';
import { emitError, logHandler, validateAndEmit } from './common.js';
import {
  findOrCreatePublicInstance,
  createPrivateRoom,
  findPrivateRoom,
  addPlayerToInstance,
  removePlayerFromInstance,
  findInstance,
  getInstancePlayers,
  addModeViewer,
  removeModeViewer,
  verifyRoomPassword,
} from '../instance.js';
import {
  isPasswordBlocked,
  recordFailedPasswordAttempt,
  clearPasswordAttempts,
  getPasswordBlockRemaining,
  validatePasswordFormat,
} from '../password.js';
import {
  shouldQueue,
  addToQueue,
  removeFromQueue,
  isInQueue,
} from '../queue.js';
import { getMemoryInfo } from '../serverConfig.js';
import { createFullName, log } from '../utils.js';
import { gameModes } from '../gameModes/index.js';
import { UsernameSchema, validate } from '../validation.js';
import { getVotingState, getPhaseTimings } from '../phases.js';
import {
  isBrowserInInstance,
  trackBrowserInInstance,
  untrackBrowserFromInstance,
} from '../fingerprint.js';
import { storeSessionToken } from './session.js';

/**
 * Auto-leave from results phase if player tries to join a new game
 * @returns true if auto-left or was not in a game, false if blocked
 */
function autoLeaveIfInResults(socket: TypedSocket, player: Player): boolean {
  const instanceId = socket.data.instanceId;
  if (!instanceId || instanceId === 'pending') {
    return true; // Not in a game
  }

  const currentInstance = findInstance(instanceId);
  if (currentInstance && currentInstance.phase === 'results') {
    // Auto-leave from results phase
    removePlayerFromInstance(currentInstance, player.id);
    untrackBrowserFromInstance(socket.data.browserId, currentInstance.id);
    socket.leave(currentInstance.id);
    socket.data.instanceId = null;
    log('Socket', `${player.user.fullName} auto-left from results phase to rejoin`);
    return true;
  }

  // Still in active game
  return false;
}

/**
 * Lobby joined data type
 */
interface LobbyJoinedData {
  instanceId: string;
  type: InstanceType;
  code?: string;
  isHost?: boolean;
  hasPassword?: boolean;
  players: User[];
  spectator: boolean;
  gameMode: string;
  phase?: GamePhase;
  prompt?: Prompt;
  promptIndices?: PromptIndices;
  timerEndsAt?: number;
  votingRound?: number;
  votingTotalRounds?: number;
}

/**
 * Build lobby-joined event data
 */
function buildLobbyJoinedData(
  instance: Instance,
  player: Player,
  isSpectator: boolean,
  type: 'public' | 'private',
  code?: string,
): LobbyJoinedData {
  const baseData: LobbyJoinedData = {
    instanceId: instance.id,
    type,
    hasPassword: !!instance.passwordHash,
    players: getInstancePlayers(instance).map((p) => p.user),
    spectator: isSpectator,
    gameMode: instance.gameMode,
  };

  if (type === 'private' && code) {
    baseData.code = code;
    baseData.isHost = instance.hostId === player.id;
  }

  // Include lobby timer if active
  if (instance.phase === 'lobby' && instance.lobbyTimerEndsAt) {
    baseData.timerEndsAt = instance.lobbyTimerEndsAt;
  }

  // Include game state if joining mid-game
  if (instance.phase !== 'lobby') {
    baseData.phase = instance.phase;
    baseData.prompt = instance.prompt;
    baseData.promptIndices = instance.promptIndices;
    baseData.timerEndsAt = getPhaseTimings(instance.id)?.phaseEndsAt;
  }

  // Include voting state if in voting phase
  if (instance.phase === 'voting') {
    const votingState = getVotingState(instance.id);
    if (votingState) {
      baseData.votingRound = votingState.currentRound;
      baseData.votingTotalRounds = votingState.totalRounds;
    }
  }

  return baseData;
}

/**
 * Register lobby-related socket event handlers
 */
export function registerLobbyHandlers(socket: TypedSocket, io: TypedServer, player: Player): void {
  // Track mode page viewing (for online count before joining lobby)
  socket.on('view-mode', (data) => {
    if (!data?.gameMode || typeof data.gameMode !== 'string') {
      return;
    }
    // Only track if not already in a game
    if (!socket.data.instanceId) {
      addModeViewer(socket.id, data.gameMode);
    }
  });

  socket.on('leave-mode', () => {
    removeModeViewer(socket.id);
  });

  // Join public game
  socket.on('join-public', (data) => {
    // Check if already in a game (auto-leave from results)
    if (socket.data.instanceId) {
      if (!autoLeaveIfInResults(socket, player)) {
        emitError(socket, 'ALREADY_IN_GAME', 'Already in a game');
        return;
      }
    }

    // Check if player is already in queue
    if (isInQueue(socket.id)) {
      emitError(socket, 'ALREADY_QUEUED', 'Already in queue');
      return;
    }

    // Check if server should queue new players
    if (shouldQueue()) {
      const { position, estimatedWait } = addToQueue(socket.id);
      socket.emit('queued', { position, estimatedWait });

      // Send server status
      const memInfo = getMemoryInfo();
      socket.emit('server-status', {
        status: memInfo.status,
        currentPlayers: memInfo.heapUsedMB,
        maxPlayers: memInfo.maxMB,
      });

      logHandler('Queue', `${player.user.fullName} queued at position ${position}`);
      return;
    }

    // Prevent race condition by setting pending state immediately
    socket.data.instanceId = 'pending';

    // Get game mode from request (default to pixel-battle)
    const gameMode = data?.gameMode ?? gameModes.getDefaultId();
    const instance = findOrCreatePublicInstance(gameMode);

    // Check if this browser is already in this instance (prevent duplicate tabs)
    if (isBrowserInInstance(socket.data.browserId, instance.id)) {
      socket.data.instanceId = null;
      emitError(socket, 'DUPLICATE_SESSION', 'You are already in this game in another tab');
      return;
    }

    const result = addPlayerToInstance(instance, player);

    if (!result.success) {
      socket.data.instanceId = null;
      emitError(socket, 'JOIN_FAILED', result.error || 'Failed to join');
      return;
    }

    // Remove from mode viewers (now in lobby, counted separately)
    removeModeViewer(socket.id);

    // Track browser in this instance
    trackBrowserInInstance(socket.data.browserId, instance.id, socket.id);

    // Add socket to room
    socket.join(instance.id);
    socket.data.instanceId = instance.id;

    // Send confirmation
    socket.emit('lobby-joined', buildLobbyJoinedData(instance, player, result.spectator, 'public'));

    // Inform other players
    socket.to(instance.id).emit('player-joined', { user: player.user });

    logHandler('Lobby', `${player.user.fullName} joined public instance ${instance.id}`);
  });

  // Leave queue manually
  socket.on('leave-queue', () => {
    if (isInQueue(socket.id)) {
      removeFromQueue(socket.id, 'manual');
      logHandler('Queue', `${player.user.fullName} left queue manually`);
    }
  });

  // Create private room (with optional password)
  socket.on('create-room', async (data) => {
    if (socket.data.instanceId) {
      emitError(socket, 'ALREADY_IN_GAME', 'Already in a game');
      return;
    }

    // Validate password if provided
    if (data?.password) {
      const pwValidation = validatePasswordFormat(data.password);
      if (!pwValidation.valid) {
        emitError(socket, 'INVALID_PASSWORD', pwValidation.error || 'Invalid password');
        return;
      }
    }

    // Prevent race condition
    socket.data.instanceId = 'pending';

    try {
      const { code, instance, hasPassword } = await createPrivateRoom(player, {
        password: data?.password,
        gameMode: data?.gameMode,
      });
      addPlayerToInstance(instance, player);

      // Track browser in this instance
      trackBrowserInInstance(socket.data.browserId, instance.id, socket.id);

      socket.join(instance.id);
      socket.data.instanceId = instance.id;

      socket.emit('room-created', {
        code,
        instanceId: instance.id,
      });

      socket.emit('lobby-joined', {
        instanceId: instance.id,
        type: 'private',
        code,
        isHost: true,
        hasPassword,
        players: [player.user],
        spectator: false,
        gameMode: instance.gameMode,
      });

      logHandler('Lobby', `${player.user.fullName} created private room ${code}${hasPassword ? ' (password protected)' : ''}`);
    } catch (error) {
      socket.data.instanceId = null;
      emitError(socket, 'CREATE_FAILED', 'Failed to create room');
      logHandler('Error', `Failed to create room: ${error}`);
    }
  });

  // Join private room (with optional password)
  socket.on('join-room', async (data) => {
    // Check if already in a game (auto-leave from results)
    if (socket.data.instanceId) {
      if (!autoLeaveIfInResults(socket, player)) {
        emitError(socket, 'ALREADY_IN_GAME', 'Already in a game');
        return;
      }
    }

    if (!data?.code || typeof data.code !== 'string') {
      emitError(socket, 'INVALID_CODE', 'Invalid room code');
      return;
    }

    const roomCode = data.code.toUpperCase();
    const ip = socket.data.ip || 'unknown';

    // Brute-Force Protection: Check if blocked
    if (isPasswordBlocked(ip, roomCode)) {
      const remaining = getPasswordBlockRemaining(ip, roomCode);
      socket.emit('error', {
        code: 'PASSWORD_BLOCKED',
        message: `Too many failed attempts. Try again in ${Math.ceil(remaining / 60000)} minutes.`,
        retryAfter: remaining,
      });
      return;
    }

    const instance = findPrivateRoom(roomCode);

    if (!instance) {
      emitError(socket, 'ROOM_NOT_FOUND', 'Room not found');
      return;
    }

    // Check password protection
    if (instance.passwordHash) {
      if (!data.password) {
        // Client must send password
        socket.emit('password-required', { code: roomCode });
        return;
      }

      // Verify password
      try {
        const isValid = await verifyRoomPassword(roomCode, data.password);
        if (!isValid) {
          recordFailedPasswordAttempt(ip, roomCode);
          emitError(socket, 'WRONG_PASSWORD', 'Incorrect password');
          return;
        }

        // Successful login - reset attempts
        clearPasswordAttempts(ip, roomCode);
      } catch (error) {
        logHandler('Error', `Password verification failed for room ${roomCode}: ${error}`);
        emitError(socket, 'PASSWORD_VERIFICATION_FAILED', 'Password verification failed');
        return;
      }
    }

    // Check if this browser is already in this instance (prevent duplicate tabs)
    if (isBrowserInInstance(socket.data.browserId, instance.id)) {
      emitError(socket, 'DUPLICATE_SESSION', 'You are already in this game in another tab');
      return;
    }

    // Prevent race condition
    socket.data.instanceId = 'pending';

    const result = addPlayerToInstance(instance, player);

    if (!result.success) {
      socket.data.instanceId = null;
      emitError(socket, 'JOIN_FAILED', result.error || 'Failed to join');
      return;
    }

    // Remove from mode viewers (now in lobby, counted separately)
    removeModeViewer(socket.id);

    // Track browser in this instance
    trackBrowserInInstance(socket.data.browserId, instance.id, socket.id);

    socket.join(instance.id);
    socket.data.instanceId = instance.id;

    socket.emit('lobby-joined', buildLobbyJoinedData(instance, player, result.spectator, 'private', instance.code));

    socket.to(instance.id).emit('player-joined', { user: player.user });

    logHandler('Lobby', `${player.user.fullName} joined private room ${roomCode}`);
  });

  // Change name (with strict validation)
  socket.on('change-name', (data) => {
    // Validate with Zod schema (incl. XSS prevention)
    const validation = validate(UsernameSchema, data);
    if (!validation.success) {
      emitError(socket, 'INVALID_NAME', validation.error);
      return;
    }

    player.user.displayName = validation.data.name;
    player.user.fullName = createFullName(validation.data.name, player.user.discriminator);

    socket.emit('name-changed', { user: player.user });

    // Inform others in the instance
    if (socket.data.instanceId && socket.data.instanceId !== 'pending') {
      socket.to(socket.data.instanceId).emit('player-updated', {
        playerId: player.id,
        user: player.user,
      });
    }

    logHandler('User', `${player.id} changed name to ${player.user.fullName}`);
  });

  // Restore user from localStorage (persisted username across page reloads)
  socket.on('restore-user', (data) => {
    if (!data?.displayName || typeof data.displayName !== 'string') {
      return; // Silently ignore invalid data
    }

    // Validate display name
    const validation = validate(UsernameSchema, { name: data.displayName });
    if (!validation.success) {
      return; // Silently ignore invalid names
    }

    // Only restore displayName - discriminator stays random (generated at connect)
    player.user.displayName = validation.data.name;
    player.user.fullName = createFullName(validation.data.name, player.user.discriminator);

    // Send updated user back to client (with server-generated discriminator)
    socket.emit('connected', {
      socketId: socket.id,
      serverTime: Date.now(),
      user: player.user,
      sessionId: player.sessionId,
    });

    logHandler('User', `${player.id} restored displayName from client: ${player.user.fullName}`);
  });

  // Leave lobby
  socket.on('leave-lobby', () => {
    const instanceId = socket.data.instanceId;
    if (!instanceId || instanceId === 'pending') return;

    const instance = findInstance(instanceId);
    if (instance) {
      removePlayerFromInstance(instance, player.id);
      socket.to(instance.id).emit('player-left', { playerId: player.id, user: player.user });
    }

    // Untrack browser from instance
    untrackBrowserFromInstance(socket.data.browserId, instanceId);

    socket.leave(instanceId);
    socket.data.instanceId = null;

    socket.emit('left-lobby');
    logHandler('Lobby', `${player.user.fullName} left lobby`);
  });
}
