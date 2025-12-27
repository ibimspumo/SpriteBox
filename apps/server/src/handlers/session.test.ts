// apps/server/src/handlers/session.test.ts
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  storeSessionToken,
  validateSessionToken,
  removeSessionToken,
  cleanupExpiredSessions,
  getActiveSessionCount,
} from './session.js';

// Mock the constants module
vi.mock('../constants.js', () => ({
  TIMERS: {
    SESSION_MAX_AGE: 1000, // 1 second for testing
  },
}));

// Mock the utils module
vi.mock('../utils.js', () => ({
  log: vi.fn(),
}));

describe('Session Management', () => {
  beforeEach(() => {
    // Clean up any existing sessions before each test
    // We can't directly access the Map, so we'll test behavior
  });

  describe('storeSessionToken', () => {
    it('should store a session token for a player', () => {
      const sessionId = 'test-session-123';
      const playerId = 'player-456';

      storeSessionToken(sessionId, playerId);

      const result = validateSessionToken(sessionId);
      expect(result.valid).toBe(true);
      expect(result.playerId).toBe(playerId);

      // Cleanup
      removeSessionToken(sessionId);
    });
  });

  describe('validateSessionToken', () => {
    it('should return valid=true for a valid token', () => {
      const sessionId = 'valid-session';
      const playerId = 'player-123';

      storeSessionToken(sessionId, playerId);

      const result = validateSessionToken(sessionId);
      expect(result.valid).toBe(true);
      expect(result.playerId).toBe(playerId);
      expect(result.expired).toBeUndefined();

      // Cleanup
      removeSessionToken(sessionId);
    });

    it('should return valid=false for an unknown token', () => {
      const result = validateSessionToken('unknown-session');
      expect(result.valid).toBe(false);
      expect(result.playerId).toBeUndefined();
    });

    it('should use timing-safe comparison', () => {
      const sessionId = 'timing-test-session';
      const playerId = 'player-timing';

      storeSessionToken(sessionId, playerId);

      // Even with slightly different strings, should fail securely
      const result1 = validateSessionToken('timing-test-sessio');
      expect(result1.valid).toBe(false);

      const result2 = validateSessionToken('timing-test-session');
      expect(result2.valid).toBe(true);

      // Cleanup
      removeSessionToken(sessionId);
    });

    it('should handle different length tokens correctly', () => {
      const sessionId = 'test-session';
      const playerId = 'player-1';

      storeSessionToken(sessionId, playerId);

      // Different length should fail
      const result = validateSessionToken('test');
      expect(result.valid).toBe(false);

      // Cleanup
      removeSessionToken(sessionId);
    });
  });

  describe('removeSessionToken', () => {
    it('should remove a stored session token', () => {
      const sessionId = 'to-be-removed';
      const playerId = 'player-remove';

      storeSessionToken(sessionId, playerId);

      // Verify it exists
      let result = validateSessionToken(sessionId);
      expect(result.valid).toBe(true);

      // Remove it
      removeSessionToken(sessionId);

      // Verify it's gone
      result = validateSessionToken(sessionId);
      expect(result.valid).toBe(false);
    });

    it('should not throw when removing non-existent token', () => {
      expect(() => removeSessionToken('non-existent')).not.toThrow();
    });
  });

  describe('cleanupExpiredSessions', () => {
    it('should remove expired sessions', async () => {
      const sessionId = 'expiring-session';
      const playerId = 'player-expire';

      storeSessionToken(sessionId, playerId);

      // Verify it exists
      let result = validateSessionToken(sessionId);
      expect(result.valid).toBe(true);

      // Wait for expiration (mock is set to 1 second)
      await new Promise((resolve) => setTimeout(resolve, 1100));

      // Run cleanup
      cleanupExpiredSessions();

      // Verify it's gone
      result = validateSessionToken(sessionId);
      expect(result.valid).toBe(false);
    });
  });

  describe('getActiveSessionCount', () => {
    it('should return the number of active sessions', () => {
      const initialCount = getActiveSessionCount();

      storeSessionToken('count-test-1', 'player-1');
      storeSessionToken('count-test-2', 'player-2');

      expect(getActiveSessionCount()).toBe(initialCount + 2);

      // Cleanup
      removeSessionToken('count-test-1');
      removeSessionToken('count-test-2');

      expect(getActiveSessionCount()).toBe(initialCount);
    });
  });
});
