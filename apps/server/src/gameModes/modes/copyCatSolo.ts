// apps/server/src/gameModes/modes/copyCatSolo.ts

import type { GameModeConfig } from '../types.js';

/**
 * CopyCat Solo - Single-player memory-based pixel art practice.
 *
 * Player sees a reference image for 5 seconds, then must recreate
 * it from memory. No opponent - just practice and improve your accuracy.
 *
 * Uses the same image pool as the multiplayer CopyCat mode.
 *
 * Player count: 1 (solo practice)
 * Phases: lobby → memorize → drawing → copycat-result (no countdown)
 */
export const copyCatSoloMode: GameModeConfig = {
  id: 'copy-cat-solo',
  displayName: 'CopyCat Solo',
  i18nKey: 'gameModes.copyCatSolo',

  players: {
    min: 1,
    max: 1, // Solo mode
    privateMin: 1,
  },

  phases: ['lobby', 'memorize', 'drawing', 'copycat-result'], // No countdown - starts immediately

  timers: {
    lobby: null, // Starts immediately when player joins
    countdown: 0, // No countdown for solo
    memorize: 5_000, // 5s to memorize the image
    drawing: 30_000, // 30s to draw from memory
    copycatResult: 8_000, // 8s to show results (shorter, no opponent)
    votingRound: null, // Not used
    finale: null, // Not used
    results: null, // Not used
    reconnectGrace: 10_000, // 10s to reconnect
  },

  lobby: {
    type: 'instant', // Game starts immediately when player joins
    autoStartThreshold: 1,
    showTimer: true,
    allowLateJoin: false,
    allowSpectators: false,
  },

  voting: null, // No voting in solo mode

  canvas: {
    width: 8,
    height: 8,
    minPixelsSet: 1,
    backgroundColor: '1', // White background
  },

  rooms: {
    allowPublic: true,
    allowPrivate: false, // Solo mode - no private rooms needed
    requirePassword: false,
    roomCodeLength: 4,
  },

  compression: {
    enabled: false, // Solo mode, no compression needed
    threshold: 999,
  },
};
