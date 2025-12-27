// apps/server/src/gameModes/zombiePixel/systems/BroadcastSystem.ts
// Game state broadcasting system

import type { Server } from 'socket.io';
import type { Instance } from '../../../types.js';
import type { ServerToClientEvents, ClientToServerEvents } from '../../../types.js';
import type { ZombieItemClient, ZombieEffectClient } from '../types.js';
import { ItemSystemManager } from '../itemSystem.js';

type TypedServer = Server<ClientToServerEvents, ServerToClientEvents>;

/**
 * System for broadcasting game state to clients
 */
export class BroadcastSystem {
  /**
   * Broadcast current game state to all players
   */
  broadcastGameState(instance: Instance, io: TypedServer, itemManager: ItemSystemManager): void {
    const state = instance.zombiePixel;
    if (!state) return;

    const players = Array.from(state.players.values()).map((p) => ({
      id: p.id,
      name: p.user.fullName,
      x: p.position.x,
      y: p.position.y,
      isZombie: p.isZombie,
      isBot: p.isBot,
      hasHealingItem: p.hasHealingItem,
    }));

    const survivorCount = players.filter((p) => !p.isZombie).length;
    const zombieCount = players.filter((p) => p.isZombie).length;

    const elapsed = Date.now() - state.gameStartTime;
    const totalDuration = state.gameDurationMs + state.timerExtensionsMs;
    const timeRemaining = Math.max(0, Math.ceil((totalDuration - elapsed) / 1000));

    // Get items and effects for broadcast
    const allItems = itemManager.getState().items;
    const items: ZombieItemClient[] = [];
    for (const item of allItems.values()) {
      if (item.collected) continue;
      const def = itemManager.getDefinition(item.definitionId);
      if (!def) continue;
      items.push({
        id: item.id,
        type: def.id,
        x: item.position.x,
        y: item.position.y,
        icon: def.icon,
        color: def.color,
      });
    }

    // Get active effects
    const effects: ZombieEffectClient[] = itemManager.getActiveEffects().map((e) => ({
      id: e.id,
      type: e.type,
      affectedId: e.affectedId,
      expiresAt: e.expiresAt,
      remainingUses: e.remainingUses,
    }));

    // Speed boost info for zombies
    const zombieSpeedBoostActive = itemManager.hasZombieSpeedBoost();
    const zombieSpeedBoostRemaining = itemManager.getZombieSpeedBoostRemaining();

    // Players with healing touch (warning for zombies)
    const playersWithHealingTouch = itemManager.getPlayersWithHealingTouch();

    io.to(instance.id).emit('zombie-game-state', {
      players,
      timeRemaining,
      survivorCount,
      zombieCount,
      items,
      effects,
      zombieSpeedBoostActive,
      zombieSpeedBoostRemaining,
      playersWithHealingTouch,
    });
  }
}
