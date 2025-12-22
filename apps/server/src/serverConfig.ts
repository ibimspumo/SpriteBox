// apps/server/src/serverConfig.ts
import os from 'os';
import { log } from './utils.js';

// === Server Configuration ===
export interface ServerConfig {
  maxMemoryMB: number;
  maxPlayers: number;
  reservedMemoryMB: number;
  warningThreshold: number;  // 0.7 = 70%
  criticalThreshold: number; // 0.85 = 85%
}

export type MemoryStatus = 'ok' | 'warning' | 'critical';

// Calculated server config (initialized on startup)
let serverConfig: ServerConfig | null = null;

// Bytes per player (conservative estimate with buffer)
const BYTES_PER_PLAYER = 30 * 1024; // ~30 KB

/**
 * Detects and returns server configuration based on available RAM
 */
export function detectServerConfig(): ServerConfig {
  const totalMemoryMB = Math.floor(os.totalmem() / 1024 / 1024);

  // Reserve based on total memory
  const reservedMemoryMB = totalMemoryMB < 1024 ? 150 : 200;

  const availableMemoryMB = totalMemoryMB - reservedMemoryMB;

  // Calculate max players
  const maxPlayers = Math.floor((availableMemoryMB * 1024 * 1024) / BYTES_PER_PLAYER);

  const config: ServerConfig = {
    maxMemoryMB: totalMemoryMB,
    maxPlayers: Math.min(maxPlayers, 100000), // Cap at 100k
    reservedMemoryMB,
    warningThreshold: 0.7,
    criticalThreshold: 0.85,
  };

  log('Config', `Server RAM: ${totalMemoryMB}MB`);
  log('Config', `Reserved: ${reservedMemoryMB}MB`);
  log('Config', `Max Players: ${config.maxPlayers}`);

  return config;
}

/**
 * Gets the server configuration (with optional ENV overrides)
 */
export function getServerConfig(): ServerConfig {
  if (!serverConfig) {
    serverConfig = detectServerConfig();

    // ENV Overrides (optional)
    if (process.env.MAX_MEMORY_MB) {
      serverConfig.maxMemoryMB = parseInt(process.env.MAX_MEMORY_MB, 10);
    }
    if (process.env.MAX_PLAYERS) {
      serverConfig.maxPlayers = parseInt(process.env.MAX_PLAYERS, 10);
    }
  }

  return serverConfig;
}

/**
 * Checks current memory status
 */
export function checkMemoryStatus(): MemoryStatus {
  const config = getServerConfig();
  const usage = process.memoryUsage();
  const usedMB = usage.heapUsed / 1024 / 1024;
  const limitMB = config.maxMemoryMB - config.reservedMemoryMB;
  const ratio = usedMB / limitMB;

  if (ratio >= config.criticalThreshold) {
    return 'critical';
  } else if (ratio >= config.warningThreshold) {
    return 'warning';
  }
  return 'ok';
}

/**
 * Checks if the server can accept a new player
 */
export function canAcceptNewPlayer(currentPlayerCount: number): boolean {
  const memStatus = checkMemoryStatus();

  // Bei kritischem Speicher: Keine neuen Spieler
  if (memStatus === 'critical') {
    return false;
  }

  // Player-Limit prüfen
  const config = getServerConfig();
  if (currentPlayerCount >= config.maxPlayers) {
    return false;
  }

  return true;
}

/**
 * Gets detailed memory information for health endpoint
 */
export function getMemoryInfo(): {
  status: MemoryStatus;
  heapUsedMB: number;
  heapTotalMB: number;
  maxMB: number;
  usagePercent: number;
} {
  const config = getServerConfig();
  const usage = process.memoryUsage();
  const heapUsedMB = Math.round(usage.heapUsed / 1024 / 1024);
  const heapTotalMB = Math.round(usage.heapTotal / 1024 / 1024);
  const limitMB = config.maxMemoryMB - config.reservedMemoryMB;
  const usagePercent = Math.round((heapUsedMB / limitMB) * 100);

  return {
    status: checkMemoryStatus(),
    heapUsedMB,
    heapTotalMB,
    maxMB: config.maxMemoryMB,
    usagePercent,
  };
}

/**
 * Initialize server config on startup
 */
export function initServerConfig(): void {
  serverConfig = getServerConfig();
  log('Config', 'Server configuration initialized');
}
