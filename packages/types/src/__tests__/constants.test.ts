// packages/types/src/__tests__/constants.test.ts
import { describe, it, expect } from 'vitest';
import {
  CANVAS,
  PALETTE,
  MAX_PLAYERS_PER_INSTANCE,
  MIN_PLAYERS_TO_START,
} from '../constants.js';

describe('CANVAS constants', () => {
  it('should have correct dimensions', () => {
    expect(CANVAS.WIDTH).toBe(8);
    expect(CANVAS.HEIGHT).toBe(8);
  });

  it('should have correct total pixels', () => {
    expect(CANVAS.TOTAL_PIXELS).toBe(CANVAS.WIDTH * CANVAS.HEIGHT);
    expect(CANVAS.TOTAL_PIXELS).toBe(64);
  });

  it('should have minimum pixels set requirement', () => {
    expect(CANVAS.MIN_PIXELS_SET).toBe(5);
    expect(CANVAS.MIN_PIXELS_SET).toBeGreaterThan(0);
    expect(CANVAS.MIN_PIXELS_SET).toBeLessThan(CANVAS.TOTAL_PIXELS);
  });

  it('should have valid background color', () => {
    expect(CANVAS.BACKGROUND_COLOR).toBe('1');
    // Background color should be a valid hex digit
    expect(/^[0-9A-F]$/i.test(CANVAS.BACKGROUND_COLOR)).toBe(true);
  });
});

describe('PALETTE constants', () => {
  it('should have exactly 16 colors', () => {
    expect(PALETTE.length).toBe(16);
  });

  it('should have valid hex color codes', () => {
    const hexColorRegex = /^#[0-9A-F]{6}$/i;
    for (const color of PALETTE) {
      expect(hexColorRegex.test(color)).toBe(true);
    }
  });

  it('should have black as first color', () => {
    expect(PALETTE[0]).toBe('#000000');
  });

  it('should have white as second color (background)', () => {
    expect(PALETTE[1]).toBe('#FFFFFF');
  });

  it('should include primary colors', () => {
    expect(PALETTE).toContain('#FF0000'); // Red
    expect(PALETTE).toContain('#00FF00'); // Green
    expect(PALETTE).toContain('#0000FF'); // Blue
  });

  it('should include secondary colors', () => {
    expect(PALETTE).toContain('#FFFF00'); // Yellow
    expect(PALETTE).toContain('#FF00FF'); // Magenta
    expect(PALETTE).toContain('#00FFFF'); // Cyan
  });
});

describe('Player limits', () => {
  it('should have sensible max players', () => {
    expect(MAX_PLAYERS_PER_INSTANCE).toBe(100);
    expect(MAX_PLAYERS_PER_INSTANCE).toBeGreaterThan(MIN_PLAYERS_TO_START);
  });

  it('should have sensible min players', () => {
    expect(MIN_PLAYERS_TO_START).toBe(5);
    expect(MIN_PLAYERS_TO_START).toBeGreaterThan(1);
    expect(MIN_PLAYERS_TO_START).toBeLessThan(MAX_PLAYERS_PER_INSTANCE);
  });
});
