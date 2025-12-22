// apps/server/src/socket.ts
import type { Server, Socket } from 'socket.io';
import { timingSafeEqual } from 'crypto';
import type { Player, User, ServerToClientEvents, ClientToServerEvents } from './types.js';
import {
  findOrCreatePublicInstance,
  createPrivateRoom,
  findPrivateRoom,
  addPlayerToInstance,
  removePlayerFromInstance,
  findInstance,
  getInstancePlayers,
  setIoInstance,
  startGameManually,
  handlePlayerDisconnect,
  handlePlayerReconnect,
  verifyRoomPassword,
  changeRoomPassword,
} from './instance.js';
import {
  isPasswordBlocked,
  recordFailedPasswordAttempt,
  clearPasswordAttempts,
  getPasswordBlockRemaining,
  validatePasswordFormat,
} from './password.js';
import {
  shouldQueue,
  addToQueue,
  removeFromQueue,
  isInQueue,
  setQueueIo,
} from './queue.js';
import { getMemoryInfo } from './serverConfig.js';
import { generateId, generateDiscriminator, createFullName, log } from './utils.js';
import { MIN_PLAYERS_TO_START, CANVAS, DOS, TIMERS } from './constants.js';
import { PixelSchema, VoteSchema, FinaleVoteSchema, UsernameSchema, validate, validateMinPixels } from './validation.js';
import { getVotingState, isWithinPhaseTime, getPhaseTimings, checkAndTriggerEarlyVotingEnd, checkAndTriggerEarlyFinaleEnd } from './phases.js';
import { processVote, processFinaleVote } from './voting.js';
import { checkRateLimit, checkConnectionRateLimit } from './rateLimit.js';
import { checkMultiAccount, removeSocketFingerprint, isBrowserInInstance, trackBrowserInInstance, untrackBrowserFromInstance } from './fingerprint.js';

type TypedServer = Server<ClientToServerEvents, ServerToClientEvents>;
type TypedSocket = Socket<ClientToServerEvents, ServerToClientEvents>;

// Guest names for random naming
const GUEST_NAMES = [
  'Pixel', 'Artist', 'Painter', 'Doodler', 'Sketcher',
  'Creator', 'Designer', 'Drawer', 'Crafter', 'Maker',
];

// === DoS Protection: Connection Tracking ===
const connectionsPerIP = new Map<string, Set<string>>();
let totalConnections = 0;

// === Session Token Storage (for secure validation) ===
interface SessionEntry {
  tokenBuffer: Buffer;
  createdAt: number;
  playerId: string;
}
const sessionTokens = new Map<string, SessionEntry>();

/**
 * Stores a session token securely
 */
function storeSessionToken(sessionId: string, playerId: string): void {
  sessionTokens.set(sessionId, {
    tokenBuffer: Buffer.from(sessionId, 'utf8'),
    createdAt: Date.now(),
    playerId,
  });
}

/**
 * Validates a session token using timing-safe comparison
 */
function validateSessionToken(providedSessionId: string): { valid: boolean; playerId?: string; expired?: boolean } {
  const entry = sessionTokens.get(providedSessionId);
  if (!entry) {
    return { valid: false };
  }

  // Check 24h expiry
  if (Date.now() - entry.createdAt > TIMERS.SESSION_MAX_AGE) {
    sessionTokens.delete(providedSessionId);
    return { valid: false, expired: true };
  }

  // Timing-safe comparison
  const providedBuffer = Buffer.from(providedSessionId, 'utf8');
  if (providedBuffer.length !== entry.tokenBuffer.length) {
    return { valid: false };
  }

  if (!timingSafeEqual(providedBuffer, entry.tokenBuffer)) {
    return { valid: false };
  }

  return { valid: true, playerId: entry.playerId };
}

/**
 * Removes a session token
 */
function removeSessionToken(sessionId: string): void {
  sessionTokens.delete(sessionId);
}

/**
 * Cleanup expired session tokens (run periodically)
 */
function cleanupExpiredSessions(): void {
  const now = Date.now();
  let cleaned = 0;

  for (const [sessionId, entry] of sessionTokens) {
    if (now - entry.createdAt > TIMERS.SESSION_MAX_AGE) {
      sessionTokens.delete(sessionId);
      cleaned++;
    }
  }

  if (cleaned > 0) {
    log('Session', `Cleaned up ${cleaned} expired sessions`);
  }
}

