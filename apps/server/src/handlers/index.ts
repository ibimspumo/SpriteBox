// apps/server/src/handlers/index.ts
// Main handler exports and registration

// Types
export type { TypedServer, TypedSocket, HandlerContext, RegisterHandler } from './types.js';
export type { ValidationResult, InstanceValidationResult } from './types.js';

// Session management
export {
  storeSessionToken,
  validateSessionToken,
  removeSessionToken,
  cleanupExpiredSessions,
  startSessionCleanup,
  getActiveSessionCount,
} from './session.js';

// Connection management
export {
  getClientIP,
  registerConnection,
  unregisterConnection,
  getTotalConnections,
  checkConnectionAllowed,
  setupConnectionMiddleware,
} from './connection.js';

// Common utilities
export {
  emitError,
  validateInstanceAndPhase,
  validatePhaseTime,
  validateActivePlayer,
  validateHost,
  validatePlayerInInstance,
  validateAndEmit,
  checkRateLimitAndEmit,
  checkRateLimitSilent,
  logHandler,
  validateNotInGame,
  validatePrivateRoom,
  validateGameMode,
  checkGameMode,
  checkPhase,
} from './common.js';

// Handler registrations
export { registerLobbyHandlers } from './lobby.js';
export { registerHostHandlers } from './host.js';
export { registerGameHandlers } from './game.js';

// Mode-specific handlers
export {
  registerCopyCatHandlers,
  registerPixelGuesserHandlers,
  registerZombiePixelHandlers,
  registerCopyCatRoyaleHandlers,
} from './modes/index.js';
