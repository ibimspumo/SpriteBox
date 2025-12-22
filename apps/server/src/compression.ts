// apps/server/src/compression.ts
import LZString from 'lz-string';
import { COMPRESSION } from './constants.js';

/**
 * Compresses data if player count exceeds threshold
 */
export function compressIfNeeded<T>(
  data: T,
  playerCount: number
): { compressed: boolean; data: string | T } {
  if (playerCount < COMPRESSION.THRESHOLD_PLAYERS) {
    return { compressed: false, data };
  }

  const json = JSON.stringify(data);
  const compressed = LZString.compressToUTF16(json);

  return { compressed: true, data: compressed };
}

/**
 * Decompresses data
 */
export function decompress<T>(data: string): T {
  const json = LZString.decompressFromUTF16(data);
  if (!json) {
    throw new Error('Failed to decompress data');
  }
  return JSON.parse(json) as T;
}

/**
 * Compresses a batch of images for voting
 */
export function compressVotingBatch<T>(batch: T[], batchSize: number): { compressed: boolean; data: string | T[] } {
  // Only compress if batch is large enough
  if (batchSize <= 5) {
    return { compressed: false, data: batch };
  }

  const json = JSON.stringify(batch);
  const compressed = LZString.compressToUTF16(json);

  return { compressed: true, data: compressed };
}
