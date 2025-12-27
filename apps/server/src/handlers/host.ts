// apps/server/src/handlers/host.ts
// Host control event handlers: start-game, kick-player, change-password

import type { TypedSocket, TypedServer, Player } from './types.js';
import {
  emitError,
  validateInstanceAndPhase,
  validateHost,
  validatePrivateRoom,
  logHandler,
} from './common.js';
import {
  findInstance,
  removePlayerFromInstance,
  startGameManually,
  changeRoomPassword,
} from '../instance.js';
import { validatePasswordFormat } from '../password.js';
import { untrackBrowserFromInstance } from '../fingerprint.js';
import { MIN_PLAYERS_TO_START } from '../constants.js';

/**
 * Register host control socket event handlers
 */
export function registerHostHandlers(socket: TypedSocket, io: TypedServer, player: Player): void {
  // Host starts game manually (private rooms only)
  socket.on('host-start-game', () => {
    const instanceId = socket.data.instanceId;
    if (!instanceId) {
      emitError(socket, 'NOT_IN_GAME', 'Not in a game');
      return;
    }

    const instance = findInstance(instanceId);
    if (!instance) {
      emitError(socket, 'INSTANCE_NOT_FOUND', 'Instance not found');
      return;
    }

    // Only host can start (and must still be in game)
    if (instance.hostId !== player.id || !instance.players.has(player.id)) {
      emitError(socket, 'NOT_HOST', 'Only the host can start the game');
      return;
    }

    // Check minimum players
    if (instance.players.size < MIN_PLAYERS_TO_START) {
      emitError(socket, 'NOT_ENOUGH_PLAYERS', `Need at least ${MIN_PLAYERS_TO_START} players`);
      return;
    }

    // Start game
    const result = startGameManually(instance);
    if (!result.success) {
      emitError(socket, 'START_FAILED', result.error || 'Failed to start game');
      return;
    }

    logHandler('Host', `${player.user.fullName} started game in room ${instance.code}`);
  });

  // Host kicks player (private rooms only, only in lobby)
  socket.on('host-kick-player', (data) => {
    const instanceId = socket.data.instanceId;
    if (!instanceId) {
      emitError(socket, 'NOT_IN_GAME', 'Not in a game');
      return;
    }

    const instance = findInstance(instanceId);
    if (!instance || instance.hostId !== player.id) {
      emitError(socket, 'NOT_HOST', 'Only the host can kick players');
      return;
    }

    if (instance.phase !== 'lobby') {
      emitError(socket, 'GAME_IN_PROGRESS', 'Cannot kick during game');
      return;
    }

    if (!data?.playerId || typeof data.playerId !== 'string') {
      emitError(socket, 'INVALID_PLAYER_ID', 'Invalid player ID');
      return;
    }

    const targetPlayer = instance.players.get(data.playerId);
    if (!targetPlayer) {
      emitError(socket, 'PLAYER_NOT_FOUND', 'Player not found');
      return;
    }

    // Cannot kick self
    if (data.playerId === player.id) {
      emitError(socket, 'CANNOT_KICK_SELF', 'Cannot kick yourself');
      return;
    }

    removePlayerFromInstance(instance, data.playerId);

    // Inform kicked player
    io.to(targetPlayer.socketId).emit('kicked', { reason: 'Host kicked you' });
    io.sockets.sockets.get(targetPlayer.socketId)?.leave(instance.id);

    // Reset socket.data for kicked player and untrack browser
    const kickedSocket = io.sockets.sockets.get(targetPlayer.socketId);
    if (kickedSocket) {
      untrackBrowserFromInstance(kickedSocket.data.browserId, instance.id);
      kickedSocket.data.instanceId = null;
    }

    // Inform everyone
    io.to(instance.id).emit('player-left', {
      playerId: data.playerId,
      user: targetPlayer.user,
      kicked: true,
    });

    logHandler('Host', `${player.user.fullName} kicked ${targetPlayer.user.fullName}`);
  });

  // Host changes password (private rooms only)
  socket.on('host-change-password', async (data) => {
    const instanceId = socket.data.instanceId;
    if (!instanceId || instanceId === 'pending') {
      emitError(socket, 'NOT_IN_GAME', 'Not in a game');
      return;
    }

    const instance = findInstance(instanceId);
    if (!instance || instance.hostId !== player.id) {
      emitError(socket, 'NOT_HOST', 'Only the host can change password');
      return;
    }

    if (instance.type !== 'private') {
      emitError(socket, 'NOT_PRIVATE_ROOM', 'Only private rooms can have passwords');
      return;
    }

    // Validate new password if provided
    if (data?.password !== null && data?.password !== undefined) {
      const pwValidation = validatePasswordFormat(data.password);
      if (!pwValidation.valid) {
        emitError(socket, 'INVALID_PASSWORD', pwValidation.error || 'Invalid password');
        return;
      }
    }

    try {
      const result = await changeRoomPassword(instance, data?.password ?? null);
      if (!result.success) {
        emitError(socket, 'PASSWORD_CHANGE_FAILED', result.error || 'Password change failed');
        return;
      }

      // Notify all players in the room
      io.to(instance.id).emit('password-changed', { hasPassword: !!data?.password });

      logHandler(
        'Host',
        `${player.user.fullName} ${data?.password ? 'set' : 'removed'} password for room ${instance.code}`,
      );
    } catch (error) {
      logHandler('Error', `Password change failed for room ${instance.code}: ${error}`);
      emitError(socket, 'PASSWORD_CHANGE_FAILED', 'Password change failed');
    }
  });
}
