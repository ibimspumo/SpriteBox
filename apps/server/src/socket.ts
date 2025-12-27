// apps/server/src/socket.ts
// Socket.io setup and core connection handling
// Handler logic has been refactored into apps/server/src/handlers/

import type { Server } from 'socket.io';
import { randomInt } from 'crypto';
import type { Player, User } from './types.js';
import { setIoInstance, getPlayerCountsByMode, removeModeViewer } from './instance.js';
import { setQueueIo, isInQueue, removeFromQueue } from './queue.js';
import { generateId, generateDiscriminator, createFullName, log } from './utils.js';
import { gameModes } from './gameModes/index.js';
import { checkRateLimit } from './rateLimit.js';
import { removeSocketFingerprint, untrackBrowserFromInstance } from './fingerprint.js';
import { handlePlayerDisconnect, findInstance, removePlayerFromInstance } from './instance.js';
import { DOS } from './constants.js';

// Import refactored handlers
import {
  TypedServer,
  TypedSocket,
  storeSessionToken,
  removeSessionToken,
  startSessionCleanup,
  unregisterConnection,
  getTotalConnections,
  setupConnectionMiddleware,
  registerLobbyHandlers,
  registerHostHandlers,
  registerGameHandlers,
  registerCopyCatHandlers,
  registerPixelGuesserHandlers,
  registerZombiePixelHandlers,
  registerCopyCatRoyaleHandlers,
} from './handlers/index.js';

// Guest names for random naming
const GUEST_NAMES = [
  'Pixel', 'Artist', 'Painter', 'Doodler', 'Sketcher',
  'Creator', 'Designer', 'Drawer', 'Crafter', 'Maker',
];

/**
 * Initialize a new player on connection
 */
function initializePlayer(socket: TypedSocket): Player {
  const displayName = GUEST_NAMES[randomInt(0, GUEST_NAMES.length)];
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

/**
 * Handle player disconnect with cleanup
 */
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

/**
 * Main socket handler setup
 */
export function setupSocketHandlers(io: TypedServer): void {
  // Make IO instance available for instance manager
  setIoInstance(io as unknown as Server);
  setQueueIo(io as unknown as Server);

  // Start periodic session cleanup
  startSessionCleanup();

  // Broadcast online count every 5 seconds (total + per game mode)
  setInterval(() => {
    io.emit('online-count', {
      count: getTotalConnections(),
      total: getTotalConnections(),
      byMode: getPlayerCountsByMode(),
    });
  }, 5000);

  // Setup connection middleware (DoS protection, IP tracking)
  setupConnectionMiddleware(io);

  // Handle new connections
  io.on('connection', (socket: TypedSocket) => {
    log('Socket', `Connected: ${socket.id} from ${socket.data.ip}`);

    // Initialize player
    const player = initializePlayer(socket);

    // Send available game modes to client
    socket.emit('game-modes', {
      available: gameModes.getAllInfo(),
      default: gameModes.getDefaultId(),
    });

    // Rate limiting middleware for all events
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

    // Idle timeout with warning
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
    }, 30_000); // Check every 30 seconds

    // Send welcome event
    socket.emit('connected', {
      socketId: socket.id,
      serverTime: Date.now(),
      user: player.user,
      sessionId: player.sessionId,
    });

    // Register all event handlers
    registerLobbyHandlers(socket, io, player);
    registerHostHandlers(socket, io, player);
    registerGameHandlers(socket, io, player);

    // Register mode-specific handlers
    registerCopyCatHandlers(socket, io, player);
    registerPixelGuesserHandlers(socket, io, player);
    registerZombiePixelHandlers(socket, io, player);
    registerCopyCatRoyaleHandlers(socket, io, player);

    // Handle disconnect
    socket.on('disconnect', (reason) => {
      clearInterval(idleCheck);

      // Connection tracking cleanup
      const ip = socket.data.ip;
      if (ip) {
        unregisterConnection(socket, ip);
      }

      // Mode viewer cleanup
      removeModeViewer(socket.id);

      // Fingerprint cleanup
      removeSocketFingerprint(socket);

      handleDisconnect(socket, player, reason);
    });
  });
}