/**
 * Extracts client IP from socket (supports proxies)
 */
function getClientIP(socket: TypedSocket): string {
  const forwarded = socket.handshake.headers['x-forwarded-for'];
  if (forwarded) {
    const ips = Array.isArray(forwarded) ? forwarded[0] : forwarded;
    return ips.split(',')[0].trim();
  }
  return socket.handshake.address;
}

export function setupSocketHandlers(io: TypedServer): void {
  // Make IO instance available for instance manager
  setIoInstance(io);
  setQueueIo(io);

  // Start periodic session cleanup (every 5 minutes)
  setInterval(cleanupExpiredSessions, 5 * 60 * 1000);

  // Broadcast online count every 5 seconds
  setInterval(() => {
    io.emit('online-count', { count: totalConnections });
  }, 5000);

  // === Middleware: Check connection limits ===
  io.use((socket, next) => {
    const ip = getClientIP(socket as TypedSocket);

    // IP rate limit (connection attempts)
    if (!checkConnectionRateLimit(ip)) {
      return next(new Error('TOO_MANY_CONNECTIONS'));
    }

    // Global limit
    if (totalConnections >= DOS.MAX_TOTAL_CONNECTIONS) {
      return next(new Error('SERVER_FULL'));
    }

    // Per-IP limit
    const ipConns = connectionsPerIP.get(ip) || new Set();
    if (ipConns.size >= DOS.MAX_CONNECTIONS_PER_IP) {
      return next(new Error('TOO_MANY_CONNECTIONS'));
    }

    // Multi-account check
    socket.data.ip = ip;
    const multiCheck = checkMultiAccount(socket as TypedSocket);
    if (!multiCheck.allowed) {
      return next(new Error('TOO_MANY_SESSIONS'));
    }

    if (multiCheck.warning) {
      socket.data.multiAccountWarning = true;
    }

    // Extract browser fingerprint from auth
    const browserId = socket.handshake.auth?.browserId as string | undefined;
    socket.data.browserId = browserId || `fallback-${ip}-${socket.id}`;

    // Track
    ipConns.add(socket.id);
    connectionsPerIP.set(ip, ipConns);
    totalConnections++;

    next();
  });

  io.on('connection', (socket: TypedSocket) => {
    log('Socket', `Connected: ${socket.id} from ${socket.data.ip}`);

    // Initialize player
    const player = initializePlayer(socket);

    // === Middleware for all events: Rate limiting ===
    socket.use((packet, next) => {
      const [event] = packet;

      // Global event rate limit
      if (!checkRateLimit(socket, 'global')) {
        return next(new Error('RATE_LIMITED'));
      }

      // Event-specific rate limit
      if (!checkRateLimit(socket, event)) {
        return next(new Error('RATE_LIMITED'));
      }

      next();
    });

    // === Idle-Timeout with Warning ===
    let lastActivity = Date.now();
    let warningSent = false;

    socket.onAny(() => {
      lastActivity = Date.now();
      warningSent = false; // Reset warning on any activity
    });

    const idleCheck = setInterval(() => {
      const idleTime = Date.now() - lastActivity;

      // Disconnect after full timeout
      if (idleTime > DOS.IDLE_TIMEOUT) {
        socket.emit('idle-disconnect', { reason: 'Inactivity' });
        socket.disconnect(true);
        return;
      }

      // Warning before disconnect (1 minute left)
      if (idleTime > DOS.IDLE_WARNING && !warningSent) {
        const timeLeft = Math.ceil((DOS.IDLE_TIMEOUT - idleTime) / 1000);
        socket.emit('idle-warning', { timeLeft });
        warningSent = true;
      }
    }, 30_000); // Check every 30 seconds for more responsive warnings

    // Willkommens-Event
    socket.emit('connected', {
      socketId: socket.id,
      serverTime: Date.now(),
      user: player.user,
      sessionId: player.sessionId,
    });

    // Register event handlers
    registerLobbyHandlers(socket, io, player);
    registerHostHandlers(socket, io, player);
    registerGameHandlers(socket, io, player);

    // Disconnect
    socket.on('disconnect', (reason) => {
      clearInterval(idleCheck);

      // Connection Tracking cleanup
      const ip = socket.data.ip;
      if (ip) {
        const ipConns = connectionsPerIP.get(ip);
        if (ipConns) {
          ipConns.delete(socket.id);
          if (ipConns.size === 0) {
            connectionsPerIP.delete(ip);
          }
        }
      }
      totalConnections--;

      // Fingerprint cleanup
      removeSocketFingerprint(socket);

      handleDisconnect(socket, player, reason);
    });
  });
}

