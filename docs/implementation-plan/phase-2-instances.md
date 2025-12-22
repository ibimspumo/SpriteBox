# Phase 2: Instanz-System

**Ziel:** Public und Private Instanzen implementieren, Lobby-Logik mit Auto-Start, Host-Kontrollen für private Räume.

**Voraussetzungen:**
- Phase 1 abgeschlossen
- Server startet und akzeptiert WebSocket-Verbindungen

---

## Aufgaben

### 2.1 Instanz-Manager erstellen

- [ ] 📁 `apps/server/src/instance.ts` erstellen
- [ ] 🔧 Instanz-Verwaltung (Map) implementieren
- [ ] 🔧 Create/Delete/Find-Funktionen

**Datei:**

```typescript
// apps/server/src/instance.ts
import type { Instance, Player, InstanceType, GamePhase } from './types.js';
import { generateId, generateRoomCode, log } from './utils.js';
import { MAX_PLAYERS_PER_INSTANCE, MIN_PLAYERS_TO_START, TIMERS } from './constants.js';

// Globale Instanz-Verwaltung
const instances = new Map<string, Instance>();
const privateRooms = new Map<string, Instance>(); // code -> instance

/**
 * Erstellt eine neue Instanz
 */
export function createInstance(options: {
  type: InstanceType;
  hostId?: string;
  code?: string;
}): Instance {
  const instance: Instance = {
    id: generateId(),
    type: options.type,
    code: options.code,
    hostId: options.hostId,
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

  log('Instance', `Created ${options.type} instance: ${instance.id}`);
  return instance;
}

/**
 * Findet eine offene öffentliche Instanz oder erstellt eine neue
 */
export function findOrCreatePublicInstance(): Instance {
  // Suche offene Instanz (Lobby-Phase, nicht voll)
  for (const instance of instances.values()) {
    if (
      instance.type === 'public' &&
      instance.phase === 'lobby' &&
      instance.players.size < MAX_PLAYERS_PER_INSTANCE
    ) {
      return instance;
    }
  }

  // Keine passende gefunden -> neue erstellen
  return createInstance({ type: 'public' });
}

/**
 * Erstellt einen privaten Raum
 */
export function createPrivateRoom(hostPlayer: Player): { code: string; instance: Instance } {
  const code = generateUniqueRoomCode();
  const instance = createInstance({
    type: 'private',
    hostId: hostPlayer.id,
    code,
  });

  return { code, instance };
}

/**
 * Generiert einen eindeutigen Raum-Code
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
 * Findet einen privaten Raum anhand des Codes
 */
export function findPrivateRoom(code: string): Instance | undefined {
  return privateRooms.get(code.toUpperCase());
}

/**
 * Findet eine Instanz anhand der ID
 */
export function findInstance(instanceId: string): Instance | undefined {
  return instances.get(instanceId);
}

/**
 * Fügt einen Spieler zu einer Instanz hinzu
 */
export function addPlayerToInstance(instance: Instance, player: Player): {
  success: boolean;
  spectator: boolean;
  error?: string;
} {
  // Instanz voll?
  if (instance.players.size >= MAX_PLAYERS_PER_INSTANCE) {
    return { success: false, spectator: false, error: 'Instance is full' };
  }

  // Spiel läuft bereits?
  if (instance.phase !== 'lobby') {
    // Als Spectator hinzufügen
    instance.spectators.set(player.id, player);
    log('Instance', `Player ${player.id} joined as spectator`);
    return { success: true, spectator: true };
  }

  // Als aktiver Spieler hinzufügen
  instance.players.set(player.id, player);
  instance.lastActivity = Date.now();

  log('Instance', `Player ${player.id} joined instance ${instance.id}`);

  // Lobby-Timer-Logik prüfen
  checkLobbyTimer(instance);

  return { success: true, spectator: false };
}

/**
 * Entfernt einen Spieler aus einer Instanz
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
 * Prüft und startet den Lobby-Timer
 */
function checkLobbyTimer(instance: Instance): void {
  if (instance.phase !== 'lobby') return;

  const playerCount = instance.players.size;

  // Sofort starten wenn voll
  if (playerCount >= MAX_PLAYERS_PER_INSTANCE) {
    clearTimeout(instance.lobbyTimer);
    startGame(instance);
    return;
  }

  // Timer starten wenn Minimum erreicht
  if (playerCount >= MIN_PLAYERS_TO_START && !instance.lobbyTimer) {
    log('Instance', `Lobby timer started for instance ${instance.id}`);

    instance.lobbyTimer = setTimeout(() => {
      if (instance.players.size >= MIN_PLAYERS_TO_START) {
        startGame(instance);
      }
    }, TIMERS.LOBBY_TIMEOUT);

    // Event an alle Spieler senden (wird später mit io verbunden)
    emitToInstance(instance, 'lobby-timer-started', {
      duration: TIMERS.LOBBY_TIMEOUT,
      startsAt: Date.now() + TIMERS.LOBBY_TIMEOUT,
    });
  }
}

/**
 * Startet das Spiel (wird in Phase 3 erweitert)
 */
function startGame(instance: Instance): void {
  clearTimeout(instance.lobbyTimer);
  instance.lobbyTimer = undefined;

  log('Instance', `Starting game for instance ${instance.id} with ${instance.players.size} players`);

  // Placeholder - wird in Phase 3 implementiert
  instance.phase = 'countdown';
  emitToInstance(instance, 'phase-changed', { phase: 'countdown' });
}

/**
 * Prüft ob eine Instanz aufgeräumt werden sollte
 */
function checkInstanceCleanup(instance: Instance): void {
  // Leere Instanz in Lobby -> sofort löschen
  if (instance.phase === 'lobby' && instance.players.size === 0) {
    cleanupInstance(instance);
  }
}

/**
 * Räumt eine Instanz auf
 */
export function cleanupInstance(instance: Instance): void {
  clearTimeout(instance.lobbyTimer);
  clearTimeout(instance.phaseTimer);

  instances.delete(instance.id);

  if (instance.code) {
    privateRooms.delete(instance.code);
  }

  log('Instance', `Cleaned up instance ${instance.id}`);
}

/**
 * Sendet ein Event an alle Spieler einer Instanz
 * (Placeholder - wird mit io verbunden)
 */
let ioInstance: any = null;

export function setIoInstance(io: any): void {
  ioInstance = io;
}

function emitToInstance(instance: Instance, event: string, data: any): void {
  if (ioInstance) {
    ioInstance.to(instance.id).emit(event, data);
  }
}

/**
 * Gibt alle Spieler einer Instanz als Array zurück
 */
export function getInstancePlayers(instance: Instance): Player[] {
  return Array.from(instance.players.values());
}

/**
 * Gibt Statistiken über alle Instanzen zurück
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
```

