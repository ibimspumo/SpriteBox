// apps/server/src/gameModes/modes/copyCatRoyale.ts

import type { GameModeConfig } from '../types.js';

/**
 * CopyCat Royale - Battle Royale Pixel Art Game Mode
 *
 * A Battle Royale elimination game where players compete to recreate
 * pixel art images from memory. Each round, a reference image is shown
 * for a few seconds, then players must redraw it from memory. The worst
 * performers are eliminated until only one winner remains.
 *
 * Game Flow:
 * 1. Initial Drawing: All players draw freely - these become the image pool
 * 2. Show Reference: A random image from the pool is shown briefly
 * 3. Drawing: Players recreate it from memory (no reference visible)
 * 4. Results: Compare accuracies, eliminate bottom players
 * 5. Repeat until winner
 *
 * Player count: 10-100
 * Phases: lobby → countdown → royale-initial-drawing → [royale-show-reference → royale-drawing → royale-results → royale-elimination] → royale-winner
 */
export const copyCatRoyaleMode: GameModeConfig = {
  id: 'copycat-royale',
  displayName: 'CopyCat Royale',
  i18nKey: 'gameModes.copyCatRoyale',

  players: {
    min: 10,
    max: 100,
    privateMin: 10,
  },

  phases: [
    'lobby',
    'countdown',
    'royale-initial-drawing',
    'royale-show-reference',
    'royale-drawing',
    'royale-results',
    'royale-elimination',
    'royale-winner',
  ],

  timers: {
    lobby: 30_000,                    // 30s countdown after 10 players
    countdown: 5_000,                 // 5s "Prepare to draw your own image!"
    royaleInitialDrawing: 30_000,     // 30s free drawing (creates image pool)
    royaleShowReference: 5_000,       // 5s to memorize reference
    royaleDrawing: 25_000,            // 25s to recreate from memory
    royaleResults: 8_000,             // 8s to show results and eliminations
    royaleWinner: 15_000,             // 15s winner display
    drawing: null,                    // Not used
    votingRound: null,                // Not used
    finale: null,                     // Not used
    results: 15_000,                  // Fallback
    reconnectGrace: 10_000,
  },

  lobby: {
    type: 'auto-start',
    autoStartThreshold: 10,           // Start timer when 10 players join
    showTimer: true,
    allowLateJoin: false,             // No late join during game
    allowSpectators: true,            // Eliminated players become spectators
  },

  voting: null,                       // No voting - direct accuracy comparison

  canvas: {
    width: 8,
    height: 8,
    minPixelsSet: 5,                  // Minimum 5 pixels to be valid
    backgroundColor: '1',             // White background
  },

  rooms: {
    allowPublic: true,
    allowPrivate: true,
    requirePassword: false,
    roomCodeLength: 4,
  },

  compression: {
    enabled: false,
    threshold: 50,
  },
};
