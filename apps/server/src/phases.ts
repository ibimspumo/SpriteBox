// apps/server/src/phases.ts
import type { Server } from 'socket.io';
import type { Instance, GamePhase, RankingEntry } from './types.js';
import { TIMERS, COMPRESSION } from './constants.js';
import { log } from './utils.js';
import { generatePrompt } from './prompts.js';
import {
  initVotingState,
  prepareVotingRound,
  calculateFinalistCount,
  calculateFinalRanking,
  validateFairness,
  isRoundComplete,
  type VotingState,
} from './voting.js';
import { compressIfNeeded } from './compression.js';
import { checkLobbyTimer, cleanupInstance } from './instance.js';

// IO instance (set by index.ts)
let io: Server | null = null;

// Voting-State pro Instanz speichern
const votingStates = new Map<string, VotingState>();

// === Phase Timing (Anti-Cheat) ===
interface PhaseTimings {
  phaseStartedAt: number;
  phaseEndsAt: number;
}

const instanceTimings = new Map<string, PhaseTimings>();

function setPhaseTimings(instanceId: string, duration: number): void {
  instanceTimings.set(instanceId, {
    phaseStartedAt: Date.now(),
    phaseEndsAt: Date.now() + duration,
  });
}

/**
 * Checks if an action is within the valid time window
 */
export function isWithinPhaseTime(instanceId: string, gracePeriodMs = 2000): boolean {
  const timings = instanceTimings.get(instanceId);
  if (!timings) return false;

  const now = Date.now();
  return now <= timings.phaseEndsAt + gracePeriodMs;
}

/**
 * Returns the phase timings (for anti-bot checks)
 */
export function getPhaseTimings(instanceId: string): PhaseTimings | undefined {
  return instanceTimings.get(instanceId);
}

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
 * Checks if all votes are in and triggers early phase end if so
 * Returns true if early end was triggered
 */
export function checkAndTriggerEarlyVotingEnd(instanceId: string, instance: Instance): boolean {
  const state = votingStates.get(instanceId);
  if (!state) return false;

  // Check if all assignments have been processed (all votes received)
  if (!isRoundComplete(state)) {
    return false;
  }

  log('Phase', `All votes received for round ${state.currentRound}, ending early`);

  // Clear the phase timer to prevent double-execution
  clearTimeout(instance.phaseTimer);

  // Trigger early end based on current phase
  if (instance.phase === 'voting') {
    endVotingRound(instance, state, state.currentRound);
    return true;
  }

  return false;
}

/**
 * Checks if all finale votes are in and triggers early phase end
 */
export function checkAndTriggerEarlyFinaleEnd(instanceId: string, instance: Instance, totalVoters: number): boolean {
  const state = votingStates.get(instanceId);
  if (!state) return false;

  // Check if all voters have voted
  if (state.votersVoted.size < totalVoters) {
    return false;
  }

  log('Phase', `All finale votes received, ending early`);

  // Clear the phase timer
  clearTimeout(instance.phaseTimer);

  // End finale
  endFinale(instance);
  return true;
}

/**
 * Starts the game for an instance
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
 * Transitions to a new phase
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

  // Check timer - important after round reset when players are already present
  checkLobbyTimer(instance);
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
 * Drawing phase (60 seconds)
 */
