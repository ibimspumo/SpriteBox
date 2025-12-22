// apps/server/src/fingerprint.ts
import type { Socket } from 'socket.io';
import { log } from './utils.js';

// IP -> Socket IDs
const ipToSockets = new Map<string, Set<string>>();

// Instance -> IP -> Socket ID (tracks which IPs are in which instances)
const instanceIpMap = new Map<string, Map<string, string>>();

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

/**
 * Checks if an IP is already in a specific instance
 */
export function isIpInInstance(ip: string, instanceId: string): boolean {
  const instanceMap = instanceIpMap.get(instanceId);
  return instanceMap?.has(ip) ?? false;
}

/**
 * Tracks an IP joining an instance
 */
export function trackIpInInstance(ip: string, instanceId: string, socketId: string): void {
  let instanceMap = instanceIpMap.get(instanceId);
  if (!instanceMap) {
    instanceMap = new Map();
    instanceIpMap.set(instanceId, instanceMap);
  }
  instanceMap.set(ip, socketId);
  log('MultiAccount', `IP ${ip} tracked in instance ${instanceId}`);
}

/**
 * Removes IP tracking when leaving an instance
 */
export function untrackIpFromInstance(ip: string, instanceId: string): void {
  const instanceMap = instanceIpMap.get(instanceId);
  if (instanceMap) {
    instanceMap.delete(ip);
    if (instanceMap.size === 0) {
      instanceIpMap.delete(instanceId);
    }
  }
}

/**
 * Cleans up all IP tracking for an instance (when instance is deleted)
 */
export function cleanupInstanceIpTracking(instanceId: string): void {
  instanceIpMap.delete(instanceId);
}
