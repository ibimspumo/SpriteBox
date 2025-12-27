// apps/server/src/phases.ts
import type { Server } from 'socket.io';
import type { Instance, GamePhase, RankingEntry } from './types.js';
import { TIMERS } from './constants.js';
import { log } from './utils.js';
import { generatePromptIndices, assemblePromptFromIndices } from './prompts.js';
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
import { getPhaseManager } from './phases/index.js';
import { shouldCompress } from './gameModes/index.js';
import {
  initializeCopyCatState,
  reinitializeCopyCatStateForRematch,
  getReferenceImage,
  recordCopyCatSubmission,
  getCopyCatResults,
  allCopyCatSubmissionsIn,
  cleanupCopyCatState,
  recordRematchVote,
  getRematchVotes,
} from './copycat.js';
import {
  initializePixelGuesserState,
  advanceToNextRound,
  updateDrawing,
  processGuess,
  allGuessersCorrect,
  endRound,
  getRoundScores,
  getFinalRankings,
  getGameState,
  getCurrentDrawing,
  cleanupPixelGuesserState,
  isPixelGuesserMode,
} from './pixelGuesser.js';
import {
  initializeZombiePixelState,
  assignZombieRoles,
  startGameLoop,
  stopGameLoop,
  cleanupZombiePixelState,
  checkGameTimeout,
} from './gameModes/zombiePixel/index.js';
import {
  initializeCopyCatRoyaleState,
  addToImagePool,
  getRandomPoolImage,
  recordRoyaleSubmission,
  calculateRoundResults,
  isGameOver,
  isInFinale,
  getWinner,
  getSurvivingPlayerIds,
  getFinalRankings as getRoyaleFinalRankings,
  advanceRound,
  allActivePlayersSubmitted,
  getEstimatedTotalRounds,
  getCurrentReferenceImage,
  cleanupCopyCatRoyaleState,
  isCopyCatRoyaleMode,
  getPlayerLastSubmission,
  getActivePlayerCount,
} from './copycatRoyale.js';

// IO instance (set by index.ts)
let io: Server | null = null;

// Voting-State pro Instanz speichern
const votingStates = new Map<string, VotingState>();

/**
 * Check if this is a CopyCat mode (including solo)
 */
function isCopyCatMode(instance: Instance): boolean {
  return instance.gameMode === 'copy-cat' || instance.gameMode === 'copy-cat-solo';
}

/**
 * Check if this is CopyCat Solo mode (single player)
 */
function isCopyCatSoloMode(instance: Instance): boolean {
  return instance.gameMode === 'copy-cat-solo';
}

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

  log('Phase', `Starting game for instance ${instance.id} with ${instance.players.size} players [${instance.gameMode}]`);

  // CopyCat mode (including solo) has different initialization
  if (isCopyCatMode(instance)) {
    // Initialize CopyCat state with reference image
    initializeCopyCatState(instance);

    // Solo mode skips countdown - go directly to memorize
    if (isCopyCatSoloMode(instance)) {
      transitionTo(instance, 'memorize');
    } else {
      // 1v1 mode uses countdown
      transitionTo(instance, 'countdown');
    }
    return;
  }

  // PixelGuesser mode has different initialization
  if (instance.gameMode === 'pixel-guesser') {
    // Initialize PixelGuesser state (artist order, scores, etc.)
    initializePixelGuesserState(instance);
    // Start countdown for first round
    transitionTo(instance, 'countdown');
    return;
  }

  // ZombiePixel mode has different initialization
  if (instance.gameMode === 'zombie-pixel' && io) {
    // Initialize ZombiePixel state (bots, positions, etc.)
    initializeZombiePixelState(instance, io);
    // Start countdown
    transitionTo(instance, 'countdown');
    return;
  }

  // CopyCat Royale mode has different initialization
  if (isCopyCatRoyaleMode(instance)) {
    // Initialize CopyCat Royale state (elimination bracket, player status)
    initializeCopyCatRoyaleState(instance);
    // Start countdown
    transitionTo(instance, 'countdown');
    return;
  }

  // Standard mode: Generate prompt indices for client-side localization
  instance.promptIndices = generatePromptIndices();
  // Also generate the English text for server logging
  instance.prompt = assemblePromptFromIndices(instance.promptIndices);
  log('Phase', `Prompt: "${instance.prompt.prefix} ${instance.prompt.subject} ${instance.prompt.suffix}"`);

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
    // CopyCat mode phases
    case 'memorize':
      handleMemorize(instance);
      break;
    case 'copycat-result':
      handleCopyCatResult(instance);
      break;
    case 'copycat-rematch':
      handleCopyCatRematch(instance);
      break;
    // PixelGuesser mode phases
    case 'guessing':
      handleGuessing(instance);
      break;
    case 'reveal':
      handleReveal(instance);
      break;
    // ZombiePixel mode phases
    case 'active':
      handleZombieActive(instance);
      break;
    // CopyCat Royale mode phases
    case 'royale-initial-drawing':
      handleRoyaleInitialDrawing(instance);
      break;
    case 'royale-show-reference':
      handleRoyaleShowReference(instance);
      break;
    case 'royale-drawing':
      handleRoyaleDrawing(instance);
      break;
    case 'royale-results':
      handleRoyaleResults(instance);
      break;
    case 'royale-elimination':
      handleRoyaleElimination(instance);
      break;
    case 'royale-winner':
      handleRoyaleWinner(instance);
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
  const manager = getPhaseManager(instance);
  const duration = manager.getTimerDuration('countdown') ?? TIMERS.COUNTDOWN;

  emitToInstance(instance, 'phase-changed', {
    phase: 'countdown',
    prompt: instance.prompt,
    promptIndices: instance.promptIndices,
    duration,
    startsAt: Date.now() + duration,
  });

  instance.phaseTimer = setTimeout(() => {
    // CopyCat mode (including solo) goes to memorize phase after countdown
    if (isCopyCatMode(instance)) {
      transitionTo(instance, 'memorize');
    } else if (instance.gameMode === 'pixel-guesser') {
      // PixelGuesser: go to guessing phase
      // Note: Round is already set up by initializePixelGuesserState (round 1)
      // or advanceToNextRound (rounds 2+), so just transition
      transitionTo(instance, 'guessing');
    } else if (instance.gameMode === 'zombie-pixel') {
      // ZombiePixel: go to active phase
      transitionTo(instance, 'active');
    } else if (isCopyCatRoyaleMode(instance)) {
      // CopyCat Royale: go to initial drawing phase
      transitionTo(instance, 'royale-initial-drawing');
    } else {
      transitionTo(instance, 'drawing');
    }
  }, duration);
}

