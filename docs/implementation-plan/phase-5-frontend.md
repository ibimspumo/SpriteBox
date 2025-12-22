# Phase 5: Frontend-Grundgerüst

**Ziel:** Svelte 5 Projekt aufsetzen, Socket.io Client verbinden, Stores für State-Management, Basis-Routing.

**Voraussetzungen:**
- Phase 4 abgeschlossen
- Server-API ist komplett
- `pnpm dev` startet Backend auf Port 3000

---

## Aufgaben

### 5.1 Svelte 5 Projekt finalisieren

- [ ] 🔧 SvelteKit konfigurieren
- [ ] 🔧 TypeScript einrichten
- [ ] 📁 Ordnerstruktur anlegen

**Falls noch nicht in Phase 0 erledigt:**

```bash
cd apps
pnpm create svelte@latest web
# Wähle: Skeleton, TypeScript, ESLint

cd web
pnpm add socket.io-client
pnpm add -D @types/node
```

**Ordnerstruktur:**

```
apps/web/src/
├── lib/
│   ├── socket.ts        # Socket.io Client
│   ├── stores.ts        # Svelte Stores
│   ├── types.ts         # Shared Types
│   └── utils.ts         # Hilfsfunktionen
├── components/
│   ├── Lobby.svelte
│   ├── PixelCanvas.svelte
│   ├── ColorPalette.svelte
│   ├── Voting.svelte
│   ├── Finale.svelte
│   └── Results.svelte
├── routes/
│   ├── +layout.svelte
│   └── +page.svelte
└── app.html
```

---

### 5.2 Socket.io Client erstellen

- [ ] 📁 `apps/web/src/lib/socket.ts` erstellen
- [ ] 🔧 Verbindungslogik
- [ ] 🔧 Auto-Reconnect

**Datei:**

```typescript
// apps/web/src/lib/socket.ts
import { io, type Socket } from 'socket.io-client';
import { browser } from '$app/environment';

// Typen für Events (sollten mit Server übereinstimmen)
export interface ServerToClientEvents {
  connected: (data: { socketId: string; serverTime: number; user: User }) => void;
  error: (data: { code: string; message?: string }) => void;
  'lobby-joined': (data: LobbyJoinedData) => void;
  'player-joined': (data: { user: User }) => void;
  'player-left': (data: { playerId: string; kicked?: boolean }) => void;
  'lobby-timer-started': (data: { duration: number; startsAt: number }) => void;
  'phase-changed': (data: PhaseChangedData) => void;
  'submission-received': (data: { success: boolean; submissionCount: number }) => void;
  'voting-round': (data: VotingRoundData) => void;
  'vote-received': (data: { success: boolean; eloChange?: { winner: number; loser: number } }) => void;
  'finale-start': (data: FinaleData) => void;
  'game-results': (data: GameResultsData) => void;
  'name-changed': (data: { user: User }) => void;
  'kicked': (data: { reason: string }) => void;
}

export interface ClientToServerEvents {
  ping: (callback: (time: number) => void) => void;
  'join-public': () => void;
  'create-room': () => void;
  'join-room': (data: { code: string }) => void;
  'leave-lobby': () => void;
  'change-name': (data: { name: string }) => void;
  'host-start-game': () => void;
  'host-kick-player': (data: { playerId: string }) => void;
  'submit-drawing': (data: { pixels: string }) => void;
  'vote': (data: { chosenId: string }) => void;
  'finale-vote': (data: { playerId: string }) => void;
}

// Interfaces
export interface User {
  displayName: string;
  discriminator: string;
  fullName: string;
}

export interface LobbyJoinedData {
  instanceId: string;
  type: 'public' | 'private';
  code?: string;
  isHost?: boolean;
  players: User[];
  spectator: boolean;
}

export interface PhaseChangedData {
  phase: string;
  prompt?: string;
  duration?: number;
  startsAt?: number;
  endsAt?: number;
  round?: number;
  totalRounds?: number;
}

export interface VotingRoundData {
  round: number;
  totalRounds: number;
  imageA: { playerId: string; pixels: string };
  imageB: { playerId: string; pixels: string };
  timeLimit: number;
  endsAt: number;
}

export interface FinaleData {
  finalists: Array<{
    playerId: string;
    pixels: string;
    user?: User;
    elo: number;
  }>;
  timeLimit: number;
  endsAt: number;
}

export interface GameResultsData {
  prompt: string;
  rankings: Array<{
    place: number;
    playerId: string;
    user: User;
    pixels: string;
    finalVotes: number;
    elo: number;
  }>;
  totalParticipants: number;
}

// Socket-Instanz
let socket: Socket<ServerToClientEvents, ClientToServerEvents> | null = null;

/**
 * Initialisiert die Socket-Verbindung
 */
export function initSocket(): Socket<ServerToClientEvents, ClientToServerEvents> {
  if (!browser) {
    throw new Error('Socket can only be initialized in browser');
  }

  if (socket?.connected) {
    return socket;
  }

  const serverUrl = import.meta.env.DEV
    ? 'http://localhost:3000'
    : window.location.origin;

  socket = io(serverUrl, {
    autoConnect: true,
    reconnection: true,
    reconnectionAttempts: 10,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    timeout: 20000,
  });

  // Debug-Logging in Development
  if (import.meta.env.DEV) {
    socket.onAny((event, ...args) => {
      console.log(`[Socket] ${event}:`, args);
    });
  }

  return socket;
}

/**
 * Gibt die aktuelle Socket-Instanz zurück
 */
export function getSocket(): Socket<ServerToClientEvents, ClientToServerEvents> | null {
  return socket;
}

/**
 * Trennt die Verbindung
 */
export function disconnectSocket(): void {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}

/**
 * Prüft ob verbunden
 */
export function isConnected(): boolean {
  return socket?.connected ?? false;
}

/**
 * Wartet auf Verbindung
 */
export function waitForConnection(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (!socket) {
      reject(new Error('Socket not initialized'));
      return;
    }

    if (socket.connected) {
      resolve();
      return;
    }

    const timeout = setTimeout(() => {
      reject(new Error('Connection timeout'));
    }, 10000);

    socket.once('connect', () => {
      clearTimeout(timeout);
      resolve();
    });

    socket.once('connect_error', (err) => {
      clearTimeout(timeout);
      reject(err);
    });
  });
}
```

