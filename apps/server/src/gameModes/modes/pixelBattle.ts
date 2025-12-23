// apps/server/src/gameModes/modes/pixelBattle.ts

import type { GameModeConfig } from '../types.js';

/**
 * Calculate voting rounds based on player count.
 * More players = more rounds for better ranking accuracy.
 */
function calculateVotingRounds(playerCount: number): number {
  // Maximum possible rounds (each player sees each other once at most)
  const maxPossibleRounds = Math.floor((playerCount - 1) / 2);

  // Desired rounds based on player count
  let desiredRounds: number;
  if (playerCount <= 10) desiredRounds = 3;
  else if (playerCount <= 20) desiredRounds = 4;
  else if (playerCount <= 30) desiredRounds = 5;
  else if (playerCount <= 50) desiredRounds = 6;
  else desiredRounds = 7;

  // Clamp between min and max
  return Math.max(2, Math.min(maxPossibleRounds, desiredRounds));
}

/**
 * Pixel Battle - The standard SpriteBox game mode.
 *
 * Players draw 8x8 pixel art based on prompts, then vote on each other's
 * creations using an Elo-based ranking system. Top players compete in
 * a finale round.
 *
 * Player count: 5-100
 * Phases: lobby → countdown → drawing → voting → finale → results
 */
export const pixelBattleMode: GameModeConfig = {
  id: 'pixel-battle',
  displayName: 'Pixel Battle',
  i18nKey: 'gameModes.pixelBattle',

  players: {
    min: 5,
    max: 100,
  },

  phases: ['lobby', 'countdown', 'drawing', 'voting', 'finale', 'results'],

  timers: {
    lobby: 30_000,        // 30s wait time in lobby
    countdown: 5_000,     // 5s countdown before drawing
    drawing: 30_000,      // 30s to draw
    votingRound: 5_000,   // 5s per voting round
    finale: 15_000,       // 15s for finale voting
    results: 15_000,      // 15s results display
    reconnectGrace: 15_000, // 15s to reconnect
  },

  lobby: {
    type: 'auto-start',
    autoStartThreshold: 5,  // Start timer when 5 players join
    showTimer: true,
    allowLateJoin: true,    // Join as spectator if game running
    allowSpectators: true,
  },

  voting: {
    type: 'elo',
    rounds: {
      min: 2,
      max: 7,
      calculateRounds: calculateVotingRounds,
    },
    elo: {
      startRating: 1000,
      kFactor: 32,
    },
    finale: {
      enabled: true,
      finalistPercent: 0.1,   // Top 10%
      minFinalists: 3,
      maxFinalists: 10,
    },
  },

  canvas: {
    width: 8,
    height: 8,
    minPixelsSet: 5,          // At least 5 non-background pixels
    backgroundColor: '1',     // White (index 1 in palette)
  },

  rooms: {
    allowPublic: true,
    allowPrivate: true,
    requirePassword: false,
    roomCodeLength: 4,
  },

  compression: {
    enabled: true,
    threshold: 50,  // Compress gallery at 50+ players
  },
};