---

### 2.2 Socket-Events für Lobby implementieren

- [ ] 🔧 `socket.ts` erweitern mit Join/Create-Events
- [ ] 🔧 Username-System implementieren

**Datei aktualisieren:**

```typescript
// apps/server/src/socket.ts (erweitert)
import { Server, Socket } from 'socket.io';
import type { Player, User, PlayerStats } from './types.js';
import {
  findOrCreatePublicInstance,
  createPrivateRoom,
  findPrivateRoom,
  addPlayerToInstance,
  removePlayerFromInstance,
  findInstance,
  getInstancePlayers,
  setIoInstance,
} from './instance.js';
import { generateId, generateDiscriminator, createFullName, log } from './utils.js';

// Guest-Namen für zufällige Benennung
const GUEST_NAMES = [
  'Pixel', 'Artist', 'Painter', 'Doodler', 'Sketcher',
  'Creator', 'Designer', 'Drawer', 'Crafter', 'Maker',
];

export function setupSocketHandlers(io: Server): void {
  // IO-Instanz für Instance-Manager verfügbar machen
  setIoInstance(io);

  io.on('connection', (socket: Socket) => {
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
    registerGameHandlers(socket, io, player);

    // Disconnect
    socket.on('disconnect', (reason) => {
      handleDisconnect(socket, player, reason);
    });
  });
}

function initializePlayer(socket: Socket): Player {
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

function registerLobbyHandlers(socket: Socket, io: Server, player: Player): void {
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
  socket.on('join-room', (data: { code: string }) => {
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
  socket.on('change-name', (data: { name: string }) => {
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

function registerGameHandlers(socket: Socket, io: Server, player: Player): void {
  // Placeholder für Phase 3+4
  socket.on('submit-drawing', (data: { pixels: string }) => {
    socket.emit('error', { code: 'NOT_IMPLEMENTED', message: 'Drawing not yet implemented' });
  });

  socket.on('vote', (data: { chosenId: string }) => {
    socket.emit('error', { code: 'NOT_IMPLEMENTED', message: 'Voting not yet implemented' });
  });
}

function handleDisconnect(socket: Socket, player: Player, reason: string): void {
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
```

