// apps/server/src/handlers/modes/copycat.ts
// CopyCat-specific event handlers

import type { TypedSocket, TypedServer, Player } from '../types.js';
import {
  emitError,
  validateInstanceAndPhase,
  validatePhaseTime,
  validateActivePlayer,
  validateAndEmit,
  checkRateLimitAndEmit,
  logHandler,
} from '../common.js';
import { CopyCatRematchVoteSchema } from '../../validation.js';
import { handleCopyCatRematchVote } from '../../phases.js';

/**
 * Register CopyCat mode socket event handlers
 */
export function registerCopyCatHandlers(socket: TypedSocket, io: TypedServer, player: Player): void {
  // CopyCat Rematch Vote
  socket.on('copycat-rematch-vote', (data: unknown) => {
    const validation = validateInstanceAndPhase(socket, 'copycat-rematch');
    if (!validation.valid || !validation.instance) return;

    const instance = validation.instance;
    const instanceId = instance.id;

    // Rate limit check
    if (!checkRateLimitAndEmit(socket, 'copycat-rematch-vote')) return;

    // Check timing
    if (!validatePhaseTime(socket, instanceId)) return;

    // Validate with Zod schema
    const voteValidation = validateAndEmit(socket, CopyCatRematchVoteSchema, data, 'INVALID_VOTE');
    if (!voteValidation.valid || !voteValidation.data) return;

    const wantsRematch = voteValidation.data.wantsRematch;

    // Only active players can vote
    if (!validateActivePlayer(socket, instance, player, 'vote')) return;

    handleCopyCatRematchVote(instance, player.id, wantsRematch);
    logHandler('CopyCat', `${player.user.fullName} voted for rematch: ${wantsRematch}`);
  });
}
