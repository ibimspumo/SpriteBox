// apps/server/src/handlers/modes/zombiePixel.ts
// ZombiePixel-specific event handlers

import type { TypedSocket, TypedServer, Player } from '../types.js';
import { checkRateLimitSilent, checkGameMode, checkPhase } from '../common.js';
import { findInstance } from '../../instance.js';
import { ZombieMoveSchema, validate } from '../../validation.js';
import { handlePlayerMove } from '../../gameModes/zombiePixel/index.js';

/**
 * Register ZombiePixel mode socket event handlers
 */
export function registerZombiePixelHandlers(socket: TypedSocket, io: TypedServer, player: Player): void {
  // ZombiePixel: Player movement
  socket.on('zombie-move', (data) => {
    const instanceId = socket.data.instanceId;
    if (!instanceId || instanceId === 'pending') {
      return; // Silently ignore - high frequency event
    }

    const instance = findInstance(instanceId);
    if (!instance) {
      return; // Silently ignore
    }

    // Check game mode and phase silently
    if (!checkGameMode(instance, 'zombie-pixel') || !checkPhase(instance, 'active')) {
      return; // Silently ignore
    }

    // Rate limit (higher limit for movement updates) - silently
    if (!checkRateLimitSilent(socket, 'zombie-move')) {
      return; // Silently ignore rate limit
    }

    // Validate
    const validation = validate(ZombieMoveSchema, data);
    if (!validation.success) {
      return; // Silently ignore invalid data
    }

    // Process movement
    handlePlayerMove(instance, player.id, validation.data.direction);
  });
}
