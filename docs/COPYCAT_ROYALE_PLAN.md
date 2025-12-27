# CopyCat Royale - Battle Royale Spielmodus

## Übersicht

**CopyCat Royale** ist ein Battle Royale Pixel-Art Spielmodus, bei dem Spieler sich gegenseitig im Nachzeichnen von selbst erstellten Bildern messen. Jede Runde wird ein Bild aus dem Pool gezogen und alle müssen es nachzeichnen. Die schlechtesten Spieler werden eliminiert, bis nur noch ein Gewinner übrig bleibt.

### Kernkonzept

1. **Erste Runde**: Alle Spieler zeichnen frei (30 Sekunden) → Bilder kommen in den Pool
2. **Folgerunden**: Ein zufälliges Bild aus dem Pool wird ausgewählt → Alle zeichnen es nach (25 Sekunden)
3. **Elimination**: Nach jeder Runde werden die schlechtesten X% eliminiert
4. **Finale**: Die letzten 3 Spieler kämpfen in Einzelrunden bis zum Gewinner

---

## Spielparameter

| Parameter | Wert |
|-----------|------|
| Spieleranzahl | 10 - 100 |
| Maximale Runden | 10 |
| Lobby-Timer | 30 Sekunden |
| Erste Runde (Freies Zeichnen) | 30 Sekunden |
| Kopier-Runden | 25 Sekunden |
| Ergebnis-Anzeige pro Runde | 8 Sekunden |
| Countdown vor Runde | 5 Sekunden |
| **Minimum Pixel zum Zeichnen** | **5 Pixel** |
| **Referenzbild beim Zeichnen** | **Nicht sichtbar (Gedächtnis-Test)** |

---

## Phasen-Ablauf

```
lobby → countdown → initial-drawing → [round-loop] → finale → winner
                                           ↓
                              [show-reference → drawing → results → elimination]
```

### Phase 1: Lobby
- **Timer**: 30 Sekunden (nach Erreichen von 10 Spielern)
- **Verhalten**: Spieler treten bei, Host kann früher starten (Private Rooms)
- **Mindestens**: 10 Spieler zum Starten

### Phase 2: Countdown
- **Timer**: 5 Sekunden
- **Anzeige**: "Bereitet euch vor! Zeichnet gleich euer eigenes Bild!"

### Phase 3: Initial Drawing (Freies Zeichnen)
- **Timer**: 30 Sekunden
- **Verhalten**:
  - Alle Spieler zeichnen frei was sie wollen
  - Kein Prompt, keine Vorgabe
  - Nach Ablauf: Alle Bilder werden im Pool gespeichert
- **UI**: Normaler Zeichenmodus ohne Referenzbild

### Phase 4: Round Loop (Wiederholende Runden)

Jede Kopier-Runde besteht aus 4 Unterphasen:

#### 4a: Show Reference (Referenzbild anzeigen)
- **Timer**: 5 Sekunden
- **Verhalten**:
  - Zufälliges, noch nicht verwendetes Bild aus dem Pool wählen
  - Allen aktiven Spielern anzeigen
  - Eliminierte Spieler (Zuschauer) sehen es auch
- **UI**: Großes Referenzbild in der Mitte, Countdown

#### 4b: Drawing (Nachzeichnen)
- **Timer**: 25 Sekunden
- **Verhalten**:
  - **Referenzbild ist NICHT sichtbar** (reiner Gedächtnis-Test)
  - Spieler zeichnen aus dem Gedächtnis
  - Zuschauer können zusehen
  - **Minimum 5 Pixel müssen gesetzt werden** (sonst 0% Accuracy)
- **Submission**: Automatisch bei Timer-Ende

#### 4c: Results (Ergebnisse)
- **Timer**: 8 Sekunden
- **Anzeige**:
  - Referenzbild
  - Alle Spieler-Zeichnungen mit Accuracy %
  - Sortiert nach Accuracy (beste zuerst)
  - Markierung wer eliminiert wird (rote Border)
  - Wer überlebt (grüne Border)

