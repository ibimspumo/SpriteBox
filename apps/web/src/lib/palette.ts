// apps/web/src/lib/palette.ts
export const PALETTE = [
  { hex: '#000000', name: 'Black' },      // 0
  { hex: '#FFFFFF', name: 'White' },      // 1
  { hex: '#FF0000', name: 'Red' },        // 2
  { hex: '#00FF00', name: 'Green' },      // 3
  { hex: '#0000FF', name: 'Blue' },       // 4
  { hex: '#FFFF00', name: 'Yellow' },     // 5
  { hex: '#FF00FF', name: 'Magenta' },    // 6
  { hex: '#00FFFF', name: 'Cyan' },       // 7
  { hex: '#FF8000', name: 'Orange' },     // 8
  { hex: '#8000FF', name: 'Purple' },     // 9
  { hex: '#0080FF', name: 'Sky Blue' },   // A (10)
  { hex: '#80FF00', name: 'Lime' },       // B (11)
  { hex: '#FF0080', name: 'Pink' },       // C (12)
  { hex: '#808080', name: 'Gray' },       // D (13)
  { hex: '#C0C0C0', name: 'Light Gray' }, // E (14)
  { hex: '#804000', name: 'Brown' },      // F (15)
] as const;

/**
 * Converts hex character to color index
 */
export function hexCharToIndex(char: string): number {
  return parseInt(char, 16);
}

/**
 * Converts color index to hex character
 */
export function indexToHexChar(index: number): string {
  return index.toString(16).toUpperCase();
}

/**
 * Returns the hex color for an index
 */
export function getColorByIndex(index: number): string {
  return PALETTE[index]?.hex ?? PALETTE[0].hex;
}
