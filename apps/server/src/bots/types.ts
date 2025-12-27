// apps/server/src/bots/types.ts
// Bot type definitions

import type { User } from '../types.js';

/**
 * Bot behavior types defining different play styles
 */
export type BotBehavior = 'normal' | 'slow' | 'afk' | 'disconnector' | 'fast';

/**
 * Configuration for a specific bot behavior
 */
export interface BotConfig {
  voteDelay: { min: number; max: number };
  drawTime: { min: number; max: number };
  disconnectChance: number;
  afkChance: number;
}

/**
 * Bot instance data
 */
export interface Bot {
  id: string;
  playerId: string;
  user: User;
  behavior: BotBehavior;
  isActive: boolean;
  instanceId: string | null;
  timers: NodeJS.Timeout[];
}
