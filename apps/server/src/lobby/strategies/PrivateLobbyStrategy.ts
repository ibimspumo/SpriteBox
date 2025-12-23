// apps/server/src/lobby/strategies/PrivateLobbyStrategy.ts

/**
 * PrivateLobbyStrategy - For private room instances
 *
 * Features:
 * - No auto-start (host must manually start)
 * - Host can start when minimum players reached
 * - Players can join until full
 * - Lower minimum player count (2 vs 5 for public)
 */

import type { LobbyStrategy, JoinResult, StartResult, LobbyTimerConfig } from '../types.js';
import type { Instance, Player } from '../../types.js';
import type { GameModeConfig } from '../../gameModes/types.js';
import { TIMERS } from '../../constants.js';

export class PrivateLobbyStrategy implements LobbyStrategy {
  private config: GameModeConfig;

  constructor(config: GameModeConfig) {
    this.config = config;
  }

  canJoin(instance: Instance, _player: Player): JoinResult {
    // Check if full (use privateMax if available)
    const maxPlayers = this.config.players.privateMax ?? this.config.players.max;
    if (instance.players.size >= maxPlayers) {
      return { success: false, spectator: false, error: 'Room is full' };
    }

    // Check if game already running
    if (instance.phase !== 'lobby') {
      // Allow joining as spectator if enabled
      if (this.config.lobby.allowSpectators) {
        return { success: true, spectator: true };
      }
      return { success: false, spectator: false, error: 'Game already in progress' };
    }

    return { success: true, spectator: false };
  }

  shouldAutoStart(_instance: Instance): boolean {
    // Private instances never auto-start
    return false;
  }

  getAutoStartThreshold(_instance: Instance): number {
    // Not used for private instances, but return max to prevent accidental starts
    return this.config.players.privateMax ?? this.config.players.max;
  }

  shouldStartTimer(_instance: Instance): LobbyTimerConfig {
    // Private instances don't use auto-start timers
    return { shouldStart: false, duration: 0 };
  }

  shouldStartImmediately(_instance: Instance): boolean {
    // Private instances never auto-start
    return false;
  }

  canStartManually(instance: Instance, playerId: string): StartResult {
    // Only host can start
    if (instance.hostId !== playerId) {
      return { success: false, error: 'Only the host can start the game' };
    }

    // Check if game already running
    if (instance.phase !== 'lobby') {
      return { success: false, error: 'Game already in progress' };
    }

    // Check minimum players (private rooms have lower minimum)
    const minPlayers = this.getMinPlayers(instance);
    if (instance.players.size < minPlayers) {
      return { success: false, error: `Need at least ${minPlayers} players` };
    }

    return { success: true };
  }

  getMinPlayers(_instance: Instance): number {
    // Private rooms use privateMinPlayers if set, otherwise regular min
    return this.config.players.privateMin ?? this.config.players.min;
  }

  getMaxPlayers(_instance: Instance): number {
    return this.config.players.privateMax ?? this.config.players.max;
  }

  getLobbyTimeout(_instance: Instance): number {
    // Private rooms don't timeout, but return config value for consistency
    return this.config.timers.lobby ?? TIMERS.LOBBY_TIMEOUT;
  }

  onPlayerJoin(_instance: Instance, _player: Player): boolean {
    // State changed - update player list
    return true;
  }

  onPlayerLeave(instance: Instance, playerId: string): boolean {
    // If host leaves, might need to transfer host or cleanup
    if (instance.hostId === playerId) {
      // Host transfer could be implemented here
      // For now, room persists until empty
    }
    return true;
  }

  shouldCleanup(instance: Instance): boolean {
    // Clean up empty private rooms
    return instance.phase === 'lobby' && instance.players.size === 0;
  }
}
