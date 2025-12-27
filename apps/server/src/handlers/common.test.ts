// apps/server/src/handlers/common.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { z } from 'zod';
import type { Instance, GamePhase } from './types.js';

// Mock dependencies before importing the module
vi.mock('../instance.js', () => ({
  findInstance: vi.fn(),
}));

vi.mock('../phases.js', () => ({
  isWithinPhaseTime: vi.fn(),
}));

vi.mock('../rateLimit.js', () => ({
  checkRateLimit: vi.fn(),
}));

vi.mock('../validation.js', () => ({
  validate: vi.fn(),
}));

vi.mock('../utils.js', () => ({
  log: vi.fn(),
}));

// Import after mocking
import {
  emitError,
  validateInstanceAndPhase,
  validatePhaseTime,
  validateActivePlayer,
  validateHost,
  validateAndEmit,
  checkRateLimitAndEmit,
  checkRateLimitSilent,
  checkGameMode,
  checkPhase,
} from './common.js';
import { findInstance } from '../instance.js';
import { isWithinPhaseTime } from '../phases.js';
import { checkRateLimit } from '../rateLimit.js';
import { validate } from '../validation.js';

// Create mock socket
function createMockSocket() {
  return {
    emit: vi.fn(),
    data: {
      instanceId: null as string | null,
    },
  } as unknown as import('./types.js').TypedSocket;
}

// Create mock instance
function createMockInstance(overrides: Partial<Instance> = {}): Instance {
  return {
    id: 'test-instance',
    type: 'public',
    gameMode: 'pixel-battle',
    phase: 'lobby' as GamePhase,
    players: new Map(),
    spectators: new Map(),
    submissions: [],
    votes: [],
    createdAt: Date.now(),
    lastActivity: Date.now(),
    ...overrides,
  };
}

// Create mock player
function createMockPlayer(id = 'player-1') {
  return {
    id,
    sessionId: 'session-1',
    user: { displayName: 'Test', discriminator: '0001', fullName: 'Test#0001' },
    socketId: 'socket-1',
    joinedAt: Date.now(),
    status: 'connected' as const,
  };
}

