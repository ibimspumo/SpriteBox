// apps/server/src/phases.ts
import type { Server } from 'socket.io';
import type { Instance, GamePhase, RankingEntry } from './types.js';
import { TIMERS } from './constants.js';
import { log } from './utils.js';
import { generatePrompt } from './prompts.js';
import {
  initVotingState,
  prepareVotingRound,
  calculateFinalistCount,
  calculateFinalRanking,
  validateFairness,
  type VotingState,
} from './voting.js';

// IO-Instanz (wird von index.ts gesetzt)
let io: Server | null = null;

// Voting-State pro Instanz speichern
const votingStates = new Map<string, VotingState>();

export function setPhaseIo(ioInstance: Server): void {
  io = ioInstance;
}

/**
 * Get voting state for an instance (used by socket handlers)
 */
export function getVotingState(instanceId: string): VotingState | undefined {
  return votingStates.get(instanceId);
}

/**
 * Startet das Spiel für eine Instanz
 */
export function startGame(instance: Instance): void {
  clearTimeout(instance.lobbyTimer);
  instance.lobbyTimer = undefined;

  log('Phase', `Starting game for instance ${instance.id} with ${instance.players.size} players`);

  // Prompt generieren
  instance.prompt = generatePrompt();
  log('Phase', `Prompt: "${instance.prompt}"`);

  // Countdown starten
  transitionTo(instance, 'countdown');
}

/**
 * Wechselt zu einer neuen Phase
 */
export function transitionTo(instance: Instance, phase: GamePhase): void {
  instance.phase = phase;
  instance.lastActivity = Date.now();

  clearTimeout(instance.phaseTimer);

  log('Phase', `Instance ${instance.id} -> ${phase}`);

  switch (phase) {
    case 'lobby':
      handleLobby(instance);
      break;
    case 'countdown':
      handleCountdown(instance);
      break;
    case 'drawing':
      handleDrawing(instance);
      break;
    case 'voting':
      handleVoting(instance);
      break;
    case 'finale':
      handleFinale(instance);
      break;
    case 'results':
      handleResults(instance);
      break;
  }
}

/**
 * Lobby-Phase (zurücksetzen)
 */
