// apps/server/src/index.ts
import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { setupSocketHandlers } from './socket.js';
import { getInstanceStats, startCleanupInterval } from './instance.js';
import { setPhaseIo } from './phases.js';
import { startMonitoring } from './monitoring.js';
import { setupDebugEndpoints } from './debug.js';
import { initServerConfig, getServerConfig, getMemoryInfo } from './serverConfig.js';
import { startQueueProcessing, getQueueStats } from './queue.js';
import { generateOgImage } from './ogImage.js';
import { initializeGameModes } from './gameModes/index.js';
import type { ServerToClientEvents, ClientToServerEvents } from './types.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const isProduction = process.env.NODE_ENV === 'production';

const app = express();
const server = createServer(app);

const io = new Server<ClientToServerEvents, ServerToClientEvents>(server, {
  cors: isProduction
    ? { origin: false }  // No CORS needed for same-origin
    : { origin: ['http://localhost:5173'], methods: ['GET', 'POST'] },
  pingTimeout: 20_000,
  pingInterval: 25_000,
  maxHttpBufferSize: 1024  // 1KB max payload
});

const PORT = process.env.PORT || 3000;

// Connect phase manager with IO instance
setPhaseIo(io);

// Debug-Endpoints (nur in Development)
setupDebugEndpoints(app, io);

// Initialize server configuration (RAM detection)
initServerConfig();

// Initialize game modes (must be before socket handlers)
initializeGameModes();

// Note: User data (username, stats) is stored client-side in localStorage
// Server just accepts client-provided data on restore-user event

// Health Check (muss vor SPA Fallback kommen)
app.get('/health', (_req, res) => {
  const instanceStats = getInstanceStats();
  const memoryInfo = getMemoryInfo();
  const serverConfig = getServerConfig();
  const queueStats = getQueueStats();

  res.json({
    status: memoryInfo.status === 'ok' ? 'healthy' : memoryInfo.status,
    connections: io.engine.clientsCount,
    instances: instanceStats,
    uptime: process.uptime(),
    memory: {
      heapUsedMB: memoryInfo.heapUsedMB,
      heapTotalMB: memoryInfo.heapTotalMB,
      maxMB: memoryInfo.maxMB,
      usagePercent: memoryInfo.usagePercent,
      status: memoryInfo.status,
    },
    server: {
      maxPlayers: serverConfig.maxPlayers,
      warningThreshold: serverConfig.warningThreshold,
      criticalThreshold: serverConfig.criticalThreshold,
    },
    queue: queueStats,
    timestamp: Date.now(),
  });
});

// OG Image endpoint for social media sharing
app.get('/og-image.png', async (_req, res) => {
  try {
    const imageBuffer = await generateOgImage();
    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Cache-Control', 'public, max-age=86400'); // Cache for 24 hours
    res.send(imageBuffer);
  } catch (error) {
    console.error('Failed to generate OG image:', error);
    res.status(500).send('Failed to generate image');
  }
});

// In Production: Statische Dateien servieren
if (isProduction) {
  const publicPath = join(__dirname, 'public');
  app.use(express.static(publicPath));

  // SPA fallback for all other routes (Express 5 syntax)
  app.use((_req, res) => {
    res.sendFile(join(publicPath, 'index.html'));
  });
}

// Register socket handlers
setupSocketHandlers(io);

// Periodischen Cleanup starten
startCleanupInterval();

// Start queue processing
startQueueProcessing();

// Monitoring starten (Logs, Error-Handling)
startMonitoring();

server.listen(PORT, () => {
  console.log(`🎨 SpriteBox running on port ${PORT}`);
  console.log(`📡 Mode: ${isProduction ? 'Production' : 'Development'}`);
  console.log(`💾 User data: client-side localStorage`);
  if (!isProduction) {
    console.log(`🔗 Health check: http://localhost:${PORT}/health`);
  }
});

// Graceful shutdown
function gracefulShutdown(signal: string): void {
  console.log(`\n${signal} received. Shutting down...`);
  process.exit(0);
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

export { io };
