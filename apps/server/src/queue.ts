// apps/server/src/queue.ts
import type { Server } from 'socket.io';
import { log } from './utils.js';
import { getServerConfig, canAcceptNewPlayer, checkMemoryStatus } from './serverConfig.js';
import { getInstanceStats } from './instance.js';

// Queue entry
interface QueueEntry {
  socketId: string;
  joinedAt: number;
  position: number;
}

// Queue state
const queue: Map<string, QueueEntry> = new Map();
let ioInstance: Server | null = null;

// === Queue Configuration ===
const QUEUE_CONFIG = {
  TIMEOUT_MS: 5 * 60 * 1000, // 5 minutes max wait
  UPDATE_INTERVAL_MS: 5_000, // Update positions every 5s
  ESTIMATED_WAIT_PER_PLAYER_MS: 30_000, // 30s estimated wait per player ahead
} as const;

/**
 * Sets the Socket.io server instance for queue notifications
 */
export function setQueueIo(io: Server): void {
  ioInstance = io;
}

/**
 * Checks if a player should be queued instead of joining directly
 */
export function shouldQueue(): boolean {
  const stats = getInstanceStats();
  const memStatus = checkMemoryStatus();

  // Queue if memory is critical or warning
  if (memStatus === 'critical' || memStatus === 'warning') {
    return true;
  }

  // Queue if we can't accept new players
  if (!canAcceptNewPlayer(stats.totalPlayers)) {
    return true;
  }

  return false;
}

/**
 * Adds a player to the queue
 */
export function addToQueue(socketId: string): { position: number; estimatedWait: number } {
  const position = queue.size + 1;
  const estimatedWait = position * QUEUE_CONFIG.ESTIMATED_WAIT_PER_PLAYER_MS;

  queue.set(socketId, {
    socketId,
    joinedAt: Date.now(),
    position,
  });

  log('Queue', `Player ${socketId} added to queue at position ${position}`);

  return { position, estimatedWait };
}

/**
 * Removes a player from the queue
 */
export function removeFromQueue(socketId: string, reason: 'timeout' | 'disconnect' | 'manual' = 'manual'): void {
  const entry = queue.get(socketId);
  if (!entry) return;

  queue.delete(socketId);

  // Update positions for remaining players
  updateQueuePositions();

  // Notify the removed player
  if (ioInstance && reason !== 'disconnect') {
    ioInstance.to(socketId).emit('queue-removed', { reason });
  }

  log('Queue', `Player ${socketId} removed from queue (${reason})`);
}

/**
 * Checks if a player is in the queue
 */
export function isInQueue(socketId: string): boolean {
  return queue.has(socketId);
}

/**
 * Gets queue position for a player
 */
export function getQueuePosition(socketId: string): number | undefined {
  return queue.get(socketId)?.position;
}

/**
 * Updates queue positions and notifies players
 */
function updateQueuePositions(): void {
  let position = 1;

  for (const [socketId, entry] of queue) {
    entry.position = position;

    if (ioInstance) {
      const estimatedWait = position * QUEUE_CONFIG.ESTIMATED_WAIT_PER_PLAYER_MS;
      ioInstance.to(socketId).emit('queue-update', { position, estimatedWait });
    }

    position++;
  }
}

/**
 * Processes the queue - lets players in when space is available
 */
export function processQueue(): { ready: string[]; stillQueued: number } {
  const ready: string[] = [];
  const now = Date.now();

  for (const [socketId, entry] of queue) {
    // Check for timeout
    if (now - entry.joinedAt > QUEUE_CONFIG.TIMEOUT_MS) {
      removeFromQueue(socketId, 'timeout');
      continue;
    }

    // Check if we can accept more players
    if (!shouldQueue()) {
      ready.push(socketId);
      queue.delete(socketId);

      // Notify player they can join
      if (ioInstance) {
        ioInstance.to(socketId).emit('queue-ready', {
          message: 'You can now join the game!'
        });
      }

      log('Queue', `Player ${socketId} ready to join from queue`);
    } else {
      // Can't accept more right now
      break;
    }
  }

  // Update positions after processing
  if (ready.length > 0) {
    updateQueuePositions();
  }

  return { ready, stillQueued: queue.size };
}

/**
 * Gets queue statistics
 */
export function getQueueStats(): {
  size: number;
  oldestWaitMs: number | null;
  averageWaitMs: number | null;
} {
  if (queue.size === 0) {
    return { size: 0, oldestWaitMs: null, averageWaitMs: null };
  }

  const now = Date.now();
  let totalWait = 0;
  let oldestWait = 0;

  for (const entry of queue.values()) {
    const wait = now - entry.joinedAt;
    totalWait += wait;
    if (wait > oldestWait) {
      oldestWait = wait;
    }
  }

  return {
    size: queue.size,
    oldestWaitMs: oldestWait,
    averageWaitMs: Math.round(totalWait / queue.size),
  };
}

/**
 * Starts the queue processing interval
 */
export function startQueueProcessing(): void {
  setInterval(() => {
    if (queue.size > 0) {
      const result = processQueue();
      if (result.ready.length > 0) {
        log('Queue', `Processed queue: ${result.ready.length} ready, ${result.stillQueued} still waiting`);
      }
    }
  }, QUEUE_CONFIG.UPDATE_INTERVAL_MS);

  log('Queue', 'Queue processing started');
}

/**
 * Clears the entire queue (for shutdown/restart)
 */
export function clearQueue(): void {
  for (const socketId of queue.keys()) {
    if (ioInstance) {
      ioInstance.to(socketId).emit('queue-removed', { reason: 'manual' });
    }
  }
  queue.clear();
  log('Queue', 'Queue cleared');
}
