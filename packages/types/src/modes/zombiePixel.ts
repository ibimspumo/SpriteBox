// packages/types/src/modes/zombiePixel.ts
// ZombiePixel game mode types

/**
 * Player data for ZombiePixel mode
 */
export interface ZombiePixelPlayerData {
  id: string;
  name: string;
  x: number;
  y: number;
  isZombie: boolean;
  isBot: boolean;
  hasHealingItem: boolean;
}

/**
 * Item data
 */
export interface ZombieItemData {
  id: string;
  type: string;
  x: number;
  y: number;
  icon: string;
  color: string;
}

/**
 * Active effect data
 */
export interface ZombieEffectData {
  id: string;
  type: string;
  affectedId: string;
  expiresAt: number | null;
  remainingUses: number | null;
}

/**
 * Game state event data
 */
export interface ZombieGameStateData {
  players: ZombiePixelPlayerData[];
  timeRemaining: number;
  survivorCount: number;
  zombieCount: number;
  items: ZombieItemData[];
  effects: ZombieEffectData[];
  zombieSpeedBoostActive: boolean;
  zombieSpeedBoostRemaining: number;
  playersWithHealingTouch: string[];
}

/**
 * Roles assigned event data
 */
export interface ZombieRolesAssignedData {
  yourId: string;
  yourRole: 'zombie' | 'survivor';
  yourPosition: { x: number; y: number };
  survivorCount: number;
  zombieCount: number;
}

/**
 * Infection event data
 */
export interface ZombieInfectionData {
  victimId: string;
  victimName: string;
  zombieId: string;
  zombieName: string;
  survivorsRemaining: number;
  timerExtendedBy?: number;
}

/**
 * Player healed event data
 */
export interface ZombieHealedData {
  healedId: string;
  healedName: string;
  healerId: string;
  healerName: string;
}

/**
 * Item spawned event data
 */
export interface ZombieItemSpawnedData {
  id: string;
  type: string;
  x: number;
  y: number;
  icon: string;
  color: string;
  visibility: 'zombies' | 'survivors' | 'all';
}

/**
 * Game stats
 */
export interface ZombiePixelStatsData {
  totalInfections: number;
  gameDuration: number;
  firstInfectionTime: number | null;
  mostInfections: { playerId: string; name: string; count: number } | null;
  longestSurvivor: { playerId: string; name: string; survivalTime: number } | null;
}

/**
 * Game end event data
 */
export interface ZombieGameEndData {
  winner: { id: string; name: string; isBot: boolean } | null;
  zombiesWin: boolean;
  duration: number;
  stats: ZombiePixelStatsData;
}

/**
 * Lobby update event data
 */
export interface ZombieLobbyUpdateData {
  realPlayers: number;
  botCount: number;
  totalPlayers: number;
}
