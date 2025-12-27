// apps/server/src/lobby/strategies/ZombiePixelLobbyStrategy.ts

/**
 * ZombiePixelLobbyStrategy - For Zombie Pixel game mode
 *
 * Features:
 * - Auto-fills lobby with bots when first real player joins
 * - Removes bots as more real players join
 * - Adds bots back if real players leave
 * - Timer starts when first real player joins
 * - Timer cancels if no real players remain
 * - Always maintains 100 total players (real + bots)
 */

import type { LobbyStrategy, JoinResult, StartResult, LobbyTimerConfig } from '../types.js';
import type { Instance, Player } from '../../types.js';
import type { GameModeConfig } from '../../gameModes/types.js';
import { ZOMBIE_PIXEL_CONSTANTS } from '../../gameModes/zombiePixel/types.js';

export class ZombiePixelLobbyStrategy implements LobbyStrategy {
  private config: GameModeConfig;

  constructor(config: GameModeConfig) {
    this.config = config;
  }

  /**
   * Count real (non-bot) players in the instance
   */
  private getRealPlayerCount(instance: Instance): number {
    let count = 0;
    for (const player of instance.players.values()) {
      if (!player.id.startsWith('bot_')) {
        count++;
      }
    }
    return count;
  }

  /**
   * Count bot players in the instance
   */
  private getBotCount(instance: Instance): number {
    let count = 0;
    for (const player of instance.players.values()) {
      if (player.id.startsWith('bot_')) {
        count++;
      }
    }
    return count;
  }

  canJoin(instance: Instance, _player: Player): JoinResult {
    // Check if game is running
    if (instance.phase !== 'lobby') {
      // Allow joining as spectator during game
      if (this.config.lobby.allowSpectators) {
        return { success: true, spectator: true };
      }
      return { success: false, spectator: false, error: 'Game in progress' };
    }

    // Real players can always join in lobby (bots will be removed to make room)
    return { success: true, spectator: false };
  }

  shouldAutoStart(_instance: Instance): boolean {
    // Zombie Pixel always auto-starts
    return true;
  }

  getAutoStartThreshold(_instance: Instance): number {
    // For zombie-pixel, we count real players only (bots don't count)
    // Timer starts at 1 real player, cancels at 0 real players
    return 1;
  }

  shouldStartTimer(instance: Instance): LobbyTimerConfig {
    const realPlayers = this.getRealPlayerCount(instance);
    const duration = this.getLobbyTimeout(instance);

    // Start timer when at least 1 real player is in lobby
    if (realPlayers >= 1 && !instance.lobbyTimer) {
      return { shouldStart: true, duration };
    }

    return { shouldStart: false, duration };
  }

  shouldStartImmediately(_instance: Instance): boolean {
    // Never start immediately - always wait for timer
    // This gives time for more real players to join
    return false;
  }

  canStartManually(instance: Instance, _playerId: string): StartResult {
    // Allow manual start for private rooms if there are at least 10 real players
    if (instance.type === 'private') {
      const realPlayers = this.getRealPlayerCount(instance);
      const minPlayers = this.config.players.privateMin ?? 10;
      if (realPlayers >= minPlayers) {
        return { success: true };
      }
      return { success: false, error: `Need at least ${minPlayers} players` };
    }

    return { success: false, error: 'Public instances use auto-start only' };
  }

  getMinPlayers(instance: Instance): number {
    // Private instances need 10 real players (no bots)
    if (instance.type === 'private') {
      return this.config.players.privateMin ?? 10;
    }
    // Public: Minimum 1 real player (rest are bots)
    return 1;
  }

  getMaxPlayers(_instance: Instance): number {
    return ZOMBIE_PIXEL_CONSTANTS.MAX_PLAYERS;
  }

  getLobbyTimeout(_instance: Instance): number {
    return this.config.timers.lobby ?? 30_000;
  }

  onPlayerJoin(_instance: Instance, _player: Player): boolean {
    // Note: Bot management is handled externally by the game loop
    // This method just signals that state changed
    return true;
  }

  onPlayerLeave(_instance: Instance, _playerId: string): boolean {
    // Note: Bot management is handled externally
    return true;
  }

  shouldCleanup(instance: Instance): boolean {
    // Only cleanup if lobby phase and no real players
    if (instance.phase !== 'lobby') return false;

    const realPlayers = this.getRealPlayerCount(instance);
    return realPlayers === 0;
  }

  /**
   * Check if timer should be cancelled (no real players)
   */
  shouldCancelTimer(instance: Instance): boolean {
    return this.getRealPlayerCount(instance) === 0;
  }
}
