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
import { MIN_PLAYERS_TO_START } from './constants.js';

type TypedServer = Server<ClientToServerEvents, ServerToClientEvents>;
type TypedSocket = Socket<ClientToServerEvents, ServerToClientEvents>;

// Guest-Namen für zufällige Benennung
const GUEST_NAMES = [
  'Pixel', 'Artist', 'Painter', 'Doodler', 'Sketcher',
  'Creator', 'Designer', 'Drawer', 'Crafter', 'Maker',
];

export function setupSocketHandlers(io: TypedServer): void {
  // IO-Instanz für Instance-Manager verfügbar machen
  setIoInstance(io);

  io.on('connection', (socket: TypedSocket) => {
    log('Socket', `Connected: ${socket.id}`);

    // Spieler initialisieren
    const player = initializePlayer(socket);

    // Willkommens-Event
    socket.emit('connected', {
      socketId: socket.id,
      serverTime: Date.now(),
      user: player.user,
    });

    // Event-Handler registrieren
    registerLobbyHandlers(socket, io, player);
    registerHostHandlers(socket, io, player);
    registerGameHandlers(socket, player);

    // Disconnect
    socket.on('disconnect', (reason) => {
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

    const instance = findOrCreatePublicInstance();
    const result = addPlayerToInstance(instance, player);

    if (!result.success) {
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

    const result = addPlayerToInstance(instance, player);

    if (!result.success) {
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

  // Namen ändern
  socket.on('change-name', (data) => {
    if (!data?.name || typeof data.name !== 'string') {
      socket.emit('error', { code: 'INVALID_NAME', message: 'Invalid name' });
      return;
    }

    const sanitized = data.name.trim().slice(0, 20);
    if (sanitized.length === 0) {
      socket.emit('error', { code: 'INVALID_NAME', message: 'Name cannot be empty' });
      return;
    }

    player.user.displayName = sanitized;
    player.user.fullName = createFullName(sanitized, player.user.discriminator);

    socket.emit('name-changed', { user: player.user });

    // Andere in der Instanz informieren
    if (socket.data.instanceId) {
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

    // Nur Host kann starten
    if (instance.hostId !== player.id) {
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

function registerGameHandlers(socket: TypedSocket, _player: Player): void {
  // Placeholder für Phase 3+4
  socket.on('submit-drawing', () => {
    socket.emit('error', { code: 'NOT_IMPLEMENTED', message: 'Drawing not yet implemented' });
  });

  socket.on('vote', () => {
    socket.emit('error', { code: 'NOT_IMPLEMENTED', message: 'Voting not yet implemented' });
  });

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
