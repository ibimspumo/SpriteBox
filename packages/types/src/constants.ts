// packages/types/src/constants.ts
// Shared constants between server and client

// === Player Limits ===
export const MAX_PLAYERS_PER_INSTANCE = 100;
export const MIN_PLAYERS_TO_START = 5;

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

// === Palette type for type safety ===
export type PaletteIndex = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14 | 15;
export type HexColorIndex = '0' | '1' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | 'A' | 'B' | 'C' | 'D' | 'E' | 'F';