/**
 * Drawing phase (30 seconds)
 */
function handleDrawing(instance: Instance): void {
  const manager = getPhaseManager(instance);
  const duration = manager.getTimerDuration('drawing') ?? TIMERS.DRAWING;

  // Reset submissions
  instance.submissions = [];

  // Set phase timing for anti-cheat
  setPhaseTimings(instance.id, duration);

  // Set draw start time for CopyCat accuracy timing
  if (isCopyCatMode(instance) && instance.copyCat) {
    instance.copyCat.drawStartTime = Date.now();
  }

  const endsAt = Date.now() + duration;

  emitToInstance(instance, 'phase-changed', {
    phase: 'drawing',
    prompt: instance.prompt,
    promptIndices: instance.promptIndices,
    duration,
    endsAt,
  });

  instance.phaseTimer = setTimeout(() => {
    // CopyCat mode (including solo) goes to copycat-result after drawing
    if (isCopyCatMode(instance)) {
      endCopyCatDrawingPhase(instance);
    } else {
      endDrawingPhase(instance);
    }
  }, duration);
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
  // Initialize state using the instance's game mode
  const state = initVotingState(instance.submissions, instance);

  // If no voting for this game mode, skip to results
  if (!state) {
    log('Phase', 'No voting for this game mode, skipping to results');
    transitionTo(instance, 'results');
    return;
  }

  votingStates.set(instance.id, state);

  log('Phase', `Voting started with ${state.totalRounds} rounds for ${instance.submissions.length} submissions`);

  // Start first round
  startVotingRound(instance, state, 1);
}

/**
 * Starts a voting round
 */
function startVotingRound(instance: Instance, state: VotingState, roundNumber: number): void {
  const manager = getPhaseManager(instance);
  const duration = manager.getTimerDuration('voting') ?? TIMERS.VOTING_ROUND;

  log('Phase', `Voting round ${roundNumber}/${state.totalRounds}`);

  // Set phase timing for anti-cheat
  setPhaseTimings(instance.id, duration);

  // Calculate assignments
  const assignments = prepareVotingRound(instance, state, roundNumber);

  // IMPORTANT: Calculate endsAt once to ensure consistency
  const endsAt = Date.now() + duration;

  // RACE CONDITION FIX: Send phase-changed FIRST
  emitToInstance(instance, 'phase-changed', {
    phase: 'voting',
    round: roundNumber,
    totalRounds: state.totalRounds,
    duration,
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
        timeLimit: duration,
        endsAt,
      });
    }
  }

  // Timer for round end
  instance.phaseTimer = setTimeout(() => {
    endVotingRound(instance, state, roundNumber);
  }, duration);
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
  const manager = getPhaseManager(instance);
  const duration = manager.getTimerDuration('finale') ?? TIMERS.FINALE;

  const state = votingStates.get(instance.id);
  if (!state) {
    log('Phase', `No voting state found, skipping to results`);
    transitionTo(instance, 'results');
    return;
  }

  // Set phase timing for anti-cheat
  setPhaseTimings(instance.id, duration);

  const finalistCount = manager.calculateFinalistCount(instance.submissions.length);

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

  const endsAt = Date.now() + duration;

  emitToInstance(instance, 'finale-start', {
    finalists,
    timeLimit: duration,
    endsAt,
  });

  emitToInstance(instance, 'phase-changed', {
    phase: 'finale',
    duration,
    endsAt,
  });

  instance.phaseTimer = setTimeout(() => {
    endFinale(instance);
  }, duration);
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
  const manager = getPhaseManager(instance);
  const duration = manager.getTimerDuration('results') ?? TIMERS.RESULTS;

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
    duration,
  });

  // Use compression for large galleries (based on game mode config)
  const playerCount = instance.submissions.length;
  const useCompression = shouldCompress(instance, playerCount);
  const compressedRankings = useCompression ? compressIfNeeded(results, playerCount) : { compressed: false, data: '' };

  emitToInstance(instance, 'game-results', {
    prompt: instance.prompt,
    promptIndices: instance.promptIndices,
    rankings: compressedRankings.compressed ? [] : results, // Send empty if compressed
    compressedRankings: compressedRankings.compressed ? compressedRankings.data : undefined,
    totalParticipants: instance.submissions.length,
  });

  if (compressedRankings.compressed) {
    log('Compression', `Gallery compressed for ${playerCount} players`);
  }

  // Note: Stats are tracked client-side in localStorage

  // Spectators to players for next round
  for (const [id, spectator] of instance.spectators) {
    instance.players.set(id, spectator);
  }
  instance.spectators.clear();

  instance.phaseTimer = setTimeout(() => {
    resetForNextRound(instance);
  }, duration);
}