#### 4d: Elimination
- **Verhalten**:
  - Berechnung wer eliminiert wird (siehe Bracket-System)
  - Eliminierte Spieler → Zuschauer-Status
  - Bilder bleiben im Pool
  - Check: Sind noch > 3 Spieler übrig?
    - Ja → Nächste Runde (4a)
    - Nein → Finale-Phase

### Phase 5: Finale (Top 3 → Top 2 → Winner)

Die letzten 3 Spieler haben 2 finale Runden:

#### Runde 1: Top 3 → Top 2
- Neues Referenzbild aus Pool
- 25 Sekunden zeichnen
- Schlechtester wird eliminiert

#### Runde 2: Top 2 → Winner
- Letztes Referenzbild aus Pool
- 25 Sekunden zeichnen
- Schlechterer wird eliminiert
- Gewinner wird gekrönt

### Phase 6: Winner Display (Ergebnisse)

- **Timer**: 15 Sekunden (Auto-Redirect nach Ablauf)
- **Anzeige**:
  - Gewinner mit Konfetti/Animation
  - Finale Rangliste aller Spieler
  - Statistiken (Durchschnittliche Accuracy, beste Runde, etc.)
- **Buttons** (wie bei anderen Modi):
  - **"Nochmal spielen"** → `returnToLobby()` - Bleibt im gleichen Lobby für neue Runde
  - **"Anderer Modus"** → `leaveLobby()` + `goto('/play')` - Zurück zur Mode-Auswahl
- **Auto-Redirect**: Nach 15 Sekunden Inaktivität → Mode-Auswahl (`/play`)
- **Server-Side**: `resetForNextRound(instance)` wird aufgerufen nach Timer-Ende

#### Socket Events Pattern (wie Results.svelte)

```typescript
// Server sendet
emitToInstance(instance, 'phase-changed', {
  phase: 'royale-winner',
  duration: 15000,
  endsAt: Date.now() + 15000
});

emitToInstance(instance, 'royale-winner', {
  winner,
  allResults,
  totalRounds,
  duration: 15000,
  endsAt: Date.now() + 15000
});

// Nach 15 Sekunden
instance.phaseTimer = setTimeout(() => {
  resetForNextRound(instance); // → Lobby Phase
}, 15000);
```

---

## Elimination Bracket System

### Anforderungen
- Maximal 10 Runden total
- Letzte 2 Runden: jeweils 1 Spieler eliminiert (Top 3 → 2 → 1)
- Davor: Dynamische Elimination basierend auf Spieleranzahl

### Algorithmus

```typescript
interface EliminationBracket {
  round: number;
  playersStart: number;
  playersEnd: number;
  eliminateCount: number;
}

function calculateBracket(playerCount: number): EliminationBracket[] {
  const brackets: EliminationBracket[] = [];

  // Finale Runden sind fix
  // Runde N-1: 3 → 2 (eliminiere 1)
  // Runde N: 2 → 1 (eliminiere 1)

  // Berechne wie viele Runden wir brauchen um von playerCount auf 3 zu kommen
  let remaining = playerCount;
  let roundsBeforeFinale = 0;

  // Ziel: Mit etwa 30-50% Elimination pro Runde auf 3 kommen
  // Maximal 8 Runden vor dem Finale (da Finale = 2 Runden)

  const targetBeforeFinale = 3;
  const maxRoundsBeforeFinale = 8;

  // Berechne Elimination Rate
  // Formel: remaining * (1 - rate)^rounds = target
  // rate = 1 - (target / remaining)^(1/rounds)

  // Dynamische Berechnung der optimalen Rundenanzahl
  let bestRounds = 1;
  for (let r = 1; r <= maxRoundsBeforeFinale; r++) {
    const endPlayers = Math.ceil(remaining * Math.pow(0.5, r));
    if (endPlayers <= targetBeforeFinale) {
      bestRounds = r;
      break;
    }
  }

  // Verteile Eliminationen gleichmäßig
  let currentPlayers = playerCount;
  for (let round = 1; round <= bestRounds; round++) {
    const isLastRoundBeforeFinale = round === bestRounds;

    let targetEnd: number;
    if (isLastRoundBeforeFinale) {
      targetEnd = 3; // Muss auf 3 enden
    } else {
      // Etwa 40-50% pro Runde eliminieren
      const eliminationRate = 0.45;
      targetEnd = Math.max(
        3,
        Math.ceil(currentPlayers * (1 - eliminationRate))
      );
    }

    brackets.push({
      round,
      playersStart: currentPlayers,
      playersEnd: targetEnd,
      eliminateCount: currentPlayers - targetEnd
    });

    currentPlayers = targetEnd;
  }

  // Finale Runden hinzufügen
  const finaleRound1 = brackets.length + 1;
  brackets.push({
    round: finaleRound1,
    playersStart: 3,
    playersEnd: 2,
    eliminateCount: 1
  });

  brackets.push({
    round: finaleRound1 + 1,
    playersStart: 2,
    playersEnd: 1,
    eliminateCount: 1
  });

  return brackets;
}
```

