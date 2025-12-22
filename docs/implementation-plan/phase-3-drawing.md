# Phase 3: Zeichnen-Phase

**Ziel:** Prompt-Generierung, Zeichen-Timer, Submission-Handling, Pixel-Validierung implementieren.

**Voraussetzungen:**
- Phase 2 abgeschlossen
- Instanz-System funktioniert
- Spieler können Lobbys beitreten

---

## Aufgaben

### 3.1 Phasen-Manager erstellen

- [ ] 📁 `apps/server/src/phases.ts` erstellen
- [ ] 🔧 Phase-Übergänge implementieren
- [ ] 🔧 Timer-Steuerung

**Datei:**

```typescript
// apps/server/src/phases.ts
import type { Instance, GamePhase } from './types.js';
import { TIMERS } from './constants.js';
import { log } from './utils.js';
import { generatePrompt } from './prompts.js';

// IO-Instanz (wird von socket.ts gesetzt)
let io: any = null;
export function setPhaseIo(ioInstance: any): void {
  io = ioInstance;
}

/**
 * Startet das Spiel für eine Instanz
 */
export function startGame(instance: Instance): void {
  clearTimeout(instance.lobbyTimer);
  instance.lobbyTimer = undefined;

  log('Phase', `Starting game for instance ${instance.id}`);

  // Prompt generieren
  instance.prompt = generatePrompt();

  // Countdown starten
  transitionTo(instance, 'countdown');
}

/**
 * Wechselt zu einer neuen Phase
 */
function transitionTo(instance: Instance, phase: GamePhase): void {
  instance.phase = phase;
  instance.lastActivity = Date.now();

  clearTimeout(instance.phaseTimer);

  log('Phase', `Instance ${instance.id} -> ${phase}`);

  switch (phase) {
    case 'countdown':
      handleCountdown(instance);
      break;
    case 'drawing':
      handleDrawing(instance);
      break;
    case 'voting':
      // Wird in Phase 4 implementiert
      handleVoting(instance);
      break;
    case 'finale':
      // Wird in Phase 4 implementiert
      handleFinale(instance);
      break;
    case 'results':
      handleResults(instance);
      break;
  }
}

/**
 * Countdown-Phase (5 Sekunden)
 */
function handleCountdown(instance: Instance): void {
  emitToInstance(instance, 'phase-changed', {
    phase: 'countdown',
    prompt: instance.prompt,
    duration: TIMERS.COUNTDOWN,
    startsAt: Date.now() + TIMERS.COUNTDOWN,
  });

  instance.phaseTimer = setTimeout(() => {
    transitionTo(instance, 'drawing');
  }, TIMERS.COUNTDOWN);
}

/**
 * Zeichnen-Phase (60 Sekunden)
 */
function handleDrawing(instance: Instance): void {
  // Submissions zurücksetzen
  instance.submissions = [];

  emitToInstance(instance, 'phase-changed', {
    phase: 'drawing',
    prompt: instance.prompt,
    duration: TIMERS.DRAWING,
    endsAt: Date.now() + TIMERS.DRAWING,
  });

  instance.phaseTimer = setTimeout(() => {
    endDrawingPhase(instance);
  }, TIMERS.DRAWING);
}

/**
 * Beendet die Zeichnen-Phase
 */
function endDrawingPhase(instance: Instance): void {
  log('Phase', `Drawing ended for ${instance.id}: ${instance.submissions.length} submissions`);

  // Mindestens 2 Submissions für Voting
  if (instance.submissions.length < 2) {
    log('Phase', `Not enough submissions, skipping to results`);
    transitionTo(instance, 'results');
    return;
  }

  // Voting starten
  transitionTo(instance, 'voting');
}

/**
 * Voting-Phase (Placeholder - wird in Phase 4 implementiert)
 */
function handleVoting(instance: Instance): void {
  log('Phase', `Voting started (placeholder)`);

  // Placeholder: Direkt zu Results
  instance.phaseTimer = setTimeout(() => {
    transitionTo(instance, 'results');
  }, 5000);

  emitToInstance(instance, 'phase-changed', {
    phase: 'voting',
    message: 'Voting coming in Phase 4',
  });
}

/**
 * Finale-Phase (Placeholder - wird in Phase 4 implementiert)
 */
function handleFinale(instance: Instance): void {
  log('Phase', `Finale started (placeholder)`);
}

/**
 * Ergebnis-Phase (15 Sekunden)
 */
function handleResults(instance: Instance): void {
  // Einfaches Ranking nach Eingangsreihenfolge (wird in Phase 4 durch Elo ersetzt)
  const rankings = instance.submissions.map((sub, index) => {
    const player = instance.players.get(sub.playerId);
    return {
      place: index + 1,
      playerId: sub.playerId,
      user: player?.user || { displayName: 'Unknown', discriminator: '0000', fullName: 'Unknown#0000' },
      pixels: sub.pixels,
      finalVotes: 0,
      elo: 1000,
    };
  });

  emitToInstance(instance, 'phase-changed', {
    phase: 'results',
    duration: TIMERS.RESULTS,
  });

  emitToInstance(instance, 'game-results', {
    prompt: instance.prompt,
    rankings,
    totalParticipants: instance.submissions.length,
  });

  // Spectators zu Spielern machen für nächste Runde
  for (const [id, spectator] of instance.spectators) {
    instance.players.set(id, spectator);
  }
  instance.spectators.clear();

  // Nach Results: Zurück zur Lobby
  instance.phaseTimer = setTimeout(() => {
    resetForNextRound(instance);
  }, TIMERS.RESULTS);
}

/**
 * Reset für nächste Runde
 */
function resetForNextRound(instance: Instance): void {
  instance.submissions = [];
  instance.votes = [];
  instance.prompt = undefined;

  // Zurück zur Lobby
  transitionTo(instance, 'lobby');

  emitToInstance(instance, 'phase-changed', {
    phase: 'lobby',
    message: 'Waiting for next round',
  });

  log('Phase', `Instance ${instance.id} reset for next round`);
}

/**
 * Hilfsfunktion: Event an alle in der Instanz senden
 */
function emitToInstance(instance: Instance, event: string, data: any): void {
  if (io) {
    io.to(instance.id).emit(event, data);
  }
}

// Export für manuellen Start
export { transitionTo };
```

