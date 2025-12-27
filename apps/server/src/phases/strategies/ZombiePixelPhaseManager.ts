// apps/server/src/phases/strategies/ZombiePixelPhaseManager.ts

/**
 * ZombiePixelPhaseManager - Manages phases for Zombie Pixel game mode
 *
 * Phase flow: lobby -> countdown -> active -> results -> lobby
 *
 * The 'active' phase is unique - it runs a real-time game loop
 * at 20 ticks per second for movement and collision detection.
 * This phase handles bot movements, player infections, and win conditions.
 */

import type { PhaseManager, PhaseContext, PhaseHandleResult } from '../types.js';
import type { Instance, GamePhase } from '../../types.js';
import type { GameModeConfig } from '../../gameModes/types.js';
import { log } from '../../utils.js';
import {
  initializeZombiePixelState,
  assignZombieRoles,
  startGameLoop,
  stopGameLoop,
  cleanupZombiePixelState,
  checkGameTimeout,
} from '../../gameModes/zombiePixel/index.js';

/** Default active phase duration in milliseconds (60 seconds) */
const DEFAULT_ACTIVE_DURATION = 60_000;

export class ZombiePixelPhaseManager implements PhaseManager {
  constructor(private config: GameModeConfig) {}

  /**
   * Get the game mode configuration
   */
  getConfig(): GameModeConfig {
    return this.config;
  }

  /**
   * Get the ordered list of phases for this mode
   */
  getPhases(): GamePhase[] {
    return this.config.phases;
  }

  /**
   * Check if a phase is valid for Zombie Pixel mode
   */
  hasPhase(phase: GamePhase): boolean {
    return this.config.phases.includes(phase);
  }

  /**
   * Get the next phase in the sequence
   * Returns 'lobby' if at the end of the phase sequence
   */
  getNextPhase(currentPhase: GamePhase): GamePhase {
    const phases = this.config.phases;
    const currentIndex = phases.indexOf(currentPhase);

    // If not found or at last phase, return to lobby
    if (currentIndex === -1 || currentIndex >= phases.length - 1) {
      return 'lobby';
    }

    return phases[currentIndex + 1];
  }

  /**
   * Get the timer duration for a phase in milliseconds
   * Returns null if the phase has no timer (unlimited)
   */
  getTimerDuration(phase: GamePhase): number | null {
    switch (phase) {
      case 'lobby':
        return this.config.timers.lobby;
      case 'countdown':
        return this.config.timers.countdown;
      case 'active':
        return this.config.timers.active ?? DEFAULT_ACTIVE_DURATION;
      case 'results':
        return this.config.timers.results;
      default:
        return null;
    }
  }

  /**
   * Check if a transition to the target phase is valid
   */
  canTransitionTo(_instance: Instance, toPhase: GamePhase): boolean {
    return this.hasPhase(toPhase);
  }

  /**
   * Get the phase after drawing
   * Note: Zombie Pixel doesn't use a drawing phase, but this returns 'results'
   * for interface compliance
   */
  getPhaseAfterDrawing(_instance: Instance): GamePhase {
    return 'results';
  }

  /**
   * Get the phase after voting
   * Note: Zombie Pixel doesn't use voting, but this returns 'results'
   * for interface compliance
   */
  getPhaseAfterVoting(_instance: Instance): GamePhase {
    return 'results';
  }

  /**
   * Check if this game mode has voting
   * Zombie Pixel has no voting - winners are determined by survival
   */
  hasVoting(): boolean {
    return false;
  }

  /**
   * Check if this game mode has a finale phase
   * Zombie Pixel has no finale - the active phase ends in results
   */
  hasFinale(): boolean {
    return false;
  }

  /**
   * Calculate voting rounds (not applicable for Zombie Pixel)
   */
  calculateVotingRounds(_submissionCount: number): number {
    return 0;
  }

  /**
   * Calculate finalist count (not applicable for Zombie Pixel)
   */
  calculateFinalistCount(_submissionCount: number): number {
    return 0;
  }

  // ============================================
  // HANDLER METHODS (new)
  // ============================================

  /**
   * Initialize the game state for ZombiePixel mode
   */
  initializeGame(instance: Instance, ctx: PhaseContext): boolean {
    log('Phase', `Initializing ZombiePixel state for instance ${instance.id}`);
    initializeZombiePixelState(instance, ctx.io);
    return true;
  }

  /**
   * Get the first phase after countdown for ZombiePixel mode
   */
  getPhaseAfterCountdown(_instance: Instance): GamePhase {
    return 'active';
  }

  /**
   * Handle ZombiePixel-specific phases
   */
  handlePhase(instance: Instance, phase: GamePhase, ctx: PhaseContext): PhaseHandleResult {
    switch (phase) {
      case 'active':
        this.handleActive(instance, ctx);
        return { handled: true };
      case 'results':
        this.handleResults(instance, ctx);
        return { handled: true };
      default:
        return { handled: false };
    }
  }

  /**
   * Active phase - real-time gameplay with zombies chasing survivors
   */
  private handleActive(instance: Instance, ctx: PhaseContext): void {
    const duration = this.getTimerDuration('active') ?? DEFAULT_ACTIVE_DURATION;

    // Assign zombie roles
    assignZombieRoles(instance, ctx.io);

    // Start the game loop (handles bot AI, collisions, broadcasting)
    startGameLoop(instance, ctx.io);

    // Set phase timing for anti-cheat
    ctx.setPhaseTimings(instance.id, duration);

    const endsAt = Date.now() + duration;

    ctx.emitToInstance(instance, 'phase-changed', {
      phase: 'active',
      duration,
      endsAt,
    });

    log('Phase', `ZombiePixel active phase started for instance ${instance.id}`);

    // Set up timeout to end the game
    instance.phaseTimer = setTimeout(() => {
      checkGameTimeout(instance, ctx.io);
      // Game ends via checkGameTimeout -> endGame which emits zombie-game-end
      // After timeout, transition to results
      this.handleResults(instance, ctx);
    }, duration);
  }

  /**
   * Results phase for ZombiePixel mode
   */
  private handleResults(instance: Instance, ctx: PhaseContext): void {
    const duration = this.getTimerDuration('results') ?? 15_000;

    // Stop the game loop
    stopGameLoop(instance);

    instance.phase = 'results';

    const endsAt = Date.now() + duration;

    ctx.emitToInstance(instance, 'phase-changed', {
      phase: 'results',
      duration,
      endsAt,
    });

    log('Phase', `ZombiePixel results phase for instance ${instance.id}`);

    // Clean up ZombiePixel state
    cleanupZombiePixelState(instance);

    // Return spectators to players for next game
    for (const [id, spectator] of instance.spectators) {
      instance.players.set(id, spectator);
    }
    instance.spectators.clear();

    instance.phaseTimer = setTimeout(() => {
      ctx.resetForNextRound(instance);
      ctx.transitionTo(instance, 'lobby');
    }, duration);
  }

  /**
   * Cleanup ZombiePixel state
   */
  cleanup(instance: Instance): void {
    stopGameLoop(instance);
    cleanupZombiePixelState(instance);
  }
}
