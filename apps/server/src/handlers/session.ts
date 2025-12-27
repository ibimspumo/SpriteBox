// apps/server/src/handlers/session.ts
// Session token management for secure reconnection

import { timingSafeEqual } from 'crypto';
import { TIMERS } from '../constants.js';
import { log } from '../utils.js';

/**
 * Session entry stored for reconnection
 */
interface SessionEntry {
  tokenBuffer: Buffer;
  createdAt: number;
  playerId: string;
}

/**
 * Session token storage
 */
const sessionTokens = new Map<string, SessionEntry>();

/**
 * Stores a session token securely for later validation
 */
export function storeSessionToken(sessionId: string, playerId: string): void {
  sessionTokens.set(sessionId, {
    tokenBuffer: Buffer.from(sessionId, 'utf8'),
    createdAt: Date.now(),
    playerId,
  });
}

/**
 * Validates a session token using timing-safe comparison
 * @returns Validation result with player ID if valid
 */
export function validateSessionToken(providedSessionId: string): {
  valid: boolean;
  playerId?: string;
  expired?: boolean;
} {
  const entry = sessionTokens.get(providedSessionId);
  if (!entry) {
    return { valid: false };
  }

  // Check 24h expiry
  if (Date.now() - entry.createdAt > TIMERS.SESSION_MAX_AGE) {
    sessionTokens.delete(providedSessionId);
    return { valid: false, expired: true };
  }

  // Timing-safe comparison to prevent timing attacks
  const providedBuffer = Buffer.from(providedSessionId, 'utf8');
  if (providedBuffer.length !== entry.tokenBuffer.length) {
    return { valid: false };
  }

  if (!timingSafeEqual(providedBuffer, entry.tokenBuffer)) {
    return { valid: false };
  }

  return { valid: true, playerId: entry.playerId };
}

/**
 * Removes a session token
 */
export function removeSessionToken(sessionId: string): void {
  sessionTokens.delete(sessionId);
}

/**
 * Cleanup expired session tokens (should be called periodically)
 */
export function cleanupExpiredSessions(): void {
  const now = Date.now();
  let cleaned = 0;

  for (const [sessionId, entry] of sessionTokens) {
    if (now - entry.createdAt > TIMERS.SESSION_MAX_AGE) {
      sessionTokens.delete(sessionId);
      cleaned++;
    }
  }

  if (cleaned > 0) {
    log('Session', `Cleaned up ${cleaned} expired sessions`);
  }
}

/**
 * Starts the periodic session cleanup (every 5 minutes)
 */
export function startSessionCleanup(): void {
  setInterval(cleanupExpiredSessions, 5 * 60 * 1000);
}

/**
 * Gets the number of active sessions (for debugging/monitoring)
 */
export function getActiveSessionCount(): number {
  return sessionTokens.size;
}
