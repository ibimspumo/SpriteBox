// apps/server/src/lobby/strategies/StandardLobbyStrategy.ts

/**
 * StandardLobbyStrategy - For public game instances
 *
 * Features:
 * - Auto-start when player threshold is reached
 * - Immediate start when lobby is full
 * - Anyone can join until full
 * - No manual start (auto-start only)
 */

import type { LobbyStrategy, JoinResult, StartResult, LobbyTimerConfig } from '../types.js';
import type { Instance, Player } from '../../types.js';
import type { GameModeConfig } from '../../gameModes/types.js';
import { TIMERS } from '../../constants.js';

export class StandardLobbyStrategy implements LobbyStrategy {
  private config: GameModeConfig;

  constructor(config: GameModeConfig) {
    this.config = config;
  }

  canJoin(instance: Instance, _player: Player): JoinResult {
    // Check if full
    if (instance.players.size >= this.config.players.max) {
      return { success: false, spectator: false, error: 'Instance is full' };
    }

    // Check if game already running
    if (instance.phase !== 'lobby') {
      // Allow joining as spectator
      return { success: true, spectator: true };
    }

    return { success: true, spectator: false };
  }

  shouldAutoStart(_instance: Instance): boolean {
    // Public instances always auto-start
    return true;
  }

  getAutoStartThreshold(_instance: Instance): number {
    // Default to min players if not configured
    return this.config.lobby.autoStartThreshold ?? this.config.players.min;
  }

  shouldStartTimer(instance: Instance): LobbyTimerConfig {
    const threshold = this.getAutoStartThreshold(instance);
    const playerCount = instance.players.size;
    const duration = this.getLobbyTimeout(instance);

    // Start timer when threshold reached and no timer running
    if (playerCount >= threshold && !instance.lobbyTimer) {
      return { shouldStart: true, duration };
    }

    return { shouldStart: false, duration };
  }

  shouldStartImmediately(instance: Instance): boolean {
    // Start immediately when full
    return instance.players.size >= this.config.players.max;
  }

  canStartManually(_instance: Instance, _playerId: string): StartResult {
    // Public instances don't allow manual start
    return { success: false, error: 'Public instances use auto-start only' };
  }

  getMinPlayers(_instance: Instance): number {
    return this.config.players.min;
  }

  getMaxPlayers(_instance: Instance): number {
    return this.config.players.max;
  }

  getLobbyTimeout(_instance: Instance): number {
    return this.config.timers.lobby ?? TIMERS.LOBBY_TIMEOUT;
  }

  onPlayerJoin(_instance: Instance, _player: Player): boolean {
    // State may have changed if we reached threshold or max
    return true;
  }

  onPlayerLeave(_instance: Instance, _playerId: string): boolean {
    // State may have changed
    return true;
  }

  shouldCleanup(instance: Instance): boolean {
    // Clean up empty lobbies
    return instance.phase === 'lobby' && instance.players.size === 0;
  }
}
