// packages/types/src/__tests__/validation.test.ts
import { describe, it, expect } from 'vitest';
import {
  PixelSchema,
  RoomCodeSchema,
  UsernameSchema,
  VoteSchema,
  FinaleVoteSchema,
  StatsSchema,
  CopyCatRematchVoteSchema,
  PixelGuesserDrawSchema,
  PixelGuesserGuessSchema,
  ZombieMoveSchema,
  validateMinPixels,
  validate,
} from '../validation.js';
import { CANVAS } from '../constants.js';

describe('PixelSchema', () => {
  it('should accept valid 64-character hex string', () => {
    const validPixels = '1'.repeat(64);
    const result = PixelSchema.safeParse({ pixels: validPixels });
    expect(result.success).toBe(true);
  });

  it('should transform lowercase to uppercase', () => {
    const validPixels = 'abcdef'.padEnd(64, '0');
    const result = PixelSchema.safeParse({ pixels: validPixels });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.pixels).toBe(validPixels.toUpperCase());
    }
  });

  it('should reject strings that are too short', () => {
    const result = PixelSchema.safeParse({ pixels: '123' });
    expect(result.success).toBe(false);
  });

  it('should reject strings that are too long', () => {
    const result = PixelSchema.safeParse({ pixels: '1'.repeat(65) });
    expect(result.success).toBe(false);
  });

  it('should reject non-hex characters', () => {
    const invalidPixels = 'G'.repeat(64);
    const result = PixelSchema.safeParse({ pixels: invalidPixels });
    expect(result.success).toBe(false);
  });
});

describe('RoomCodeSchema', () => {
  it('should accept valid 4-character alphanumeric code', () => {
    const result = RoomCodeSchema.safeParse({ code: 'A1B2' });
    expect(result.success).toBe(true);
  });

  it('should transform to uppercase', () => {
    const result = RoomCodeSchema.safeParse({ code: 'abcd' });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.code).toBe('ABCD');
    }
  });

  it('should reject codes that are too short', () => {
    const result = RoomCodeSchema.safeParse({ code: 'ABC' });
    expect(result.success).toBe(false);
  });

  it('should reject codes that are too long', () => {
    const result = RoomCodeSchema.safeParse({ code: 'ABCDE' });
    expect(result.success).toBe(false);
  });

  it('should reject special characters', () => {
    const result = RoomCodeSchema.safeParse({ code: 'AB-1' });
    expect(result.success).toBe(false);
  });
});

describe('UsernameSchema', () => {
  it('should accept valid username', () => {
    const result = UsernameSchema.safeParse({ name: 'Player1' });
    expect(result.success).toBe(true);
  });

  it('should trim whitespace', () => {
    const result = UsernameSchema.safeParse({ name: '  Test  ' });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.name).toBe('Test');
    }
  });

  it('should reject empty string', () => {
    const result = UsernameSchema.safeParse({ name: '' });
    expect(result.success).toBe(false);
  });

  it('should reject only whitespace', () => {
    const result = UsernameSchema.safeParse({ name: '   ' });
    expect(result.success).toBe(false);
  });

  it('should reject names longer than 20 characters', () => {
    const result = UsernameSchema.safeParse({ name: 'A'.repeat(21) });
    expect(result.success).toBe(false);
  });

  it('should reject forbidden names (admin)', () => {
    const result = UsernameSchema.safeParse({ name: 'admin' });
    expect(result.success).toBe(false);
  });

  it('should reject forbidden names (case insensitive)', () => {
    const result = UsernameSchema.safeParse({ name: 'ADMIN' });
    expect(result.success).toBe(false);
  });

  it('should reject XSS patterns (script tag)', () => {
    const result = UsernameSchema.safeParse({ name: '<script>alert(1)</script>' });
    expect(result.success).toBe(false);
  });

  it('should reject XSS patterns (javascript:)', () => {
    const result = UsernameSchema.safeParse({ name: 'javascript:void(0)' });
    expect(result.success).toBe(false);
  });

  it('should reject XSS patterns (event handlers)', () => {
    const result = UsernameSchema.safeParse({ name: 'onclick=alert(1)' });
    expect(result.success).toBe(false);
  });

  it('should escape HTML entities', () => {
    const result = UsernameSchema.safeParse({ name: 'Test&User' });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.name).toBe('Test&amp;User');
    }
  });
});

describe('VoteSchema', () => {
  it('should accept valid vote', () => {
    const result = VoteSchema.safeParse({ chosenId: 'player-123' });
    expect(result.success).toBe(true);
  });

  it('should reject empty chosenId', () => {
    const result = VoteSchema.safeParse({ chosenId: '' });
    expect(result.success).toBe(false);
  });

  it('should reject too long chosenId', () => {
    const result = VoteSchema.safeParse({ chosenId: 'a'.repeat(51) });
    expect(result.success).toBe(false);
  });
});

describe('FinaleVoteSchema', () => {
  it('should accept valid finale vote', () => {
    const result = FinaleVoteSchema.safeParse({ playerId: 'finalist-456' });
    expect(result.success).toBe(true);
  });

  it('should reject empty playerId', () => {
    const result = FinaleVoteSchema.safeParse({ playerId: '' });
    expect(result.success).toBe(false);
  });
});

