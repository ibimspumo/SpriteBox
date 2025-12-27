// apps/server/src/gameModes/zombiePixel/systems/EffectSystem.ts
// Effect management system

import type { ZombiePixelPlayer } from '../types.js';
import type { ActiveEffect, ItemDefinition, ItemEffectType, ItemSystemState } from './itemTypes.js';
import { getItemDefinition } from './ItemRegistry.js';
import { generateId } from '../../../utils.js';

export interface EffectSystemCallbacks {
  onEffectStarted?: (effect: ActiveEffect, definition: ItemDefinition) => void;
  onEffectEnded?: (effect: ActiveEffect, definition: ItemDefinition) => void;
}

/**
 * System for managing active effects
 */
export class EffectSystem {
  private playerZombieStatus: Map<string, boolean> = new Map();
  private callbacks: EffectSystemCallbacks = {};

  /**
   * Set callback handlers
   */
  setCallbacks(callbacks: EffectSystemCallbacks): void {
    this.callbacks = callbacks;
  }

  /**
   * Update player zombie status (needed for effect resolution)
   */
  setPlayerZombieStatus(playerId: string, isZombie: boolean): void {
    this.playerZombieStatus.set(playerId, isZombie);
  }

  /**
   * Check if player is a zombie
   */
  isZombie(playerId: string): boolean {
    return this.playerZombieStatus.get(playerId) ?? false;
  }

  /**
   * Create an effect from an item definition
   */
  createEffect(definition: ItemDefinition, player: ZombiePixelPlayer): ActiveEffect | null {
    const now = Date.now();

    let expiresAt: number | null = null;
    let remainingUses: number | null = null;

    switch (definition.duration.type) {
      case 'instant':
        // Instant effects don't create a lasting effect
        return null;
      case 'timed':
        expiresAt = now + definition.duration.durationMs;
        break;
      case 'uses':
        remainingUses = definition.duration.count;
        break;
    }

    // Determine who is affected
    const affectedId = definition.sharedEffect ? (player.isZombie ? 'zombies' : 'survivors') : player.id;

    return {
      id: `effect_${generateId(8)}`,
      itemId: definition.id,
      type: definition.effect,
      affectedId,
      startedAt: now,
      expiresAt,
      remainingUses,
      sourcePlayerId: player.id,
      data: { ...definition.effectParams },
    };
  }

  /**
   * Add effect to state and trigger callback
   */
  addEffect(state: ItemSystemState, effect: ActiveEffect): void {
    state.activeEffects.set(effect.id, effect);
    const definition = getItemDefinition(effect.itemId);
    if (definition) {
      this.callbacks.onEffectStarted?.(effect, definition);
    }
  }

  /**
   * Update active effects (expire timed ones)
   */
  updateEffects(state: ItemSystemState): void {
    const now = Date.now();

    for (const [id, effect] of state.activeEffects) {
      // Check timed expiration
      if (effect.expiresAt !== null && now >= effect.expiresAt) {
        const definition = getItemDefinition(effect.itemId);
        state.activeEffects.delete(id);
        if (definition) {
          this.callbacks.onEffectEnded?.(effect, definition);
        }
      }

      // Check uses expiration
      if (effect.remainingUses !== null && effect.remainingUses <= 0) {
        const definition = getItemDefinition(effect.itemId);
        state.activeEffects.delete(id);
        if (definition) {
          this.callbacks.onEffectEnded?.(effect, definition);
        }
      }
    }
  }

  /**
   * Consume a use from an effect (e.g., healing touch)
   * Returns true if the effect was consumed
   */
  consumeEffectUse(state: ItemSystemState, effectType: ItemEffectType, playerId: string): boolean {
    for (const effect of state.activeEffects.values()) {
      if (effect.type !== effectType) continue;

      // Check if this player has this effect
      const hasEffect =
        effect.affectedId === playerId ||
        (effect.affectedId === 'survivors' && !this.isZombie(playerId)) ||
        (effect.affectedId === 'zombies' && this.isZombie(playerId));

      if (!hasEffect) continue;

      if (effect.remainingUses !== null && effect.remainingUses > 0) {
        effect.remainingUses--;
        return true;
      }
    }
    return false;
  }

  /**
   * Check if zombies have speed boost active
   */
  hasZombieSpeedBoost(state: ItemSystemState): boolean {
    for (const effect of state.activeEffects.values()) {
      if (effect.type === 'speed-boost' && effect.affectedId === 'zombies') {
        return true;
      }
    }
    return false;
  }

  /**
   * Get remaining time for zombie speed boost (in ms)
   */
  getZombieSpeedBoostRemaining(state: ItemSystemState): number {
    const now = Date.now();
    for (const effect of state.activeEffects.values()) {
      if (effect.type === 'speed-boost' && effect.affectedId === 'zombies' && effect.expiresAt) {
        return Math.max(0, effect.expiresAt - now);
      }
    }
    return 0;
  }

  /**
   * Check if a player has healing touch
   */
  hasHealingTouch(state: ItemSystemState, playerId: string): boolean {
    for (const effect of state.activeEffects.values()) {
      if (effect.type === 'healing-touch' && effect.affectedId === playerId) {
        if (effect.remainingUses !== null && effect.remainingUses > 0) {
          return true;
        }
      }
    }
    return false;
  }

  /**
   * Get all players with healing touch
   */
  getPlayersWithHealingTouch(state: ItemSystemState): string[] {
    const players: string[] = [];
    for (const effect of state.activeEffects.values()) {
      if (effect.type === 'healing-touch' && effect.remainingUses !== null && effect.remainingUses > 0) {
        players.push(effect.affectedId);
      }
    }
    return players;
  }

  /**
   * Check if a specific effect is active for a player or team
   */
  hasEffect(state: ItemSystemState, effectType: ItemEffectType, targetId: string): boolean {
    for (const effect of state.activeEffects.values()) {
      if (effect.type !== effectType) continue;
      if (effect.affectedId === targetId) return true;
      if (effect.affectedId === 'zombies' && this.isZombie(targetId)) return true;
      if (effect.affectedId === 'survivors' && !this.isZombie(targetId)) return true;
    }
    return false;
  }

  /**
   * Get all active effects
   */
  getActiveEffects(state: ItemSystemState): ActiveEffect[] {
    return Array.from(state.activeEffects.values());
  }
}
