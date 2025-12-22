// apps/web/src/lib/palette.ts
// Optimized 16-color palette for pixel art prompts
// Designed to cover: nature, fire/ice, characters, objects, emotions
export const PALETTE = [
  { hex: '#000000', name: 'Black' },      // 0 - Outlines, shadows, "in the dark"
  { hex: '#FFFFFF', name: 'White' },      // 1 - Highlights, ghosts, clouds, snow
  { hex: '#FF3B30', name: 'Red' },        // 2 - Hearts, fire, cherries, "angry"
  { hex: '#8B1A1A', name: 'Dark Red' },   // 3 - Blood, "bleeding", deep shadows
  { hex: '#4CD964', name: 'Green' },      // 4 - Grass, slime, leaves
  { hex: '#2D5A27', name: 'Dark Green' }, // 5 - Trees, cactus, snake
  { hex: '#007AFF', name: 'Blue' },       // 6 - Water, sky, drops, "sad"
  { hex: '#1C2541', name: 'Dark Blue' },  // 7 - Space, night, "in the dark"
  { hex: '#FFCC00', name: 'Yellow' },     // 8 - Sun, stars, coins, lightning, "golden"
  { hex: '#FF9500', name: 'Orange' },     // 9 - Fire, lava, "burning"
  { hex: '#A0522D', name: 'Brown' },      // A - Wood, earth, mushrooms, burger
  { hex: '#FF2D92', name: 'Pink' },       // B - Flowers, love, "happy"
  { hex: '#AF52DE', name: 'Purple' },     // C - Magic, gems, potions
  { hex: '#5AC8FA', name: 'Cyan' },       // D - Ice, "frozen", "in ice"
  { hex: '#8E8E93', name: 'Gray' },       // E - Skulls, stone, metal, "silver"
  { hex: '#D4A574', name: 'Tan' },        // F - Skin, cookies, eggs, sand
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