function handleLobby(instance: Instance): void {
  emitToInstance(instance, 'phase-changed', {
    phase: 'lobby',
    message: 'Waiting for next round',
  });
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
  // Spieler die nicht submitted haben -> zu Spectators verschieben
  const submittedIds = new Set(instance.submissions.map((s) => s.playerId));

  for (const [playerId, player] of instance.players) {
    if (!submittedIds.has(playerId)) {
      log('Phase', `${player.user.fullName} didn't submit, moving to spectators`);
      instance.spectators.set(playerId, player);
      instance.players.delete(playerId);
    }
  }

  log('Phase', `Drawing ended for ${instance.id}: ${instance.submissions.length} valid submissions`);

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
 * Voting-Phase
 */
function handleVoting(instance: Instance): void {
  // State initialisieren
  const state = initVotingState(instance.submissions);
  votingStates.set(instance.id, state);

  log('Phase', `Voting started with ${state.totalRounds} rounds for ${instance.submissions.length} submissions`);

  // Erste Runde starten
  startVotingRound(instance, state, 1);
}

/**
 * Startet eine Voting-Runde
 */
function startVotingRound(instance: Instance, state: VotingState, roundNumber: number): void {
  log('Phase', `Voting round ${roundNumber}/${state.totalRounds}`);

  // Assignments berechnen
  const assignments = prepareVotingRound(instance, state, roundNumber);

  // An jeden Voter sein Assignment senden
  for (const assignment of assignments) {
    const imageA = instance.submissions.find((s) => s.playerId === assignment.imageA);
    const imageB = instance.submissions.find((s) => s.playerId === assignment.imageB);

    if (!imageA || !imageB) continue;

    // An spezifischen Socket senden
    const player = instance.players.get(assignment.voterId) || instance.spectators.get(assignment.voterId);
    if (player && io) {
      io.to(player.socketId).emit('voting-round', {
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
    endsAt: Date.now() + TIMERS.VOTING_ROUND,
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
  log(
    'Phase',
    `Voting round ${roundNumber} ended. Fairness: ${fairness.isFair ? 'OK' : 'WARN'} (${fairness.min}-${fairness.max})`
  );

  if (roundNumber < state.totalRounds) {
    // Nächste Runde
    startVotingRound(instance, state, roundNumber + 1);
  } else {
    // Voting beendet -> Finale
    transitionTo(instance, 'finale');
  }
}

/**
 * Finale-Phase
 */
function handleFinale(instance: Instance): void {
  const state = votingStates.get(instance.id);
  if (!state) {
    log('Phase', `No voting state found, skipping to results`);
    transitionTo(instance, 'results');
    return;
  }

  const finalistCount = calculateFinalistCount(instance.submissions.length);

  // Top X nach Elo auswählen
  const sorted = [...state.eloRatings.entries()].sort((a, b) => b[1] - a[1]).slice(0, finalistCount);

  const finalists = sorted.map(([playerId, elo]) => {
    const submission = instance.submissions.find((s) => s.playerId === playerId);
    const player = instance.players.get(playerId) || instance.spectators.get(playerId);
    return {
      playerId,
      pixels: submission?.pixels || '',
      user: player?.user || { displayName: 'Unknown', discriminator: '0000', fullName: 'Unknown#0000' },
      elo,
    };
  });

  log('Phase', `Finale with ${finalists.length} finalists`);

  // Finale-Votes initialisieren
  state.finaleVotes.clear();
  state.finalists = finalists.map((f) => ({ playerId: f.playerId, pixels: f.pixels, elo: f.elo }));
  state.votersVoted.clear();
  finalists.forEach((f) => state.finaleVotes.set(f.playerId, 0));

  emitToInstance(instance, 'finale-start', {
    finalists,
    timeLimit: TIMERS.FINALE,
    endsAt: Date.now() + TIMERS.FINALE,
  });

  emitToInstance(instance, 'phase-changed', {
    phase: 'finale',
    duration: TIMERS.FINALE,
    endsAt: Date.now() + TIMERS.FINALE,
  });

  instance.phaseTimer = setTimeout(() => {
    endFinale(instance);
  }, TIMERS.FINALE);
}

/**
 * Beendet das Finale und berechnet Ergebnisse
 */
function endFinale(instance: Instance): void {
  const state = votingStates.get(instance.id);
  if (!state) {
    transitionTo(instance, 'results');
    return;
  }

  const ranking = calculateFinalRanking(instance.submissions, state);

  log('Phase', `Finale ended. Winner: ${ranking[0]?.playerId || 'none'}`);

  // State aufräumen
  votingStates.delete(instance.id);

  // Zu Results wechseln (mit Ranking)
  handleResultsWithRanking(instance, ranking);
}

/**
 * Results mit Ranking anzeigen
 */
function handleResultsWithRanking(instance: Instance, ranking: ReturnType<typeof calculateFinalRanking>): void {
  instance.phase = 'results';

  const results: RankingEntry[] = ranking.map((r) => {
    const submission = instance.submissions.find((s) => s.playerId === r.playerId);
    const player = instance.players.get(r.playerId) || instance.spectators.get(r.playerId);
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

/**
 * Ergebnis-Phase (15 Sekunden)
 */
function handleResults(instance: Instance): void {
  // Einfaches Ranking nach Eingangsreihenfolge (wird in Phase 4 durch Elo ersetzt)
  const rankings = instance.submissions.map((sub, index) => {
    const player = instance.players.get(sub.playerId) || instance.spectators.get(sub.playerId);
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

  log('Phase', `Instance ${instance.id} reset for next round`);
}

/**
 * Hilfsfunktion: Event an alle in der Instanz senden
 */
function emitToInstance(instance: Instance, event: string, data: unknown): void {
  if (io) {
    io.to(instance.id).emit(event, data);
  }
}
