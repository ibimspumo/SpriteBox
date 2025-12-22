# Phase 4: Voting-System

**Ziel:** Elo-basiertes Voting implementieren, Fairness-Algorithmus, Finale-Logik, Ranking-Berechnung.

**Voraussetzungen:**
- Phase 3 abgeschlossen
- Submissions werden korrekt gespeichert
- Phasen-Manager funktioniert

---

## Aufgaben

### 4.1 Elo-Rating implementieren

- [ ] 📁 `apps/server/src/voting.ts` erstellen
- [ ] 🔧 Elo-Berechnung
- [ ] 🔧 Voting-State-Management

**Datei:**

```typescript
// apps/server/src/voting.ts
import type { Instance, Submission, Vote, VotingAssignment } from './types.js';
import { ELO, VOTING } from './constants.js';
import { shuffleArray, log } from './utils.js';

// === Voting State ===
export interface VotingState {
  voterSeenImages: Map<string, Set<string>>;  // voterId -> gesehene imageIds
  imageShowCount: Map<string, number>;         // imageId -> wie oft gezeigt
  matchupHistory: Map<string, Set<string>>;    // imageId -> gegen wen angetreten
  eloRatings: Map<string, number>;             // imageId -> Elo-Rating
  assignments: VotingAssignment[];             // Aktuelle Runden-Assignments
  currentRound: number;
  totalRounds: number;
}

/**
 * Initialisiert den Voting-State für eine Instanz
 */
export function initVotingState(submissions: Submission[]): VotingState {
  const state: VotingState = {
    voterSeenImages: new Map(),
    imageShowCount: new Map(),
    matchupHistory: new Map(),
    eloRatings: new Map(),
    assignments: [],
    currentRound: 0,
    totalRounds: 0,
  };

  // Alle Bilder starten mit gleichem Elo
  for (const sub of submissions) {
    state.eloRatings.set(sub.playerId, ELO.START_RATING);
    state.imageShowCount.set(sub.playerId, 0);
    state.matchupHistory.set(sub.playerId, new Set());
  }

  // Anzahl Runden berechnen
  state.totalRounds = calculateVotingRounds(submissions.length);

  return state;
}

/**
 * Berechnet die optimale Anzahl Voting-Runden
 */
export function calculateVotingRounds(playerCount: number): number {
  // Maximum: Jeder sieht jedes fremde Bild nur 1x
  const maxPossibleRounds = Math.floor((playerCount - 1) / 2);

  // Gewünschte Runden basierend auf Spielerzahl
  let desiredRounds: number;
  if (playerCount <= 10) desiredRounds = 3;
  else if (playerCount <= 20) desiredRounds = 4;
  else if (playerCount <= 30) desiredRounds = 5;
  else if (playerCount <= 50) desiredRounds = 6;
  else desiredRounds = 7;

  return Math.max(VOTING.MIN_ROUNDS, Math.min(maxPossibleRounds, desiredRounds));
}

/**
 * Berechnet die Anzahl Finalisten
 */
export function calculateFinalistCount(playerCount: number): number {
  // 10% der Spieler, mindestens 3, maximal 10
  return Math.min(10, Math.max(3, Math.ceil(playerCount * 0.1)));
}

// === Elo-Berechnung ===

interface EloResult {
  winnerNewElo: number;
  loserNewElo: number;
  winnerChange: number;
  loserChange: number;
}

/**
 * Berechnet neue Elo-Werte nach einem Duell
 */
export function calculateElo(winnerElo: number, loserElo: number): EloResult {
  // Erwartete Gewinnwahrscheinlichkeit
  const expectedWinner = 1 / (1 + Math.pow(10, (loserElo - winnerElo) / 400));

  // Punkte-Änderung
  const winnerChange = Math.round(ELO.K_FACTOR * (1 - expectedWinner));
  const loserChange = -winnerChange;

  return {
    winnerNewElo: winnerElo + winnerChange,
    loserNewElo: loserElo + loserChange,
    winnerChange,
    loserChange,
  };
}

// === Assignment-Algorithmus ===

/**
 * Bereitet die Assignments für eine Voting-Runde vor
 */
export function prepareVotingRound(
  instance: Instance,
  state: VotingState,
  roundNumber: number
): VotingAssignment[] {
  const submissions = instance.submissions;
  const assignments: VotingAssignment[] = [];

  // Alle aktiven Voter (Spieler + Spectators)
  const voterIds = [
    ...instance.players.keys(),
    ...instance.spectators.keys(),
  ];

  // Zufällige Reihenfolge für Fairness
  const shuffledVoters = shuffleArray(voterIds);

  for (const voterId of shuffledVoters) {
    const seen = state.voterSeenImages.get(voterId) || new Set();

    // Eigenes Bild ausschließen
    seen.add(voterId);

    // Verfügbare Bilder, sortiert nach wenigsten Anzeigen
    const available = submissions
      .filter((s) => !seen.has(s.playerId))
      .map((s) => ({
        playerId: s.playerId,
        showCount: state.imageShowCount.get(s.playerId) || 0,
      }))
      .sort((a, b) => a.showCount - b.showCount);

    if (available.length < 2) {
      continue; // Voter überspringt diese Runde
    }

    // Bestes Paar finden (noch nicht gegeneinander angetreten)
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

    assignments.push({
      voterId,
      imageA,
      imageB,
      round: roundNumber,
    });

    // State aktualisieren
    seen.add(imageA);
    seen.add(imageB);
    state.voterSeenImages.set(voterId, seen);

    state.imageShowCount.set(imageA, (state.imageShowCount.get(imageA) || 0) + 1);
    state.imageShowCount.set(imageB, (state.imageShowCount.get(imageB) || 0) + 1);

    state.matchupHistory.get(imageA)!.add(imageB);
    state.matchupHistory.get(imageB)!.add(imageA);
  }

  state.assignments = assignments;
  state.currentRound = roundNumber;

  return assignments;
}

// === Vote-Verarbeitung ===

interface VoteResult {
  success: boolean;
  error?: string;
  eloChange?: { winner: number; loser: number };
}

/**
 * Verarbeitet einen einzelnen Vote
 */
export function processVote(
  instance: Instance,
  state: VotingState,
  voterId: string,
  chosenImageId: string
): VoteResult {
  // Assignment finden
  const assignment = state.assignments.find((a) => a.voterId === voterId);

  if (!assignment) {
    return { success: false, error: 'No assignment found' };
  }

  // Gültige Wahl?
  if (chosenImageId !== assignment.imageA && chosenImageId !== assignment.imageB) {
    return { success: false, error: 'Invalid choice' };
  }

  const winnerId = chosenImageId;
  const loserId = winnerId === assignment.imageA ? assignment.imageB : assignment.imageA;

  // Elo berechnen
  const winnerElo = state.eloRatings.get(winnerId) || ELO.START_RATING;
  const loserElo = state.eloRatings.get(loserId) || ELO.START_RATING;

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
    timestamp: Date.now(),
  });

  // Assignment entfernen (wurde verarbeitet)
  state.assignments = state.assignments.filter((a) => a.voterId !== voterId);

  return {
    success: true,
    eloChange: { winner: result.winnerChange, loser: result.loserChange },
  };
}

// === Ranking ===

export interface RankedPlayer {
  playerId: string;
  elo: number;
  finalVotes: number;
  place: number;
}

/**
 * Erstellt das finale Ranking
 */
export function calculateFinalRanking(
  submissions: Submission[],
  state: VotingState,
  finaleVotes: Map<string, number>
): RankedPlayer[] {
  const ranked = submissions.map((sub) => ({
    playerId: sub.playerId,
    elo: state.eloRatings.get(sub.playerId) || ELO.START_RATING,
    finalVotes: finaleVotes.get(sub.playerId) || 0,
    place: 0,
  }));

  // Sortieren: Finale-Votes > Elo
  ranked.sort((a, b) => {
    if (a.finalVotes !== b.finalVotes) {
      return b.finalVotes - a.finalVotes;
    }
    return b.elo - a.elo;
  });

  // Platzierungen vergeben (mit Ties)
  let currentPlace = 1;
  for (let i = 0; i < ranked.length; i++) {
    if (i > 0) {
      const prev = ranked[i - 1];
      const curr = ranked[i];
      if (curr.finalVotes !== prev.finalVotes || curr.elo !== prev.elo) {
        currentPlace = i + 1;
      }
    }
    ranked[i].place = currentPlace;
  }

  return ranked;
}

// === Fairness-Check ===

export interface FairnessReport {
  isFair: boolean;
  variance: number;
  min: number;
  max: number;
  avg: number;
}

/**
 * Prüft ob alle Bilder fair oft gezeigt wurden
 */
export function validateFairness(state: VotingState): FairnessReport {
  const showCounts = [...state.imageShowCount.values()];

  if (showCounts.length === 0) {
    return { isFair: true, variance: 0, min: 0, max: 0, avg: 0 };
  }

  const min = Math.min(...showCounts);
  const max = Math.max(...showCounts);
  const avg = showCounts.reduce((a, b) => a + b, 0) / showCounts.length;

  return {
    isFair: max - min <= 2, // Max 2 Differenz erlaubt
    variance: max - min,
    min,
    max,
    avg: Math.round(avg * 10) / 10,
  };
}
```

