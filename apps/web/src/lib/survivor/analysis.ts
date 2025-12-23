// apps/web/src/lib/survivor/analysis.ts
// Character and drawing analysis for Pixel Survivor

import type { CharacterStats, Element, Trait, DrawingAnalysis } from './types.js';

// ============================================
// CHARACTER ANALYSIS
// ============================================

export interface CharacterAnalysis {
  // Dimensions
  height: number;
  width: number;
  pixelCount: number;

  // Shape properties
  symmetry: number; // 0-1, left-right symmetry
  balance: number; // 0-1, top-bottom balance
  density: number; // Filled / bounding box
  compactness: number; // How clustered vs spread

  // Color analysis
  dominantColor: string;
  colorCount: number;
  hasRed: boolean;
  hasBlue: boolean;
  hasGreen: boolean;
  hasYellow: boolean;

  // Special detections
  headRatio: number; // Top portion density
  bodyRatio: number; // Middle portion density
  legRatio: number; // Bottom portion density
}

interface Pixel {
  x: number;
  y: number;
  color: string;
}

/**
 * Convert pixel string (64 hex chars) to 8x8 grid
 */
function toGrid(pixels: string): string[][] {
  const grid: string[][] = [];
  for (let y = 0; y < 8; y++) {
    grid[y] = [];
    for (let x = 0; x < 8; x++) {
      grid[y][x] = pixels[y * 8 + x];
    }
  }
  return grid;
}

/**
 * Get all filled (non-background) pixels
 * Background color is '1' (white)
 */
function getFilledPixels(grid: string[][]): Pixel[] {
  const filled: Pixel[] = [];
  for (let y = 0; y < 8; y++) {
    for (let x = 0; x < 8; x++) {
      if (grid[y][x] !== '1') {
        filled.push({ x, y, color: grid[y][x] });
      }
    }
  }
  return filled;
}

/**
 * Find most common element in array
 */
function mostCommon<T>(arr: T[]): T | null {
  if (arr.length === 0) return null;
  const counts = new Map<T, number>();
  for (const item of arr) {
    counts.set(item, (counts.get(item) ?? 0) + 1);
  }
  let maxCount = 0;
  let maxItem: T | null = null;
  for (const [item, count] of counts) {
    if (count > maxCount) {
      maxCount = count;
      maxItem = item;
    }
  }
  return maxItem;
}

/**
 * Count filled pixels in a row
 */
function countRowPixels(grid: string[][], y: number): number {
  if (y < 0 || y >= 8) return 0;
  return grid[y].filter((c) => c !== '1').length;
}

/**
 * Analyze a character drawing
 */
