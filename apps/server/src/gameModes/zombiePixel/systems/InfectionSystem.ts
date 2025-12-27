// apps/server/src/gameModes/zombiePixel/systems/InfectionSystem.ts
// Infection processing system

import type { Server } from 'socket.io';
import type { Instance } from '../../../types.js';
import type { ServerToClientEvents, ClientToServerEvents } from '../../../types.js';
import type { ZombiePixelState, ZombiePixelPlayer, ZombieInfectionEvent } from '../types.js';
import { ZOMBIE_PIXEL_CONSTANTS } from '../types.js';
import { ZombieBotManager } from '../botManager.js';
import { ItemSystemManager } from '../itemSystem.js';
import { log } from '../../../utils.js';

type TypedServer = Server<ClientToServerEvents, ServerToClientEvents>;

export interface InfectionResult {
  infectionsProcessed: number;
  healingsProcessed: number;
}

/**
 * System for handling zombie infections and healing
 */
export class InfectionSystem {
  /**
   * Process all zombie-survivor collisions
   */
  processInfections(
    instance: Instance,
    io: TypedServer,
    itemManager: ItemSystemManager
  ): InfectionResult {
    const state = instance.zombiePixel;
    if (!state) return { infectionsProcessed: 0, healingsProcessed: 0 };

    const result: InfectionResult = { infectionsProcessed: 0, healingsProcessed: 0 };
    const zombies = Array.from(state.players.values()).filter((p) => p.isZombie);
    const survivors = Array.from(state.players.values()).filter((p) => !p.isZombie);

    for (const zombie of zombies) {
      for (const survivor of survivors) {
        // Check if on same position
        if (zombie.position.x === survivor.position.x && zombie.position.y === survivor.position.y) {
          // Check if survivor has healing touch - if so, heal the zombie instead!
          if (survivor.hasHealingItem) {
            this.processHealing(instance, io, state, itemManager, zombie, survivor);
            result.healingsProcessed++;
            continue;
          }

          // Normal infection
          this.processInfection(instance, io, state, itemManager, zombie, survivor, survivors.length);
          result.infectionsProcessed++;
        }
      }
    }

    return result;
  }

  /**
   * Process healing (survivor heals zombie)
   */
  private processHealing(
    instance: Instance,
    io: TypedServer,
    state: ZombiePixelState,
    itemManager: ItemSystemManager,
    zombie: ZombiePixelPlayer,
    healer: ZombiePixelPlayer
  ): void {
    // Consume the healing effect
    itemManager.consumeEffectUse('healing-touch', healer.id);
    healer.hasHealingItem = false;

    // "Heal" the zombie - they become a survivor again!
    zombie.isZombie = false;
    zombie.isAlive = true;
    zombie.infectedAt = undefined;
    zombie.infectedBy = undefined;

    // Update item manager zombie status
    itemManager.setPlayerZombieStatus(zombie.id, false);

    // Update bot manager if it's a bot
    const botManager = (state as ZombiePixelState & { botManager: ZombieBotManager }).botManager;
    if (zombie.isBot) {
      botManager.healBot(zombie.id);
    }

    // Broadcast healing event
    io.to(instance.id).emit('zombie-healed', {
      healedId: zombie.id,
      healedName: zombie.user.fullName,
      healerId: healer.id,
      healerName: healer.user.fullName,
    });

    log('ZombiePixel', `${zombie.user.fullName} was healed by ${healer.user.fullName}!`);
  }

  /**
   * Process normal infection (zombie infects survivor)
   */
  private processInfection(
    instance: Instance,
    io: TypedServer,
    state: ZombiePixelState,
    itemManager: ItemSystemManager,
    zombie: ZombiePixelPlayer,
    survivor: ZombiePixelPlayer,
    currentSurvivorCount: number
  ): void {
    survivor.isZombie = true;
    survivor.isAlive = false;
    survivor.infectedAt = Date.now();
    survivor.infectedBy = zombie.id;

    // Update item manager zombie status
    itemManager.setPlayerZombieStatus(survivor.id, true);

    // Add +1 second to timer on infection
    state.timerExtensionsMs += ZOMBIE_PIXEL_CONSTANTS.TIMER_EXTENSION_MS;

    // Log the infection
    const event: ZombieInfectionEvent = {
      timestamp: Date.now(),
      victimId: survivor.id,
      victimName: survivor.user.fullName,
      zombieId: zombie.id,
      zombieName: zombie.user.fullName,
      survivorsRemaining: currentSurvivorCount - 1,
    };
    state.infectionLog.push(event);

    // Update bot manager if it's a bot
    const botManager = (state as ZombiePixelState & { botManager: ZombieBotManager }).botManager;
    if (survivor.isBot) {
      botManager.infectBot(survivor.id, zombie.id, Date.now());
    }

    // Broadcast infection event (including timer extension)
    io.to(instance.id).emit('zombie-infection', {
      victimId: survivor.id,
      victimName: survivor.user.fullName,
      zombieId: zombie.id,
      zombieName: zombie.user.fullName,
      survivorsRemaining: currentSurvivorCount - 1,
      timerExtendedBy: ZOMBIE_PIXEL_CONSTANTS.TIMER_EXTENSION_MS,
    });

    log('ZombiePixel', `${survivor.user.fullName} infected by ${zombie.user.fullName} (+1s timer)`);
  }
}