---

### 5.3 Svelte Stores erstellen

- [ ] 📁 `apps/web/src/lib/stores.ts` erstellen
- [ ] 🔧 Reactive Stores für Game State

**Datei:**

```typescript
// apps/web/src/lib/stores.ts
import { writable, derived, type Readable } from 'svelte/store';
import type { User, LobbyJoinedData, VotingRoundData, FinaleData, GameResultsData } from './socket';

// === Connection State ===
export const connectionStatus = writable<'disconnected' | 'connecting' | 'connected'>('disconnected');
export const socketId = writable<string | null>(null);

// === User State ===
export const currentUser = writable<User | null>(null);

// === Lobby State ===
export interface LobbyState {
  instanceId: string | null;
  type: 'public' | 'private' | null;
  code: string | null;
  isHost: boolean;
  players: User[];
  isSpectator: boolean;
}

export const lobby = writable<LobbyState>({
  instanceId: null,
  type: null,
  code: null,
  isHost: false,
  players: [],
  isSpectator: false,
});

// === Game State ===
export type GamePhase = 'idle' | 'lobby' | 'countdown' | 'drawing' | 'voting' | 'finale' | 'results';

export interface GameState {
  phase: GamePhase;
  prompt: string | null;
  timer: {
    duration: number;
    endsAt: number;
    remaining: number;
  } | null;
}

export const game = writable<GameState>({
  phase: 'idle',
  prompt: null,
  timer: null,
});

// === Drawing State ===
export const pixels = writable<string>('1'.repeat(64)); // Weiß als Standard
export const selectedColor = writable<number>(0); // Schwarz
export const hasSubmitted = writable<boolean>(false);

// === Voting State ===
export interface VotingState {
  round: number;
  totalRounds: number;
  imageA: { playerId: string; pixels: string } | null;
  imageB: { playerId: string; pixels: string } | null;
  hasVoted: boolean;
}

export const voting = writable<VotingState>({
  round: 0,
  totalRounds: 0,
  imageA: null,
  imageB: null,
  hasVoted: false,
});

// === Finale State ===
export const finale = writable<FinaleData | null>(null);
export const finaleVoted = writable<boolean>(false);

// === Results State ===
export const results = writable<GameResultsData | null>(null);

// === Error State ===
export const lastError = writable<{ code: string; message?: string } | null>(null);

// === Derived Stores ===
export const isInGame: Readable<boolean> = derived(lobby, ($lobby) => $lobby.instanceId !== null);
export const isHost: Readable<boolean> = derived(lobby, ($lobby) => $lobby.isHost);
export const playerCount: Readable<number> = derived(lobby, ($lobby) => $lobby.players.length);

// === Timer Store (mit Auto-Update) ===
let timerInterval: ReturnType<typeof setInterval> | null = null;

export function startTimer(duration: number, endsAt: number): void {
  if (timerInterval) {
    clearInterval(timerInterval);
  }

  game.update((g) => ({
    ...g,
    timer: { duration, endsAt, remaining: Math.max(0, endsAt - Date.now()) },
  }));

  timerInterval = setInterval(() => {
    game.update((g) => {
      if (!g.timer) return g;
      const remaining = Math.max(0, g.timer.endsAt - Date.now());
      if (remaining <= 0) {
        clearInterval(timerInterval!);
        timerInterval = null;
      }
      return { ...g, timer: { ...g.timer, remaining } };
    });
  }, 100);
}

export function stopTimer(): void {
  if (timerInterval) {
    clearInterval(timerInterval);
    timerInterval = null;
  }
  game.update((g) => ({ ...g, timer: null }));
}

// === Reset Functions ===
export function resetGameState(): void {
  stopTimer();
  game.set({ phase: 'idle', prompt: null, timer: null });
  pixels.set('1'.repeat(64));
  hasSubmitted.set(false);
  voting.set({ round: 0, totalRounds: 0, imageA: null, imageB: null, hasVoted: false });
  finale.set(null);
  finaleVoted.set(false);
  results.set(null);
}

export function resetLobbyState(): void {
  lobby.set({
    instanceId: null,
    type: null,
    code: null,
    isHost: false,
    players: [],
    isSpectator: false,
  });
  resetGameState();
}
```