---

### 3.2 Prompt-Generator erstellen

- [ ] 📁 `apps/server/src/prompts.ts` erstellen
- [ ] 🔧 Zufällige Prompt-Kombination

**Datei:**

```typescript
// apps/server/src/prompts.ts
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { randomItem } from './utils.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

interface PromptData {
  prefixes: string[];
  subjects: string[];
  suffixes: string[];
}

let promptData: PromptData | null = null;

/**
 * Lädt die Prompt-Daten aus der JSON-Datei
 */
function loadPromptData(): PromptData {
  if (promptData) return promptData;

  try {
    const filePath = join(__dirname, '..', 'data', 'prompts.json');
    const content = readFileSync(filePath, 'utf-8');
    promptData = JSON.parse(content);
    return promptData!;
  } catch (error) {
    console.error('Failed to load prompts.json, using fallback');
    // Fallback-Daten
    promptData = {
      prefixes: ['happy', 'sad', 'angry', 'sleepy', 'tiny'],
      subjects: ['cat', 'dog', 'house', 'tree', 'pizza'],
      suffixes: ['in space', 'on fire', 'at night', 'underwater'],
    };
    return promptData;
  }
}

/**
 * Generiert einen zufälligen Prompt
 */
export function generatePrompt(): string {
  const data = loadPromptData();

  const prefix = randomItem(data.prefixes);
  const subject = randomItem(data.subjects);
  const suffix = randomItem(data.suffixes);

  return `${prefix} ${subject} ${suffix}`;
}

/**
 * Gibt alle möglichen Kombinationen zurück (für Debugging)
 */
export function getPromptStats(): {
  prefixes: number;
  subjects: number;
  suffixes: number;
  totalCombinations: number;
} {
  const data = loadPromptData();
  return {
    prefixes: data.prefixes.length,
    subjects: data.subjects.length,
    suffixes: data.suffixes.length,
    totalCombinations: data.prefixes.length * data.subjects.length * data.suffixes.length,
  };
}
```

---

### 3.3 Pixel-Validierung implementieren

- [ ] 📁 `apps/server/src/validation.ts` erstellen
- [ ] 🔧 Zod-Schemas für alle Inputs

**Datei:**