/**
 * Results phase (15 seconds)
 */
function handleResults(instance: Instance): void {
  const manager = getPhaseManager(instance);
  const duration = manager.getTimerDuration('results') ?? TIMERS.RESULTS;

  // Simple ranking by submission order (fallback when no voting)
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
    duration,
  });

  emitToInstance(instance, 'game-results', {
    prompt: instance.prompt,
    promptIndices: instance.promptIndices,
    rankings,
    totalParticipants: instance.submissions.length,
  });

  // Note: Stats are tracked client-side in localStorage

  // Make spectators players for next round
  for (const [id, spectator] of instance.spectators) {
    instance.players.set(id, spectator);
  }
  instance.spectators.clear();

  // After results: Back to lobby
  instance.phaseTimer = setTimeout(() => {
    resetForNextRound(instance);
  }, duration);
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

// === CopyCat Mode Phases ===

/**
 * Memorize phase for CopyCat mode (5 seconds)
 * Shows the reference image to both players
 */
function handleMemorize(instance: Instance): void {
  const manager = getPhaseManager(instance);
  const duration = manager.getTimerDuration('memorize') ?? 5_000;

  const referenceImage = getReferenceImage(instance);
  if (!referenceImage) {
    log('Phase', 'No reference image found for CopyCat, skipping to result');
    transitionTo(instance, 'copycat-result');
    return;
  }

  // Set phase timing
  setPhaseTimings(instance.id, duration);

  const endsAt = Date.now() + duration;

  emitToInstance(instance, 'phase-changed', {
    phase: 'memorize',
    duration,
    endsAt,
  });

  // Send the reference image to all players
  emitToInstance(instance, 'copycat-reference', {
    referenceImage,
    duration,
    endsAt,
  });

  log('Phase', `Memorize phase started for instance ${instance.id}`);

  instance.phaseTimer = setTimeout(() => {
    transitionTo(instance, 'drawing');
  }, duration);
}

/**
 * Drawing phase for CopyCat mode
 * Modified to handle CopyCat-specific submission logic
 */
function handleCopyCatDrawing(instance: Instance): void {
  const manager = getPhaseManager(instance);
  const duration = manager.getTimerDuration('drawing') ?? 30_000;

  // Reset submissions
  instance.submissions = [];

  // Set phase timing for anti-cheat
  setPhaseTimings(instance.id, duration);

  const endsAt = Date.now() + duration;

  emitToInstance(instance, 'phase-changed', {
    phase: 'drawing',
    duration,
    endsAt,
  });

  log('Phase', `CopyCat drawing phase started for instance ${instance.id}`);

  instance.phaseTimer = setTimeout(() => {
    endCopyCatDrawingPhase(instance);
  }, duration);
}

/**
 * Ends the CopyCat drawing phase
 */
function endCopyCatDrawingPhase(instance: Instance): void {
  log('Phase', `CopyCat drawing ended for ${instance.id}: ${instance.copyCat?.playerResults.size || 0} submissions`);
  transitionTo(instance, 'copycat-result');
}

/**
 * CopyCat Result phase
 * Shows the comparison between player drawings and reference image
 */
function handleCopyCatResult(instance: Instance): void {
  const manager = getPhaseManager(instance);
  const duration = manager.getTimerDuration('copycat-result') ?? 10_000;

  const referenceImage = getReferenceImage(instance);
  const { results, winner, isDraw } = getCopyCatResults(instance);

  log('Phase', `CopyCat result: ${results.length} players, winner: ${winner?.playerId || 'draw'}`);

  const endsAt = Date.now() + duration;

  emitToInstance(instance, 'phase-changed', {
    phase: 'copycat-result',
    duration,
    endsAt,
  });

  emitToInstance(instance, 'copycat-results', {
    referenceImage,
    results,
    winner,
    isDraw,
    duration,
    endsAt,
  });

  // Note: Stats are tracked client-side in localStorage

  // DON'T cleanup yet - we need the state for rematch voting
  // Clear player results but keep the state for rematch votes
  if (instance.copyCat) {
    instance.copyCat.playerResults.clear();
    instance.copyCat.rematchVotes.clear();
  }

  instance.phaseTimer = setTimeout(() => {
    // Solo mode: go back to lobby (no rematch voting needed)
    if (isCopyCatSoloMode(instance)) {
      cleanupCopyCatState(instance);
      transitionTo(instance, 'lobby');
    } else {
      // Transition to rematch prompt for 1v1 mode
      transitionTo(instance, 'copycat-rematch');
    }
  }, duration);
}

