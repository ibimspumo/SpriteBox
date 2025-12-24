// apps/server/src/gameModes/modes/pixelSurvivor.ts

import type { GameModeConfig } from '../types.js';

/**
 * Pixel Survivor - A single-player roguelike survival game.
 *
 * Currently only character creation is implemented.
 * The game runs primarily client-side with LocalStorage persistence.
 * The server only provides mode registration for consistency.
 *
 * Player count: 1 (single-player only)
 * Phases: survivor-menu → survivor-character
 */
export const pixelSurvivorMode: GameModeConfig = {
  id: 'pixel-survivor',
  displayName: 'Pixel Survivor',
  i18nKey: 'gameModes.pixelSurvivor',

  players: {
    min: 1,
    max: 1,
    privateMin: 1,
  },

  // Survivor phases (simplified - character creation only)
  phases: [
    'survivor-menu',
    'survivor-character',
  ],

  timers: {
    lobby: null, // No lobby
    countdown: null, // No countdown
    drawing: null, // No timed drawing
    votingRound: null, // No voting
    finale: null, // No finale
    results: null, // No timed results
    reconnectGrace: 0, // Single-player, no reconnect
    // Survivor-specific timers (handled client-side)
    characterCreation: 120_000, // 2 minutes
  },

  lobby: {
    type: 'none', // No lobby system
    autoStartThreshold: 1,
    showTimer: false,
    allowLateJoin: false,
    allowSpectators: false,
  },

  voting: null, // No voting

  canvas: {
    width: 8,
    height: 8,
    minPixelsSet: 1,
    backgroundColor: '1', // White
  },

  rooms: {
    allowPublic: false, // Single-player only
    allowPrivate: false, // No rooms needed
    requirePassword: false,
    roomCodeLength: 0,
  },

  compression: {
    enabled: false, // Single-player, no gallery
    threshold: 999,
  },
};