describe('Common Handler Utilities', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('emitError', () => {
    it('should emit an error event with code and message', () => {
      const socket = createMockSocket();

      emitError(socket, 'TEST_ERROR', 'Test error message');

      expect(socket.emit).toHaveBeenCalledWith('error', {
        code: 'TEST_ERROR',
        message: 'Test error message',
      });
    });
  });

  describe('validateInstanceAndPhase', () => {
    it('should return invalid when not in a game', () => {
      const socket = createMockSocket();
      socket.data.instanceId = null;

      const result = validateInstanceAndPhase(socket);

      expect(result.valid).toBe(false);
      expect(result.instance).toBeNull();
      expect(socket.emit).toHaveBeenCalledWith('error', {
        code: 'NOT_IN_GAME',
        message: 'Not in a game',
      });
    });

    it('should return invalid when instanceId is pending', () => {
      const socket = createMockSocket();
      socket.data.instanceId = 'pending';

      const result = validateInstanceAndPhase(socket);

      expect(result.valid).toBe(false);
      expect(socket.emit).toHaveBeenCalled();
    });

    it('should return invalid when instance not found', () => {
      const socket = createMockSocket();
      socket.data.instanceId = 'test-instance';
      vi.mocked(findInstance).mockReturnValue(undefined);

      const result = validateInstanceAndPhase(socket);

      expect(result.valid).toBe(false);
      expect(socket.emit).toHaveBeenCalledWith('error', {
        code: 'INSTANCE_NOT_FOUND',
        message: 'Instance not found',
      });
    });

    it('should return valid when instance exists and no phase check', () => {
      const socket = createMockSocket();
      socket.data.instanceId = 'test-instance';
      const instance = createMockInstance();
      vi.mocked(findInstance).mockReturnValue(instance);

      const result = validateInstanceAndPhase(socket);

      expect(result.valid).toBe(true);
      expect(result.instance).toBe(instance);
    });

    it('should validate single phase correctly', () => {
      const socket = createMockSocket();
      socket.data.instanceId = 'test-instance';
      const instance = createMockInstance({ phase: 'drawing' });
      vi.mocked(findInstance).mockReturnValue(instance);

      const result = validateInstanceAndPhase(socket, 'drawing');

      expect(result.valid).toBe(true);
    });

    it('should fail when phase does not match', () => {
      const socket = createMockSocket();
      socket.data.instanceId = 'test-instance';
      const instance = createMockInstance({ phase: 'lobby' });
      vi.mocked(findInstance).mockReturnValue(instance);

      const result = validateInstanceAndPhase(socket, 'drawing');

      expect(result.valid).toBe(false);
      expect(socket.emit).toHaveBeenCalledWith('error', {
        code: 'WRONG_PHASE',
        message: 'Not in drawing phase',
      });
    });

    it('should validate against multiple phases', () => {
      const socket = createMockSocket();
      socket.data.instanceId = 'test-instance';
      const instance = createMockInstance({ phase: 'voting' });
      vi.mocked(findInstance).mockReturnValue(instance);

      const result = validateInstanceAndPhase(socket, ['drawing', 'voting']);

      expect(result.valid).toBe(true);
    });
  });

  describe('validatePhaseTime', () => {
    it('should return true when within phase time', () => {
      const socket = createMockSocket();
      vi.mocked(isWithinPhaseTime).mockReturnValue(true);

      const result = validatePhaseTime(socket, 'test-instance');

      expect(result).toBe(true);
      expect(socket.emit).not.toHaveBeenCalled();
    });

    it('should return false and emit error when time expired', () => {
      const socket = createMockSocket();
      vi.mocked(isWithinPhaseTime).mockReturnValue(false);

      const result = validatePhaseTime(socket, 'test-instance');

      expect(result).toBe(false);
      expect(socket.emit).toHaveBeenCalledWith('error', {
        code: 'TIME_EXPIRED',
        message: 'Phase time expired',
      });
    });
  });

  describe('validateActivePlayer', () => {
    it('should return true when player is active', () => {
      const socket = createMockSocket();
      const player = createMockPlayer();
      const instance = createMockInstance();
      instance.players.set(player.id, player);

      const result = validateActivePlayer(socket, instance, player);

      expect(result).toBe(true);
      expect(socket.emit).not.toHaveBeenCalled();
    });

    it('should return false when player is not active', () => {
      const socket = createMockSocket();
      const player = createMockPlayer();
      const instance = createMockInstance();

      const result = validateActivePlayer(socket, instance, player, 'submit');

      expect(result).toBe(false);
      expect(socket.emit).toHaveBeenCalledWith('error', {
        code: 'NOT_ACTIVE_PLAYER',
        message: 'Only active players can submit',
      });
    });
  });

  describe('validateHost', () => {
    it('should return true when player is host', () => {
      const socket = createMockSocket();
      const player = createMockPlayer();
      const instance = createMockInstance({ hostId: player.id });

      const result = validateHost(socket, instance, player);

      expect(result).toBe(true);
    });

    it('should return false when player is not host', () => {
      const socket = createMockSocket();
      const player = createMockPlayer();
      const instance = createMockInstance({ hostId: 'other-player' });

      const result = validateHost(socket, instance, player);

      expect(result).toBe(false);
      expect(socket.emit).toHaveBeenCalledWith('error', {
        code: 'NOT_HOST',
        message: 'Only the host can perform this action',
      });
    });
  });

  describe('validateAndEmit', () => {
    it('should return valid with data when validation succeeds', () => {
      const socket = createMockSocket();
      const schema = z.object({ name: z.string() });
      vi.mocked(validate).mockReturnValue({ success: true, data: { name: 'Test' } });

      const result = validateAndEmit(socket, schema, { name: 'Test' }, 'INVALID');

      expect(result.valid).toBe(true);
      expect(result.data).toEqual({ name: 'Test' });
      expect(socket.emit).not.toHaveBeenCalled();
    });

    it('should return invalid and emit error when validation fails', () => {
      const socket = createMockSocket();
      const schema = z.object({ name: z.string() });
      vi.mocked(validate).mockReturnValue({ success: false, error: 'Name required' });

      const result = validateAndEmit(socket, schema, {}, 'INVALID_NAME');

      expect(result.valid).toBe(false);
      expect(result.data).toBeUndefined();
      expect(socket.emit).toHaveBeenCalledWith('error', {
        code: 'INVALID_NAME',
        message: 'Name required',
      });
    });
  });

  describe('checkRateLimitAndEmit', () => {
    it('should return true when within rate limit', () => {
      const socket = createMockSocket();
      vi.mocked(checkRateLimit).mockReturnValue(true);

      const result = checkRateLimitAndEmit(socket, 'test-event');

      expect(result).toBe(true);
      expect(socket.emit).not.toHaveBeenCalled();
    });

    it('should return false and emit error when rate limited', () => {
      const socket = createMockSocket();
      vi.mocked(checkRateLimit).mockReturnValue(false);

      const result = checkRateLimitAndEmit(socket, 'test-event');

      expect(result).toBe(false);
      expect(socket.emit).toHaveBeenCalledWith('error', {
        code: 'RATE_LIMITED',
        message: 'Too many requests',
      });
    });
  });

  describe('checkRateLimitSilent', () => {
    it('should return true when within rate limit without emitting', () => {
      const socket = createMockSocket();
      vi.mocked(checkRateLimit).mockReturnValue(true);

      const result = checkRateLimitSilent(socket, 'test-event');

      expect(result).toBe(true);
      expect(socket.emit).not.toHaveBeenCalled();
    });

    it('should return false without emitting when rate limited', () => {
      const socket = createMockSocket();
      vi.mocked(checkRateLimit).mockReturnValue(false);

      const result = checkRateLimitSilent(socket, 'test-event');

      expect(result).toBe(false);
      expect(socket.emit).not.toHaveBeenCalled();
    });
  });

  describe('checkGameMode', () => {
    it('should return true when game mode matches', () => {
      const instance = createMockInstance({ gameMode: 'pixel-battle' });

      expect(checkGameMode(instance, 'pixel-battle')).toBe(true);
    });

    it('should return true when game mode is in array', () => {
      const instance = createMockInstance({ gameMode: 'copy-cat' });

      expect(checkGameMode(instance, ['pixel-battle', 'copy-cat'])).toBe(true);
    });

    it('should return false when game mode does not match', () => {
      const instance = createMockInstance({ gameMode: 'pixel-battle' });

      expect(checkGameMode(instance, 'copy-cat')).toBe(false);
    });
  });

  describe('checkPhase', () => {
    it('should return true when phase matches', () => {
      const instance = createMockInstance({ phase: 'drawing' });

      expect(checkPhase(instance, 'drawing')).toBe(true);
    });

    it('should return true when phase is in array', () => {
      const instance = createMockInstance({ phase: 'voting' });

      expect(checkPhase(instance, ['drawing', 'voting'])).toBe(true);
    });

    it('should return false when phase does not match', () => {
      const instance = createMockInstance({ phase: 'lobby' });

      expect(checkPhase(instance, 'drawing')).toBe(false);
    });
  });
});
