---
title: Shared Types Package
description: "@spritebox/types - Zentralisierte TypeScript-Typen und Zod-Validierungsschemas"
---

## Überblick

Das `@spritebox/types` Package bietet eine **Single Source of Truth** für TypeScript-Typen und Zod-Validierungsschemas, die zwischen Server und Client geteilt werden.

```
packages/types/
├── src/
│   ├── index.ts          # Haupt-Barrel-Export
│   ├── user.ts           # User & Player Typen
│   ├── game.ts           # Kern-Spieltypen (Instance, Submission, etc.)
│   ├── phase.ts          # Phasen-Zustandstypen für Session-Wiederherstellung
│   ├── prompt.ts         # Prompt-Typen mit Lokalisierungs-Indizes
│   ├── socket.ts         # Socket.io Event-Typen (Server↔Client)
│   ├── constants.ts      # Spielkonstanten (CANVAS, PALETTE, Limits)
│   ├── validation.ts     # Zod-Schemas für Input-Validierung
│   └── modes/            # Spielmodus-spezifische Typen
│       ├── copycat.ts
│       ├── copycatRoyale.ts
│       ├── pixelGuesser.ts
│       └── zombiePixel.ts
└── package.json
```

## Verwendung

### Installation

Das Package ist automatisch im Monorepo verfügbar:

```typescript
// In apps/server oder apps/web
import type { User, GamePhase, Submission } from '@spritebox/types';
import { PixelSchema, validateMinPixels } from '@spritebox/types';
```

### Typ-Kategorien

#### User-Typen

```typescript
interface User {
  displayName: string;      // Max 32 Zeichen
  discriminator: string;    // 4-stellig "0000"-"9999"
  fullName: string;         // "Name#0000"
}

interface Player extends User {
  id: string;               // Socket ID
  isBot?: boolean;
}
```

#### Spiel-Typen

```typescript
type InstanceType = 'public' | 'private';

type GamePhase =
  | 'idle' | 'lobby' | 'countdown'
  | 'drawing' | 'voting' | 'finale' | 'results'
  // CopyCat Phasen
  | 'memorize' | 'copycat-result' | 'copycat-rematch'
  // PixelGuesser Phasen
  | 'guessing' | 'reveal' | 'pixelguesser-results'
  // ZombiePixel Phasen
  | 'active'
  // CopyCat Royale Phasen
  | 'royale-initial-drawing' | 'royale-show-reference'
  | 'royale-drawing' | 'royale-results' | 'royale-winner';

interface Submission {
  playerId: string;
  pixels: string;           // 64-Zeichen Hex-String
  timestamp: number;
}
```

#### Socket Event-Typen

Vollständig typisierte Socket.io Events für typsichere Kommunikation:

```typescript
interface ServerToClientEvents {
  connected: (data: { user: User; sessionId: string }) => void;
  'lobby-joined': (data: LobbyJoinedData) => void;
  'phase-changed': (data: PhaseChangedData) => void;
  'voting-round': (data: VotingRoundData) => void;
  'game-results': (data: GameResultsData) => void;
  // ... 40+ Events
}

interface ClientToServerEvents {
  'join-public': (gameMode: string) => void;
  'join-private': (code: string, password?: string) => void;
  'submit-drawing': (pixels: string) => void;
  'submit-vote': (chosenId: string) => void;
  // ... 20+ Events
}
```

## Validierungsschemas

Zod-Schemas validieren alle Client-Eingaben:

```typescript
import { PixelSchema, validateMinPixels } from '@spritebox/types';

// Pixel-Art Validierung
const result = PixelSchema.safeParse(userInput);
if (!result.success) {
  // Validierungsfehler behandeln
}

// Anti-AFK Check (mindestens 5 nicht-Hintergrund Pixel)
const { valid, setPixels } = validateMinPixels(pixels);
```

### Verfügbare Schemas

| Schema | Zweck |
|--------|-------|
| `PixelSchema` | 64-Zeichen Hex-String, Großbuchstaben |
| `RoomCodeSchema` | 4-Zeichen alphanumerischer Code |
| `UsernameSchema` | 1-20 Zeichen, alphanumerisch + Leerzeichen |
| `VoteSchema` | Spieler-ID String |
| `ZombieMoveSchema` | Richtung: up/down/left/right |

## Spielmodus-Typen

Jeder Spielmodus hat dedizierte Typdefinitionen:

### CopyCat Modus

```typescript
interface CopyCatState {
  referenceImage: string;
  playerResults: CopyCatPlayerResult[];
  winner?: CopyCatResultEntry;
  isDraw: boolean;
}
```

### CopyCat Royale Modus

```typescript
interface CopyCatRoyaleState {
  currentRound: number;
  totalRounds: number;
  remainingPlayers: number;
  eliminationThreshold: number;
  currentReference?: string;
  imageCreator?: string;
  isEliminated: boolean;
  myFinalRank?: number;
  lastRoundResults: RoyalePlayerRoundResult[];
  eliminatedThisRound: string[];
  winner?: User;
  winnerPixels?: string;
  winningAccuracy?: number;
  finalRankings: RoyaleFinalRanking[];
}
```

### ZombiePixel Modus

```typescript
interface ZombieGameStateData {
  players: ZombiePixelPlayerData[];
  timeRemaining: number;
  items: ZombieItemData[];
  zombieSpeedBoostActive: boolean;
  zombieSpeedBoostRemaining: number;
}
```

## Konstanten

Spielkonstanten werden ebenfalls exportiert:

```typescript
import { CANVAS, PALETTE, MAX_PLAYERS_PER_INSTANCE } from '@spritebox/types';

CANVAS.SIZE          // 8 (8x8 Raster)
CANVAS.TOTAL_PIXELS  // 64
PALETTE.BACKGROUND   // 1 (hellgrauer Hintergrund)
PALETTE.COLORS       // 16-Farben Array
MAX_PLAYERS_PER_INSTANCE  // 100
```

## Architektur-Vorteile

### Typsicherheit über Grenzen hinweg

```typescript
// Server: Typisiertes Event senden
io.to(room).emit('phase-changed', {
  phase: 'drawing',           // ✓ Typ-geprüft
  promptIndices: { ... }
} satisfies PhaseChangedData);

// Client: Typisiertes Event empfangen
socket.on('phase-changed', (data: PhaseChangedData) => {
  game.update(g => ({ ...g, phase: data.phase }));
});
```

### Single Source of Truth

- Typen einmal definiert, überall verwendet
- Kein Drift zwischen Client- und Server-Typen
- Refactoring propagiert automatisch
- IDE-Autocomplete funktioniert paketübergreifend

### Validierung an Grenzen

```typescript
// Server validiert alle Client-Eingaben
socket.on('submit-drawing', (pixels: unknown) => {
  const result = PixelSchema.safeParse(pixels);
  if (!result.success) {
    socket.emit('error', { message: 'Ungültige Pixeldaten' });
    return;
  }
  // result.data ist jetzt als string typisiert
});
```

## Neue Typen hinzufügen

1. **Typ-Datei erstellen** in `packages/types/src/`
2. **Aus index.ts exportieren**
3. **Build ausführen**: `pnpm --filter @spritebox/types build`
4. **In Apps verwenden**: Import von `@spritebox/types`

Für Spielmodus-Typen:

1. Datei in `packages/types/src/modes/` erstellen
2. Aus `modes/index.ts` exportieren
3. Aus Haupt-`index.ts` re-exportieren