---

### 4.2 Voting-Phasen implementieren

- [ ] 🔧 `phases.ts` für Voting erweitern
- [ ] 🔧 Runden-Logik
- [ ] 🔧 Finale-Logik

**In `phases.ts` erweitern:**

```typescript
// Imports hinzufügen
import {
  initVotingState,
  prepareVotingRound,
  calculateFinalistCount,
  calculateFinalRanking,
  validateFairness,
  type VotingState,
} from './voting.js';

// Voting-State pro Instanz speichern
const votingStates = new Map<string, VotingState>();

/**
 * Voting-Phase Handler
 */
function handleVoting(instance: Instance): void {
  // State initialisieren
  const state = initVotingState(instance.submissions);
  votingStates.set(instance.id, state);

  log('Voting', `Starting voting with ${state.totalRounds} rounds`);

  // Erste Runde starten
  startVotingRound(instance, state, 1);
}

/**
 * Startet eine Voting-Runde
 */
function startVotingRound(instance: Instance, state: VotingState, roundNumber: number): void {
  log('Voting', `Round ${roundNumber}/${state.totalRounds}`);

  // Assignments berechnen
  const assignments = prepareVotingRound(instance, state, roundNumber);

  // An jeden Voter sein Assignment senden
  for (const assignment of assignments) {
    const imageA = instance.submissions.find((s) => s.playerId === assignment.imageA);
    const imageB = instance.submissions.find((s) => s.playerId === assignment.imageB);

    if (!imageA || !imageB) continue;

    // An spezifischen Socket senden
    const player = instance.players.get(assignment.voterId) || instance.spectators.get(assignment.voterId);
    if (player) {
      io?.to(player.socketId).emit('voting-round', {
        round: roundNumber,
        totalRounds: state.totalRounds,
        imageA: { playerId: imageA.playerId, pixels: imageA.pixels },
        imageB: { playerId: imageB.playerId, pixels: imageB.pixels },
        timeLimit: TIMERS.VOTING_ROUND,
        endsAt: Date.now() + TIMERS.VOTING_ROUND,
      });
    }
  }

  // Phase-Info an alle
  emitToInstance(instance, 'phase-changed', {
    phase: 'voting',
    round: roundNumber,
    totalRounds: state.totalRounds,
    duration: TIMERS.VOTING_ROUND,
  });

  // Timer für Runden-Ende
  instance.phaseTimer = setTimeout(() => {
    endVotingRound(instance, state, roundNumber);
  }, TIMERS.VOTING_ROUND);
}

/**
 * Beendet eine Voting-Runde
 */
function endVotingRound(instance: Instance, state: VotingState, roundNumber: number): void {
  const fairness = validateFairness(state);
  log('Voting', `Round ${roundNumber} ended. Fairness: ${fairness.isFair ? 'OK' : 'WARN'} (${fairness.min}-${fairness.max})`);

  if (roundNumber < state.totalRounds) {
    // Nächste Runde
    startVotingRound(instance, state, roundNumber + 1);
  } else {
    // Voting beendet -> Finale
    startFinale(instance, state);
  }
}

/**
 * Finale-Phase
 */
function startFinale(instance: Instance, state: VotingState): void {
  const finalistCount = calculateFinalistCount(instance.submissions.length);

  // Top X nach Elo auswählen
  const sorted = [...state.eloRatings.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, finalistCount);

  const finalists = sorted.map(([playerId, elo]) => {
    const submission = instance.submissions.find((s) => s.playerId === playerId);
    const player = instance.players.get(playerId);
    return {
      playerId,
      pixels: submission?.pixels || '',
      user: player?.user,
      elo,
    };
  });

  log('Voting', `Finale with ${finalists.length} finalists`);

  // Finale-Votes initialisieren
  const finaleVotes = new Map<string, number>();
  finalists.forEach((f) => finaleVotes.set(f.playerId, 0));

  // Am State speichern
  (state as any).finaleVotes = finaleVotes;
  (state as any).finalists = finalists;

  emitToInstance(instance, 'finale-start', {
    finalists,
    timeLimit: TIMERS.FINALE,
    endsAt: Date.now() + TIMERS.FINALE,
  });

  instance.phase = 'finale';

  instance.phaseTimer = setTimeout(() => {
    endFinale(instance, state);
  }, TIMERS.FINALE);
}

/**
 * Beendet das Finale und berechnet Ergebnisse
 */
function endFinale(instance: Instance, state: VotingState): void {
  const finaleVotes = (state as any).finaleVotes as Map<string, number>;

  const ranking = calculateFinalRanking(instance.submissions, state, finaleVotes);

  log('Voting', `Finale ended. Winner: ${ranking[0]?.playerId}`);

  // State aufräumen
  votingStates.delete(instance.id);

  // Zu Results wechseln (mit Ranking)
  instance.phase = 'results';
  handleResultsWithRanking(instance, ranking);
}

/**
 * Results mit Ranking anzeigen
 */
function handleResultsWithRanking(instance: Instance, ranking: RankedPlayer[]): void {
  const results = ranking.map((r) => {
    const submission = instance.submissions.find((s) => s.playerId === r.playerId);
    const player = instance.players.get(r.playerId);
    return {
      place: r.place,
      playerId: r.playerId,
      user: player?.user || { displayName: 'Unknown', discriminator: '0000', fullName: 'Unknown#0000' },
      pixels: submission?.pixels || '',
      finalVotes: r.finalVotes,
      elo: r.elo,
    };
  });

  emitToInstance(instance, 'phase-changed', {
    phase: 'results',
    duration: TIMERS.RESULTS,
  });

  emitToInstance(instance, 'game-results', {
    prompt: instance.prompt,
    rankings: results,
    totalParticipants: instance.submissions.length,
  });

  // Spectators zu Spielern für nächste Runde
  for (const [id, spectator] of instance.spectators) {
    instance.players.set(id, spectator);
  }
  instance.spectators.clear();

  instance.phaseTimer = setTimeout(() => {
    resetForNextRound(instance);
  }, TIMERS.RESULTS);
}

// Export für Vote-Handler
export function getVotingState(instanceId: string): VotingState | undefined {
  return votingStates.get(instanceId);
}
```

