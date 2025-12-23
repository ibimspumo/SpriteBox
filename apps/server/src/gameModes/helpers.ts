// apps/server/src/gameModes/helpers.ts

/**
 * Helper functions for accessing game mode configuration.
 * These provide a clean API for getting mode-specific values from instances.
 */

import type { Instance } from '../types.js';
import type { GameModeConfig, PlayerLimits, LobbyConfig, VotingConfig, CanvasConfig } from './types.js';
import { gameModes } from './registry.js';

/**
 * Get the full game mode config for an instance
 */
export function getInstanceConfig(instance: Instance): GameModeConfig {
  return gameModes.get(instance.gameMode);
}

/**
 * Get player limits for an instance
 */
export function getPlayerLimits(instance: Instance): PlayerLimits {
  return getInstanceConfig(instance).players;
}

/**
 * Get lobby configuration for an instance
 */
export function getLobbyConfig(instance: Instance): LobbyConfig {
  return getInstanceConfig(instance).lobby;
}

/**
 * Get voting configuration for an instance (null if no voting)
 */
export function getVotingConfig(instance: Instance): VotingConfig | null {
  return getInstanceConfig(instance).voting;
}

/**
 * Get canvas configuration for an instance
 */
export function getCanvasConfig(instance: Instance): CanvasConfig {
  return getInstanceConfig(instance).canvas;
}

/**
 * Get timer duration for a specific phase
 * @returns Duration in milliseconds, or null if no timer
 */
export function getTimerDuration(
  instance: Instance,
  phase: 'lobby' | 'countdown' | 'drawing' | 'votingRound' | 'finale' | 'results' | 'reconnectGrace'
): number | null {
  const config = getInstanceConfig(instance);
  return config.timers[phase];
}

/**
 * Check if voting is enabled for this game mode
 */
export function hasVoting(instance: Instance): boolean {
  const config = getInstanceConfig(instance);
  return config.voting !== null && config.voting.type !== 'none';
}

/**
 * Check if finale phase is enabled for this game mode
 */
export function hasFinale(instance: Instance): boolean {
  const voting = getVotingConfig(instance);
  return voting?.finale?.enabled ?? false;
}

/**
 * Get the auto-start threshold for lobby
 * Returns the player count at which the lobby timer should start
 */
export function getLobbyAutoStartThreshold(instance: Instance): number {
  const config = getInstanceConfig(instance);
  return config.lobby.autoStartThreshold ?? config.players.min;
}

/**
 * Check if the instance allows late joining (as spectator)
 */
export function allowsLateJoin(instance: Instance): boolean {
  return getInstanceConfig(instance).lobby.allowLateJoin;
}

/**
 * Check if the instance allows spectators
 */
export function allowsSpectators(instance: Instance): boolean {
  return getInstanceConfig(instance).lobby.allowSpectators;
}

/**
 * Get Elo configuration for an instance
 * @returns Elo config or default values if not configured
 */
export function getEloConfig(instance: Instance): { startRating: number; kFactor: number } {
  const voting = getVotingConfig(instance);
  return voting?.elo ?? { startRating: 1000, kFactor: 32 };
}

/**
 * Calculate the number of voting rounds for a given player count
 */
export function calculateVotingRounds(instance: Instance, playerCount: number): number {
  const voting = getVotingConfig(instance);
  if (!voting?.rounds) {
    return 3; // Default fallback
  }
  return voting.rounds.calculateRounds(playerCount);
}

/**
 * Calculate the number of finalists for a given player count
 */
export function calculateFinalistCount(instance: Instance, playerCount: number): number {
  const voting = getVotingConfig(instance);
  if (!voting?.finale) {
    return Math.min(10, Math.max(3, Math.ceil(playerCount * 0.1)));
  }

  const { finalistPercent, minFinalists, maxFinalists } = voting.finale;
  return Math.min(maxFinalists, Math.max(minFinalists, Math.ceil(playerCount * finalistPercent)));
}

/**
 * Check if compression should be used for this instance
 */
export function shouldCompress(instance: Instance, playerCount: number): boolean {
  const config = getInstanceConfig(instance);
  return config.compression.enabled && playerCount >= config.compression.threshold;
}
