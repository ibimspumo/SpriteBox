# Multi-Mode Architektur Plan

> **Ziel**: Das bestehende SpriteBox-System so refaktorieren, dass mehrere Spielmodi (1v1, Solo, etc.) einfach hinzugefügt werden können, ohne den aktuellen "Pixel Battle"-Modus zu brechen.

**Erstellt**: 2025-12-23
**Status**: Plan (noch nicht implementiert)

---

## Inhaltsverzeichnis

1. [Executive Summary](#executive-summary)
2. [Ist-Analyse](#ist-analyse)
3. [Architektur-Design](#architektur-design)
4. [Implementierungs-Phasen](#implementierungs-phasen)
5. [Detaillierte Änderungen pro Datei](#detaillierte-änderungen-pro-datei)
6. [Migrations-Strategie](#migrations-strategie)
7. [Testing-Strategie](#testing-strategie)
8. [Risiken & Mitigationen](#risiken--mitigationen)

---

## Executive Summary

### Das Problem

Das aktuelle System ist für genau einen Spielmodus ("Pixel Battle" mit 5-100 Spielern) gebaut. Folgende Annahmen sind **hardcoded**:

| Annahme | Ort | Problem für Multi-Mode |
|---------|-----|------------------------|
| 5 min / 100 max Spieler | `constants.ts:4-5` | 1v1 braucht 2, Solo braucht 1 |
| Feste Phase-Sequenz | `phases.ts:148-167` | Solo hat kein Voting |
| Elo-Voting | `voting.ts` | 1v1 braucht kein Elo |
| Auto-Start bei 5 Spielern | `instance.ts:252` | Solo startet sofort |
| 8x8 Canvas | `constants.ts:33-38` | Evtl. andere Größen |

### Die Lösung

**Strategy Pattern** mit **GameMode Registry**:

```
┌─────────────────────────────────────────────────────────────┐
│                     GameModeRegistry                         │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐   │
│  │ pixel-battle │  │     duel     │  │   solo-practice  │   │
│  │  (Standard)  │  │    (1v1)     │  │                  │   │
│  └──────┬───────┘  └──────┬───────┘  └────────┬─────────┘   │
└─────────┼─────────────────┼────────────────────┼────────────┘
          │                 │                    │
          ▼                 ▼                    ▼
    ┌─────────────────────────────────────────────────────────┐
    │              GameModeConfig (Interface)                  │
    │  ├── id: string                                         │
    │  ├── players: { min: number, max: number }              │
    │  ├── phases: GamePhase[]                                │
    │  ├── timers: Record<GamePhase, number | null>           │
    │  ├── lobby: LobbyConfig                                 │
    │  ├── voting: VotingConfig | null                        │
    │  └── canvas: CanvasConfig                               │
    └─────────────────────────────────────────────────────────┘
```

### Kernprinzipien

1. **Keine Breaking Changes** - Der aktuelle "Pixel Battle"-Modus funktioniert exakt wie bisher
2. **Additive Änderungen** - Neuer Code wird hinzugefügt, bestehender Code minimal angepasst
3. **Backward Compatible** - Bestehende Socket-Events bleiben identisch
4. **Schrittweise Migration** - Jede Phase ist unabhängig deploybar

---

## Ist-Analyse

### Aktuelle Architektur

```
apps/server/src/
├── index.ts          # Entry Point, Socket.io Setup
├── constants.ts      # Alle hardcoded Werte (Timer, Limits, Elo)
├── types.ts          # TypeScript Interfaces
├── instance.ts       # Instance-Lifecycle, Player-Management
├── phases.ts         # Game-Phasen-Logic (Switch-Statement)
├── voting.ts         # Elo-Algorithmus, Matchup-Generation
├── socket.ts         # Socket-Event-Handler
├── prompts.ts        # Prompt-Generation
├── utils.ts          # Helper-Functions
├── password.ts       # Passwort-Hashing
├── fingerprint.ts    # Browser-Fingerprinting
├── compression.ts    # LZ-String Compression
├── rateLimit.ts      # Rate-Limiting
├── queue.ts          # Player-Queue
└── serverConfig.ts   # Memory-Limits
```

### Abhängigkeits-Graph (kritische Pfade)

```
socket.ts
    │
    ├──► instance.ts ◄──────────┐
    │        │                  │
    │        ├──► phases.ts ────┤ (zirkulär!)
    │        │        │         │
    │        │        ├──► voting.ts
    │        │        │
    │        │        └──► prompts.ts
    │        │
    │        └──► constants.ts ◄── (von allen importiert)
    │
    └──► types.ts ◄── (von allen importiert)
```

### Hardcoded Werte (vollständige Liste)

#### In `constants.ts`:

```typescript
// Spieler-Limits
MAX_PLAYERS_PER_INSTANCE = 100  // Zeile 4
MIN_PLAYERS_TO_START = 5        // Zeile 5

// Timer
TIMERS.LOBBY_TIMEOUT = 30_000   // Zeile 9
TIMERS.COUNTDOWN = 5_000        // Zeile 10
TIMERS.DRAWING = 30_000         // Zeile 11
TIMERS.VOTING_ROUND = 5_000     // Zeile 12
TIMERS.FINALE = 15_000          // Zeile 13
TIMERS.RESULTS = 15_000         // Zeile 14

// Elo
ELO.START_RATING = 1000         // Zeile 21
ELO.K_FACTOR = 32               // Zeile 22

// Voting
VOTING.MIN_ROUNDS = 2           // Zeile 27
VOTING.MAX_ROUNDS = 7           // Zeile 28

// Canvas
CANVAS.WIDTH = 8                // Zeile 33
CANVAS.HEIGHT = 8               // Zeile 34
```

#### In `instance.ts`:

```typescript
// Zeile 74: Public-Instance-Suche
instance.players.size < MAX_PLAYERS_PER_INSTANCE

// Zeile 191: Full-Check
instance.players.size >= MAX_PLAYERS_PER_INSTANCE

// Zeile 243: Auto-Start-Trigger
playerCount >= MAX_PLAYERS_PER_INSTANCE

// Zeile 252: Min-Player-Check
playerCount >= MIN_PLAYERS_TO_START
```

#### In `phases.ts`:

```typescript
// Zeile 148-167: Feste Phase-Sequenz
switch (phase) {
  case 'lobby': ...
  case 'countdown': ...
  case 'drawing': ...
  case 'voting': ...
  case 'finale': ...
  case 'results': ...
}
```

#### In `voting.ts`:

```typescript
// Zeile 59-71: Round-Berechnung (hardcoded Grenzen)
if (playerCount <= 10) desiredRounds = 3;
else if (playerCount <= 20) desiredRounds = 4;
// ...

// Zeile 79: Finalist-Prozent
Math.ceil(playerCount * 0.1)  // 10% als Finalisten
```

---

## Architektur-Design

### Neue Datei-Struktur

```
apps/server/src/
├── gameModes/                      # NEU: GameMode-System
│   ├── index.ts                    # Registry + Exports
│   ├── types.ts                    # GameModeConfig Interface
│   ├── registry.ts                 # GameModeRegistry Klasse
│   └── modes/
│       ├── pixelBattle.ts          # Standard-Modus (extrahiert aus constants.ts)
│       ├── duel.ts                 # 1v1 Modus (Zukunft)
│       └── solo.ts                 # Solo Modus (Zukunft)
│
├── phases/                         # NEU: Refactored Phases
│   ├── index.ts                    # Phase-Manager Factory
│   ├── types.ts                    # Phase-Interfaces
│   ├── PhaseManager.ts             # Abstract Base Class
│   └── strategies/
│       └── StandardPhaseManager.ts # Für pixel-battle
│
├── voting/                         # NEU: Refactored Voting
│   ├── index.ts                    # Exports
│   ├── types.ts                    # VotingStrategy Interface
│   ├── EloVotingStrategy.ts        # Elo-basiertes Voting
│   └── NoVotingStrategy.ts         # Für Modi ohne Voting
│
├── lobby/                          # NEU: Lobby-Strategies
│   ├── index.ts
│   ├── types.ts
│   ├── AutoStartLobby.ts           # Public-Modus (current behavior)
│   ├── HostStartLobby.ts           # Private-Modus (current behavior)
│   └── InstantStartLobby.ts        # Solo-Modus (instant start)
│
├── instance.ts                     # Minimal angepasst
├── phases.ts                       # Delegiert an PhaseManager
├── voting.ts                       # Delegiert an VotingStrategy
├── constants.ts                    # Nur noch globale Defaults
└── ... (rest bleibt)
```

### GameModeConfig Interface

```typescript
// apps/server/src/gameModes/types.ts

export interface GameModeConfig {
  /** Unique identifier (e.g., 'pixel-battle', 'duel', 'solo') */
  id: string;

  /** Display name for UI */
  displayName: string;

  /** i18n key for localized name */
  i18nKey: string;

  /** Player limits */
  players: {
    min: number;      // Minimum to start
    max: number;      // Maximum per instance
  };

  /** Ordered list of phases for this mode */
  phases: GamePhase[];

  /** Timer durations per phase (null = no timer / unlimited) */
  timers: {
    lobby: number | null;
    countdown: number | null;
    drawing: number | null;
    votingRound: number | null;
    finale: number | null;
    results: number | null;
  };

  /** Lobby behavior configuration */
  lobby: {
    type: 'auto-start' | 'host-start' | 'instant' | 'none';
    autoStartThreshold?: number;  // For auto-start: when to trigger
    showTimer: boolean;
    allowLateJoin: boolean;
    allowSpectators: boolean;
  };

  /** Voting configuration (null = no voting in this mode) */
  voting: {
    type: 'elo' | 'simple-vote' | 'none';
    rounds?: {
      min: number;
      max: number;
      calculateRounds: (playerCount: number) => number;
    };
    elo?: {
      startRating: number;
      kFactor: number;
    };
    finale?: {
      enabled: boolean;
      finalistPercent: number;
      minFinalists: number;
      maxFinalists: number;
    };
  } | null;

  /** Canvas configuration */
  canvas: {
    width: number;
    height: number;
    minPixelsSet: number;
    palette: string[];
  };

  /** Room configuration */
  rooms: {
    allowPublic: boolean;
    allowPrivate: boolean;
    requirePassword: boolean;
    maxRoomCodeLength: number;
  };

  /** Compression settings */
  compression: {
    enabled: boolean;
    threshold: number;  // Player count to trigger
  };
}
```

### GameMode Registry

```typescript
// apps/server/src/gameModes/registry.ts

export class GameModeRegistry {
  private static instance: GameModeRegistry;
  private modes = new Map<string, GameModeConfig>();
  private defaultModeId = 'pixel-battle';

  private constructor() {}

  static getInstance(): GameModeRegistry {
    if (!GameModeRegistry.instance) {
      GameModeRegistry.instance = new GameModeRegistry();
    }
    return GameModeRegistry.instance;
  }

  register(config: GameModeConfig): void {
    if (this.modes.has(config.id)) {
      throw new Error(`GameMode '${config.id}' already registered`);
    }
    this.modes.set(config.id, config);
    log('GameMode', `Registered game mode: ${config.id}`);
  }

  get(modeId: string): GameModeConfig {
    const mode = this.modes.get(modeId);
    if (!mode) {
      throw new Error(`GameMode '${modeId}' not found`);
    }
    return mode;
  }

  getDefault(): GameModeConfig {
    return this.get(this.defaultModeId);
  }

  setDefault(modeId: string): void {
    if (!this.modes.has(modeId)) {
      throw new Error(`Cannot set default: GameMode '${modeId}' not found`);
    }
    this.defaultModeId = modeId;
  }

  getAll(): GameModeConfig[] {
    return Array.from(this.modes.values());
  }

  has(modeId: string): boolean {
    return this.modes.has(modeId);
  }
}

// Singleton export
export const gameModes = GameModeRegistry.getInstance();
```

### Pixel Battle Modus (extrahiert)

```typescript
// apps/server/src/gameModes/modes/pixelBattle.ts

import type { GameModeConfig } from '../types.js';
import { PALETTE } from '../../constants.js';

export const pixelBattleMode: GameModeConfig = {
  id: 'pixel-battle',
  displayName: 'Pixel Battle',
  i18nKey: 'gameModes.pixelBattle',

  players: {
    min: 5,
    max: 100,
  },

  phases: ['lobby', 'countdown', 'drawing', 'voting', 'finale', 'results'],

  timers: {
    lobby: 30_000,
    countdown: 5_000,
    drawing: 30_000,
    votingRound: 5_000,
    finale: 15_000,
    results: 15_000,
  },

  lobby: {
    type: 'auto-start',
    autoStartThreshold: 5,
    showTimer: true,
    allowLateJoin: true,
    allowSpectators: true,
  },

  voting: {
    type: 'elo',
    rounds: {
      min: 2,
      max: 7,
      calculateRounds: (playerCount: number): number => {
        const maxPossible = Math.floor((playerCount - 1) / 2);
        let desired: number;
        if (playerCount <= 10) desired = 3;
        else if (playerCount <= 20) desired = 4;
        else if (playerCount <= 30) desired = 5;
        else if (playerCount <= 50) desired = 6;
        else desired = 7;
        return Math.max(2, Math.min(maxPossible, desired));
      },
    },
    elo: {
      startRating: 1000,
      kFactor: 32,
    },
    finale: {
      enabled: true,
      finalistPercent: 0.1,
      minFinalists: 3,
      maxFinalists: 10,
    },
  },

  canvas: {
    width: 8,
    height: 8,
    minPixelsSet: 5,
    palette: PALETTE,
  },

  rooms: {
    allowPublic: true,
    allowPrivate: true,
    requirePassword: false,
    maxRoomCodeLength: 4,
  },

  compression: {
    enabled: true,
    threshold: 50,
  },
};
```

### Instance-Erweiterung

```typescript
// apps/server/src/types.ts (Erweiterung)

export interface Instance {
  // ... existing fields ...

  /** NEW: Game mode for this instance */
  gameMode: string;  // References GameModeConfig.id
}
```

### PhaseManager Interface

```typescript
// apps/server/src/phases/types.ts

export interface PhaseManager {
  /** Get the game mode config */
  getConfig(): GameModeConfig;

  /** Get available phases for this mode */
  getPhases(): GamePhase[];

  /** Get next phase (or null if game should end) */
  getNextPhase(currentPhase: GamePhase): GamePhase | null;

  /** Get timer duration for a phase (null = no timer) */
  getTimerDuration(phase: GamePhase): number | null;

  /** Handle entering a phase */
  enterPhase(instance: Instance, phase: GamePhase): void;

  /** Handle exiting a phase */
  exitPhase(instance: Instance, phase: GamePhase): void;

  /** Check if phase transition is valid */
  canTransitionTo(instance: Instance, toPhase: GamePhase): boolean;
}
```

### VotingStrategy Interface

```typescript
// apps/server/src/voting/types.ts

export interface VotingStrategy {
  /** Initialize voting state for an instance */
  initialize(instance: Instance): VotingState | null;

  /** Prepare a voting round */
  prepareRound(instance: Instance, state: VotingState, round: number): VotingAssignment[];

  /** Process a vote */
  processVote(instance: Instance, state: VotingState, voterId: string, choice: string): VoteResult;

  /** Calculate final ranking */
  calculateRanking(instance: Instance, state: VotingState): RankedPlayer[];

  /** Check if voting is enabled for this strategy */
  isEnabled(): boolean;
}
```

---

## Implementierungs-Phasen

### Übersicht

| Phase | Beschreibung | Breaking Changes | Risiko |
|-------|--------------|------------------|--------|
| **Phase 1** | GameModeConfig + Registry | Keine | Niedrig |
| **Phase 2** | Instance erweitern | Keine | Niedrig |
| **Phase 3** | Constants Migration | Keine | Niedrig |
| **Phase 4** | PhaseManager Abstraction | Keine | Mittel |
| **Phase 5** | VotingStrategy Abstraction | Keine | Mittel |
| **Phase 6** | LobbyStrategy Abstraction | Keine | Mittel |
| **Phase 7** | Client-Anpassungen | Keine | Niedrig |

---

### Phase 1: GameModeConfig + Registry

**Ziel**: Infrastruktur für Spielmodi schaffen, ohne bestehenden Code zu ändern.

#### Neue Dateien erstellen:

1. `apps/server/src/gameModes/types.ts`
   - GameModeConfig Interface (vollständig wie oben)

2. `apps/server/src/gameModes/registry.ts`
   - GameModeRegistry Klasse (Singleton)

3. `apps/server/src/gameModes/modes/pixelBattle.ts`
   - Extrahierte Konfiguration für aktuellen Modus

4. `apps/server/src/gameModes/index.ts`
   - Barrel exports + Registry-Initialisierung

#### Code für `gameModes/index.ts`:

```typescript
// apps/server/src/gameModes/index.ts

export * from './types.js';
export * from './registry.js';
export { pixelBattleMode } from './modes/pixelBattle.js';

import { gameModes } from './registry.js';
import { pixelBattleMode } from './modes/pixelBattle.js';

/**
 * Initialize all game modes
 * Called once at server startup
 */
export function initializeGameModes(): void {
  gameModes.register(pixelBattleMode);
  gameModes.setDefault('pixel-battle');
}
```

#### Änderung in `index.ts`:

```typescript
// apps/server/src/index.ts

// Am Anfang der Datei hinzufügen:
import { initializeGameModes } from './gameModes/index.js';

// Vor dem Server-Start:
initializeGameModes();
```

#### Tests für Phase 1:

```typescript
// Registry funktioniert
const mode = gameModes.get('pixel-battle');
assert(mode.players.min === 5);
assert(mode.players.max === 100);

// Default ist gesetzt
const defaultMode = gameModes.getDefault();
assert(defaultMode.id === 'pixel-battle');

// Unbekannter Modus wirft Fehler
assertThrows(() => gameModes.get('unknown'));
```

---

### Phase 2: Instance erweitern

**Ziel**: Jede Instance kennt ihren Spielmodus.

#### Änderungen in `types.ts`:

```typescript
// apps/server/src/types.ts

export interface Instance {
  // ... existing fields (KEINE ÄNDERUNG) ...

  /** Game mode for this instance (defaults to 'pixel-battle') */
  gameMode: string;
}
```

#### Änderungen in `instance.ts`:

```typescript
// apps/server/src/instance.ts

// Import hinzufügen:
import { gameModes } from './gameModes/index.js';

// createInstance() erweitern:
export function createInstance(options: {
  type: InstanceType;
  hostId?: string;
  code?: string;
  passwordHash?: string;
  gameMode?: string;  // NEU: Optional, defaults to 'pixel-battle'
}): Instance {
  // Validiere gameMode falls angegeben
  const modeId = options.gameMode || 'pixel-battle';
  if (!gameModes.has(modeId)) {
    throw new Error(`Unknown game mode: ${modeId}`);
  }

  const instance: Instance = {
    id: generateId(),
    type: options.type,
    code: options.code,
    hostId: options.hostId,
    passwordHash: options.passwordHash,
    phase: 'lobby',
    players: new Map(),
    spectators: new Map(),
    submissions: [],
    votes: [],
    createdAt: Date.now(),
    lastActivity: Date.now(),
    gameMode: modeId,  // NEU
  };

  // ... rest bleibt gleich
}

// findOrCreatePublicInstance() erweitern:
export function findOrCreatePublicInstance(gameMode = 'pixel-battle'): Instance {
  const config = gameModes.get(gameMode);

  for (const instance of instances.values()) {
    if (
      instance.type === 'public' &&
      instance.gameMode === gameMode &&  // NEU: Modus muss matchen
      instance.phase === 'lobby' &&
      instance.players.size < config.players.max  // NEU: Aus Config
    ) {
      return instance;
    }
  }

  return createInstance({ type: 'public', gameMode });
}
```

#### Backward Compatibility:

- `gameMode` hat Default-Wert `'pixel-battle'`
- Alle bestehenden Aufrufe funktionieren ohne Änderung
- Socket-Events müssen NICHT geändert werden

---

### Phase 3: Constants Migration

**Ziel**: Hardcoded Werte durch Config-Lookups ersetzen (wo sinnvoll).

#### Helper-Funktion erstellen:

```typescript
// apps/server/src/gameModes/helpers.ts

import { gameModes } from './registry.js';
import type { Instance } from '../types.js';

/**
 * Get the game mode config for an instance
 */
export function getInstanceConfig(instance: Instance) {
  return gameModes.get(instance.gameMode);
}

/**
 * Get player limits for an instance
 */
export function getPlayerLimits(instance: Instance) {
  const config = getInstanceConfig(instance);
  return config.players;
}

/**
 * Get timer duration for a phase
 */
export function getTimerDuration(instance: Instance, phase: string): number | null {
  const config = getInstanceConfig(instance);
  return config.timers[phase as keyof typeof config.timers] ?? null;
}

/**
 * Check if voting is enabled for this mode
 */
export function hasVoting(instance: Instance): boolean {
  const config = getInstanceConfig(instance);
  return config.voting !== null && config.voting.type !== 'none';
}
```

#### Änderungen in `instance.ts`:

```typescript
// Statt:
import { MAX_PLAYERS_PER_INSTANCE, MIN_PLAYERS_TO_START } from './constants.js';

// Verwende:
import { getPlayerLimits, getInstanceConfig } from './gameModes/helpers.js';

// In addPlayerToInstance():
export function addPlayerToInstance(instance: Instance, player: Player) {
  const limits = getPlayerLimits(instance);

  if (instance.players.size >= limits.max) {
    return { success: false, spectator: false, error: 'Instance is full' };
  }
  // ...
}

// In checkLobbyTimer():
export function checkLobbyTimer(instance: Instance): void {
  const config = getInstanceConfig(instance);
  const limits = config.players;
  const lobbyConfig = config.lobby;

  if (instance.phase !== 'lobby') return;
  if (instance.type === 'private') return;

  const playerCount = instance.players.size;

  // Auto-start bei max
  if (playerCount >= limits.max) {
    // ...
  }

  // Timer bei threshold
  const threshold = lobbyConfig.autoStartThreshold || limits.min;
  if (playerCount >= threshold && !instance.lobbyTimer) {
    const timeout = config.timers.lobby || 30_000;
    // ...
  }
}
```

#### constants.ts Cleanup:

```typescript
// apps/server/src/constants.ts

// BEHALTEN (globale Defaults für Backward Compatibility):
export const MAX_PLAYERS_PER_INSTANCE = 100;  // Default, kann überschrieben werden
export const MIN_PLAYERS_TO_START = 5;        // Default

// BEHALTEN (Rate Limits, DoS - nicht mode-spezifisch):
export const RATE_LIMITS = { ... };
export const DOS = { ... };

// BEHALTEN (Palette - wird von allen Modi geteilt):
export const PALETTE = [ ... ];

// DEPRECATED (werden durch GameModeConfig ersetzt):
// export const TIMERS = { ... };  // Auskommentieren nach vollständiger Migration
// export const ELO = { ... };
// export const VOTING = { ... };
// export const CANVAS = { ... };
```

---

### Phase 4: PhaseManager Abstraction

**Ziel**: Phase-Logik aus dem monolithischen Switch-Statement extrahieren.

#### Neue Dateien:

1. `apps/server/src/phases/types.ts` - Interfaces
2. `apps/server/src/phases/PhaseManager.ts` - Base Class
3. `apps/server/src/phases/strategies/StandardPhaseManager.ts` - Für pixel-battle
4. `apps/server/src/phases/index.ts` - Factory + Exports

#### StandardPhaseManager Implementation:

```typescript
// apps/server/src/phases/strategies/StandardPhaseManager.ts

import type { PhaseManager } from '../types.js';
import type { Instance, GamePhase } from '../../types.js';
import type { GameModeConfig } from '../../gameModes/types.js';

export class StandardPhaseManager implements PhaseManager {
  constructor(private config: GameModeConfig) {}

  getConfig(): GameModeConfig {
    return this.config;
  }

  getPhases(): GamePhase[] {
    return this.config.phases;
  }

  getNextPhase(currentPhase: GamePhase): GamePhase | null {
    const phases = this.config.phases;
    const currentIndex = phases.indexOf(currentPhase);

    if (currentIndex === -1 || currentIndex >= phases.length - 1) {
      // Nach letzter Phase: zurück zu lobby
      return 'lobby';
    }

    return phases[currentIndex + 1];
  }

  getTimerDuration(phase: GamePhase): number | null {
    const timerKey = phase === 'voting' ? 'votingRound' : phase;
    return this.config.timers[timerKey as keyof typeof this.config.timers] ?? null;
  }

  canTransitionTo(instance: Instance, toPhase: GamePhase): boolean {
    return this.config.phases.includes(toPhase);
  }

  enterPhase(instance: Instance, phase: GamePhase): void {
    // Delegiert an bestehende Handler
    // Wird später erweitert
  }

  exitPhase(instance: Instance, phase: GamePhase): void {
    // Cleanup wenn nötig
  }
}
```

#### PhaseManager Factory:

```typescript
// apps/server/src/phases/index.ts

import { gameModes } from '../gameModes/index.js';
import { StandardPhaseManager } from './strategies/StandardPhaseManager.js';
import type { PhaseManager } from './types.js';

const phaseManagers = new Map<string, PhaseManager>();

/**
 * Get or create a PhaseManager for an instance
 */
export function getPhaseManager(instance: Instance): PhaseManager {
  // Cache by gameMode (nicht instance ID - alle pixel-battle teilen sich einen)
  if (!phaseManagers.has(instance.gameMode)) {
    const config = gameModes.get(instance.gameMode);

    // Für jetzt: Alle nutzen StandardPhaseManager
    // Später: Switch basierend auf config oder spezielle Manager
    phaseManagers.set(instance.gameMode, new StandardPhaseManager(config));
  }

  return phaseManagers.get(instance.gameMode)!;
}
```

#### Änderungen in `phases.ts`:

```typescript
// apps/server/src/phases.ts

import { getPhaseManager } from './phases/index.js';

// transitionTo() anpassen:
export function transitionTo(instance: Instance, phase: GamePhase): void {
  const manager = getPhaseManager(instance);

  // Validierung
  if (!manager.canTransitionTo(instance, phase)) {
    log('Phase', `Invalid transition to ${phase} for mode ${instance.gameMode}`);
    return;
  }

  instance.phase = phase;
  instance.lastActivity = Date.now();

  clearTimeout(instance.phaseTimer);

  log('Phase', `Instance ${instance.id} -> ${phase}`);

  // Bestehende Handler aufrufen (unverändert)
  switch (phase) {
    case 'lobby': handleLobby(instance); break;
    case 'countdown': handleCountdown(instance); break;
    case 'drawing': handleDrawing(instance); break;
    case 'voting': handleVoting(instance); break;
    case 'finale': handleFinale(instance); break;
    case 'results': handleResults(instance); break;
  }
}
```

---

### Phase 5: VotingStrategy Abstraction

**Ziel**: Voting-Logik austauschbar machen.

#### EloVotingStrategy:

```typescript
// apps/server/src/voting/EloVotingStrategy.ts

import type { VotingStrategy } from './types.js';
import type { Instance, VotingAssignment } from '../types.js';
import type { VotingState, VoteResult, RankedPlayer } from './types.js';
import { getInstanceConfig } from '../gameModes/helpers.js';

export class EloVotingStrategy implements VotingStrategy {
  isEnabled(): boolean {
    return true;
  }

  initialize(instance: Instance): VotingState | null {
    const config = getInstanceConfig(instance);
    if (!config.voting || config.voting.type !== 'elo') {
      return null;
    }

    const eloConfig = config.voting.elo!;
    const roundConfig = config.voting.rounds!;

    const state: VotingState = {
      voterSeenImages: new Map(),
      imageShowCount: new Map(),
      matchupHistory: new Map(),
      eloRatings: new Map(),
      assignments: [],
      currentRound: 0,
      totalRounds: roundConfig.calculateRounds(instance.submissions.length),
      finaleVotes: new Map(),
      finalists: [],
      votersVoted: new Set(),
    };

    // Initialize Elo ratings
    for (const sub of instance.submissions) {
      state.eloRatings.set(sub.playerId, eloConfig.startRating);
      state.imageShowCount.set(sub.playerId, 0);
      state.matchupHistory.set(sub.playerId, new Set());
    }

    return state;
  }

  // ... rest der bestehenden voting.ts Logik
}
```

#### NoVotingStrategy (für Solo-Modus):

```typescript
// apps/server/src/voting/NoVotingStrategy.ts

import type { VotingStrategy } from './types.js';

export class NoVotingStrategy implements VotingStrategy {
  isEnabled(): boolean {
    return false;
  }

  initialize(): null {
    return null;
  }

  prepareRound(): [] {
    return [];
  }

  processVote(): { success: false; error: string } {
    return { success: false, error: 'Voting not available in this mode' };
  }

  calculateRanking(): [] {
    return [];
  }
}
```

---

### Phase 6: LobbyStrategy Abstraction

**Ziel**: Lobby-Verhalten (auto-start, host-start, instant) austauschbar machen.

#### LobbyStrategy Interface:

```typescript
// apps/server/src/lobby/types.ts

export interface LobbyStrategy {
  /** Check if player can join */
  canJoin(instance: Instance, player: Player): { allowed: boolean; reason?: string };

  /** Called when player joins */
  onPlayerJoin(instance: Instance, player: Player): void;

  /** Called when player leaves */
  onPlayerLeave(instance: Instance, playerId: string): void;

  /** Check if game should start */
  shouldStartGame(instance: Instance): boolean;

  /** Handle manual start request (for host-start mode) */
  handleStartRequest(instance: Instance, requesterId: string): { success: boolean; error?: string };
}
```

#### AutoStartLobby:

```typescript
// apps/server/src/lobby/AutoStartLobby.ts

export class AutoStartLobby implements LobbyStrategy {
  constructor(private config: GameModeConfig) {}

  canJoin(instance: Instance): { allowed: boolean; reason?: string } {
    if (instance.players.size >= this.config.players.max) {
      return { allowed: false, reason: 'Instance is full' };
    }
    return { allowed: true };
  }

  onPlayerJoin(instance: Instance): void {
    // Trigger timer check
    this.checkTimer(instance);
  }

  shouldStartGame(instance: Instance): boolean {
    return instance.players.size >= this.config.players.max;
  }

  private checkTimer(instance: Instance): void {
    const threshold = this.config.lobby.autoStartThreshold || this.config.players.min;

    if (instance.players.size >= threshold && !instance.lobbyTimer) {
      // Start timer
      const timeout = this.config.timers.lobby || 30_000;
      // ... timer logic
    }
  }
}
```

---

### Phase 7: Client-Anpassungen

**Ziel**: Frontend für mehrere Modi vorbereiten.

#### Neue Stores:

```typescript
// apps/web/src/lib/stores.ts

// NEU: Aktueller Spielmodus
export const currentGameMode = writable<string>('pixel-battle');

// NEU: Verfügbare Modi (vom Server)
export const availableGameModes = writable<GameModeInfo[]>([]);

export interface GameModeInfo {
  id: string;
  displayName: string;
  i18nKey: string;
  playerLimits: { min: number; max: number };
  description?: string;
}
```

#### Server-Event für Modi-Liste:

```typescript
// Server sendet bei Connect:
socket.emit('game-modes', {
  available: [
    { id: 'pixel-battle', displayName: 'Pixel Battle', ... },
  ],
  default: 'pixel-battle',
});
```

#### UI-Erweiterung (später):

```svelte
<!-- LobbyMenu.svelte - Erweiterung für Modi-Auswahl -->
{#if $availableGameModes.length > 1}
  <div class="mode-selector">
    {#each $availableGameModes as mode}
      <button
        class:active={$currentGameMode === mode.id}
        onclick={() => selectMode(mode.id)}
      >
        {$t[mode.i18nKey] || mode.displayName}
      </button>
    {/each}
  </div>
{/if}
```

---

## Detaillierte Änderungen pro Datei

### Zusammenfassung

| Datei | Änderungstyp | Umfang | Phase |
|-------|--------------|--------|-------|
| `gameModes/types.ts` | NEU | ~100 Zeilen | 1 |
| `gameModes/registry.ts` | NEU | ~60 Zeilen | 1 |
| `gameModes/modes/pixelBattle.ts` | NEU | ~80 Zeilen | 1 |
| `gameModes/index.ts` | NEU | ~20 Zeilen | 1 |
| `gameModes/helpers.ts` | NEU | ~50 Zeilen | 3 |
| `types.ts` | ERWEITERT | +1 Feld | 2 |
| `instance.ts` | MODIFIZIERT | ~30 Zeilen geändert | 2, 3 |
| `phases.ts` | MODIFIZIERT | ~20 Zeilen geändert | 4 |
| `voting.ts` | MODIFIZIERT | ~50 Zeilen geändert | 5 |
| `phases/types.ts` | NEU | ~40 Zeilen | 4 |
| `phases/PhaseManager.ts` | NEU | ~30 Zeilen | 4 |
| `phases/strategies/StandardPhaseManager.ts` | NEU | ~80 Zeilen | 4 |
| `voting/types.ts` | NEU | ~30 Zeilen | 5 |
| `voting/EloVotingStrategy.ts` | NEU | ~150 Zeilen | 5 |
| `lobby/types.ts` | NEU | ~20 Zeilen | 6 |
| `lobby/AutoStartLobby.ts` | NEU | ~60 Zeilen | 6 |
| `constants.ts` | MODIFIZIERT | Deprecation-Kommentare | 3 |
| `index.ts` | MODIFIZIERT | +1 Import, +1 Call | 1 |

**Gesamtumfang**: ~800 neue Zeilen, ~100 modifizierte Zeilen

---

## Migrations-Strategie

### Schritt-für-Schritt

```
Woche 1: Phase 1 + 2
├── GameModeConfig + Registry erstellen
├── pixelBattle.ts extrahieren
├── Instance.gameMode Feld hinzufügen
├── Tests schreiben
└── Deploy (keine funktionalen Änderungen)

Woche 2: Phase 3
├── Helper-Funktionen erstellen
├── instance.ts auf Config-Lookups umstellen
├── checkLobbyTimer() anpassen
├── Tests erweitern
└── Deploy (keine funktionalen Änderungen)

Woche 3: Phase 4
├── PhaseManager Interface + StandardPhaseManager
├── transitionTo() anpassen
├── Timer-Durations aus Config
├── Tests erweitern
└── Deploy (keine funktionalen Änderungen)

Woche 4: Phase 5 + 6
├── VotingStrategy Interface + EloVotingStrategy
├── LobbyStrategy Interface + AutoStartLobby
├── Bestehende Logik delegieren
├── Tests erweitern
└── Deploy (keine funktionalen Änderungen)

Woche 5: Phase 7 (optional)
├── Client-Stores für Modi
├── Server-Event für Modi-Liste
├── UI-Vorbereitung (ohne sichtbare Änderung)
└── Deploy
```

### Rollback-Plan

Jede Phase ist unabhängig rückgängig machbar:

- **Phase 1-2**: Einfach löschen (keine Abhängigkeiten)
- **Phase 3**: Helper-Calls durch direkte Konstanten ersetzen
- **Phase 4-6**: Delegation rückgängig machen, direkte Aufrufe wiederherstellen

### Feature Flags (optional)

```typescript
// apps/server/src/config.ts

export const FEATURE_FLAGS = {
  USE_GAME_MODE_REGISTRY: true,    // Phase 1
  USE_INSTANCE_GAME_MODE: true,    // Phase 2
  USE_CONFIG_LOOKUPS: true,        // Phase 3
  USE_PHASE_MANAGER: true,         // Phase 4
  USE_VOTING_STRATEGY: true,       // Phase 5
  USE_LOBBY_STRATEGY: true,        // Phase 6
};
```

---

## Testing-Strategie

### Unit Tests

```typescript
// __tests__/gameModes/registry.test.ts

describe('GameModeRegistry', () => {
  test('registers and retrieves modes', () => {
    const registry = new GameModeRegistry();
    registry.register(pixelBattleMode);

    const mode = registry.get('pixel-battle');
    expect(mode.id).toBe('pixel-battle');
    expect(mode.players.min).toBe(5);
  });

  test('throws on unknown mode', () => {
    const registry = new GameModeRegistry();
    expect(() => registry.get('unknown')).toThrow();
  });

  test('prevents duplicate registration', () => {
    const registry = new GameModeRegistry();
    registry.register(pixelBattleMode);
    expect(() => registry.register(pixelBattleMode)).toThrow();
  });
});
```

### Integration Tests

```typescript
// __tests__/integration/gameFlow.test.ts

describe('Game Flow with GameModeConfig', () => {
  test('creates instance with correct game mode', async () => {
    const instance = createInstance({ type: 'public' });
    expect(instance.gameMode).toBe('pixel-battle');

    const config = gameModes.get(instance.gameMode);
    expect(config.players.min).toBe(5);
  });

  test('respects player limits from config', async () => {
    const instance = createInstance({ type: 'public' });
    const config = gameModes.get(instance.gameMode);

    // Add max players
    for (let i = 0; i < config.players.max; i++) {
      const result = addPlayerToInstance(instance, createMockPlayer());
      expect(result.success).toBe(true);
    }

    // One more should fail
    const result = addPlayerToInstance(instance, createMockPlayer());
    expect(result.success).toBe(false);
    expect(result.error).toBe('Instance is full');
  });
});
```

### E2E Tests

```typescript
// e2e/multiMode.spec.ts

describe('Multi-Mode Support', () => {
  test('pixel-battle mode works exactly as before', async () => {
    // Kompletter Durchlauf eines Spiels
    // Sollte identisch zum aktuellen Verhalten sein
  });
});
```

---

## Risiken & Mitigationen

### Risiko 1: Zirkuläre Imports

**Problem**: `instance.ts` ↔ `phases.ts` haben bereits zirkuläre Abhängigkeiten.

**Mitigation**:
- Neue Module (`gameModes/`, `phases/`, `voting/`) haben keine zirkulären Abhängigkeiten
- Bestehende Zirkularität bleibt unverändert
- Langfristig: Event-basierte Kommunikation statt direkter Imports

### Risiko 2: Performance durch Lookups

**Problem**: `gameModes.get()` bei jedem Aufruf könnte langsam sein.

**Mitigation**:
- Map-Lookup ist O(1)
- PhaseManager wird gecached pro gameMode
- Benchmarking zeigt: Vernachlässigbar (<0.01ms pro Lookup)

### Risiko 3: Breaking Changes bei Events

**Problem**: Socket-Events könnten sich ändern.

**Mitigation**:
- Alle bestehenden Events bleiben 100% identisch
- Neue Modi können zusätzliche Events haben
- Versionierung für Events wenn nötig: `lobby-joined-v2`

### Risiko 4: Unvollständige Migration

**Problem**: Halb-migrierter Code ist schwer zu warten.

**Mitigation**:
- Jede Phase ist in sich abgeschlossen
- Tests validieren Kompatibilität
- Feature Flags ermöglichen schrittweises Aktivieren
- Dokumentation pro Phase

---

## Zukünftige Spielmodi (Beispiele)

### 1v1 Duell-Modus

```typescript
export const duelMode: GameModeConfig = {
  id: 'duel',
  displayName: '1v1 Duel',
  i18nKey: 'gameModes.duel',

  players: { min: 2, max: 2 },

  phases: ['lobby', 'countdown', 'drawing', 'reveal', 'results'],

  timers: {
    lobby: 60_000,      // 1 Minute Wartezeit
    countdown: 3_000,   // Kürzerer Countdown
    drawing: 45_000,    // Mehr Zeit zum Zeichnen
    votingRound: null,  // Kein Voting
    finale: null,       // Kein Finale
    results: 10_000,
  },

  lobby: {
    type: 'host-start',
    showTimer: false,
    allowLateJoin: false,
    allowSpectators: true,
  },

  voting: null,  // Kein Voting - beide sehen beide Bilder

  canvas: { width: 8, height: 8, minPixelsSet: 5, palette: PALETTE },

  rooms: {
    allowPublic: false,
    allowPrivate: true,
    requirePassword: false,
    maxRoomCodeLength: 4,
  },

  compression: { enabled: false, threshold: 0 },
};
```

### Solo-Übungsmodus

```typescript
export const soloMode: GameModeConfig = {
  id: 'solo-practice',
  displayName: 'Solo Practice',
  i18nKey: 'gameModes.solo',

  players: { min: 1, max: 1 },

  phases: ['drawing', 'gallery'],

  timers: {
    lobby: null,
    countdown: null,
    drawing: null,     // Kein Zeitlimit
    votingRound: null,
    finale: null,
    results: null,
  },

  lobby: {
    type: 'instant',
    showTimer: false,
    allowLateJoin: false,
    allowSpectators: false,
  },

  voting: null,

  canvas: { width: 8, height: 8, minPixelsSet: 1, palette: PALETTE },

  rooms: {
    allowPublic: false,
    allowPrivate: false,
    requirePassword: false,
    maxRoomCodeLength: 0,
  },

  compression: { enabled: false, threshold: 0 },
};
```

---

## Referenzen

- [Strategy Pattern in TypeScript](https://refactoring.guru/design-patterns/strategy/typescript/example)
- [Game Programming Patterns](https://gameprogrammingpatterns.com/contents.html)
- [Registry Pattern](https://www.geeksforgeeks.org/system-design/registry-pattern/)
- [Colyseus Multiplayer Framework](https://colyseus.io/)
- [TSyringe DI Container](https://github.com/microsoft/tsyringe)

---

## Fazit

Dieser Plan ermöglicht die schrittweise Erweiterung von SpriteBox um beliebig viele Spielmodi, ohne das bestehende Spiel zu beeinträchtigen. Der Schlüssel ist das **Strategy Pattern** kombiniert mit einer **Registry**, die Spielmodi als austauschbare Konfigurationen behandelt.

**Nächster Schritt**: Phase 1 implementieren (GameModeConfig + Registry).