### Beispiel-Brackets

#### 10 Spieler
| Runde | Start | Ende | Eliminiert |
|-------|-------|------|------------|
| 1 | 10 | 5 | 5 (50%) |
| 2 | 5 | 3 | 2 (40%) |
| 3 | 3 | 2 | 1 (Finale) |
| 4 | 2 | 1 | 1 (Finale) |

**Total: 4 Runden**

#### 25 Spieler
| Runde | Start | Ende | Eliminiert |
|-------|-------|------|------------|
| 1 | 25 | 14 | 11 (44%) |
| 2 | 14 | 8 | 6 (43%) |
| 3 | 8 | 5 | 3 (37%) |
| 4 | 5 | 3 | 2 (40%) |
| 5 | 3 | 2 | 1 (Finale) |
| 6 | 2 | 1 | 1 (Finale) |

**Total: 6 Runden**

#### 50 Spieler
| Runde | Start | Ende | Eliminiert |
|-------|-------|------|------------|
| 1 | 50 | 28 | 22 (44%) |
| 2 | 28 | 15 | 13 (46%) |
| 3 | 15 | 8 | 7 (47%) |
| 4 | 8 | 5 | 3 (37%) |
| 5 | 5 | 3 | 2 (40%) |
| 6 | 3 | 2 | 1 (Finale) |
| 7 | 2 | 1 | 1 (Finale) |

**Total: 7 Runden**

#### 100 Spieler
| Runde | Start | Ende | Eliminiert |
|-------|-------|------|------------|
| 1 | 100 | 55 | 45 (45%) |
| 2 | 55 | 30 | 25 (45%) |
| 3 | 30 | 17 | 13 (43%) |
| 4 | 17 | 9 | 8 (47%) |
| 5 | 9 | 5 | 4 (44%) |
| 6 | 5 | 3 | 2 (40%) |
| 7 | 3 | 2 | 1 (Finale) |
| 8 | 2 | 1 | 1 (Finale) |

**Total: 8 Runden**

---

## Tie-Breaker Regeln

Bei gleicher Accuracy entscheidet die **Zeichenzeit** (schnellster gewinnt).

```typescript
function sortByAccuracyAndTime(results: PlayerResult[]): PlayerResult[] {
  return results.sort((a, b) => {
    // Primär: Höhere Accuracy = besser
    if (b.accuracy !== a.accuracy) {
      return b.accuracy - a.accuracy;
    }
    // Sekundär: Frühere Submission = besser
    return a.submitTime - b.submitTime;
  });
}
```

---

## Zuschauer-System

### Eliminierte Spieler werden Zuschauer
- Behalten Verbindung zum Spiel
- Sehen alle Phasen (Referenzbild, Zeichnungen, Ergebnisse)
- Können nicht mehr zeichnen
- Können Chat nutzen (falls implementiert)

### Zuschauer-Status
```typescript
interface Player {
  id: string;
  user: User;
  isEliminated: boolean;
  eliminatedInRound: number | null;
  submission: Submission | null;
}
```