---

### 2.3 Host-Kontrollen implementieren

- [ ] 🔧 Host kann Spiel manuell starten
- [ ] 🔧 Host kann Spieler kicken

**Zu `socket.ts` hinzufügen:**

```typescript
// In registerLobbyHandlers() hinzufügen:

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

  // Spiel starten (Funktion von instance.ts exportieren)
  startGameManually(instance);
  log('Host', `${player.user.fullName} started game in room ${instance.code}`);
});

// Host kickt Spieler (nur private Räume, nur in Lobby)
socket.on('host-kick-player', (data: { playerId: string }) => {
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

  // Alle informieren
  io.to(instance.id).emit('player-left', { playerId: data.playerId, kicked: true });

  log('Host', `${player.user.fullName} kicked ${targetPlayer.user.fullName}`);
});
```

---

### 2.4 Instanz-Stats im Health-Endpoint

- [ ] 🔧 Health-Endpoint erweitern

**In `index.ts` aktualisieren:**

```typescript
import { getInstanceStats } from './instance.js';

app.get('/health', (_req, res) => {
  const instanceStats = getInstanceStats();

  res.json({
    status: 'healthy',
    connections: io.engine.clientsCount,
    instances: instanceStats,
    uptime: process.uptime(),
    memory: {
      heapUsed: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
      heapTotal: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
    },
    timestamp: Date.now(),
  });
});
```

---

## Kontrollpunkte

### 🧪 Test 1: Public Instance Join

```javascript
// Client-Seite
socket.emit('join-public');
socket.on('lobby-joined', (data) => {
  console.log('Joined:', data);
  // ✅ data.instanceId existiert
  // ✅ data.type === 'public'
  // ✅ data.players ist ein Array
});
```

### 🧪 Test 2: Private Room Create & Join

```javascript
// Client 1: Raum erstellen
socket1.emit('create-room');
socket1.on('room-created', (data) => {
  console.log('Room code:', data.code);
  // ✅ 4-stelliger Code
});

// Client 2: Raum beitreten
socket2.emit('join-room', { code: 'XXXX' });
socket2.on('lobby-joined', (data) => {
  // ✅ Erfolgreich beigetreten
});
```

### 🧪 Test 3: Lobby-Timer startet bei 5 Spielern

```javascript
// 5 Clients verbinden und joinen
// ✅ Nach dem 5. Join: 'lobby-timer-started' Event
```

### 🧪 Test 4: Health-Endpoint zeigt Instanzen

```bash
curl http://localhost:3000/health
# ✅ instances.total, instances.public, instances.private
```

---

## Definition of Done

- [ ] Spieler können öffentlichen Spielen beitreten
- [ ] Spieler können private Räume erstellen
- [ ] Spieler können privaten Räumen per Code beitreten
- [ ] Lobby-Timer startet bei 5 Spielern
- [ ] Spiel startet automatisch bei 100 Spielern oder nach 45s
- [ ] Host kann Spiel manuell starten (private Räume)
- [ ] Host kann Spieler kicken (private Räume, nur Lobby)
- [ ] Health-Endpoint zeigt Instanz-Statistiken
- [ ] Alle Änderungen sind committed

---

## Dateiübersicht nach Phase 2

```
apps/server/src/
├── index.ts       ✅ Mit Instance-Stats
├── socket.ts      ✅ Lobby-Events
├── instance.ts    ✅ NEU - Instanz-Verwaltung
├── types.ts       ✅ Erweitert
├── constants.ts   ✅
└── utils.ts       ✅
```

---

## Nächster Schritt

👉 **Weiter zu [Phase 3: Zeichnen-Phase](./phase-3-drawing.md)**
