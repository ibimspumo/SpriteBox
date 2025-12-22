# Pixel Game – Technische Spezifikation

Ein webbasiertes Multiplayer-Spiel, bei dem Spieler in einem 8x8 Pixel-Grid Bilder nach Vorgabe zeichnen und sich gegenseitig bewerten.

**Ziel:** 100% Open Source, keine externen Datenbanken, keine Secrets, ein Befehl zum Starten.

---

## Tech Stack

### Frontend

| Tool | Zweck |
|------|-------|
| [Svelte 5](https://svelte.dev) | UI-Framework – reaktiv, performant, kompakte Bundle-Size |
| [Vite](https://vite.dev) | Build-Tool & Dev-Server |
| [TypeScript](https://www.typescriptlang.org) | Typsicherheit |

**Design-Ansatz:** Mobile First – UI wird primär für Touch-Geräte optimiert, Desktop ist sekundär.

**Theming:** Dark/Light Mode Toggle – User-Präferenz wird in LocalStorage gespeichert.

### Backend

| Tool | Zweck |
|------|-------|
| [Node.js](https://nodejs.org) | JavaScript Runtime auf dem Server |
| [Express](https://expressjs.com) | HTTP-Server für statische Dateien |
| [Socket.io](https://socket.io) | WebSocket-Kommunikation für Echtzeit-Sync |

### State Management

| Ansatz | Beschreibung |
|--------|--------------|
| In-Memory (Map) | Alle Spielstände leben im RAM – keine Datenbank nötig |

### Deployment

| Tool | Zweck |
|------|-------|
| [Render](https://render.com) | Hosting mit EU-Server (Frankfurt), Free Tier verfügbar |

### Entwicklung & Collaboration

| Tool | Zweck |
|------|-------|
| [pnpm](https://pnpm.io) | Package Manager für Monorepo |
| [GitHub](https://github.com) | Code-Hosting, Issues, Pull Requests |
| [ESLint](https://eslint.org) / [Prettier](https://prettier.io) | Code-Qualität & Formatierung |

---

## Architektur-Überblick

```
┌─────────────────────────────────────────────────────────┐
│                      Server                             │
├─────────────────────────────────────────────────────────┤
│                                                         │
│   Globale Lobby                                         │
│        │                                                │
│        ├──→ Öffentliche Instanz A (0-100 Spieler)      │
│        ├──→ Öffentliche Instanz B (0-100 Spieler)      │
│        │                                                │
│        ├──→ Private Instanz "A7X2" (Code-basiert)      │
│        └──→ Private Instanz "B3K9" (Code-basiert)      │
│                                                         │
│   Neue Spieler → Offene Instanz oder neue erstellen    │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

---

## Instanz-System

### Öffentliche Instanzen (Auto-Sharding)

Spieler werden automatisch einer offenen Instanz zugewiesen. Eine neue Runde startet automatisch:
- **Sofort** wenn 100 Spieler erreicht sind, ODER
- **Nach 45 Sekunden** sobald mindestens 5 Spieler da sind

Der Countdown startet erst bei 5 Spielern – nicht vorher.

```javascript
const MAX_PLAYERS = 100;
const MIN_PLAYERS = 5;           // Minimum zum Starten
const LOBBY_TIMEOUT = 45_000;    // 45 Sekunden Wartezeit

function createPublicInstance() {
  const instance = {
    id: generateId(),
    type: 'public',
    phase: 'lobby',
    players: new Map(),
    lobbyTimer: null,
    timerStarted: false,
    createdAt: Date.now()
  };
  
  return instance;
}

function onPlayerJoin(instance, player) {
  instance.players.set(player.id, player);
  
  // Timer startet erst wenn MIN_PLAYERS erreicht
  if (!instance.timerStarted && instance.players.size >= MIN_PLAYERS) {
    instance.timerStarted = true;
    startLobbyTimer(instance);
  }
  
  // Sofort starten wenn voll
  if (instance.players.size >= MAX_PLAYERS) {
    clearTimeout(instance.lobbyTimer);
    startGame(instance);
  }
}

function startLobbyTimer(instance) {
  instance.lobbyTimer = setTimeout(() => {
    if (instance.players.size >= MIN_PLAYERS) {
      startGame(instance);
    }
  }, LOBBY_TIMEOUT);
  
  // Broadcast: Timer läuft jetzt
  io.to(instance.id).emit('lobby-timer-started', {
    duration: LOBBY_TIMEOUT,
    startsAt: Date.now() + LOBBY_TIMEOUT
  });
}

function assignToPublicInstance(player) {
  // Finde offene Instanz (in Lobby-Phase, nicht voll)
  let instance = instances.find(i => 
    i.type === 'public' &&
    i.phase === 'lobby' && 
    i.players.size < MAX_PLAYERS
  );
  
  // Keine passende? Neue erstellen
  if (!instance) {
    instance = createPublicInstance();
    instances.push(instance);
  }
  
  onPlayerJoin(instance, player);
  return instance;
}
```

### Private Instanzen (4-stelliger Code)

Spieler können private Räume erstellen und per Code beitreten. Der Ersteller ist der Host.

```javascript
function createPrivateRoom(hostPlayer) {
  const code = generateRoomCode(); // z.B. "A7X2"
  
  const instance = createInstance({
    type: 'private',
    code: code,
    hostId: hostPlayer.id,  // Ersteller ist Host
    maxPlayers: 100
  });
  
  instance.players.set(hostPlayer.id, hostPlayer);
  privateRooms.set(code, instance);
  
  return code;
}

function generateRoomCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Ohne 0, O, 1, I
  let code = '';
  for (let i = 0; i < 4; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

function joinPrivateRoom(player, code) {
  const instance = privateRooms.get(code.toUpperCase());
  
  if (!instance) return { error: 'Raum nicht gefunden' };
  if (instance.players.size >= instance.maxPlayers) return { error: 'Raum voll' };
  if (instance.phase !== 'lobby') {
    // Spiel läuft bereits – als Zuschauer beitreten
    instance.spectators.set(player.id, player);
    return { success: true, instance, spectator: true };
  }
  
  instance.players.set(player.id, player);
  return { success: true, instance };
}
```

### Host-Kontrollen (nur private Räume)

```javascript
function hostStartGame(instance, playerId) {
  // Nur Host kann manuell starten
  if (instance.hostId !== playerId) return { error: 'Nur der Host kann starten' };
  if (instance.players.size < MIN_PLAYERS) return { error: 'Mindestens 5 Spieler benötigt' };
  
  startGame(instance);
  return { success: true };
}

// Host kann auch:
// - Spieler kicken (vor Spielstart)
// - Raum schließen
// - Einstellungen ändern (Timer, etc.)
```

---

## Daten-Kompression (LZ-String)

### Warum LZ-String?

| Library | Kompression | Dekompression | Use Case |
|---------|-------------|---------------|----------|
| **lz-string** | ~400 ops/sec | ~1,400 ops/sec | Strings, localStorage |
| lzutf8 | 3-14 MB/s | 20-120 MB/s | Große Daten, Streams |
| pako (gzip) | Langsamer | Langsamer | Maximale Kompression |

**lz-string** ist ideal für uns: schnell, klein, keine Dependencies.

### Performance-Messungen

```
Einzelnes Bild (64 Zeichen):
├── Kompression:    ~0.01ms
├── Dekompression:  ~0.005ms
└── Ersparnis:      ~20-40% (nicht lohnend)

Galerie 100 Bilder (6.4 KB):
├── Kompression:    ~0.5ms
├── Dekompression:  ~0.2ms
└── Ersparnis:      ~50-60%

Galerie 1000 Bilder (64 KB):
├── Kompression:    ~5ms
├── Dekompression:  ~2ms
└── Ersparnis:      ~50-70%
```

### Ab wann lohnt sich Kompression?

| Spieler | Ohne Kompression | Mit Kompression | Ersparnis |
|---------|------------------|-----------------|-----------|
| 10 | 640 Bytes | ~400 Bytes | Nicht lohnend |
| 50 | 3.2 KB | ~1.5 KB | Grenzwertig |
| **100** | **6.4 KB** | **~2.5 KB** | **Lohnt sich** |
| 500 | 32 KB | ~12 KB | Sehr gut |
| 1000 | 64 KB | ~25 KB | Sehr gut |

**Schwellenwert: Ab 50 Spielern Kompression aktivieren.**

### RAM-Ersparnis (Server)

```
Ohne Kompression (10 Instanzen × 100 Spieler):
├── Submissions:     640 KB
├── Galerie-Cache:   640 KB
└── Total:          ~1.3 MB

Mit Kompression:
├── Submissions:     ~250 KB
├── Galerie-Cache:   ~250 KB
└── Total:          ~500 KB

Ersparnis: ~60%
```

Bei 100 parallelen Instanzen (10.000 Spieler):
- Ohne Kompression: ~13 MB
- Mit Kompression: ~5 MB

### Dynamische Implementierung

```typescript
import LZString from 'lz-string';

const COMPRESSION_THRESHOLD = 50;  // Spieler

interface CompressionConfig {
  enabled: boolean;
  threshold: number;
}

// Server: Entscheidet dynamisch
function shouldCompress(playerCount: number): boolean {
  return playerCount >= COMPRESSION_THRESHOLD;
}

// Server: Galerie senden
function sendGallery(instance: Instance) {
  const gallery = instance.submissions.map(s => ({
    playerId: s.playerId,
    user: s.user,
    pixels: s.pixels,
    upvotes: s.upvotes,
    downvotes: s.downvotes,
    placement: s.placement
  }));
  
  const playerCount = instance.players.size;
  const useCompression = shouldCompress(playerCount);
  
  if (useCompression) {
    const compressed = LZString.compressToUTF16(JSON.stringify(gallery));
    io.to(instance.id).emit('gallery', { 
      compressed: true, 
      data: compressed 
    });
  } else {
    io.to(instance.id).emit('gallery', { 
      compressed: false, 
      data: gallery 
    });
  }
}

// Client: Galerie empfangen
socket.on('gallery', (payload) => {
  let gallery;
  
  if (payload.compressed) {
    const decompressed = LZString.decompressFromUTF16(payload.data);
    gallery = JSON.parse(decompressed);
  } else {
    gallery = payload.data;
  }
  
  renderGallery(gallery);
});
```

### Kompression für einzelne Bilder (Voting)

Einzelne Bilder werden **nicht** komprimiert – der Overhead lohnt sich nicht:

```javascript
// NICHT komprimieren (zu klein):
socket.emit('vote-image', {
  pixels: "0F0F0F0F00000000FFFF0000..."  // 64 Zeichen
});

// Komprimiert wäre ~50 Zeichen + Overhead = nicht lohnend
```

### Batch-Kompression (Voting-Runde)

Wenn mehrere Bilder gleichzeitig geladen werden:

```javascript
// Server: Batch für Voting vorbereiten
function prepareVotingBatch(submissions: Submission[], count: number = 10) {
  const batch = submissions.slice(0, count).map(s => ({
    playerId: s.playerId,
    pixels: s.pixels
  }));
  
  // Batch komprimieren wenn > 5 Bilder
  if (count > 5) {
    return {
      compressed: true,
      data: LZString.compressToUTF16(JSON.stringify(batch))
    };
  }
  
  return { compressed: false, data: batch };
}
```

### Zusammenfassung

| Szenario | Kompression | Grund |
|----------|-------------|-------|
| Einzelbild senden | ❌ Nein | Overhead > Ersparnis |
| Voting Batch (>5) | ✅ Ja | Merkbare Ersparnis |
| Galerie (>50 Spieler) | ✅ Ja | Signifikante Ersparnis |
| Stats-Sync | ❌ Nein | Zu kleine Datenmenge |

---

## Daten-Effizienz

### Pixel-Speicherung

Das 8x8 Grid mit 16-Farben-Palette ist extrem kompakt:

```
8x8 = 64 Pixel
16 Farben = 4 Bit pro Pixel (0-F in Hex)
64 × 4 Bit = 256 Bit = 32 Bytes

Als Hex-String: 64 Zeichen
Beispiel: "0000000000000000000F0F00000F0F0000FFFF00000000000000000000000000"
```

### Farbpalette (16 Farben)

```javascript
const PALETTE = [
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
];
```

### Datenstruktur pro Submission

```typescript
interface Submission {
  playerId: string;   // ~10 Zeichen
  pixels: string;     // 64 Zeichen (Hex-String)
  timestamp: number;  // 8 Bytes
}

// Gesamt: ~80-100 Bytes pro Spieler
```

### Speicherverbrauch

| Spieleranzahl | Submissions | Größe |
|---------------|-------------|-------|
| 100 | 100 | ~10 KB |
| 500 | 500 | ~50 KB |
| 1.000 | 1.000 | ~100 KB |
| 10.000 | 10.000 | ~1 MB |

→ Selbst bei 10.000 gleichzeitigen Spielern ist der Speicherverbrauch minimal.

---

## Prompt-System

Prompts werden aus einer lokalen JSON-Datei generiert:

```json
{
  "prefixes": [
    "angry", "sleepy", "giant", "tiny", "robot",
    "medieval", "disco", "sad", "floating", "melting"
  ],
  "subjects": [
    "cat", "house", "pizza", "tree", "ghost",
    "banana", "knight", "spaceship", "frog", "burger"
  ],
  "suffixes": [
    "in space", "on fire", "at night", "in love",
    "running away", "eating cake", "as a king", "underwater"
  ]
}
```

```javascript
function generatePrompt(prompts) {
  const prefix = randomItem(prompts.prefixes);
  const subject = randomItem(prompts.subjects);
  const suffix = randomItem(prompts.suffixes);
  
  return `${prefix} ${subject} ${suffix}`;
  // z.B. "sleepy ghost eating cake"
}

// Mögliche Kombinationen: 50 × 1000 × 50 = 2.500.000
```

---

## Username-System

### Format

```
Benutzername#0000
     ↑         ↑
   Name    Discriminator (4-stellig)
```

**Beispiele:**
- `PixelMaster#4829`
- `Guest#7341`
- `🎨Artist#0042`

### Generierung

```javascript
function createUsername(name = null) {
  const discriminator = Math.floor(Math.random() * 10000)
    .toString()
    .padStart(4, '0');
  
  if (!name || name.trim() === '') {
    // Zufälliger Gastname
    const guestNames = [
      'Pixel', 'Artist', 'Painter', 'Doodler', 'Sketcher',
      'Creator', 'Designer', 'Drawer', 'Crafter', 'Maker'
    ];
    name = guestNames[Math.floor(Math.random() * guestNames.length)];
  }
  
  // Sanitize: Max 20 Zeichen, keine Sonderzeichen außer Emojis
  name = name.slice(0, 20).trim();
  
  return {
    displayName: name,
    discriminator: discriminator,
    fullName: `${name}#${discriminator}`  // z.B. "PixelMaster#4829"
  };
}
```

### Regeln

| Regel | Wert |
|-------|------|
| Max. Länge Name | 20 Zeichen |
| Discriminator | 4-stellig (0000-9999) |
| Erlaubte Zeichen | Buchstaben, Zahlen, Emojis, Leerzeichen |
| Unique | Nein – gleiche Namen erlaubt (Discriminator unterscheidet) |

### Name ändern

Spieler können ihren Namen jederzeit ändern. Der Discriminator bleibt gleich (an Session gebunden).

```javascript
function updateUsername(session, newName) {
  session.user.displayName = sanitizeName(newName);
  session.user.fullName = `${newName}#${session.user.discriminator}`;
}
```

---

## Spielablauf

### Timer-Konfiguration

```javascript
const TIMERS = {
  lobby: 45_000,        // 45 Sekunden (oder bei 100 Spielern)
  countdown: 5_000,     // 5 Sekunden
  drawing: 60_000,      // 60 Sekunden
  votingPerRound: 5_000, // 5 Sekunden pro Voting
  results: 15_000,      // 15 Sekunden Ergebnisanzeige
};
```

### Ablauf

```
┌─────────────────────────────────────────────────────────┐
│  PHASE 1: LOBBY                                         │
│  Spieler joinen                                         │
│  Timer startet erst bei 5 Spielern (dann 45s)           │
│  Startet sofort bei 100 Spielern                        │
│  Private Räume: Host startet manuell (min. 5)           │
└─────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────┐
│  PHASE 2: COUNTDOWN (5s)                                │
│  Prompt wird generiert und angezeigt                    │
└─────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────┐
│  PHASE 3: ZEICHNEN (60s)                                │
│  8x8 Grid, 16 Farben, Timer läuft                       │
│  Automatische Abgabe bei Timeout                        │
│  Min. 5 Pixel müssen gesetzt sein                       │
└─────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────┐
│  PHASE 4: VOTING RUNDE 1-3 (je 5s)                      │
│  Jeder sieht 3× zufälliges Bild → 👍 oder 👎            │
│  (Eigenes Bild wird nie angezeigt)                      │
│  100% → Top 50%                                         │
└─────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────┐
│  PHASE 5: VOTING RUNDE 4-5 (je 5s)                      │
│  Top 50% → Top 10%                                      │
│  Eliminierte Spieler werden Spectators                  │
└─────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────┐
│  PHASE 6: FINALE (1-2 Runden, je 5s)                    │
│  Jeder sieht ALLE Finalisten (Top 10%)                  │
│  Ranking durch Gesamtvotes                              │
│  Ties sind erlaubt (geteilter Platz)                    │
└─────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────┐
│  PHASE 7: ERGEBNIS (15s)                                │
│  🥇🥈🥉 Gewinner anzeigen                                │
│  Alle Bilder in Galerie                                 │
│  Spectators werden zu Spielern für nächste Runde        │
└─────────────────────────────────────────────────────────┘
                          │
                          ▼
              Neue Runde startet automatisch
              (Spieler bleiben in der Instanz)
```

### Beispiel mit verschiedenen Spielerzahlen

| Spieler | Nach Runde 1-3 | Nach Runde 4-5 | Finale |
|---------|----------------|----------------|--------|
| 100 | 50 | 10 | 10 |
| 50 | 25 | 5 | 5 |
| 20 | 10 | 2 | 2 |
| 10 | 5 | 2 | 2 |

---

## Stats-System (ohne Datenbank)

### Hybrid-Ansatz: LocalStorage + WebSocket

```
┌─────────────────────────────────────────────────────────┐
│                                                         │
│   LocalStorage (eigenes Gerät)                          │
│   └── Eigene Stats persistent speichern                 │
│                                                         │
│   WebSocket (Server RAM)                                │
│   └── Stats aller verbundenen Spieler live sehen        │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### Datenstruktur

```typescript
interface PlayerStats {
  gamesPlayed: number;
  placements: {
    1: number;   // Anzahl 1. Plätze
    2: number;   // Anzahl 2. Plätze
    3: number;   // Anzahl 3. Plätze
  };
}

// LocalStorage
localStorage.setItem('pixelgame-stats', JSON.stringify({
  gamesPlayed: 47,
  placements: { 1: 3, 2: 5, 3: 8 }
}));
```

### Sync beim Verbinden

```javascript
// Client: Stats beim Connect senden
socket.on('connect', () => {
  const stats = JSON.parse(localStorage.getItem('pixelgame-stats')) || {
    gamesPlayed: 0,
    placements: { 1: 0, 2: 0, 3: 0 }
  };
  
  socket.emit('sync-stats', stats);
});

// Server: Stats an alle broadcasten
function broadcastConnectedStats(instance) {
  const allStats = [...instance.players.values()].map(p => ({
    user: p.user,
    stats: p.stats
  }));
  
  io.to(instance.id).emit('players-stats', allStats);
}
```

### Stats aktualisieren nach Runde

```javascript
// Client: Nach Spielende
socket.on('game-results', (results) => {
  const myResult = results.find(r => r.playerId === myPlayerId);
  
  const stats = JSON.parse(localStorage.getItem('pixelgame-stats'));
  stats.gamesPlayed++;
  
  if (myResult.placement <= 3) {
    stats.placements[myResult.placement]++;
  }
  
  localStorage.setItem('pixelgame-stats', JSON.stringify(stats));
  
  // Sync mit Server
  socket.emit('sync-stats', stats);
});
```

### Vorteile

| Aspekt | Lösung |
|--------|--------|
| Eigene Stats persistent? | ✅ LocalStorage |
| Stats anderer sehen? | ✅ WebSocket (live) |
| Datenbank nötig? | ❌ Nein |
| Open Source friendly? | ✅ Ja |
| Privacy? | ✅ Nur online sichtbar |

---

## Galerie (Ergebnis-Anzeige)

Nach jeder Runde sehen Spieler die **komplette Galerie** aller Submissions:

### Features

- Alle Bilder der Runde anzeigen (scrollbar)
- Sortiert nach Platzierung
- Pro Bild sichtbar:
  - Username#0000
  - Pixel-Art (8x8 skaliert)
  - Vote-Anzahl (👍/👎)
  - Platzierung
- Galerie bleibt sichtbar bis neue Runde startet
- Nur für Spieler die in der Runde waren (nicht für neue Joiner)

### Datenstruktur

```typescript
interface GalleryEntry {
  playerId: string;
  user: User;
  pixels: string;
  upvotes: number;
  downvotes: number;
  placement: number;
}

// Server sendet am Ende der Runde
socket.emit('game-results', {
  prompt: "sleepy ghost eating cake",
  gallery: [
    { playerId: "abc", user: {...}, pixels: "0F0F...", upvotes: 23, downvotes: 5, placement: 1 },
    { playerId: "def", user: {...}, pixels: "00FF...", upvotes: 18, downvotes: 8, placement: 2 },
    // ... alle Submissions
  ]
});
```

---

## Verbindung & Spectator Mode

### Session-Management

```javascript
// Session wird in Cookie/LocalStorage gespeichert
interface Session {
  id: string;           // Unique Session ID
  user: {
    displayName: string;
    discriminator: string;
    fullName: string;
  };
  createdAt: number;
}
```

### Reconnect Grace Period

Bei kurzem Verbindungsverlust (Internet-Aussetzer) hat der Spieler 15 Sekunden zum Reconnecten:

```javascript
const RECONNECT_GRACE_PERIOD = 15_000;  // 15 Sekunden

function handleDisconnect(instance, playerId) {
  const player = instance.players.get(playerId);
  if (!player) return;
  
  // Markiere als disconnected, aber entferne noch nicht
  player.disconnectedAt = Date.now();
  player.status = 'disconnected';
  
  // Grace Period Timer
  setTimeout(() => {
    if (player.status === 'disconnected') {
      // Spieler nicht zurückgekommen – endgültig entfernen
      removePlayerFromRound(instance, playerId);
    }
  }, RECONNECT_GRACE_PERIOD);
}

function handleReconnect(instance, sessionId) {
  const player = [...instance.players.values()]
    .find(p => p.sessionId === sessionId);
  
  if (player && player.status === 'disconnected') {
    // Erfolgreich reconnected!
    player.status = 'connected';
    player.disconnectedAt = null;
    return { success: true, player };
  }
  
  return { success: false };
}
```

### Disconnect während Runde

Wenn ein Spieler während einer laufenden Runde disconnected (nach Grace Period):

```javascript
function removePlayerFromRound(instance, playerId) {
  // Spieler komplett aus der Runde entfernen
  instance.players.delete(playerId);
  
  // Submission löschen (falls vorhanden)
  instance.submissions = instance.submissions
    .filter(s => s.playerId !== playerId);
  
  // Votes von diesem Spieler bleiben (fair für andere)
  // Votes FÜR diesen Spieler werden ignoriert
  instance.advancedPlayers = instance.advancedPlayers
    .filter(id => id !== playerId);
}
```

### Spectator Mode

Spieler werden zu Zuschauern wenn sie:
- Während einer laufenden Runde joinen
- Im Voting eliminiert werden
- Die Runde verlassen aber zuschauen wollen

```javascript
interface Spectator {
  sessionId: string;
  user: User;
  joinedAt: number;
}

function addSpectator(instance, player) {
  instance.spectators.set(player.sessionId, {
    sessionId: player.sessionId,
    user: player.user,
    joinedAt: Date.now()
  });
}

// Spectators erhalten:
// - Live-Updates zum Spielstand
// - Alle Submissions im Voting (können aber nicht voten)
// - Ergebnisse am Ende
// - Werden automatisch Spieler in der nächsten Runde
```

### Submission-Validierung

Submissions werden nur ins Voting aufgenommen, wenn sie gültig sind:

```javascript
const MIN_PIXELS_SET = 5;  // Mindestens 5 nicht-leere Pixel

function validateSubmission(pixels) {
  const BACKGROUND = '1';  // Weiß als Standard-Hintergrund
  let setPixels = 0;
  
  for (const pixel of pixels) {
    if (pixel !== BACKGROUND) setPixels++;
  }
  
  return setPixels >= MIN_PIXELS_SET;
}
```

---

## Voting-System (Elo-Rating)

### Elo erklärt

**Was ist Elo?**

Elo ist ein Punkte-System das misst, wie gut etwas im Vergleich zu anderen ist. Ursprünglich für Schach entwickelt.

```
Grundprinzip:
─────────────────────────────────────────────────────────

1. Alle starten gleich (1000 Punkte)

2. Bei jedem Duell: Ein Bild gewinnt, eins verliert
   → Gewinner bekommt Punkte
   → Verlierer verliert Punkte

3. Am Ende: Höchste Punktzahl = Bestes Bild
```

**Wichtig zu verstehen:**

"Gewinnen" im Duell bedeutet: Ein Voter hat Bild A statt Bild B gewählt. Das ist keine objektive Wahrheit – es ist die Meinung dieses einen Voters. Aber über viele Duelle hinweg zeigt sich ein Muster: Gute Bilder werden öfter gewählt und sammeln mehr Punkte.

**Warum bekommt der Gewinner manchmal wenige Punkte?**

```
Szenario: Bild A (1200 Elo) vs Bild B (800 Elo)

Bild A hat schon oft gewonnen → hohe Elo
Bild B hat oft verloren → niedrige Elo

Fall 1: Bild A gewinnt (erwartet)
├── "Na klar, A ist ja auch besser"
├── A bekommt nur +5 Punkte (war ja erwartet)
└── B verliert nur -5 Punkte (hat gegen Favorit verloren)

Fall 2: Bild B gewinnt (Überraschung!)
├── "Wow, B hat den Favoriten geschlagen!"
├── B bekommt +27 Punkte (war unerwartet → große Belohnung)
└── A verliert -27 Punkte (hat gegen Underdog verloren → große Strafe)
```

**Das macht das System fair:**

- Ein gutes Bild, das einmal Pech hat, verliert nicht viel
- Ein schlechtes Bild, das einmal Glück hat, gewinnt nicht viel
- Über mehrere Runden setzt sich echte Qualität durch

**Einfache Analogie:**

```
Stell dir vor, es gibt ein Fußball-Turnier:

- Bayern München (stark) vs Dorfverein (schwach)
- Wenn Bayern gewinnt: Keine Überraschung, wenig Ruhm
- Wenn Dorfverein gewinnt: Riesensensation, viel Ruhm

Nach vielen Spielen steht Bayern trotzdem oben,
weil sie MEISTENS gewinnen – nicht weil sie IMMER gewinnen.
```

### Elo-Berechnung

```typescript
const ELO_CONFIG = {
  startRating: 1000,  // Alle starten hier
  kFactor: 32,        // Wie stark wirkt ein Sieg/Niederlage
};

interface EloResult {
  winnerNewElo: number;
  loserNewElo: number;
  winnerChange: number;
  loserChange: number;
}

function calculateElo(winnerElo: number, loserElo: number): EloResult {
  // Schritt 1: Erwartete Gewinnwahrscheinlichkeit berechnen
  const expectedWinner = 1 / (1 + Math.pow(10, (loserElo - winnerElo) / 400));
  
  // Schritt 2: Punkte-Änderung berechnen
  const winnerChange = Math.round(ELO_CONFIG.kFactor * (1 - expectedWinner));
  const loserChange = -winnerChange;
  
  return {
    winnerNewElo: winnerElo + winnerChange,
    loserNewElo: loserElo + loserChange,
    winnerChange,
    loserChange
  };
}
```

**Beispiele:**

| Duell | Gewinner | Punkte-Änderung |
|-------|----------|-----------------|
| 1000 vs 1000 | Egal wer | +16 / -16 |
| 1200 vs 800, 1200 gewinnt | Erwartet | +5 / -5 |
| 1200 vs 800, 800 gewinnt | Überraschung! | +27 / -27 |
| 1100 vs 900, 900 gewinnt | Kleine Überraschung | +20 / -20 |

### Dynamische Runden-Berechnung

```typescript
interface VotingConfig {
  votingRounds: number;
  secondsPerRound: number;
  finalistCount: number;
  totalVotingTime: number;
}

function calculateVotingConfig(playerCount: number): VotingConfig {
  // Maximum: Jeder sieht jedes fremde Bild nur 1x
  const maxPossibleRounds = Math.floor((playerCount - 1) / 2);
  
  // Gewünschte Runden basierend auf Spielerzahl
  let desiredRounds: number;
  if (playerCount <= 10) {
    desiredRounds = 3;
  } else if (playerCount <= 20) {
    desiredRounds = 4;
  } else if (playerCount <= 30) {
    desiredRounds = 5;
  } else if (playerCount <= 50) {
    desiredRounds = 6;
  } else {
    desiredRounds = 7;
  }
  
  const votingRounds = Math.max(2, Math.min(maxPossibleRounds, desiredRounds));
  const finalistCount = Math.min(10, Math.max(3, Math.ceil(playerCount * 0.1)));
  
  return {
    votingRounds,
    secondsPerRound: 5,
    finalistCount,
    totalVotingTime: votingRounds * 5 + 15
  };
}
```

**Beispiele:**

| Spieler | Voting-Runden | Finalisten | Gesamtzeit |
|---------|---------------|------------|------------|
| 5 | 2 | 3 | 25s |
| 10 | 3 | 3 | 30s |
| 20 | 4 | 3 | 35s |
| 30 | 5 | 3 | 40s |
| 50 | 6 | 5 | 45s |
| 100 | 7 | 10 | 50s |

### Fairness-System

#### Problem

Ohne System könnte es passieren:
```
Bild A: 15x gezeigt → viele Votes, hohe Elo
Bild B: 3x gezeigt  → kaum Votes, niedrige Elo
→ Unfair! B hatte keine Chance.
```

#### Lösung: Pre-Computed Assignments

Vor jeder Runde berechnen wir ALLE Duelle im Voraus:

1. **Kein Voter sieht sein eigenes Bild**
2. **Kein Voter sieht das gleiche Bild zweimal**
3. **Jedes Bild wird ungefähr gleich oft gezeigt (±1)**
4. **Idealerweise: Keine Bild-Paarung tritt zweimal an**

```typescript
interface VotingAssignment {
  voterId: string;
  imageA: string;
  imageB: string;
  round: number;
}

interface VotingState {
  voterSeenImages: Map<string, Set<string>>;
  imageShowCount: Map<string, number>;
  matchupHistory: Map<string, Set<string>>;
  eloRatings: Map<string, number>;
}

function initializeVotingState(submissions: Submission[]): VotingState {
  const state: VotingState = {
    voterSeenImages: new Map(),
    imageShowCount: new Map(),
    matchupHistory: new Map(),
    eloRatings: new Map()
  };
  
  for (const sub of submissions) {
    state.eloRatings.set(sub.playerId, ELO_CONFIG.startRating);
    state.imageShowCount.set(sub.playerId, 0);
    state.matchupHistory.set(sub.playerId, new Set());
  }
  
  return state;
}
```

#### Assignment-Algorithmus

```typescript
function prepareVotingRound(
  instance: Instance,
  state: VotingState,
  roundNumber: number
): VotingAssignment[] {
  const submissions = instance.submissions;
  const assignments: VotingAssignment[] = [];
  
  // Alle aktiven Voter
  const voterIds = [
    ...instance.players.keys(),
    ...instance.spectators.keys()
  ];
  
  // Zufällige Reihenfolge für Fairness
  shuffleArray(voterIds);
  
  for (const voterId of voterIds) {
    const seen = state.voterSeenImages.get(voterId) || new Set();
    
    // Eigenes Bild immer ausschließen
    seen.add(voterId);
    
    // Verfügbare Bilder, sortiert nach wenigsten Anzeigen
    const available = submissions
      .filter(s => !seen.has(s.playerId))
      .map(s => ({
        playerId: s.playerId,
        showCount: state.imageShowCount.get(s.playerId) || 0
      }))
      .sort((a, b) => a.showCount - b.showCount);
    
    if (available.length < 2) {
      continue;  // Voter überspringt diese Runde
    }
    
    // Finde bestes Paar (noch nicht gegeneinander angetreten)
    let bestPair: [string, string] | null = null;
    
    for (let i = 0; i < available.length && !bestPair; i++) {
      for (let j = i + 1; j < available.length; j++) {
        const a = available[i].playerId;
        const b = available[j].playerId;
        
        const aMatchups = state.matchupHistory.get(a) || new Set();
        
        if (!aMatchups.has(b)) {
          bestPair = [a, b];
          break;
        }
      }
    }
    
    // Fallback: Die zwei mit wenigsten Anzeigen
    if (!bestPair) {
      bestPair = [available[0].playerId, available[1].playerId];
    }
    
    const [imageA, imageB] = bestPair;
    
    assignments.push({ voterId, imageA, imageB, round: roundNumber });
    
    // State aktualisieren
    seen.add(imageA);
    seen.add(imageB);
    state.voterSeenImages.set(voterId, seen);
    
    state.imageShowCount.set(imageA, (state.imageShowCount.get(imageA) || 0) + 1);
    state.imageShowCount.set(imageB, (state.imageShowCount.get(imageB) || 0) + 1);
    
    state.matchupHistory.get(imageA)!.add(imageB);
    state.matchupHistory.get(imageB)!.add(imageA);
  }
  
  return assignments;
}
```

#### Fairness-Validierung

```typescript
function validateFairness(state: VotingState): FairnessReport {
  const showCounts = [...state.imageShowCount.values()];
  
  if (showCounts.length === 0) {
    return { isFair: true, variance: 0, min: 0, max: 0, avg: 0 };
  }
  
  const min = Math.min(...showCounts);
  const max = Math.max(...showCounts);
  const avg = showCounts.reduce((a, b) => a + b, 0) / showCounts.length;
  
  return {
    isFair: max - min <= 2,
    variance: max - min,
    min,
    max,
    avg: Math.round(avg * 10) / 10
  };
}
```

### Spieler verlassen während Voting

**Regel:** Wenn ein Spieler während des Votings disconnected:
- Sein **Bild bleibt im Voting** (kann immer noch gewinnen!)
- Er **votet nicht mehr** (wird aus Voter-Liste entfernt)
- Seine **bisherigen Votes bleiben gültig**

```typescript
function handlePlayerDisconnectDuringVoting(
  instance: Instance,
  state: VotingState,
  disconnectedPlayerId: string
) {
  // 1. Spieler aus aktiven Votern entfernen
  instance.players.delete(disconnectedPlayerId);
  
  // 2. Pending Assignments für diesen Voter entfernen
  instance.pendingAssignments = instance.pendingAssignments
    .filter(a => a.voterId !== disconnectedPlayerId);
  
  // 3. WICHTIG: Bild NICHT aus dem Voting entfernen!
  //    Das Bild kann immer noch gewinnen.
  
  console.log(`[Voting] Player ${disconnectedPlayerId} left. ` +
              `Image stays, voter removed.`);
}
```

**Edge Cases:**

| Situation | Lösung |
|-----------|--------|
| Voter weg, Bild bleibt | ✅ Bild kann gewinnen |
| Alle bis auf 1 Voter weg | 1 Voter macht alle Duelle |
| Voter kommt zurück (Reconnect) | Wird wieder Voter, sieht keine Duplikate |
| Bild-Ersteller weg, Bild gewinnt | Bild gewinnt trotzdem |

### Vote-Verarbeitung

```typescript
interface Vote {
  voterId: string;
  winnerId: string;
  loserId: string;
  round: number;
  timestamp: number;
}

function processVote(
  instance: Instance,
  state: VotingState,
  voterId: string,
  chosenImageId: string,
  assignment: VotingAssignment
): VoteResult {
  // Validierung
  if (assignment.voterId !== voterId) {
    return { success: false, error: 'Invalid voter' };
  }
  
  if (chosenImageId !== assignment.imageA && chosenImageId !== assignment.imageB) {
    return { success: false, error: 'Invalid choice' };
  }
  
  const winnerId = chosenImageId;
  const loserId = winnerId === assignment.imageA ? assignment.imageB : assignment.imageA;
  
  // Elo berechnen
  const winnerElo = state.eloRatings.get(winnerId) || ELO_CONFIG.startRating;
  const loserElo = state.eloRatings.get(loserId) || ELO_CONFIG.startRating;
  
  const result = calculateElo(winnerElo, loserElo);
  
  // Elo aktualisieren
  state.eloRatings.set(winnerId, result.winnerNewElo);
  state.eloRatings.set(loserId, result.loserNewElo);
  
  // Vote speichern
  instance.votes.push({
    voterId,
    winnerId,
    loserId,
    round: assignment.round,
    timestamp: Date.now()
  });
  
  return { success: true };
}
```

### Finale

```typescript
interface Finalist {
  playerId: string;
  user: User;
  pixels: string;
  elo: number;
  finalVotes: number;
}

function prepareFinale(
  instance: Instance,
  state: VotingState,
  config: VotingConfig
): Finalist[] {
  // Sortiere nach Elo
  const ranked = instance.submissions
    .map(s => ({
      playerId: s.playerId,
      user: instance.players.get(s.playerId)?.user || 
            { displayName: 'Unknown', discriminator: '0000', fullName: 'Unknown#0000' },
      pixels: s.pixels,
      elo: state.eloRatings.get(s.playerId) || ELO_CONFIG.startRating,
      finalVotes: 0
    }))
    .sort((a, b) => b.elo - a.elo);
  
  return ranked.slice(0, config.finalistCount);
}

function determineWinners(finalists: Finalist[]): Finalist[] {
  return finalists.sort((a, b) => {
    // Primär: Finale-Votes
    if (a.finalVotes !== b.finalVotes) {
      return b.finalVotes - a.finalVotes;
    }
    // Sekundär: Elo
    return b.elo - a.elo;
  });
}
```

### Kompletter Voting-Ablauf

```
┌─────────────────────────────────────────────────────────┐
│  VOTING START                                           │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  50 Spieler haben gezeichnet                           │
│                                                         │
│  1. Config: 6 Runden, 5 Finalisten, ~45s total         │
│  2. State: Alle Bilder starten mit 1000 Elo            │
│                                                         │
└─────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────┐
│  RUNDE 1-6: Elo-Voting (je 5 Sekunden)                 │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  Vor der Runde:                                        │
│  ├── Assignments berechnen (fair verteilt)             │
│  └── An Clients senden                                 │
│                                                         │
│  Client zeigt:                                          │
│  ┌─────────────┐           ┌─────────────┐             │
│  │   Bild A    │    VS     │   Bild B    │             │
│  │   ░░▓▓░░    │           │   ▓▓░░▓▓    │             │
│  │   [Wählen]  │           │   [Wählen]  │             │
│  └─────────────┘           └─────────────┘             │
│                                                         │
│  Nach Vote: Elo für beide Bilder aktualisieren         │
│                                                         │
└─────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────┐
│  FINALE (15 Sekunden)                                   │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  Top 5 Bilder nach Elo:                                │
│  ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐              │
│  │1100 │ │1080 │ │1050 │ │1020 │ │1000 │              │
│  └─────┘ └─────┘ └─────┘ └─────┘ └─────┘              │
│                                                         │
│  Jeder wählt 1 Favorit (nicht eigenes Bild)            │
│                                                         │
└─────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────┐
│  ERGEBNIS                                               │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  Sortiert nach: Finale-Votes → Elo                     │
│                                                         │
│  🥇 1. Platz: PixelMaster#4829 (18 Votes, 1080 Elo)    │
│  🥈 2. Platz: Artist#1337 (15 Votes, 1100 Elo)         │
│  🥉 3. Platz: Doodler#0042 (12 Votes, 1050 Elo)        │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### Zusammenfassung Voting

| Regel | Wert |
|-------|------|
| Start-Elo | 1000 für alle |
| Runden | 2-7 (dynamisch) |
| Zeit pro Runde | 5 Sekunden |
| Finalisten | 10% (min 3, max 10) |
| Finale-Dauer | 15 Sekunden |
| Gesamtdauer | 25-50 Sekunden |
| Duplikate | Unmöglich |
| Fairness | Jedes Bild ±1 gleich oft |
| Disconnected | Bild bleibt, Voter weg |
| Tie-Breaking | Votes → Elo |

### Timeout-Handling

**Grundregel: Der Timer ist König. Das Spiel wartet NIEMALS auf einzelne Spieler.**

```typescript
const VOTING_TIMERS = {
  roundDuration: 5_000,    // 5 Sekunden pro Runde
  finaleDuration: 15_000,  // 15 Sekunden fürs Finale
  bufferTime: 500,         // 0.5s Buffer für Latenz
};

interface RoundState {
  roundNumber: number;
  startedAt: number;
  endsAt: number;
  votesReceived: number;
  totalVoters: number;
}

function startVotingRound(instance: Instance, state: VotingState, roundNumber: number) {
  // Assignments vorbereiten
  const assignments = prepareVotingRound(instance, state, roundNumber);
  
  // An alle Clients senden
  for (const assignment of assignments) {
    const socket = getSocket(assignment.voterId);
    if (socket) {
      socket.emit('voting-round', {
        round: roundNumber,
        imageA: getImageData(assignment.imageA),
        imageB: getImageData(assignment.imageB),
        timeLimit: VOTING_TIMERS.roundDuration,
        endsAt: Date.now() + VOTING_TIMERS.roundDuration
      });
    }
  }
  
  // Runden-State setzen
  instance.roundState = {
    roundNumber,
    startedAt: Date.now(),
    endsAt: Date.now() + VOTING_TIMERS.roundDuration,
    votesReceived: 0,
    totalVoters: assignments.length
  };
  
  // TIMER: Nach 5 Sekunden geht es weiter - EGAL WAS
  instance.roundTimer = setTimeout(() => {
    endVotingRound(instance, state, roundNumber);
  }, VOTING_TIMERS.roundDuration);
}

function onVoteReceived(
  instance: Instance,
  state: VotingState,
  voterId: string,
  chosenImageId: string
) {
  // Zu spät? (mit Buffer für Netzwerk-Latenz)
  const now = Date.now();
  if (now > instance.roundState.endsAt + VOTING_TIMERS.bufferTime) {
    return { success: false, error: 'Vote received too late' };
  }
  
  // Vote verarbeiten
  const result = processVote(instance, state, voterId, chosenImageId);
  
  if (result.success) {
    instance.roundState.votesReceived++;
    
    // Optional: Alle haben gevotet → Früher weiter (spart Zeit)
    if (instance.roundState.votesReceived >= instance.roundState.totalVoters) {
      clearTimeout(instance.roundTimer);
      endVotingRound(instance, state, instance.roundState.roundNumber);
    }
  }
  
  return result;
}

function endVotingRound(instance: Instance, state: VotingState, roundNumber: number) {
  // Stats loggen
  const stats = instance.roundState;
  const participation = Math.round((stats.votesReceived / stats.totalVoters) * 100);
  console.log(`[Voting] Round ${roundNumber} ended: ${stats.votesReceived}/${stats.totalVoters} votes (${participation}%)`);
  
  // Nächste Runde oder Finale?
  const config = calculateVotingConfig(instance.submissions.length);
  
  if (roundNumber < config.votingRounds) {
    // Nächste Runde
    startVotingRound(instance, state, roundNumber + 1);
  } else {
    // Finale starten
    startFinale(instance, state, config);
  }
}
```

#### Was passiert wenn jemand nicht votet?

| Situation | Konsequenz |
|-----------|------------|
| Spieler votet nicht in einer Runde | Kein Vote gezählt, Runde geht weiter |
| Spieler votet in keiner Runde | Seine Stimme fehlt einfach |
| Spieler ist AFK | Andere Spieler entscheiden |
| Nur 1 Person votet | Dessen Stimme zählt, Runde endet |
| Niemand votet | Runde endet, Elo unverändert |

**Keine Strafen, keine Kicks.** Wer nicht votet, verpasst halt seinen Einfluss.

#### Früher fertig werden

Wenn alle schnell voten, wartet das Spiel nicht die vollen 5 Sekunden:

```typescript
// Alle haben gevotet? → Sofort weiter!
if (votesReceived >= totalVoters) {
  clearTimeout(roundTimer);
  endVotingRound();  // Keine Wartezeit
}
```

Das macht das Spiel flüssiger für aktive Gruppen.

#### Client-Side Timer

```typescript
// Client zeigt Countdown
socket.on('voting-round', (data) => {
  showDuel(data.imageA, data.imageB);
  
  // Countdown anzeigen
  startCountdown(data.timeLimit);
  
  // Auto-Submit wenn Zeit abläuft (optional: zufällige Wahl)
  voteTimeout = setTimeout(() => {
    if (!hasVoted) {
      // UI zeigt "Zeit abgelaufen"
      showTimeoutMessage();
    }
  }, data.timeLimit);
});

socket.on('vote-received', () => {
  clearTimeout(voteTimeout);
  hasVoted = true;
  showWaitingForOthers();
});

socket.on('round-ended', (data) => {
  clearTimeout(voteTimeout);
  // Zeige kurz Ergebnis oder gehe zur nächsten Runde
});
```

#### Finale Timeout

```typescript
function startFinale(instance: Instance, state: VotingState, config: VotingConfig) {
  const finalists = prepareFinale(instance, state, config);
  
  // An alle Clients senden
  io.to(instance.id).emit('finale-start', {
    finalists: finalists.map(f => ({
      playerId: f.playerId,
      user: f.user,
      pixels: f.pixels,
      elo: f.elo
    })),
    timeLimit: VOTING_TIMERS.finaleDuration,
    endsAt: Date.now() + VOTING_TIMERS.finaleDuration
  });
  
  instance.finaleState = {
    finalists,
    votesReceived: 0,
    totalVoters: instance.players.size + instance.spectators.size
  };
  
  // TIMER: Nach 15 Sekunden ist Schluss
  instance.finaleTimer = setTimeout(() => {
    endFinale(instance, state);
  }, VOTING_TIMERS.finaleDuration);
}

function endFinale(instance: Instance, state: VotingState) {
  clearTimeout(instance.finaleTimer);
  
  const winners = determineWinners(instance.finaleState.finalists);
  
  // Ergebnis an alle senden
  io.to(instance.id).emit('game-results', {
    rankings: winners.map((w, index) => ({
      place: index + 1,
      playerId: w.playerId,
      user: w.user,
      pixels: w.pixels,
      elo: w.elo,
      finalVotes: w.finalVotes
    })),
    totalParticipants: instance.submissions.length
  });
  
  // Phase wechseln
  instance.phase = 'results';
  
  // Nach 15s: Nächste Runde starten
  setTimeout(() => {
    startNewRound(instance);
  }, 15_000);
}
```

---

## Skalierung & Limits

### RAM-Kalkulation

**Pro verbundenem Spieler (dauerhaft):**
```
Session/Socket:     ~200 Bytes
Username:           ~30 Bytes
Stats:              ~50 Bytes
─────────────────────────────
Gesamt:             ~280 Bytes
```

**Pro aktive Instanz (temporär):**
```
Metadata:           ~200 Bytes
Players Map (100):  ~20 KB
Submissions:        ~8 KB (komprimiert: ~3 KB)
Votes:              ~10 KB
Galerie-Cache:      ~3 KB (komprimiert)
─────────────────────────────
Gesamt:             ~35-45 KB
```

**Beispiel: 10.000 Spieler**
```
Spieler-Daten:
  10.000 × 280 Bytes     = 2.8 MB

Aktive Instanzen (100 Stück):
  100 × 45 KB            = 4.5 MB

Socket.io Overhead:
  10.000 × ~2 KB         = 20 MB

Node.js Baseline:
  ~50-100 MB
─────────────────────────────────────
TOTAL:                   ~80-130 MB
```

### Server-Kapazität

| Server RAM | Node.js Reserve | Verfügbar | Max Spieler |
|------------|-----------------|-----------|-------------|
| 512 MB | 150 MB | 362 MB | ~12.000 |
| 1 GB | 150 MB | 874 MB | ~28.000 |
| 2 GB | 150 MB | 1.9 GB | ~60.000 |
| 4 GB | 200 MB | 3.8 GB | ~125.000 |

---

## Memory Management

### Was muss aufgeräumt werden?

| Daten | Wann löschen? | Risiko wenn nicht |
|-------|---------------|-------------------|
| Instanz | Nach Runde + 60s | Memory Leak |
| Galerie | Nach neuer Runde startet | Akkumuliert |
| Disconnected Player | Nach 15s Grace Period | Zombie-Einträge |
| Leere Instanzen | Nach 30s ohne Spieler | Ungenutzte Objekte |
| Event Listeners | Bei Disconnect | Memory Leak |
| Alte Votes | Nach Runden-Ende | Akkumuliert |

### Cleanup-System

```typescript
// Konstanten
const CLEANUP_CONFIG = {
  galleryRetention: 60_000,       // 60s nach Rundenende
  emptyInstanceTimeout: 30_000,   // 30s ohne Spieler
  staleInstanceTimeout: 3600_000, // 1h ohne Aktivität
  memoryCheckInterval: 60_000,    // Alle 60s prüfen
  disconnectGracePeriod: 15_000,  // 15s Reconnect-Zeit
};

// Instanz komplett aufräumen
function cleanupInstance(instance: Instance) {
  // Timer stoppen
  clearTimeout(instance.lobbyTimer);
  clearTimeout(instance.phaseTimer);
  
  // Alle Event Listener entfernen
  instance.players.forEach(player => {
    player.socket?.removeAllListeners();
  });
  
  // Maps leeren
  instance.players.clear();
  instance.spectators.clear();
  
  // Arrays leeren
  instance.submissions = [];
  instance.votes = [];
  instance.gallery = null;
  
  // Aus globaler Liste entfernen
  instances.delete(instance.id);
  
  // Private Räume aus Map entfernen
  if (instance.type === 'private' && instance.code) {
    privateRooms.delete(instance.code);
  }
  
  console.log(`[Cleanup] Instance ${instance.id} removed`);
}

// Nach jeder Runde aufräumen
function onRoundEnd(instance: Instance) {
  // Galerie für begrenzte Zeit behalten
  setTimeout(() => {
    instance.gallery = null;
  }, CLEANUP_CONFIG.galleryRetention);
  
  // Sofort löschen
  instance.submissions = [];
  instance.votes = [];
  
  // Letzte Aktivität updaten
  instance.lastActivity = Date.now();
}

// Bei Spieler-Disconnect
function onPlayerDisconnect(instance: Instance, playerId: string) {
  const player = instance.players.get(playerId);
  if (!player) return;
  
  // Socket Listeners entfernen
  player.socket?.removeAllListeners();
  
  // Aus Maps entfernen
  instance.players.delete(playerId);
  instance.spectators.delete(playerId);
  
  // Globalen Counter updaten
  currentPlayerCount--;
  
  // Queue nachrücken
  processQueue();
}

// Periodischer Cleanup (alle 60s)
function startMemoryMonitor() {
  setInterval(() => {
    const now = Date.now();
    
    instances.forEach((instance, id) => {
      // Leere Instanzen entfernen
      if (instance.players.size === 0 && 
          now - instance.lastActivity > CLEANUP_CONFIG.emptyInstanceTimeout) {
        cleanupInstance(instance);
        return;
      }
      
      // Stale Instanzen entfernen (>1h ohne Aktivität)
      if (now - instance.lastActivity > CLEANUP_CONFIG.staleInstanceTimeout) {
        // Spieler warnen und dann cleanup
        io.to(instance.id).emit('instance-closing', {
          reason: 'inactivity'
        });
        cleanupInstance(instance);
      }
    });
    
    // Memory Stats loggen
    logMemoryUsage();
    
    // Garbage Collection hint (wenn verfügbar)
    if (global.gc) {
      global.gc();
    }
  }, CLEANUP_CONFIG.memoryCheckInterval);
}

function logMemoryUsage() {
  const usage = process.memoryUsage();
  const stats = {
    heapUsed: Math.round(usage.heapUsed / 1024 / 1024),
    heapTotal: Math.round(usage.heapTotal / 1024 / 1024),
    external: Math.round(usage.external / 1024 / 1024),
    rss: Math.round(usage.rss / 1024 / 1024),
    players: currentPlayerCount,
    instances: instances.size,
    queued: queue.length
  };
  
  console.log(`[Memory] Heap: ${stats.heapUsed}MB / ${stats.heapTotal}MB | ` +
              `Players: ${stats.players} | Instances: ${stats.instances} | ` +
              `Queue: ${stats.queued}`);
}
```

---

## RAM-Limit & Auto-Detection

### Server-Konfiguration

```typescript
import os from 'os';

interface ServerConfig {
  maxMemoryMB: number;
  maxPlayers: number;
  reservedMemoryMB: number;
  warningThreshold: number;  // 0.7 = 70%
  criticalThreshold: number; // 0.85 = 85%
}

// Automatische Erkennung
function detectServerConfig(): ServerConfig {
  const totalMemoryMB = Math.floor(os.totalmem() / 1024 / 1024);
  
  // Reserve basierend auf Gesamtspeicher
  const reservedMemoryMB = totalMemoryMB < 1024 ? 150 : 200;
  
  const availableMemoryMB = totalMemoryMB - reservedMemoryMB;
  
  // ~30 KB pro Spieler (konservativ, mit Buffer)
  const bytesPerPlayer = 30 * 1024;
  const maxPlayers = Math.floor((availableMemoryMB * 1024 * 1024) / bytesPerPlayer);
  
  const config: ServerConfig = {
    maxMemoryMB: totalMemoryMB,
    maxPlayers,
    reservedMemoryMB,
    warningThreshold: 0.7,
    criticalThreshold: 0.85
  };
  
  console.log(`[Config] Server RAM: ${totalMemoryMB}MB`);
  console.log(`[Config] Reserved: ${reservedMemoryMB}MB`);
  console.log(`[Config] Max Players: ${maxPlayers}`);
  
  return config;
}

// Optional: Override via Environment
function getServerConfig(): ServerConfig {
  const autoConfig = detectServerConfig();
  
  // ENV Overrides (optional)
  if (process.env.MAX_MEMORY_MB) {
    autoConfig.maxMemoryMB = parseInt(process.env.MAX_MEMORY_MB);
  }
  if (process.env.MAX_PLAYERS) {
    autoConfig.maxPlayers = parseInt(process.env.MAX_PLAYERS);
  }
  
  return autoConfig;
}
```

### Memory-Überwachung

```typescript
let serverConfig: ServerConfig;
let currentPlayerCount = 0;

function checkMemoryStatus(): 'ok' | 'warning' | 'critical' {
  const usage = process.memoryUsage();
  const usedMB = usage.heapUsed / 1024 / 1024;
  const limitMB = serverConfig.maxMemoryMB - serverConfig.reservedMemoryMB;
  const ratio = usedMB / limitMB;
  
  if (ratio >= serverConfig.criticalThreshold) {
    return 'critical';
  } else if (ratio >= serverConfig.warningThreshold) {
    return 'warning';
  }
  return 'ok';
}

function canAcceptNewPlayer(): boolean {
  const memStatus = checkMemoryStatus();
  
  // Bei kritischem Speicher: Keine neuen Spieler
  if (memStatus === 'critical') {
    return false;
  }
  
  // Player-Limit prüfen
  if (currentPlayerCount >= serverConfig.maxPlayers) {
    return false;
  }
  
  return true;
}
```

---

## Queue-System

### Warum Queue?

Wenn der Server voll ist, werden Spieler nicht abgewiesen, sondern in eine Warteschlange eingereiht.

### Implementation

```typescript
interface QueuedPlayer {
  id: string;
  socket: Socket;
  joinedAt: number;
  user: User;
}

const queue: QueuedPlayer[] = [];

const QUEUE_CONFIG = {
  maxQueueSize: 1000,
  queueTimeout: 300_000,  // 5 Minuten max warten
  updateInterval: 5_000,  // Position-Updates alle 5s
};

// Spieler versucht zu joinen
function tryJoinGame(socket: Socket, user: User): JoinResult {
  // Kann Server noch Spieler aufnehmen?
  if (canAcceptNewPlayer()) {
    currentPlayerCount++;
    return {
      success: true,
      queued: false
    };
  }
  
  // Queue voll?
  if (queue.length >= QUEUE_CONFIG.maxQueueSize) {
    return {
      success: false,
      queued: false,
      error: 'Server is full. Please try again later.'
    };
  }
  
  // In Queue einreihen
  const queuedPlayer: QueuedPlayer = {
    id: generateId(),
    socket,
    joinedAt: Date.now(),
    user
  };
  
  queue.push(queuedPlayer);
  
  // Queue-Timeout setzen
  setTimeout(() => {
    removeFromQueue(queuedPlayer.id, 'timeout');
  }, QUEUE_CONFIG.queueTimeout);
  
  return {
    success: false,
    queued: true,
    position: queue.length,
    estimatedWait: calculateWaitTime(queue.length)
  };
}

// Queue verarbeiten wenn Platz frei wird
function processQueue() {
  while (queue.length > 0 && canAcceptNewPlayer()) {
    const next = queue.shift();
    if (!next) break;
    
    // Prüfen ob Socket noch verbunden
    if (!next.socket.connected) {
      continue;  // Nächsten versuchen
    }
    
    currentPlayerCount++;
    
    // Spieler benachrichtigen
    next.socket.emit('queue-ready', {
      message: 'You can now join the game!'
    });
    
    // In Instanz einteilen
    const instance = assignToPublicInstance({
      id: next.id,
      socket: next.socket,
      user: next.user
    });
    
    next.socket.emit('joined', {
      instanceId: instance.id
    });
  }
  
  // Verbleibende Queue-Positionen updaten
  broadcastQueuePositions();
}

function broadcastQueuePositions() {
  queue.forEach((player, index) => {
    player.socket.emit('queue-update', {
      position: index + 1,
      estimatedWait: calculateWaitTime(index + 1)
    });
  });
}

function calculateWaitTime(position: number): number {
  // Durchschnittliche Rundendauer ~3 Minuten
  // ~5% der Spieler verlassen nach jeder Runde
  const avgRoundDuration = 180_000;  // 3 min
  const churnRate = 0.05;
  const playersLeavingPerRound = Math.max(1, currentPlayerCount * churnRate);
  
  const roundsToWait = Math.ceil(position / playersLeavingPerRound);
  return roundsToWait * avgRoundDuration;
}

function removeFromQueue(playerId: string, reason: 'timeout' | 'disconnect' | 'manual') {
  const index = queue.findIndex(p => p.id === playerId);
  if (index === -1) return;
  
  const player = queue[index];
  queue.splice(index, 1);
  
  if (player.socket.connected) {
    player.socket.emit('queue-removed', { reason });
  }
  
  // Positionen updaten
  broadcastQueuePositions();
}

// Queue-Position Updates (alle 5s)
setInterval(() => {
  broadcastQueuePositions();
}, QUEUE_CONFIG.updateInterval);
```

### Client-Seite

```typescript
// Queue Events
socket.on('queued', (data: { position: number; estimatedWait: number }) => {
  showQueueScreen({
    position: data.position,
    estimatedWait: data.estimatedWait
  });
});

socket.on('queue-update', (data: { position: number; estimatedWait: number }) => {
  updateQueueDisplay(data.position, data.estimatedWait);
});

socket.on('queue-ready', () => {
  hideQueueScreen();
  playSound('queue-ready');  // Für später
});

socket.on('queue-removed', (data: { reason: string }) => {
  if (data.reason === 'timeout') {
    showMessage('Queue timeout. Please try again.');
  }
  hideQueueScreen();
});

// UI Helper
function formatWaitTime(ms: number): string {
  const minutes = Math.ceil(ms / 60000);
  if (minutes < 2) return 'Less than 2 minutes';
  if (minutes < 60) return `About ${minutes} minutes`;
  return `About ${Math.ceil(minutes / 60)} hour(s)`;
}
```

---

## Server Health Endpoint

```typescript
// Für Monitoring / Load Balancer
app.get('/health', (req, res) => {
  const memStatus = checkMemoryStatus();
  const usage = process.memoryUsage();
  
  res.json({
    status: memStatus === 'critical' ? 'degraded' : 'healthy',
    memory: {
      status: memStatus,
      heapUsedMB: Math.round(usage.heapUsed / 1024 / 1024),
      heapTotalMB: Math.round(usage.heapTotal / 1024 / 1024),
      maxMB: serverConfig.maxMemoryMB
    },
    players: {
      current: currentPlayerCount,
      max: serverConfig.maxPlayers,
      queued: queue.length
    },
    instances: {
      active: instances.size,
      public: [...instances.values()].filter(i => i.type === 'public').length,
      private: [...instances.values()].filter(i => i.type === 'private').length
    },
    uptime: process.uptime()
  });
});
```

---

## Wann kommen wir an Grenzen?

| Metrik | Limit | Begründung |
|--------|-------|------------|
| Spieler pro Instanz | 100-200 | Voting-Phasen werden sonst zu lang |
| Gleichzeitige Instanzen | ~50-100 | Bei 1 GB RAM Server |
| Gleichzeitige Spieler | ~5.000-10.000 | Auf einem Server |
| WebSocket-Verbindungen | ~10.000 | Node.js Limit pro Prozess |

### Bottlenecks

1. **RAM:** Jede Instanz braucht ~100-500 KB im Speicher
2. **CPU:** Voting-Berechnung bei vielen Spielern
3. **Bandbreite:** WebSocket-Messages bei State-Updates

### Skalierungsoptionen (für später)

| Problem | Lösung |
|---------|--------|
| Mehr RAM nötig | Größeren Server nehmen |
| Mehr als 10.000 User | Redis für State-Sync + mehrere Server |
| Globale Latenz | Mehrere Regionen (EU, US, Asia) |

Für den Start ist ein einzelner Server völlig ausreichend.

---

## Projekt-Struktur

```
pixel-game/
├── apps/
│   ├── server/
│   │   ├── src/
│   │   │   ├── index.ts          # Entry Point
│   │   │   ├── socket.ts         # WebSocket Handler
│   │   │   ├── instance.ts       # Instanz-Logik
│   │   │   ├── voting.ts         # Voting-Algorithmus
│   │   │   └── phases.ts         # Phasen-Steuerung
│   │   ├── data/
│   │   │   └── prompts.json      # Prompt-Datenbank
│   │   └── package.json
│   │
│   └── web/
│       ├── src/
│       │   ├── lib/
│       │   │   ├── socket.ts     # Socket.io Client
│       │   │   ├── stores.ts     # Svelte Stores
│       │   │   └── types.ts      # TypeScript Types
│       │   ├── components/
│       │   │   ├── PixelCanvas.svelte
│       │   │   ├── ColorPalette.svelte
│       │   │   ├── Lobby.svelte
│       │   │   ├── Voting.svelte
│       │   │   └── Results.svelte
│       │   ├── routes/
│       │   │   └── +page.svelte
│       │   └── app.html
│       ├── vite.config.ts
│       └── package.json
│
├── package.json              # Workspace Root
├── pnpm-workspace.yaml
├── LICENSE                   # MIT
├── README.md
├── CONTRIBUTING.md
└── CODE_OF_CONDUCT.md
```

---

## Open Source Setup

### Für Contributors

```bash
# Repository klonen
git clone https://github.com/username/pixel-game.git
cd pixel-game

# Dependencies installieren
pnpm install

# Entwicklungsserver starten
pnpm dev

# → Frontend: http://localhost:5173
# → Backend:  http://localhost:3000
```

Keine API-Keys, keine Datenbank-Credentials, keine `.env` Datei nötig.

### Lizenz

**MIT License** – maximal permissiv:
- Jeder darf nutzen, ändern, verteilen
- Auch kommerziell
- Keine Einschränkungen

---

## Deployment

### Render (empfohlen)

1. [render.com](https://render.com) → Mit GitHub verbinden
2. "New Web Service" → Repository auswählen
3. Region: **Frankfurt (EU)** auswählen
4. Build Command: `pnpm install && pnpm build`
5. Start Command: `pnpm start`
6. Deploy klicken

Fertig. Keine Secrets, keine Umgebungsvariablen nötig.

### Selbst hosten

```bash
# Auf einem Server (z.B. Hetzner)
git clone https://github.com/username/pixel-game.git
cd pixel-game
pnpm install
pnpm build
pnpm start
```

Optional mit Docker (später hinzufügen).

---

## Warum dieser Stack?

| Entscheidung | Begründung |
|--------------|------------|
| Svelte 5 | Performant, kleine Bundle-Size, reaktiv ohne Boilerplate |
| Socket.io | Bewährt für Echtzeit, Fallbacks eingebaut, große Community |
| In-Memory State | Keine externe Abhängigkeit, Daten sind eh temporär |
| Kein Login | Weniger Komplexität, DSGVO-freundlich, niedrige Einstiegshürde |
| Render | EU-Server kostenlos, einfaches Deployment, kein DevOps-Wissen nötig |

---

## Sicherheit

### Grundprinzip: Server ist autoritativ

Der Client ist **nicht vertrauenswürdig**. Alle Spiellogik läuft auf dem Server.

```
❌ Client sagt: "Ich habe gewonnen"
✅ Server berechnet: Wer hat gewonnen

❌ Client sagt: "Mein Vote zählt 5x"
✅ Server validiert: 1 Vote pro Spieler pro Bild

❌ Client sagt: "Timer ist noch nicht abgelaufen"
✅ Server tracked: Eigene Timer, eigene Zeit
```

---

### Input Validation

**Alle Inputs werden validiert bevor sie verarbeitet werden.**

```typescript
import { z } from 'zod';  // Validation Library

// Username Validation
const UsernameSchema = z.object({
  displayName: z.string()
    .min(1)
    .max(20)
    .regex(/^[\p{L}\p{N}\p{Emoji}\s]+$/u)  // Letters, Numbers, Emoji, Spaces
    .transform(s => s.trim())
    .transform(s => sanitizeHtml(s))  // XSS Prevention
});

// Pixel Submission Validation
const PixelSchema = z.object({
  pixels: z.string()
    .length(64)  // Exakt 64 Zeichen
    .regex(/^[0-9A-Fa-f]+$/)  // Nur Hex-Zeichen
    .transform(s => s.toUpperCase())
});

// Room Code Validation
const RoomCodeSchema = z.object({
  code: z.string()
    .length(4)
    .regex(/^[A-Z0-9]+$/)
    .transform(s => s.toUpperCase())
});

// Vote Validation
const VoteSchema = z.object({
  targetId: z.string().uuid(),
  value: z.enum(['up', 'down'])
});

// Validation Wrapper
function validateInput<T>(schema: z.ZodSchema<T>, data: unknown): T | null {
  try {
    return schema.parse(data);
  } catch (error) {
    console.warn('[Validation] Invalid input:', error);
    return null;
  }
}

// Verwendung
socket.on('submit-pixels', (data) => {
  const validated = validateInput(PixelSchema, data);
  if (!validated) {
    socket.emit('error', { code: 'INVALID_INPUT' });
    return;
  }
  
  processSubmission(socket, validated.pixels);
});
```

### XSS Prevention

```typescript
import createDOMPurify from 'dompurify';
import { JSDOM } from 'jsdom';

const window = new JSDOM('').window;
const DOMPurify = createDOMPurify(window);

function sanitizeHtml(input: string): string {
  // Alle HTML Tags entfernen
  return DOMPurify.sanitize(input, {
    ALLOWED_TAGS: [],  // Keine Tags erlaubt
    ALLOWED_ATTR: []   // Keine Attribute erlaubt
  });
}

// Username wird sanitized bevor gespeichert
function setUsername(player: Player, name: string) {
  player.user.displayName = sanitizeHtml(name.slice(0, 20).trim());
}
```

---

### Rate Limiting

**Schutz vor Spam und DoS.**

```typescript
interface RateLimitConfig {
  windowMs: number;      // Zeitfenster
  maxRequests: number;   // Max Requests in diesem Fenster
  blockDurationMs: number; // Block-Dauer bei Überschreitung
}

const RATE_LIMITS: Record<string, RateLimitConfig> = {
  // Globale Limits pro Socket
  'global': {
    windowMs: 1_000,      // 1 Sekunde
    maxRequests: 50,      // Max 50 Events/Sekunde
    blockDurationMs: 30_000
  },
  
  // Spezifische Limits
  'submit-pixels': {
    windowMs: 60_000,     // 1 Minute
    maxRequests: 5,       // Max 5 Submissions/Minute
    blockDurationMs: 60_000
  },
  'vote': {
    windowMs: 1_000,      // 1 Sekunde
    maxRequests: 3,       // Max 3 Votes/Sekunde
    blockDurationMs: 10_000
  },
  'create-room': {
    windowMs: 60_000,     // 1 Minute
    maxRequests: 3,       // Max 3 Räume/Minute
    blockDurationMs: 120_000
  },
  'join-room': {
    windowMs: 10_000,     // 10 Sekunden
    maxRequests: 5,       // Max 5 Joins/10s
    blockDurationMs: 30_000
  },
  'change-username': {
    windowMs: 60_000,     // 1 Minute
    maxRequests: 5,       // Max 5 Änderungen/Minute
    blockDurationMs: 60_000
  }
};

// Rate Limiter Implementation
class RateLimiter {
  private requests: Map<string, number[]> = new Map();
  private blocked: Map<string, number> = new Map();
  
  check(key: string, config: RateLimitConfig): boolean {
    const now = Date.now();
    
    // Ist geblockt?
    const blockedUntil = this.blocked.get(key);
    if (blockedUntil && now < blockedUntil) {
      return false;
    }
    
    // Alte Requests aufräumen
    const requests = this.requests.get(key) || [];
    const validRequests = requests.filter(t => now - t < config.windowMs);
    
    // Limit erreicht?
    if (validRequests.length >= config.maxRequests) {
      this.blocked.set(key, now + config.blockDurationMs);
      console.warn(`[RateLimit] Blocked: ${key}`);
      return false;
    }
    
    // Request tracken
    validRequests.push(now);
    this.requests.set(key, validRequests);
    
    return true;
  }
  
  // Cleanup (alle 5 Minuten)
  cleanup() {
    const now = Date.now();
    this.blocked.forEach((until, key) => {
      if (now > until) this.blocked.delete(key);
    });
  }
}

const rateLimiter = new RateLimiter();

// Middleware
function rateLimit(socket: Socket, event: string): boolean {
  const config = RATE_LIMITS[event] || RATE_LIMITS['global'];
  const key = `${socket.id}:${event}`;
  
  if (!rateLimiter.check(key, config)) {
    socket.emit('error', {
      code: 'RATE_LIMITED',
      event,
      retryAfter: config.blockDurationMs
    });
    return false;
  }
  
  return true;
}

// Verwendung
socket.on('vote', (data) => {
  if (!rateLimit(socket, 'vote')) return;
  // ... vote processing
});
```

---

### Anti-Cheat

#### 1. Server-Side Timer

```typescript
// Client-Timer sind NICHT vertrauenswürdig
// Server tracked alle Zeiten selbst

class PhaseTimer {
  private startTime: number = 0;
  private duration: number = 0;
  
  start(durationMs: number) {
    this.startTime = Date.now();
    this.duration = durationMs;
  }
  
  isExpired(): boolean {
    return Date.now() > this.startTime + this.duration;
  }
  
  remainingMs(): number {
    return Math.max(0, (this.startTime + this.duration) - Date.now());
  }
}

// Submission nur akzeptieren wenn Phase aktiv
function handleSubmission(instance: Instance, playerId: string, pixels: string) {
  // Phase prüfen
  if (instance.phase !== 'drawing') {
    return { error: 'NOT_DRAWING_PHASE' };
  }
  
  // Timer prüfen
  if (instance.phaseTimer.isExpired()) {
    return { error: 'TIME_EXPIRED' };
  }
  
  // Bereits submitted?
  if (instance.submissions.some(s => s.playerId === playerId)) {
    return { error: 'ALREADY_SUBMITTED' };
  }
  
  // Valid!
  instance.submissions.push({ playerId, pixels, timestamp: Date.now() });
  return { success: true };
}
```

#### 2. Vote Manipulation Prevention

```typescript
function handleVote(instance: Instance, voterId: string, targetId: string, value: 'up' | 'down') {
  // Kann nicht eigenes Bild voten
  if (voterId === targetId) {
    return { error: 'CANNOT_VOTE_SELF' };
  }
  
  // Target muss existieren und noch im Rennen sein
  const targetSubmission = instance.submissions.find(s => s.playerId === targetId);
  if (!targetSubmission || !instance.advancedPlayers.includes(targetId)) {
    return { error: 'INVALID_TARGET' };
  }
  
  // Bereits gevotet in dieser Phase?
  const existingVote = instance.votes.find(v => 
    v.voterId === voterId && 
    v.targetId === targetId && 
    v.phase === instance.phase
  );
  if (existingVote) {
    return { error: 'ALREADY_VOTED' };
  }
  
  // Voter muss aktiver Spieler sein
  if (!instance.players.has(voterId) && !instance.spectators.has(voterId)) {
    return { error: 'NOT_IN_GAME' };
  }
  
  // Valid!
  instance.votes.push({
    voterId,
    targetId,
    value,
    phase: instance.phase,
    timestamp: Date.now()
  });
  
  return { success: true };
}
```

#### 3. Multi-Account Detection

```typescript
// Fingerprinting (Best Effort - nicht 100% sicher)
interface ClientFingerprint {
  ip: string;
  userAgent: string;
  screenResolution?: string;
  timezone?: string;
}

const fingerprintConnections: Map<string, Set<string>> = new Map();
const MAX_CONNECTIONS_PER_FINGERPRINT = 3;

function checkMultiAccount(socket: Socket, fingerprint: ClientFingerprint): boolean {
  const fpHash = hashFingerprint(fingerprint);
  
  const connections = fingerprintConnections.get(fpHash) || new Set();
  
  if (connections.size >= MAX_CONNECTIONS_PER_FINGERPRINT) {
    console.warn(`[Security] Possible multi-account: ${fpHash}`);
    // Nicht blocken, aber loggen und ggf. Votes weniger gewichten
    socket.data.suspectedMultiAccount = true;
  }
  
  connections.add(socket.id);
  fingerprintConnections.set(fpHash, connections);
  
  return true;
}

// Bei Disconnect aufräumen
function onDisconnect(socket: Socket) {
  const fpHash = socket.data.fingerprintHash;
  const connections = fingerprintConnections.get(fpHash);
  if (connections) {
    connections.delete(socket.id);
    if (connections.size === 0) {
      fingerprintConnections.delete(fpHash);
    }
  }
}
```

#### 4. Pixel Validation

```typescript
function validatePixels(pixels: string): ValidationResult {
  // Länge prüfen
  if (pixels.length !== 64) {
    return { valid: false, error: 'INVALID_LENGTH' };
  }
  
  // Nur Hex-Zeichen
  if (!/^[0-9A-F]+$/i.test(pixels)) {
    return { valid: false, error: 'INVALID_CHARACTERS' };
  }
  
  // Farbwerte prüfen (0-F = 0-15)
  for (const char of pixels) {
    const value = parseInt(char, 16);
    if (value < 0 || value > 15) {
      return { valid: false, error: 'INVALID_COLOR' };
    }
  }
  
  // Minimum Pixel Check (Anti-AFK)
  const BACKGROUND_COLOR = '0';
  let setPixels = 0;
  for (const pixel of pixels) {
    if (pixel !== BACKGROUND_COLOR) setPixels++;
  }
  if (setPixels < 5) {
    return { valid: false, error: 'TOO_FEW_PIXELS' };
  }
  
  return { valid: true };
}
```

---

### DoS Protection

#### 1. Connection Limits

```typescript
const CONNECTION_LIMITS = {
  maxConnectionsPerIP: 10,
  maxTotalConnections: 15_000,
  connectionRatePerIP: {
    windowMs: 60_000,
    maxConnections: 20
  }
};

const ipConnections: Map<string, Set<string>> = new Map();
const ipConnectionRate: Map<string, number[]> = new Map();

io.use((socket, next) => {
  const ip = getClientIP(socket);
  
  // Globales Limit
  if (io.engine.clientsCount >= CONNECTION_LIMITS.maxTotalConnections) {
    return next(new Error('SERVER_FULL'));
  }
  
  // IP Connection Limit
  const ipConns = ipConnections.get(ip) || new Set();
  if (ipConns.size >= CONNECTION_LIMITS.maxConnectionsPerIP) {
    console.warn(`[Security] Too many connections from IP: ${ip}`);
    return next(new Error('TOO_MANY_CONNECTIONS'));
  }
  
  // IP Rate Limit
  const now = Date.now();
  const rateWindow = CONNECTION_LIMITS.connectionRatePerIP;
  const attempts = (ipConnectionRate.get(ip) || [])
    .filter(t => now - t < rateWindow.windowMs);
  
  if (attempts.length >= rateWindow.maxConnections) {
    console.warn(`[Security] Connection rate exceeded for IP: ${ip}`);
    return next(new Error('RATE_LIMITED'));
  }
  
  attempts.push(now);
  ipConnectionRate.set(ip, attempts);
  
  // Track connection
  ipConns.add(socket.id);
  ipConnections.set(ip, ipConns);
  
  socket.data.ip = ip;
  next();
});

function getClientIP(socket: Socket): string {
  // Hinter Proxy (Render, etc.)
  const forwarded = socket.handshake.headers['x-forwarded-for'];
  if (forwarded) {
    return (Array.isArray(forwarded) ? forwarded[0] : forwarded).split(',')[0].trim();
  }
  return socket.handshake.address;
}
```

#### 2. Payload Size Limits

```typescript
const PAYLOAD_LIMITS = {
  maxPayloadSize: 1024,  // 1 KB max pro Message
  maxUsernameLength: 20,
  maxPixelsLength: 64,
  maxRoomCodeLength: 4
};

io.use((socket, next) => {
  // Payload Size Check
  socket.use((packet, next) => {
    const payload = JSON.stringify(packet);
    
    if (payload.length > PAYLOAD_LIMITS.maxPayloadSize) {
      console.warn(`[Security] Oversized payload from ${socket.id}`);
      return next(new Error('PAYLOAD_TOO_LARGE'));
    }
    
    next();
  });
  
  next();
});

// Socket.io Config
const io = new Server(server, {
  maxHttpBufferSize: 1e4,  // 10 KB max (für alle Pakete)
  pingTimeout: 20000,
  pingInterval: 25000
});
```

#### 3. Event Flooding Protection

```typescript
const EVENT_FLOOD_CONFIG = {
  maxEventsPerSecond: 50,
  blockDurationMs: 60_000
};

const eventCounters: Map<string, { count: number; resetAt: number }> = new Map();
const blockedSockets: Map<string, number> = new Map();

function checkEventFlood(socket: Socket): boolean {
  const now = Date.now();
  
  // Ist geblockt?
  const blockedUntil = blockedSockets.get(socket.id);
  if (blockedUntil && now < blockedUntil) {
    return false;
  }
  
  // Counter prüfen/updaten
  let counter = eventCounters.get(socket.id);
  if (!counter || now > counter.resetAt) {
    counter = { count: 0, resetAt: now + 1000 };
  }
  
  counter.count++;
  eventCounters.set(socket.id, counter);
  
  // Flooding?
  if (counter.count > EVENT_FLOOD_CONFIG.maxEventsPerSecond) {
    console.warn(`[Security] Event flood from ${socket.id}`);
    blockedSockets.set(socket.id, now + EVENT_FLOOD_CONFIG.blockDurationMs);
    socket.emit('error', { code: 'FLOOD_DETECTED' });
    socket.disconnect(true);
    return false;
  }
  
  return true;
}

// Middleware für alle Events
socket.use((packet, next) => {
  if (!checkEventFlood(socket)) {
    return next(new Error('FLOOD_DETECTED'));
  }
  next();
});
```

---

### Session Security

```typescript
import { nanoid } from 'nanoid';
import crypto from 'crypto';

// Session Token generieren
function generateSessionToken(): string {
  return nanoid(32);  // 32 Zeichen, URL-safe
}

// Session Validation
interface Session {
  id: string;
  token: string;
  createdAt: number;
  lastActivity: number;
  user: User;
}

const sessions: Map<string, Session> = new Map();

function createSession(user: User): Session {
  const session: Session = {
    id: nanoid(16),
    token: generateSessionToken(),
    createdAt: Date.now(),
    lastActivity: Date.now(),
    user
  };
  
  sessions.set(session.id, session);
  return session;
}

function validateSession(sessionId: string, token: string): Session | null {
  const session = sessions.get(sessionId);
  
  if (!session) return null;
  
  // Timing-safe comparison (gegen Timing Attacks)
  const tokenBuffer = Buffer.from(token);
  const sessionTokenBuffer = Buffer.from(session.token);
  
  if (tokenBuffer.length !== sessionTokenBuffer.length) return null;
  if (!crypto.timingSafeEqual(tokenBuffer, sessionTokenBuffer)) return null;
  
  // Session noch gültig? (24h max)
  if (Date.now() - session.createdAt > 24 * 60 * 60 * 1000) {
    sessions.delete(sessionId);
    return null;
  }
  
  session.lastActivity = Date.now();
  return session;
}

// Socket Auth Middleware
io.use((socket, next) => {
  const { sessionId, token } = socket.handshake.auth;
  
  if (sessionId && token) {
    const session = validateSession(sessionId, token);
    if (session) {
      socket.data.session = session;
      return next();
    }
  }
  
  // Neue Session erstellen
  const newSession = createSession(createUsername());
  socket.data.session = newSession;
  next();
});
```

---

## Skalierbarkeit (Multi-Server)

### Wann brauchen wir mehrere Server?

| Spieler | Server | Lösung |
|---------|--------|--------|
| < 30.000 | 1 | Single Server |
| 30.000 - 100.000 | 2-4 | Sticky Sessions |
| > 100.000 | 4+ | Redis Adapter |

### Option 1: Sticky Sessions (einfach)

Alle Requests eines Users gehen zum gleichen Server.

```typescript
// Load Balancer Config (nginx)
upstream backend {
  ip_hash;  // Sticky Sessions basierend auf IP
  server server1:3000;
  server server2:3000;
  server server3:3000;
}

// Oder mit Cookie
upstream backend {
  hash $cookie_server_id consistent;
  server server1:3000;
  server server2:3000;
}
```

**Vorteile:**
- Einfach zu implementieren
- Kein Redis nötig
- In-Memory State funktioniert weiter

**Nachteile:**
- Ungleiche Last-Verteilung möglich
- Bei Server-Ausfall: Spieler verlieren Session

### Option 2: Redis Adapter (fortgeschritten)

Für echte horizontale Skalierung.

```typescript
import { createAdapter } from '@socket.io/redis-adapter';
import { createClient } from 'redis';

// Redis Clients
const pubClient = createClient({ url: process.env.REDIS_URL });
const subClient = pubClient.duplicate();

await Promise.all([pubClient.connect(), subClient.connect()]);

// Socket.io mit Redis
io.adapter(createAdapter(pubClient, subClient));

// Jetzt können mehrere Server kommunizieren:
// - Broadcasts gehen an alle Server
// - Rooms funktionieren server-übergreifend
```

### State Management mit Redis

```typescript
import Redis from 'ioredis';

const redis = new Redis(process.env.REDIS_URL);

// Instanz-State in Redis
async function saveInstanceState(instance: Instance) {
  const key = `instance:${instance.id}`;
  const data = {
    id: instance.id,
    phase: instance.phase,
    players: Array.from(instance.players.keys()),
    submissions: instance.submissions,
    // ... etc
  };
  
  await redis.setex(key, 3600, JSON.stringify(data));  // 1h TTL
}

async function loadInstanceState(instanceId: string): Promise<Instance | null> {
  const data = await redis.get(`instance:${instanceId}`);
  if (!data) return null;
  return JSON.parse(data);
}

// Player zu Instance Mapping
async function setPlayerInstance(playerId: string, instanceId: string) {
  await redis.setex(`player:${playerId}:instance`, 3600, instanceId);
}

async function getPlayerInstance(playerId: string): Promise<string | null> {
  return redis.get(`player:${playerId}:instance`);
}
```

### Architektur Multi-Server

```
                    ┌─────────────────┐
                    │  Load Balancer  │
                    │  (nginx/HAProxy)│
                    └────────┬────────┘
                             │
         ┌───────────────────┼───────────────────┐
         │                   │                   │
         ▼                   ▼                   ▼
┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐
│   Server 1      │ │   Server 2      │ │   Server 3      │
│   Node.js       │ │   Node.js       │ │   Node.js       │
│   Socket.io     │ │   Socket.io     │ │   Socket.io     │
└────────┬────────┘ └────────┬────────┘ └────────┬────────┘
         │                   │                   │
         └───────────────────┼───────────────────┘
                             │
                    ┌────────▼────────┐
                    │     Redis       │
                    │  (Pub/Sub +     │
                    │   State Store)  │
                    └─────────────────┘
```

### Für v1: Single Server

```typescript
// config.ts
export const SCALING_CONFIG = {
  mode: 'single',  // 'single' | 'sticky' | 'redis'
  
  // Für später:
  redis: {
    enabled: false,
    url: process.env.REDIS_URL
  }
};

// In Zukunft einfach umschalten:
if (SCALING_CONFIG.mode === 'redis') {
  setupRedisAdapter();
}
```

---

## Security Checklist

### Vor Production

- [ ] Alle Inputs validiert (Zod Schemas)
- [ ] XSS Prevention (DOMPurify)
- [ ] Rate Limiting aktiviert
- [ ] Connection Limits gesetzt
- [ ] Payload Size Limits gesetzt
- [ ] HTTPS aktiviert (via Render)
- [ ] CORS korrekt konfiguriert
- [ ] Error Messages leaken keine internen Details

### CORS Config

```typescript
const io = new Server(server, {
  cors: {
    origin: process.env.NODE_ENV === 'production'
      ? ['https://yourdomain.com']
      : ['http://localhost:5173'],
    methods: ['GET', 'POST'],
    credentials: true
  }
});
```

### Error Handling (keine Info-Leaks)

```typescript
// SCHLECHT: Leakt interne Details
socket.emit('error', { 
  message: 'Database connection failed at 192.168.1.1:5432'
});

// GUT: Generische Fehlermeldung
socket.emit('error', { 
  code: 'INTERNAL_ERROR',
  message: 'Something went wrong. Please try again.'
});

// Server-seitig detailliert loggen
console.error('[Error]', actualError);
```

---

## Sicherheit

### Input Validation

**Grundprinzip:** Der Client ist NICHT vertrauenswürdig. Alles wird serverseitig validiert.

```typescript
// Validation Schemas
const VALIDATION = {
  username: {
    minLength: 1,
    maxLength: 20,
    pattern: /^[\p{L}\p{N}\p{Emoji}\s]+$/u,  // Buchstaben, Zahlen, Emojis, Leerzeichen
    forbidden: ['admin', 'moderator', 'system', 'null', 'undefined']
  },
  pixels: {
    length: 64,  // Exakt 64 Zeichen
    pattern: /^[0-9A-Fa-f]{64}$/  // Nur Hex-Zeichen
  },
  roomCode: {
    length: 4,
    pattern: /^[A-Z0-9]{4}$/
  },
  roomPassword: {
    minLength: 4,
    maxLength: 64
  },
  message: {
    maxLength: 200  // Falls Chat später kommt
  }
};

// Username Sanitization
function sanitizeUsername(input: string): string | null {
  if (typeof input !== 'string') return null;
  
  // Trim & normalize
  let clean = input.trim().normalize('NFC');
  
  // Length check
  if (clean.length < VALIDATION.username.minLength || 
      clean.length > VALIDATION.username.maxLength) {
    return null;
  }
  
  // Pattern check
  if (!VALIDATION.username.pattern.test(clean)) {
    return null;
  }
  
  // Forbidden names
  if (VALIDATION.username.forbidden.includes(clean.toLowerCase())) {
    return null;
  }
  
  // HTML encode (XSS prevention)
  clean = escapeHtml(clean);
  
  return clean;
}

function escapeHtml(str: string): string {
  const htmlEntities: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#x27;',
    '/': '&#x2F;'
  };
  return str.replace(/[&<>"'/]/g, char => htmlEntities[char]);
}

// Pixel Validation
function validatePixels(input: string): boolean {
  if (typeof input !== 'string') return false;
  if (input.length !== VALIDATION.pixels.length) return false;
  if (!VALIDATION.pixels.pattern.test(input)) return false;
  return true;
}

// Room Code Validation
function validateRoomCode(input: string): string | null {
  if (typeof input !== 'string') return null;
  const clean = input.toUpperCase().trim();
  if (!VALIDATION.roomCode.pattern.test(clean)) return null;
  return clean;
}

// Generic Event Payload Validator
function validatePayload(payload: unknown, schema: Record<string, any>): boolean {
  if (typeof payload !== 'object' || payload === null) return false;
  
  for (const [key, rules] of Object.entries(schema)) {
    const value = (payload as Record<string, unknown>)[key];
    
    if (rules.required && value === undefined) return false;
    if (rules.type && typeof value !== rules.type) return false;
    if (rules.maxLength && typeof value === 'string' && value.length > rules.maxLength) return false;
    if (rules.pattern && typeof value === 'string' && !rules.pattern.test(value)) return false;
  }
  
  return true;
}
```

### Rate Limiting

```typescript
interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
}

const RATE_LIMITS: Record<string, RateLimitConfig> = {
  // Verbindungen
  connect: { windowMs: 60_000, maxRequests: 5 },       // 5 Verbindungen/Min
  
  // Gameplay
  submit: { windowMs: 60_000, maxRequests: 10 },       // 10 Submissions/Min
  vote: { windowMs: 10_000, maxRequests: 20 },         // 20 Votes/10s
  
  // Räume
  createRoom: { windowMs: 60_000, maxRequests: 3 },    // 3 Räume/Min
  joinRoom: { windowMs: 10_000, maxRequests: 10 },     // 10 Joins/10s
  
  // Username
  changeName: { windowMs: 60_000, maxRequests: 5 },    // 5 Änderungen/Min
  
  // Allgemein
  globalEvents: { windowMs: 1_000, maxRequests: 50 },  // 50 Events/Sek
};

class RateLimiter {
  private windows: Map<string, { count: number; resetAt: number }> = new Map();
  
  check(key: string, config: RateLimitConfig): boolean {
    const now = Date.now();
    const windowKey = key;
    const window = this.windows.get(windowKey);
    
    if (!window || now > window.resetAt) {
      // Neues Fenster
      this.windows.set(windowKey, {
        count: 1,
        resetAt: now + config.windowMs
      });
      return true;
    }
    
    if (window.count >= config.maxRequests) {
      return false;  // Rate limit exceeded
    }
    
    window.count++;
    return true;
  }
  
  // Cleanup alte Einträge (alle 5 Min)
  cleanup() {
    const now = Date.now();
    for (const [key, window] of this.windows) {
      if (now > window.resetAt) {
        this.windows.delete(key);
      }
    }
  }
}

const rateLimiter = new RateLimiter();

// Middleware für Socket Events
function rateLimitMiddleware(socket: Socket, eventName: string): boolean {
  const config = RATE_LIMITS[eventName] || RATE_LIMITS.globalEvents;
  const key = `${socket.id}:${eventName}`;
  
  if (!rateLimiter.check(key, config)) {
    socket.emit('error', {
      code: 'RATE_LIMIT',
      message: 'Too many requests. Please slow down.'
    });
    return false;
  }
  
  return true;
}

// IP-basiertes Rate Limiting für Verbindungen
const connectionAttempts = new Map<string, { count: number; blockedUntil: number }>();

function checkConnectionRateLimit(ip: string): boolean {
  const now = Date.now();
  const record = connectionAttempts.get(ip);
  
  // Blocked?
  if (record && record.blockedUntil > now) {
    return false;
  }
  
  // Neuer Record oder abgelaufen
  if (!record || now > record.blockedUntil) {
    connectionAttempts.set(ip, { count: 1, blockedUntil: now + 60_000 });
    return true;
  }
  
  record.count++;
  
  // Zu viele Versuche? Blockieren für 5 Minuten
  if (record.count > 10) {
    record.blockedUntil = now + 300_000;
    return false;
  }
  
  return true;
}
```

### Anti-Cheat

```typescript
// PRINZIP: Server ist die einzige Quelle der Wahrheit

interface AntiCheatConfig {
  maxSubmissionDelay: number;     // Max Zeit nach Timer-Ende
  minDrawTime: number;            // Min Zeit zum Zeichnen (Anti-Bot)
  maxVotesPerSubmission: number;  // Max Votes pro Bild
  sameIpVoteLimit: number;        // Max Votes von gleicher IP
}

const ANTI_CHEAT: AntiCheatConfig = {
  maxSubmissionDelay: 5_000,      // 5s nach Timer
  minDrawTime: 5_000,             // Mindestens 5s zeichnen
  maxVotesPerSubmission: 1,       // 1 Vote pro Bild pro Spieler
  sameIpVoteLimit: 3,             // Max 3 Spieler pro IP können voten
};

// 1. Timer wird serverseitig kontrolliert
class ServerTimer {
  private startTime: number = 0;
  private duration: number = 0;
  
  start(duration: number) {
    this.startTime = Date.now();
    this.duration = duration;
  }
  
  isExpired(): boolean {
    return Date.now() > this.startTime + this.duration;
  }
  
  isWithinGracePeriod(): boolean {
    const elapsed = Date.now() - this.startTime;
    return elapsed <= this.duration + ANTI_CHEAT.maxSubmissionDelay;
  }
  
  getElapsed(): number {
    return Date.now() - this.startTime;
  }
}

// 2. Submission Validation
function validateSubmission(
  instance: Instance, 
  playerId: string, 
  pixels: string
): { valid: boolean; reason?: string } {
  
  // Phase check
  if (instance.phase !== 'drawing') {
    return { valid: false, reason: 'Wrong phase' };
  }
  
  // Timer check (mit Grace Period)
  if (!instance.drawTimer.isWithinGracePeriod()) {
    return { valid: false, reason: 'Time expired' };
  }
  
  // Minimum draw time (Anti-Bot)
  if (instance.drawTimer.getElapsed() < ANTI_CHEAT.minDrawTime) {
    return { valid: false, reason: 'Submitted too fast' };
  }
  
  // Already submitted?
  if (instance.submissions.some(s => s.playerId === playerId)) {
    return { valid: false, reason: 'Already submitted' };
  }
  
  // Pixel validation
  if (!validatePixels(pixels)) {
    return { valid: false, reason: 'Invalid pixel data' };
  }
  
  // Minimum pixels check
  const nonEmptyPixels = pixels.split('').filter(p => p !== '0').length;
  if (nonEmptyPixels < 5) {
    return { valid: false, reason: 'Too few pixels' };
  }
  
  return { valid: true };
}

// 3. Vote Validation
function validateVote(
  instance: Instance,
  playerId: string,
  targetId: string,
  playerIp: string
): { valid: boolean; reason?: string } {
  
  // Phase check
  if (!instance.phase.startsWith('voting')) {
    return { valid: false, reason: 'Wrong phase' };
  }
  
  // Self-vote check
  if (playerId === targetId) {
    return { valid: false, reason: 'Cannot vote for yourself' };
  }
  
  // Already voted for this target?
  const existingVote = instance.votes.find(v => 
    v.voterId === playerId && 
    v.targetId === targetId &&
    v.phase === instance.phase
  );
  if (existingVote) {
    return { valid: false, reason: 'Already voted' };
  }
  
  // Target exists and is still in the game?
  if (!instance.advancedPlayers.includes(targetId)) {
    return { valid: false, reason: 'Invalid target' };
  }
  
  // IP-based vote limiting (Anti Multi-Account)
  const votesFromSameIp = instance.votes.filter(v => 
    v.voterIp === playerIp && 
    v.targetId === targetId
  ).length;
  if (votesFromSameIp >= ANTI_CHEAT.sameIpVoteLimit) {
    return { valid: false, reason: 'Vote limit reached' };
  }
  
  return { valid: true };
}

// 4. Fingerprinting (leicht, für Multi-Account Detection)
interface PlayerFingerprint {
  ip: string;
  userAgent: string;
  screenRes?: string;
  timezone?: string;
}

function createFingerprint(socket: Socket, data?: any): PlayerFingerprint {
  return {
    ip: socket.handshake.address,
    userAgent: socket.handshake.headers['user-agent'] || 'unknown',
    screenRes: data?.screenRes,
    timezone: data?.timezone
  };
}

function isSuspiciousMultiAccount(
  instance: Instance, 
  fingerprint: PlayerFingerprint
): boolean {
  // Wie viele Spieler mit gleicher IP?
  const sameIpCount = [...instance.players.values()]
    .filter(p => p.fingerprint.ip === fingerprint.ip)
    .length;
  
  // Mehr als 3 = verdächtig
  return sameIpCount >= 3;
}
```

### DoS Protection

```typescript
const DOS_PROTECTION = {
  // Verbindungen
  maxConnectionsPerIp: 5,
  maxTotalConnections: 15_000,
  
  // Payloads
  maxPayloadSize: 1024,  // 1 KB max pro Event
  maxEventNameLength: 50,
  
  // Timeouts
  connectionTimeout: 30_000,
  idleTimeout: 300_000,  // 5 Min ohne Aktivität
};

// Socket.io Server Config
const io = new Server(server, {
  // Payload Limits
  maxHttpBufferSize: DOS_PROTECTION.maxPayloadSize,
  
  // Timeouts
  connectTimeout: DOS_PROTECTION.connectionTimeout,
  pingTimeout: 20_000,
  pingInterval: 25_000,
  
  // CORS (anpassen für Production)
  cors: {
    origin: process.env.ALLOWED_ORIGINS?.split(',') || '*',
    methods: ['GET', 'POST']
  }
});

// Verbindungs-Limit pro IP
const connectionsPerIp = new Map<string, Set<string>>();

io.on('connection', (socket) => {
  const ip = socket.handshake.address;
  
  // IP-Limit prüfen
  if (!connectionsPerIp.has(ip)) {
    connectionsPerIp.set(ip, new Set());
  }
  
  const ipConnections = connectionsPerIp.get(ip)!;
  
  if (ipConnections.size >= DOS_PROTECTION.maxConnectionsPerIp) {
    socket.emit('error', { code: 'TOO_MANY_CONNECTIONS' });
    socket.disconnect(true);
    return;
  }
  
  ipConnections.add(socket.id);
  
  // Gesamt-Limit prüfen
  if (io.sockets.sockets.size >= DOS_PROTECTION.maxTotalConnections) {
    // In Queue einreihen statt abweisen
    tryJoinGame(socket, null);
    return;
  }
  
  // Idle Timeout
  let lastActivity = Date.now();
  
  socket.onAny(() => {
    lastActivity = Date.now();
  });
  
  const idleCheck = setInterval(() => {
    if (Date.now() - lastActivity > DOS_PROTECTION.idleTimeout) {
      socket.emit('idle-disconnect', { reason: 'Inactivity' });
      socket.disconnect(true);
    }
  }, 60_000);
  
  socket.on('disconnect', () => {
    ipConnections.delete(socket.id);
    if (ipConnections.size === 0) {
      connectionsPerIp.delete(ip);
    }
    clearInterval(idleCheck);
  });
});

// Event Payload Size Check (Middleware)
socket.use((packet, next) => {
  const [eventName, payload] = packet;
  
  // Event name check
  if (typeof eventName !== 'string' || 
      eventName.length > DOS_PROTECTION.maxEventNameLength) {
    return next(new Error('Invalid event'));
  }
  
  // Payload size check
  const payloadSize = JSON.stringify(payload).length;
  if (payloadSize > DOS_PROTECTION.maxPayloadSize) {
    return next(new Error('Payload too large'));
  }
  
  next();
});
```

### Passwort-Schutz für Private Räume

```typescript
import { randomBytes, scrypt, timingSafeEqual } from 'crypto';
import { promisify } from 'util';

const scryptAsync = promisify(scrypt);

interface PasswordConfig {
  saltLength: 32,
  keyLength: 64,
  minLength: 4,
  maxLength: 64,
  scryptOptions: {
    N: 16384,  // CPU/Memory Cost
    r: 8,      // Block Size
    p: 1       // Parallelization
  }
}

const PASSWORD_CONFIG: PasswordConfig = {
  saltLength: 32,
  keyLength: 64,
  minLength: 4,
  maxLength: 64,
  scryptOptions: {
    N: 16384,
    r: 8,
    p: 1
  }
};

// Passwort hashen (beim Raum erstellen)
async function hashPassword(password: string): Promise<string> {
  // Validation
  if (password.length < PASSWORD_CONFIG.minLength || 
      password.length > PASSWORD_CONFIG.maxLength) {
    throw new Error('Invalid password length');
  }
  
  // Salt generieren
  const salt = randomBytes(PASSWORD_CONFIG.saltLength);
  
  // Hash mit scrypt
  const hash = await scryptAsync(
    password, 
    salt, 
    PASSWORD_CONFIG.keyLength,
    PASSWORD_CONFIG.scryptOptions
  ) as Buffer;
  
  // Format: salt:hash (beide als hex)
  return `${salt.toString('hex')}:${hash.toString('hex')}`;
}

// Passwort verifizieren (beim Joinen)
async function verifyPassword(password: string, stored: string): Promise<boolean> {
  try {
    const [saltHex, hashHex] = stored.split(':');
    
    const salt = Buffer.from(saltHex, 'hex');
    const storedHash = Buffer.from(hashHex, 'hex');
    
    // Hash des eingegebenen Passworts
    const inputHash = await scryptAsync(
      password,
      salt,
      PASSWORD_CONFIG.keyLength,
      PASSWORD_CONFIG.scryptOptions
    ) as Buffer;
    
    // Timing-safe comparison (gegen Timing Attacks)
    return timingSafeEqual(storedHash, inputHash);
    
  } catch {
    return false;
  }
}

// Private Raum erstellen mit optionalem Passwort
async function createPrivateRoom(
  hostPlayer: Player, 
  options: { password?: string } = {}
): Promise<{ code: string; hasPassword: boolean }> {
  
  const code = generateRoomCode();
  
  let passwordHash: string | null = null;
  if (options.password) {
    passwordHash = await hashPassword(options.password);
  }
  
  const instance = createInstance({
    type: 'private',
    code,
    hostId: hostPlayer.id,
    passwordHash,  // null wenn kein Passwort
    maxPlayers: 100
  });
  
  instance.players.set(hostPlayer.id, hostPlayer);
  privateRooms.set(code, instance);
  
  return {
    code,
    hasPassword: !!passwordHash
  };
}

// Private Raum beitreten
async function joinPrivateRoom(
  player: Player, 
  code: string, 
  password?: string
): Promise<JoinResult> {
  
  const cleanCode = validateRoomCode(code);
  if (!cleanCode) {
    return { success: false, error: 'Invalid room code' };
  }
  
  const instance = privateRooms.get(cleanCode);
  
  if (!instance) {
    return { success: false, error: 'Room not found' };
  }
  
  // Passwort-Check
  if (instance.passwordHash) {
    if (!password) {
      return { 
        success: false, 
        error: 'Password required',
        requiresPassword: true 
      };
    }
    
    const isValid = await verifyPassword(password, instance.passwordHash);
    if (!isValid) {
      // Rate limiting für falsche Passwörter
      await incrementFailedAttempts(player.fingerprint.ip, cleanCode);
      return { success: false, error: 'Wrong password' };
    }
  }
  
  // Standard-Checks
  if (instance.players.size >= instance.maxPlayers) {
    return { success: false, error: 'Room is full' };
  }
  
  if (instance.phase !== 'lobby') {
    instance.spectators.set(player.id, player);
    return { success: true, spectator: true };
  }
  
  instance.players.set(player.id, player);
  return { success: true };
}

// Brute-Force Protection für Passwörter
const passwordAttempts = new Map<string, { count: number; blockedUntil: number }>();

async function incrementFailedAttempts(ip: string, roomCode: string): Promise<void> {
  const key = `${ip}:${roomCode}`;
  const now = Date.now();
  
  const record = passwordAttempts.get(key) || { count: 0, blockedUntil: 0 };
  record.count++;
  
  // Nach 5 Fehlversuchen: 15 Minuten Sperre
  if (record.count >= 5) {
    record.blockedUntil = now + 900_000;  // 15 Min
  }
  
  passwordAttempts.set(key, record);
}

function isPasswordBlocked(ip: string, roomCode: string): boolean {
  const key = `${ip}:${roomCode}`;
  const record = passwordAttempts.get(key);
  
  if (!record) return false;
  return Date.now() < record.blockedUntil;
}

// Host kann Passwort ändern/entfernen
async function updateRoomPassword(
  instance: Instance,
  playerId: string,
  newPassword: string | null
): Promise<boolean> {
  
  if (instance.hostId !== playerId) {
    return false;  // Nur Host
  }
  
  if (newPassword) {
    instance.passwordHash = await hashPassword(newPassword);
  } else {
    instance.passwordHash = null;  // Passwort entfernen
  }
  
  return true;
}
```

---

## Skalierbarkeit (Multi-Server)

### Wann brauchen wir mehrere Server?

| Spieler | Server | Lösung |
|---------|--------|--------|
| < 25.000 | 1 | Single Server reicht |
| 25.000 - 100.000 | 2-4 | Horizontale Skalierung |
| > 100.000 | 4+ | Load Balancer + Redis |

### Architektur für Multi-Server (später)

```
                    ┌─────────────────┐
                    │  Load Balancer  │
                    │  (nginx/HAProxy)│
                    └────────┬────────┘
                             │
           ┌─────────────────┼─────────────────┐
           ▼                 ▼                 ▼
    ┌────────────┐    ┌────────────┐    ┌────────────┐
    │  Server 1  │    │  Server 2  │    │  Server 3  │
    │  (EU-West) │    │  (EU-West) │    │  (EU-West) │
    └─────┬──────┘    └─────┬──────┘    └─────┬──────┘
          │                 │                 │
          └─────────────────┼─────────────────┘
                            ▼
                    ┌─────────────────┐
                    │     Redis       │
                    │  (State Sync)   │
                    └─────────────────┘
```

### Sticky Sessions

Wichtig: Spieler müssen immer zum gleichen Server geroutet werden (wegen WebSocket-State).

```nginx
# nginx.conf
upstream game_servers {
    ip_hash;  # Sticky Sessions basierend auf IP
    server server1:3000;
    server server2:3000;
    server server3:3000;
}
```

### Redis für State-Sync (optional, für später)

```typescript
// Nur nötig wenn Multi-Server
import { createClient } from 'redis';

const redis = createClient({ url: process.env.REDIS_URL });

// Globale Events über alle Server
async function broadcastGlobal(event: string, data: any) {
  await redis.publish('game:events', JSON.stringify({ event, data }));
}

// Listener auf anderen Servern
redis.subscribe('game:events', (message) => {
  const { event, data } = JSON.parse(message);
  handleGlobalEvent(event, data);
});

// Private Räume über Server hinweg finden
async function findPrivateRoom(code: string): Promise<string | null> {
  // Check Redis für Server-Zuordnung
  return await redis.get(`room:${code}:server`);
}
```

### Für v1: Single Server

Für den Start ist **ein Server völlig ausreichend**. Die Architektur ist so gebaut, dass später horizontal skaliert werden kann, ohne alles neu zu schreiben.

```typescript
// config.ts
export const SCALING_CONFIG = {
  // v1: Single Server
  mode: 'single' as 'single' | 'multi',
  
  // Später: Multi-Server
  // mode: 'multi',
  // redisUrl: process.env.REDIS_URL,
};
```

---

## Security Checklist

### Implementiert ✅

| Bereich | Maßnahme |
|---------|----------|
| XSS | HTML Escaping für alle User-Inputs |
| Injection | Strikte Input Validation |
| Rate Limiting | Per-Event und Per-IP Limits |
| DoS | Connection Limits, Payload Limits, Idle Timeout |
| Cheating | Server-autoritative Timer, Vote Validation |
| Multi-Account | IP-basierte Limits, Fingerprinting |
| Passwort | scrypt Hashing, Timing-Safe Comparison |
| Brute-Force | Lockout nach 5 Fehlversuchen |

### Empfohlen für Production

| Bereich | Maßnahme |
|---------|----------|
| HTTPS | SSL/TLS Zertifikat (Let's Encrypt) |
| Headers | Helmet.js für Security Headers |
| CORS | Strikte Origin-Whitelist |
| Logging | Audit Log für verdächtige Aktivitäten |
| Monitoring | Alerts bei ungewöhnlichen Patterns |

```typescript
// Production Security Headers
import helmet from 'helmet';

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      connectSrc: ["'self'", "wss:"],  // WebSocket
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],  // Für Svelte
    }
  },
  crossOriginEmbedderPolicy: false  // Für WebSocket
}));
```

---

## Sicherheit

### Grundprinzip

**Der Server ist autoritativ. Der Client ist NIEMALS zu trauen.**

Alles was vom Client kommt, wird validiert, sanitized und auf Plausibilität geprüft.

---

### Input Validation

#### Username

```typescript
const USERNAME_CONFIG = {
  minLength: 1,
  maxLength: 20,
  forbiddenPatterns: [
    /<script/i,
    /javascript:/i,
    /on\w+=/i,        // onclick=, onerror=, etc.
    /data:/i,
    /<iframe/i,
    /<img/i,
  ],
  allowedChars: /^[\p{L}\p{N}\p{Emoji}\s]+$/u,  // Letters, numbers, emoji, spaces
};

function validateUsername(input: unknown): ValidationResult {
  // Type Check
  if (typeof input !== 'string') {
    return { valid: false, error: 'Username must be a string' };
  }
  
  // Length Check
  const trimmed = input.trim();
  if (trimmed.length < USERNAME_CONFIG.minLength) {
    return { valid: false, error: 'Username too short' };
  }
  if (trimmed.length > USERNAME_CONFIG.maxLength) {
    return { valid: false, error: 'Username too long' };
  }
  
  // Forbidden Patterns (XSS)
  for (const pattern of USERNAME_CONFIG.forbiddenPatterns) {
    if (pattern.test(trimmed)) {
      return { valid: false, error: 'Invalid characters in username' };
    }
  }
  
  // Allowed Characters
  if (!USERNAME_CONFIG.allowedChars.test(trimmed)) {
    return { valid: false, error: 'Invalid characters in username' };
  }
  
  return { valid: true, value: trimmed };
}
```

#### Pixel Data

```typescript
const PIXEL_CONFIG = {
  exactLength: 64,           // 8x8 Grid
  validChars: /^[0-9A-Fa-f]+$/,  // Nur Hex
  maxColorIndex: 15,         // 16 Farben (0-F)
};

function validatePixels(input: unknown): ValidationResult {
  // Type Check
  if (typeof input !== 'string') {
    return { valid: false, error: 'Pixels must be a string' };
  }
  
  // Exact Length
  if (input.length !== PIXEL_CONFIG.exactLength) {
    return { valid: false, error: 'Invalid pixel data length' };
  }
  
  // Only Hex Characters
  if (!PIXEL_CONFIG.validChars.test(input)) {
    return { valid: false, error: 'Invalid pixel data format' };
  }
  
  // Normalize to uppercase
  return { valid: true, value: input.toUpperCase() };
}
```

#### Room Code

```typescript
const ROOM_CODE_CONFIG = {
  exactLength: 4,
  validChars: /^[A-Z0-9]+$/,
};

function validateRoomCode(input: unknown): ValidationResult {
  if (typeof input !== 'string') {
    return { valid: false, error: 'Room code must be a string' };
  }
  
  const normalized = input.toUpperCase().trim();
  
  if (normalized.length !== ROOM_CODE_CONFIG.exactLength) {
    return { valid: false, error: 'Room code must be 4 characters' };
  }
  
  if (!ROOM_CODE_CONFIG.validChars.test(normalized)) {
    return { valid: false, error: 'Invalid room code format' };
  }
  
  return { valid: true, value: normalized };
}
```

#### Vote

```typescript
function validateVote(input: unknown): ValidationResult {
  if (typeof input !== 'string') {
    return { valid: false, error: 'Vote must be a string' };
  }
  
  if (input !== 'up' && input !== 'down') {
    return { valid: false, error: 'Vote must be "up" or "down"' };
  }
  
  return { valid: true, value: input };
}
```

#### Generischer Validator

```typescript
// Wrapper für alle eingehenden Events
function validatePayload<T>(
  payload: unknown,
  schema: ValidationSchema
): { valid: true; data: T } | { valid: false; error: string } {
  if (typeof payload !== 'object' || payload === null) {
    return { valid: false, error: 'Invalid payload' };
  }
  
  const result: Record<string, unknown> = {};
  
  for (const [key, validator] of Object.entries(schema)) {
    const value = (payload as Record<string, unknown>)[key];
    const validation = validator(value);
    
    if (!validation.valid) {
      return { valid: false, error: `${key}: ${validation.error}` };
    }
    
    result[key] = validation.value;
  }
  
  return { valid: true, data: result as T };
}

// Verwendung
socket.on('submit-drawing', (payload) => {
  const validation = validatePayload(payload, {
    pixels: validatePixels,
  });
  
  if (!validation.valid) {
    socket.emit('error', { message: validation.error });
    return;
  }
  
  // Sicher zu verwenden
  handleSubmission(validation.data.pixels);
});
```

---

### Rate Limiting

```typescript
interface RateLimitConfig {
  windowMs: number;      // Zeitfenster
  maxRequests: number;   // Max Requests in diesem Fenster
}

const RATE_LIMITS: Record<string, RateLimitConfig> = {
  // Verbindungen
  'connection': { windowMs: 60_000, maxRequests: 5 },      // 5 Verbindungen/Min
  
  // Spielaktionen
  'submit-drawing': { windowMs: 60_000, maxRequests: 10 }, // 10/Min (für Reconnects)
  'vote': { windowMs: 1_000, maxRequests: 3 },             // 3/Sek
  'create-room': { windowMs: 60_000, maxRequests: 3 },     // 3 Räume/Min
  'join-room': { windowMs: 10_000, maxRequests: 5 },       // 5/10Sek
  
  // Chat/Messages (falls später hinzugefügt)
  'message': { windowMs: 1_000, maxRequests: 2 },          // 2/Sek
  
  // Name ändern
  'change-name': { windowMs: 30_000, maxRequests: 3 },     // 3/30Sek
};

// Rate Limiter Implementation
class RateLimiter {
  private requests: Map<string, number[]> = new Map();
  
  check(identifier: string, action: string): boolean {
    const config = RATE_LIMITS[action];
    if (!config) return true;  // Keine Limits definiert
    
    const key = `${identifier}:${action}`;
    const now = Date.now();
    const windowStart = now - config.windowMs;
    
    // Alte Requests entfernen
    let timestamps = this.requests.get(key) || [];
    timestamps = timestamps.filter(t => t > windowStart);
    
    // Limit prüfen
    if (timestamps.length >= config.maxRequests) {
      return false;  // Rate Limited
    }
    
    // Request tracken
    timestamps.push(now);
    this.requests.set(key, timestamps);
    
    return true;
  }
  
  // Cleanup alte Einträge (alle 5 Min)
  cleanup() {
    const now = Date.now();
    const maxWindow = Math.max(...Object.values(RATE_LIMITS).map(r => r.windowMs));
    
    this.requests.forEach((timestamps, key) => {
      const filtered = timestamps.filter(t => now - t < maxWindow);
      if (filtered.length === 0) {
        this.requests.delete(key);
      } else {
        this.requests.set(key, filtered);
      }
    });
  }
}

const rateLimiter = new RateLimiter();

// Cleanup alle 5 Minuten
setInterval(() => rateLimiter.cleanup(), 300_000);

// Middleware
function checkRateLimit(socket: Socket, action: string): boolean {
  const identifier = socket.handshake.address;  // IP-basiert
  
  if (!rateLimiter.check(identifier, action)) {
    socket.emit('error', { 
      code: 'RATE_LIMITED',
      message: 'Too many requests. Please slow down.',
      retryAfter: RATE_LIMITS[action]?.windowMs || 60000
    });
    return false;
  }
  
  return true;
}
```

---

### Anti-Cheat

#### Timing Validation

```typescript
// Server trackt alle Phasen-Zeiten
interface PhaseTimings {
  drawingStart: number;
  drawingEnd: number;
  votingRounds: { start: number; end: number }[];
}

function validateSubmissionTiming(instance: Instance): boolean {
  const now = Date.now();
  
  // Zeichenphase muss aktiv sein
  if (instance.phase !== 'drawing') {
    return false;
  }
  
  // Innerhalb des Zeitfensters (mit 2s Toleranz für Latenz)
  const tolerance = 2000;
  if (now > instance.timings.drawingEnd + tolerance) {
    return false;  // Zu spät
  }
  
  return true;
}

function validateVoteTiming(instance: Instance): boolean {
  const now = Date.now();
  
  // Voting-Phase muss aktiv sein
  if (!instance.phase.startsWith('voting')) {
    return false;
  }
  
  return true;
}
```

#### Vote Manipulation Prevention

```typescript
function processVote(
  instance: Instance,
  voterId: string,
  targetId: string,
  vote: 'up' | 'down'
): VoteResult {
  // 1. Kann nicht für sich selbst voten
  if (voterId === targetId) {
    return { success: false, error: 'Cannot vote for yourself' };
  }
  
  // 2. Target muss existieren und noch im Rennen sein
  if (!instance.advancedPlayers.includes(targetId)) {
    return { success: false, error: 'Invalid target' };
  }
  
  // 3. Voter muss in der Instanz sein
  if (!instance.players.has(voterId) && !instance.spectators.has(voterId)) {
    return { success: false, error: 'Not in this game' };
  }
  
  // 4. Doppelte Votes verhindern (gleiche Phase, gleiches Target)
  const alreadyVoted = instance.votes.some(v => 
    v.voterId === voterId && 
    v.targetId === targetId && 
    v.phase === instance.phase
  );
  
  if (alreadyVoted) {
    return { success: false, error: 'Already voted for this submission' };
  }
  
  // 5. Vote speichern
  instance.votes.push({
    voterId,
    targetId,
    value: vote,
    phase: instance.phase,
    timestamp: Date.now()
  });
  
  return { success: true };
}
```

#### Multi-Account Detection (Basic)

```typescript
// IP-basierte Erkennung (nicht perfekt, aber hilft)
const ipToSessions = new Map<string, Set<string>>();

function checkMultiAccount(socket: Socket): boolean {
  const ip = socket.handshake.address;
  const sessionId = socket.data.sessionId;
  
  let sessions = ipToSessions.get(ip);
  if (!sessions) {
    sessions = new Set();
    ipToSessions.set(ip, sessions);
  }
  
  // Max 3 Sessions pro IP erlaubt (für Haushalte)
  if (sessions.size >= 3 && !sessions.has(sessionId)) {
    return false;  // Zu viele Accounts
  }
  
  sessions.add(sessionId);
  return true;
}

// Cleanup bei Disconnect
function onDisconnect(socket: Socket) {
  const ip = socket.handshake.address;
  const sessionId = socket.data.sessionId;
  
  const sessions = ipToSessions.get(ip);
  if (sessions) {
    sessions.delete(sessionId);
    if (sessions.size === 0) {
      ipToSessions.delete(ip);
    }
  }
}
```

#### Submission Validation

```typescript
function validateSubmission(
  instance: Instance,
  playerId: string,
  pixels: string
): SubmissionResult {
  // 1. Spieler muss in der Instanz sein
  if (!instance.players.has(playerId)) {
    return { valid: false, error: 'Not in this game' };
  }
  
  // 2. Timing prüfen
  if (!validateSubmissionTiming(instance)) {
    return { valid: false, error: 'Submission time expired' };
  }
  
  // 3. Pixel-Daten validieren
  const pixelValidation = validatePixels(pixels);
  if (!pixelValidation.valid) {
    return { valid: false, error: pixelValidation.error };
  }
  
  // 4. Nicht bereits submitted
  const alreadySubmitted = instance.submissions.some(s => s.playerId === playerId);
  if (alreadySubmitted) {
    return { valid: false, error: 'Already submitted' };
  }
  
  // 5. Minimum Pixel Check (Anti-AFK)
  const MIN_PIXELS = 5;
  const BACKGROUND = '0';
  let setPixels = 0;
  for (const char of pixelValidation.value) {
    if (char !== BACKGROUND) setPixels++;
  }
  if (setPixels < MIN_PIXELS) {
    return { valid: false, error: 'Drawing too empty' };
  }
  
  return { valid: true, pixels: pixelValidation.value };
}
```

---

### DoS Protection

#### Connection Limits

```typescript
const DOS_CONFIG = {
  maxConnectionsPerIP: 5,
  maxTotalConnections: 15000,
  connectionTimeoutMs: 30_000,
  maxPayloadSize: 1024,  // 1KB max pro Message
};

const connectionsPerIP = new Map<string, number>();
let totalConnections = 0;

io.on('connection', (socket) => {
  const ip = socket.handshake.address;
  
  // Global Limit
  if (totalConnections >= DOS_CONFIG.maxTotalConnections) {
    socket.emit('error', { code: 'SERVER_FULL' });
    socket.disconnect(true);
    return;
  }
  
  // Per-IP Limit
  const ipConnections = connectionsPerIP.get(ip) || 0;
  if (ipConnections >= DOS_CONFIG.maxConnectionsPerIP) {
    socket.emit('error', { code: 'TOO_MANY_CONNECTIONS' });
    socket.disconnect(true);
    return;
  }
  
  // Connection tracken
  connectionsPerIP.set(ip, ipConnections + 1);
  totalConnections++;
  
  // Cleanup bei Disconnect
  socket.on('disconnect', () => {
    const current = connectionsPerIP.get(ip) || 1;
    if (current <= 1) {
      connectionsPerIP.delete(ip);
    } else {
      connectionsPerIP.set(ip, current - 1);
    }
    totalConnections--;
  });
  
  // Idle Timeout
  socket.data.lastActivity = Date.now();
  const idleCheck = setInterval(() => {
    if (Date.now() - socket.data.lastActivity > DOS_CONFIG.connectionTimeoutMs) {
      socket.disconnect(true);
      clearInterval(idleCheck);
    }
  }, 10_000);
  
  socket.on('disconnect', () => clearInterval(idleCheck));
});
```

#### Payload Size Limit

```typescript
// Socket.io Config
const io = new Server(server, {
  maxHttpBufferSize: 1024,  // 1KB max
  pingTimeout: 20000,
  pingInterval: 25000,
});

// Zusätzlicher Check
socket.use((packet, next) => {
  const size = JSON.stringify(packet).length;
  
  if (size > DOS_CONFIG.maxPayloadSize) {
    return next(new Error('Payload too large'));
  }
  
  // Activity tracken
  socket.data.lastActivity = Date.now();
  
  next();
});
```

#### Event Flooding Protection

```typescript
const EVENT_FLOOD_CONFIG = {
  maxEventsPerSecond: 20,
  banDurationMs: 60_000,
};

const eventCounts = new Map<string, { count: number; resetAt: number }>();
const bannedIPs = new Map<string, number>();

function checkEventFlood(socket: Socket): boolean {
  const ip = socket.handshake.address;
  const now = Date.now();
  
  // Gebannt?
  const banExpiry = bannedIPs.get(ip);
  if (banExpiry && banExpiry > now) {
    return false;
  } else if (banExpiry) {
    bannedIPs.delete(ip);
  }
  
  // Event Count
  let data = eventCounts.get(ip);
  if (!data || data.resetAt < now) {
    data = { count: 0, resetAt: now + 1000 };
    eventCounts.set(ip, data);
  }
  
  data.count++;
  
  if (data.count > EVENT_FLOOD_CONFIG.maxEventsPerSecond) {
    // Temporär bannen
    bannedIPs.set(ip, now + EVENT_FLOOD_CONFIG.banDurationMs);
    socket.emit('error', { code: 'BANNED', reason: 'Event flooding' });
    socket.disconnect(true);
    return false;
  }
  
  return true;
}

// Middleware für alle Events
socket.use((packet, next) => {
  if (!checkEventFlood(socket)) {
    return next(new Error('Banned'));
  }
  next();
});
```

---

### Passwortschutz für Private Räume

#### Passwort-Anforderungen

```typescript
const PASSWORD_CONFIG = {
  minLength: 4,
  maxLength: 32,
  // Keine komplexen Anforderungen – es sind nur temporäre Game-Räume
};

function validatePassword(input: unknown): ValidationResult {
  if (typeof input !== 'string') {
    return { valid: false, error: 'Password must be a string' };
  }
  
  if (input.length < PASSWORD_CONFIG.minLength) {
    return { valid: false, error: `Password must be at least ${PASSWORD_CONFIG.minLength} characters` };
  }
  
  if (input.length > PASSWORD_CONFIG.maxLength) {
    return { valid: false, error: `Password must be at most ${PASSWORD_CONFIG.maxLength} characters` };
  }
  
  return { valid: true, value: input };
}
```

#### Passwort-Hashing (auch im RAM wichtig!)

```typescript
import { createHash, randomBytes, timingSafeEqual } from 'crypto';

// Wir nutzen kein bcrypt weil:
// 1. Passwörter sind temporär (Raum existiert nur für Spielsession)
// 2. Keine Persistenz → kein Risiko von DB-Leaks
// 3. Aber wir hashen trotzdem für Memory-Dump-Schutz

function hashPassword(password: string): { hash: string; salt: string } {
  const salt = randomBytes(16).toString('hex');
  const hash = createHash('sha256')
    .update(password + salt)
    .digest('hex');
  
  return { hash, salt };
}

function verifyPassword(password: string, hash: string, salt: string): boolean {
  const inputHash = createHash('sha256')
    .update(password + salt)
    .digest('hex');
  
  // Timing-Safe Vergleich gegen Timing Attacks
  try {
    return timingSafeEqual(Buffer.from(hash), Buffer.from(inputHash));
  } catch {
    return false;
  }
}
```

#### Private Room mit Passwort

```typescript
interface PrivateRoom extends Instance {
  type: 'private';
  code: string;
  hostId: string;
  password: {
    hash: string;
    salt: string;
  } | null;  // null = kein Passwort
}

function createPrivateRoom(
  host: Player,
  options: { password?: string } = {}
): CreateRoomResult {
  // Rate Limit Check
  if (!checkRateLimit(host.socket, 'create-room')) {
    return { success: false, error: 'Rate limited' };
  }
  
  const code = generateRoomCode();
  
  // Passwort validieren und hashen (falls vorhanden)
  let passwordData: { hash: string; salt: string } | null = null;
  
  if (options.password) {
    const validation = validatePassword(options.password);
    if (!validation.valid) {
      return { success: false, error: validation.error };
    }
    passwordData = hashPassword(validation.value);
  }
  
  const room: PrivateRoom = {
    id: generateId(),
    type: 'private',
    code,
    hostId: host.id,
    password: passwordData,
    phase: 'lobby',
    players: new Map(),
    spectators: new Map(),
    submissions: [],
    votes: [],
    gallery: null,
    lastActivity: Date.now(),
    createdAt: Date.now()
  };
  
  room.players.set(host.id, host);
  instances.set(room.id, room);
  privateRooms.set(code, room);
  
  return {
    success: true,
    code,
    hasPassword: passwordData !== null
  };
}

function joinPrivateRoom(
  player: Player,
  code: string,
  password?: string
): JoinRoomResult {
  // Rate Limit Check
  if (!checkRateLimit(player.socket, 'join-room')) {
    return { success: false, error: 'Rate limited' };
  }
  
  // Code validieren
  const codeValidation = validateRoomCode(code);
  if (!codeValidation.valid) {
    return { success: false, error: codeValidation.error };
  }
  
  const room = privateRooms.get(codeValidation.value);
  
  if (!room) {
    // Generische Fehlermeldung (keine Info ob Raum existiert)
    return { success: false, error: 'Invalid room code or password' };
  }
  
  // Passwort prüfen (falls gesetzt)
  if (room.password) {
    if (!password) {
      return { success: false, error: 'Password required', passwordRequired: true };
    }
    
    if (!verifyPassword(password, room.password.hash, room.password.salt)) {
      // Gleiche Fehlermeldung wie bei falschem Code (Sicherheit)
      return { success: false, error: 'Invalid room code or password' };
    }
  }
  
  // Raum voll?
  if (room.players.size >= MAX_PLAYERS) {
    return { success: false, error: 'Room is full' };
  }
  
  // Spiel läuft?
  if (room.phase !== 'lobby') {
    room.spectators.set(player.id, player);
    return { success: true, spectator: true, room };
  }
  
  room.players.set(player.id, player);
  return { success: true, spectator: false, room };
}
```

#### Host kann Passwort ändern

```typescript
function updateRoomPassword(
  room: PrivateRoom,
  hostId: string,
  newPassword: string | null  // null = Passwort entfernen
): UpdatePasswordResult {
  // Nur Host kann ändern
  if (room.hostId !== hostId) {
    return { success: false, error: 'Only host can change password' };
  }
  
  // Nur in Lobby
  if (room.phase !== 'lobby') {
    return { success: false, error: 'Cannot change password during game' };
  }
  
  if (newPassword === null) {
    room.password = null;
    return { success: true, hasPassword: false };
  }
  
  const validation = validatePassword(newPassword);
  if (!validation.valid) {
    return { success: false, error: validation.error };
  }
  
  room.password = hashPassword(validation.value);
  return { success: true, hasPassword: true };
}
```

#### Client-Seite: Join mit Passwort

```typescript
// UI Flow
async function joinRoom(code: string) {
  const result = await socket.emitWithAck('join-room', { code });
  
  if (result.passwordRequired) {
    // Passwort-Dialog anzeigen
    const password = await showPasswordDialog();
    if (password) {
      const retryResult = await socket.emitWithAck('join-room', { code, password });
      handleJoinResult(retryResult);
    }
  } else {
    handleJoinResult(result);
  }
}
```

---

### Session Security

```typescript
import { randomBytes } from 'crypto';

// Session-ID Generierung (kryptographisch sicher)
function generateSessionId(): string {
  return randomBytes(32).toString('hex');  // 256-bit
}

// Session validieren
function validateSession(sessionId: unknown): boolean {
  if (typeof sessionId !== 'string') return false;
  if (sessionId.length !== 64) return false;  // 32 bytes = 64 hex chars
  if (!/^[a-f0-9]+$/.test(sessionId)) return false;
  return true;
}

// Session bei Connection
io.on('connection', (socket) => {
  let sessionId = socket.handshake.auth.sessionId;
  
  // Neue Session wenn keine oder ungültige
  if (!validateSession(sessionId)) {
    sessionId = generateSessionId();
  }
  
  socket.data.sessionId = sessionId;
  
  // Session-ID an Client senden (für Reconnect)
  socket.emit('session', { sessionId });
});
```

---

### Security Headers (HTTP)

```typescript
import helmet from 'helmet';

// Express Middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:"],
      connectSrc: ["'self'", "wss:", "ws:"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      frameSrc: ["'none'"],
    },
  },
  crossOriginEmbedderPolicy: false,  // Für WebSocket Kompatibilität
}));

