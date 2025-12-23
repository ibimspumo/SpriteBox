// apps/web/src/lib/survivor/drawable-analysis.ts
// Dedicated analysis for drawable objects - matches drawable-objects.json schema exactly

/**
 * Analysis result for drawable object detection.
 * Field names match exactly what drawable-objects.json expects.
 */
export interface DrawableAnalysis {
  // === Dimensions ===
  width: number;
  height: number;
  aspectRatio: number; // height / width

  // === Shape Properties ===
  isHollow: boolean; // Has empty space inside (density < 0.5 with enough pixels)
  isPointy: boolean; // Tall and thin (height > width * 2)
  isFlat: boolean; // Wide and short (width > height * 1.5)
  density: number; // Filled pixels / bounding box area (0-1)

  // === Position ===
  centerX: number; // Center of mass X (0-7)
  centerY: number; // Center of mass Y (0-7)

  // === Colors ===
  dominantColor: string; // Most common color hex char
  colorCount: number; // Number of unique colors
  hasWarmColors: boolean; // Contains red, yellow, orange, or pink
  hasCoolColors: boolean; // Contains blue, cyan, green, or purple

  // === Pixel Info ===
  pixelCount: number; // Total non-white pixels
}

// === Color Definitions ===
// These match the 16-color palette:
// 0=Black, 1=White, 2=Red, 3=Green, 4=Blue, 5=Yellow,
// 6=Magenta, 7=Cyan, 8=Orange, 9=Purple, A=Light Blue, B=Lime,
// C=Pink, D=Gray, E=Light Gray, F=Brown

const WARM_COLORS = ['2', '5', '8', 'C']; // Red, Yellow, Orange, Pink
const COOL_COLORS = ['3', '4', '7', '9', 'A', 'B']; // Green, Blue, Cyan, Purple, Light Blue, Lime

// === Internal Types ===
interface Pixel {
  x: number;
  y: number;
  color: string;
}

// === Helper Functions ===

/**
 * Convert 64-char hex string to 8x8 grid
 */
function toGrid(pixels: string): string[][] {
  const grid: string[][] = [];
  for (let y = 0; y < 8; y++) {
    grid.push(pixels.slice(y * 8, (y + 1) * 8).split(''));
  }
  return grid;
}

/**
 * Get all non-white pixels from grid
 */
function getFilledPixels(grid: string[][]): Pixel[] {
  const filled: Pixel[] = [];
  for (let y = 0; y < 8; y++) {
    for (let x = 0; x < 8; x++) {
      // '1' is white (background) - exclude it
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

// === Main Analysis Function ===

/**
 * Analyze a drawing for object detection.
 * Returns null if the drawing is empty or invalid.
 *
 * @param pixels - 64-character hex string representing 8x8 pixel grid
 * @returns DrawableAnalysis or null if invalid
 */
export function analyzeDrawable(pixels: string): DrawableAnalysis | null {
  // Validate input
  if (!pixels || pixels.length !== 64) return null;

  const grid = toGrid(pixels);
  const filled = getFilledPixels(grid);

  // Need at least some pixels to analyze
  if (filled.length === 0) return null;

  // === Calculate Bounding Box ===
  const xs = filled.map((p) => p.x);
  const ys = filled.map((p) => p.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);

  const width = maxX - minX + 1;
  const height = maxY - minY + 1;
  const boundingArea = width * height;

  // === Calculate Density ===
  const density = filled.length / boundingArea;

  // === Calculate Center of Mass ===
  const centerX = filled.reduce((sum, p) => sum + p.x, 0) / filled.length;
  const centerY = filled.reduce((sum, p) => sum + p.y, 0) / filled.length;

  // === Calculate Shape Properties ===
  const aspectRatio = height / Math.max(1, width);
  const isPointy = height > width * 2;
  const isFlat = width > height * 1.5;

  // Hollow = low density with enough pixels to have interior space
  const isHollow = density < 0.5 && filled.length >= 10;

  // === Analyze Colors ===
  const colors = filled.map((p) => p.color);
  const uniqueColors = new Set(colors);
  const dominantColor = mostCommon(colors) ?? '0';

  const hasWarmColors = colors.some((c) => WARM_COLORS.includes(c));
  const hasCoolColors = colors.some((c) => COOL_COLORS.includes(c));

  return {
    // Dimensions
    width,
    height,
    aspectRatio,

    // Shape properties
    isHollow,
    isPointy,
    isFlat,
    density,

    // Position
    centerX,
    centerY,

    // Colors
    dominantColor,
    colorCount: uniqueColors.size,
    hasWarmColors,
    hasCoolColors,

    // Pixel info
    pixelCount: filled.length,
  };
}

/**
 * Check if a bonus condition is met based on the analysis.
 * Supports all conditions used in drawable-objects.json.
 *
 * @param condition - Condition string from JSON
 * @param analysis - DrawableAnalysis result
 * @returns true if condition is met
 */
export function checkDrawableCondition(
  condition: string,
  analysis: DrawableAnalysis
): boolean {
  switch (condition) {
    // Shape conditions
    case 'isPointy':
      return analysis.isPointy;
    case 'isHollow':
      return analysis.isHollow;
    case 'isFlat':
      return analysis.isFlat;

    // Height conditions
    case 'heightGte4':
      return analysis.height >= 4;
    case 'heightGte6':
      return analysis.height >= 6;
    case 'heightGte7':
      return analysis.height >= 7;
    case 'tall':
      return analysis.height >= 6;

    // Width conditions
    case 'widthGte3':
      return analysis.width >= 3;
    case 'widthGte4':
      return analysis.width >= 4;
    case 'widthGte6':
      return analysis.width >= 6;

    // Size conditions
    case 'sizeGte3x3':
      return analysis.width >= 3 && analysis.height >= 3;
    case 'large':
      return analysis.pixelCount >= 20;
    case 'small':
      return analysis.pixelCount < 10;

    // Density conditions
    case 'densityGt06':
      return analysis.density > 0.6;
    case 'densityGt07':
      return analysis.density > 0.7;
    case 'densityLt03':
      return analysis.density < 0.3;
    case 'veryDense':
      return analysis.density > 0.8;

    // Color conditions
    case 'colorCountGte3':
      return analysis.colorCount >= 3;
    case 'dominantColorF':
      return analysis.dominantColor === 'F'; // Brown
    case 'dominantColorD':
      return analysis.dominantColor === 'D'; // Gray
    case 'brown':
      return analysis.dominantColor === 'F';

    // Position conditions (simplified - could be expanded)
    case 'denseTop':
      return analysis.centerY < 3;
    case 'symmetric':
      // Simplified symmetry check - center is near middle
      return Math.abs(analysis.centerX - 3.5) < 1;

    // Default - unknown condition
    default:
      console.warn(`Unknown drawable condition: ${condition}`);
      return false;
  }
}