/**
 * CopyCat Rematch phase
 * Ask both players if they want to play again
 */
function handleCopyCatRematch(instance: Instance): void {
  const REMATCH_TIMEOUT = 15_000; // 15 seconds to decide

  const endsAt = Date.now() + REMATCH_TIMEOUT;

  emitToInstance(instance, 'phase-changed', {
    phase: 'copycat-rematch',
    duration: REMATCH_TIMEOUT,
    endsAt,
  });

  emitToInstance(instance, 'copycat-rematch-prompt', {
    duration: REMATCH_TIMEOUT,
    endsAt,
  });

  log('Phase', `CopyCat rematch prompt started for instance ${instance.id}`);

  // Set phase timing for validation
  setPhaseTimings(instance.id, REMATCH_TIMEOUT);

  instance.phaseTimer = setTimeout(() => {
    // Timeout - treat as "no rematch"
    log('Phase', `Rematch timeout for instance ${instance.id}`);
    emitToInstance(instance, 'copycat-rematch-result', {
      rematch: false,
      reason: 'timeout',
    });
    cleanupCopyCatState(instance);
    resetForNextRound(instance);
  }, REMATCH_TIMEOUT);
}

/**
 * Handle a rematch vote from a player
 * Called from socket handler
 */
export function handleCopyCatRematchVote(
  instance: Instance,
  playerId: string,
  wantsRematch: boolean
): void {
  if (instance.phase !== 'copycat-rematch') {
    log('Phase', `Ignoring rematch vote from ${playerId} - not in rematch phase`);
    return;
  }

  const { allVoted, bothWantRematch } = recordRematchVote(instance, playerId, wantsRematch);

  // Broadcast the vote to all players
  emitToInstance(instance, 'copycat-rematch-vote', {
    playerId,
    wantsRematch,
  });

  // If someone voted "no", end immediately
  if (!wantsRematch) {
    clearTimeout(instance.phaseTimer);
    log('Phase', `Player ${playerId} declined rematch`);
    emitToInstance(instance, 'copycat-rematch-result', {
      rematch: false,
      reason: 'declined',
    });
    cleanupCopyCatState(instance);
    resetForNextRound(instance);
    return;
  }

  // If all voted and everyone wants rematch
  if (allVoted && bothWantRematch) {
    clearTimeout(instance.phaseTimer);
    log('Phase', `Both players want rematch - starting new game`);
    emitToInstance(instance, 'copycat-rematch-result', {
      rematch: true,
      reason: 'both-yes',
    });

    // Re-initialize with new reference image and start new game
    reinitializeCopyCatStateForRematch(instance);
    transitionTo(instance, 'countdown');
  }
}

/**
 * Records a CopyCat submission and checks if both players have submitted
 * Called from socket handler
 */
export function handleCopyCatSubmission(
  instance: Instance,
  playerId: string,
  pixels: string
): { success: boolean; error?: string; allSubmitted?: boolean } {
  if (!isCopyCatMode(instance)) {
    return { success: false, error: 'Not a CopyCat game' };
  }

  if (!instance.copyCat) {
    return { success: false, error: 'CopyCat state not initialized' };
  }

  // Check if already submitted
  if (instance.copyCat.playerResults.has(playerId)) {
    return { success: false, error: 'Already submitted' };
  }

  // Record submission with accuracy calculation
  const result = recordCopyCatSubmission(instance, playerId, pixels);
  if (!result) {
    return { success: false, error: 'Failed to record submission' };
  }

  // Also add to standard submissions for compatibility
  instance.submissions.push({
    playerId,
    pixels,
    timestamp: result.submitTime,
  });

  // Check if all players have submitted
  const allSubmitted = allCopyCatSubmissionsIn(instance);

  if (allSubmitted) {
    // End drawing phase early
    log('Phase', 'All CopyCat players submitted, ending drawing early');
    clearTimeout(instance.phaseTimer);
    transitionTo(instance, 'copycat-result');
  }

  return { success: true, allSubmitted };
}

/**
 * Helper function: Send event to all in the instance
 */
function emitToInstance(instance: Instance, event: string, data: unknown): void {
  if (io) {
    io.to(instance.id).emit(event, data);
  }
}

// === PixelGuesser Mode Phases ===

/**
 * Guessing phase for PixelGuesser mode
 * Artist draws live while others try to guess the word
 */
