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
import type { ServerToClientEvents, ClientToServerEvents } from './types.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const isProduction = process.env.NODE_ENV === 'production';

const app = express();
const server = createServer(app);

const io = new Server<ClientToServerEvents, ServerToClientEvents>(server, {
  cors: isProduction
    ? { origin: false }  // Kein CORS nötig wenn same-origin
    : { origin: ['http://localhost:5173'], methods: ['GET', 'POST'] },
  pingTimeout: 20_000,
  pingInterval: 25_000,
  maxHttpBufferSize: 1024  // 1KB max payload
});

const PORT = process.env.PORT || 3000;

// Phase-Manager mit IO-Instanz verbinden
setPhaseIo(io);

// Health Check (muss vor SPA Fallback kommen)
app.get('/health', (_req, res) => {
  const instanceStats = getInstanceStats();

  res.json({
    status: 'healthy',
    connections: io.engine.clientsCount,
    instances: instanceStats,
    uptime: process.uptime(),
    memory: {
      heapUsed: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
      heapTotal: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
    },
    timestamp: Date.now(),
  });
});

// In Production: Statische Dateien servieren
if (isProduction) {
  const publicPath = join(__dirname, 'public');
  app.use(express.static(publicPath));

  // SPA Fallback für alle anderen Routen (Express 5 Syntax)
  app.use((_req, res) => {
    res.sendFile(join(publicPath, 'index.html'));
  });
}

// Socket-Handler registrieren
setupSocketHandlers(io);

// Periodischen Cleanup starten
startCleanupInterval();

// Monitoring starten (Logs, Error-Handling)
startMonitoring();

server.listen(PORT, () => {
  console.log(`🎨 SpriteBox running on port ${PORT}`);
  console.log(`📡 Mode: ${isProduction ? 'Production' : 'Development'}`);
  if (!isProduction) {
    console.log(`🔗 Health check: http://localhost:${PORT}/health`);
  }
});

export { io };
