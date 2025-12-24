/**
 * Pixel Analyzer
 *
 * Analyzes 8x8 pixel art to extract visual properties for character creation.
 * This is the foundation for element, trait, and stat determination.
 *
 * @module engine/character/analyzer/pixel-analyzer
 */

import type {
	Pixel,
	BoundingBox,
	ColorAnalysis,
	ShapeAnalysis,
	ProportionAnalysis,
	ComplexityAnalysis,
	CharacterAnalysis,
	AnalyzerOptions,
	ColorCategory
} from './types.js';
import { DEFAULT_ANALYZER_OPTIONS } from './types.js';

// ============================================
// COLOR MAPPING
// ============================================

/**
 * Map hex color characters to categories.
 * Based on the 16-color palette used in SpriteBox.
 *
 * 0=Black, 1=White, 2=Red, 3=Green, 4=Blue, 5=Yellow,
 * 6=Magenta, 7=Cyan, 8=Orange, 9=Purple, A=Light Blue,
 * B=Lime, C=Pink, D=Gray, E=Light Gray, F=Brown
 */
const COLOR_CATEGORIES: Record<string, ColorCategory> = {
	'0': 'dark', // Black
	'1': 'bright', // White (usually background)
	'2': 'warm', // Red
	'3': 'natural', // Green
	'4': 'cool', // Blue
	'5': 'bright', // Yellow
	'6': 'warm', // Magenta
	'7': 'cool', // Cyan
	'8': 'warm', // Orange
	'9': 'dark', // Purple
	A: 'cool', // Light Blue
	B: 'natural', // Lime
	C: 'warm', // Pink
	D: 'neutral', // Gray
	E: 'bright', // Light Gray
	F: 'natural' // Brown
};

/**
 * Get the category of a color.
 */
export function getColorCategory(color: string): ColorCategory {
	return COLOR_CATEGORIES[color.toUpperCase()] ?? 'neutral';
}

// ============================================
// PIXEL ANALYZER CLASS
// ============================================

/**
 * Analyzes pixel art for character creation.
 */
export class PixelAnalyzer {
	private options: Required<AnalyzerOptions>;

	constructor(options?: AnalyzerOptions) {
		this.options = { ...DEFAULT_ANALYZER_OPTIONS, ...options };
	}

	// ============================================
	// MAIN ANALYSIS
	// ============================================

	/**
	 * Perform complete analysis of a pixel string.
	 */
	analyze(pixels: string): CharacterAnalysis {
		const { gridSize, backgroundColor, minPixels } = this.options;
		const expectedLength = gridSize * gridSize;

		// Validate input
		if (!pixels || pixels.length !== expectedLength) {
			return this.createInvalidAnalysis(pixels);
		}

		// Convert to grid and get filled pixels
		const grid = this.toGrid(pixels);
		const filledPixels = this.getFilledPixels(grid, backgroundColor);

		// Check minimum pixels
		if (filledPixels.length < minPixels) {
			return this.createInvalidAnalysis(pixels);
		}

		// Perform all analyses
		const bounds = this.calculateBounds(filledPixels);
		const color = this.analyzeColors(filledPixels);
		const shape = this.analyzeShape(filledPixels, bounds, grid);
		const proportions = this.analyzeProportions(filledPixels, bounds);
		const complexity = this.analyzeComplexity(filledPixels, grid, backgroundColor);

		return {
			isValid: true,
			pixels,
			filledPixels,
			color,
			shape,
			proportions,
			complexity,
			analyzedAt: Date.now()
		};
	}

	/**
	 * Create an invalid analysis result.
	 */
	private createInvalidAnalysis(pixels: string): CharacterAnalysis {
		return {
			isValid: false,
			pixels: pixels ?? '',
			filledPixels: [],
			color: this.createEmptyColorAnalysis(),
			shape: this.createEmptyShapeAnalysis(),
			proportions: this.createEmptyProportionAnalysis(),
			complexity: this.createEmptyComplexityAnalysis(),
			analyzedAt: Date.now()
		};
	}

	// ============================================
	// GRID OPERATIONS
	// ============================================

