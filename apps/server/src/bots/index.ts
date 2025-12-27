// apps/server/src/bots/index.ts
// Barrel exports for the bots module

// Types
export type { Bot, BotBehavior, BotConfig } from './types.js';

// Configuration
export { DEBUG_CONFIG, BOT_BEHAVIORS, BOT_NAMES } from './config.js';

// Controller
export { BotController, botController } from './BotController.js';

// Handlers
export { DrawingHandler, VotingHandler } from './handlers/index.js';
export type { DrawingHandlerContext, VotingHandlerContext } from './handlers/index.js';

// Drawing patterns
export {
  generateRandomDrawing,
  generateSmiley,
  generateHouse,
  generateHeart,
  generateTree,
  generateStar,
  generateRandom,
  generateStripes,
  generateCheckerboard,
} from './drawing/index.js';

// Endpoints
export { setupDebugEndpoints } from './endpoints.js';
