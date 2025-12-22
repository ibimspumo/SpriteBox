// apps/server/src/constants.ts

// === Player Limits ===
export const MAX_PLAYERS_PER_INSTANCE = 100;
export const MIN_PLAYERS_TO_START = 5;

// === Timers (in milliseconds) ===
export const TIMERS = {
  LOBBY_TIMEOUT: 30_000,       // 30s wait time in lobby
  COUNTDOWN: 5_000,            // 5s countdown before drawing
  DRAWING: 30_000,             // 30s to draw
  VOTING_ROUND: 5_000,         // 5s per voting round
  FINALE: 15_000,              // 15s for finale
  RESULTS: 15_000,             // 15s results display
  RECONNECT_GRACE: 15_000,     // 15s to reconnect
  SESSION_MAX_AGE: 24 * 60 * 60 * 1000, // 24h max session age
} as const;

// === Elo Configuration ===
export const ELO = {
  START_RATING: 1000,
  K_FACTOR: 32,
} as const;

// === Voting ===
export const VOTING = {
  MIN_ROUNDS: 2,
  MAX_ROUNDS: 7,
  SECONDS_PER_ROUND: 5,
} as const;

// === Pixel-Canvas ===
export const CANVAS = {
  WIDTH: 8,
  HEIGHT: 8,
  TOTAL_PIXELS: 64,
  MIN_PIXELS_SET: 5,           // At least 5 non-empty pixels
  BACKGROUND_COLOR: '1',       // White
} as const;

// === Color Palette (16 colors) ===
export const PALETTE = [
  '#000000', // 0 - Black
  '#FFFFFF', // 1 - White
  '#FF0000', // 2 - Red
  '#00FF00', // 3 - Green
  '#0000FF', // 4 - Blue
  '#FFFF00', // 5 - Yellow
  '#FF00FF', // 6 - Magenta
  '#00FFFF', // 7 - Cyan
  '#FF8000', // 8 - Orange
  '#8000FF', // 9 - Purple
  '#0080FF', // A - Light Blue
  '#80FF00', // B - Lime
  '#FF0080', // C - Pink
  '#808080', // D - Gray
  '#C0C0C0', // E - Light Gray
  '#804000', // F - Brown
] as const;

// === Rate Limits ===
export const RATE_LIMITS = {
  GLOBAL: { windowMs: 1_000, maxRequests: 50 },
  SUBMIT: { windowMs: 60_000, maxRequests: 5 },
  VOTE: { windowMs: 1_000, maxRequests: 3 },
  CREATE_ROOM: { windowMs: 60_000, maxRequests: 3 },
  JOIN_ROOM: { windowMs: 10_000, maxRequests: 5 },
  CHANGE_NAME: { windowMs: 60_000, maxRequests: 5 },
} as const;

// === DoS Protection ===
export const DOS = {
  MAX_CONNECTIONS_PER_IP: 5,
  MAX_TOTAL_CONNECTIONS: 15_000,
  MAX_PAYLOAD_SIZE: 1024,      // 1 KB
  IDLE_WARNING: 240_000,       // 4 minutes - show warning
  IDLE_TIMEOUT: 300_000,       // 5 minutes - disconnect
} as const;

// === Compression ===
export const COMPRESSION = {
  THRESHOLD_PLAYERS: 50,       // Compress starting at 50 players
} as const;