### Socket Events für Zuschauer
- Zuschauer erhalten alle Game-Events
- `player-eliminated` Event bei Elimination
- `spectator-joined` Event (optional)

---

## Bilderpool-System

### Pool-Struktur
```typescript
interface ImagePool {
  images: PoolImage[];
  usedImageIds: Set<string>;
}

interface PoolImage {
  id: string;           // Unique ID
  pixels: string;       // 64-char hex string
  creatorId: string;    // Player ID des Erstellers
  creatorName: string;  // Display Name
  isCreatorEliminated: boolean;
}
```

### Pool-Regeln
1. **Initial Drawing**: Alle Spieler-Bilder werden zum Pool hinzugefügt
2. **Auswahl**: Zufällige Auswahl aus nicht-verwendeten Bildern
3. **Keine Wiederholung**: Jedes Bild wird nur einmal verwendet
4. **Eliminierte Bilder**: Bleiben im Pool verfügbar
5. **Edge Case**: Wenn Pool leer (mehr Runden als Bilder), recyclen

### Pool-Funktionen
```typescript
function getRandomUnusedImage(pool: ImagePool): PoolImage | null {
  const unused = pool.images.filter(img => !pool.usedImageIds.has(img.id));
  if (unused.length === 0) return null;

  const index = crypto.randomInt(0, unused.length);
  const selected = unused[index];
  pool.usedImageIds.add(selected.id);

  return selected;
}
```

---

## Dateistruktur - Neue/Geänderte Dateien

### Server (apps/server/src/)

```
gameModes/modes/
└── copyCatRoyale.ts          # NEU: Game Mode Konfiguration

phases/strategies/
└── CopyCatRoyalePhaseManager.ts  # NEU: Phase Manager

lobby/strategies/
└── CopyCatRoyaleLobbyStrategy.ts # NEU: Lobby Strategy

copycatRoyale.ts               # NEU: Core Game Logic
├── initializeCopyCatRoyaleState()
├── createImagePool()
├── addToImagePool()
├── getRandomPoolImage()
├── calculateEliminationBracket()
├── determineEliminations()
├── recordRoundSubmission()
├── getRoundResults()
└── isGameOver()

phases.ts                       # ÄNDERN: Neue Phase Handler hinzufügen
├── handleCopyCatRoyaleInitialDrawing()
├── handleCopyCatRoyaleShowReference()
├── handleCopyCatRoyaleDrawing()
├── handleCopyCatRoyaleResults()
├── handleCopyCatRoyaleElimination()
├── handleCopyCatRoyaleFinale()
└── handleCopyCatRoyaleWinner()

socket.ts                       # ÄNDERN: Neue Events
types.ts                        # ÄNDERN: Neue Types
```

### Client (apps/web/src/lib/)

```
components/features/CopyCatRoyale/
├── index.svelte               # NEU: Main Component
├── InitialDrawing.svelte      # NEU: Freies Zeichnen Phase
├── ShowReference.svelte       # NEU: Referenzbild anzeigen
├── RoyaleDrawing.svelte       # NEU: Nachzeichnen Phase
├── RoundResults.svelte        # NEU: Runden-Ergebnisse mit Elimination
├── EliminationOverlay.svelte  # NEU: "Du wurdest eliminiert" Overlay
├── SpectatorView.svelte       # NEU: Zuschauer-Ansicht
├── WinnerDisplay.svelte       # NEU: Gewinner-Anzeige
└── BracketDisplay.svelte      # NEU: Turnier-Bracket Visualisierung

stores.ts                       # ÄNDERN: Neue State
socket.ts                       # ÄNDERN: Neue Event Handler
```

### i18n (apps/web/src/lib/i18n/translations/)

```
types.ts    # ÄNDERN: Neue Translation Keys
en.ts       # ÄNDERN: English Translations
de.ts       # ÄNDERN: German Translations
```

---

## Socket Events

### Server → Client