export function analyzeCharacter(pixels: string): CharacterAnalysis | null {
  if (!pixels || pixels.length !== 64) return null;

  const grid = toGrid(pixels);
  const filled = getFilledPixels(grid);

  if (filled.length === 0) return null;

  // Bounding box
  const xs = filled.map((p) => p.x);
  const ys = filled.map((p) => p.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);

  const width = maxX - minX + 1;
  const height = maxY - minY + 1;

  // Density
  const density = filled.length / (width * height);

  // Symmetry (left-right)
  let symmetricPixels = 0;
  for (const pixel of filled) {
    const mirrorX = 7 - pixel.x;
    if (grid[pixel.y][mirrorX] !== '1') {
      symmetricPixels++;
    }
  }
  const symmetry = filled.length > 0 ? symmetricPixels / filled.length : 0;

  // Balance (top-bottom)
  const midY = (minY + maxY) / 2;
  const topPixels = filled.filter((p) => p.y < midY).length;
  const bottomPixels = filled.filter((p) => p.y >= midY).length;
  const balance = filled.length > 0 ? Math.min(topPixels, bottomPixels) / Math.max(topPixels, bottomPixels) : 0;

  // Compactness (how clustered the pixels are)
  const centerX = filled.reduce((sum, p) => sum + p.x, 0) / filled.length;
  const centerY = filled.reduce((sum, p) => sum + p.y, 0) / filled.length;
  const avgDistance =
    filled.reduce((sum, p) => {
      return sum + Math.sqrt(Math.pow(p.x - centerX, 2) + Math.pow(p.y - centerY, 2));
    }, 0) / filled.length;
  const maxPossibleDistance = Math.sqrt(32); // Max distance in 8x8 grid
  const compactness = 1 - avgDistance / maxPossibleDistance;

  // Color analysis
  const colors = filled.map((p) => p.color);
  const uniqueColors = new Set(colors);
  const dominantColor = mostCommon(colors) ?? '0';

  // Color categories
  const warmColors = ['2', '8', 'C']; // Red, Orange, Pink
  const blueColors = ['4', '7', 'A']; // Blue, Cyan, Light Blue
  const greenColors = ['3', 'B']; // Green, Lime
  const yellowColors = ['5']; // Yellow

  const hasRed = colors.some((c) => warmColors.includes(c));
  const hasBlue = colors.some((c) => blueColors.includes(c));
  const hasGreen = colors.some((c) => greenColors.includes(c));
  const hasYellow = colors.some((c) => yellowColors.includes(c));

  // Head/Body/Leg ratios (divide into thirds)
  const thirdHeight = height / 3;
  const headPixels = filled.filter((p) => p.y - minY < thirdHeight).length;
  const bodyPixels = filled.filter((p) => p.y - minY >= thirdHeight && p.y - minY < thirdHeight * 2).length;
  const legPixels = filled.filter((p) => p.y - minY >= thirdHeight * 2).length;

  const headRatio = filled.length > 0 ? headPixels / filled.length : 0;
  const bodyRatio = filled.length > 0 ? bodyPixels / filled.length : 0;
  const legRatio = filled.length > 0 ? legPixels / filled.length : 0;

  return {
    height,
    width,
    pixelCount: filled.length,
    symmetry,
    balance,
    density,
    compactness,
    dominantColor,
    colorCount: uniqueColors.size,
    hasRed,
    hasBlue,
    hasGreen,
    hasYellow,
    headRatio,
    bodyRatio,
    legRatio,
  };
}

/**
 * Clamp value between min and max
 */
function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/**
 * Determine element from analysis
 */
export function determineElement(analysis: CharacterAnalysis): Element {
  // Color reference: 0=Black, 1=White, 2=Red, 3=Green, 4=Blue, 5=Yellow,
  // 6=Magenta, 7=Cyan, 8=Orange, 9=Purple, A=Light Blue, B=Lime,
  // C=Pink, D=Gray, E=Light Gray, F=Brown

  if (analysis.hasRed && !analysis.hasBlue) return 'fire';
  if (analysis.hasBlue && !analysis.hasRed) return 'water';
  if (['F', '3', 'B'].includes(analysis.dominantColor)) return 'earth';
  if (['5', 'E'].includes(analysis.dominantColor)) return 'light';
  if (analysis.dominantColor === '0') return 'dark';
  if (analysis.density < 0.3) return 'air';
  return 'neutral';
}

/**
 * Determine trait from analysis
 */
export function determineTrait(analysis: CharacterAnalysis): Trait {
  if (analysis.symmetry > 0.9) return 'perfectionist';
  if (analysis.symmetry < 0.2) return 'chaotic';
  if (analysis.pixelCount > 50) return 'bulky';
  if (analysis.pixelCount < 15) return 'minimalist';
  if (analysis.colorCount >= 5) return 'creative';
  if (analysis.colorCount === 1) return 'focused';
  if (analysis.headRatio > 0.4) return 'intellectual';
  if (analysis.legRatio > 0.4) return 'grounded';
  return 'balanced';
}

/**
 * Calculate character stats from analysis
 */
