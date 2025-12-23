// apps/server/src/gameModes/registry.ts

import type { GameModeConfig, GameModeInfo } from './types.js';
import { toGameModeInfo } from './types.js';
import { log } from '../utils.js';

/**
 * Registry for game modes.
 * Singleton pattern - use gameModes export for access.
 */
export class GameModeRegistry {
  private static instance: GameModeRegistry;
  private modes = new Map<string, GameModeConfig>();
  private defaultModeId = 'pixel-battle';

  private constructor() {}

  /**
   * Get the singleton instance
   */
  static getInstance(): GameModeRegistry {
    if (!GameModeRegistry.instance) {
      GameModeRegistry.instance = new GameModeRegistry();
    }
    return GameModeRegistry.instance;
  }

  /**
   * Register a new game mode
   * @throws Error if mode with same ID already exists
   */
  register(config: GameModeConfig): void {
    if (this.modes.has(config.id)) {
      throw new Error(`GameMode '${config.id}' already registered`);
    }

    // Validate required fields
    this.validateConfig(config);

    this.modes.set(config.id, config);
    log('GameMode', `Registered game mode: ${config.id}`);
  }

  /**
   * Get a game mode by ID
   * @throws Error if mode not found
   */
  get(modeId: string): GameModeConfig {
    const mode = this.modes.get(modeId);
    if (!mode) {
      throw new Error(`GameMode '${modeId}' not found`);
    }
    return mode;
  }

  /**
   * Get the default game mode
   */
  getDefault(): GameModeConfig {
    return this.get(this.defaultModeId);
  }

  /**
   * Get the default game mode ID
   */
  getDefaultId(): string {
    return this.defaultModeId;
  }

  /**
   * Set the default game mode
   * @throws Error if mode not found
   */
  setDefault(modeId: string): void {
    if (!this.modes.has(modeId)) {
      throw new Error(`Cannot set default: GameMode '${modeId}' not found`);
    }
    this.defaultModeId = modeId;
    log('GameMode', `Default game mode set to: ${modeId}`);
  }

  /**
   * Get all registered game modes
   */
  getAll(): GameModeConfig[] {
    return Array.from(this.modes.values());
  }

  /**
   * Get minimal info for all modes (for client)
   */
  getAllInfo(): GameModeInfo[] {
    return this.getAll().map(toGameModeInfo);
  }

  /**
   * Check if a mode is registered
   */
  has(modeId: string): boolean {
    return this.modes.has(modeId);
  }

  /**
   * Get the number of registered modes
   */
  get size(): number {
    return this.modes.size;
  }

  /**
   * Validate a game mode config
   */
  private validateConfig(config: GameModeConfig): void {
    if (!config.id || typeof config.id !== 'string') {
      throw new Error('GameMode must have a valid id');
    }

    if (!config.phases || config.phases.length === 0) {
      throw new Error(`GameMode '${config.id}' must have at least one phase`);
    }

    if (!config.players || config.players.min < 1) {
      throw new Error(`GameMode '${config.id}' must have min players >= 1`);
    }

    if (config.players.max < config.players.min) {
      throw new Error(`GameMode '${config.id}' max players must be >= min players`);
    }

    // Validate lobby config
    if (config.lobby.type === 'auto-start') {
      const threshold = config.lobby.autoStartThreshold ?? config.players.min;
      if (threshold < config.players.min || threshold > config.players.max) {
        throw new Error(`GameMode '${config.id}' autoStartThreshold must be between min and max players`);
      }
    }
  }
}

/**
 * Singleton instance export
 */
export const gameModes = GameModeRegistry.getInstance();