describe('StatsSchema', () => {
  it('should accept valid stats', () => {
    const result = StatsSchema.safeParse({
      gamesPlayed: 100,
      placements: { 1: 10, 2: 20, 3: 30 },
    });
    expect(result.success).toBe(true);
  });

  it('should reject negative gamesPlayed', () => {
    const result = StatsSchema.safeParse({
      gamesPlayed: -1,
      placements: { 1: 0, 2: 0, 3: 0 },
    });
    expect(result.success).toBe(false);
  });

  it('should reject gamesPlayed exceeding limit', () => {
    const result = StatsSchema.safeParse({
      gamesPlayed: 1_000_001,
      placements: { 1: 0, 2: 0, 3: 0 },
    });
    expect(result.success).toBe(false);
  });

  it('should reject placements exceeding limits', () => {
    const result = StatsSchema.safeParse({
      gamesPlayed: 100,
      placements: { 1: 100_001, 2: 0, 3: 0 },
    });
    expect(result.success).toBe(false);
  });
});

describe('CopyCatRematchVoteSchema', () => {
  it('should accept true', () => {
    const result = CopyCatRematchVoteSchema.safeParse({ wantsRematch: true });
    expect(result.success).toBe(true);
  });

  it('should accept false', () => {
    const result = CopyCatRematchVoteSchema.safeParse({ wantsRematch: false });
    expect(result.success).toBe(true);
  });

  it('should reject non-boolean', () => {
    const result = CopyCatRematchVoteSchema.safeParse({ wantsRematch: 'yes' });
    expect(result.success).toBe(false);
  });
});

describe('PixelGuesserDrawSchema', () => {
  it('should accept valid partial drawing', () => {
    const result = PixelGuesserDrawSchema.safeParse({ pixels: 'ABC123' });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.pixels).toBe('ABC123');
    }
  });

  it('should transform to uppercase', () => {
    const result = PixelGuesserDrawSchema.safeParse({ pixels: 'abc' });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.pixels).toBe('ABC');
    }
  });

  it('should reject empty pixels', () => {
    const result = PixelGuesserDrawSchema.safeParse({ pixels: '' });
    expect(result.success).toBe(false);
  });

  it('should reject non-hex characters', () => {
    const result = PixelGuesserDrawSchema.safeParse({ pixels: 'GHIJ' });
    expect(result.success).toBe(false);
  });
});

describe('PixelGuesserGuessSchema', () => {
  it('should accept valid guess', () => {
    const result = PixelGuesserGuessSchema.safeParse({ guess: 'a cat' });
    expect(result.success).toBe(true);
  });

  it('should trim whitespace', () => {
    const result = PixelGuesserGuessSchema.safeParse({ guess: '  dog  ' });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.guess).toBe('dog');
    }
  });

  it('should reject empty guess', () => {
    const result = PixelGuesserGuessSchema.safeParse({ guess: '' });
    expect(result.success).toBe(false);
  });

  it('should reject only whitespace', () => {
    const result = PixelGuesserGuessSchema.safeParse({ guess: '   ' });
    expect(result.success).toBe(false);
  });

  it('should reject XSS patterns', () => {
    const result = PixelGuesserGuessSchema.safeParse({ guess: '<script>alert(1)</script>' });
    expect(result.success).toBe(false);
  });

  it('should escape HTML entities', () => {
    const result = PixelGuesserGuessSchema.safeParse({ guess: 'cat & dog' });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.guess).toBe('cat &amp; dog');
    }
  });
});

describe('ZombieMoveSchema', () => {
  it('should accept cardinal directions', () => {
    expect(ZombieMoveSchema.safeParse({ direction: 'up' }).success).toBe(true);
    expect(ZombieMoveSchema.safeParse({ direction: 'down' }).success).toBe(true);
    expect(ZombieMoveSchema.safeParse({ direction: 'left' }).success).toBe(true);
    expect(ZombieMoveSchema.safeParse({ direction: 'right' }).success).toBe(true);
  });

  it('should accept diagonal directions', () => {
    expect(ZombieMoveSchema.safeParse({ direction: 'up-left' }).success).toBe(true);
    expect(ZombieMoveSchema.safeParse({ direction: 'up-right' }).success).toBe(true);
    expect(ZombieMoveSchema.safeParse({ direction: 'down-left' }).success).toBe(true);
    expect(ZombieMoveSchema.safeParse({ direction: 'down-right' }).success).toBe(true);
  });

  it('should reject invalid directions', () => {
    expect(ZombieMoveSchema.safeParse({ direction: 'forward' }).success).toBe(false);
    expect(ZombieMoveSchema.safeParse({ direction: 'backward' }).success).toBe(false);
  });
});

describe('validateMinPixels', () => {
  it('should return valid for drawings with enough pixels', () => {
    // Background is '1', so anything else counts as set
    const pixels = '0'.repeat(10) + '1'.repeat(54);
    const result = validateMinPixels(pixels);
    expect(result.valid).toBe(true);
    expect(result.setPixels).toBe(10);
  });

  it('should return invalid for drawings with too few pixels', () => {
    // Only 2 set pixels (not background)
    const pixels = '0'.repeat(2) + '1'.repeat(62);
    const result = validateMinPixels(pixels);
    expect(result.valid).toBe(false);
    expect(result.setPixels).toBe(2);
  });

  it('should count minimum correctly', () => {
    // Exactly MIN_PIXELS_SET pixels
    const pixels = '0'.repeat(CANVAS.MIN_PIXELS_SET) + '1'.repeat(64 - CANVAS.MIN_PIXELS_SET);
    const result = validateMinPixels(pixels);
    expect(result.valid).toBe(true);
    expect(result.setPixels).toBe(CANVAS.MIN_PIXELS_SET);
  });
});

describe('validate helper', () => {
  it('should return success for valid data', () => {
    const result = validate(RoomCodeSchema, { code: 'ABCD' });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.code).toBe('ABCD');
    }
  });

  it('should return error for invalid data', () => {
    const result = validate(RoomCodeSchema, { code: 'ABCDE' });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBeDefined();
    }
  });
});
