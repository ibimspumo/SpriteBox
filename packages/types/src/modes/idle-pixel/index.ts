// packages/types/src/modes/idle-pixel/index.ts
// Barrel export for Idle Pixel types

// === Core Types ===
export type {
  IdlePixel,
  GridSlot,
  ClickerState,
  IdlePixelStats,
  IdlePixelGameState,
} from './core.js';

export {
  IDLE_PIXEL_COLORS,
  MAX_COLOR_LEVEL,
  getProductionForLevel,
} from './core.js';

// === Upgrade Types ===
export type {
  UpgradeCategory,
  UpgradeEffectType,
  UpgradeDefinition,
  PurchasedUpgrade,
  CalculatedUpgradeEffect,
} from './upgrades.js';

export { calculateUpgradeCost, calculateUpgradeEffect } from './upgrades.js';

// === Grid Types ===
export type {
  GridPosition,
  GridConfig,
  SlotPurchaseOption,
} from './grid.js';

export {
  GridUtils,
  GRID_START_POSITIONS,
  GRID_SIZE,
  GRID_TOTAL_SLOTS,
} from './grid.js';

// === Prestige Types ===
export type {
  PurchasedPrestigeUpgrade,
  PrestigeState,
  PrestigeUpgradeDefinition,
} from './prestige.js';

export {
  calculatePrestigeGain,
  currencyForPrisma,
  createInitialPrestigeState,
} from './prestige.js';

// === Storage Types ===
export type { IdlePixelSaveData } from './storage.js';

export {
  IDLE_PIXEL_STORAGE_KEY,
  IDLE_PIXEL_SAVE_VERSION,
  MAX_OFFLINE_SECONDS,
  AUTO_SAVE_INTERVAL,
  OFFLINE_PRODUCTION_MULTIPLIER,
} from './storage.js';

// === Balance Constants ===
export {
  BALANCE,
  calculateSlotCost,
  getProductionForLevel as getProductionForLevelFromBalance,
  calculatePixelCost,
  calculatePrestigeGain as calculatePrestigeGainFromBalance,
  currencyForPrisma as currencyForPrismaFromBalance,
  calculateUpgradeCostFromBalance,
  calculatePrestigeUpgradeCost,
} from './balance.js';
export type { BalanceConfig } from './balance.js';

// === Validation Schemas ===
export {
  IdlePixelSchema,
  GridSlotSchema,
  ClickerStateSchema,
  IdlePixelStatsSchema,
  PurchasedUpgradeSchema,
  PurchasedPrestigeUpgradeSchema,
  PrestigeStateSchema,
  IdlePixelGameStateSchema,
  IdlePixelSaveDataSchema,
} from './validation.js';

export type {
  IdlePixelSchemaType,
  GridSlotSchemaType,
  ClickerStateSchemaType,
  IdlePixelStatsSchemaType,
  IdlePixelGameStateSchemaType,
  IdlePixelSaveDataSchemaType,
} from './validation.js';
