// apps/server/src/handlers/modes/pixelGuesser.ts
// PixelGuesser-specific event handlers

import type { TypedSocket, TypedServer, Player } from '../types.js';
import {
  emitError,
  validatePhaseTime,
  checkRateLimitAndEmit,
  checkRateLimitSilent,
  checkGameMode,
  checkPhase,
  validateActivePlayer,
  validateAndEmit,
  logHandler,
} from '../common.js';
import { findInstance } from '../../instance.js';
import { PixelGuesserDrawSchema, PixelGuesserGuessSchema, validate } from '../../validation.js';
import { handlePixelGuesserDrawUpdate, handlePixelGuesserGuess } from '../../phases.js';

/**
 * Register PixelGuesser mode socket event handlers
 */
export function registerPixelGuesserHandlers(socket: TypedSocket, io: TypedServer, player: Player): void {
  // PixelGuesser: Artist draws (live updates)
  socket.on('pixelguesser-draw', (data: unknown) => {
    const instanceId = socket.data.instanceId;
    if (!instanceId || instanceId === 'pending') {
      return; // Silently ignore - high frequency event
    }

    const instance = findInstance(instanceId);
    if (!instance) {
      return; // Silently ignore
    }

    // Check game mode and phase silently
    if (!checkGameMode(instance, 'pixel-guesser') || !checkPhase(instance, 'guessing')) {
      return; // Silently ignore
    }

    // Rate limit (higher limit for drawing updates) - silently
    if (!checkRateLimitSilent(socket, 'pixelguesser-draw')) {
      return; // Silently ignore rate limit
    }

    // Validate
    const validation = validate(PixelGuesserDrawSchema, data);
    if (!validation.success) {
      return; // Silently ignore invalid data
    }

    // Process drawing update
    handlePixelGuesserDrawUpdate(instance, player.id, validation.data.pixels);
  });

  // PixelGuesser: Player guesses
  socket.on('pixelguesser-guess', (data: unknown) => {
    const instanceId = socket.data.instanceId;
    if (!instanceId || instanceId === 'pending') {
      emitError(socket, 'NOT_IN_GAME', 'Not in a game');
      return;
    }

    const instance = findInstance(instanceId);
    if (!instance) {
      emitError(socket, 'INSTANCE_NOT_FOUND', 'Instance not found');
      return;
    }

    if (instance.gameMode !== 'pixel-guesser') {
      emitError(socket, 'WRONG_MODE', 'Not in PixelGuesser mode');
      return;
    }

    if (instance.phase !== 'guessing') {
      emitError(socket, 'WRONG_PHASE', 'Not in guessing phase');
      return;
    }

    // Rate limit check
    if (!checkRateLimitAndEmit(socket, 'pixelguesser-guess')) return;

    // Check timing
    if (!validatePhaseTime(socket, instanceId)) return;

    // Validate
    const guessValidation = validateAndEmit(socket, PixelGuesserGuessSchema, data, 'INVALID_GUESS');
    if (!guessValidation.valid || !guessValidation.data) return;

    // Only active players can guess
    if (!validateActivePlayer(socket, instance, player, 'guess')) return;

    const result = handlePixelGuesserGuess(instance, player.id, guessValidation.data.guess);
    if (!result.success && result.error) {
      emitError(socket, 'GUESS_FAILED', result.error);
    }
  });
}