function handleGuessing(instance: Instance): void {
  const manager = getPhaseManager(instance);
  const duration = manager.getTimerDuration('guessing') ?? 45_000;

  const state = instance.pixelGuesser;
  if (!state) {
    log('Phase', 'No PixelGuesser state, skipping to results');
    transitionTo(instance, 'results');
    return;
  }

  // Set phase timing for anti-cheat
  setPhaseTimings(instance.id, duration);

  const endsAt = Date.now() + duration;
  const gameState = getGameState(instance);

  if (!gameState) {
    log('Phase', 'Failed to get game state');
    transitionTo(instance, 'results');
    return;
  }

  // Send phase change to all
  emitToInstance(instance, 'phase-changed', {
    phase: 'guessing',
    round: gameState.currentRound,
    totalRounds: gameState.totalRounds,
    duration,
    endsAt,
  });

  // Send round start event with role-specific data
  for (const [playerId, player] of instance.players) {
    const isArtist = playerId === gameState.artistId;

    if (io) {
      io.to(player.socketId).emit('pixelguesser-round-start', {
        round: gameState.currentRound,
        totalRounds: gameState.totalRounds,
        artistId: gameState.artistId,
        artistUser: gameState.artistUser,
        isYouArtist: isArtist,
        // Only send prompt to artist
        secretPrompt: isArtist ? gameState.secretPrompt : undefined,
        secretPromptIndices: isArtist ? gameState.secretPromptIndices : undefined,
        duration,
        endsAt,
      });
    }
  }

  log(
    'Phase',
    `PixelGuesser round ${gameState.currentRound}/${gameState.totalRounds} started, artist: ${gameState.artistId}`
  );

  instance.phaseTimer = setTimeout(() => {
    endGuessingPhase(instance);
  }, duration);
}

/**
 * Ends the guessing phase
 */
function endGuessingPhase(instance: Instance): void {
  // End the round and calculate artist bonus
  endRound(instance);

  log('Phase', `PixelGuesser guessing ended for ${instance.id}`);
  transitionTo(instance, 'reveal');
}

/**
 * Reveal phase for PixelGuesser mode
 * Shows the correct answer and round scores
 */
function handleReveal(instance: Instance): void {
  const manager = getPhaseManager(instance);
  const duration = manager.getTimerDuration('reveal') ?? 5_000;

  const state = instance.pixelGuesser;
  if (!state) {
    log('Phase', 'No PixelGuesser state in reveal, skipping to results');
    transitionTo(instance, 'results');
    return;
  }

  const scores = getRoundScores(instance);
  const artist = instance.players.get(state.artistId);

  const endsAt = Date.now() + duration;

  emitToInstance(instance, 'phase-changed', {
    phase: 'reveal',
    duration,
    endsAt,
  });

  emitToInstance(instance, 'pixelguesser-reveal', {
    secretPrompt: state.secretPrompt,
    secretPromptIndices: state.secretPromptIndices,
    artistId: state.artistId,
    artistUser: artist?.user || { displayName: 'Unknown', discriminator: '0000', fullName: 'Unknown#0000' },
    artistPixels: state.currentDrawing,
    scores,
    duration,
    endsAt,
  });

  log('Phase', `PixelGuesser reveal: "${state.secretPrompt}", ${state.correctGuessers.length} correct guesses`);

  instance.phaseTimer = setTimeout(() => {
    // Check if there are more rounds
    const hasMoreRounds = advanceToNextRound(instance);

    if (hasMoreRounds) {
      // Go to countdown for next round
      transitionTo(instance, 'countdown');
    } else {
      // Game over - show final results
      handlePixelGuesserResults(instance);
    }
  }, duration);
}

/**
 * Final results for PixelGuesser mode
 */
function handlePixelGuesserResults(instance: Instance): void {
  const manager = getPhaseManager(instance);
  const duration = manager.getTimerDuration('results') ?? 15_000;

  const state = instance.pixelGuesser;
  const rankings = getFinalRankings(instance);

  instance.phase = 'results';

  const endsAt = Date.now() + duration;

  emitToInstance(instance, 'phase-changed', {
    phase: 'results',
    duration,
    endsAt,
  });

  emitToInstance(instance, 'pixelguesser-final-results', {
    rankings,
    totalRounds: state?.totalRounds || 0,
    duration,
    endsAt,
  });

  log('Phase', `PixelGuesser final results: winner ${rankings[0]?.playerId || 'none'}`);

  // Clean up PixelGuesser state
  cleanupPixelGuesserState(instance);

  // Return spectators to players for next game
  for (const [id, spectator] of instance.spectators) {
    instance.players.set(id, spectator);
  }
  instance.spectators.clear();

  instance.phaseTimer = setTimeout(() => {
    resetForNextRound(instance);
  }, duration);
}

/**
 * Handle drawing update from artist
 * Called from socket handler
 */
export function handlePixelGuesserDrawUpdate(
  instance: Instance,
  playerId: string,
  pixels: string
): { success: boolean; error?: string } {
  if (!isPixelGuesserMode(instance)) {
    return { success: false, error: 'Not a PixelGuesser game' };
  }

  if (instance.phase !== 'guessing') {
    return { success: false, error: 'Not in guessing phase' };
  }

  const updated = updateDrawing(instance, playerId, pixels);
  if (!updated) {
    return { success: false, error: 'Failed to update drawing' };
  }

  // Broadcast the drawing update to all OTHER players (not the artist)
  const drawing = getCurrentDrawing(instance);
  if (drawing && io) {
    for (const [pid, player] of instance.players) {
      if (pid !== playerId) {
        io.to(player.socketId).emit('pixelguesser-drawing-update', {
          pixels: drawing,
        });
      }
    }
  }

  return { success: true };
}

/**
 * Handle guess from a player
 * Called from socket handler
 */
