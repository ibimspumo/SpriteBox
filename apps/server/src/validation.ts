// apps/server/src/validation.ts
import { z } from 'zod';
import { CANVAS } from './constants.js';

/**
 * Pixel-Daten Validierung
 */
export const PixelSchema = z.object({
  pixels: z
    .string()
    .length(CANVAS.TOTAL_PIXELS, `Pixels must be exactly ${CANVAS.TOTAL_PIXELS} characters`)
    .regex(/^[0-9A-Fa-f]+$/, 'Pixels must only contain hex characters (0-9, A-F)')
    .transform((s) => s.toUpperCase()),
});

/**
 * Prüft ob genug Pixel gesetzt wurden (Anti-AFK)
 */
export function validateMinPixels(pixels: string): { valid: boolean; setPixels: number } {
  let setPixels = 0;
  for (const char of pixels) {
    if (char !== CANVAS.BACKGROUND_COLOR) {
      setPixels++;
    }
  }

  return {
    valid: setPixels >= CANVAS.MIN_PIXELS_SET,
    setPixels,
  };
}

/**
 * Room-Code Validierung
 */
export const RoomCodeSchema = z.object({
  code: z
    .string()
    .length(4, 'Room code must be exactly 4 characters')
    .regex(/^[A-Z0-9]+$/i, 'Room code must only contain letters and numbers')
    .transform((s) => s.toUpperCase()),
});

/**
 * Username Validierung
 */
export const UsernameSchema = z.object({
  name: z
    .string()
    .min(1, 'Name cannot be empty')
    .max(20, 'Name must be 20 characters or less')
    .transform((s) => s.trim())
    // Einfache XSS-Prävention
    .transform((s) => s.replace(/[<>]/g, '')),
});

/**
 * Vote Validierung
 */
export const VoteSchema = z.object({
  chosenId: z.string().min(1, 'Must choose an image'),
});

/**
 * Stats Validierung
 */
export const StatsSchema = z.object({
  gamesPlayed: z.number().int().min(0),
  placements: z.object({
    1: z.number().int().min(0),
    2: z.number().int().min(0),
    3: z.number().int().min(0),
  }),
});

/**
 * Hilfsfunktion: Validiere mit Schema
 */
export function validate<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): { success: true; data: T } | { success: false; error: string } {
  const result = schema.safeParse(data);

  if (result.success) {
    return { success: true, data: result.data };
  }

  const error = result.error.errors[0]?.message || 'Validation failed';
  return { success: false, error };
}
