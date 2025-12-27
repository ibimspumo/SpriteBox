// apps/server/src/handlers/game.ts
// Core game event handlers: submit-drawing, vote, finale-vote, session restore

import type { TypedSocket, TypedServer, Player, PhaseState } from './types.js';
import {
  emitError,
  validateInstanceAndPhase,
  validatePhaseTime,
  validateActivePlayer,
  validateAndEmit,
  logHandler,
} from './common.js';
import { findInstance, getInstancePlayers, handlePlayerReconnect } from '../instance.js';
import { CANVAS } from '../constants.js';
import {
  PixelSchema,
  VoteSchema,
  FinaleVoteSchema,
  validateMinPixels,
} from '../validation.js';
import {
  getVotingState,
  getPhaseTimings,
  checkAndTriggerEarlyVotingEnd,
  checkAndTriggerEarlyFinaleEnd,
  handleCopyCatSubmission,
  handleRoyaleSubmission,
} from '../phases.js';
import { processVote, processFinaleVote } from '../voting.js';
import { validateSessionToken, removeSessionToken } from './session.js';

/**
 * Register core game socket event handlers
 */
export function registerGameHandlers(socket: TypedSocket, io: TypedServer, player: Player): void {
  // Submit drawing handler (with anti-cheat)
  socket.on('submit-drawing', (data: unknown) => {
    const validation = validateInstanceAndPhase(socket, 'drawing');
    if (!validation.valid || !validation.instance) return;

    const instance = validation.instance;
    const instanceId = instance.id;

    // Check timing (incl. grace period)
    if (!validatePhaseTime(socket, instanceId)) return;

    // Anti-bot: Minimum draw time (at least 3 seconds)
    const MIN_DRAW_TIME = 3000;
    const timings = getPhaseTimings(instanceId);
    if (timings && Date.now() - timings.phaseStartedAt < MIN_DRAW_TIME) {
      emitError(socket, 'TOO_FAST', 'Submitted too quickly');
      return;
    }

    // Only active players can submit
    if (!validateActivePlayer(socket, instance, player, 'submit')) return;

    // Validate pixels
    const pixelValidation = validateAndEmit(socket, PixelSchema, data, 'INVALID_PIXELS');
    if (!pixelValidation.valid || !pixelValidation.data) return;

    // Check minimum pixels
    const minCheck = validateMinPixels(pixelValidation.data.pixels);
    if (!minCheck.valid) {
      emitError(
        socket,
        'TOO_FEW_PIXELS',
        `Need at least ${CANVAS.MIN_PIXELS_SET} non-background pixels (you have ${minCheck.setPixels})`,
      );
      return;
    }

    // Already submitted? (Anti-double-submit)
    const alreadySubmitted = instance.submissions.some((s) => s.playerId === player.id);
    if (alreadySubmitted) {
      emitError(socket, 'ALREADY_SUBMITTED', 'You already submitted');
      return;
    }

    // CopyCat mode (including solo) has special submission handling
    if (instance.gameMode === 'copy-cat' || instance.gameMode === 'copy-cat-solo') {
      const copyCatResult = handleCopyCatSubmission(instance, player.id, pixelValidation.data.pixels);
      if (!copyCatResult.success) {
        emitError(socket, 'SUBMIT_FAILED', copyCatResult.error || 'Submission failed');
        return;
      }

      socket.emit('submission-received', {
        success: true,
        submissionCount: instance.submissions.length,
      });

      logHandler('CopyCat', `${player.user.fullName} submitted drawing`);

      // Inform everyone how many submitted
      io.to(instance.id).emit('submission-count', {
        count: instance.submissions.length,
        total: instance.players.size,
      });
      return;
    }

    // Standard mode: Save submission
    instance.submissions.push({
      playerId: player.id,
      pixels: pixelValidation.data.pixels,
      timestamp: Date.now(),
    });

    socket.emit('submission-received', {
      success: true,
      submissionCount: instance.submissions.length,
    });

    logHandler('Drawing', `${player.user.fullName} submitted drawing`);

    // Inform everyone how many submitted
    io.to(instance.id).emit('submission-count', {
      count: instance.submissions.length,
      total: instance.players.size,
    });
  });

  // Vote handler (with anti-cheat)
  socket.on('vote', (data: unknown) => {
    const validation = validateInstanceAndPhase(socket, 'voting');
    if (!validation.valid || !validation.instance) return;

    const instance = validation.instance;
    const instanceId = instance.id;

    // Check timing (incl. grace period)
    if (!validatePhaseTime(socket, instanceId)) return;

    // Validate vote data
    const voteValidation = validateAndEmit(socket, VoteSchema, data, 'INVALID_VOTE');
    if (!voteValidation.valid || !voteValidation.data) return;

    // Anti-cheat: Cannot vote for self
    if (voteValidation.data.chosenId === player.id) {
      emitError(socket, 'CANNOT_VOTE_SELF', 'Cannot vote for yourself');
      return;
    }

    // Get voting state
    const state = getVotingState(instanceId);
    if (!state) {
      emitError(socket, 'VOTING_NOT_ACTIVE', 'Voting not active');
      return;
    }

    // Anti-cheat: Target must be in assignment
    const assignment = state.assignments.find((a) => a.voterId === player.id);
    if (!assignment) {
      emitError(socket, 'NO_ASSIGNMENT', 'No voting assignment found');
      return;
    }

    if (
      voteValidation.data.chosenId !== assignment.imageA &&
      voteValidation.data.chosenId !== assignment.imageB
    ) {
      emitError(socket, 'INVALID_TARGET', 'Invalid vote target');
      return;
    }

    // Process vote
    const result = processVote(instance, state, player.id, voteValidation.data.chosenId);

    if (!result.success) {
      emitError(socket, 'VOTE_FAILED', result.error || 'Vote failed');
      return;
    }

    socket.emit('vote-received', {
      success: true,
      eloChange: result.eloChange,
    });

    logHandler('Vote', `${player.user.fullName} voted for ${voteValidation.data.chosenId}`);

    // Check if all votes are in and end round early
    checkAndTriggerEarlyVotingEnd(instanceId, instance);
  });

  // Finale vote handler (with anti-cheat)
  socket.on('finale-vote', (data: unknown) => {
    const validation = validateInstanceAndPhase(socket, 'finale');
    if (!validation.valid || !validation.instance) return;

    const instance = validation.instance;
    const instanceId = instance.id;

    // Check timing (incl. grace period)
    if (!validatePhaseTime(socket, instanceId)) return;

    // Validate vote data
    const finaleValidation = validateAndEmit(socket, FinaleVoteSchema, data, 'INVALID_VOTE');
    if (!finaleValidation.valid || !finaleValidation.data) return;

    // Anti-cheat: Cannot vote for self
    if (finaleValidation.data.playerId === player.id) {
      emitError(socket, 'CANNOT_VOTE_SELF', 'Cannot vote for yourself');
      return;
    }

    const state = getVotingState(instanceId);
    if (!state) {
      emitError(socket, 'VOTING_NOT_ACTIVE', 'Finale not active');
      return;
    }

    // Anti-cheat: Target must be a finalist
    if (!state.finalists.some((f) => f.playerId === finaleValidation.data!.playerId)) {
      emitError(socket, 'INVALID_TARGET', 'Invalid finalist');
      return;
    }

    // Process finale vote
    const result = processFinaleVote(state, player.id, finaleValidation.data.playerId);

    if (!result.success) {
      emitError(socket, 'VOTE_FAILED', result.error || 'Vote failed');
      return;
    }

    socket.emit('finale-vote-received', { success: true });
    logHandler('Finale', `${player.user.fullName} voted for ${finaleValidation.data.playerId}`);

    // Check if all finale votes are in and end early
    const totalVoters = instance.players.size + instance.spectators.size;
    checkAndTriggerEarlyFinaleEnd(instanceId, instance, totalVoters);
  });

  // Session restoration (for reconnects)
  socket.on('restore-session', (data) => {
    if (!data?.sessionId || typeof data.sessionId !== 'string') {
      socket.emit('session-restore-failed', { reason: 'Invalid session ID' });
      return;
    }

    // Validate session token with timing-safe comparison
    const tokenValidation = validateSessionToken(data.sessionId);
    if (!tokenValidation.valid) {
      socket.emit('session-restore-failed', {
        reason: tokenValidation.expired ? 'Session expired (24h limit)' : 'Invalid session',
      });
      return;
    }

    const result = handlePlayerReconnect(data.sessionId, socket.id);

    if (!result.success || !result.player || !result.instanceId) {
      socket.emit('session-restore-failed', { reason: 'Session not found or expired' });
      return;
    }

    // Extract for TypeScript narrowing
    const restoredPlayer = result.player;

    // Update socket data
    socket.data.player = restoredPlayer;
    socket.data.instanceId = result.instanceId;

    // Rejoin room
    socket.join(result.instanceId);

    const instance = findInstance(result.instanceId);
    if (!instance) {
      socket.emit('session-restore-failed', { reason: 'Instance no longer exists' });
      return;
    }

    // Build phase-specific state
    let phaseState: PhaseState | undefined = undefined;

    const timings = getPhaseTimings(instance.id);
    const timer =
      timings && timings.phaseEndsAt > Date.now()
        ? { duration: timings.phaseEndsAt - timings.phaseStartedAt, endsAt: timings.phaseEndsAt }
        : undefined;

    if (instance.phase === 'lobby') {
      phaseState = { phase: 'lobby' };
    } else if (instance.phase === 'countdown') {
      phaseState = { phase: 'countdown' };
    } else if (instance.phase === 'results') {
      phaseState = { phase: 'results' };
    } else if (instance.phase === 'drawing') {
      phaseState = {
        phase: 'drawing',
        timer,
        hasSubmitted: instance.submissions.some((s) => s.playerId === restoredPlayer.id),
        submissionCount: instance.submissions.length,
      };
    } else if (instance.phase === 'voting') {
      const votingState = getVotingState(instance.id);
      if (votingState) {
        const assignment = votingState.assignments.find((a) => a.voterId === restoredPlayer.id);
        let votingAssignment;
        if (assignment) {
          const imageA = instance.submissions.find((s) => s.playerId === assignment.imageA);
          const imageB = instance.submissions.find((s) => s.playerId === assignment.imageB);
          if (imageA && imageB) {
            votingAssignment = {
              imageA: { playerId: imageA.playerId, pixels: imageA.pixels },
              imageB: { playerId: imageB.playerId, pixels: imageB.pixels },
            };
          }
        }
        phaseState = {
          phase: 'voting',
          timer,
          currentRound: votingState.currentRound,
          totalRounds: votingState.totalRounds,
          hasVoted: votingState.votersVoted.has(restoredPlayer.id),
          votingAssignment,
        };
      }
    } else if (instance.phase === 'finale') {
      const votingState = getVotingState(instance.id);
      if (votingState) {
        phaseState = {
          phase: 'finale',
          timer,
          finalists: votingState.finalists,
          finaleVoted: votingState.votersVoted.has(restoredPlayer.id),
        };
      }
    }

    // Send session restored event with full game state
    socket.emit('session-restored', {
      instanceId: result.instanceId,
      user: restoredPlayer.user,
      phase: instance.phase,
      prompt: instance.prompt,
      promptIndices: instance.promptIndices,
      players: getInstancePlayers(instance).map((p) => p.user),
      isSpectator: instance.spectators.has(restoredPlayer.id),
      phaseState,
      gameMode: instance.gameMode,
    });

    logHandler('Reconnect', `Session restored for ${restoredPlayer.user.fullName}`);
  });
}