export function calculateCharacterStats(analysis: CharacterAnalysis): CharacterStats {
  // BASE HP: More pixels = more substance = more HP
  const baseHp = 50 + Math.round(analysis.pixelCount * 2.5);
  const maxHp = clamp(baseHp, 50, 150);

  // ATTACK: Asymmetric + pointy = aggressive
  const asymmetryBonus = (1 - analysis.symmetry) * 40;
  const attack = clamp(20 + Math.round(30 + asymmetryBonus), 20, 100);

  // DEFENSE: Symmetric + compact = stable
  const symmetryBonus = analysis.symmetry * 30;
  const compactnessBonus = analysis.compactness * 20;
  const defense = clamp(20 + Math.round(symmetryBonus + compactnessBonus), 20, 100);

  // SPEED: Less dense = lighter = faster
  const speed = clamp(20 + Math.round((1 - analysis.density) * 60 + 20), 20, 100);

  // LUCK: Color variety = interesting = lucky
  const luck = clamp(10 + Math.round(analysis.colorCount * 8), 10, 50);

  // ELEMENT: Based on dominant color
  const element = determineElement(analysis);

  // TRAIT: Based on overall characteristics
  const trait = determineTrait(analysis);

  return {
    maxHp,
    attack,
    defense,
    speed,
    luck,
    element,
    trait,
  };
}

// ============================================
// DRAWING ANALYSIS (for events)
// ============================================

export type DrawingCategory =
  | 'weapon'
  | 'shield'
  | 'shelter'
  | 'fire'
  | 'water'
  | 'food'
  | 'tool'
  | 'trap'
  | 'bridge'
  | 'boat'
  | 'rope'
  | 'light'
  | 'armor'
  | 'potion'
  | 'distraction'
  | 'unknown';

export interface ShapeAnalysis {
  width: number;
  height: number;
  aspectRatio: number;
  centerX: number;
  centerY: number;
  isHollow: boolean;
  isPointy: boolean;
  isFlat: boolean;
  density: number;
  dominantColor: string;
  hasWarmColors: boolean;
  hasCoolColors: boolean;
  pixelCount: number;
  colorCount: number;
}

/**
 * Analyze a shape for event solving
 */
export function analyzeShape(pixels: string): ShapeAnalysis | null {
  if (!pixels || pixels.length !== 64) return null;

  const grid = toGrid(pixels);
  const filled = getFilledPixels(grid);

  if (filled.length === 0) return null;

  // Bounding box
  const xs = filled.map((p) => p.x);
  const ys = filled.map((p) => p.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);

  const width = maxX - minX + 1;
  const height = maxY - minY + 1;

  // Center of mass
  const centerX = filled.reduce((sum, p) => sum + p.x, 0) / filled.length;
  const centerY = filled.reduce((sum, p) => sum + p.y, 0) / filled.length;

  // Hollow check (center empty, edges filled)
  const midX = Math.floor((minX + maxX) / 2);
  const midY = Math.floor((minY + maxY) / 2);
  let centerEmpty = 0;
  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      const x = midX + dx;
      const y = midY + dy;
      if (x >= 0 && x < 8 && y >= 0 && y < 8) {
        if (grid[y][x] === '1') centerEmpty++;
      }
    }
  }
  const isHollow = centerEmpty >= 5 && filled.length >= 12;

  // Pointy check (top or bottom narrower)
  const topWidth = countRowPixels(grid, minY);
  const bottomWidth = countRowPixels(grid, maxY);
  const midWidth = countRowPixels(grid, midY);
  const isPointy = topWidth < midWidth * 0.5 || bottomWidth < midWidth * 0.5;

  // Flat check (wider than tall)
  const isFlat = width > height * 1.5;

  // Density
  const density = filled.length / (width * height);

  // Colors
  const colors = filled.map((p) => p.color);
  const dominantColor = mostCommon(colors) ?? '0';
  const warmColors = ['2', '5', '8', 'C']; // Red, yellow, orange, pink
  const coolColors = ['3', '4', '7', '9', 'A']; // Green, blue, cyan, purple, light blue

  return {
    width,
    height,
    aspectRatio: height / width,
    centerX,
    centerY,
    isHollow,
    isPointy,
    isFlat,
    density,
    dominantColor,
    hasWarmColors: colors.some((c) => warmColors.includes(c)),
    hasCoolColors: colors.some((c) => coolColors.includes(c)),
    pixelCount: filled.length,
    colorCount: new Set(colors).size,
  };
}