// CORS
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || '*',
  credentials: true,
}));
```

---

### Sicherheits-Checkliste

| Bereich | Maßnahme | Status |
|---------|----------|--------|
| **Input Validation** | | |
| Username | Länge, Zeichen, XSS-Filter | ✅ |
| Pixels | Länge, Hex-Only | ✅ |
| Room Code | Format, Länge | ✅ |
| Vote | Enum-Check | ✅ |
| Password | Länge-Limits | ✅ |
| **Rate Limiting** | | |
| Connections | 5/Min pro IP | ✅ |
| Room Creation | 3/Min | ✅ |
| Voting | 3/Sek | ✅ |
| General Events | 20/Sek | ✅ |
| **Anti-Cheat** | | |
| Self-Voting | Server-Check | ✅ |
| Double-Voting | Server-Check | ✅ |
| Timing Validation | Server-autoritativ | ✅ |
| Multi-Account | IP-basiert (basic) | ✅ |
| **DoS Protection** | | |
| Connection Limit | Per IP + Global | ✅ |
| Payload Size | 1KB Max | ✅ |
| Event Flooding | Auto-Ban | ✅ |
| Idle Timeout | 30s Disconnect | ✅ |
| **Passwords** | | |
| Hashing | SHA256 + Salt | ✅ |
| Timing-Safe Compare | Ja | ✅ |
| Generic Errors | Keine Info-Leaks | ✅ |
| **Session** | | |
| Secure Generation | 256-bit Random | ✅ |
| Validation | Format-Check | ✅ |

---

## Skalierbarkeit (Multi-Server)

### Wann braucht man mehrere Server?

| Spieler | Server | Grund |
|---------|--------|-------|
| < 10.000 | 1 | Einfach, kein Sync nötig |
| 10.000 - 50.000 | 2-3 | Vertikale Skalierung erschöpft |
| > 50.000 | 3+ | Horizontale Skalierung |

### Single-Server Architektur (v1)

```
┌─────────────────────────────────────────┐
│              Load Balancer              │
│           (Render/Railway)              │
└─────────────────┬───────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────┐
│           Node.js Server                │
│  ┌───────────────────────────────────┐  │
│  │         In-Memory State           │  │
│  │  - Instances                      │  │
│  │  - Players                        │  │
│  │  - Sessions                       │  │
│  └───────────────────────────────────┘  │
└─────────────────────────────────────────┘
```

### Multi-Server Architektur (später, falls nötig)

```
┌─────────────────────────────────────────┐
│              Load Balancer              │
│         (Sticky Sessions: IP)           │
└───────┬───────────────┬─────────────────┘
        │               │
        ▼               ▼
