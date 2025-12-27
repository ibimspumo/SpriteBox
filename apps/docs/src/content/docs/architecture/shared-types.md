---
title: Shared Types Package
description: "@spritebox/types - Centralized TypeScript types and Zod validation schemas"
---

## Overview

The `@spritebox/types` package provides a **single source of truth** for TypeScript types and Zod validation schemas shared between the server and client applications.

```
packages/types/
├── src/
│   ├── index.ts          # Main barrel export
│   ├── user.ts           # User & Player types
│   ├── game.ts           # Core game types (Instance, Submission, etc.)
│   ├── phase.ts          # Phase state types for session restoration
│   ├── prompt.ts         # Prompt types with localization indices
│   ├── socket.ts         # Socket.io event types (Server↔Client)
│   ├── constants.ts      # Game constants (CANVAS, PALETTE, limits)
│   ├── validation.ts     # Zod schemas for input validation
│   └── modes/            # Game mode-specific types
│       ├── copycat.ts
│       ├── copycatRoyale.ts
│       ├── pixelGuesser.ts
│       └── zombiePixel.ts
└── package.json
```

## Usage

### Installation

The package is automatically available in the monorepo:

```typescript
// In apps/server or apps/web
import type { User, GamePhase, Submission } from '@spritebox/types';
import { PixelSchema, validateMinPixels } from '@spritebox/types';
```

### Type Categories

#### User Types

```typescript
interface User {
  displayName: string;      // Max 32 chars
  discriminator: string;    // 4-digit "0000"-"9999"
  fullName: string;         // "Name#0000"
}

interface Player extends User {
  id: string;               // Socket ID
  isBot?: boolean;
}
```

#### Game Types

```typescript
type InstanceType = 'public' | 'private';

type GamePhase =
  | 'idle' | 'lobby' | 'countdown'
  | 'drawing' | 'voting' | 'finale' | 'results'
  // CopyCat phases
  | 'memorize' | 'copycat-result' | 'copycat-rematch'
  // PixelGuesser phases
  | 'guessing' | 'reveal' | 'pixelguesser-results'
  // ZombiePixel phases
  | 'active'
  // CopyCat Royale phases
  | 'royale-initial-drawing' | 'royale-show-reference'
  | 'royale-drawing' | 'royale-results' | 'royale-winner';

interface Submission {
  playerId: string;
  pixels: string;           // 64-char hex string
  timestamp: number;
}
```

#### Socket Event Types

Fully typed Socket.io events for type-safe communication:

```typescript
interface ServerToClientEvents {
  connected: (data: { user: User; sessionId: string }) => void;
  'lobby-joined': (data: LobbyJoinedData) => void;
  'phase-changed': (data: PhaseChangedData) => void;
  'voting-round': (data: VotingRoundData) => void;
  'game-results': (data: GameResultsData) => void;
  // ... 40+ events
}

interface ClientToServerEvents {
  'join-public': (gameMode: string) => void;
  'join-private': (code: string, password?: string) => void;
  'submit-drawing': (pixels: string) => void;
  'submit-vote': (chosenId: string) => void;
  // ... 20+ events
}
```

## Validation Schemas

Zod schemas validate all client inputs:

```typescript
import { PixelSchema, validateMinPixels } from '@spritebox/types';

// Pixel art validation
const result = PixelSchema.safeParse(userInput);
if (!result.success) {
  // Handle validation error
}

// Anti-AFK check (minimum 5 non-background pixels)
const { valid, setPixels } = validateMinPixels(pixels);
```

### Available Schemas

| Schema | Purpose |
|--------|---------|
| `PixelSchema` | 64-char hex string, uppercase |
| `RoomCodeSchema` | 4-char alphanumeric code |
| `UsernameSchema` | 1-20 chars, alphanumeric + spaces |
| `VoteSchema` | Player ID string |
| `ZombieMoveSchema` | Direction: up/down/left/right |

## Game Mode Types

Each game mode has dedicated type definitions:

### CopyCat Mode

```typescript
interface CopyCatState {
  referenceImage: string;
  playerResults: CopyCatPlayerResult[];
  winner?: CopyCatResultEntry;
  isDraw: boolean;
}
```

### CopyCat Royale Mode

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

### ZombiePixel Mode

```typescript
interface ZombieGameStateData {
  players: ZombiePixelPlayerData[];
  timeRemaining: number;
  items: ZombieItemData[];
  zombieSpeedBoostActive: boolean;
  zombieSpeedBoostRemaining: number;
}
```

## Constants

Game constants are also exported:

```typescript
import { CANVAS, PALETTE, MAX_PLAYERS_PER_INSTANCE } from '@spritebox/types';

CANVAS.SIZE          // 8 (8x8 grid)
CANVAS.TOTAL_PIXELS  // 64
PALETTE.BACKGROUND   // 1 (light gray background)
PALETTE.COLORS       // 16-color array
MAX_PLAYERS_PER_INSTANCE  // 100
```

## Architecture Benefits

### Type Safety Across Boundaries

```typescript
// Server: Emit typed event
io.to(room).emit('phase-changed', {
  phase: 'drawing',           // ✓ Type-checked
  promptIndices: { ... }
} satisfies PhaseChangedData);

// Client: Receive typed event
socket.on('phase-changed', (data: PhaseChangedData) => {
  game.update(g => ({ ...g, phase: data.phase }));
});
```

### Single Source of Truth

- Types defined once, used everywhere
- No drift between client and server types
- Refactoring propagates automatically
- IDE autocomplete works across packages

### Validation at Boundaries

```typescript
// Server validates all client input
socket.on('submit-drawing', (pixels: unknown) => {
  const result = PixelSchema.safeParse(pixels);
  if (!result.success) {
    socket.emit('error', { message: 'Invalid pixel data' });
    return;
  }
  // result.data is now typed as string
});
```

## Adding New Types

1. **Create type file** in `packages/types/src/`
2. **Export from index.ts**
3. **Run build**: `pnpm --filter @spritebox/types build`
4. **Use in apps**: Import from `@spritebox/types`

For game mode types:

1. Create file in `packages/types/src/modes/`
2. Export from `modes/index.ts`
3. Re-export from main `index.ts`