```typescript
// Initiales Zeichnen
'royale-initial-drawing': {
  duration: number;       // 30000ms
  endsAt: number;        // Timestamp
}

// Referenzbild anzeigen
'royale-show-reference': {
  referenceImage: string;      // 64-char hex
  imageCreator: string;        // Display Name des Erstellers
  round: number;               // Aktuelle Runde
  totalRounds: number;         // Geschätzte Gesamtrunden
  remainingPlayers: number;    // Noch aktive Spieler
  duration: number;            // 5000ms
  endsAt: number;
}

// Zeichenphase
'royale-drawing': {
  round: number;
  duration: number;       // 25000ms
  endsAt: number;
}

// Runden-Ergebnisse
'royale-round-results': {
  round: number;
  referenceImage: string;
  results: RoyaleRoundResult[];
  eliminated: string[];        // Player IDs die eliminiert wurden
  surviving: string[];         // Player IDs die überleben
  eliminationThreshold: number; // Accuracy % der Grenze
  duration: number;            // 8000ms
  endsAt: number;
}

// Spieler eliminiert (an alle)
'royale-player-eliminated': {
  playerId: string;
  user: User;
  round: number;
  accuracy: number;
  finalRank: number;      // Platzierung
}

// Finale Info
'royale-finale': {
  finalists: User[];      // Top 3 oder 2
  round: number;          // Finale Runde 1 oder 2
}

// Gewinner
'royale-winner': {
  winner: User;
  winningAccuracy: number;
  totalRounds: number;
  allResults: FinalRanking[];
  duration: number;       // 15000ms
  endsAt: number;
}
```

### Client → Server

```typescript
// Submission (Initial + Runden)
'royale-submit': {
  pixels: string;         // 64-char hex
}
```

---

## TypeScript Types

### Server Types
```typescript
interface CopyCatRoyaleState {
  imagePool: ImagePool;
  usedImageIds: Set<string>;
  currentReferenceImage: PoolImage | null;
  eliminationBracket: EliminationBracket[];
  currentRound: number;
  roundResults: Map<number, RoundResult>;
  playerStatus: Map<string, PlayerRoyaleStatus>;
  isFinale: boolean;
}

interface PlayerRoyaleStatus {
  isEliminated: boolean;
  eliminatedInRound: number | null;
  totalAccuracy: number;        // Summe aller Accuracies
  roundsPlayed: number;
  submissions: Map<number, Submission>;
}

interface RoundResult {
  round: number;
  referenceImage: PoolImage;
  results: PlayerRoundResult[];
  eliminated: string[];
}

interface PlayerRoundResult {
  playerId: string;
  user: User;
  pixels: string;
  accuracy: number;
  matchingPixels: number;
  submitTime: number;
  wasEliminated: boolean;
}
```

### Client Types
```typescript
interface CopyCatRoyaleClientState {
  phase: RoyalePhase;
  currentRound: number;
  totalRounds: number;
  remainingPlayers: number;
  isEliminated: boolean;
  isSpectator: boolean;
  currentReference: string | null;
  imageCreator: string | null;
  lastRoundResults: RoyaleRoundResult[] | null;
  myAccuracy: number | null;
  eliminationBracket: ClientEliminationBracket[];
  winner: User | null;
}

type RoyalePhase =
  | 'initial-drawing'
  | 'show-reference'
  | 'drawing'
  | 'results'
  | 'finale'
  | 'winner';
```

---

## UI/UX Design

### Initial Drawing Phase
- Klarer Hinweis: "Zeichne dein eigenes Bild!"
- Keine Referenz sichtbar
- Timer gut sichtbar
- Hinweis dass Bilder von anderen nachgezeichnet werden

### Show Reference Phase
- Großes, zentriertes Referenzbild
- Animation beim Erscheinen (Fade-in, Glow)
- Zeigt: "Bild von [Spielername]"
- Countdown: "Merken: 5...4...3...2...1"
- Runden-Anzeige: "Runde 3/7"

### Drawing Phase

- **Referenzbild ist NICHT sichtbar** (reiner Gedächtnis-Test)
- Standard Zeichenfläche
- Timer prominent
- Spieleranzahl anzeigen: "12 Spieler übrig"
- Hinweis: "Minimum 5 Pixel" (falls noch nicht erreicht)