┌───────────────┐ ┌───────────────┐
│   Server 1    │ │   Server 2    │
│  (EU-West)    │ │  (EU-West)    │
└───────┬───────┘ └───────┬───────┘
        │               │
        └───────┬───────┘
                │
                ▼
┌─────────────────────────────────────────┐
│          Redis (Optional)               │
│  - Session Store                        │
│  - Pub/Sub für Cross-Server Events      │
│  - Shared State für globale Features    │
└─────────────────────────────────────────┘
```

### Sticky Sessions (Wichtig!)

WebSocket-Verbindungen MÜSSEN immer zum gleichen Server gehen:

```typescript
// Render/Railway Config
// → "Sticky Sessions" oder "Session Affinity" aktivieren

// Nginx Beispiel (Self-Hosted)
upstream game_servers {
  ip_hash;  // Sticky Sessions basierend auf IP
  server server1:3000;
  server server2:3000;
}
```

### Redis Integration (Optional, für später)

```typescript
import { createClient } from 'redis';
import { createAdapter } from '@socket.io/redis-adapter';

// Nur wenn Multi-Server benötigt
const pubClient = createClient({ url: process.env.REDIS_URL });
const subClient = pubClient.duplicate();

await Promise.all([pubClient.connect(), subClient.connect()]);

