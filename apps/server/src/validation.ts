// apps/server/src/validation.ts
import { z } from 'zod';
import { CANVAS } from './constants.js';

// === Forbidden Names & XSS Patterns ===
const FORBIDDEN_NAMES = ['admin', 'moderator', 'system', 'null', 'undefined', 'bot', 'server', 'host'];
const XSS_PATTERNS = [/<script/i, /javascript:/i, /on\w+=/i, /<iframe/i, /<img/i, /data:/i];

/**
 * Escape HTML entities for safe output
 */
function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
}

/**
 * Pixel data validation
 */
export const PixelSchema = z.object({
  pixels: z
    .string()
    .length(CANVAS.TOTAL_PIXELS, `Must be exactly ${CANVAS.TOTAL_PIXELS} characters`)
    .regex(/^[0-9A-Fa-f]+$/, 'Only hex characters allowed')
    .transform((s) => s.toUpperCase()),
});

/**
 * Checks if enough pixels were set (anti-AFK)
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
 * Room code validation
 */
export const RoomCodeSchema = z.object({
  code: z
    .string()
    .length(4, 'Must be exactly 4 characters')
    .regex(/^[A-Z0-9]+$/i, 'Only letters and numbers')
    .transform((s) => s.toUpperCase()),
});

/**
 * Username validation - with strict XSS prevention
 */
export const UsernameSchema = z.object({
  name: z
    .string()
    .min(1, 'Cannot be empty')
    .max(20, 'Max 20 characters')
    .transform((s) => s.trim())
    .refine((s) => s.length > 0, 'Cannot be empty after trim')
    .refine(
      (s) => !FORBIDDEN_NAMES.includes(s.toLowerCase()),
      'This name is not allowed'
    )
    .refine(
      (s) => !XSS_PATTERNS.some((p) => p.test(s)),
      'Invalid characters'
    )
    // Escape HTML entities for safe output
    .transform(escapeHtml),
});

/**
 * Vote validation
 */
export const VoteSchema = z.object({
  chosenId: z
    .string()
    .min(1, 'Must choose an image')
    .max(50, 'Invalid ID'),
});

/**
 * Finale vote validation
 */
export const FinaleVoteSchema = z.object({
  playerId: z
    .string()
    .min(1, 'Must choose a finalist')
    .max(50, 'Invalid ID'),
});

/**
 * Stats validation - with limits against manipulation
 */
export const StatsSchema = z.object({
  gamesPlayed: z.number().int().min(0).max(1_000_000),
  placements: z.object({
    1: z.number().int().min(0).max(100_000),
    2: z.number().int().min(0).max(100_000),
    3: z.number().int().min(0).max(100_000),
  }),
});

/**
 * CopyCat rematch vote validation
 */
export const CopyCatRematchVoteSchema = z.object({
  wantsRematch: z.boolean(),
});

/**
 * PixelGuesser drawing update validation
 */
export const PixelGuesserDrawSchema = z.object({
  pixels: z
    .string()
    .min(1, 'Cannot be empty')
    .max(CANVAS.TOTAL_PIXELS, `Max ${CANVAS.TOTAL_PIXELS} characters`)
    .regex(/^[0-9A-Fa-f]+$/, 'Only hex characters allowed')
    .transform((s) => s.toUpperCase()),
});

/**
 * PixelGuesser guess validation
 */
export const PixelGuesserGuessSchema = z.object({
  guess: z
    .string()
    .min(1, 'Cannot be empty')
    .max(50, 'Max 50 characters')
    .transform((s) => s.trim())
    .refine((s) => s.length > 0, 'Cannot be empty after trim')
    .refine(
      (s) => !XSS_PATTERNS.some((p) => p.test(s)),
      'Invalid characters'
    )
    .transform(escapeHtml),
});

/**
 * Helper function: Validate with schema
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