---

### 5.4 Socket-Store-Bridge

- [ ] 📁 `apps/web/src/lib/socketBridge.ts` erstellen
- [ ] 🔧 Events mit Stores verbinden

**Datei:**

```typescript
// apps/web/src/lib/socketBridge.ts
import { initSocket, getSocket, type Socket, type ServerToClientEvents, type ClientToServerEvents } from './socket';
import {
  connectionStatus,
  socketId,
  currentUser,
  lobby,
  game,
  voting,
  finale,
  results,
  lastError,
  hasSubmitted,
  finaleVoted,
  startTimer,
  stopTimer,
  resetGameState,
  resetLobbyState,
  type GamePhase,
} from './stores';

let initialized = false;

/**
 * Initialisiert Socket und verbindet mit Stores
 */
export function initSocketBridge(): void {
  if (initialized) return;
  initialized = true;

  const socket = initSocket();
  setupEventHandlers(socket);
}

function setupEventHandlers(socket: Socket<ServerToClientEvents, ClientToServerEvents>): void {
  // === Connection Events ===
  socket.on('connect', () => {
    connectionStatus.set('connected');
    socketId.set(socket.id ?? null);
  });

  socket.on('disconnect', () => {
    connectionStatus.set('disconnected');
    socketId.set(null);
  });

  socket.on('connect_error', () => {
    connectionStatus.set('disconnected');
  });

  // === Server Events ===
  socket.on('connected', (data) => {
    currentUser.set(data.user);
  });

  socket.on('error', (data) => {
    lastError.set(data);
    console.error('[Socket Error]', data);
  });

  // === Lobby Events ===
  socket.on('lobby-joined', (data) => {
    lobby.set({
      instanceId: data.instanceId,
      type: data.type,
      code: data.code ?? null,
      isHost: data.isHost ?? false,
      players: data.players,
      isSpectator: data.spectator,
    });
    game.update((g) => ({ ...g, phase: 'lobby' }));
  });

  socket.on('player-joined', (data) => {
    lobby.update((l) => ({
      ...l,
      players: [...l.players, data.user],
    }));
  });

  socket.on('player-left', (data) => {
    lobby.update((l) => ({
      ...l,
      players: l.players.filter((p) => p.fullName !== data.playerId),
    }));
  });

  socket.on('lobby-timer-started', (data) => {
    startTimer(data.duration, data.startsAt);
  });

  // === Phase Events ===
  socket.on('phase-changed', (data) => {
    const phase = data.phase as GamePhase;

    game.update((g) => ({
      ...g,
      phase,
      prompt: data.prompt ?? g.prompt,
    }));

    // Timer starten wenn angegeben
    if (data.duration && data.endsAt) {
      startTimer(data.duration, data.endsAt);
    } else if (data.duration && data.startsAt) {
      startTimer(data.duration, data.startsAt);
    }

    // Phase-spezifische Resets
    if (phase === 'drawing') {
      hasSubmitted.set(false);
    } else if (phase === 'voting') {
      voting.update((v) => ({
        ...v,
        round: data.round ?? v.round,
        totalRounds: data.totalRounds ?? v.totalRounds,
        hasVoted: false,
      }));
    } else if (phase === 'lobby') {
      resetGameState();
    }
  });

  // === Drawing Events ===
  socket.on('submission-received', (data) => {
    if (data.success) {
      hasSubmitted.set(true);
    }
  });

  // === Voting Events ===
  socket.on('voting-round', (data) => {
    voting.set({
      round: data.round,
      totalRounds: data.totalRounds,
      imageA: data.imageA,
      imageB: data.imageB,
      hasVoted: false,
    });
    startTimer(data.timeLimit, data.endsAt);
  });

  socket.on('vote-received', () => {
    voting.update((v) => ({ ...v, hasVoted: true }));
  });

  // === Finale Events ===
  socket.on('finale-start', (data) => {
    finale.set(data);
    finaleVoted.set(false);
    startTimer(data.timeLimit, data.endsAt);
    game.update((g) => ({ ...g, phase: 'finale' }));
  });

  // === Results Events ===
  socket.on('game-results', (data) => {
    results.set(data);
    game.update((g) => ({ ...g, phase: 'results' }));
  });

  // === User Events ===
  socket.on('name-changed', (data) => {
    currentUser.set(data.user);
  });

  socket.on('kicked', (data) => {
    lastError.set({ code: 'KICKED', message: data.reason });
    resetLobbyState();
  });
}

// === Action Functions ===
export function joinPublicGame(): void {
  getSocket()?.emit('join-public');
}

export function createPrivateRoom(): void {
  getSocket()?.emit('create-room');
}

export function joinPrivateRoom(code: string): void {
  getSocket()?.emit('join-room', { code });
}

export function leaveLobby(): void {
  getSocket()?.emit('leave-lobby');
  resetLobbyState();
}

export function changeName(name: string): void {
  getSocket()?.emit('change-name', { name });
}

export function hostStartGame(): void {
  getSocket()?.emit('host-start-game');
}

export function submitDrawing(pixelData: string): void {
  getSocket()?.emit('submit-drawing', { pixels: pixelData });
}

export function vote(chosenId: string): void {
  getSocket()?.emit('vote', { chosenId });
}

export function finaleVote(playerId: string): void {
  getSocket()?.emit('finale-vote', { playerId });
  finaleVoted.set(true);
}
```