// Socket.io mit Redis Adapter
io.adapter(createAdapter(pubClient, subClient));

// Jetzt können Events zwischen Servern synchronisiert werden
// z.B. für globale Statistiken, Server-übergreifende Benachrichtigungen
```

### Was muss bei Multi-Server beachtet werden?

| Feature | Single-Server | Multi-Server |
|---------|---------------|--------------|
| Instance State | In-Memory | Sticky Session (gleicher Server) |
| Sessions | In-Memory | Redis oder Sticky |
| Private Rooms | In-Memory | Sticky (Room auf einem Server) |
| Global Stats | Direkt | Redis Pub/Sub |
| Queue | In-Memory | Redis (shared) |

**Empfehlung:** Starte mit Single-Server. Die Architektur ist so gebaut, dass Redis später hinzugefügt werden kann ohne große Änderungen.

---

## Monetarisierung (Spätere Entwicklung)

> ⚠️ **Hinweis:** Dieser Abschnitt ist für zukünftige Versionen geplant, nicht für v1.

### Grundprinzipien

- ✅ 100% Open Source bleibt
- ✅ Keine Datenbank nötig
- ✅ Keine Registrierung/Accounts
- ✅ Keine Abos
- ✅ Spiel bleibt komplett kostenlos spielbar

### Phase 1: Spenden (Einfach)

```
┌─────────────────────────────────────────┐
│  ☕ Enjoying the game?                  │
│                                         │
│  [Ko-fi]  [GitHub Sponsors]             │
│                                         │
│  100% open source, funded by players    │
└─────────────────────────────────────────┘
```

Platzierung:
- Dezent im Footer
- Nach Spielende (nicht nervig)
- GitHub README

### Phase 2: Kosmetische Items

Rein visuell, kein Gameplay-Vorteil.

**Mögliche Items:**

| Item | Preis | Beschreibung |
|------|-------|--------------|
| Rainbow Name | $2 | Name in Regenbogenfarben |
| Neon Palette | $2 | 16 zusätzliche Neon-Farben |
| Pastel Palette | $2 | 16 zusätzliche Pastell-Farben |
| Confetti Win | $2 | Konfetti-Animation bei Sieg |
| Pixel Master Title | $1 | Titel unter dem Namen |
| OG Player Title | $1 | "Early Supporter" Badge |

### Lizenzcode-System

Da wir keine Datenbank haben, nutzen wir kryptographisch signierte Codes:

```
KAUF-FLOW:
──────────────────────────────────────────────────────────

