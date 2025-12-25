// apps/server/src/lobby/strategies/CopyCatSoloLobbyStrategy.ts

/**
 * CopyCatSoloLobbyStrategy - For CopyCat Solo single-player mode
 *
 * Features:
 * - Always 1 player (solo practice)
 * - 3-second countdown starts when player joins
 * - No spectators
 * - Works for both public and private rooms
 */

import type { LobbyStrategy, JoinResult, StartResult, LobbyTimerConfig } from '../types.js';
import type { Instance, Player } from '../../types.js';
import type { GameModeConfig } from '../../gameModes/types.js';

export class CopyCatSoloLobbyStrategy implements LobbyStrategy {
  private config: GameModeConfig;

  constructor(config: GameModeConfig) {
    this.config = config;
  }

  canJoin(instance: Instance, _player: Player): JoinResult {
    // Solo mode - only 1 player allowed
    if (instance.players.size >= 1) {
      return { success: false, spectator: false, error: 'Solo mode - already occupied' };
    }

    // No joining after game started
    if (instance.phase !== 'lobby') {
      return { success: false, spectator: false, error: 'Game already in progress' };
    }

    return { success: true, spectator: false };
  }

  shouldAutoStart(_instance: Instance): boolean {
    // Solo mode always auto-starts when player joins
    return true;
  }

  getAutoStartThreshold(_instance: Instance): number {
    // Solo mode - 1 player
    return 1;
  }

  shouldStartTimer(instance: Instance): LobbyTimerConfig {
    const playerCount = instance.players.size;
    const duration = this.config.timers.countdown ?? 3_000;

    // Start countdown immediately when player joins
    if (playerCount >= 1 && !instance.lobbyTimer) {
      return { shouldStart: true, duration };
    }

    return { shouldStart: false, duration };
  }

  shouldStartImmediately(_instance: Instance): boolean {
    // Use countdown timer to give player time to prepare
    return false;
  }

  canStartManually(instance: Instance, playerId: string): StartResult {
    // In private rooms, the player can start immediately
    if (instance.type === 'private') {
      if (instance.hostId !== playerId) {
        return { success: false, error: 'Only the host can start the game' };
      }
      if (instance.players.size < 1) {
        return { success: false, error: 'Need at least 1 player' };
      }
      return { success: true };
    }

    // Public rooms auto-start only
    return { success: false, error: 'CopyCat Solo uses auto-start' };
  }

  getMinPlayers(_instance: Instance): number {
    return 1;
  }

  getMaxPlayers(_instance: Instance): number {
    return 1;
  }

  getLobbyTimeout(_instance: Instance): number {
    // No lobby timeout for solo mode
    return 0;
  }

  onPlayerJoin(_instance: Instance, _player: Player): boolean {
    // State changes when player joins
    return true;
  }

  onPlayerLeave(_instance: Instance, _playerId: string): boolean {
    // Timer cancellation handled by checkCancelLobbyTimer()
    return true;
  }

  shouldCleanup(instance: Instance): boolean {
    // Clean up empty instances
    if (instance.players.size === 0) {
      return true;
    }
    return false;
  }
}
