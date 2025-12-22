// apps/server/src/phases.ts
import type { Server } from 'socket.io';
import type { Instance, GamePhase } from './types.js';
import { TIMERS } from './constants.js';
import { log } from './utils.js';
import { generatePrompt } from './prompts.js';

// IO-Instanz (wird von index.ts gesetzt)
let io: Server | null = null;

export function setPhaseIo(ioInstance: Server): void {
  io = ioInstance;
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
 * Voting-Phase (Placeholder - wird in Phase 4 implementiert)
 */
function handleVoting(instance: Instance): void {
  log('Phase', `Voting started (placeholder)`);

  // Placeholder: Nach 5s zu Results
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

  // Placeholder: Nach 5s zu Results
  instance.phaseTimer = setTimeout(() => {
    transitionTo(instance, 'results');
  }, 5000);

  emitToInstance(instance, 'phase-changed', {
    phase: 'finale',
    message: 'Finale coming in Phase 4',
  });
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
