// apps/server/src/debug.ts
// Debug & Bot System - Facade module for backwards compatibility
//
// This file re-exports everything from the refactored bots/ module.
// The implementation has been split into:
//   - bots/types.ts      - Type definitions
//   - bots/config.ts     - Configuration constants
//   - bots/BotController.ts - Core bot orchestration
//   - bots/handlers/     - Phase-specific handlers
//   - bots/drawing/      - Pattern generators
//   - bots/endpoints.ts  - REST API endpoints

// Re-export everything for backwards compatibility
export {
  // Types
  type Bot,
  type BotBehavior,
  type BotConfig,

  // Configuration
  DEBUG_CONFIG,
  BOT_BEHAVIORS,
  BOT_NAMES,

  // Controller
  BotController,
  botController,

  // Endpoints
  setupDebugEndpoints,
} from './bots/index.js';
