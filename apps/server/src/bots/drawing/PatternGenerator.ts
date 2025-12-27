// apps/server/src/bots/drawing/PatternGenerator.ts
// Bot drawing pattern generators

import { randomInt } from 'crypto';
import { CANVAS } from '../../constants.js';
import { randomItem } from '../../utils.js';

/**
 * Random number between min and max (inclusive)
 */
function randomBetween(min: number, max: number): number {
  return randomInt(min, max + 1);
}

/**
 * Generate a smiley face pattern
 */
export function generateSmiley(): string {
  // 8x8 smiley face
  const grid = [
    '11111111',
    '11566511',
    '15666651',
    '56006061',
    '56666661',
    '56066061',
    '15666651',
    '11566511',
  ];
  return grid.join('');
}

/**
 * Generate a simple house pattern
 */
export function generateHouse(): string {
  const grid = [
    '11122111',
    '11222211',
    '12222221',
    '11FFFF11',
    '11F00F11',
    '11F00F11',
    '11FFFF11',
    '11111111',
  ];
  return grid.join('');
}

/**
 * Generate a heart pattern
 */
export function generateHeart(): string {
  const grid = [
    '11211211',
    '12221221',
    '22222221',
    '22222221',
    '12222221',
    '11222211',
    '11122111',
    '11111111',
  ];
  return grid.join('');
}

/**
 * Generate a tree pattern
 */
export function generateTree(): string {
  const grid = [
    '11133111',
    '11333311',
    '13333331',
    '33333333',
    '1133F111',
    '1133F111',
    '11FFF111',
    '11111111',
  ];
  return grid.join('');
}

/**
 * Generate a star pattern
 */
export function generateStar(): string {
  const grid = [
    '11151111',
    '11151111',
    '55555555',
    '11555111',
    '11555111',
    '11515111',
    '15111151',
    '11111111',
  ];
  return grid.join('');
}

/**
 * Generate random colored pixels (guaranteed minimum)
 */
export function generateRandom(): string {
  let pixels = '';
  // Fill with white background
  for (let i = 0; i < CANVAS.TOTAL_PIXELS; i++) {
    pixels += CANVAS.BACKGROUND_COLOR;
  }

  // Add at least MIN_PIXELS_SET + some extra random colored pixels
  const colorCount = randomBetween(CANVAS.MIN_PIXELS_SET + 2, CANVAS.TOTAL_PIXELS / 2);
  const usedPositions = new Set<number>();
  const colors = '023456789ABCDEF'; // All colors except white (1)

  for (let i = 0; i < colorCount; i++) {
    let pos: number;
    do {
      pos = randomInt(0, CANVAS.TOTAL_PIXELS);
    } while (usedPositions.has(pos));

    usedPositions.add(pos);
    const color = colors[randomInt(0, colors.length)];
    pixels = pixels.substring(0, pos) + color + pixels.substring(pos + 1);
  }

  return pixels;
}

/**
 * Generate horizontal stripes pattern
 */
export function generateStripes(): string {
  let pixels = '';
  const colors = '023456789ABCDEF';
  const color1 = colors[randomInt(0, colors.length)];
  const color2 = colors[randomInt(0, colors.length)];

  for (let y = 0; y < 8; y++) {
    for (let x = 0; x < 8; x++) {
      pixels += y % 2 === 0 ? color1 : color2;
    }
  }
  return pixels;
}

/**
 * Generate checkerboard pattern
 */
export function generateCheckerboard(): string {
  let pixels = '';
  const colors = '023456789ABCDEF';
  const color1 = colors[randomInt(0, colors.length)];
  const color2 = colors[randomInt(0, colors.length)];

  for (let y = 0; y < 8; y++) {
    for (let x = 0; x < 8; x++) {
      pixels += (x + y) % 2 === 0 ? color1 : color2;
    }
  }
  return pixels;
}

/**
 * All available pattern generators
 */
const PATTERNS = [
  generateSmiley,
  generateHouse,
  generateHeart,
  generateTree,
  generateStar,
  generateRandom,
  generateStripes,
  generateCheckerboard,
];

/**
 * Generate a random drawing by selecting a random pattern
 */
export function generateRandomDrawing(): string {
  const pattern = randomItem(PATTERNS);
  return pattern();
}