export function handlePixelGuesserGuess(
  instance: Instance,
  playerId: string,
  guessText: string
): {
  success: boolean;
  correct: boolean;
  close: boolean;
  points: number;
  error?: string;
} {
  if (!isPixelGuesserMode(instance)) {
    return { success: false, correct: false, close: false, points: 0, error: 'Not a PixelGuesser game' };
  }

  if (instance.phase !== 'guessing') {
    return { success: false, correct: false, close: false, points: 0, error: 'Not in guessing phase' };
  }

  const result = processGuess(instance, playerId, guessText);

  if (!result.success) {
    return {
      success: false,
      correct: false,
      close: false,
      points: 0,
      error: result.alreadyGuessed ? 'Already guessed correctly' : 'Failed to process guess',
    };
  }

  // Send result back to the guesser
  const player = instance.players.get(playerId);
  if (player && io) {
    io.to(player.socketId).emit('pixelguesser-guess-result', {
      correct: result.correct,
      guess: guessText,
      message: result.close ? 'Close!' : undefined,
    });
  }

  // If correct, broadcast to all players
  if (result.correct) {
    const guesser = instance.players.get(playerId);
    const state = instance.pixelGuesser;
    const remainingGuessers = state
      ? instance.players.size - 1 - state.correctGuessers.length
      : 0;

    emitToInstance(instance, 'pixelguesser-correct-guess', {
      playerId,
      user: guesser?.user || { displayName: 'Unknown', discriminator: '0000', fullName: 'Unknown#0000' },
      points: result.points,
      timeMs: result.timeMs,
      position: result.position,
      remainingGuessers,
    });

    // Check if all guessers have guessed correctly
    if (allGuessersCorrect(instance)) {
      log('Phase', 'All guessers correct, ending guessing phase early');
      clearTimeout(instance.phaseTimer);
      endGuessingPhase(instance);
    }
  }

  return {
    success: true,
    correct: result.correct,
    close: result.close,
    points: result.points,
  };
}

// === ZombiePixel Mode Phases ===

/**
 * Active phase for ZombiePixel mode
 * Real-time gameplay with zombies chasing survivors
 */
function handleZombieActive(instance: Instance): void {
  if (!io) {
    log('Phase', 'No IO instance for ZombiePixel active phase');
    transitionTo(instance, 'results');
    return;
  }

  const manager = getPhaseManager(instance);
  const duration = manager.getTimerDuration('active') ?? 60_000;

  // Assign zombie roles
  assignZombieRoles(instance, io);

  // Start the game loop (handles bot AI, collisions, broadcasting)
  startGameLoop(instance, io);

  // Set phase timing
  setPhaseTimings(instance.id, duration);

  const endsAt = Date.now() + duration;

  emitToInstance(instance, 'phase-changed', {
    phase: 'active',
    duration,
    endsAt,
  });

  log('Phase', `ZombiePixel active phase started for instance ${instance.id}`);

  // Set up timeout to end the game
  instance.phaseTimer = setTimeout(() => {
    checkGameTimeout(instance, io!);
    // Game ends via checkGameTimeout -> endGame which emits zombie-game-end
    // After timeout, transition to results
    handleZombieResults(instance);
  }, duration);
}

/**
 * Results phase for ZombiePixel mode
 */
function handleZombieResults(instance: Instance): void {
  const manager = getPhaseManager(instance);
  const duration = manager.getTimerDuration('results') ?? 15_000;

  // Stop the game loop
  stopGameLoop(instance);

  instance.phase = 'results';

  const endsAt = Date.now() + duration;

  emitToInstance(instance, 'phase-changed', {
    phase: 'results',
    duration,
    endsAt,
  });

  log('Phase', `ZombiePixel results phase for instance ${instance.id}`);

  // Clean up ZombiePixel state
  cleanupZombiePixelState(instance);

  // Return spectators to players for next game
  for (const [id, spectator] of instance.spectators) {
    instance.players.set(id, spectator);
  }
  instance.spectators.clear();

  instance.phaseTimer = setTimeout(() => {
    resetForNextRound(instance);
  }, duration);
}

// === CopyCat Royale Mode Phases ===

/**
 * Initial drawing phase for CopyCat Royale (30 seconds)
 * All players draw freely - their drawings become the image pool
 */
function handleRoyaleInitialDrawing(instance: Instance): void {
  const manager = getPhaseManager(instance);
  const duration = manager.getTimerDuration('royale-initial-drawing') ?? 30_000;

  // Reset submissions
  instance.submissions = [];

  // Set phase timing for anti-cheat
  setPhaseTimings(instance.id, duration);

  // Set draw start time
  if (instance.copyCatRoyale) {
    instance.copyCatRoyale.drawStartTime = Date.now();
  }

  const endsAt = Date.now() + duration;

  emitToInstance(instance, 'phase-changed', {
    phase: 'royale-initial-drawing',
    duration,
    endsAt,
  });

  emitToInstance(instance, 'royale-initial-drawing', {
    duration,
    endsAt,
  });

  log('Phase', `CopyCat Royale initial drawing started for instance ${instance.id}`);

  instance.phaseTimer = setTimeout(() => {
    endRoyaleInitialDrawing(instance);
  }, duration);
}

/**
 * Ends the initial drawing phase and collects images
 */