	/**
	 * Convert pixel string to 2D grid.
	 */
	private toGrid(pixels: string): string[][] {
		const { gridSize } = this.options;
		const grid: string[][] = [];

		for (let y = 0; y < gridSize; y++) {
			grid[y] = [];
			for (let x = 0; x < gridSize; x++) {
				grid[y][x] = pixels[y * gridSize + x];
			}
		}

		return grid;
	}

	/**
	 * Get all filled (non-background) pixels.
	 */
	private getFilledPixels(grid: string[][], backgroundColor: string): Pixel[] {
		const { gridSize } = this.options;
		const filled: Pixel[] = [];

		for (let y = 0; y < gridSize; y++) {
			for (let x = 0; x < gridSize; x++) {
				const color = grid[y][x];
				if (color !== backgroundColor) {
					filled.push({ x, y, color });
				}
			}
		}

		return filled;
	}

	/**
	 * Calculate bounding box of filled pixels.
	 */
	private calculateBounds(pixels: Pixel[]): BoundingBox {
		if (pixels.length === 0) {
			return { minX: 0, maxX: 0, minY: 0, maxY: 0, width: 0, height: 0 };
		}

		const xs = pixels.map((p) => p.x);
		const ys = pixels.map((p) => p.y);

		const minX = Math.min(...xs);
		const maxX = Math.max(...xs);
		const minY = Math.min(...ys);
		const maxY = Math.max(...ys);

		return {
			minX,
			maxX,
			minY,
			maxY,
			width: maxX - minX + 1,
			height: maxY - minY + 1
		};
	}

	// ============================================
	// COLOR ANALYSIS
	// ============================================

	/**
	 * Analyze color usage in the drawing.
	 */
	private analyzeColors(pixels: Pixel[]): ColorAnalysis {
		if (pixels.length === 0) {
			return this.createEmptyColorAnalysis();
		}

		// Count colors
		const colorCounts = new Map<string, number>();
		for (const pixel of pixels) {
			const count = colorCounts.get(pixel.color) ?? 0;
			colorCounts.set(pixel.color, count + 1);
		}

		// Find dominant color
		let dominantColor = '0';
		let maxCount = 0;
		for (const [color, count] of colorCounts) {
			if (count > maxCount) {
				maxCount = count;
				dominantColor = color;
			}
		}

		// Count by category
		const categories = {
			warm: 0,
			cool: 0,
			natural: 0,
			bright: 0,
			dark: 0,
			neutral: 0
		};

		for (const pixel of pixels) {
			const category = getColorCategory(pixel.color);
			categories[category]++;
		}

		// Calculate diversity (Shannon entropy normalized)
		const total = pixels.length;
		let entropy = 0;
		for (const count of colorCounts.values()) {
			const p = count / total;
			if (p > 0) {
				entropy -= p * Math.log2(p);
			}
		}
		// Normalize to 0-1 (max entropy for 16 colors is log2(16) = 4)
		const diversity = Math.min(1, entropy / 4);

		return {
			dominantColor,
			colorCount: colorCounts.size,
			categories,
			hasWarm: categories.warm > 0,
			hasCool: categories.cool > 0,
			hasNatural: categories.natural > 0,
			hasBright: categories.bright > 0,
			hasDark: categories.dark > 0,
			diversity
		};
	}

	/**
	 * Create empty color analysis.
	 */
	private createEmptyColorAnalysis(): ColorAnalysis {
		return {
			dominantColor: '0',
			colorCount: 0,
			categories: { warm: 0, cool: 0, natural: 0, bright: 0, dark: 0, neutral: 0 },
			hasWarm: false,
			hasCool: false,
			hasNatural: false,
			hasBright: false,
			hasDark: false,
			diversity: 0
		};
	}

	// ============================================
	// SHAPE ANALYSIS
	// ============================================

