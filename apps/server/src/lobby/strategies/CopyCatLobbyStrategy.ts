// apps/server/src/lobby/strategies/CopyCatLobbyStrategy.ts

/**
 * CopyCatLobbyStrategy - For CopyCat 1v1 game mode
 *
 * Features:
 * - Always 1v1 (exactly 2 players)
 * - 5-second countdown starts when 2 players join
 * - Countdown aborted if a player leaves during countdown
 * - No spectators allowed
 * - Works for both public and private rooms
 */

import type { LobbyStrategy, JoinResult, StartResult, LobbyTimerConfig } from '../types.js';
import type { Instance, Player } from '../../types.js';
import type { GameModeConfig } from '../../gameModes/types.js';

export class CopyCatLobbyStrategy implements LobbyStrategy {
  private config: GameModeConfig;

  constructor(config: GameModeConfig) {
    this.config = config;
  }

  canJoin(instance: Instance, _player: Player): JoinResult {
    // CopyCat is always 1v1, no joining if 2 players already
    if (instance.players.size >= 2) {
      return { success: false, spectator: false, error: 'Game is full (1v1 only)' };
    }

    // No joining after game started (no spectators in CopyCat)
    if (instance.phase !== 'lobby') {
      return { success: false, spectator: false, error: 'Game already in progress' };
    }

    return { success: true, spectator: false };
  }

  shouldAutoStart(_instance: Instance): boolean {
    // CopyCat always auto-starts when 2 players join
    return true;
  }

  getAutoStartThreshold(_instance: Instance): number {
    // Always 2 for CopyCat
    return 2;
  }

  shouldStartTimer(instance: Instance): LobbyTimerConfig {
    const playerCount = instance.players.size;
    const duration = this.config.timers.countdown ?? 5_000;

    // Start countdown immediately when we have 2 players
    if (playerCount >= 2 && !instance.lobbyTimer) {
      return { shouldStart: true, duration };
    }

    return { shouldStart: false, duration };
  }

  shouldStartImmediately(_instance: Instance): boolean {
    // Never start immediately - always use the countdown timer
    // This gives players time to prepare before the game starts
    return false;
  }

  canStartManually(instance: Instance, playerId: string): StartResult {
    // In private rooms, host can start if we have 2 players
    if (instance.type === 'private') {
      if (instance.hostId !== playerId) {
        return { success: false, error: 'Only the host can start the game' };
      }
      if (instance.players.size < 2) {
        return { success: false, error: 'Need exactly 2 players' };
      }
      return { success: true };
    }

    // Public rooms auto-start only
    return { success: false, error: 'CopyCat uses auto-start' };
  }

  getMinPlayers(_instance: Instance): number {
    return 2;
  }

  getMaxPlayers(_instance: Instance): number {
    return 2;
  }

  getLobbyTimeout(_instance: Instance): number {
    // No lobby timeout for CopyCat - game starts immediately at 2 players
    return 0;
  }

  onPlayerJoin(_instance: Instance, _player: Player): boolean {
    // State changes when we reach 2 players
    return true;
  }

  onPlayerLeave(_instance: Instance, _playerId: string): boolean {
    // Timer cancellation is handled by checkCancelLobbyTimer() in instance.ts
    // which emits the 'lobby-timer-cancelled' event to notify clients
    return true;
  }

  shouldCleanup(instance: Instance): boolean {
    // Clean up empty lobbies or if only 1 player left and game was in progress
    if (instance.phase === 'lobby' && instance.players.size === 0) {
      return true;
    }
    // Clean up if game was interrupted and no players left
    if (instance.phase !== 'lobby' && instance.players.size === 0) {
      return true;
    }
    return false;
  }
}
