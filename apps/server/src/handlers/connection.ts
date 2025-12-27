// apps/server/src/handlers/connection.ts
// Connection management and DoS protection

import type { TypedSocket, TypedServer } from './types.js';
import { DOS } from '../constants.js';
import { checkConnectionRateLimit } from '../rateLimit.js';
import { checkMultiAccount } from '../fingerprint.js';

/**
 * Track connections per IP for DoS protection
 */
const connectionsPerIP = new Map<string, Set<string>>();

/**
 * Total connection count
 */
let totalConnections = 0;

/**
 * Extracts client IP from socket (supports proxies with x-forwarded-for)
 */
export function getClientIP(socket: TypedSocket): string {
  const forwarded = socket.handshake.headers['x-forwarded-for'];
  if (forwarded) {
    const ips = Array.isArray(forwarded) ? forwarded[0] : forwarded;
    return ips.split(',')[0].trim();
  }
  return socket.handshake.address;
}

/**
 * Registers a new connection for DoS tracking
 * Called when a socket connects
 */
export function registerConnection(socket: TypedSocket, ip: string): void {
  const ipConns = connectionsPerIP.get(ip) || new Set();
  ipConns.add(socket.id);
  connectionsPerIP.set(ip, ipConns);
  totalConnections++;
}

/**
 * Unregisters a connection (called on disconnect)
 */
export function unregisterConnection(socket: TypedSocket, ip: string): void {
  const ipConns = connectionsPerIP.get(ip);
  if (ipConns) {
    ipConns.delete(socket.id);
    if (ipConns.size === 0) {
      connectionsPerIP.delete(ip);
    }
  }
  totalConnections--;
}

/**
 * Gets the current total connection count
 */
export function getTotalConnections(): number {
  return totalConnections;
}

/**
 * Check if connection should be allowed
 * Returns { allowed: boolean; error?: string; warning?: boolean }
 */
export function checkConnectionAllowed(socket: TypedSocket, ip: string): {
  allowed: boolean;
  error?: string;
  warning?: boolean;
} {
  // IP rate limit (connection attempts)
  if (!checkConnectionRateLimit(ip)) {
    return { allowed: false, error: 'TOO_MANY_CONNECTIONS' };
  }

  // Global limit
  if (totalConnections >= DOS.MAX_TOTAL_CONNECTIONS) {
    return { allowed: false, error: 'SERVER_FULL' };
  }

  // Per-IP limit
  const ipConns = connectionsPerIP.get(ip) || new Set();
  if (ipConns.size >= DOS.MAX_CONNECTIONS_PER_IP) {
    return { allowed: false, error: 'TOO_MANY_CONNECTIONS' };
  }

  // Multi-account check
  socket.data.ip = ip;
  const multiCheck = checkMultiAccount(socket);
  if (!multiCheck.allowed) {
    return { allowed: false, error: 'TOO_MANY_SESSIONS' };
  }

  return { allowed: true, warning: multiCheck.warning };
}

/**
 * Setup connection middleware for Socket.io server
 */
export function setupConnectionMiddleware(io: TypedServer): void {
  io.use((socket, next) => {
    const typedSocket = socket as TypedSocket;
    const ip = getClientIP(typedSocket);

    const check = checkConnectionAllowed(typedSocket, ip);
    if (!check.allowed) {
      return next(new Error(check.error || 'CONNECTION_REJECTED'));
    }

    if (check.warning) {
      typedSocket.data.multiAccountWarning = true;
    }

    // Extract browser fingerprint from auth
    const browserId = socket.handshake.auth?.browserId as string | undefined;
    typedSocket.data.browserId = browserId || `fallback-${ip}-${socket.id}`;

    // Register connection
    registerConnection(typedSocket, ip);

    next();
  });
}
