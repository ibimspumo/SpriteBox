// apps/server/src/socket.ts
import type { Server, Socket } from 'socket.io';
import type { ServerToClientEvents, ClientToServerEvents } from './types.js';

type TypedServer = Server<ClientToServerEvents, ServerToClientEvents>;
type TypedSocket = Socket<ClientToServerEvents, ServerToClientEvents>;

export function setupSocketHandlers(io: TypedServer): void {
  io.on('connection', (socket: TypedSocket) => {
    console.log(`[Socket] Connected: ${socket.id}`);

    // Spieler-Initialisierung
    handlePlayerInit(socket);

    // Event-Handler registrieren
    registerEventHandlers(socket, io);

    // Disconnect-Handler
    socket.on('disconnect', (reason) => {
      handleDisconnect(socket, reason);
    });
  });
}

function handlePlayerInit(socket: TypedSocket): void {
  // Session-Daten initialisieren
  socket.data.joinedAt = Date.now();
  socket.data.instanceId = null;

  // Willkommensnachricht senden
  socket.emit('connected', {
    socketId: socket.id,
    serverTime: Date.now()
  });
}

function registerEventHandlers(socket: TypedSocket, _io: TypedServer): void {
  // Ping für Latenz-Messung
  socket.on('ping', (callback) => {
    if (typeof callback === 'function') {
      callback(Date.now());
    }
  });

  // Placeholder für weitere Events
  socket.on('join-public', () => {
    // TODO: Phase 2
    socket.emit('error', { code: 'NOT_IMPLEMENTED' });
  });

  socket.on('create-room', () => {
    // TODO: Phase 2
    socket.emit('error', { code: 'NOT_IMPLEMENTED' });
  });

  socket.on('join-room', () => {
    // TODO: Phase 2
    socket.emit('error', { code: 'NOT_IMPLEMENTED' });
  });

  socket.on('submit-drawing', () => {
    // TODO: Phase 3
    socket.emit('error', { code: 'NOT_IMPLEMENTED' });
  });

  socket.on('vote', () => {
    // TODO: Phase 4
    socket.emit('error', { code: 'NOT_IMPLEMENTED' });
  });

  socket.on('sync-stats', () => {
    // TODO: Phase 5
    socket.emit('error', { code: 'NOT_IMPLEMENTED' });
  });

  socket.on('change-name', () => {
    // TODO: Phase 5
    socket.emit('error', { code: 'NOT_IMPLEMENTED' });
  });
}

function handleDisconnect(socket: TypedSocket, reason: string): void {
  console.log(`[Socket] Disconnected: ${socket.id} (${reason})`);
  // TODO: Cleanup in späteren Phasen
}