### Results Phase
- Alle Zeichnungen in Grid
- Sortiert nach Accuracy
- Grüne Border = überlebt
- Rote Border = eliminiert
- Eigene Zeichnung hervorgehoben
- Animation: Eliminierte "fallen raus"

### Elimination Overlay
- Wird eliminiertem Spieler angezeigt
- "Du wurdest eliminiert!"
- Eigene Stats: Accuracy, Platzierung
- Button: "Als Zuschauer weiterschauen"

### Spectator View
- Gedimmte UI / "Zuschauer" Badge
- Kann alles sehen
- Kann nicht zeichnen
- Chat verfügbar (falls implementiert)

### Winner Display

- Konfetti Animation
- Großes Winner-Badge
- Finale Rangliste aller Spieler
- **Zwei Buttons** (wie bei anderen Modi):
  - "Nochmal spielen" → Zurück zur Lobby (gleicher Modus)
  - "Anderer Modus" → Zur Mode-Auswahl
- Auto-Redirect nach 15 Sekunden zur Mode-Auswahl

---

## Implementierungs-Reihenfolge

### Phase 1: Core Server Logic
1. `copycatRoyale.ts` - Basis-Logik
2. `gameModes/modes/copyCatRoyale.ts` - Mode Config
3. `phases/strategies/CopyCatRoyalePhaseManager.ts`
4. `lobby/strategies/CopyCatRoyaleLobbyStrategy.ts`

### Phase 2: Server Integration
5. Types in `types.ts`
6. Socket Events in `socket.ts`
7. Phase Handler in `phases.ts`
8. Game Mode Registration in `gameModes/index.ts`

### Phase 3: Client State
9. CopyCatRoyale State in `stores.ts`
10. Socket Handler in `socket.ts`
11. i18n Translations

### Phase 4: Client UI
12. `InitialDrawing.svelte`
13. `ShowReference.svelte`
14. `RoyaleDrawing.svelte`
15. `RoundResults.svelte`
16. `EliminationOverlay.svelte`
17. `SpectatorView.svelte`
18. `WinnerDisplay.svelte`
19. `index.svelte` (Main Component)

### Phase 5: Polish
20. Animationen
21. Bracket-Visualisierung
22. Sound Effects (optional)
23. Testing & Balancing

---

## Entschiedene Parameter

| Entscheidung                | Wert                                                   |
| --------------------------- | ------------------------------------------------------ |
| Referenzbild beim Zeichnen  | ❌ Nicht sichtbar (Gedächtnis-Test)                    |
| Minimum Pixel               | 5 Pixel                                                |
| Nach Spielende              | Auswahl wie andere Modi (Play Again / Anderer Modus)   |

## Offene Fragen (Optional)

### Während der Implementierung zu klären

1. **Spectator Chat?**
   - Aktuell nicht implementiert
   - Wäre nice-to-have für Zuschauer

2. **Animations-Intensität**
   - Elimination: Dramatisch oder dezent?
   - Winner: Viel Konfetti oder elegant?

---

## Testplan

### Unit Tests
- Elimination Bracket Berechnung
- Tie-Breaker Logik
- Pool Management
- Accuracy Berechnung

### Integration Tests
- Kompletter Game Flow
- Spectator Transitions
- Edge Cases (genau 10 Spieler, 100 Spieler)

### E2E Tests
- Mehrere Spieler gleichzeitig
- Disconnect/Reconnect während Runde
- Late Join Handling (sollte blockiert sein)

---

## Geschätzter Scope

| Bereich | Dateien | Komplexität |
|---------|---------|-------------|
| Server Core Logic | 4 | Mittel |
| Server Integration | 4 | Mittel |
| Client State | 3 | Niedrig |
| Client UI | 8 | Hoch |
| i18n | 3 | Niedrig |
| Testing | - | Mittel |

**Gesamt: ~22 Dateien, davon 8 komplett neue Components**
