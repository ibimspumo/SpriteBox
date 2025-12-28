---
title: Spielmodus-Architektur
description: Wie Spielmodi funktionieren - Metadaten, Phasen und neue Modi hinzufügen
---

## Überblick

SpriteBox unterstützt mehrere Spielmodi, jeder mit einzigartigen Phasen, Regeln und UI-Komponenten. Die Architektur verwendet ein **Registry-Pattern** für Erweiterbarkeit.

## Verfügbare Spielmodi

| Modus | ID | Icon | Status | Beschreibung |
|-------|----|------|--------|--------------|
| **Pixel Battle** | `pixel-battle` | ⚔️ | Stabil | Klassisch: Zeichnen, Abstimmen, Wettkampf |
| **CopyCat** | `copy-cat` | 🎭 | Stabil | 1v1 Gedächtnis-Herausforderung |
| **CopyCat Solo** | `copy-cat-solo` | 🎯 | Stabil | Einzelspieler-Training |
| **Pixel Guesser** | `pixel-guesser` | 🔮 | Stabil | Pictionary-artiges Raten |
| **Pixel Survivor** | `pixel-survivor` | 💀 | Alpha | Roguelike Einzelspieler |
| **Zombie Pixel** | `zombie-pixel` | 🧟 | Alpha | Echtzeit-Infektionsspiel |
| **CopyCat Royale** | `copycat-royale` | 👑 | Alpha | Battle Royale Elimination |
| **Colordle** | `colordle` | 🎨 | Stabil | Tägliches Puzzle-Spiel |
| **Idle Pixel** | `idle-pixel` | 💎 | Alpha | Einzelspieler Idle-Spiel |

## Modus-Metadaten-Registry

Alle Spielmodus-Metadaten sind in `modeMetadata.ts` zentralisiert:

```typescript
// apps/web/src/lib/modeMetadata.ts

interface ModeMetadata {
  id: GameModeId;           // Eindeutige Kennung
  icon: string;             // Anzeige-Emoji
  accentColor: string;      // CSS-Variable oder Hex
  selectionKey: string;     // i18n-Key für Modus-Auswahl
  legacyI18nKey: string;    // Legacy-Übersetzungskey
  isAlpha: boolean;         // Experimentell-Flag
  slug: string;             // URL-Routing-Slug
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
  // ... weitere Modi
};
```

### Hilfsfunktionen

```typescript
import {
  getModeMetadata,
  getModeIcon,
  getModeAccentColor,
  isModeAlpha,
  isValidModeId,
} from '$lib/modeMetadata';

// Vollständige Metadaten abrufen
const metadata = getModeMetadata('pixel-battle');

// Spezifische Eigenschaften abrufen
const icon = getModeIcon('zombie-pixel');     // '🧟'
const color = getModeAccentColor('copycat-royale'); // '#f59e0b'
const alpha = isModeAlpha('pixel-survivor');  // true

// Type Guard
if (isValidModeId(userInput)) {
  // userInput ist jetzt als GameModeId typisiert
}
```

## Phase-Router-System

Der Phase Router mappt Spielphasen deklarativ auf Svelte-Komponenten:

```typescript
// apps/web/src/lib/phaseRouter.ts

const PHASE_COMPONENTS: Record<GamePhase, Component> = {
  // Standard-Phasen
  idle: Lobby,
  lobby: Lobby,
  countdown: Countdown,
  drawing: Drawing,
  voting: Voting,
  finale: Finale,
  results: Results,

  // CopyCat Phasen
  memorize: Memorize,
  'copycat-result': CopyCatResult,
  'copycat-rematch': CopyCatRematch,

  // PixelGuesser Phasen
  guessing: Guessing,
  reveal: Reveal,
  'pixelguesser-results': FinalResults,

  // ZombiePixel (Container handhabt internes Routing)
  active: ZombiePixelGame,

  // CopyCatRoyale (Container handhabt internes Routing)
  'royale-initial-drawing': CopyCatRoyaleGame,
  'royale-show-reference': CopyCatRoyaleGame,
  'royale-drawing': CopyCatRoyaleGame,
  'royale-results': CopyCatRoyaleGame,
  'royale-winner': CopyCatRoyaleGame,
};

// Verwendung in Route-Komponente
const PhaseComponent = getPhaseComponent($game.phase, $lobby.gameMode);
```

### Container-Komponenten

