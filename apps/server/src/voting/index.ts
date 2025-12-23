// apps/server/src/voting/index.ts

/**
 * Voting Strategy System
 *
 * Provides VotingStrategy instances for different game modes.
 * Each game mode can use a different voting system (Elo, simple, none).
 */

import type { Instance } from '../types.js';
import type { VotingStrategy } from './types.js';
import { gameModes } from '../gameModes/index.js';
import { EloVotingStrategy } from './strategies/EloVotingStrategy.js';
import { NoVotingStrategy } from './strategies/NoVotingStrategy.js';

// Re-export types
export type {
  VotingStrategy,
  VotingState,
  VoteResult,
  RankedPlayer,
  FairnessReport,
  FinalistData,
} from './types.js';

// Re-export strategies
export { EloVotingStrategy } from './strategies/EloVotingStrategy.js';
export { NoVotingStrategy } from './strategies/NoVotingStrategy.js';

// Cache VotingStrategies by gameMode ID
const votingStrategyCache = new Map<string, VotingStrategy>();

// Singleton for NoVoting (stateless)
const noVotingStrategy = new NoVotingStrategy();

/**
 * Get or create a VotingStrategy for an instance's game mode
 */
export function getVotingStrategy(instance: Instance): VotingStrategy {
  return getVotingStrategyForMode(instance.gameMode);
}

/**
 * Get or create a VotingStrategy for a specific game mode
 */
export function getVotingStrategyForMode(gameModeId: string): VotingStrategy {
  // Check cache first
  if (votingStrategyCache.has(gameModeId)) {
    return votingStrategyCache.get(gameModeId)!;
  }

  // Get config and create appropriate strategy
  const config = gameModes.get(gameModeId);

  let strategy: VotingStrategy;

  if (!config.voting || config.voting.type === 'none') {
    // No voting - use singleton
    strategy = noVotingStrategy;
  } else if (config.voting.type === 'elo') {
    // Elo-based voting
    strategy = new EloVotingStrategy(config.voting);
  } else {
    // Default to no voting for unknown types
    strategy = noVotingStrategy;
  }

  // Cache for reuse
  votingStrategyCache.set(gameModeId, strategy);

  return strategy;
}

/**
 * Clear the voting strategy cache (useful for testing)
 */
export function clearVotingStrategyCache(): void {
  votingStrategyCache.clear();
}

/**
 * Check if a game mode has voting enabled
 */
export function hasVotingEnabled(gameModeId: string): boolean {
  const config = gameModes.get(gameModeId);
  return config.voting !== null && config.voting.type !== 'none';
}
