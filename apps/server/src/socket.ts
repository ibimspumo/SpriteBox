// apps/server/src/socket.ts
import type { Server, Socket } from 'socket.io';
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
} from './instance.js';
import { generateId, generateDiscriminator, createFullName, log } from './utils.js';
import { MIN_PLAYERS_TO_START, CANVAS, DOS } from './constants.js';
import { PixelSchema, VoteSchema, FinaleVoteSchema, UsernameSchema, validate, validateMinPixels } from './validation.js';
import { getVotingState, isWithinPhaseTime, getPhaseTimings } from './phases.js';
import { processVote, processFinaleVote } from './voting.js';
import { checkRateLimit, checkConnectionRateLimit } from './rateLimit.js';
import { checkMultiAccount, removeSocketFingerprint } from './fingerprint.js';

type TypedServer = Server<ClientToServerEvents, ServerToClientEvents>;
type TypedSocket = Socket<ClientToServerEvents, ServerToClientEvents>;

// Guest-Namen für zufällige Benennung
const GUEST_NAMES = [
  'Pixel', 'Artist', 'Painter', 'Doodler', 'Sketcher',
  'Creator', 'Designer', 'Drawer', 'Crafter', 'Maker',
];

// === DoS Protection: Connection Tracking ===
const connectionsPerIP = new Map<string, Set<string>>();
let totalConnections = 0;

