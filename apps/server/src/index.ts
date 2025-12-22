// apps/server/src/index.ts
import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { setupSocketHandlers } from './socket.js';
import { getInstanceStats } from './instance.js';
import { setPhaseIo } from './phases.js';
import type { ServerToClientEvents, ClientToServerEvents } from './types.js';

const app = express();
const server = createServer(app);

const io = new Server<ClientToServerEvents, ServerToClientEvents>(server, {
  cors: {
    origin: process.env.NODE_ENV === 'production'
      ? false
      : ['http://localhost:5173'],
    methods: ['GET', 'POST']
  },
  pingTimeout: 20_000,
  pingInterval: 25_000,
  maxHttpBufferSize: 1024  // 1KB max payload
});

const PORT = process.env.PORT || 3000;

// Phase-Manager mit IO-Instanz verbinden
setPhaseIo(io);

// Health Check
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

// Socket-Handler registrieren
setupSocketHandlers(io);

server.listen(PORT, () => {
  console.log(`🎨 SpriteBox Server running on port ${PORT}`);
  console.log(`📡 WebSocket ready`);
  console.log(`🔗 Health check: http://localhost:${PORT}/health`);
});

export { io };
