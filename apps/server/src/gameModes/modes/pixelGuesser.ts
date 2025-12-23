// apps/server/src/gameModes/modes/pixelGuesser.ts

import type { GameModeConfig } from '../types.js';

/**
 * Pixel Guesser - A Pictionary-style guessing game.
 *
 * One player draws while others try to guess what it is.
 * The artist sees a secret prompt and draws live - guessers see
 * each pixel as it's placed. Faster correct guesses = more points.
 *
 * Player count: 2-20 (works best with 4-10)
 * Phases: lobby → countdown → drawing → guessing → reveal → results
 *
 * After all players have been the artist once, the game ends
 * and final scores are shown.
 */
export const pixelGuesserMode: GameModeConfig = {
  id: 'pixel-guesser',
  displayName: 'Pixel Guesser',
  i18nKey: 'gameModes.pixelGuesser',

  players: {
    min: 2,
    max: 20,
    privateMin: 2,
  },

  // Note: 'guessing' phase combines drawing (by artist) and guessing (by others)
  phases: ['lobby', 'countdown', 'guessing', 'reveal', 'results'],

  timers: {
    lobby: 30_000, // 30s auto-start timer
    countdown: 3_000, // 3s countdown before each round
    drawing: null, // Not used (combined into guessing)
    guessing: 45_000, // 45s for artist to draw + others to guess
    reveal: 5_000, // 5s to show correct answer and round scores
    votingRound: null, // Not used
    finale: null, // Not used
    results: 15_000, // 15s final results
    reconnectGrace: 15_000,
  },

  lobby: {
    type: 'auto-start',
    autoStartThreshold: 2,
    showTimer: true,
    allowLateJoin: false, // Can't join mid-game
    allowSpectators: true,
  },

  voting: null, // No Elo voting - points-based scoring

  canvas: {
    width: 8,
    height: 8,
    minPixelsSet: 1,
    backgroundColor: '1', // White
  },

  rooms: {
    allowPublic: true,
    allowPrivate: true,
    requirePassword: false,
    roomCodeLength: 4,
  },

  compression: {
    enabled: false, // Small player count
    threshold: 50,
  },
};
