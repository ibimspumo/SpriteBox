// packages/types/src/__tests__/exports.test.ts
// Test that all types and modules are properly exported
import { describe, it, expect } from 'vitest';

describe('Type exports', () => {
  it('should export user types', async () => {
    const { User, Player, PlayerStats, GameModeStats } = await import('../user.js');
    // These are types, not runtime values - we just verify the module loads
    expect(true).toBe(true);
  });

  it('should export prompt types', async () => {
    const { Prompt, PromptIndices, PromptData } = await import('../prompt.js');
    expect(true).toBe(true);
  });

  it('should export game types', async () => {
    const mod = await import('../game.js');
    // GamePhase should be a union type
    expect(mod).toBeDefined();
  });

  it('should export phase types', async () => {
    const mod = await import('../phase.js');
    expect(mod).toBeDefined();
  });

  it('should export socket types', async () => {
    const mod = await import('../socket.js');
    expect(mod).toBeDefined();
  });

  it('should export constants', async () => {
    const { CANVAS, PALETTE, MAX_PLAYERS_PER_INSTANCE, MIN_PLAYERS_TO_START } = await import('../constants.js');
    expect(CANVAS).toBeDefined();
    expect(PALETTE).toBeDefined();
    expect(MAX_PLAYERS_PER_INSTANCE).toBeDefined();
    expect(MIN_PLAYERS_TO_START).toBeDefined();
  });

  it('should export validation schemas', async () => {
    const {
      PixelSchema,
      RoomCodeSchema,
      UsernameSchema,
      VoteSchema,
      validate,
      validateMinPixels,
    } = await import('../validation.js');

    expect(PixelSchema).toBeDefined();
    expect(RoomCodeSchema).toBeDefined();
    expect(UsernameSchema).toBeDefined();
    expect(VoteSchema).toBeDefined();
    expect(validate).toBeDefined();
    expect(validateMinPixels).toBeDefined();
  });

  it('should export copycat mode types', async () => {
    const mod = await import('../modes/copycat.js');
    expect(mod).toBeDefined();
  });

  it('should export pixelGuesser mode types', async () => {
    const mod = await import('../modes/pixelGuesser.js');
    expect(mod).toBeDefined();
  });

  it('should export copycatRoyale mode types', async () => {
    const mod = await import('../modes/copycatRoyale.js');
    expect(mod).toBeDefined();
  });

  it('should export zombiePixel mode types', async () => {
    const mod = await import('../modes/zombiePixel.js');
    expect(mod).toBeDefined();
  });

  it('should export modes index', async () => {
    const mod = await import('../modes/index.js');
    expect(mod).toBeDefined();
  });
});

describe('Main index exports', () => {
  it('should export everything from main entry point', async () => {
    const mod = await import('../index.js');

    // Core types
    expect(mod.CANVAS).toBeDefined();
    expect(mod.PALETTE).toBeDefined();
    expect(mod.MAX_PLAYERS_PER_INSTANCE).toBeDefined();
    expect(mod.MIN_PLAYERS_TO_START).toBeDefined();

    // Validation
    expect(mod.PixelSchema).toBeDefined();
    expect(mod.UsernameSchema).toBeDefined();
    expect(mod.RoomCodeSchema).toBeDefined();
    expect(mod.validate).toBeDefined();
    expect(mod.validateMinPixels).toBeDefined();
  });
});
