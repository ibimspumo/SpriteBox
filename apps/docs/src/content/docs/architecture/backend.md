---
title: Backend Architecture
description: Node.js server internals and data management
---

## Server Structure

```
apps/server/src/
├── index.ts         # Entry point, Express setup
├── socket.ts        # WebSocket setup & connection handling
├── handlers/        # Socket event handlers (refactored)
│   ├── index.ts         # Barrel exports
│   ├── types.ts         # Handler types
│   ├── session.ts       # Session management
│   ├── connection.ts    # DoS protection
│   ├── common.ts        # Shared utilities
│   ├── lobby.ts         # Join/leave handlers
│   ├── host.ts          # Host controls
│   ├── game.ts          # Core game handlers
│   └── modes/           # Mode-specific handlers
├── instance.ts      # Game instance management
├── phases.ts        # Phase state machine
├── gameModes/       # Game mode system
│   ├── index.ts         # Mode initialization
│   ├── registry.ts      # Mode registration
│   ├── types.ts         # Mode interfaces
│   ├── helpers.ts       # Shared utilities
│   └── zombiePixel/     # ZombiePixel mode
│       ├── index.ts
│       ├── gameLoop.ts
│       └── systems/     # Game subsystems
├── bots/            # Bot/debug system
│   ├── index.ts         # Barrel exports
│   ├── BotController.ts # Bot orchestration
│   ├── handlers/        # Phase handlers
│   └── drawing/         # Pattern generators
├── voting/          # Voting strategies
│   ├── index.ts         # Strategy factory
│   └── strategies/
│       ├── EloVotingStrategy.ts
│       └── NoVotingStrategy.ts
├── validation.ts    # Zod schemas
├── rateLimit.ts     # Rate limiting
└── types.ts         # TypeScript definitions
```

## Entry Point (`index.ts`)

```typescript
import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: { origin: '*' }
});

// Serve static files in production
app.use(express.static('public'));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', players: getPlayerCount() });
});

httpServer.listen(3000);
```

## In-Memory Data Structures

### Instances Map

```typescript
const instances = new Map<string, GameInstance>();

interface GameInstance {
  id: string;
  code?: string;              // Private room code
  phase: GamePhase;
  host?: string;              // Host socket ID
  players: Set<string>;       // Player socket IDs
  submissions: Map<string, Submission>;
  prompt: PromptIndices;
  timer?: NodeJS.Timeout;
}
```

### Players Map

```typescript
const players = new Map<string, Player>();

interface Player {
  id: string;
  username: string;
  instanceId?: string;
  submission?: string;        // 64-char hex string
  rating: number;             // Elo rating (default 1000)
}
```

## Rate Limiting

Protection against abuse:

| Protection | Limit |
|------------|-------|
| Global requests | 50/second |
| Drawing submissions | 5/minute |
| Votes | 3/second |
| Room creation | 3/minute |
| Connections per IP | 5 simultaneous |
| Max payload size | 1KB |

```typescript
// rateLimit.ts
const rateLimits = {
  'player-draw': { max: 5, window: 60000 },
  'player-submit-vote': { max: 3, window: 1000 },
  'create-room': { max: 3, window: 60000 }
};
```

## Validation (Zod Schemas)

All client inputs are validated:

```typescript
// validation.ts
import { z } from 'zod';

export const drawSchema = z.object({
  x: z.number().int().min(0).max(7),
  y: z.number().int().min(0).max(7),
  color: z.number().int().min(0).max(15)
});

export const voteSchema = z.object({
  choice: z.enum(['a', 'b'])
});

export const usernameSchema = z.string()
  .min(1)
  .max(20)
  .regex(/^[\w\s]+$/);
```

## Instance Lifecycle

```typescript
// instance.ts

function createInstance(isPrivate: boolean): GameInstance {
  const instance: GameInstance = {
    id: generateId(),
    code: isPrivate ? generateRoomCode() : undefined,
    phase: 'lobby',
    players: new Set(),
    submissions: new Map(),
    prompt: generatePrompt()
  };

  instances.set(instance.id, instance);
  return instance;
}

function destroyInstance(id: string) {
  const instance = instances.get(id);
  if (instance?.timer) clearTimeout(instance.timer);
  instances.delete(id);
}
```

## Pixel Art Data Format

Pixel art is stored as 64-character hex strings:

- 8×8 grid = 64 pixels
- 16 colors = 4 bits per pixel
- Each hex char represents one pixel

```typescript
// Example: Simple smiley face
const submission = "0000000000000000000F0F00000F0F0000FFFF00000000000000000000000000";

// Decode to 2D array
function decodeSubmission(hex: string): number[][] {
  const grid = [];
  for (let y = 0; y < 8; y++) {
    const row = [];
    for (let x = 0; x < 8; x++) {
      const index = y * 8 + x;
      row.push(parseInt(hex[index], 16));
    }
    grid.push(row);
  }
  return grid;
}
```

## Health Check Endpoint

```
GET /health
```

Returns server status for load balancers:

```json
{
  "status": "ok",
  "memory": {
    "heapUsedMB": 45,
    "heapTotalMB": 120,
    "status": "ok"
  },
  "players": {
    "current": 847,
    "max": 10000,
    "queued": 0
  },
  "instances": {
    "active": 12,
    "public": 9,
    "private": 3
  }
}
```
