// apps/server/src/lobby/types.ts

/**
 * LobbyStrategy Interface
 *
 * Defines the contract for lobby behavior in different game modes and room types.
 * Each combination of game mode and room type can have different lobby rules.
 */

import type { Instance, Player } from '../types.js';

/**
 * Result of a player join attempt
 */
export interface JoinResult {
  success: boolean;
  spectator: boolean;
  error?: string;
}

/**
 * Result of a manual start attempt
 */
export interface StartResult {
  success: boolean;
  error?: string;
}

/**
 * Lobby timer configuration
 */
export interface LobbyTimerConfig {
  shouldStart: boolean;
  duration: number;
}

/**
 * LobbyStrategy interface for handling lobby-specific behavior
 */
export interface LobbyStrategy {
  /**
   * Check if a player can join the lobby
   */
  canJoin(instance: Instance, player: Player): JoinResult;

  /**
   * Check if auto-start is enabled for this lobby type
   */
  shouldAutoStart(instance: Instance): boolean;

  /**
   * Get the player count threshold for auto-start
   */
  getAutoStartThreshold(instance: Instance): number;

  /**
   * Check if the lobby timer should start based on current player count
   */
  shouldStartTimer(instance: Instance): LobbyTimerConfig;

  /**
   * Check if the game should start immediately (e.g., when full)
   */
  shouldStartImmediately(instance: Instance): boolean;

  /**
   * Check if manual start is allowed
   */
  canStartManually(instance: Instance, playerId: string): StartResult;

  /**
   * Get the minimum players required to start
   */
  getMinPlayers(instance: Instance): number;

  /**
   * Get the maximum players allowed
   */
  getMaxPlayers(instance: Instance): number;

  /**
   * Get the lobby timeout duration in milliseconds
   */
  getLobbyTimeout(instance: Instance): number;

  /**
   * Called when a player joins the lobby
   * Returns true if lobby state changed significantly
   */
  onPlayerJoin(instance: Instance, player: Player): boolean;

  /**
   * Called when a player leaves the lobby
   * Returns true if lobby state changed significantly
   */
  onPlayerLeave(instance: Instance, playerId: string): boolean;

  /**
   * Check if the lobby should be cleaned up (e.g., empty)
   */
  shouldCleanup(instance: Instance): boolean;
}
