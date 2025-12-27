// apps/server/src/handlers/common.ts
// Common utilities for socket handlers

import type { ZodSchema } from 'zod';
import type { TypedSocket, ValidationResult, InstanceValidationResult, Instance, GamePhase, Player } from './types.js';
import { findInstance } from '../instance.js';
import { isWithinPhaseTime } from '../phases.js';
import { checkRateLimit } from '../rateLimit.js';
import { validate } from '../validation.js';
import { log } from '../utils.js';

/**
 * Emit an error to the socket
 */
export function emitError(socket: TypedSocket, code: string, message: string): void {
  socket.emit('error', { code, message });
}

/**
 * Validate that the socket is in a game instance and optionally in a specific phase
 */
export function validateInstanceAndPhase(
  socket: TypedSocket,
  expectedPhase?: GamePhase | GamePhase[],
): InstanceValidationResult {
  const instanceId = socket.data.instanceId;

  if (!instanceId || instanceId === 'pending') {
    emitError(socket, 'NOT_IN_GAME', 'Not in a game');
    return { valid: false, instance: null };
  }

  const instance = findInstance(instanceId);
  if (!instance) {
    emitError(socket, 'INSTANCE_NOT_FOUND', 'Instance not found');
    return { valid: false, instance: null };
  }

  if (expectedPhase !== undefined) {
    const phases = Array.isArray(expectedPhase) ? expectedPhase : [expectedPhase];
    if (!phases.includes(instance.phase)) {
      const phaseList = phases.join(' or ');
      emitError(socket, 'WRONG_PHASE', `Not in ${phaseList} phase`);
      return { valid: false, instance: null };
    }
  }

  return { valid: true, instance };
}

/**
 * Validate that the current phase timing is still valid
 */
export function validatePhaseTime(socket: TypedSocket, instanceId: string): boolean {
  if (!isWithinPhaseTime(instanceId)) {
    emitError(socket, 'TIME_EXPIRED', 'Phase time expired');
    return false;
  }
  return true;
}

/**
 * Validate that the player is an active player (not spectator)
 */
export function validateActivePlayer(
  socket: TypedSocket,
  instance: Instance,
  player: Player,
  action = 'perform this action',
): boolean {
  if (!instance.players.has(player.id)) {
    emitError(socket, 'NOT_ACTIVE_PLAYER', `Only active players can ${action}`);
    return false;
  }
  return true;
}

/**
 * Validate that the player is the host of the instance
 */
export function validateHost(socket: TypedSocket, instance: Instance, player: Player): boolean {
  if (instance.hostId !== player.id) {
    emitError(socket, 'NOT_HOST', 'Only the host can perform this action');
    return false;
  }
  return true;
}

/**
 * Validate that the player is still in the instance (connected)
 */
export function validatePlayerInInstance(
  socket: TypedSocket,
  instance: Instance,
  player: Player,
): boolean {
  if (!instance.players.has(player.id) && !instance.spectators.has(player.id)) {
    emitError(socket, 'NOT_IN_INSTANCE', 'Not in this game instance');
    return false;
  }
  return true;
}

/**
 * Validate input data with Zod schema and emit error on failure
 */
export function validateAndEmit<T>(
  socket: TypedSocket,
  schema: ZodSchema<T>,
  data: unknown,
  errorCode: string,
): ValidationResult<T> {
  const result = validate(schema, data);

  if (!result.success) {
    emitError(socket, errorCode, result.error);
    return { valid: false };
  }

  return { valid: true, data: result.data };
}

/**
 * Check rate limit and emit error if exceeded
 * @returns true if within rate limit, false if exceeded
 */
export function checkRateLimitAndEmit(socket: TypedSocket, eventName: string): boolean {
  if (!checkRateLimit(socket, eventName)) {
    emitError(socket, 'RATE_LIMITED', 'Too many requests');
    return false;
  }
  return true;
}

/**
 * Check rate limit silently (for high-frequency events)
 * @returns true if within rate limit, false if exceeded (no error emitted)
 */
export function checkRateLimitSilent(socket: TypedSocket, eventName: string): boolean {
  return checkRateLimit(socket, eventName);
}

/**
 * Log a handler action
 */
export function logHandler(category: string, message: string): void {
  log(category, message);
}

/**
 * Validate that the socket is not already in a game (for join events)
 * Returns true if the check passes (socket is NOT in a game)
 */
export function validateNotInGame(socket: TypedSocket): boolean {
  const instanceId = socket.data.instanceId;
  if (instanceId && instanceId !== 'pending') {
    emitError(socket, 'ALREADY_IN_GAME', 'Already in a game');
    return false;
  }
  return true;
}

/**
 * Validate that the instance is a private room
 */
export function validatePrivateRoom(socket: TypedSocket, instance: Instance): boolean {
  if (instance.type !== 'private') {
    emitError(socket, 'NOT_PRIVATE_ROOM', 'This action requires a private room');
    return false;
  }
  return true;
}

/**
 * Validate game mode matches
 */
export function validateGameMode(
  socket: TypedSocket,
  instance: Instance,
  expectedMode: string | string[],
): boolean {
  const modes = Array.isArray(expectedMode) ? expectedMode : [expectedMode];
  if (!modes.includes(instance.gameMode)) {
    const modeList = modes.join(' or ');
    emitError(socket, 'WRONG_MODE', `Not in ${modeList} mode`);
    return false;
  }
  return true;
}

/**
 * Validate game mode silently (for high-frequency events)
 */
export function checkGameMode(instance: Instance, expectedMode: string | string[]): boolean {
  const modes = Array.isArray(expectedMode) ? expectedMode : [expectedMode];
  return modes.includes(instance.gameMode);
}

/**
 * Validate phase silently (for high-frequency events)
 */
export function checkPhase(instance: Instance, expectedPhase: GamePhase | GamePhase[]): boolean {
  const phases = Array.isArray(expectedPhase) ? expectedPhase : [expectedPhase];
  return phases.includes(instance.phase);
}