---

### 4.3 Vote-Handler im Socket implementieren

- [ ] 🔧 Vote-Event in `socket.ts`
- [ ] 🔧 Finale-Vote-Event

**In `socket.ts` erweitern:**

```typescript
// Import hinzufügen
import { processVote, getVotingState } from './phases.js';

// Vote-Handler ersetzen:
socket.on('vote', (data: unknown) => {
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
  if (instance.phase !== 'voting') {
    socket.emit('error', { code: 'WRONG_PHASE' });
    return;
  }

  // Validierung
  const validation = validate(VoteSchema, data);
  if (!validation.success) {
    socket.emit('error', { code: 'INVALID_VOTE', message: validation.error });
    return;
  }

  // Voting-State holen
  const state = getVotingState(instanceId);
  if (!state) {
    socket.emit('error', { code: 'VOTING_NOT_ACTIVE' });
    return;
  }

  // Vote verarbeiten
  const result = processVote(instance, state, player.id, validation.data.chosenId);

  if (!result.success) {
    socket.emit('error', { code: 'VOTE_FAILED', message: result.error });
    return;
  }

  socket.emit('vote-received', {
    success: true,
    eloChange: result.eloChange,
  });

  log('Vote', `${player.user.fullName} voted for ${validation.data.chosenId}`);
});

// Finale-Vote
socket.on('finale-vote', (data: { playerId: string }) => {
  const instanceId = socket.data.instanceId;
  if (!instanceId) return;

  const instance = findInstance(instanceId);
  if (!instance || instance.phase !== 'finale') {
    socket.emit('error', { code: 'WRONG_PHASE' });
    return;
  }

  const state = getVotingState(instanceId);
  if (!state) return;

  const finaleVotes = (state as any).finaleVotes as Map<string, number>;
  const finalists = (state as any).finalists as any[];

  // Kann nicht für sich selbst voten
  if (data.playerId === player.id) {
    socket.emit('error', { code: 'CANNOT_VOTE_SELF' });
    return;
  }

  // Muss Finalist sein
  if (!finalists.some((f) => f.playerId === data.playerId)) {
    socket.emit('error', { code: 'INVALID_FINALIST' });
    return;
  }

  // Vote zählen
  finaleVotes.set(data.playerId, (finaleVotes.get(data.playerId) || 0) + 1);

  socket.emit('finale-vote-received', { success: true });
  log('Finale', `${player.user.fullName} voted for ${data.playerId}`);
});
```