1. Spieler kauft Item (z.B. über LemonSqueezy/Stripe)
   └── Gibt Email ein (NUR für Receipt, kein Account!)

2. Server generiert signierten Lizenzcode

3. Code wird per Email geschickt

4. Spieler gibt Code im Spiel ein → Item freigeschaltet

5. Code in LocalStorage gespeichert

6. Neues Gerät? → Code erneut eingeben

──────────────────────────────────────────────────────────
```

#### Code-Format

```
PIXEL-[ITEM]-[RANDOM]-[RANDOM]-[CHECKSUM]

Beispiele:
PIXEL-RN-A7X2-K9M3-8F2D  (Rainbow Name)
PIXEL-NP-B3K7-M2X9-4A1C  (Neon Palette)
PIXEL-CW-F8N2-P5R1-7D3E  (Confetti Win)
```

#### Item-Codes

```typescript
const ITEM_CODES: Record<string, string> = {
  'rainbow-name': 'RN',
  'neon-palette': 'NP',
  'pastel-palette': 'PP',
  'retro-palette': 'RP',
  'confetti-win': 'CW',
  'firework-win': 'FW',
  'pixel-master-title': 'PM',
  'og-player-title': 'OG',
};
```

#### Server: Code generieren

```typescript
// Nach erfolgreicher Zahlung (Webhook)
function generateLicenseCode(itemId: string): string {
  const itemCode = ITEM_CODES[itemId];
  const random1 = generateRandomChars(4);
  const random2 = generateRandomChars(4);
  
  // Checksum: HMAC mit Server-Secret (verifizierbar ohne DB!)
  const payload = `${itemCode}-${random1}-${random2}`;
  const checksum = createHMAC(payload, process.env.LICENSE_SECRET)
    .substring(0, 4)
    .toUpperCase();
  
  return `PIXEL-${itemCode}-${random1}-${random2}-${checksum}`;
}

