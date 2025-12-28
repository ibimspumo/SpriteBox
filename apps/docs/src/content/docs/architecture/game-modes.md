---
title: Game Modes Architecture
description: How game modes work - metadata, phases, and adding new modes
---

## Overview

SpriteBox supports multiple game modes, each with unique phases, rules, and UI components. The architecture uses a **registry pattern** for extensibility.

## Available Game Modes

| Mode | ID | Icon | Status | Description |
|------|----|------|--------|-------------|
| **Pixel Battle** | `pixel-battle` | ⚔️ | Stable | Classic mode: draw, vote, compete |
| **CopyCat** | `copy-cat` | 🎭 | Stable | 1v1 memory challenge |
| **CopyCat Solo** | `copy-cat-solo` | 🎯 | Stable | Single-player practice |
| **Pixel Guesser** | `pixel-guesser` | 🔮 | Stable | Pictionary-style guessing |
| **Pixel Survivor** | `pixel-survivor` | 💀 | Alpha | Roguelike single-player |
| **Zombie Pixel** | `zombie-pixel` | 🧟 | Alpha | Real-time infection game |
| **CopyCat Royale** | `copycat-royale` | 👑 | Alpha | Battle royale elimination |
| **Colordle** | `colordle` | 🎨 | Stable | Daily puzzle game |
| **Idle Pixel** | `idle-pixel` | 💎 | Alpha | Single-player idle game |

## Mode Metadata Registry

All game mode metadata is centralized in `modeMetadata.ts`:

```typescript
// apps/web/src/lib/modeMetadata.ts

interface ModeMetadata {
  id: GameModeId;           // Unique identifier
  icon: string;             // Display emoji
  accentColor: string;      // CSS variable or hex
  selectionKey: string;     // i18n key for mode selection
  legacyI18nKey: string;    // Legacy translation key
  isAlpha: boolean;         // Experimental flag
  slug: string;             // URL routing slug
}

export const GAME_MODE_METADATA: Record<GameModeId, ModeMetadata> = {
  'pixel-battle': {
    id: 'pixel-battle',
    icon: '⚔️',
    accentColor: 'var(--color-success)',
    selectionKey: 'classic',
    legacyI18nKey: 'gameModes.pixelBattle',
    isAlpha: false,
    slug: 'classic',
  },
  // ... other modes
};
```

### Helper Functions

```typescript
import {
  getModeMetadata,
  getModeIcon,
  getModeAccentColor,
  isModeAlpha,
  isValidModeId,
} from '$lib/modeMetadata';

// Get full metadata
const metadata = getModeMetadata('pixel-battle');

// Get specific properties
const icon = getModeIcon('zombie-pixel');     // '🧟'
const color = getModeAccentColor('copycat-royale'); // '#f59e0b'
const alpha = isModeAlpha('pixel-survivor');  // true

// Type guard
if (isValidModeId(userInput)) {
  // userInput is now typed as GameModeId
}
```

## Phase Router System

The Phase Router maps game phases to Svelte components declaratively:

```typescript
// apps/web/src/lib/phaseRouter.ts

const PHASE_COMPONENTS: Record<GamePhase, Component> = {
  // Standard phases
  idle: Lobby,
  lobby: Lobby,
  countdown: Countdown,
  drawing: Drawing,
  voting: Voting,
  finale: Finale,
  results: Results,

  // CopyCat phases
  memorize: Memorize,
  'copycat-result': CopyCatResult,
  'copycat-rematch': CopyCatRematch,

  // PixelGuesser phases
  guessing: Guessing,
  reveal: Reveal,
  'pixelguesser-results': FinalResults,

  // ZombiePixel (container handles internal routing)
  active: ZombiePixelGame,

  // CopyCatRoyale (container handles internal routing)
  'royale-initial-drawing': CopyCatRoyaleGame,
  'royale-show-reference': CopyCatRoyaleGame,
  'royale-drawing': CopyCatRoyaleGame,
  'royale-results': CopyCatRoyaleGame,
  'royale-winner': CopyCatRoyaleGame,
};

// Usage in route component
const PhaseComponent = getPhaseComponent($game.phase, $lobby.gameMode);
```

### Container Components

Complex modes like ZombiePixel and CopyCatRoyale use a **container pattern**:

```svelte
<!-- CopyCatRoyale/index.svelte -->
<script>
  import { game } from '$lib/stores';

  // Container routes internally based on phase
  let phase = $derived($game.phase);
</script>

{#if phase === 'royale-initial-drawing'}
  <RoyaleInitialDrawing />
{:else if phase === 'royale-show-reference'}
  <RoyaleShowReference {royaleState} />
{:else if phase === 'royale-drawing'}
  <RoyaleDrawing {royaleState} />
{:else if phase === 'royale-results'}
  <RoyaleResults {royaleState} />
{:else if phase === 'royale-winner'}
  <RoyaleWinner {royaleState} />
{/if}
```