```typescript
// apps/server/src/validation.ts
import { z } from 'zod';
import { CANVAS } from './constants.js';

/**
 * Pixel-Daten Validierung
 */
export const PixelSchema = z.object({
  pixels: z
    .string()
    .length(CANVAS.TOTAL_PIXELS, `Pixels must be exactly ${CANVAS.TOTAL_PIXELS} characters`)
    .regex(/^[0-9A-Fa-f]+$/, 'Pixels must only contain hex characters (0-9, A-F)')
    .transform((s) => s.toUpperCase()),
});

/**
 * Prüft ob genug Pixel gesetzt wurden (Anti-AFK)
 */
export function validateMinPixels(pixels: string): { valid: boolean; setPixels: number } {
  let setPixels = 0;
  for (const char of pixels) {
    if (char !== CANVAS.BACKGROUND_COLOR) {
      setPixels++;
    }
  }

  return {
    valid: setPixels >= CANVAS.MIN_PIXELS_SET,
    setPixels,
  };
}

/**
 * Room-Code Validierung
 */
export const RoomCodeSchema = z.object({
  code: z
    .string()
    .length(4, 'Room code must be exactly 4 characters')
    .regex(/^[A-Z0-9]+$/i, 'Room code must only contain letters and numbers')
    .transform((s) => s.toUpperCase()),
});

/**
 * Username Validierung
 */
export const UsernameSchema = z.object({
  name: z
    .string()
    .min(1, 'Name cannot be empty')
    .max(20, 'Name must be 20 characters or less')
    .transform((s) => s.trim())
    // Einfache XSS-Prävention
    .transform((s) => s.replace(/[<>]/g, '')),
});

/**
 * Vote Validierung
 */
export const VoteSchema = z.object({
  chosenId: z.string().min(1, 'Must choose an image'),
});

/**
 * Stats Validierung
 */
export const StatsSchema = z.object({
  gamesPlayed: z.number().int().min(0),
  placements: z.object({
    1: z.number().int().min(0),
    2: z.number().int().min(0),
    3: z.number().int().min(0),
  }),
});

/**
 * Hilfsfunktion: Validiere mit Schema
 */
export function validate<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): { success: true; data: T } | { success: false; error: string } {
  const result = schema.safeParse(data);

  if (result.success) {
    return { success: true, data: result.data };
  }

  const error = result.error.errors[0]?.message || 'Validation failed';
  return { success: false, error };
}
```

---

### 3.4 Submission-Handler implementieren

- [ ] 🔧 Socket-Event für Submissions
- [ ] 🔧 Timing-Validierung
- [ ] 🔧 Duplikat-Prüfung

**In `socket.ts` erweitern:**

```typescript
// Import hinzufügen
import { PixelSchema, validate, validateMinPixels } from './validation.js';
import { findInstance } from './instance.js';

// In registerGameHandlers() ersetzen:
socket.on('submit-drawing', (data: unknown) => {
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

  // Phase prüfen
  if (instance.phase !== 'drawing') {
    socket.emit('error', { code: 'WRONG_PHASE', message: 'Not in drawing phase' });
    return;
  }

  // Pixel validieren
  const validation = validate(PixelSchema, data);
  if (!validation.success) {
    socket.emit('error', { code: 'INVALID_PIXELS', message: validation.error });
    return;
  }

  // Minimum Pixel prüfen
  const minCheck = validateMinPixels(validation.data.pixels);
  if (!minCheck.valid) {
    socket.emit('error', {
      code: 'TOO_FEW_PIXELS',
      message: `Need at least ${CANVAS.MIN_PIXELS_SET} non-background pixels (you have ${minCheck.setPixels})`,
    });
    return;
  }

  // Bereits submitted?
  const alreadySubmitted = instance.submissions.some((s) => s.playerId === player.id);
  if (alreadySubmitted) {
    socket.emit('error', { code: 'ALREADY_SUBMITTED', message: 'You already submitted' });
    return;
  }

  // Submission speichern
  instance.submissions.push({
    playerId: player.id,
    pixels: validation.data.pixels,
    timestamp: Date.now(),
  });

  socket.emit('submission-received', {
    success: true,
    submissionCount: instance.submissions.length,
  });

  log('Drawing', `${player.user.fullName} submitted drawing`);

  // Optional: Alle informieren wie viele submitted haben
  io.to(instance.id).emit('submission-count', {
    count: instance.submissions.length,
    total: instance.players.size,
  });
});
```

---

### 3.5 Phasen-Manager integrieren

- [ ] 🔧 In `index.ts` einbinden
- [ ] 🔧 In `instance.ts` verwenden

**In `index.ts` hinzufügen:**

```typescript
import { setPhaseIo } from './phases.js';

// Nach io-Erstellung
setPhaseIo(io);
```

