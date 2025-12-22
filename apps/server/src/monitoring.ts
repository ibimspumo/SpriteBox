// apps/server/src/monitoring.ts
import { getInstanceStats } from './instance.js';

const STATS_INTERVAL = 5 * 60 * 1000; // 5 Minuten

export function startMonitoring(): void {
  // Periodische Stats alle 5 Minuten
  setInterval(() => {
    const stats = getInstanceStats();
    const memory = process.memoryUsage();

    console.log(JSON.stringify({
      type: 'stats',
      timestamp: new Date().toISOString(),
      instances: stats.total,
      players: stats.totalPlayers,
      heapMB: Math.round(memory.heapUsed / 1024 / 1024),
      uptime: Math.round(process.uptime()),
    }));
  }, STATS_INTERVAL);

  // Unhandled Errors loggen
  process.on('uncaughtException', (error) => {
    console.error(JSON.stringify({
      type: 'error',
      timestamp: new Date().toISOString(),
      error: error.message,
      stack: error.stack,
    }));
    process.exit(1);
  });

  process.on('unhandledRejection', (reason) => {
    console.error(JSON.stringify({
      type: 'rejection',
      timestamp: new Date().toISOString(),
      reason: String(reason),
    }));
  });

  // Graceful Shutdown
  process.on('SIGTERM', () => {
    console.log(JSON.stringify({
      type: 'shutdown',
      timestamp: new Date().toISOString(),
      reason: 'SIGTERM received',
    }));
    process.exit(0);
  });

  process.on('SIGINT', () => {
    console.log(JSON.stringify({
      type: 'shutdown',
      timestamp: new Date().toISOString(),
      reason: 'SIGINT received',
    }));
    process.exit(0);
  });
}