function generateRandomChars(length: number): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Keine 0,O,1,I,L
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars[Math.floor(Math.random() * chars.length)];
  }
  return result;
}
```

#### Server: Code verifizieren

```typescript
// KEINE Datenbank nötig - rein kryptographisch!
function verifyLicenseCode(code: string): VerifyResult {
  const parts = code.toUpperCase().split('-');
  
  // Format prüfen
  if (parts.length !== 5 || parts[0] !== 'PIXEL') {
    return { valid: false, error: 'Invalid format' };
  }
  
  const [_, itemCode, random1, random2, checksum] = parts;
  
  // Item existiert?
  const itemId = Object.entries(ITEM_CODES)
    .find(([_, code]) => code === itemCode)?.[0];
  
  if (!itemId) {
    return { valid: false, error: 'Unknown item' };
  }
  
  // Checksum verifizieren (gleiche Berechnung wie bei Generierung)
  const payload = `${itemCode}-${random1}-${random2}`;
  const expectedChecksum = createHMAC(payload, process.env.LICENSE_SECRET)
    .substring(0, 4)
    .toUpperCase();
  
  if (checksum !== expectedChecksum) {
    return { valid: false, error: 'Invalid code' };
  }
  
  return { valid: true, itemId };
}
```

#### Client: LocalStorage

```typescript
interface OwnedItems {
  codes: string[];           // Alle eingegebenen Codes
  items: string[];           // Freigeschaltete Item-IDs
  lastVerified: number;      // Wann zuletzt verifiziert
}