## Mode-Specific Stores

Each mode has dedicated state in the Svelte stores:

```typescript
// apps/web/src/lib/stores.ts

// CopyCat state
export interface CopyCatState {
  referenceImage: string | null;
  playerResults: CopyCatResultEntry[];
  winner: CopyCatResultEntry | null;
  isDraw: boolean;
}

// CopyCat Royale state
export interface CopyCatRoyaleState {
  currentRound: number;
  totalRounds: number;
  remainingPlayers: number;
  eliminationThreshold: number;
  currentReference?: string;
  isEliminated: boolean;
  lastRoundResults: RoyalePlayerRoundResult[];
  winner?: User;
  finalRankings: RoyaleFinalRanking[];
}

// ZombiePixel state (separate store)
export const zombiePixel = writable<ZombiePixelState | null>(null);
```

## Server-Side Mode Registration

On the server, modes are registered via a strategy pattern:

```typescript
// apps/server/src/gameModes/registry.ts

interface GameModeHandler {
  id: string;
  minPlayers: number;
  maxPlayers: number;
  phases: GamePhase[];
  onPhaseStart: (instance: Instance, phase: GamePhase) => void;
  onPhaseEnd: (instance: Instance, phase: GamePhase) => void;
}

const gameModeRegistry = new Map<string, GameModeHandler>();

// Register a mode
gameModeRegistry.set('zombie-pixel', {
  id: 'zombie-pixel',
  minPlayers: 3,
  maxPlayers: 20,
  phases: ['lobby', 'countdown', 'active', 'results'],
  onPhaseStart: (instance, phase) => { /* ... */ },
  onPhaseEnd: (instance, phase) => { /* ... */ },
});
```

## Adding a New Game Mode

### 1. Define Types

Create `packages/types/src/modes/newMode.ts`:

```typescript
export interface NewModeState {
  // Mode-specific state
}

export interface NewModeEventData {
  // Socket event payloads
}
```

Export from `packages/types/src/index.ts`.

### 2. Add Metadata

In `apps/web/src/lib/modeMetadata.ts`:

```typescript
export type GameModeId = /* ... */ | 'new-mode';

GAME_MODE_METADATA['new-mode'] = {
  id: 'new-mode',
  icon: '🆕',
  accentColor: 'var(--color-accent)',
  selectionKey: 'newmode',
  legacyI18nKey: 'gameModes.newMode',
  isAlpha: true,
  slug: 'new-mode',
};
```

### 3. Create Components

Create `apps/web/src/lib/components/features/NewMode/`:

```
NewMode/
├── index.svelte      # Container component
├── index.ts          # Barrel export
├── PhaseOne.svelte
└── PhaseTwo.svelte
```

### 4. Register Phases

In `apps/web/src/lib/phaseRouter.ts`:

```typescript
import NewModeGame from '$lib/components/features/NewMode/index.svelte';

const PHASE_COMPONENTS = {
  // ...
  'newmode-phase-one': NewModeGame,
  'newmode-phase-two': NewModeGame,
};
```

### 5. Add i18n

In both `en.ts` and `de.ts`:

```typescript
newMode: {
  title: 'New Mode',
  description: 'A new way to play!',
  // ...
},
```

### 6. Server Handler

Create `apps/server/src/gameModes/newMode/`:

```
newMode/
├── index.ts          # Mode registration
├── types.ts          # Server-specific types
└── handlers.ts       # Socket event handlers
```

## Mode-Specific Features

### ZombiePixel

Real-time game with canvas rendering:

- **Game Loop**: 60fps server tick rate
- **Grid System**: 32x32 world grid with viewport
- **Items**: Power-ups, healing, speed boosts
- **Roles**: Zombies vs Survivors

### CopyCat Royale

Battle royale elimination:

- **Pool System**: Uses player art as references
- **Elimination**: Below-threshold accuracy = out
- **Scaling**: Dynamic threshold based on player count
- **Ranking**: Final standings based on survival round

### Pixel Survivor

Single-player roguelike:

- **Local State**: Uses `localStorage` for persistence
- **Combat System**: Turn-based with dice rolls
- **Progression**: XP, levels, stat upgrades
- **Monsters**: Generated with procedural patterns

### Idle Pixel

Single-player idle/incremental game:

- **Local State**: Uses `localStorage` for save data
- **Grid System**: 8x8 merge grid for combining pixels
- **Upgrade System**: Production, economy, clicker, and grid upgrades
- **Prestige System**: Reset for Prisma Pixels meta-currency
- **Offline Progress**: Earns resources while away (50% efficiency)
