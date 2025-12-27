// apps/server/src/handlers/types.ts
// Handler type definitions and re-exports

import type { Server, Socket } from 'socket.io';
import type { ClientToServerEvents, ServerToClientEvents, Player } from '../types.js';

/**
 * Typed Socket.io Server
 */
export type TypedServer = Server<ClientToServerEvents, ServerToClientEvents>;

/**
 * Typed Socket.io Socket with custom data
 */
export type TypedSocket = Socket<ClientToServerEvents, ServerToClientEvents>;

/**
 * Handler context passed to all event handlers
 */
export interface HandlerContext {
  socket: TypedSocket;
  io: TypedServer;
  player: Player;
}

/**
 * Handler registration function signature
 */
export type RegisterHandler = (socket: TypedSocket, io: TypedServer, player: Player) => void;

/**
 * Validation result type
 */
export interface ValidationResult<T> {
  valid: boolean;
  data?: T;
  error?: string;
}

/**
 * Instance validation result
 */
export interface InstanceValidationResult {
  valid: boolean;
  instance: import('../types.js').Instance | null;
}

// Re-export commonly used types from main types file
export type {
  Player,
  User,
  Instance,
  GamePhase,
  Submission,
  Vote,
  VotingAssignment,
  Prompt,
  PromptIndices,
  PhaseState,
  CopyCatState,
  PixelGuesserState,
  CopyCatRoyaleState,
} from '../types.js';