function endRoyaleInitialDrawing(instance: Instance): void {
  if (!instance.copyCatRoyale) {
    log('Phase', 'No CopyCat Royale state, skipping to lobby');
    transitionTo(instance, 'lobby');
    return;
  }

  // Collect all submitted images into the pool
  for (const submission of instance.submissions) {
    const player = instance.players.get(submission.playerId);
    if (player) {
      addToImagePool(instance, submission.playerId, submission.pixels, player.user.displayName);
    }
  }

  log('Phase', `CopyCat Royale initial drawing ended: ${instance.copyCatRoyale.imagePool.length} images collected`);

  // Advance to round 1 and show first reference
  advanceRound(instance);
  transitionTo(instance, 'royale-show-reference');
}

/**
 * Show reference phase for CopyCat Royale (5 seconds)
 * Display the image to memorize
 */
function handleRoyaleShowReference(instance: Instance): void {
  const manager = getPhaseManager(instance);
  const duration = manager.getTimerDuration('royale-show-reference') ?? 5_000;

  if (!instance.copyCatRoyale) {
    log('Phase', 'No CopyCat Royale state in show reference');
    transitionTo(instance, 'lobby');
    return;
  }

  // Get a random image from the pool
  const referenceImage = getRandomPoolImage(instance);
  if (!referenceImage) {
    log('Phase', 'No reference image available, ending game');
    transitionTo(instance, 'royale-winner');
    return;
  }

  const endsAt = Date.now() + duration;
  const remainingPlayers = getActivePlayerCount(instance);
  const totalRounds = getEstimatedTotalRounds(instance);

  emitToInstance(instance, 'phase-changed', {
    phase: 'royale-show-reference',
    round: instance.copyCatRoyale.currentRound,
    totalRounds,
    duration,
    endsAt,
  });

  emitToInstance(instance, 'royale-show-reference', {
    referenceImage: referenceImage.pixels,
    imageCreator: referenceImage.creatorName,
    round: instance.copyCatRoyale.currentRound,
    totalRounds,
    remainingPlayers,
    duration,
    endsAt,
  });

  log('Phase', `CopyCat Royale show reference: round ${instance.copyCatRoyale.currentRound}, image from ${referenceImage.creatorName}`);

  instance.phaseTimer = setTimeout(() => {
    transitionTo(instance, 'royale-drawing');
  }, duration);
}

/**
 * Drawing phase for CopyCat Royale (25 seconds)
 * Players recreate the image from memory (no reference visible)
 */
function handleRoyaleDrawing(instance: Instance): void {
  const manager = getPhaseManager(instance);
  const duration = manager.getTimerDuration('royale-drawing') ?? 25_000;

  if (!instance.copyCatRoyale) {
    log('Phase', 'No CopyCat Royale state in drawing');
    transitionTo(instance, 'lobby');
    return;
  }

  // Reset submissions for this round
  instance.submissions = [];

  // Set phase timing for anti-cheat
  setPhaseTimings(instance.id, duration);

  // Set draw start time
  instance.copyCatRoyale.drawStartTime = Date.now();

  const endsAt = Date.now() + duration;

  emitToInstance(instance, 'phase-changed', {
    phase: 'royale-drawing',
    round: instance.copyCatRoyale.currentRound,
    duration,
    endsAt,
  });

  emitToInstance(instance, 'royale-drawing', {
    round: instance.copyCatRoyale.currentRound,
    duration,
    endsAt,
  });

  log('Phase', `CopyCat Royale drawing phase: round ${instance.copyCatRoyale.currentRound}`);

  instance.phaseTimer = setTimeout(() => {
    transitionTo(instance, 'royale-results');
  }, duration);
}

/**
 * Results phase for CopyCat Royale (8 seconds)
 * Show results, accuracies, and who gets eliminated
 */
function handleRoyaleResults(instance: Instance): void {
  const manager = getPhaseManager(instance);
  const duration = manager.getTimerDuration('royale-results') ?? 8_000;

  if (!instance.copyCatRoyale) {
    log('Phase', 'No CopyCat Royale state in results');
    transitionTo(instance, 'lobby');
    return;
  }

  // Calculate results and eliminations
  const roundResult = calculateRoundResults(instance);
  if (!roundResult) {
    log('Phase', 'Failed to calculate round results');
    transitionTo(instance, 'royale-winner');
    return;
  }

  const referenceImage = getCurrentReferenceImage(instance);
  const surviving = getSurvivingPlayerIds(instance);

  // Calculate elimination threshold (lowest surviving accuracy)
  const survivingResults = roundResult.results.filter((r) => !r.wasEliminated);
  const threshold = survivingResults.length > 0
    ? Math.min(...survivingResults.map((r) => r.accuracy))
    : 0;

  const endsAt = Date.now() + duration;

  emitToInstance(instance, 'phase-changed', {
    phase: 'royale-results',
    round: instance.copyCatRoyale.currentRound,
    duration,
    endsAt,
  });

  emitToInstance(instance, 'royale-round-results', {
    round: instance.copyCatRoyale.currentRound,
    referenceImage: referenceImage?.pixels ?? '',
    results: roundResult.results,
    eliminated: roundResult.eliminated,
    surviving,
    eliminationThreshold: threshold,
    duration,
    endsAt,
  });

  // Send personal elimination notifications
  for (const result of roundResult.results) {
    if (result.wasEliminated) {
      const player = instance.players.get(result.playerId);
      if (player && io) {
        const totalPlayers = instance.copyCatRoyale.playerStatus.size;
        io.to(player.socketId).emit('royale-you-eliminated', {
          round: instance.copyCatRoyale.currentRound,
          accuracy: result.accuracy,
          finalRank: result.finalRank ?? totalPlayers,
          totalPlayers,
        });

        // Move eliminated player to spectators
        instance.spectators.set(result.playerId, player);
        instance.players.delete(result.playerId);
      }
    }
  }

  log('Phase', `CopyCat Royale results: round ${instance.copyCatRoyale.currentRound}, ${roundResult.eliminated.length} eliminated`);

  instance.phaseTimer = setTimeout(() => {
    transitionTo(instance, 'royale-elimination');
  }, duration);
}

