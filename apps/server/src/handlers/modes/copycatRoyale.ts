// apps/server/src/handlers/modes/copycatRoyale.ts
// CopyCat Royale-specific event handlers

import type { TypedSocket, TypedServer, Player } from '../types.js';
import {
  emitError,
  validateInstanceAndPhase,
  checkRateLimitAndEmit,
  validateAndEmit,
  logHandler,
} from '../common.js';
import { findInstance } from '../../instance.js';
import { PixelSchema } from '../../validation.js';
import { handleRoyaleSubmission } from '../../phases.js';

/**
 * Register CopyCat Royale mode socket event handlers
 */
export function registerCopyCatRoyaleHandlers(socket: TypedSocket, io: TypedServer, player: Player): void {
  // CopyCat Royale: Submit drawing
  socket.on('royale-submit', (data) => {
    const instanceId = socket.data.instanceId;
    if (!instanceId || instanceId === 'pending') {
      emitError(socket, 'NOT_IN_GAME', 'You are not in a game');
      return;
    }

    const instance = findInstance(instanceId);
    if (!instance) {
      emitError(socket, 'INSTANCE_NOT_FOUND', 'Instance not found');
      return;
    }

    if (instance.gameMode !== 'copycat-royale') {
      emitError(socket, 'INVALID_GAME_MODE', 'Not a CopyCat Royale game');
      return;
    }

    // Check phase
    if (instance.phase !== 'royale-initial-drawing' && instance.phase !== 'royale-drawing') {
      emitError(socket, 'WRONG_PHASE', 'Not in drawing phase');
      return;
    }

    // Rate limit
    if (!checkRateLimitAndEmit(socket, 'submit-drawing')) return;

    // Validate pixels
    const validation = validateAndEmit(socket, PixelSchema, data, 'INVALID_PIXELS');
    if (!validation.valid || !validation.data) return;

    // Handle submission
    const result = handleRoyaleSubmission(instance, player.id, validation.data.pixels);
    if (!result.success) {
      emitError(socket, 'SUBMISSION_FAILED', result.error || 'Submission failed');
      return;
    }

    socket.emit('submission-received', {
      success: true,
      submissionCount: instance.submissions.length,
    });

    logHandler('CopyCatRoyale', `${player.user.fullName} submitted drawing`);
  });
}
