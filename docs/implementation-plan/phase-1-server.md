# Phase 1: Server-Grundgerüst

**Ziel:** Express-Server mit Socket.io aufsetzen, Basis-Struktur für WebSocket-Kommunikation etablieren.

**Voraussetzungen:**
- Phase 0 abgeschlossen
- `pnpm install` erfolgreich

---

## Aufgaben

### 1.1 Express-Server erstellen

- [ ] 📁 `apps/server/src/index.ts` implementieren
- [ ] 🔧 Express + Socket.io konfigurieren
- [ ] 🔧 CORS für Entwicklung einrichten

**Datei:**

```typescript
// apps/server/src/index.ts
import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';

const app = express();
const server = createServer(app);

const io = new Server(server, {
  cors: {
    origin: process.env.NODE_ENV === 'production'
      ? false  // Wird später konfiguriert
      : ['http://localhost:5173'],
    methods: ['GET', 'POST']
  },
  pingTimeout: 20_000,
  pingInterval: 25_000
});

const PORT = process.env.PORT || 3000;

// Health Check Endpoint
app.get('/health', (_req, res) => {
  res.json({
    status: 'healthy',
    uptime: process.uptime(),
    timestamp: Date.now()
  });
});

// Socket.io Connection Handler (wird in socket.ts ausgelagert)
io.on('connection', (socket) => {
  console.log(`[Socket] Connected: ${socket.id}`);

  socket.on('disconnect', (reason) => {
    console.log(`[Socket] Disconnected: ${socket.id} (${reason})`);
  });
});

server.listen(PORT, () => {
  console.log(`🎨 SpriteBox Server running on port ${PORT}`);
  console.log(`📡 WebSocket ready`);
  console.log(`🔗 Health check: http://localhost:${PORT}/health`);
});

export { io };
```

---

### 1.2 Socket-Handler auslagern

- [ ] 📁 `apps/server/src/socket.ts` erstellen
- [ ] 🔧 Basis-Events definieren

**Datei:**

```typescript
// apps/server/src/socket.ts
import { Server, Socket } from 'socket.io';

