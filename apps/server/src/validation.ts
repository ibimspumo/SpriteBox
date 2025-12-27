// apps/server/src/validation.ts
// Re-exports from @spritebox/types

// Re-export all validation schemas and helpers
export {
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
} from '@spritebox/types';

// Re-export types
export type {
  PixelInput,
  PixelOutput,
  RoomCodeInput,
  UsernameInput,
  VoteInput,
  ZombieMoveInput,
  ZombieMoveDirection,
} from '@spritebox/types';