---

### 4.4 Vote-Schema zur Validation hinzufügen

- [ ] 🔧 Erweiterte Validation

**In `validation.ts`:**

```typescript
// VoteSchema ist bereits definiert, aber erweitern für Finale:
export const FinaleVoteSchema = z.object({
  playerId: z.string().min(1, 'Must choose a finalist'),
});
```

---

## Kontrollpunkte

### 🧪 Test 1: Elo-Berechnung

```javascript
// Unit-Test
import { calculateElo } from './voting.js';

const result = calculateElo(1000, 1000);
console.log(result);
// ✅ winnerChange === 16
// ✅ loserChange === -16

const upset = calculateElo(800, 1200);
console.log(upset);
// ✅ winnerChange > 20 (Überraschungssieg)
```

### 🧪 Test 2: Voting-Runden laufen

```javascript
socket.on('voting-round', (data) => {
  console.log('Voting round:', data);
  // ✅ round, totalRounds, imageA, imageB vorhanden
  // ✅ Bilder sind unterschiedlich
  // ✅ Eigenes Bild nie dabei
});
```

### 🧪 Test 3: Vote wird verarbeitet

```javascript
socket.emit('vote', { chosenId: 'player-id-123' });
socket.on('vote-received', (data) => {
  console.log('Vote received:', data);
  // ✅ success: true
  // ✅ eloChange vorhanden
});
```