function initializePlayer(socket: TypedSocket): Player {
  const displayName = GUEST_NAMES[Math.floor(Math.random() * GUEST_NAMES.length)];
  const discriminator = generateDiscriminator();

  const user: User = {
    displayName,
    discriminator,
    fullName: createFullName(displayName, discriminator),
  };

  const player: Player = {
    id: generateId(),
    sessionId: generateId(32),
    user,
    socketId: socket.id,
    joinedAt: Date.now(),
    status: 'connected',
  };

  // Store session token for secure validation
  storeSessionToken(player.sessionId, player.id);

  // Store player data on socket
  socket.data.player = player;
  socket.data.instanceId = null;

  return player;
}

function registerLobbyHandlers(socket: TypedSocket, io: TypedServer, player: Player): void {
  // Join public game
  socket.on('join-public', () => {
    if (socket.data.instanceId) {
      socket.emit('error', { code: 'ALREADY_IN_GAME', message: 'Already in a game' });
      return;
    }

    // Check if player is already in queue
    if (isInQueue(socket.id)) {
      socket.emit('error', { code: 'ALREADY_QUEUED', message: 'Already in queue' });
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

      log('Queue', `${player.user.fullName} queued at position ${position}`);
      return;
    }

    // Prevent race condition by setting pending state immediately
    socket.data.instanceId = 'pending';

    const instance = findOrCreatePublicInstance();

    // Check if this browser is already in this instance (prevent duplicate tabs)
    if (isBrowserInInstance(socket.data.browserId, instance.id)) {
      socket.data.instanceId = null;
      socket.emit('error', { code: 'DUPLICATE_SESSION', message: 'You are already in this game in another tab' });
      return;
    }

    const result = addPlayerToInstance(instance, player);

    if (!result.success) {
      socket.data.instanceId = null; // Reset on failure
      socket.emit('error', { code: 'JOIN_FAILED', message: result.error });
      return;
    }

    // Track browser in this instance
    trackBrowserInInstance(socket.data.browserId, instance.id, socket.id);

    // Add socket to room
    socket.join(instance.id);
    socket.data.instanceId = instance.id;

    // Send confirmation
    socket.emit('lobby-joined', {
      instanceId: instance.id,
      type: 'public',
      hasPassword: false,
      players: getInstancePlayers(instance).map(p => p.user),
      spectator: result.spectator,
      // Include lobby timer if active
      ...(instance.phase === 'lobby' && instance.lobbyTimerEndsAt && {
        timerEndsAt: instance.lobbyTimerEndsAt,
      }),
      // Include game state if joining mid-game
      ...(instance.phase !== 'lobby' && {
        phase: instance.phase,
        prompt: instance.prompt,
        timerEndsAt: getPhaseTimings(instance.id)?.phaseEndsAt,
      }),
      ...(instance.phase === 'voting' && {
        votingRound: getVotingState(instance.id)?.currentRound,
        votingTotalRounds: getVotingState(instance.id)?.totalRounds,
      }),
    });

    // Inform other players
    socket.to(instance.id).emit('player-joined', { user: player.user });

    log('Lobby', `${player.user.fullName} joined public instance ${instance.id}`);
  });

  // Leave queue manually
  socket.on('leave-queue', () => {
    if (isInQueue(socket.id)) {
      removeFromQueue(socket.id, 'manual');
      log('Queue', `${player.user.fullName} left queue manually`);
    }
  });

  // Create private room (with optional password)
  socket.on('create-room', async (data) => {
    if (socket.data.instanceId) {
      socket.emit('error', { code: 'ALREADY_IN_GAME', message: 'Already in a game' });
      return;
    }

    // Validate password if provided
    if (data?.password) {
      const pwValidation = validatePasswordFormat(data.password);
      if (!pwValidation.valid) {
        socket.emit('error', { code: 'INVALID_PASSWORD', message: pwValidation.error });
        return;
      }
    }

    // Prevent race condition
    socket.data.instanceId = 'pending';

    try {
      const { code, instance, hasPassword } = await createPrivateRoom(player, {
        password: data?.password,
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
      });

      log('Lobby', `${player.user.fullName} created private room ${code}${hasPassword ? ' (password protected)' : ''}`);
    } catch (error) {
      socket.data.instanceId = null;
      socket.emit('error', { code: 'CREATE_FAILED', message: 'Failed to create room' });
      log('Error', `Failed to create room: ${error}`);
    }
  });

  // Join private room (with optional password)
  socket.on('join-room', async (data) => {
    if (socket.data.instanceId) {
      socket.emit('error', { code: 'ALREADY_IN_GAME', message: 'Already in a game' });
      return;
    }

    if (!data?.code || typeof data.code !== 'string') {
      socket.emit('error', { code: 'INVALID_CODE', message: 'Invalid room code' });
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
      socket.emit('error', { code: 'ROOM_NOT_FOUND', message: 'Room not found' });
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
      const isValid = await verifyRoomPassword(roomCode, data.password);
      if (!isValid) {
        recordFailedPasswordAttempt(ip, roomCode);
        socket.emit('error', { code: 'WRONG_PASSWORD', message: 'Incorrect password' });
        return;
      }

      // Successful login - reset attempts
      clearPasswordAttempts(ip, roomCode);
    }

    // Check if this browser is already in this instance (prevent duplicate tabs)
    if (isBrowserInInstance(socket.data.browserId, instance.id)) {
      socket.emit('error', { code: 'DUPLICATE_SESSION', message: 'You are already in this game in another tab' });
      return;
    }

    // Prevent race condition
    socket.data.instanceId = 'pending';

    const result = addPlayerToInstance(instance, player);

    if (!result.success) {
      socket.data.instanceId = null; // Reset on failure
      socket.emit('error', { code: 'JOIN_FAILED', message: result.error });
      return;
    }

    // Track browser in this instance
    trackBrowserInInstance(socket.data.browserId, instance.id, socket.id);

    socket.join(instance.id);
    socket.data.instanceId = instance.id;

    socket.emit('lobby-joined', {
      instanceId: instance.id,
      type: 'private',
      code: instance.code,
      isHost: instance.hostId === player.id,
      hasPassword: !!instance.passwordHash,
      players: getInstancePlayers(instance).map(p => p.user),
      spectator: result.spectator,
      // Include lobby timer if active
      ...(instance.phase === 'lobby' && instance.lobbyTimerEndsAt && {
        timerEndsAt: instance.lobbyTimerEndsAt,
      }),
      // Include game state if joining mid-game
      ...(instance.phase !== 'lobby' && {
        phase: instance.phase,
        prompt: instance.prompt,
        timerEndsAt: getPhaseTimings(instance.id)?.phaseEndsAt,
      }),
      ...(instance.phase === 'voting' && {
        votingRound: getVotingState(instance.id)?.currentRound,
        votingTotalRounds: getVotingState(instance.id)?.totalRounds,
      }),
    });

    socket.to(instance.id).emit('player-joined', { user: player.user });

    log('Lobby', `${player.user.fullName} joined private room ${roomCode}`);
  });

  // Change name (with strict validation)
  socket.on('change-name', (data) => {
    // Validate with Zod schema (incl. XSS prevention)
    const validation = validate(UsernameSchema, data);
    if (!validation.success) {
      socket.emit('error', { code: 'INVALID_NAME', message: validation.error });
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

    log('User', `${player.id} changed name to ${player.user.fullName}`);
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

    // Validate discriminator format (4 digits)
    if (!data.discriminator || !/^\d{4}$/.test(data.discriminator)) {
      return; // Silently ignore invalid discriminator
    }

    // Restore the user's name and discriminator
    player.user.displayName = validation.data.name;
    player.user.discriminator = data.discriminator;
    player.user.fullName = createFullName(validation.data.name, data.discriminator);

    // Send updated user back to client
    socket.emit('connected', {
      socketId: socket.id,
      serverTime: Date.now(),
      user: player.user,
      sessionId: player.sessionId,
    });

    log('User', `${player.id} restored user: ${player.user.fullName}`);
  });

  // Lobby verlassen
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
    log('Lobby', `${player.user.fullName} left lobby`);
  });
}