---

### 5.5 Farbpalette definieren

- [ ] 📁 `apps/web/src/lib/palette.ts` erstellen

**Datei:**

```typescript
// apps/web/src/lib/palette.ts
export const PALETTE = [
  { hex: '#000000', name: 'Schwarz' },   // 0
  { hex: '#FFFFFF', name: 'Weiß' },      // 1
  { hex: '#FF0000', name: 'Rot' },       // 2
  { hex: '#00FF00', name: 'Grün' },      // 3
  { hex: '#0000FF', name: 'Blau' },      // 4
  { hex: '#FFFF00', name: 'Gelb' },      // 5
  { hex: '#FF00FF', name: 'Magenta' },   // 6
  { hex: '#00FFFF', name: 'Cyan' },      // 7
  { hex: '#FF8000', name: 'Orange' },    // 8
  { hex: '#8000FF', name: 'Lila' },      // 9
  { hex: '#0080FF', name: 'Hellblau' },  // A (10)
  { hex: '#80FF00', name: 'Lime' },      // B (11)
  { hex: '#FF0080', name: 'Pink' },      // C (12)
  { hex: '#808080', name: 'Grau' },      // D (13)
  { hex: '#C0C0C0', name: 'Hellgrau' },  // E (14)
  { hex: '#804000', name: 'Braun' },     // F (15)
] as const;

/**
 * Konvertiert Hex-Zeichen zu Farbindex
 */
export function hexCharToIndex(char: string): number {
  return parseInt(char, 16);
}

/**
 * Konvertiert Farbindex zu Hex-Zeichen
 */
export function indexToHexChar(index: number): string {
  return index.toString(16).toUpperCase();
}

/**
 * Gibt die Hex-Farbe für einen Index zurück
 */
export function getColorByIndex(index: number): string {
  return PALETTE[index]?.hex ?? PALETTE[0].hex;
}
```