Komplexe Modi wie ZombiePixel und CopyCatRoyale verwenden ein **Container-Pattern**:

```svelte
<!-- CopyCatRoyale/index.svelte -->
<script>
  import { game } from '$lib/stores';

  // Container routet intern basierend auf Phase
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

## Modus-spezifische Stores

Jeder Modus hat dedizierten Zustand in den Svelte Stores:

```typescript
// apps/web/src/lib/stores.ts

// CopyCat Zustand
export interface CopyCatState {
  referenceImage: string | null;
  playerResults: CopyCatResultEntry[];
  winner: CopyCatResultEntry | null;
  isDraw: boolean;
}

// CopyCat Royale Zustand
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

// ZombiePixel Zustand (separater Store)
export const zombiePixel = writable<ZombiePixelState | null>(null);
```

## Server-seitige Modus-Registrierung

Auf dem Server werden Modi via Strategy-Pattern registriert:

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

// Modus registrieren
gameModeRegistry.set('zombie-pixel', {
  id: 'zombie-pixel',
  minPlayers: 3,
  maxPlayers: 20,
  phases: ['lobby', 'countdown', 'active', 'results'],
  onPhaseStart: (instance, phase) => { /* ... */ },
  onPhaseEnd: (instance, phase) => { /* ... */ },
});
```

## Neuen Spielmodus hinzufügen

### 1. Typen definieren

Erstelle `packages/types/src/modes/newMode.ts`:

```typescript
export interface NewModeState {
  // Modus-spezifischer Zustand
}

export interface NewModeEventData {
  // Socket-Event Payloads
}
```

Aus `packages/types/src/index.ts` exportieren.

### 2. Metadaten hinzufügen

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

### 3. Komponenten erstellen

Erstelle `apps/web/src/lib/components/features/NewMode/`:

```
NewMode/
├── index.svelte      # Container-Komponente
├── index.ts          # Barrel Export
├── PhaseOne.svelte
└── PhaseTwo.svelte
```

### 4. Phasen registrieren

In `apps/web/src/lib/phaseRouter.ts`:

```typescript
import NewModeGame from '$lib/components/features/NewMode/index.svelte';

const PHASE_COMPONENTS = {
  // ...
  'newmode-phase-one': NewModeGame,
  'newmode-phase-two': NewModeGame,
};
```

### 5. i18n hinzufügen

In `en.ts` und `de.ts`:

```typescript
newMode: {
  title: 'Neuer Modus',
  description: 'Eine neue Art zu spielen!',
  // ...
},
```

### 6. Server Handler

Erstelle `apps/server/src/gameModes/newMode/`:

```
newMode/
├── index.ts          # Modus-Registrierung
├── types.ts          # Server-spezifische Typen
└── handlers.ts       # Socket-Event Handler
```

## Modus-spezifische Features

### ZombiePixel

Echtzeit-Spiel mit Canvas-Rendering:

- **Game Loop**: 60fps Server-Tick-Rate
- **Grid-System**: 32x32 Welt-Raster mit Viewport
- **Items**: Power-ups, Heilung, Geschwindigkeitsboosts
- **Rollen**: Zombies vs Überlebende

### CopyCat Royale

Battle Royale Elimination:

- **Pool-System**: Nutzt Spieler-Kunst als Referenzen
- **Elimination**: Unter-Schwellenwert Genauigkeit = Raus
- **Skalierung**: Dynamischer Schwellenwert basierend auf Spielerzahl
- **Ranking**: Endplatzierung basierend auf Überlebensrunde

### Pixel Survivor

Einzelspieler-Roguelike:

- **Lokaler Zustand**: Nutzt `localStorage` für Persistenz
- **Kampfsystem**: Rundenbasiert mit Würfelwürfen
- **Fortschritt**: XP, Level, Stat-Upgrades
- **Monster**: Mit prozeduralen Mustern generiert

### Idle Pixel

Einzelspieler Idle/Incremental-Spiel:

- **Lokaler Zustand**: Nutzt `localStorage` für Spielstände
- **Grid-System**: 8x8 Merge-Raster zum Kombinieren von Pixeln
- **Upgrade-System**: Produktion, Wirtschaft, Clicker und Grid-Upgrades
- **Prestige-System**: Reset für Prisma-Pixel Meta-Währung
- **Offline-Fortschritt**: Verdient Ressourcen im Hintergrund (50% Effizienz)