/**
 * Elimination phase for CopyCat Royale (instant)
 * Determines what happens next
 */
function handleRoyaleElimination(instance: Instance): void {
  if (!instance.copyCatRoyale) {
    transitionTo(instance, 'lobby');
    return;
  }

  // Check if game is over
  if (isGameOver(instance)) {
    transitionTo(instance, 'royale-winner');
    return;
  }

  // Check if we're entering finale (3 or fewer players)
  if (isInFinale(instance)) {
    instance.copyCatRoyale.isFinale = true;
    const finalists: { playerId: string; user: import('./types.js').User }[] = [];
    for (const [playerId, status] of instance.copyCatRoyale.playerStatus) {
      if (!status.isEliminated) {
        const player = instance.players.get(playerId);
        if (player) {
          finalists.push({ playerId, user: player.user });
        }
      }
    }
    emitToInstance(instance, 'royale-finale', {
      finalists: finalists.map((f) => f.user),
      round: instance.copyCatRoyale.currentRound + 1,
    });
  }

  // Advance to next round
  advanceRound(instance);

  // Continue to next round
  transitionTo(instance, 'royale-show-reference');
}

/**
 * Winner phase for CopyCat Royale (15 seconds)
 * Show the winner and final rankings
 */
function handleRoyaleWinner(instance: Instance): void {
  const manager = getPhaseManager(instance);
  const duration = manager.getTimerDuration('royale-winner') ?? 15_000;

  const winner = getWinner(instance);
  const rankings = getRoyaleFinalRankings(instance);
  const totalRounds = instance.copyCatRoyale?.currentRound ?? 0;

  const endsAt = Date.now() + duration;

  // Get winner's last drawing
  const winnerPixels = winner ? getPlayerLastSubmission(instance, winner.playerId) : null;
  const winnerResult = rankings.find((r) => r.finalRank === 1);

  emitToInstance(instance, 'phase-changed', {
    phase: 'royale-winner',
    duration,
    endsAt,
  });

  emitToInstance(instance, 'royale-winner', {
    winner: winner?.user ?? { displayName: 'Unknown', discriminator: '0000', fullName: 'Unknown#0000' },
    winnerId: winner?.playerId ?? '',
    winnerPixels: winnerPixels ?? '',
    winningAccuracy: winnerResult?.averageAccuracy ?? 0,
    totalRounds,
    allResults: rankings,
    duration,
    endsAt,
  });

  log('Phase', `CopyCat Royale winner: ${winner?.user.displayName ?? 'none'}`);

  // Clean up state
  cleanupCopyCatRoyaleState(instance);

  // Return spectators to players for next game
  for (const [id, spectator] of instance.spectators) {
    instance.players.set(id, spectator);
  }
  instance.spectators.clear();

  instance.phaseTimer = setTimeout(() => {
    resetForNextRound(instance);
  }, duration);
}

/**
 * Handle a CopyCat Royale submission
 * Called from socket handler
 */
export function handleRoyaleSubmission(
  instance: Instance,
  playerId: string,
  pixels: string
): { success: boolean; error?: string; allSubmitted?: boolean } {
  if (!isCopyCatRoyaleMode(instance)) {
    return { success: false, error: 'Not a CopyCat Royale game' };
  }

  if (!instance.copyCatRoyale) {
    return { success: false, error: 'CopyCat Royale state not initialized' };
  }

  // Check phase
  if (instance.phase !== 'royale-initial-drawing' && instance.phase !== 'royale-drawing') {
    return { success: false, error: 'Not in drawing phase' };
  }

  // Record submission
  const submission = recordRoyaleSubmission(instance, playerId, pixels);
  if (!submission) {
    return { success: false, error: 'Failed to record submission' };
  }

  // Add to standard submissions for compatibility
  instance.submissions.push({
    playerId,
    pixels,
    timestamp: submission.submitTime,
  });

  // Check if all active players have submitted
  const allSubmitted = allActivePlayersSubmitted(instance);

  if (allSubmitted) {
    log('Phase', 'All CopyCat Royale players submitted, ending phase early');
    clearTimeout(instance.phaseTimer);

    if (instance.phase === 'royale-initial-drawing') {
      endRoyaleInitialDrawing(instance);
    } else {
      transitionTo(instance, 'royale-results');
    }
  }

  return { success: true, allSubmitted };
}
