// apps/server/src/gameModes/types.ts

import type { GamePhase } from '../types.js';

/**
 * Timer configuration for each game phase.
 * null = no timer / unlimited time for that phase
 */
export interface GameModeTimers {
  lobby: number | null;
  countdown: number | null;
  drawing: number | null;
  votingRound: number | null;
  finale: number | null;
  results: number | null;
  reconnectGrace: number;
  // CopyCat mode timers
  memorize?: number | null;
  copycatResult?: number | null;
  // PixelGuesser mode timers
  guessing?: number | null;
  reveal?: number | null;
  // PixelSurvivor mode timers
  characterCreation?: number | null;
  dayStart?: number | null;
  eventIntro?: number | null;
  eventResult?: number | null;
  levelUp?: number | null;
  // ZombiePixel mode timers
  active?: number | null;
  // CopyCat Royale mode timers
  royaleInitialDrawing?: number | null;
  royaleShowReference?: number | null;
  royaleDrawing?: number | null;
  royaleResults?: number | null;
  royaleWinner?: number | null;
}

/**
 * Player limits for a game mode
 */
export interface PlayerLimits {
  /** Minimum players required to start */
  min: number;
  /** Maximum players per instance */
  max: number;
  /** Minimum players for private rooms (optional, defaults to min) */
  privateMin?: number;
  /** Maximum players for private rooms (optional, defaults to max) */
  privateMax?: number;
}

/**
 * Lobby behavior configuration
 */
export interface LobbyConfig {
  /** How the game starts */
  type: 'auto-start' | 'host-start' | 'instant' | 'none';
  /** How the game starts in private rooms (optional, defaults to type) */
  privateType?: 'auto-start' | 'host-start' | 'instant' | 'none';
  /** For auto-start: player count threshold to start timer */
  autoStartThreshold?: number;
  /** Show countdown timer in lobby */
  showTimer: boolean;
  /** Allow players to join mid-game as spectators */
  allowLateJoin: boolean;
  /** Allow spectator mode */
  allowSpectators: boolean;
}

/**
 * Elo rating configuration
 */
export interface EloConfig {
  /** Starting rating for all players */
  startRating: number;
  /** K-factor for rating changes */
  kFactor: number;
}

/**
 * Voting rounds configuration
 */
export interface VotingRoundsConfig {
  /** Minimum voting rounds */
  min: number;
  /** Maximum voting rounds */
  max: number;
  /** Function to calculate rounds based on player count */
  calculateRounds: (playerCount: number) => number;
}

/**
 * Finale configuration
 */
export interface FinaleConfig {
  /** Whether finale phase is enabled */
  enabled: boolean;
  /** Percentage of players that become finalists */
  finalistPercent: number;
  /** Minimum number of finalists */
  minFinalists: number;
  /** Maximum number of finalists */
  maxFinalists: number;
}

/**
 * Voting configuration (null = no voting in this mode)
 */
export interface VotingConfig {
  /** Type of voting system */
  type: 'elo' | 'simple-vote' | 'none';
  /** Voting rounds config (for elo type) */
  rounds?: VotingRoundsConfig;
  /** Elo configuration (for elo type) */
  elo?: EloConfig;
  /** Finale configuration */
  finale?: FinaleConfig;
}

/**
 * Canvas/drawing configuration
 */
export interface CanvasConfig {
  /** Canvas width in pixels */
  width: number;
  /** Canvas height in pixels */
  height: number;
  /** Minimum non-background pixels required */
  minPixelsSet: number;
  /** Background color index */
  backgroundColor: string;
}

/**
 * Room configuration
 */
export interface RoomConfig {
  /** Allow public matchmaking */
  allowPublic: boolean;
  /** Allow private rooms */
  allowPrivate: boolean;
  /** Require password for private rooms */
  requirePassword: boolean;
  /** Length of room codes */
  roomCodeLength: number;
}

/**
 * Compression settings
 */
export interface CompressionConfig {
  /** Whether compression is enabled */
  enabled: boolean;
  /** Player count threshold to trigger compression */
  threshold: number;
}

/**
 * Complete game mode configuration.
 * Defines all parameters for a specific game mode.
 */
export interface GameModeConfig {
  /** Unique identifier (e.g., 'pixel-battle', 'duel', 'solo') */
  id: string;

  /** Display name for UI */
  displayName: string;

  /** i18n key for localized name */
  i18nKey: string;

  /** Player limits */
  players: PlayerLimits;

  /** Ordered list of phases for this mode */
  phases: GamePhase[];

  /** Timer durations per phase */
  timers: GameModeTimers;

  /** Lobby behavior configuration */
  lobby: LobbyConfig;

  /** Voting configuration (null = no voting) */
  voting: VotingConfig | null;

  /** Canvas configuration */
  canvas: CanvasConfig;

  /** Room configuration */
  rooms: RoomConfig;

  /** Compression settings */
  compression: CompressionConfig;
}

/**
 * Minimal info about a game mode (for client)
 */
export interface GameModeInfo {
  id: string;
  displayName: string;
  i18nKey: string;
  players: PlayerLimits;
  description?: string;
  allowPrivate: boolean;
}

/**
 * Extract minimal info from full config
 */
export function toGameModeInfo(config: GameModeConfig): GameModeInfo {
  return {
    id: config.id,
    displayName: config.displayName,
    i18nKey: config.i18nKey,
    players: config.players,
    allowPrivate: config.rooms.allowPrivate,
  };
}