/**
 * Extrahiert Client-IP aus Socket (unterstützt Proxies)
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
  // IO-Instanz für Instance-Manager verfügbar machen
  setIoInstance(io);

  // === Middleware: Verbindungslimits prüfen ===
  io.use((socket, next) => {
    const ip = getClientIP(socket as TypedSocket);

    // IP Rate-Limit (Verbindungsversuche)
    if (!checkConnectionRateLimit(ip)) {
      return next(new Error('TOO_MANY_CONNECTIONS'));
    }

    // Globales Limit
    if (totalConnections >= DOS.MAX_TOTAL_CONNECTIONS) {
      return next(new Error('SERVER_FULL'));
    }

    // Per-IP Limit
    const ipConns = connectionsPerIP.get(ip) || new Set();
    if (ipConns.size >= DOS.MAX_CONNECTIONS_PER_IP) {
      return next(new Error('TOO_MANY_CONNECTIONS'));
    }

    // Multi-Account Check
    socket.data.ip = ip;
    const multiCheck = checkMultiAccount(socket as TypedSocket);
    if (!multiCheck.allowed) {
      return next(new Error('TOO_MANY_SESSIONS'));
    }

    if (multiCheck.warning) {
      socket.data.multiAccountWarning = true;
    }

    // Tracken
    ipConns.add(socket.id);
    connectionsPerIP.set(ip, ipConns);
    totalConnections++;

    next();
  });

  io.on('connection', (socket: TypedSocket) => {
    log('Socket', `Connected: ${socket.id} from ${socket.data.ip}`);

    // Spieler initialisieren
    const player = initializePlayer(socket);

    // === Middleware für alle Events: Rate-Limiting ===
    socket.use((packet, next) => {
      const [event] = packet;

      // Globales Event-Rate-Limit
      if (!checkRateLimit(socket, 'global')) {
        return next(new Error('RATE_LIMITED'));
      }

      // Event-spezifisches Rate-Limit
      if (!checkRateLimit(socket, event)) {
        return next(new Error('RATE_LIMITED'));
      }

      next();
    });

    // === Idle-Timeout ===
    let lastActivity = Date.now();
    socket.onAny(() => {
      lastActivity = Date.now();
    });

    const idleCheck = setInterval(() => {
      if (Date.now() - lastActivity > DOS.IDLE_TIMEOUT) {
        socket.emit('idle-disconnect', { reason: 'Inactivity' });
        socket.disconnect(true);
      }
    }, 60_000);

    // Willkommens-Event
    socket.emit('connected', {
      socketId: socket.id,
      serverTime: Date.now(),
      user: player.user,
    });

    // Event-Handler registrieren
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

  // Player-Daten am Socket speichern
  socket.data.player = player;
  socket.data.instanceId = null;

  return player;
}

function registerLobbyHandlers(socket: TypedSocket, io: TypedServer, player: Player): void {
  // Öffentlichem Spiel beitreten
  socket.on('join-public', () => {
    if (socket.data.instanceId) {
      socket.emit('error', { code: 'ALREADY_IN_GAME', message: 'Already in a game' });
      return;
    }

    // Prevent race condition by setting pending state immediately
    socket.data.instanceId = 'pending';

    const instance = findOrCreatePublicInstance();
    const result = addPlayerToInstance(instance, player);

    if (!result.success) {
      socket.data.instanceId = null; // Reset on failure
      socket.emit('error', { code: 'JOIN_FAILED', message: result.error });
      return;
    }

    // Socket dem Room hinzufügen
    socket.join(instance.id);
    socket.data.instanceId = instance.id;

    // Bestätigung senden
    socket.emit('lobby-joined', {
      instanceId: instance.id,
      type: 'public',
      players: getInstancePlayers(instance).map(p => p.user),
      spectator: result.spectator,
    });

    // Andere Spieler informieren
    socket.to(instance.id).emit('player-joined', { user: player.user });

    log('Lobby', `${player.user.fullName} joined public instance ${instance.id}`);
  });

  // Privaten Raum erstellen
  socket.on('create-room', () => {
    if (socket.data.instanceId) {
      socket.emit('error', { code: 'ALREADY_IN_GAME', message: 'Already in a game' });
      return;
    }

    // Prevent race condition
    socket.data.instanceId = 'pending';

    const { code, instance } = createPrivateRoom(player);
    addPlayerToInstance(instance, player);

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
      players: [player.user],
      spectator: false,
    });

    log('Lobby', `${player.user.fullName} created private room ${code}`);
  });

  // Privatem Raum beitreten
  socket.on('join-room', (data) => {
    if (socket.data.instanceId) {
      socket.emit('error', { code: 'ALREADY_IN_GAME', message: 'Already in a game' });
      return;
    }

    if (!data?.code || typeof data.code !== 'string') {
      socket.emit('error', { code: 'INVALID_CODE', message: 'Invalid room code' });
      return;
    }

    const instance = findPrivateRoom(data.code);

    if (!instance) {
      socket.emit('error', { code: 'ROOM_NOT_FOUND', message: 'Room not found' });
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

    socket.join(instance.id);
    socket.data.instanceId = instance.id;

    socket.emit('lobby-joined', {
      instanceId: instance.id,
      type: 'private',
      code: instance.code,
      isHost: instance.hostId === player.id,
      players: getInstancePlayers(instance).map(p => p.user),
      spectator: result.spectator,
    });

    socket.to(instance.id).emit('player-joined', { user: player.user });

    log('Lobby', `${player.user.fullName} joined private room ${data.code}`);
  });

  // Namen ändern (mit strikter Validierung)
  socket.on('change-name', (data) => {
    // Validiere mit Zod-Schema (inkl. XSS-Prävention)
    const validation = validate(UsernameSchema, data);
    if (!validation.success) {
      socket.emit('error', { code: 'INVALID_NAME', message: validation.error });
      return;
    }

    player.user.displayName = validation.data.name;
    player.user.fullName = createFullName(validation.data.name, player.user.discriminator);

    socket.emit('name-changed', { user: player.user });

    // Andere in der Instanz informieren
    if (socket.data.instanceId && socket.data.instanceId !== 'pending') {
      socket.to(socket.data.instanceId).emit('player-updated', {
        playerId: player.id,
        user: player.user,
      });
    }

    log('User', `${player.id} changed name to ${player.user.fullName}`);
  });

  // Lobby verlassen
  socket.on('leave-lobby', () => {
    const instanceId = socket.data.instanceId;
    if (!instanceId) return;

    const instance = findInstance(instanceId);
    if (instance) {
      removePlayerFromInstance(instance, player.id);
      socket.to(instance.id).emit('player-left', { playerId: player.id });
    }

    socket.leave(instanceId);
    socket.data.instanceId = null;

    socket.emit('left-lobby');
    log('Lobby', `${player.user.fullName} left lobby`);
  });
}

function registerHostHandlers(socket: TypedSocket, io: TypedServer, player: Player): void {
  // Host startet Spiel manuell (nur private Räume)
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

    // Nur Host kann starten (und muss noch im Spiel sein)
    if (instance.hostId !== player.id || !instance.players.has(player.id)) {
      socket.emit('error', { code: 'NOT_HOST', message: 'Only the host can start the game' });
      return;
    }

    // Minimum Spieler prüfen
    if (instance.players.size < MIN_PLAYERS_TO_START) {
      socket.emit('error', {
        code: 'NOT_ENOUGH_PLAYERS',
        message: `Need at least ${MIN_PLAYERS_TO_START} players`,
      });
      return;
    }

    // Spiel starten
    const result = startGameManually(instance);
    if (!result.success) {
      socket.emit('error', { code: 'START_FAILED', message: result.error });
      return;
    }

    log('Host', `${player.user.fullName} started game in room ${instance.code}`);
  });

  // Host kickt Spieler (nur private Räume, nur in Lobby)
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

    // Kann nicht sich selbst kicken
    if (data.playerId === player.id) {
      socket.emit('error', { code: 'CANNOT_KICK_SELF' });
      return;
    }

    removePlayerFromInstance(instance, data.playerId);

    // Gekickten Spieler informieren
    io.to(targetPlayer.socketId).emit('kicked', { reason: 'Host kicked you' });
    io.sockets.sockets.get(targetPlayer.socketId)?.leave(instance.id);

    // Socket.data zurücksetzen für gekickten Spieler
    const kickedSocket = io.sockets.sockets.get(targetPlayer.socketId);
    if (kickedSocket) {
      kickedSocket.data.instanceId = null;
    }

    // Alle informieren
    io.to(instance.id).emit('player-left', { playerId: data.playerId, kicked: true });

    log('Host', `${player.user.fullName} kicked ${targetPlayer.user.fullName}`);
  });
}

function registerGameHandlers(socket: TypedSocket, io: TypedServer, player: Player): void {
  // Submit Drawing Handler (mit Anti-Cheat)
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

    // Phase prüfen
    if (instance.phase !== 'drawing') {
      socket.emit('error', { code: 'WRONG_PHASE', message: 'Not in drawing phase' });
      return;
    }

    // Timing prüfen (inkl. Grace Period)
    if (!isWithinPhaseTime(instanceId)) {
      socket.emit('error', { code: 'TIME_EXPIRED', message: 'Submission time expired' });
      return;
    }

    // Anti-Bot: Minimum Zeichenzeit (mindestens 3 Sekunden)
    const MIN_DRAW_TIME = 3000;
    const timings = getPhaseTimings(instanceId);
    if (timings && Date.now() - timings.phaseStartedAt < MIN_DRAW_TIME) {
      socket.emit('error', { code: 'TOO_FAST', message: 'Submitted too quickly' });
      return;
    }

    // Nur aktive Spieler können submitten
    if (!instance.players.has(player.id)) {
      socket.emit('error', { code: 'NOT_ACTIVE_PLAYER', message: 'Only active players can submit' });
      return;
    }

    // Pixel validieren
    const validation = validate(PixelSchema, data);
    if (!validation.success) {
      socket.emit('error', { code: 'INVALID_PIXELS', message: validation.error });
      return;
    }

    // Minimum Pixel prüfen
    const minCheck = validateMinPixels(validation.data.pixels);
    if (!minCheck.valid) {
      socket.emit('error', {
        code: 'TOO_FEW_PIXELS',
        message: `Need at least ${CANVAS.MIN_PIXELS_SET} non-background pixels (you have ${minCheck.setPixels})`,
      });
      return;
    }

    // Bereits submitted? (Anti-Doppel-Submit)
    const alreadySubmitted = instance.submissions.some((s) => s.playerId === player.id);
    if (alreadySubmitted) {
      socket.emit('error', { code: 'ALREADY_SUBMITTED', message: 'You already submitted' });
      return;
    }

    // Submission speichern
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

    // Alle informieren wie viele submitted haben
    io.to(instance.id).emit('submission-count', {
      count: instance.submissions.length,
      total: instance.players.size,
    });
  });

  // Vote Handler (mit Anti-Cheat)
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

    // Phase prüfen
    if (instance.phase !== 'voting') {
      socket.emit('error', { code: 'WRONG_PHASE', message: 'Not in voting phase' });
      return;
    }

    // Timing prüfen (inkl. Grace Period)
    if (!isWithinPhaseTime(instanceId)) {
      socket.emit('error', { code: 'TIME_EXPIRED', message: 'Vote time expired' });
      return;
    }

    // Validierung
    const validation = validate(VoteSchema, data);
    if (!validation.success) {
      socket.emit('error', { code: 'INVALID_VOTE', message: validation.error });
      return;
    }

    // Anti-Cheat: Kann nicht für sich selbst voten
    if (validation.data.chosenId === player.id) {
      socket.emit('error', { code: 'CANNOT_VOTE_SELF', message: 'Cannot vote for yourself' });
      return;
    }

    // Voting-State holen
    const state = getVotingState(instanceId);
    if (!state) {
      socket.emit('error', { code: 'VOTING_NOT_ACTIVE', message: 'Voting not active' });
      return;
    }

    // Anti-Cheat: Target muss im Assignment sein
    const assignment = state.assignments.find((a) => a.voterId === player.id);
    if (!assignment) {
      socket.emit('error', { code: 'NO_ASSIGNMENT', message: 'No voting assignment found' });
      return;
    }

    if (validation.data.chosenId !== assignment.imageA && validation.data.chosenId !== assignment.imageB) {
      socket.emit('error', { code: 'INVALID_TARGET', message: 'Invalid vote target' });
      return;
    }

    // Vote verarbeiten
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
  });

  // Finale-Vote Handler (mit Anti-Cheat)
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

    // Timing prüfen (inkl. Grace Period)
    if (!isWithinPhaseTime(instanceId)) {
      socket.emit('error', { code: 'TIME_EXPIRED', message: 'Finale vote time expired' });
      return;
    }

    // Validierung
    const validation = validate(FinaleVoteSchema, data);
    if (!validation.success) {
      socket.emit('error', { code: 'INVALID_VOTE', message: validation.error });
      return;
    }

    // Anti-Cheat: Kann nicht für sich selbst voten
    if (validation.data.playerId === player.id) {
      socket.emit('error', { code: 'CANNOT_VOTE_SELF', message: 'Cannot vote for yourself' });
      return;
    }

    const state = getVotingState(instanceId);
    if (!state) {
      socket.emit('error', { code: 'VOTING_NOT_ACTIVE', message: 'Finale not active' });
      return;
    }

    // Anti-Cheat: Target muss ein Finalist sein
    if (!state.finalists.some((f) => f.playerId === validation.data.playerId)) {
      socket.emit('error', { code: 'INVALID_TARGET', message: 'Invalid finalist' });
      return;
    }

    // Finale-Vote verarbeiten
    const result = processFinaleVote(state, player.id, validation.data.playerId);

    if (!result.success) {
      socket.emit('error', { code: 'VOTE_FAILED', message: result.error });
      return;
    }

    socket.emit('finale-vote-received', { success: true });
    log('Finale', `${player.user.fullName} voted for ${validation.data.playerId}`);
  });

  // Stats Sync (Placeholder - wird in Phase 5 implementiert)
  socket.on('sync-stats', () => {
    // TODO: Phase 5 - Stats sync
  });
}

function handleDisconnect(socket: TypedSocket, player: Player, reason: string): void {
  log('Socket', `Disconnected: ${socket.id} (${reason})`);

  const instanceId = socket.data.instanceId;
  if (instanceId) {
    const instance = findInstance(instanceId);
    if (instance) {
      player.status = 'disconnected';
      player.disconnectedAt = Date.now();

      // Für Lobby-Phase: Sofort entfernen
      if (instance.phase === 'lobby') {
        removePlayerFromInstance(instance, player.id);
        socket.to(instance.id).emit('player-left', { playerId: player.id });
      }
      // Für aktive Spiele: Grace Period (wird in Phase 8 implementiert)
    }
  }
}
