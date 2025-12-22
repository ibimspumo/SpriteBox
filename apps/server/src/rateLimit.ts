// apps/server/src/rateLimit.ts
import type { Socket } from 'socket.io';
import { RATE_LIMITS } from './constants.js';
import { log } from './utils.js';

interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
}

interface RateLimitRecord {
  requests: number[];
  blockedUntil: number;
}

class RateLimiter {
  private records = new Map<string, RateLimitRecord>();

  /**
   * Checks if a request is allowed
   */
  check(identifier: string, config: RateLimitConfig): boolean {
    const now = Date.now();
    const key = identifier;

    let record = this.records.get(key);

    // Blocked?
    if (record && record.blockedUntil > now) {
      return false;
    }

    // New record or reset after block
    if (!record || record.blockedUntil > 0) {
      record = { requests: [], blockedUntil: 0 };
      this.records.set(key, record);
    }

    // Remove old requests (outside window)
    record.requests = record.requests.filter((t) => now - t < config.windowMs);

    // Limit reached?
    if (record.requests.length >= config.maxRequests) {
      // Block for 3x window time
      record.blockedUntil = now + config.windowMs * 3;
      log('RateLimit', `Blocked: ${key}`);
      return false;
    }

    // Request tracken
    record.requests.push(now);
    return true;
  }

  /**
   * Cleanup old entries (call every 5 minutes)
   */
  cleanup(): void {
    const now = Date.now();
    const maxAge = 5 * 60 * 1000; // 5 Minuten

    for (const [key, record] of this.records) {
      const oldestRequest = record.requests.length > 0 ? Math.min(...record.requests) : now;
      if (now - oldestRequest > maxAge && record.blockedUntil < now) {
        this.records.delete(key);
      }
    }
  }

  /**
   * Stats for monitoring
   */
  getStats(): { activeRecords: number; blockedCount: number } {
    const now = Date.now();
    let blockedCount = 0;
    for (const record of this.records.values()) {
      if (record.blockedUntil > now) {
        blockedCount++;
      }
    }
    return { activeRecords: this.records.size, blockedCount };
  }
}

const rateLimiter = new RateLimiter();

// Cleanup every 5 minutes
setInterval(() => rateLimiter.cleanup(), 5 * 60 * 1000);

/**
 * Rate limit check for socket events
 */
export function checkRateLimit(socket: Socket, event: string): boolean {
  // Convert event name to config key (e.g. "submit-drawing" -> "SUBMIT")
  const eventKey = event.toUpperCase().replace(/-/g, '_').split('_')[0];
  const config = (RATE_LIMITS as Record<string, RateLimitConfig>)[eventKey] || RATE_LIMITS.GLOBAL;
  const identifier = `${socket.id}:${event}`;

  if (!rateLimiter.check(identifier, config)) {
    socket.emit('error', {
      code: 'RATE_LIMITED',
      message: 'Too many requests. Please slow down.',
      retryAfter: config.windowMs,
    });
    return false;
  }

  return true;
}

/**
 * IP-based rate limiting for connections
 */
const connectionAttempts = new Map<string, { count: number; resetAt: number }>();

export function checkConnectionRateLimit(ip: string): boolean {
  const now = Date.now();
  const windowMs = 60_000; // 1 Minute
  const maxAttempts = 10;

  let record = connectionAttempts.get(ip);

  if (!record || record.resetAt < now) {
    record = { count: 0, resetAt: now + windowMs };
    connectionAttempts.set(ip, record);
  }

  record.count++;

  if (record.count > maxAttempts) {
    log('RateLimit', `Connection blocked for IP: ${ip}`);
    return false;
  }

  return true;
}

// Cleanup connection attempts alle 5 Minuten
setInterval(() => {
  const now = Date.now();
  for (const [ip, record] of connectionAttempts) {
    if (record.resetAt < now) {
      connectionAttempts.delete(ip);
    }
  }
}, 5 * 60 * 1000);

/**
 * Get rate limiter stats for health endpoint
 */
export function getRateLimiterStats(): { activeRecords: number; blockedCount: number } {
  return rateLimiter.getStats();
}