// Code einlösen
async function redeemCode(code: string): Promise<RedeemResult> {
  // 1. Format-Check
  const formatted = code.toUpperCase().trim();
  if (!/^PIXEL-[A-Z]{2}-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/.test(formatted)) {
    return { success: false, error: 'Invalid code format' };
  }
  
  // 2. Server-Verifikation
  const result = await fetch('/api/verify-code', {
    method: 'POST',
    body: JSON.stringify({ code: formatted })
  }).then(r => r.json());
  
  if (!result.valid) {
    return { success: false, error: result.error };
  }
  
  // 3. In LocalStorage speichern
  const owned = getOwnedItems();
  if (!owned.codes.includes(formatted)) {
    owned.codes.push(formatted);
  }
  if (!owned.items.includes(result.itemId)) {
    owned.items.push(result.itemId);
  }
  owned.lastVerified = Date.now();
  saveOwnedItems(owned);
  
  return { success: true, itemId: result.itemId };
}

// Beim App-Start: Codes erneut verifizieren (1x pro Tag)
async function verifyOwnedItems() {
  const owned = getOwnedItems();
  
  if (Date.now() - owned.lastVerified < 86400000) {
    return; // Schon heute verifiziert
  }
  
  const validItems: string[] = [];
  
  for (const code of owned.codes) {
    const result = await fetch('/api/verify-code', {
      method: 'POST',
      body: JSON.stringify({ code })
    }).then(r => r.json());
    
    if (result.valid) {
      validItems.push(result.itemId);
    }
  }
  
  owned.items = validItems;
  owned.lastVerified = Date.now();
  saveOwnedItems(owned);
}
```

#### Email-Template

```
Subject: Your Pixel Duel Purchase 🎨

Thanks for supporting Pixel Duel!

╔═══════════════════════════════════════╗
║                                       ║
║   PIXEL-RN-A7X2-K9M3-8F2D            ║
║                                       ║
║   Item: Rainbow Name Effect           ║
║                                       ║
╚═══════════════════════════════════════╝

How to use:
1. Open Pixel Duel
2. Go to Settings → Redeem Code
3. Enter the code above

⚠️ SAVE THIS EMAIL!
You'll need this code on new devices.
```

### Warum dieses System funktioniert

| Problem | Lösung |
|---------|--------|
| Keine Datenbank | Codes sind selbst-verifizierend (HMAC) |
| Keine Accounts | Email nur für Receipt |
| Gerätewechsel | Code erneut eingeben |
| Browser gelöscht | Code erneut eingeben |
| Code-Sharing? | Bei $1-3 Items nicht rentabel |

### Phase 3: Weitere Optionen (Später)

- **Sponsoring:** "Powered by [Company]" für Firmen
- **Prompt-Packs:** Themen-Prompts ($2-3)
- **Werbung:** Nicht-aufdringlich zwischen Runden (Carbon Ads)
- **Merch:** T-Shirts, Sticker via Printful

---

## Edge Cases

### Alle Spieler sind AFK

Wenn während der Zeichenphase keine einzige gültige Submission eingeht:

```typescript
const AFK_CONFIG = {
  warningTime: 10_000,     // 10s vor Ende: Warnung anzeigen
  minValidSubmissions: 1,   // Mindestens 1 Submission nötig
};

function onDrawingPhaseEnd(instance: Instance) {
  const validSubmissions = instance.submissions.filter(s => 
    validateSubmission(s.pixels)
  );
  
  if (validSubmissions.length < AFK_CONFIG.minValidSubmissions) {
    // Niemand hat gezeichnet → Runde abbrechen
    abortRound(instance, 'NO_SUBMISSIONS');
  }
}

function abortRound(instance: Instance, reason: AbortReason) {
  // Countdown anzeigen (5 Sekunden)
  io.to(instance.id).emit('round-aborted', {
    reason,
    message: getAbortMessage(reason),
    redirectIn: 5000
  });
  
  // Nach Countdown: Alle zum Startscreen
  setTimeout(() => {
    io.to(instance.id).emit('redirect-to-lobby');
    
    // Instanz aufräumen
    cleanupInstance(instance);
  }, 5000);
}

function getAbortMessage(reason: AbortReason): string {
  switch (reason) {
    case 'NO_SUBMISSIONS':
      return 'Round cancelled: No one submitted a drawing.';
    case 'NOT_ENOUGH_PLAYERS':
      return 'Round cancelled: Not enough players remaining.';
    case 'HOST_LEFT':
      return 'Room closed: The host has left.';
    default:
      return 'Round cancelled.';
  }
}
```

### Zu wenige Spieler übrig (Disconnects)

Wenn während des Spiels zu viele Spieler disconnecten:

```typescript
const MIN_PLAYERS_TO_CONTINUE = 3;  // Minimum um weiterzuspielen

function checkPlayerCount(instance: Instance) {
  const activePlayers = instance.players.size;
  
  // Prüfen bei jedem Disconnect
  if (activePlayers < MIN_PLAYERS_TO_CONTINUE) {
    // Voting läuft? → Abbrechen
    if (instance.phase.startsWith('voting') || instance.phase === 'finale') {
      abortRound(instance, 'NOT_ENOUGH_PLAYERS');
      return;
    }
    
    // Zeichnen läuft? → Warnung, dann abbrechen wenn es so bleibt
    if (instance.phase === 'drawing') {
      io.to(instance.id).emit('low-player-warning', {
        current: activePlayers,
        minimum: MIN_PLAYERS_TO_CONTINUE,
        message: `Only ${activePlayers} players left. Need ${MIN_PLAYERS_TO_CONTINUE} to continue.`
      });
      
      // Wenn am Ende der Zeichenphase immer noch zu wenige
      instance.checkPlayersOnPhaseEnd = true;
    }
  }
}

function onPhaseEnd(instance: Instance, phase: Phase) {
  if (instance.checkPlayersOnPhaseEnd && 
      instance.players.size < MIN_PLAYERS_TO_CONTINUE) {
    abortRound(instance, 'NOT_ENOUGH_PLAYERS');
    return;
  }
  
  // Normal weitermachen
  proceedToNextPhase(instance);
}
```

### Host verlässt privaten Raum

```typescript
function handleHostDisconnect(instance: PrivateRoom) {
  // Ist das Spiel gerade aktiv?
  if (instance.phase !== 'lobby') {
    // Runde zu Ende spielen lassen
    instance.hostLeft = true;
    
    // Info an alle Spieler
    io.to(instance.id).emit('host-left', {
      message: 'The host has left. This will be the final round.'
    });
    
    // Am Ende der Runde: Raum schließen
    instance.onRoundEnd = () => {
      io.to(instance.id).emit('room-closed', {
        reason: 'HOST_LEFT',
        message: 'Room closed: The host has left.'
      });
      
      cleanupInstance(instance);
    };
  } else {
    // In der Lobby: Sofort schließen
    io.to(instance.id).emit('room-closed', {
      reason: 'HOST_LEFT',
      message: 'Room closed: The host has left.'
    });
    
    cleanupInstance(instance);
  }
}

// Alternative: Host-Transfer zum nächsten Spieler
function transferHost(instance: PrivateRoom) {
  const players = [...instance.players.values()];
  const newHost = players.find(p => p.id !== instance.hostId);
  
  if (newHost) {
    instance.hostId = newHost.id;
    
    io.to(instance.id).emit('host-changed', {
      newHostId: newHost.id,
      newHostName: newHost.user.fullName
    });
    
    // Neuen Host benachrichtigen
    newHost.socket.emit('you-are-host');
  } else {
    // Kein anderer Spieler da
    cleanupInstance(instance);
  }
}
```

### Browser Tab wechseln / Minimieren

WebSocket-Verbindungen bleiben bestehen, auch wenn der Tab nicht aktiv ist. Aber wir müssen aufpassen:

```typescript
// Client-Seite: Visibility Change Detection
document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    // Tab ist jetzt im Hintergrund
    console.log('[Client] Tab hidden');
    
    // Optional: Server informieren (für Stats/Debugging)
    socket.emit('tab-hidden');
  } else {
    // Tab ist wieder aktiv
    console.log('[Client] Tab visible');
    
    // Server-Zeit synchronisieren (falls Timer abweicht)
    socket.emit('sync-request');
    
    socket.emit('tab-visible');
  }
});

// Server-Seite: Sync Response
socket.on('sync-request', () => {
  const instance = getPlayerInstance(socket.id);
  if (!instance) return;
  
  socket.emit('sync-response', {
    serverTime: Date.now(),
    phase: instance.phase,
    phaseEndsAt: instance.phaseEndsAt,
    // Aktuellen State mitschicken
    state: getClientState(instance, socket.id)
  });
});

// Client: Timer mit Server synchronisieren
socket.on('sync-response', (data) => {
  const serverTime = data.serverTime;
  const localTime = Date.now();
  const drift = localTime - serverTime;
  
  // Timer korrigieren
  if (data.phaseEndsAt) {
    const remaining = data.phaseEndsAt - serverTime;
    updateTimer(remaining);
  }
  
  // State aktualisieren falls nötig
  updateGameState(data.state);
});
```

**Wichtig:** Der Spieler muss trotzdem rechtzeitig voten/zeichnen. Wenn er den Tab wechselt und die Zeit verpasst, ist das sein Problem.

---

## Browser & Device Support

### Unterstützte Browser

| Browser | Version | Status |
|---------|---------|--------|
| Chrome | 90+ | ✅ Voll unterstützt |
| Firefox | 90+ | ✅ Voll unterstützt |
| Safari | 14+ | ✅ Voll unterstützt |
| Edge | 90+ | ✅ Voll unterstützt |
| Opera | 76+ | ✅ Voll unterstützt |
| Samsung Internet | 14+ | ✅ Voll unterstützt |
| IE11 | - | ❌ Nicht unterstützt |

### Benötigte Features

```typescript
// Feature Detection beim Start
function checkBrowserSupport(): BrowserSupport {
  const issues: string[] = [];
  
  // WebSocket Support
  if (!('WebSocket' in window)) {
    issues.push('WebSocket not supported');
  }
  
  // LocalStorage
  try {
    localStorage.setItem('test', 'test');
    localStorage.removeItem('test');
  } catch (e) {
    issues.push('LocalStorage not available');
  }
  
  // Canvas
  const canvas = document.createElement('canvas');
  if (!canvas.getContext('2d')) {
    issues.push('Canvas not supported');
  }
  
  // Touch Events (für Mobile)
  const hasTouch = 'ontouchstart' in window;
  
  return {
    supported: issues.length === 0,
    issues,
    hasTouch,
    isMobile: /Android|iPhone|iPad|iPod/i.test(navigator.userAgent)
  };
}
```

### Nur Hochformat (Portrait)

```typescript
// CSS: Landscape Warnung
@media screen and (orientation: landscape) and (max-height: 500px) {
  .landscape-warning {
    display: flex;
  }
  
  .game-container {
    display: none;
  }
}

// Svelte Component
<script>
  let isLandscape = false;
  
  function checkOrientation() {
    isLandscape = window.innerWidth > window.innerHeight && window.innerHeight < 500;
  }
  
  onMount(() => {
    checkOrientation();
    window.addEventListener('resize', checkOrientation);
    window.addEventListener('orientationchange', checkOrientation);
  });
</script>

{#if isLandscape}
  <div class="landscape-warning">
    <div class="icon">📱</div>
    <p>Please rotate your device to portrait mode</p>
  </div>
{:else}
  <div class="game-container">
    <!-- Game Content -->
  </div>
{/if}

<style>
  .landscape-warning {
    position: fixed;
    inset: 0;
    background: var(--bg-color);
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 1rem;
    z-index: 9999;
  }
  
  .landscape-warning .icon {
    font-size: 4rem;
    animation: rotate 1s ease-in-out infinite alternate;
  }
  
  @keyframes rotate {
    from { transform: rotate(0deg); }
    to { transform: rotate(90deg); }
  }
</style>
```

### PWA (Progressive Web App)

```json
// manifest.json
{
  "name": "Pixel Duel",
  "short_name": "PixelDuel",
  "description": "Draw pixel art and compete with others!",
  "start_url": "/",
  "display": "standalone",
  "orientation": "portrait",
  "background_color": "#1a1a2e",
  "theme_color": "#4a90d9",
  "icons": [
    {
      "src": "/icons/icon-192.png",
      "sizes": "192x192",
      "type": "image/png"
    },
    {
      "src": "/icons/icon-512.png",
      "sizes": "512x512",
      "type": "image/png"
    },
    {
      "src": "/icons/icon-maskable-512.png",
      "sizes": "512x512",
      "type": "image/png",
      "purpose": "maskable"
    }
  ]
}
```

```typescript
// Service Worker (sw.js)
const CACHE_NAME = 'pixel-duel-v1';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/app.js',
  '/app.css',
  '/manifest.json',
  '/icons/icon-192.png',
  '/icons/icon-512.png'
];

// Install: Cache static assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    })
  );
});

// Fetch: Cache-first for static, network-first for API
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  
  // API Calls: Always network
  if (url.pathname.startsWith('/api') || url.pathname.startsWith('/socket.io')) {
    event.respondWith(fetch(event.request));
    return;
  }
  
  // Static Assets: Cache first
  event.respondWith(
    caches.match(event.request).then((cached) => {
      return cached || fetch(event.request).then((response) => {
        // Cache new resources
        const clone = response.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, clone);
        });
        return response;
      });
    })
  );
});

// Activate: Clean old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
      );
    })
  );
});
```

```html
<!-- index.html -->
<head>
  <link rel="manifest" href="/manifest.json">
  <meta name="theme-color" content="#4a90d9">
  <meta name="apple-mobile-web-app-capable" content="yes">
  <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
  <link rel="apple-touch-icon" href="/icons/icon-192.png">
</head>

<script>
  // Register Service Worker
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js')
      .then(reg => console.log('SW registered'))
      .catch(err => console.log('SW registration failed', err));
  }
</script>
```

---

## Cookie Notice

Da wir IP-Adressen (für Rate Limiting) und Session-Daten (im RAM) speichern:

```typescript
// Cookie/Privacy Notice Component
<script>
  import { onMount } from 'svelte';
  
  let showNotice = false;
  
  onMount(() => {
    const accepted = localStorage.getItem('cookie-notice-accepted');
    showNotice = !accepted;
  });
  
  function acceptNotice() {
    localStorage.setItem('cookie-notice-accepted', 'true');
    showNotice = false;
  }
</script>

