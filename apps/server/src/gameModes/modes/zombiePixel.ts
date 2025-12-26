// apps/server/src/gameModes/modes/zombiePixel.ts

import type { GameModeConfig } from '../types.js';

/**
 * Zombie Pixel - Real-time infection game mode.
 *
 * Players move on a 50x50 grid. One or more players start as zombies (green),
 * rest are survivors (white). Zombies infect survivors by touching them.
 * Last survivor wins.
 *
 * Key features:
 * - 100 players max (filled with bots)
 * - 1 zombie per 10 players
 * - 60 second rounds
 * - 10 moves per second (100ms cooldown)
 * - Random spawn positions
 *
 * Player count: 2-100
 * Phases: lobby → countdown → active → results
 */
export const zombiePixelMode: GameModeConfig = {
  id: 'zombie-pixel',
  displayName: 'Zombie Pixel',
  i18nKey: 'gameModes.zombiePixel',

  players: {
    min: 2,
    max: 100,
    privateMin: 2,
  },

  phases: ['lobby', 'countdown', 'active', 'results'],

  timers: {
    lobby: 30_000,           // 30s countdown after first player
    countdown: 5_000,        // 5s countdown before game
    active: 60_000,          // 60s game duration
    drawing: null,           // Not used
    votingRound: null,       // Not used
    finale: null,            // Not used
    results: 10_000,         // 10s results display
    reconnectGrace: 5_000,   // Shorter grace (fast-paced game)
  },

  lobby: {
    type: 'auto-start',
    autoStartThreshold: 2,   // Start timer when 2 players (real + bots)
    showTimer: true,
    allowLateJoin: false,    // No late join during active game
    allowSpectators: true,
  },

  voting: null,              // No voting in this mode

  canvas: {
    width: 50,
    height: 50,
    minPixelsSet: 0,         // Not used for this mode
    backgroundColor: '0',    // Black
  },

  rooms: {
    allowPublic: true,
    allowPrivate: true,
    requirePassword: false,
    roomCodeLength: 4,
  },

  compression: {
    enabled: false,
    threshold: 0,
  },
};