function handleDrawing(instance: Instance): void {
  // Reset submissions
  instance.submissions = [];

  // Set phase timing for anti-cheat
  setPhaseTimings(instance.id, TIMERS.DRAWING);

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
 * Ends the drawing phase
 */
function endDrawingPhase(instance: Instance): void {
  // Players who didn't submit -> move to spectators
  const submittedIds = new Set(instance.submissions.map((s) => s.playerId));

  for (const [playerId, player] of instance.players) {
    if (!submittedIds.has(playerId)) {
      log('Phase', `${player.user.fullName} didn't submit, moving to spectators`);
      instance.spectators.set(playerId, player);
      instance.players.delete(playerId);
    }
  }

  log('Phase', `Drawing ended for ${instance.id}: ${instance.submissions.length} valid submissions`);

  // At least 2 submissions for voting
  if (instance.submissions.length < 2) {
    log('Phase', `Not enough submissions, skipping to results`);
    transitionTo(instance, 'results');
    return;
  }

  // Start voting
  transitionTo(instance, 'voting');
}

/**
 * Voting phase
 */
function handleVoting(instance: Instance): void {
  // Initialize state
  const state = initVotingState(instance.submissions);
  votingStates.set(instance.id, state);

  log('Phase', `Voting started with ${state.totalRounds} rounds for ${instance.submissions.length} submissions`);

  // Start first round
  startVotingRound(instance, state, 1);
}

/**
 * Starts a voting round
 */
function startVotingRound(instance: Instance, state: VotingState, roundNumber: number): void {
  log('Phase', `Voting round ${roundNumber}/${state.totalRounds}`);

  // Set phase timing for anti-cheat
  setPhaseTimings(instance.id, TIMERS.VOTING_ROUND);

  // Calculate assignments
  const assignments = prepareVotingRound(instance, state, roundNumber);

  // IMPORTANT: Calculate endsAt once to ensure consistency
  const endsAt = Date.now() + TIMERS.VOTING_ROUND;

  // RACE CONDITION FIX: Send phase-changed FIRST
  emitToInstance(instance, 'phase-changed', {
    phase: 'voting',
    round: roundNumber,
    totalRounds: state.totalRounds,
    duration: TIMERS.VOTING_ROUND,
    endsAt,
  });

  // THEN send individual voting-round events
  for (const assignment of assignments) {
    const imageA = instance.submissions.find((s) => s.playerId === assignment.imageA);
    const imageB = instance.submissions.find((s) => s.playerId === assignment.imageB);

    if (!imageA || !imageB) continue;

    const player = instance.players.get(assignment.voterId) || instance.spectators.get(assignment.voterId);
    if (player && io) {
      io.to(player.socketId).emit('voting-round', {
        round: roundNumber,
        totalRounds: state.totalRounds,
        imageA: { playerId: imageA.playerId, pixels: imageA.pixels },
        imageB: { playerId: imageB.playerId, pixels: imageB.pixels },
        timeLimit: TIMERS.VOTING_ROUND,
        endsAt,
      });
    }
  }

  // Timer for round end
  instance.phaseTimer = setTimeout(() => {
    endVotingRound(instance, state, roundNumber);
  }, TIMERS.VOTING_ROUND);
}

/**
 * Ends a voting round
 */
function endVotingRound(instance: Instance, state: VotingState, roundNumber: number): void {
  const fairness = validateFairness(state);
  log(
    'Phase',
    `Voting round ${roundNumber} ended. Fairness: ${fairness.isFair ? 'OK' : 'WARN'} (${fairness.min}-${fairness.max})`
  );

  if (roundNumber < state.totalRounds) {
    // Next round
    startVotingRound(instance, state, roundNumber + 1);
  } else {
    // Voting ended -> Finale
    transitionTo(instance, 'finale');
  }
}

/**
 * Finale phase
 */
function handleFinale(instance: Instance): void {
  const state = votingStates.get(instance.id);
  if (!state) {
    log('Phase', `No voting state found, skipping to results`);
    transitionTo(instance, 'results');
    return;
  }

  // Set phase timing for anti-cheat
  setPhaseTimings(instance.id, TIMERS.FINALE);

  const finalistCount = calculateFinalistCount(instance.submissions.length);

  // Select top X by Elo
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

  // Initialize finale votes
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
 * Ends the finale and calculates results
 */
function endFinale(instance: Instance): void {
  const state = votingStates.get(instance.id);
  if (!state) {
    transitionTo(instance, 'results');
    return;
  }

  const ranking = calculateFinalRanking(instance.submissions, state);

  log('Phase', `Finale ended. Winner: ${ranking[0]?.playerId || 'none'}`);

  // Clean up state
  votingStates.delete(instance.id);

  // Switch to results (with ranking)
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

  // Use compression for large galleries
  const playerCount = instance.submissions.length;
  const compressedRankings = compressIfNeeded(results, playerCount);

  emitToInstance(instance, 'game-results', {
    prompt: instance.prompt,
    rankings: compressedRankings.compressed ? [] : results, // Send empty if compressed
    compressedRankings: compressedRankings.compressed ? compressedRankings.data : undefined,
    totalParticipants: instance.submissions.length,
  });

  if (compressedRankings.compressed) {
    log('Compression', `Gallery compressed for ${playerCount} players`);
  }

  // Spectators to players for next round
  for (const [id, spectator] of instance.spectators) {
    instance.players.set(id, spectator);
  }
  instance.spectators.clear();

  instance.phaseTimer = setTimeout(() => {
    resetForNextRound(instance);
  }, TIMERS.RESULTS);
}

/**
 * Results phase (15 seconds)
 */
function handleResults(instance: Instance): void {
  // Simple ranking by submission order (will be replaced by Elo in phase 4)
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

  // Make spectators players for next round
  for (const [id, spectator] of instance.spectators) {
    instance.players.set(id, spectator);
  }
  instance.spectators.clear();

  // After results: Back to lobby
  instance.phaseTimer = setTimeout(() => {
    resetForNextRound(instance);
  }, TIMERS.RESULTS);
}

/**
 * Reset for next round
 */
function resetForNextRound(instance: Instance): void {
  instance.submissions = [];
  instance.votes = [];
  instance.prompt = undefined;

  // For private instances: check if host is still present
  if (instance.type === 'private' && instance.hostId) {
    const hostStillPresent = instance.players.has(instance.hostId) || instance.spectators.has(instance.hostId);

    if (!hostStillPresent) {
      log('Phase', `Host left private instance ${instance.id}, closing room`);

      // Notify all players that the instance is closing
      emitToInstance(instance, 'instance-closing', { reason: 'host-left' });

      // Clean up the instance
      cleanupInstance(instance);
      return;
    }
  }

  // Back to lobby
  transitionTo(instance, 'lobby');

  log('Phase', `Instance ${instance.id} reset for next round`);
}

/**
 * Helper function: Send event to all in the instance
 */
function emitToInstance(instance: Instance, event: string, data: unknown): void {
  if (io) {
    io.to(instance.id).emit(event, data);
  }
}
