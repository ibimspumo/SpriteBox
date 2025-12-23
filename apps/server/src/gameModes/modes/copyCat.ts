// apps/server/src/gameModes/modes/copyCat.ts

import type { GameModeConfig } from '../types.js';

/**
 * CopyCat - A memory-based 1v1 pixel art game.
 *
 * Two players see the same reference image for 5 seconds,
 * then must recreate it from memory. The player with higher
 * accuracy wins. In case of a tie, the faster player wins.
 *
 * Player count: 2 (always 1v1)
 * Phases: lobby → countdown → memorize → drawing → copycat-result
 */
export const copyCatMode: GameModeConfig = {
  id: 'copy-cat',
  displayName: 'CopyCat',
  i18nKey: 'gameModes.copyCat',

  players: {
    min: 2,
    max: 2, // Always 1v1
    privateMin: 2,
  },

  phases: ['lobby', 'countdown', 'memorize', 'drawing', 'copycat-result'],

  timers: {
    lobby: null, // No auto-start timer, starts when 2 players join
    countdown: 5_000, // 5s countdown
    memorize: 5_000, // 5s to memorize the image
    drawing: 30_000, // 30s to draw from memory
    copycatResult: 10_000, // 10s to show results
    votingRound: null, // Not used
    finale: null, // Not used
    results: null, // Not used (using copycatResult instead)
    reconnectGrace: 10_000, // 10s to reconnect
  },

  lobby: {
    type: 'instant', // Game starts immediately when 2 players join
    autoStartThreshold: 2,
    showTimer: true,
    allowLateJoin: false, // Can't join mid-game
    allowSpectators: false, // 1v1 only
  },

  voting: null, // No voting in CopyCat mode

  canvas: {
    width: 8,
    height: 8,
    minPixelsSet: 1, // At least 1 pixel required
    backgroundColor: '1', // White background
  },

  rooms: {
    allowPublic: true,
    allowPrivate: true,
    requirePassword: false,
    roomCodeLength: 4,
  },

  compression: {
    enabled: false, // Only 2 players, no compression needed
    threshold: 999,
  },
};
