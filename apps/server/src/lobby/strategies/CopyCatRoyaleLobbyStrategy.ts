// apps/server/src/lobby/strategies/CopyCatRoyaleLobbyStrategy.ts

/**
 * CopyCatRoyaleLobbyStrategy - For CopyCat Royale battle royale mode
 *
 * Features:
 * - Requires minimum 10 players to start
 * - Auto-starts when threshold is reached (with timer)
 * - No late join during game (eliminated players become spectators)
 * - Host can start manually in private rooms (if 10+ players)
 */

import type { LobbyStrategy, JoinResult, StartResult, LobbyTimerConfig } from '../types.js';
import type { Instance, Player } from '../../types.js';
import type { GameModeConfig } from '../../gameModes/types.js';
import { TIMERS } from '../../constants.js';

export class CopyCatRoyaleLobbyStrategy implements LobbyStrategy {
  private config: GameModeConfig;

  constructor(config: GameModeConfig) {
    this.config = config;
  }

  canJoin(instance: Instance, _player: Player): JoinResult {
    // Check if full
    if (instance.players.size >= this.config.players.max) {
      // Allow spectating if allowed
      if (this.config.lobby.allowSpectators) {
        return { success: true, spectator: true };
      }
      return { success: false, spectator: false, error: 'Instance is full' };
    }

    // Check if game already running
    if (instance.phase !== 'lobby') {
      // Allow joining as spectator (to watch eliminated players)
      if (this.config.lobby.allowSpectators) {
        return { success: true, spectator: true };
      }
      return { success: false, spectator: false, error: 'Game in progress' };
    }

    return { success: true, spectator: false };
  }

  shouldAutoStart(_instance: Instance): boolean {
    // CopyCat Royale uses auto-start
    return true;
  }

  getAutoStartThreshold(_instance: Instance): number {
    // Need at least 10 players
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

  canStartManually(instance: Instance, playerId: string): StartResult {
    // Only host can start manually in private rooms
    if (instance.type !== 'private') {
      return { success: false, error: 'Public instances use auto-start only' };
    }

    if (instance.hostId !== playerId) {
      return { success: false, error: 'Only the host can start the game' };
    }

    const minPlayers = this.getMinPlayers(instance);
    if (instance.players.size < minPlayers) {
      return { success: false, error: `Need at least ${minPlayers} players` };
    }

    return { success: true };
  }

  getMinPlayers(instance: Instance): number {
    if (instance.type === 'private') {
      return this.config.players.privateMin ?? this.config.players.min;
    }
    return this.config.players.min;
  }

  getMaxPlayers(_instance: Instance): number {
    return this.config.players.max;
  }

  getLobbyTimeout(_instance: Instance): number {
    return this.config.timers.lobby ?? TIMERS.LOBBY_TIMEOUT;
  }

  onPlayerJoin(_instance: Instance, _player: Player): boolean {
    // State may have changed
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

  /**
   * Check if timer should be cancelled (below threshold)
   */
  shouldCancelTimer(instance: Instance): boolean {
    const threshold = this.getAutoStartThreshold(instance);
    return instance.players.size < threshold;
  }
}