---

### 5.6 Basis-Layout erstellen

- [ ] 📁 `apps/web/src/routes/+layout.svelte` erstellen

**Datei:**

```svelte
<!-- apps/web/src/routes/+layout.svelte -->
<script lang="ts">
  import { onMount } from 'svelte';
  import { browser } from '$app/environment';
  import { initSocketBridge } from '$lib/socketBridge';
  import { connectionStatus } from '$lib/stores';

  onMount(() => {
    if (browser) {
      initSocketBridge();
    }
  });
</script>

<div class="app">
  {#if $connectionStatus === 'disconnected'}
    <div class="connection-overlay">
      <p>Verbindung wird hergestellt...</p>
    </div>
  {/if}

  <slot />
</div>

<style>
  :global(*, *::before, *::after) {
    box-sizing: border-box;
  }

  :global(body) {
    margin: 0;
    padding: 0;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    background: #1a1a2e;
    color: #eee;
    min-height: 100vh;
  }

  .app {
    min-height: 100vh;
    display: flex;
    flex-direction: column;
  }

  .connection-overlay {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.8);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
  }

  .connection-overlay p {
    font-size: 1.5rem;
    color: #fff;
  }
</style>
```

---

### 5.7 Haupt-Page erstellen

- [ ] 📁 `apps/web/src/routes/+page.svelte` erstellen

**Datei:**