export function setupSocketHandlers(io: Server): void {
  io.on('connection', (socket: Socket) => {
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

function handlePlayerInit(socket: Socket): void {
  // Session-Daten initialisieren
  socket.data.joinedAt = Date.now();
  socket.data.instanceId = null;

  // Willkommensnachricht senden
  socket.emit('connected', {
    socketId: socket.id,
    serverTime: Date.now()
  });
}

function registerEventHandlers(socket: Socket, io: Server): void {
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
}

function handleDisconnect(socket: Socket, reason: string): void {
  console.log(`[Socket] Disconnected: ${socket.id} (${reason})`);
  // TODO: Cleanup in späteren Phasen
}
```

---

### 1.3 Index.ts aktualisieren

- [ ] 🔧 Socket-Handler importieren und verwenden

**Datei aktualisieren:**

```typescript
// apps/server/src/index.ts (aktualisiert)
import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { setupSocketHandlers } from './socket.js';

const app = express();
const server = createServer(app);

const io = new Server(server, {
  cors: {
    origin: process.env.NODE_ENV === 'production'
      ? false
      : ['http://localhost:5173'],
    methods: ['GET', 'POST']
  },
  pingTimeout: 20_000,
  pingInterval: 25_000,
  maxHttpBufferSize: 1024  // 1KB max payload
});

const PORT = process.env.PORT || 3000;

// Health Check
app.get('/health', (_req, res) => {
  res.json({
    status: 'healthy',
    connections: io.engine.clientsCount,
    uptime: process.uptime(),
    timestamp: Date.now()
  });
});

// Socket-Handler registrieren
setupSocketHandlers(io);

server.listen(PORT, () => {
  console.log(`🎨 SpriteBox Server running on port ${PORT}`);
  console.log(`📡 WebSocket ready`);
  console.log(`🔗 Health check: http://localhost:${PORT}/health`);
});

export { io };
```

---

### 1.4 TypeScript-Typen definieren

- [ ] 📁 `apps/server/src/types.ts` erstellen

**Datei:**

```typescript
// apps/server/src/types.ts

// === Spieler ===
export interface User {
  displayName: string;
  discriminator: string;  // 4-stellig: "0000" - "9999"
  fullName: string;       // "Name#0000"
}

export interface Player {
  id: string;
  sessionId: string;
  user: User;
  socketId: string;
  joinedAt: number;
  status: 'connected' | 'disconnected';
  disconnectedAt?: number;
}

// === Instanz ===
export type InstanceType = 'public' | 'private';
export type GamePhase =
  | 'lobby'
  | 'countdown'
  | 'drawing'
  | 'voting'
  | 'finale'
  | 'results';

export interface Instance {
  id: string;
  type: InstanceType;
  code?: string;          // Nur für private Räume
  hostId?: string;        // Nur für private Räume
  phase: GamePhase;
  players: Map<string, Player>;
  spectators: Map<string, Player>;
  submissions: Submission[];
  votes: Vote[];
  prompt?: string;
  createdAt: number;
  lastActivity: number;
  lobbyTimer?: NodeJS.Timeout;
  phaseTimer?: NodeJS.Timeout;
}

// === Submission ===
export interface Submission {
  playerId: string;
  pixels: string;         // 64-Zeichen Hex-String
  timestamp: number;
}

// === Voting ===
export interface Vote {
  voterId: string;
  winnerId: string;
  loserId: string;
  round: number;
  timestamp: number;
}

export interface VotingAssignment {
  voterId: string;
  imageA: string;         // playerId
  imageB: string;         // playerId
  round: number;
}

// === Stats ===
export interface PlayerStats {
  gamesPlayed: number;
  placements: {
    1: number;
    2: number;
    3: number;
  };
}

// === Socket Events ===
export interface ServerToClientEvents {
  connected: (data: { socketId: string; serverTime: number }) => void;
  error: (data: { code: string; message?: string }) => void;
  'lobby-joined': (data: { instanceId: string; players: User[] }) => void;
  'player-joined': (data: { user: User }) => void;
  'player-left': (data: { userId: string }) => void;
  'lobby-timer-started': (data: { duration: number; startsAt: number }) => void;
  'phase-changed': (data: { phase: GamePhase; prompt?: string }) => void;
  'voting-round': (data: { round: number; imageA: ImageData; imageB: ImageData; timeLimit: number }) => void;
  'game-results': (data: { rankings: RankingEntry[]; totalParticipants: number }) => void;
}

export interface ClientToServerEvents {
  ping: (callback: (time: number) => void) => void;
  'join-public': () => void;
  'create-room': (data?: { password?: string }) => void;
  'join-room': (data: { code: string; password?: string }) => void;
  'submit-drawing': (data: { pixels: string }) => void;
  'vote': (data: { chosenId: string }) => void;
  'sync-stats': (data: PlayerStats) => void;
  'change-name': (data: { name: string }) => void;
}

// === Hilfstypes ===
export interface ImageData {
  playerId: string;
  pixels: string;
}

export interface RankingEntry {
  place: number;
  playerId: string;
  user: User;
  pixels: string;
  finalVotes: number;
  elo: number;
}
```

---

### 1.5 Konstanten definieren

- [ ] 📁 `apps/server/src/constants.ts` erstellen

**Datei:**

```typescript
// apps/server/src/constants.ts

// === Spieler-Limits ===
export const MAX_PLAYERS_PER_INSTANCE = 100;
export const MIN_PLAYERS_TO_START = 5;

// === Timer (in Millisekunden) ===
export const TIMERS = {
  LOBBY_TIMEOUT: 45_000,       // 45s Wartezeit in Lobby
  COUNTDOWN: 5_000,            // 5s Countdown vor Zeichnen
  DRAWING: 60_000,             // 60s zum Zeichnen
  VOTING_ROUND: 5_000,         // 5s pro Voting-Runde
  FINALE: 15_000,              // 15s fürs Finale
  RESULTS: 15_000,             // 15s Ergebnisanzeige
  RECONNECT_GRACE: 15_000,     // 15s zum Reconnecten
} as const;

// === Elo-Konfiguration ===
export const ELO = {
  START_RATING: 1000,
  K_FACTOR: 32,
} as const;

// === Voting ===
export const VOTING = {
  MIN_ROUNDS: 2,
  MAX_ROUNDS: 7,
  SECONDS_PER_ROUND: 5,
} as const;

// === Pixel-Canvas ===
export const CANVAS = {
  WIDTH: 8,
  HEIGHT: 8,
  TOTAL_PIXELS: 64,
  MIN_PIXELS_SET: 5,           // Mindestens 5 nicht-leere Pixel
  BACKGROUND_COLOR: '1',       // Weiß
} as const;

// === Farbpalette (16 Farben) ===
export const PALETTE = [
  '#000000', // 0 - Schwarz
  '#FFFFFF', // 1 - Weiß
  '#FF0000', // 2 - Rot
  '#00FF00', // 3 - Grün
  '#0000FF', // 4 - Blau
  '#FFFF00', // 5 - Gelb
  '#FF00FF', // 6 - Magenta
  '#00FFFF', // 7 - Cyan
  '#FF8000', // 8 - Orange
  '#8000FF', // 9 - Lila
  '#0080FF', // A - Hellblau
  '#80FF00', // B - Lime
  '#FF0080', // C - Pink
  '#808080', // D - Grau
  '#C0C0C0', // E - Hellgrau
  '#804000', // F - Braun
] as const;

// === Rate Limits ===
export const RATE_LIMITS = {
  GLOBAL: { windowMs: 1_000, maxRequests: 50 },
  SUBMIT: { windowMs: 60_000, maxRequests: 10 },
  VOTE: { windowMs: 1_000, maxRequests: 3 },
  CREATE_ROOM: { windowMs: 60_000, maxRequests: 3 },
  JOIN_ROOM: { windowMs: 10_000, maxRequests: 5 },
  CHANGE_NAME: { windowMs: 60_000, maxRequests: 5 },
} as const;

// === DoS Protection ===
export const DOS = {
  MAX_CONNECTIONS_PER_IP: 5,
  MAX_TOTAL_CONNECTIONS: 15_000,
  MAX_PAYLOAD_SIZE: 1024,      // 1 KB
  IDLE_TIMEOUT: 300_000,       // 5 Minuten
} as const;

// === Kompression ===
export const COMPRESSION = {
  THRESHOLD_PLAYERS: 50,       // Ab 50 Spielern komprimieren
} as const;
```

---

### 1.6 Utility-Funktionen erstellen

- [ ] 📁 `apps/server/src/utils.ts` erstellen

**Datei:**

```typescript
// apps/server/src/utils.ts
import { nanoid } from 'nanoid';

/**
 * Generiert eine einzigartige ID
 */
export function generateId(length = 16): string {
  return nanoid(length);
}

/**
 * Generiert einen 4-stelligen Raum-Code (ohne 0, O, 1, I)
 */
export function generateRoomCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 4; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

/**
 * Generiert einen 4-stelligen Discriminator
 */
export function generateDiscriminator(): string {
  return Math.floor(Math.random() * 10000).toString().padStart(4, '0');
}

/**
 * Erstellt einen vollständigen Usernamen mit Discriminator
 */
export function createFullName(displayName: string, discriminator: string): string {
  return `${displayName}#${discriminator}`;
}

/**
 * Wählt ein zufälliges Element aus einem Array
 */
export function randomItem<T>(array: T[]): T {
  return array[Math.floor(Math.random() * array.length)];
}

/**
 * Mischt ein Array (Fisher-Yates Shuffle)
 */
export function shuffleArray<T>(array: T[]): T[] {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

/**
 * Wartet für eine bestimmte Zeit (Promise-basiert)
 */
export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Formatiert Millisekunden in lesbare Zeit
 */
export function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ${seconds % 60}s`;
  const hours = Math.floor(minutes / 60);
  return `${hours}h ${minutes % 60}m`;
}

/**
 * Logging mit Timestamp
 */
export function log(category: string, message: string, data?: unknown): void {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] [${category}] ${message}`, data ?? '');
}
```

---

### 1.7 Server-Struktur verifizieren

- [ ] 🧪 Alle Imports funktionieren
- [ ] 🧪 Server startet ohne Fehler
- [ ] 🧪 TypeScript kompiliert erfolgreich

---

## Kontrollpunkte

### 🧪 Test 1: Server startet

```bash
cd apps/server
pnpm dev
# ✅ "SpriteBox Server running on port 3000"
# ✅ Keine TypeScript-Fehler
```

### 🧪 Test 2: Health-Check funktioniert

```bash
curl http://localhost:3000/health
# ✅ JSON Response mit status: "healthy"
```

### 🧪 Test 3: WebSocket-Verbindung (Browser-Konsole)

```javascript
// In Browser-Konsole (http://localhost:5173)
import { io } from 'socket.io-client';
const socket = io('http://localhost:3000');
socket.on('connected', (data) => console.log('Connected:', data));
// ✅ Ausgabe: Connected: { socketId: '...', serverTime: ... }
```

### 🧪 Test 4: TypeScript-Check

```bash
pnpm typecheck
# ✅ Keine Fehler
```

---

## Definition of Done

- [ ] Express-Server läuft auf Port 3000
- [ ] Socket.io akzeptiert Verbindungen
- [ ] Health-Check Endpoint funktioniert
- [ ] Alle TypeScript-Typen sind definiert
- [ ] Konstanten sind zentral definiert
- [ ] Utility-Funktionen sind implementiert
- [ ] `pnpm typecheck` läuft ohne Fehler
- [ ] Alle Änderungen sind committed

---

## Dateiübersicht nach Phase 1

```
apps/server/src/
├── index.ts       ✅ Express + Socket.io Setup
├── socket.ts      ✅ Socket-Handler
├── types.ts       ✅ TypeScript Interfaces
├── constants.ts   ✅ Zentrale Konstanten
└── utils.ts       ✅ Hilfsfunktionen
```

---

## Nächster Schritt

👉 **Weiter zu [Phase 2: Instanz-System](./phase-2-instances.md)**