function registerHostHandlers(socket: TypedSocket, io: TypedServer, player: Player): void {
  // Host starts game manually (private rooms only)
  socket.on('host-start-game', () => {
    const instanceId = socket.data.instanceId;
    if (!instanceId) {
      socket.emit('error', { code: 'NOT_IN_GAME' });
      return;
    }

    const instance = findInstance(instanceId);
    if (!instance) {
      socket.emit('error', { code: 'INSTANCE_NOT_FOUND' });
      return;
    }

    // Only host can start (and must still be in game)
    if (instance.hostId !== player.id || !instance.players.has(player.id)) {
      socket.emit('error', { code: 'NOT_HOST', message: 'Only the host can start the game' });
      return;
    }

    // Check minimum players
    if (instance.players.size < MIN_PLAYERS_TO_START) {
      socket.emit('error', {
        code: 'NOT_ENOUGH_PLAYERS',
        message: `Need at least ${MIN_PLAYERS_TO_START} players`,
      });
      return;
    }

    // Start game
    const result = startGameManually(instance);
    if (!result.success) {
      socket.emit('error', { code: 'START_FAILED', message: result.error });
      return;
    }

    log('Host', `${player.user.fullName} started game in room ${instance.code}`);
  });

  // Host kicks player (private rooms only, only in lobby)
  socket.on('host-kick-player', (data) => {
    const instanceId = socket.data.instanceId;
    if (!instanceId) {
      socket.emit('error', { code: 'NOT_IN_GAME' });
      return;
    }

    const instance = findInstance(instanceId);
    if (!instance || instance.hostId !== player.id) {
      socket.emit('error', { code: 'NOT_HOST' });
      return;
    }

    if (instance.phase !== 'lobby') {
      socket.emit('error', { code: 'GAME_IN_PROGRESS', message: 'Cannot kick during game' });
      return;
    }

    if (!data?.playerId || typeof data.playerId !== 'string') {
      socket.emit('error', { code: 'INVALID_PLAYER_ID' });
      return;
    }

    const targetPlayer = instance.players.get(data.playerId);
    if (!targetPlayer) {
      socket.emit('error', { code: 'PLAYER_NOT_FOUND' });
      return;
    }

    // Cannot kick self
    if (data.playerId === player.id) {
      socket.emit('error', { code: 'CANNOT_KICK_SELF' });
      return;
    }

    removePlayerFromInstance(instance, data.playerId);

    // Inform kicked player
    io.to(targetPlayer.socketId).emit('kicked', { reason: 'Host kicked you' });
    io.sockets.sockets.get(targetPlayer.socketId)?.leave(instance.id);

    // Reset socket.data for kicked player and untrack browser
    const kickedSocket = io.sockets.sockets.get(targetPlayer.socketId);
    if (kickedSocket) {
      untrackBrowserFromInstance(kickedSocket.data.browserId, instance.id);
      kickedSocket.data.instanceId = null;
    }

    // Inform everyone
    io.to(instance.id).emit('player-left', { playerId: data.playerId, user: targetPlayer.user, kicked: true });

    log('Host', `${player.user.fullName} kicked ${targetPlayer.user.fullName}`);
  });

  // Host changes password (private rooms only)
  socket.on('host-change-password', async (data) => {
    const instanceId = socket.data.instanceId;
    if (!instanceId || instanceId === 'pending') {
      socket.emit('error', { code: 'NOT_IN_GAME' });
      return;
    }

    const instance = findInstance(instanceId);
    if (!instance || instance.hostId !== player.id) {
      socket.emit('error', { code: 'NOT_HOST' });
      return;
    }

    if (instance.type !== 'private') {
      socket.emit('error', { code: 'NOT_PRIVATE_ROOM', message: 'Only private rooms can have passwords' });
      return;
    }

    // Validate new password if provided
    if (data?.password !== null && data?.password !== undefined) {
      const pwValidation = validatePasswordFormat(data.password);
      if (!pwValidation.valid) {
        socket.emit('error', { code: 'INVALID_PASSWORD', message: pwValidation.error });
        return;
      }
    }

    const result = await changeRoomPassword(instance, data?.password ?? null);
    if (!result.success) {
      socket.emit('error', { code: 'PASSWORD_CHANGE_FAILED', message: result.error });
      return;
    }

    // Notify all players in the room
    io.to(instance.id).emit('password-changed', { hasPassword: !!data?.password });

    log('Host', `${player.user.fullName} ${data?.password ? 'set' : 'removed'} password for room ${instance.code}`);
  });
}