```svelte
<!-- apps/web/src/routes/+page.svelte -->
<script lang="ts">
  import { game, lobby, currentUser } from '$lib/stores';
  // Components werden in Phase 6 erstellt
  // import Lobby from '$lib/components/Lobby.svelte';
  // import Drawing from '$lib/components/Drawing.svelte';
  // import Voting from '$lib/components/Voting.svelte';
  // import Finale from '$lib/components/Finale.svelte';
  // import Results from '$lib/components/Results.svelte';
</script>

<main>
  <header>
    <h1>🎨 SpriteBox</h1>
    {#if $currentUser}
      <span class="user">{$currentUser.fullName}</span>
    {/if}
  </header>

  <div class="game-container">
    {#if $game.phase === 'idle'}
      <div class="welcome">
        <h2>Willkommen bei SpriteBox!</h2>
        <p>Zeichne 8x8 Pixel-Art und vote für die besten Werke.</p>
        <!-- Buttons kommen in Phase 6 -->
        <p class="dev-note">🔧 Phase 5 abgeschlossen - UI kommt in Phase 6</p>
      </div>
    {:else if $game.phase === 'lobby'}
      <div class="phase-placeholder">
        <h2>Lobby</h2>
        <p>{$lobby.players.length} Spieler</p>
        <p>Phase: {$game.phase}</p>
      </div>
    {:else if $game.phase === 'countdown'}
      <div class="phase-placeholder">
        <h2>Countdown</h2>
        <p>Prompt: {$game.prompt}</p>
      </div>
    {:else if $game.phase === 'drawing'}
      <div class="phase-placeholder">
        <h2>Zeichnen</h2>
        <p>Prompt: {$game.prompt}</p>
      </div>
    {:else if $game.phase === 'voting'}
      <div class="phase-placeholder">
        <h2>Voting</h2>
      </div>
    {:else if $game.phase === 'finale'}
      <div class="phase-placeholder">
        <h2>Finale</h2>
      </div>
    {:else if $game.phase === 'results'}
      <div class="phase-placeholder">
        <h2>Ergebnisse</h2>
      </div>
    {/if}
  </div>
</main>

<style>
  main {
    flex: 1;
    display: flex;
    flex-direction: column;
  }

  header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1rem;
    background: #16213e;
    border-bottom: 1px solid #0f3460;
  }

  header h1 {
    margin: 0;
    font-size: 1.5rem;
  }

  .user {
    color: #aaa;
    font-size: 0.9rem;
  }

  .game-container {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 2rem;
  }

  .welcome, .phase-placeholder {
    text-align: center;
    max-width: 500px;
  }

  .welcome h2 {
    color: #e94560;
    margin-bottom: 1rem;
  }

  .dev-note {
    margin-top: 2rem;
    padding: 1rem;
    background: #0f3460;
    border-radius: 8px;
    color: #aaa;
  }

  .phase-placeholder {
    padding: 2rem;
    background: #16213e;
    border-radius: 12px;
    border: 1px solid #0f3460;
  }
</style>
```

---

### 5.8 Vite-Config anpassen

- [ ] 🔧 Proxy für Socket.io

**Datei:**

```typescript
// apps/web/vite.config.ts
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [sveltekit()],
  server: {
    port: 5173,
    proxy: {
      '/socket.io': {
        target: 'http://localhost:3000',
        ws: true,
        changeOrigin: true,
      },
    },
  },
});
```

---

## Kontrollpunkte

### 🧪 Test 1: Frontend startet

```bash
cd apps/web
pnpm dev
# ✅ http://localhost:5173 öffnet sich
# ✅ Keine Fehler in der Konsole
```

### 🧪 Test 2: Socket verbindet

```javascript
// Browser-Konsole
// ✅ "[Socket] connected" erscheint
// ✅ connectionStatus wechselt zu 'connected'
```

### 🧪 Test 3: Stores funktionieren

```javascript
// In Svelte-Komponente oder Konsole
import { currentUser } from '$lib/stores';
currentUser.subscribe((u) => console.log('User:', u));
// ✅ User-Objekt wird angezeigt nach Verbindung
```

### 🧪 Test 4: TypeScript ohne Fehler

```bash
cd apps/web
pnpm typecheck
# ✅ Keine Fehler
```

---

## Definition of Done

- [ ] Svelte 5 Projekt ist konfiguriert
- [ ] Socket.io Client verbindet automatisch
- [ ] Stores für alle Game-States existieren
- [ ] Socket-Events aktualisieren Stores
- [ ] Action-Functions für alle Events
- [ ] Farbpalette ist definiert
- [ ] Basis-Layout zeigt Verbindungsstatus
- [ ] Haupt-Page zeigt Phase-abhängigen Content
- [ ] TypeScript kompiliert ohne Fehler
- [ ] Alle Änderungen sind committed

---

## Dateiübersicht nach Phase 5

```
apps/web/src/
├── lib/
│   ├── socket.ts        ✅ Socket.io Client
│   ├── stores.ts        ✅ Svelte Stores
│   ├── socketBridge.ts  ✅ Events zu Stores
│   ├── palette.ts       ✅ Farbpalette
│   └── types.ts         ✅ Shared Types
├── components/          (leer, kommt in Phase 6)
├── routes/
│   ├── +layout.svelte   ✅ Basis-Layout
│   └── +page.svelte     ✅ Haupt-Page
└── app.html
```

---

## Nächster Schritt

👉 **Weiter zu [Phase 6: UI-Komponenten](./phase-6-ui.md)**