### 🧪 Test 4: Finale zeigt Top-Spieler

```javascript
socket.on('finale-start', (data) => {
  console.log('Finalists:', data.finalists);
  // ✅ Richtige Anzahl Finalisten
  // ✅ Nach Elo sortiert
});
```

### 🧪 Test 5: Ergebnisse korrekt

```javascript
socket.on('game-results', (data) => {
  console.log('Results:', data.rankings);
  // ✅ Platz 1 hat höchste Finale-Votes
  // ✅ Bei Tie: höherer Elo gewinnt
});
```

---

## Definition of Done

- [ ] Elo-Berechnung ist korrekt implementiert
- [ ] Voting-Runden laufen automatisch (5s pro Runde)
- [ ] Anzahl Runden basiert auf Spielerzahl
- [ ] Fairness: Jedes Bild wird ~gleich oft gezeigt
- [ ] Votes aktualisieren Elo-Ratings live
- [ ] Finale zeigt Top 10% nach Elo
- [ ] Finale-Votes bestimmen Gewinner
- [ ] Rankings werden korrekt berechnet (Votes > Elo)
- [ ] Ties werden korrekt gehandhabt
- [ ] Alle Änderungen sind committed

---

## Dateiübersicht nach Phase 4

```
apps/server/src/
├── index.ts
├── socket.ts      ✅ Vote-Handler
├── instance.ts
├── phases.ts      ✅ Voting-Integration
├── voting.ts      ✅ NEU - Elo & Fairness
├── prompts.ts
├── validation.ts  ✅ Vote-Schemas
├── types.ts
├── constants.ts
└── utils.ts
```

---

## Nächster Schritt

👉 **Weiter zu [Phase 5: Frontend-Grundgerüst](./phase-5-frontend.md)**