function registerGameHandlers(socket: TypedSocket, io: TypedServer, player: Player): void {
  // Submit drawing handler (with anti-cheat)
  socket.on('submit-drawing', (data: unknown) => {
    const instanceId = socket.data.instanceId;
    if (!instanceId || instanceId === 'pending') {
      socket.emit('error', { code: 'NOT_IN_GAME', message: 'Not in a game' });
      return;
    }

    const instance = findInstance(instanceId);
    if (!instance) {
      socket.emit('error', { code: 'INSTANCE_NOT_FOUND', message: 'Instance not found' });
      return;
    }

    // Check phase
    if (instance.phase !== 'drawing') {
      socket.emit('error', { code: 'WRONG_PHASE', message: 'Not in drawing phase' });
      return;
    }

    // Check timing (incl. grace period)
    if (!isWithinPhaseTime(instanceId)) {
      socket.emit('error', { code: 'TIME_EXPIRED', message: 'Submission time expired' });
      return;
    }

    // Anti-bot: Minimum draw time (at least 3 seconds)
    const MIN_DRAW_TIME = 3000;
    const timings = getPhaseTimings(instanceId);
    if (timings && Date.now() - timings.phaseStartedAt < MIN_DRAW_TIME) {
      socket.emit('error', { code: 'TOO_FAST', message: 'Submitted too quickly' });
      return;
    }

    // Only active players can submit
    if (!instance.players.has(player.id)) {
      socket.emit('error', { code: 'NOT_ACTIVE_PLAYER', message: 'Only active players can submit' });
      return;
    }

    // Validate pixels
    const validation = validate(PixelSchema, data);
    if (!validation.success) {
      socket.emit('error', { code: 'INVALID_PIXELS', message: validation.error });
      return;
    }

    // Check minimum pixels
    const minCheck = validateMinPixels(validation.data.pixels);
    if (!minCheck.valid) {
      socket.emit('error', {
        code: 'TOO_FEW_PIXELS',
        message: `Need at least ${CANVAS.MIN_PIXELS_SET} non-background pixels (you have ${minCheck.setPixels})`,
      });
      return;
    }

    // Already submitted? (Anti-double-submit)
    const alreadySubmitted = instance.submissions.some((s) => s.playerId === player.id);
    if (alreadySubmitted) {
      socket.emit('error', { code: 'ALREADY_SUBMITTED', message: 'You already submitted' });
      return;
    }

    // Save submission
    instance.submissions.push({
      playerId: player.id,
      pixels: validation.data.pixels,
      timestamp: Date.now(),
    });

    socket.emit('submission-received', {
      success: true,
      submissionCount: instance.submissions.length,
    });

    log('Drawing', `${player.user.fullName} submitted drawing`);

    // Inform everyone how many submitted
    io.to(instance.id).emit('submission-count', {
      count: instance.submissions.length,
      total: instance.players.size,
    });
  });

  // Vote handler (with anti-cheat)
  socket.on('vote', (data: unknown) => {
    const instanceId = socket.data.instanceId;
    if (!instanceId || instanceId === 'pending') {
      socket.emit('error', { code: 'NOT_IN_GAME', message: 'Not in a game' });
      return;
    }

    const instance = findInstance(instanceId);
    if (!instance) {
      socket.emit('error', { code: 'INSTANCE_NOT_FOUND', message: 'Instance not found' });
      return;
    }

    // Check phase
    if (instance.phase !== 'voting') {
      socket.emit('error', { code: 'WRONG_PHASE', message: 'Not in voting phase' });
      return;
    }

    // Check timing (incl. grace period)
    if (!isWithinPhaseTime(instanceId)) {
      socket.emit('error', { code: 'TIME_EXPIRED', message: 'Vote time expired' });
      return;
    }

    // Validation
    const validation = validate(VoteSchema, data);
    if (!validation.success) {
      socket.emit('error', { code: 'INVALID_VOTE', message: validation.error });
      return;
    }

    // Anti-cheat: Cannot vote for self
    if (validation.data.chosenId === player.id) {
      socket.emit('error', { code: 'CANNOT_VOTE_SELF', message: 'Cannot vote for yourself' });
      return;
    }

    // Get voting state
    const state = getVotingState(instanceId);
    if (!state) {
      socket.emit('error', { code: 'VOTING_NOT_ACTIVE', message: 'Voting not active' });
      return;
    }

    // Anti-cheat: Target must be in assignment
    const assignment = state.assignments.find((a) => a.voterId === player.id);
    if (!assignment) {
      socket.emit('error', { code: 'NO_ASSIGNMENT', message: 'No voting assignment found' });
      return;
    }

    if (validation.data.chosenId !== assignment.imageA && validation.data.chosenId !== assignment.imageB) {
      socket.emit('error', { code: 'INVALID_TARGET', message: 'Invalid vote target' });
      return;
    }

    // Process vote
    const result = processVote(instance, state, player.id, validation.data.chosenId);

    if (!result.success) {
      socket.emit('error', { code: 'VOTE_FAILED', message: result.error });
      return;
    }

    socket.emit('vote-received', {
      success: true,
      eloChange: result.eloChange,
    });

    log('Vote', `${player.user.fullName} voted for ${validation.data.chosenId}`);

    // Check if all votes are in and end round early
    checkAndTriggerEarlyVotingEnd(instanceId, instance);
  });

  // Finale vote handler (with anti-cheat)
  socket.on('finale-vote', (data: unknown) => {
    const instanceId = socket.data.instanceId;
    if (!instanceId || instanceId === 'pending') {
      socket.emit('error', { code: 'NOT_IN_GAME', message: 'Not in a game' });
      return;
    }

    const instance = findInstance(instanceId);
    if (!instance || instance.phase !== 'finale') {
      socket.emit('error', { code: 'WRONG_PHASE', message: 'Not in finale phase' });
      return;
    }

    // Check timing (incl. grace period)
    if (!isWithinPhaseTime(instanceId)) {
      socket.emit('error', { code: 'TIME_EXPIRED', message: 'Finale vote time expired' });
      return;
    }

    // Validation
    const validation = validate(FinaleVoteSchema, data);
    if (!validation.success) {
      socket.emit('error', { code: 'INVALID_VOTE', message: validation.error });
      return;
    }

    // Anti-cheat: Cannot vote for self
    if (validation.data.playerId === player.id) {
      socket.emit('error', { code: 'CANNOT_VOTE_SELF', message: 'Cannot vote for yourself' });
      return;
    }

    const state = getVotingState(instanceId);
    if (!state) {
      socket.emit('error', { code: 'VOTING_NOT_ACTIVE', message: 'Finale not active' });
      return;
    }

    // Anti-cheat: Target must be a finalist
    if (!state.finalists.some((f) => f.playerId === validation.data.playerId)) {
      socket.emit('error', { code: 'INVALID_TARGET', message: 'Invalid finalist' });
      return;
    }

    // Process finale vote
    const result = processFinaleVote(state, player.id, validation.data.playerId);

    if (!result.success) {
      socket.emit('error', { code: 'VOTE_FAILED', message: result.error });
      return;
    }

    socket.emit('finale-vote-received', { success: true });
    log('Finale', `${player.user.fullName} voted for ${validation.data.playerId}`);

    // Check if all finale votes are in and end early
    const totalVoters = instance.players.size + instance.spectators.size;
    checkAndTriggerEarlyFinaleEnd(instanceId, instance, totalVoters);
  });

  // Stats Sync (validates and stores stats from client)
  socket.on('sync-stats', () => {
    // Stats are stored locally on the client, this is just for display to others
    log('Stats', `${player.user.fullName} synced stats`);
  });

  // Session restoration (for reconnects)
  socket.on('restore-session', (data) => {
    if (!data?.sessionId || typeof data.sessionId !== 'string') {
      socket.emit('session-restore-failed', { reason: 'Invalid session ID' });
      return;
    }

    // Validate session token with timing-safe comparison
    const tokenValidation = validateSessionToken(data.sessionId);
    if (!tokenValidation.valid) {
      socket.emit('session-restore-failed', {
        reason: tokenValidation.expired ? 'Session expired (24h limit)' : 'Invalid session'
      });
      return;
    }

    const result = handlePlayerReconnect(data.sessionId, socket.id);

    if (!result.success || !result.player || !result.instanceId) {
      socket.emit('session-restore-failed', { reason: 'Session not found or expired' });
      return;
    }

    // Extract for TypeScript narrowing
    const player = result.player;

    // Update socket data
    socket.data.player = player;
    socket.data.instanceId = result.instanceId;

    // Rejoin room
    socket.join(result.instanceId);

    const instance = findInstance(result.instanceId);
    if (!instance) {
      socket.emit('session-restore-failed', { reason: 'Instance no longer exists' });
      return;
    }

    // Build phase-specific state
    let phaseState: any = undefined;

    if (instance.phase !== 'lobby') {
      const timings = getPhaseTimings(instance.id);
      phaseState = {};

      // Timer info
      if (timings && timings.phaseEndsAt > Date.now()) {
        phaseState.timer = {
          duration: timings.phaseEndsAt - timings.phaseStartedAt,
          endsAt: timings.phaseEndsAt,
        };
      }

      // Drawing phase
      if (instance.phase === 'drawing') {
        phaseState.hasSubmitted = instance.submissions.some(s => s.playerId === player.id);
        phaseState.submissionCount = instance.submissions.length;
      }

      // Voting phase
      if (instance.phase === 'voting') {
        const votingState = getVotingState(instance.id);
        if (votingState) {
          phaseState.currentRound = votingState.currentRound;
          phaseState.totalRounds = votingState.totalRounds;
          phaseState.hasVoted = votingState.votersVoted.has(player.id);

          // Find this player's voting assignment
          const assignment = votingState.assignments.find(a => a.voterId === player.id);
          if (assignment) {
            const imageA = instance.submissions.find(s => s.playerId === assignment.imageA);
            const imageB = instance.submissions.find(s => s.playerId === assignment.imageB);
            if (imageA && imageB) {
              phaseState.votingAssignment = {
                imageA: { playerId: imageA.playerId, pixels: imageA.pixels },
                imageB: { playerId: imageB.playerId, pixels: imageB.pixels },
              };
            }
          }
        }
      }

      // Finale phase
      if (instance.phase === 'finale') {
        const votingState = getVotingState(instance.id);
        if (votingState) {
          phaseState.finalists = votingState.finalists;
          phaseState.finaleVoted = votingState.votersVoted.has(player.id);
        }
      }
    }

    // Send session restored event with full game state
    socket.emit('session-restored', {
      instanceId: result.instanceId,
      user: player.user,
      phase: instance.phase,
      prompt: instance.prompt,
      players: getInstancePlayers(instance).map(p => p.user),
      isSpectator: instance.spectators.has(player.id),
      phaseState,
    });

    log('Reconnect', `Session restored for ${player.user.fullName}`);
  });
}

function handleDisconnect(socket: TypedSocket, player: Player, reason: string): void {
  log('Socket', `Disconnected: ${socket.id} (${reason})`);

  // Remove from queue if queued
  if (isInQueue(socket.id)) {
    removeFromQueue(socket.id, 'disconnect');
  }

  const instanceId = socket.data.instanceId;
  if (instanceId && instanceId !== 'pending') {
    // Untrack browser from instance
    untrackBrowserFromInstance(socket.data.browserId, instanceId);

    const instance = findInstance(instanceId);
    if (instance) {
      // For lobby phase: remove immediately and clean up session
      if (instance.phase === 'lobby') {
        removePlayerFromInstance(instance, player.id);
        removeSessionToken(player.sessionId);
        socket.to(instance.id).emit('player-left', { playerId: player.id, user: player.user });
      } else {
        // For active games: use grace period (keep session token for reconnect)
        handlePlayerDisconnect(instance, player);
      }
    }
  } else {
    // Not in a game, clean up session token
    removeSessionToken(player.sessionId);
  }
}