**In `instance.ts` aktualisieren:**

```typescript
import { startGame as startGamePhase } from './phases.js';

// startGame Funktion durch Import ersetzen
export function startGameManually(instance: Instance): void {
  startGamePhase(instance);
}

// In checkLobbyTimer:
function checkLobbyTimer(instance: Instance): void {
  // ... bestehender Code ...

  // Bei sofort starten:
  if (playerCount >= MAX_PLAYERS_PER_INSTANCE) {
    clearTimeout(instance.lobbyTimer);
    startGamePhase(instance);
    return;
  }

  // Bei Timer-Ablauf:
  instance.lobbyTimer = setTimeout(() => {
    if (instance.players.size >= MIN_PLAYERS_TO_START) {
      startGamePhase(instance);
    }
  }, TIMERS.LOBBY_TIMEOUT);
}
```

---

### 3.6 Automatische Submission bei Timeout

- [ ] 🔧 Spieler ohne Submission bekommen leeres Bild
- [ ] 🔧 Oder werden als Spectator markiert

**In `phases.ts` erweitern:**

```typescript
function endDrawingPhase(instance: Instance): void {
  // Spieler die nicht submitted haben -> markieren
  const submittedIds = new Set(instance.submissions.map((s) => s.playerId));

  for (const [playerId, player] of instance.players) {
    if (!submittedIds.has(playerId)) {
      // Option 1: Als Spectator für diese Runde markieren
      log('Phase', `${player.user.fullName} didn't submit, moving to spectators`);
      instance.spectators.set(playerId, player);
      instance.players.delete(playerId);
    }
  }

  log('Phase', `Drawing ended: ${instance.submissions.length} valid submissions`);

  // Weiter mit Voting oder Results
  if (instance.submissions.length < 2) {
    transitionTo(instance, 'results');
  } else {
    transitionTo(instance, 'voting');
  }
}
```

---

## Kontrollpunkte

### 🧪 Test 1: Prompt wird generiert

```javascript
// Server-Log bei Spielstart
// ✅ "Starting game for instance XXX"
// ✅ Prompt im phase-changed Event enthalten
```

### 🧪 Test 2: Phasen-Übergänge

```javascript
socket.on('phase-changed', (data) => {
  console.log('Phase:', data.phase, data);
});
// ✅ countdown -> drawing -> voting -> results -> lobby
// ✅ Timer-Werte sind korrekt
```

### 🧪 Test 3: Submission funktioniert

```javascript
socket.emit('submit-drawing', { pixels: 'F'.repeat(64) });
socket.on('submission-received', (data) => {
  console.log('Submitted:', data);
  // ✅ success: true
});
```

### 🧪 Test 4: Validation blockt ungültige Daten

```javascript
// Zu kurz
socket.emit('submit-drawing', { pixels: 'FFF' });
// ✅ Error: INVALID_PIXELS

// Ungültige Zeichen
socket.emit('submit-drawing', { pixels: 'X'.repeat(64) });
// ✅ Error: INVALID_PIXELS

// Zu wenig Pixel gesetzt
socket.emit('submit-drawing', { pixels: '1'.repeat(64) });
// ✅ Error: TOO_FEW_PIXELS
```

---

## Definition of Done

- [ ] Phasen-Manager steuert Spielablauf
- [ ] Prompts werden aus JSON generiert
- [ ] Countdown-Phase (5s) funktioniert
- [ ] Zeichnen-Phase (60s) funktioniert
- [ ] Submissions werden validiert (Format, Mindest-Pixel)
- [ ] Duplikate werden verhindert
- [ ] Nicht-Submitter werden zu Spectators
- [ ] Results-Phase zeigt Submissions
- [ ] Spiel loopt zur Lobby zurück
- [ ] Alle Änderungen sind committed

---

## Dateiübersicht nach Phase 3

```
apps/server/src/
├── index.ts       ✅ PhaseIo integriert
├── socket.ts      ✅ Submit-Handler
├── instance.ts    ✅ StartGame exportiert
├── phases.ts      ✅ NEU - Phasen-Manager
├── prompts.ts     ✅ NEU - Prompt-Generator
├── validation.ts  ✅ NEU - Zod-Schemas
├── types.ts       ✅
├── constants.ts   ✅
└── utils.ts       ✅
```

---

## Nächster Schritt

👉 **Weiter zu [Phase 4: Voting-System](./phase-4-voting.md)**
