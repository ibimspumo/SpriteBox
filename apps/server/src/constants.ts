// apps/server/src/constants.ts

// === Spieler-Limits ===
export const MAX_PLAYERS_PER_INSTANCE = 100;
export const MIN_PLAYERS_TO_START = 5;

// === Timer (in Millisekunden) ===
export const TIMERS = {
  LOBBY_TIMEOUT: 45_000,       // 45s Wartezeit in Lobby
  COUNTDOWN: 5_000,            // 5s Countdown vor Zeichnen
  DRAWING: 60_000,             // 60s zum Zeichnen
  VOTING_ROUND: 5_000,         // 5s pro Voting-Runde
  FINALE: 15_000,              // 15s fürs Finale
  RESULTS: 15_000,             // 15s Ergebnisanzeige
  RECONNECT_GRACE: 15_000,     // 15s zum Reconnecten
} as const;

// === Elo-Konfiguration ===
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
  MIN_PIXELS_SET: 5,           // Mindestens 5 nicht-leere Pixel
  BACKGROUND_COLOR: '1',       // Weiß
} as const;

// === Farbpalette (16 Farben) ===
export const PALETTE = [
  '#000000', // 0 - Schwarz
  '#FFFFFF', // 1 - Weiß
  '#FF0000', // 2 - Rot
  '#00FF00', // 3 - Grün
  '#0000FF', // 4 - Blau
  '#FFFF00', // 5 - Gelb
  '#FF00FF', // 6 - Magenta
  '#00FFFF', // 7 - Cyan
  '#FF8000', // 8 - Orange
  '#8000FF', // 9 - Lila
  '#0080FF', // A - Hellblau
  '#80FF00', // B - Lime
  '#FF0080', // C - Pink
  '#808080', // D - Grau
  '#C0C0C0', // E - Hellgrau
  '#804000', // F - Braun
] as const;

// === Rate Limits ===
export const RATE_LIMITS = {
  GLOBAL: { windowMs: 1_000, maxRequests: 50 },
  SUBMIT: { windowMs: 60_000, maxRequests: 10 },
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
  IDLE_TIMEOUT: 300_000,       // 5 Minuten
} as const;

// === Kompression ===
export const COMPRESSION = {
  THRESHOLD_PLAYERS: 50,       // Ab 50 Spielern komprimieren
} as const;
