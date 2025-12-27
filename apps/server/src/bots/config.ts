// apps/server/src/bots/config.ts
// Bot configuration constants

import type { BotBehavior, BotConfig } from './types.js';

/**
 * Debug configuration settings
 */
export const DEBUG_CONFIG = {
  enabled: process.env.NODE_ENV !== 'production',
  botPrefix: 'Bot_',
  defaultBotCount: 10,
  maxBots: Infinity, // No limit for stress testing
};

/**
 * Behavior configurations for each bot type
 */
export const BOT_BEHAVIORS: Record<BotBehavior, BotConfig> = {
  normal: {
    voteDelay: { min: 1000, max: 4000 },
    drawTime: { min: 5000, max: 25000 },
    disconnectChance: 0.02,
    afkChance: 0.05,
  },
  slow: {
    voteDelay: { min: 3500, max: 4800 },
    drawTime: { min: 20000, max: 28000 },
    disconnectChance: 0.01,
    afkChance: 0.1,
  },
  afk: {
    voteDelay: { min: 0, max: 0 },
    drawTime: { min: 0, max: 0 },
    disconnectChance: 0,
    afkChance: 1.0, // Always AFK
  },
  disconnector: {
    voteDelay: { min: 1000, max: 2000 },
    drawTime: { min: 5000, max: 15000 },
    disconnectChance: 0.3,
    afkChance: 0,
  },
  fast: {
    voteDelay: { min: 100, max: 500 },
    drawTime: { min: 3500, max: 5000 },
    disconnectChance: 0,
    afkChance: 0,
  },
};

/**
 * Pool of names for generating bot display names
 */
export const BOT_NAMES = [
  'Pixel',
  'Doodle',
  'Sketch',
  'Draw',
  'Art',
  'Canvas',
  'Brush',
  'Paint',
  'Color',
  'Line',
  'Shape',
  'Blob',
  'Scribble',
  'Squiggle',
  'Dot',
  'Stroke',
  'Mark',
  'Trace',
  'Splat',
  'Smudge',
  'Swirl',
  'Zigzag',
  'Star',
  'Moon',
];