	/**
	 * Analyze shape properties.
	 */
	private analyzeShape(pixels: Pixel[], bounds: BoundingBox, grid: string[][]): ShapeAnalysis {
		if (pixels.length === 0) {
			return this.createEmptyShapeAnalysis();
		}

		const { gridSize, backgroundColor } = this.options;

		// Calculate centroid
		const centroidX = pixels.reduce((sum, p) => sum + p.x, 0) / pixels.length;
		const centroidY = pixels.reduce((sum, p) => sum + p.y, 0) / pixels.length;

		// Calculate symmetry (left-right mirror)
		let symmetricCount = 0;
		for (const pixel of pixels) {
			const mirrorX = gridSize - 1 - pixel.x;
			if (grid[pixel.y][mirrorX] !== backgroundColor) {
				symmetricCount++;
			}
		}
		const symmetry = pixels.length > 0 ? symmetricCount / pixels.length : 0;

		// Calculate balance (top-bottom)
		const midY = (bounds.minY + bounds.maxY) / 2;
		const topPixels = pixels.filter((p) => p.y < midY).length;
		const bottomPixels = pixels.filter((p) => p.y >= midY).length;
		const balance =
			Math.max(topPixels, bottomPixels) > 0
				? Math.min(topPixels, bottomPixels) / Math.max(topPixels, bottomPixels)
				: 0;

		// Calculate density (filled / bounding box)
		const boundingArea = bounds.width * bounds.height;
		const density = boundingArea > 0 ? pixels.length / boundingArea : 0;

		// Calculate compactness (average distance from centroid)
		const avgDistance =
			pixels.reduce((sum, p) => {
				return sum + Math.sqrt(Math.pow(p.x - centroidX, 2) + Math.pow(p.y - centroidY, 2));
			}, 0) / pixels.length;

		// Max possible distance in grid
		const maxDistance = Math.sqrt(2 * Math.pow(gridSize / 2, 2));
		const compactness = 1 - avgDistance / maxDistance;

		// Aspect ratio
		const aspectRatio = bounds.height > 0 ? bounds.width / bounds.height : 1;

		return {
			pixelCount: pixels.length,
			bounds,
			symmetry,
			balance,
			density,
			compactness,
			centroid: { x: centroidX, y: centroidY },
			aspectRatio
		};
	}

	/**
	 * Create empty shape analysis.
	 */
	private createEmptyShapeAnalysis(): ShapeAnalysis {
		return {
			pixelCount: 0,
			bounds: { minX: 0, maxX: 0, minY: 0, maxY: 0, width: 0, height: 0 },
			symmetry: 0,
			balance: 0,
			density: 0,
			compactness: 0,
			centroid: { x: 0, y: 0 },
			aspectRatio: 1
		};
	}

	// ============================================
	// PROPORTION ANALYSIS
	// ============================================

	/**
	 * Analyze body proportions.
	 */
	private analyzeProportions(pixels: Pixel[], bounds: BoundingBox): ProportionAnalysis {
		if (pixels.length === 0) {
			return this.createEmptyProportionAnalysis();
		}

		const { gridSize } = this.options;
		const thirdHeight = bounds.height / 3;

		// Vertical thirds
		const headPixels = pixels.filter((p) => p.y - bounds.minY < thirdHeight).length;
		const bodyPixels = pixels.filter(
			(p) => p.y - bounds.minY >= thirdHeight && p.y - bounds.minY < thirdHeight * 2
		).length;
		const legPixels = pixels.filter((p) => p.y - bounds.minY >= thirdHeight * 2).length;

		const total = pixels.length;
		const headRatio = total > 0 ? headPixels / total : 0;
		const bodyRatio = total > 0 ? bodyPixels / total : 0;
		const legRatio = total > 0 ? legPixels / total : 0;

		// Horizontal halves
		const midX = gridSize / 2;
		const leftPixels = pixels.filter((p) => p.x < midX).length;
		const rightPixels = pixels.filter((p) => p.x >= midX).length;

		const leftRatio = total > 0 ? leftPixels / total : 0;
		const rightRatio = total > 0 ? rightPixels / total : 0;

		// Humanoid detection: head smaller than body, has legs, roughly symmetric
		const isHumanoid =
			headRatio > 0.1 &&
			headRatio < 0.5 &&
			bodyRatio > 0.2 &&
			legRatio > 0.1 &&
			Math.abs(leftRatio - rightRatio) < 0.3;

		return {
			headRatio,
			bodyRatio,
			legRatio,
			leftRatio,
			rightRatio,
			isHumanoid
		};
	}

