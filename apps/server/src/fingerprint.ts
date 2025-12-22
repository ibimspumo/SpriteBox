// apps/server/src/fingerprint.ts
import type { Socket } from 'socket.io';
import { log } from './utils.js';

// IP -> Socket IDs
const ipToSockets = new Map<string, Set<string>>();

// Max Sessions pro IP
const MAX_SESSIONS_PER_IP = 3;

/**
 * Checks for multi-account based on IP
 */
export function checkMultiAccount(socket: Socket): { allowed: boolean; warning: boolean } {
  const ip = socket.data.ip || socket.handshake.address;

  let sockets = ipToSockets.get(ip);
  if (!sockets) {
    sockets = new Set();
    ipToSockets.set(ip, sockets);
  }

  // Already registered?
  if (sockets.has(socket.id)) {
    return { allowed: true, warning: false };
  }

  // Limit reached?
  if (sockets.size >= MAX_SESSIONS_PER_IP) {
    log('MultiAccount', `IP ${ip} has ${sockets.size} sessions, blocking new`);
    return { allowed: false, warning: false };
  }

  // Warning bei vielen Sessions
  const warning = sockets.size >= MAX_SESSIONS_PER_IP - 1;

  sockets.add(socket.id);
  return { allowed: true, warning };
}

/**
 * Removes socket on disconnect
 */
export function removeSocketFingerprint(socket: Socket): void {
  const ip = socket.data.ip || socket.handshake.address;
  const sockets = ipToSockets.get(ip);

  if (sockets) {
    sockets.delete(socket.id);
    if (sockets.size === 0) {
      ipToSockets.delete(ip);
    }
  }
}

/**
 * Returns number of sessions per IP
 */
export function getSessionCount(ip: string): number {
  return ipToSockets.get(ip)?.size ?? 0;
}

/**
 * Stats for health endpoint
 */
export function getMultiAccountStats(): { uniqueIPs: number; totalSessions: number } {
  let totalSessions = 0;
  for (const sockets of ipToSockets.values()) {
    totalSessions += sockets.size;
  }
  return { uniqueIPs: ipToSockets.size, totalSessions };
}
