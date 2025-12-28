// packages/types/src/modes/idle-pixel/validation.ts
// Zod validation schemas for Idle Pixel

import { z } from 'zod';

/**
 * Schema für einen einzelnen Pixel
 */
export const IdlePixelSchema = z.object({
  id: z.string(),
  colorLevel: z.number().int().min(0).max(14),
  position: z.number().int().min(0).max(63),
  baseProduction: z.number().positive(),
});

/**
 * Schema für einen Grid-Slot
 */
export const GridSlotSchema = z.object({
  position: z.number().int().min(0).max(63),
  unlocked: z.boolean(),
  pixel: IdlePixelSchema.nullable(),
});

/**
 * Schema für den Clicker-Zustand
 */
export const ClickerStateSchema = z.object({
  energyBarCurrent: z.number().min(0),
  energyBarMax: z.number().positive(),
  goldenPixelNextSpawn: z.number(),
  goldenPixelActive: z.boolean(),
  goldenPixelTimeLeft: z.number().min(0),
});

/**
 * Schema für Spielstatistiken
 */
export const IdlePixelStatsSchema = z.object({
  totalEarned: z.number().min(0),
  pixelsPurchased: z.number().int().min(0),
  mergesPerformed: z.number().int().min(0),
  highestColorLevel: z.number().int().min(0).max(14),
  totalClicks: z.number().int().min(0),
  playTime: z.number().min(0),
});

/**
 * Schema für gekaufte Upgrades
 */
export const PurchasedUpgradeSchema = z.object({
  upgradeId: z.string(),
  level: z.number().int().min(0),
  lastPurchased: z.number(),
});

/**
 * Schema für gekaufte Prestige-Upgrades
 */
export const PurchasedPrestigeUpgradeSchema = z.object({
  upgradeId: z.string(),
  level: z.number().int().min(0),
});

/**
 * Schema für den Prestige-Zustand
 */
export const PrestigeStateSchema = z.object({
  prestigeCount: z.number().int().min(0),
  prismaPixels: z.number().min(0),
  totalPrismaEarned: z.number().min(0),
  prestigeUpgrades: z.array(PurchasedPrestigeUpgradeSchema),
  // Optional für Migration alter Saves, default 0
  lifetimeHighestColorLevel: z.number().int().min(0).max(14).optional().default(0),
});

/**
 * Schema für den gesamten Spielzustand
 */
export const IdlePixelGameStateSchema = z.object({
  currency: z.number().min(0),
  grid: z.array(GridSlotSchema).length(64),
  upgrades: z.array(PurchasedUpgradeSchema),
  stats: IdlePixelStatsSchema,
  clicker: ClickerStateSchema,
  prestige: PrestigeStateSchema,
  lastSaved: z.number(),
  lastTick: z.number(),
});

/**
 * Schema für gespeicherte Spielstände
 */
export const IdlePixelSaveDataSchema = z.object({
  version: z.number().int().positive(),
  state: IdlePixelGameStateSchema,
  checksum: z.string(),
});

// Inferred Types from Schemas
export type IdlePixelSchemaType = z.infer<typeof IdlePixelSchema>;
export type GridSlotSchemaType = z.infer<typeof GridSlotSchema>;
export type ClickerStateSchemaType = z.infer<typeof ClickerStateSchema>;
export type IdlePixelStatsSchemaType = z.infer<typeof IdlePixelStatsSchema>;
export type IdlePixelGameStateSchemaType = z.infer<
  typeof IdlePixelGameStateSchema
>;
export type IdlePixelSaveDataSchemaType = z.infer<typeof IdlePixelSaveDataSchema>;