	/**
	 * Create empty proportion analysis.
	 */
	private createEmptyProportionAnalysis(): ProportionAnalysis {
		return {
			headRatio: 0,
			bodyRatio: 0,
			legRatio: 0,
			leftRatio: 0,
			rightRatio: 0,
			isHumanoid: false
		};
	}

	// ============================================
	// COMPLEXITY ANALYSIS
	// ============================================

	/**
	 * Analyze complexity and detail.
	 */
	private analyzeComplexity(
		pixels: Pixel[],
		grid: string[][],
		backgroundColor: string
	): ComplexityAnalysis {
		if (pixels.length === 0) {
			return this.createEmptyComplexityAnalysis();
		}

		const { gridSize } = this.options;

		// Count edge pixels (pixels with at least one empty neighbor)
		let edgeCount = 0;
		for (const pixel of pixels) {
			const neighbors = [
				{ x: pixel.x - 1, y: pixel.y },
				{ x: pixel.x + 1, y: pixel.y },
				{ x: pixel.x, y: pixel.y - 1 },
				{ x: pixel.x, y: pixel.y + 1 }
			];

			const isEdge = neighbors.some((n) => {
				if (n.x < 0 || n.x >= gridSize || n.y < 0 || n.y >= gridSize) {
					return true; // Grid boundary = edge
				}
				return grid[n.y][n.x] === backgroundColor;
			});

			if (isEdge) {
				edgeCount++;
			}
		}

		const edgeRatio = pixels.length > 0 ? edgeCount / pixels.length : 0;

		// Count distinct color regions using flood fill
		const visited = new Set<string>();
		let regionCount = 0;

		for (const pixel of pixels) {
			const key = `${pixel.x},${pixel.y}`;
			if (!visited.has(key)) {
				this.floodFillRegion(pixel.x, pixel.y, pixel.color, grid, visited, backgroundColor);
				regionCount++;
			}
		}

		// Calculate complexity score (0-100)
		// Based on: color count, edge ratio, region count, pixel count
		const colorFactor = Math.min(1, pixels.length > 0 ? new Set(pixels.map((p) => p.color)).size / 8 : 0);
		const edgeFactor = edgeRatio;
		const regionFactor = Math.min(1, regionCount / 10);
		const sizeFactor = Math.min(1, pixels.length / 40);

		const complexityScore = Math.round((colorFactor * 25 + edgeFactor * 25 + regionFactor * 25 + sizeFactor * 25));

		return {
			edgeCount,
			edgeRatio,
			regionCount,
			complexityScore
		};
	}

	/**
	 * Flood fill to count regions.
	 */
	private floodFillRegion(
		startX: number,
		startY: number,
		targetColor: string,
		grid: string[][],
		visited: Set<string>,
		backgroundColor: string
	): void {
		const { gridSize } = this.options;
		const stack: Array<{ x: number; y: number }> = [{ x: startX, y: startY }];

		while (stack.length > 0) {
			const { x, y } = stack.pop()!;
			const key = `${x},${y}`;

			if (
				x < 0 ||
				x >= gridSize ||
				y < 0 ||
				y >= gridSize ||
				visited.has(key) ||
				grid[y][x] === backgroundColor ||
				grid[y][x] !== targetColor
			) {
				continue;
			}

			visited.add(key);

			stack.push({ x: x - 1, y });
			stack.push({ x: x + 1, y });
			stack.push({ x, y: y - 1 });
			stack.push({ x, y: y + 1 });
		}
	}

	/**
	 * Create empty complexity analysis.
	 */
	private createEmptyComplexityAnalysis(): ComplexityAnalysis {
		return {
			edgeCount: 0,
			edgeRatio: 0,
			regionCount: 0,
			complexityScore: 0
		};
	}
}

// ============================================
// DEFAULT INSTANCE
// ============================================

/**
 * Default pixel analyzer instance.
 */
export const defaultPixelAnalyzer = new PixelAnalyzer();

/**
 * Convenience function to analyze pixels.
 */
export function analyzeCharacterPixels(pixels: string, options?: AnalyzerOptions): CharacterAnalysis {
	if (options) {
		return new PixelAnalyzer(options).analyze(pixels);
	}
	return defaultPixelAnalyzer.analyze(pixels);
}
