// apps/server/src/utils.ts
import { nanoid } from 'nanoid';
import { randomInt } from 'crypto';

/**
 * Generiert eine einzigartige ID
 */
export function generateId(length = 16): string {
  return nanoid(length);
}

/**
 * Generiert einen 4-stelligen Raum-Code (ohne 0, O, 1, I)
 */
export function generateRoomCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 4; i++) {
    code += chars[randomInt(0, chars.length)];
  }
  return code;
}

/**
 * Generiert einen 4-stelligen Discriminator
 */
export function generateDiscriminator(): string {
  return randomInt(0, 10000).toString().padStart(4, '0');
}

/**
 * Erstellt einen vollständigen Usernamen mit Discriminator
 */
export function createFullName(displayName: string, discriminator: string): string {
  return `${displayName}#${discriminator}`;
}

/**
 * Wählt ein zufälliges Element aus einem Array
 */
export function randomItem<T>(array: T[]): T {
  return array[randomInt(0, array.length)];
}

/**
 * Mischt ein Array (Fisher-Yates Shuffle)
 */
export function shuffleArray<T>(array: T[]): T[] {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = randomInt(0, i + 1);
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

/**
 * Wartet für eine bestimmte Zeit (Promise-basiert)
 */
export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Formatiert Millisekunden in lesbare Zeit
 */
export function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ${seconds % 60}s`;
  const hours = Math.floor(minutes / 60);
  return `${hours}h ${minutes % 60}m`;
}

/**
 * Logging mit Timestamp
 */
export function log(category: string, message: string, data?: unknown): void {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] [${category}] ${message}`, data ?? '');
}
