// packages/types/src/modes/idle-pixel/prestige.ts
// Prestige system types for Idle Pixel

import type { UpgradeEffectType } from './upgrades.js';
import { BALANCE } from './balance.js';

/**
 * Gekauftes Prestige-Upgrade
 */
export interface PurchasedPrestigeUpgrade {
  upgradeId: string;
  level: number;
}

/**
 * Prestige-Zustand
 */
export interface PrestigeState {
  /** Anzahl durchgeführter Prestiges */
  prestigeCount: number;
  /** Prestige-Währung ("Prisma-Pixel") */
  prismaPixels: number;
  /** Gesamt verdiente Prisma-Pixel (all-time) */
  totalPrismaEarned: number;
  /** Gekaufte Prestige-Upgrades */
  prestigeUpgrades: PurchasedPrestigeUpgrade[];
  /** Höchstes jemals erreichtes Pixel-Level (persistiert über Prestiges) */
  lifetimeHighestColorLevel: number;
}

/**
 * Prestige-Upgrade-Definition
 */
export interface PrestigeUpgradeDefinition {
  id: string;
  nameKey: string;
  descriptionKey: string;
  /** Kosten in Prisma-Pixeln */
  prismaCost: number;
  /** Effekt (ähnlich zu normalen Upgrades) */
  effectType: UpgradeEffectType;
  effectValue: number;
  maxLevel: number;
  icon: string;
}

/**
 * Prestige-Berechnung
 *
 * Formel: prismaPixels = floor(sqrt(totalEarned / PRESTIGE_DIVISOR))
 *
 * Beispiele (mit PRESTIGE_DIVISOR = 100_000_000):
 * - 100M Währung = 1 Prisma
 * - 400M Währung = 2 Prisma
 * - 900M Währung = 3 Prisma
 */
export const calculatePrestigeGain = (totalEarned: number): number => {
  return Math.floor(Math.sqrt(totalEarned / BALANCE.PRESTIGE_DIVISOR));
};

/**
 * Berechnet wie viel Währung für eine bestimmte Prisma-Anzahl benötigt wird
 */
export const currencyForPrisma = (prismaCount: number): number => {
  return prismaCount * prismaCount * BALANCE.PRESTIGE_DIVISOR;
};

/**
 * Erstellt den initialen Prestige-Zustand
 */
export const createInitialPrestigeState = (): PrestigeState => ({
  prestigeCount: 0,
  prismaPixels: 0,
  totalPrismaEarned: 0,
  prestigeUpgrades: [],
  lifetimeHighestColorLevel: 0,
});