{#if showNotice}
  <div class="cookie-notice">
    <p>
      This game stores your session data temporarily while you play. 
      Your IP address is used for rate limiting and security purposes only.
      No personal data is permanently stored or shared.
    </p>
    <button on:click={acceptNotice}>Got it!</button>
  </div>
{/if}

<style>
  .cookie-notice {
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    background: var(--bg-secondary);
    padding: 1rem;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    z-index: 1000;
    border-top: 1px solid var(--border-color);
  }
  
  .cookie-notice p {
    font-size: 0.875rem;
    margin: 0;
  }
  
  .cookie-notice button {
    align-self: flex-end;
    padding: 0.5rem 1rem;
    background: var(--primary-color);
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
  }
</style>
```

### Was wir speichern

| Daten | Wo | Wie lange | Zweck |
|-------|-----|-----------|-------|
| Session ID | LocalStorage | Permanent | Reconnect, Stats |
| Username | LocalStorage | Permanent | Wiedererkennung |
| Preferences | LocalStorage | Permanent | Dark/Light Mode |
| IP-Adresse | Server RAM | Session | Rate Limiting, Anti-Abuse |
| Spiel-State | Server RAM | Session | Gameplay |

**Wichtig:** Keine Daten werden permanent auf dem Server gespeichert. Alles ist weg nach Server-Neustart.

---

## Debug & Test-System

### Warum?

Multiplayer-Spiele sind schwer alleine zu testen. Deshalb bauen wir ein Bot-System ein, das echte Spieler simuliert.

### Bot-System

```typescript
// Nur im Development-Modus aktiv
const DEBUG_CONFIG = {
  enabled: process.env.NODE_ENV === 'development',
  botPrefix: 'Bot_',
  defaultBotCount: 10,
  maxBots: 100,
};

interface Bot {
  id: string;
  user: User;
  socket: FakeSocket;
  behavior: BotBehavior;
}

type BotBehavior = 'normal' | 'slow' | 'afk' | 'disconnector' | 'fast';

const BOT_BEHAVIORS: Record<BotBehavior, BotConfig> = {
  normal: {
    voteDelay: { min: 1000, max: 4000 },  // 1-4s zum Voten
    drawTime: { min: 30000, max: 55000 }, // 30-55s zum Zeichnen
    disconnectChance: 0.02,               // 2% Disconnect-Chance
    afkChance: 0.05,                      // 5% AFK-Chance
  },
  slow: {
    voteDelay: { min: 3000, max: 4900 },  // Fast zu spät
    drawTime: { min: 50000, max: 59000 }, // Knapp vor Deadline
    disconnectChance: 0.01,
    afkChance: 0.1,
  },
  afk: {
    voteDelay: { min: 99999, max: 99999 }, // Votet nie
    drawTime: { min: 99999, max: 99999 },  // Zeichnet nie
    disconnectChance: 0,
    afkChance: 1,
  },
  disconnector: {
    voteDelay: { min: 1000, max: 3000 },
    drawTime: { min: 20000, max: 40000 },
    disconnectChance: 0.3,                 // 30% Disconnect!
    afkChance: 0.1,
  },
  fast: {
    voteDelay: { min: 100, max: 500 },     // Sofort voten
    drawTime: { min: 5000, max: 15000 },   // Schnell zeichnen
    disconnectChance: 0,
    afkChance: 0,
  },
};
```

### Bot-Erstellung

```typescript
const BOT_NAMES = [
  'Pixel', 'Doodle', 'Sketch', 'Draw', 'Art', 'Canvas', 
  'Brush', 'Paint', 'Color', 'Line', 'Shape', 'Blob',
  'Scribble', 'Squiggle', 'Dot', 'Stroke', 'Mark', 'Trace'
];

function createBot(behavior: BotBehavior = 'normal'): Bot {
  const name = BOT_NAMES[Math.floor(Math.random() * BOT_NAMES.length)];
  const discriminator = String(Math.floor(Math.random() * 10000)).padStart(4, '0');
  
  const bot: Bot = {
    id: `bot_${generateId()}`,
    user: {
      displayName: `${DEBUG_CONFIG.botPrefix}${name}`,
      discriminator,
      fullName: `${DEBUG_CONFIG.botPrefix}${name}#${discriminator}`
    },
    socket: new FakeSocket(),
    behavior
  };
  
  return bot;
}

// Fake Socket der Server-Events simuliert
class FakeSocket {
  id: string;
  connected: boolean = true;
  private listeners: Map<string, Function[]> = new Map();
  
  constructor() {
    this.id = `fake_${generateId()}`;
  }
  
  emit(event: string, data: any) {
    // Bot "empfängt" Event und reagiert
    this.handleEvent(event, data);
  }
  
  on(event: string, callback: Function) {
    const listeners = this.listeners.get(event) || [];
    listeners.push(callback);
    this.listeners.set(event, listeners);
  }
  
  private handleEvent(event: string, data: any) {
    // Wird von Bot-Logic überschrieben
  }
  
  disconnect() {
    this.connected = false;
  }
}
```

### Bot-Verhalten

```typescript
class BotController {
  private bots: Map<string, Bot> = new Map();
  private instance: Instance;
  
  constructor(instance: Instance) {
    this.instance = instance;
  }
  
  // Bots zur Instanz hinzufügen
  addBots(count: number, behavior: BotBehavior = 'normal') {
    for (let i = 0; i < count; i++) {
      const bot = createBot(behavior);
      this.bots.set(bot.id, bot);
      
      // Bot "joint" die Instanz
      this.instance.players.set(bot.id, {
        id: bot.id,
        user: bot.user,
        socket: bot.socket
      });
      
      this.setupBotBehavior(bot);
    }
    
    console.log(`[Debug] Added ${count} ${behavior} bots to instance ${this.instance.id}`);
  }
  
  private setupBotBehavior(bot: Bot) {
    const config = BOT_BEHAVIORS[bot.behavior];
    
    // Auf Zeichenphase reagieren
    bot.socket.on('drawing-start', (data) => {
      if (Math.random() < config.afkChance) {
        console.log(`[Bot] ${bot.user.fullName} is AFK, won't draw`);
        return;
      }
      
      // Zufällige Disconnect-Chance
      if (Math.random() < config.disconnectChance) {
        this.simulateDisconnect(bot);
        return;
      }
      
      // Nach zufälliger Zeit zeichnen
      const delay = randomBetween(config.drawTime.min, config.drawTime.max);
      setTimeout(() => {
        if (bot.socket.connected) {
          const pixels = this.generateRandomDrawing();
          this.submitDrawing(bot, pixels);
        }
      }, delay);
    });
    
    // Auf Voting reagieren
    bot.socket.on('voting-round', (data) => {
      if (Math.random() < config.afkChance) {
        return; // AFK, votet nicht
      }
      
      if (Math.random() < config.disconnectChance) {
        this.simulateDisconnect(bot);
        return;
      }
      
      const delay = randomBetween(config.voteDelay.min, config.voteDelay.max);
      setTimeout(() => {
        if (bot.socket.connected) {
          // Zufällig A oder B wählen
          const choice = Math.random() > 0.5 ? data.imageA : data.imageB;
          this.submitVote(bot, choice);
        }
      }, delay);
    });
    
    // Auf Finale reagieren
    bot.socket.on('finale-start', (data) => {
      if (Math.random() < config.afkChance) return;
      
      const delay = randomBetween(config.voteDelay.min, config.voteDelay.max);
      setTimeout(() => {
        if (bot.socket.connected) {
          // Zufälligen Finalisten wählen (nicht sich selbst)
          const choices = data.finalists.filter(f => f.playerId !== bot.id);
          const choice = choices[Math.floor(Math.random() * choices.length)];
          this.submitFinaleVote(bot, choice.playerId);
        }
      }, delay);
    });
  }
  
  // Zufälliges 8x8 Bild generieren
  private generateRandomDrawing(): string {
    const patterns = [
      () => this.generateSmiley(),
      () => this.generateHouse(),
      () => this.generateHeart(),
      () => this.generateRandom(),
      () => this.generateStripes(),
    ];
    
    const pattern = patterns[Math.floor(Math.random() * patterns.length)];
    return pattern();
  }
  
  private generateSmiley(): string {
    // Einfaches Smiley-Muster
    return (
      '00000000' +
      '05500550' +
      '05500550' +
      '00000000' +
      '00000000' +
      '50000050' +
      '05555550' +
      '00000000'
    ).split('').map(c => c === '5' ? 'F' : '0').join('');
  }
  
  private generateHouse(): string {
    return (
      '00011000' +
      '00111100' +
      '01111110' +
      '00111100' +
      '00111100' +
      '00111100' +
      '00100100' +
      '00000000'
    ).split('').map(c => c === '1' ? '8' : '0').join('');
  }
  
  private generateHeart(): string {
    return (
      '00000000' +
      '01100110' +
      '11111111' +
      '11111111' +
      '01111110' +
      '00111100' +
      '00011000' +
      '00000000'
    ).split('').map(c => c === '1' ? '2' : '0').join('');
  }
  
  private generateRandom(): string {
    let pixels = '';
    for (let i = 0; i < 64; i++) {
      if (Math.random() > 0.7) {
        pixels += Math.floor(Math.random() * 16).toString(16).toUpperCase();
      } else {
        pixels += '0';
      }
    }
    return pixels;
  }
  
  private generateStripes(): string {
    let pixels = '';
    const color1 = Math.floor(Math.random() * 16).toString(16).toUpperCase();
    const color2 = Math.floor(Math.random() * 16).toString(16).toUpperCase();
    for (let y = 0; y < 8; y++) {
      for (let x = 0; x < 8; x++) {
        pixels += y % 2 === 0 ? color1 : color2;
      }
    }
    return pixels;
  }
  
  private simulateDisconnect(bot: Bot) {
    console.log(`[Bot] ${bot.user.fullName} disconnected`);
    bot.socket.disconnect();
    handlePlayerDisconnect(this.instance, bot.id);
  }
  
  private submitDrawing(bot: Bot, pixels: string) {
    console.log(`[Bot] ${bot.user.fullName} submitted drawing`);
    // Trigger submission logic
  }
  
  private submitVote(bot: Bot, chosenId: string) {
    console.log(`[Bot] ${bot.user.fullName} voted for ${chosenId}`);
    // Trigger vote logic
  }
  
  private submitFinaleVote(bot: Bot, chosenId: string) {
    console.log(`[Bot] ${bot.user.fullName} finale vote for ${chosenId}`);
    // Trigger finale vote logic
  }
  
  // Alle Bots entfernen
  removeAllBots() {
    for (const [id, bot] of this.bots) {
      bot.socket.disconnect();
      this.instance.players.delete(id);
    }
    this.bots.clear();
    console.log(`[Debug] Removed all bots from instance ${this.instance.id}`);
  }
}

function randomBetween(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
```

### Debug-Panel (Client)

```typescript
// Nur im Development sichtbar
const DebugPanel = () => {
  const [botCount, setBotCount] = useState(10);
  const [behavior, setBehavior] = useState<BotBehavior>('normal');
  
  if (process.env.NODE_ENV !== 'development') {
    return null;
  }
  
  return (
    <div class="debug-panel">
      <h3>🔧 Debug Panel</h3>
      
      <section>
        <h4>Bots</h4>
        <input 
          type="number" 
          value={botCount} 
          onChange={(e) => setBotCount(+e.target.value)}
          min={1} 
          max={100} 
        />
        <select value={behavior} onChange={(e) => setBehavior(e.target.value)}>
          <option value="normal">Normal</option>
          <option value="slow">Slow (late voters)</option>
          <option value="afk">AFK (no action)</option>
          <option value="disconnector">Disconnector (30% DC)</option>
          <option value="fast">Fast (instant)</option>
        </select>
        <button onClick={() => addBots(botCount, behavior)}>Add Bots</button>
        <button onClick={() => removeAllBots()}>Remove All</button>
      </section>
      
      <section>
        <h4>Game Control</h4>
        <button onClick={() => forceStartGame()}>Force Start</button>
        <button onClick={() => skipToVoting()}>Skip to Voting</button>
        <button onClick={() => skipToFinale()}>Skip to Finale</button>
        <button onClick={() => skipToResults()}>Skip to Results</button>
      </section>
      
      <section>
        <h4>Timer Override</h4>
        <button onClick={() => setTimerSpeed(0.5)}>0.5x Speed</button>
        <button onClick={() => setTimerSpeed(1)}>1x Speed</button>
        <button onClick={() => setTimerSpeed(2)}>2x Speed</button>
        <button onClick={() => setTimerSpeed(10)}>10x Speed</button>
      </section>
      
      <section>
        <h4>Stats</h4>
        <p>Players: {playerCount}</p>
        <p>Bots: {botCount}</p>
        <p>Phase: {currentPhase}</p>
        <p>Timer: {timeRemaining}s</p>
      </section>
    </div>
  );
};
```

### Debug-Endpoints (Server)

```typescript
// Nur im Development aktiv
if (process.env.NODE_ENV === 'development') {
  
  // Bot-Steuerung
  app.post('/debug/bots/add', (req, res) => {
    const { instanceId, count, behavior } = req.body;
    const instance = instances.get(instanceId);
    
    if (!instance) {
      return res.status(404).json({ error: 'Instance not found' });
    }
    
    const controller = new BotController(instance);
    controller.addBots(count, behavior);
    
    res.json({ success: true, totalPlayers: instance.players.size });
  });
  
  app.post('/debug/bots/remove', (req, res) => {
    const { instanceId } = req.body;
    const instance = instances.get(instanceId);
    
    if (!instance) {
      return res.status(404).json({ error: 'Instance not found' });
    }
    
    // Alle Bots entfernen (erkennbar am Prefix)
    for (const [id, player] of instance.players) {
      if (player.user.displayName.startsWith(DEBUG_CONFIG.botPrefix)) {
        instance.players.delete(id);
      }
    }
    
    res.json({ success: true, remainingPlayers: instance.players.size });
  });
  
  // Spiel-Steuerung
  app.post('/debug/game/force-start', (req, res) => {
    const { instanceId } = req.body;
    const instance = instances.get(instanceId);
    
    if (!instance) {
      return res.status(404).json({ error: 'Instance not found' });
    }
    
    clearTimeout(instance.lobbyTimer);
    startGame(instance);
    
    res.json({ success: true, phase: instance.phase });
  });
  
  app.post('/debug/game/skip-phase', (req, res) => {
    const { instanceId, targetPhase } = req.body;
    const instance = instances.get(instanceId);
    
    if (!instance) {
      return res.status(404).json({ error: 'Instance not found' });
    }
    
    // Timer abbrechen und Phase wechseln
    clearAllTimers(instance);
    
    switch (targetPhase) {
      case 'voting':
        startVoting(instance);
        break;
      case 'finale':
        startFinale(instance);
        break;
      case 'results':
        showResults(instance);
        break;
    }
    
    res.json({ success: true, phase: instance.phase });
  });
  
  // Timer-Geschwindigkeit
  let timerMultiplier = 1;
  
  app.post('/debug/timer/speed', (req, res) => {
    timerMultiplier = req.body.speed || 1;
    res.json({ success: true, speed: timerMultiplier });
  });
  
  // Debug-Info
  app.get('/debug/info', (req, res) => {
    res.json({
      instances: [...instances.values()].map(i => ({
        id: i.id,
        type: i.type,
        phase: i.phase,
        players: i.players.size,
        bots: [...i.players.values()].filter(p => 
          p.user.displayName.startsWith(DEBUG_CONFIG.botPrefix)
        ).length,
        submissions: i.submissions.length
      })),
      memory: process.memoryUsage(),
      uptime: process.uptime()
    });
  });
}
```

### Automatische Tests

```typescript
// tests/voting.test.ts
import { describe, it, expect, beforeEach } from 'vitest';

describe('Voting System', () => {
  let instance: Instance;
  let state: VotingState;
  let botController: BotController;
  
  beforeEach(() => {
    instance = createTestInstance();
    botController = new BotController(instance);
    botController.addBots(20, 'fast');
    
    // Simuliere Zeichenphase
    for (const [id, player] of instance.players) {
      instance.submissions.push({
        playerId: id,
        pixels: generateRandomPixels(),
        timestamp: Date.now()
      });
    }
    
    state = initializeVotingState(instance.submissions);
  });
  
  it('should assign each image roughly equal times', () => {
    // 5 Runden durchlaufen
    for (let round = 1; round <= 5; round++) {
      prepareVotingRound(instance, state, round);
    }
    
    const fairness = validateFairness(state);
    expect(fairness.variance).toBeLessThanOrEqual(2);
  });
  
  it('should never show voter their own image', () => {
    const assignments = prepareVotingRound(instance, state, 1);
    
    for (const assignment of assignments) {
      expect(assignment.imageA).not.toBe(assignment.voterId);
      expect(assignment.imageB).not.toBe(assignment.voterId);
    }
  });
  
  it('should not show same image twice to same voter', () => {
    const seenByVoter = new Map<string, Set<string>>();
    
    for (let round = 1; round <= 5; round++) {
      const assignments = prepareVotingRound(instance, state, round);
      
      for (const assignment of assignments) {
        const seen = seenByVoter.get(assignment.voterId) || new Set();
        
        expect(seen.has(assignment.imageA)).toBe(false);
        expect(seen.has(assignment.imageB)).toBe(false);
        
        seen.add(assignment.imageA);
        seen.add(assignment.imageB);
        seenByVoter.set(assignment.voterId, seen);
      }
    }
  });
  
  it('should update Elo correctly after vote', () => {
    const assignments = prepareVotingRound(instance, state, 1);
    const assignment = assignments[0];
    
    const eloBefore = {
      a: state.eloRatings.get(assignment.imageA)!,
      b: state.eloRatings.get(assignment.imageB)!
    };
    
    processVote(instance, state, assignment.voterId, assignment.imageA, assignment);
    
    const eloAfter = {
      a: state.eloRatings.get(assignment.imageA)!,
      b: state.eloRatings.get(assignment.imageB)!
    };
    
    // Gewinner sollte Punkte gewonnen haben
    expect(eloAfter.a).toBeGreaterThan(eloBefore.a);
    // Verlierer sollte Punkte verloren haben
    expect(eloAfter.b).toBeLessThan(eloBefore.b);
    // Nullsumme
    expect(eloAfter.a - eloBefore.a).toBe(eloBefore.b - eloAfter.b);
  });
  
  it('should handle disconnects gracefully', () => {
    const assignments = prepareVotingRound(instance, state, 1);
    const initialSubmissions = instance.submissions.length;
    
    // Spieler disconnected
    const disconnectedId = [...instance.players.keys()][0];
    handlePlayerDisconnectDuringVoting(instance, state, disconnectedId);
    
    // Bild sollte noch da sein
    expect(instance.submissions.length).toBe(initialSubmissions);
    
    // Aber Spieler sollte weg sein
    expect(instance.players.has(disconnectedId)).toBe(false);
  });
});

describe('Timeout Handling', () => {
  it('should end round after 5 seconds regardless of votes', async () => {
    const instance = createTestInstance();
    const state = initializeVotingState(instance.submissions);
    
    const startTime = Date.now();
    
    await new Promise<void>((resolve) => {
      startVotingRound(instance, state, 1);
      
      // Round should end automatically
      instance.on('round-ended', () => {
        const elapsed = Date.now() - startTime;
        expect(elapsed).toBeGreaterThanOrEqual(5000);
        expect(elapsed).toBeLessThan(5500);
        resolve();
      });
    });
  });
  
  it('should end round early if all votes received', async () => {
    const instance = createTestInstance();
    const botController = new BotController(instance);
    botController.addBots(10, 'fast');  // Fast bots vote immediately
    
    const state = initializeVotingState(instance.submissions);
    
    const startTime = Date.now();
    
    await new Promise<void>((resolve) => {
      startVotingRound(instance, state, 1);
      
      instance.on('round-ended', () => {
        const elapsed = Date.now() - startTime;
        // Should end much faster than 5 seconds
        expect(elapsed).toBeLessThan(1000);
        resolve();
      });
    });
  });
});
```

### Schnellstart zum Testen

```bash
# Terminal 1: Server starten
cd apps/server
npm run dev

# Terminal 2: Client starten
cd apps/web
npm run dev

# Browser öffnen: http://localhost:5173

# Debug-Panel erscheint unten rechts (nur in Development)
# → "Add 20 Bots" klicken
# → "Force Start" klicken
# → Spiel beobachten
```

### Test-Szenarien

| Szenario | Bots | Behavior | Was testen? |
|----------|------|----------|-------------|
| Normal Game | 20 | normal | Grundfunktion |
| Stress Test | 100 | fast | Performance |
| Late Voters | 20 | slow | Timeout-Handling |
| Mass Disconnect | 30 | disconnector | Reconnect-Logic |
| AFK Players | 10 | afk | Fairness ohne Votes |
| Mixed | 10 each | mixed | Realistisches Szenario |

---

## Entscheidungen

### Alle Fragen beantwortet ✅

| Frage | Entscheidung |
|-------|--------------|
| **Spielstart** | |
| Minimale Spieleranzahl? | 5 Spieler |
| Wann startet der Countdown? | Erst wenn 5 Spieler erreicht sind |
| Wann startet eine Runde? | Nach 45s (ab 5 Spielern) ODER sofort bei 100 Spielern |
| Private Räume Start? | Host startet manuell (min. 5 Spieler) |
| **Zeichnen** | |
| Timer Zeichnen? | 60 Sekunden |
| AFK/Leere Submissions? | Min. 5 Pixel müssen gesetzt sein |
| **Voting** | |
| Voting-System? | Elo-Rating mit 1v1 Duellen |
| Timer pro Voting-Runde? | 5 Sekunden |
| Eigenes Bild im Voting sehen? | Nein |
| Vote-Fairness? | Jedes Bild wird ±1 gleich oft gezeigt |
| Skip-Option beim Voting? | Nein |
| Tie-Breaking? | Finale-Votes → Elo → Submission-Zeit |
| **Spieler-Management** | |
| Während Runde joinen? | Nur als Zuschauer |
| Spectator Mode für Eliminierte? | Ja, auto-rejoin nächste Runde |
| Disconnect während Zeichnen? | Rausfliegen nach 15s Grace Period |
| Disconnect während Voting? | Bild bleibt im Voting, kann gewinnen |
| Username-System? | Name#0000 Format mit zufälligem Discriminator |
| Spieler-Stats? | LocalStorage (persistent) + WebSocket (live) |
| **UI/UX** | |
| Mobile oder Desktop First? | Mobile First |
| Dark/Light Mode? | Toggle, User-Präferenz in LocalStorage |
| Sound-Effekte? | Nicht in v1, später geplant |
| Mehrsprachigkeit? | Nur Englisch |
| Galerie am Ende? | Alle Submissions, scrollbar, bis nächste Runde |
| **Technisch** | |
| Datenbank? | Keine – bewusst für 100% Open Source |
| Datenkompression? | LZ-String, dynamisch ab 50 Spielern |
| RAM-Management? | Auto-Detection + Cleanup alle 60s |
| Server-Limit erreicht? | Queue-System mit Position & ETA |
| Multi-Server? | v1 Single Server, später Redis möglich |
| **Sicherheit** | |
| Input Validation? | Server-seitig für alle Felder |
| Rate Limiting? | Per Event-Typ + IP, Flood Detection |
| Anti-Cheat? | Server-autoritativ, alle Logik serverseitig |
| DoS Protection? | Connection Limits, Payload Limits |
| Passwort für private Räume? | Optional (SHA256 + Salt) |
| **Entwicklung** | |
| Debug/Test-System? | Bot-Simulation im Development-Modus |
| **Edge Cases** | |
| Alle Spieler AFK? | Countdown, dann alle zum Startscreen |
| Zu wenige Spieler (< 3)? | Runde abbrechen mit Hinweis |
| Host verlässt privaten Raum? | Aktuelle Runde zu Ende, dann Raum schließen |
| Tab wechseln/minimieren? | Verbindung bleibt, Timer läuft weiter |
| **Browser & Device** | |
| Unterstützte Browser? | Chrome, Firefox, Safari, Edge (90+) |
| PWA? | Ja, installierbar |
| Orientation? | Nur Hochformat (Portrait) |
| **Rechtliches** | |
| Cookie Notice? | Ja, für IP/Session-Daten |
| **Monetarisierung (Später)** | |
| Grundprinzip? | Kostenlos spielbar, optionale Cosmetics |
| Accounts nötig? | Nein, Lizenzcode-System |
| Datenbank nötig? | Nein, Codes sind selbst-verifizierend |
