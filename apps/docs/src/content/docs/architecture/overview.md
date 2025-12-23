---
title: Architecture Overview
description: System design and key architectural decisions
---

## High-Level Architecture

```
┌─────────────────┐         WebSocket          ┌─────────────────┐
│                 │ ◄──────────────────────►   │                 │
│  Svelte 5 App   │     (Socket.io)            │   Node.js       │
│  (Browser)      │                            │   Server        │
│                 │ ◄──────────────────────►   │                 │
└─────────────────┘      HTTP (static)         └─────────────────┘
        │                                              │
        │                                              │
        ▼                                              ▼
  Svelte Stores                                  In-Memory Maps
  (Client State)                                 (Game State)
```

## Key Design Principles

### Server-Authoritative

**All game logic runs on the server.** Clients only send inputs (draw actions, votes) and receive state updates. This prevents cheating and ensures game integrity.

The server validates:
- Phase timing (anti-bot protection)
- Minimum pixels drawn (anti-AFK)
- Vote assignments (can only vote for assigned matchups)
- Self-voting prevention

### In-Memory State

**No database.** All game data lives in JavaScript `Map` objects:

```typescript
const instances = new Map<string, Instance>();
const players = new Map<string, Player>();
const disconnectedPlayers = new Map<string, DisconnectedEntry>();
```

Games are intentionally **ephemeral** - when the server restarts, everything resets.

### Instance System

SpriteBox supports multiple concurrent game instances:

| Type | Description |
|------|-------------|
| **Public** | Auto-sharding, players assigned to open instances |
| **Private** | 4-character room codes (e.g., "A7X2"), host controls |

```typescript
interface Instance {
  id: string;
  type: 'public' | 'private';
  gameMode: string;
  code?: string;                  // Private room code
  hostId?: string;                // Host socket ID (private)
  passwordHash?: string;          // bcrypt hash (optional)
  phase: GamePhase;
  players: Map<string, Player>;
  spectators: Map<string, Player>;
  submissions: Submission[];
  votes: Vote[];
  prompt?: Prompt;
  promptIndices?: PromptIndices;  // For client localization
  lobbyTimer?: NodeJS.Timeout;
  phaseTimer?: NodeJS.Timeout;
}
```

## Data Flow

```
User Input → Socket Event → Zod Validation → Rate Limit Check → State Update → Broadcast
```

1. **User draws** a pixel → `submit-drawing` event
2. **Server validates** with Zod schema (64-char hex, min 5 pixels)
3. **Rate limiter** checks (5 submissions/minute max)
4. **Phase timing** validated (within drawing phase + grace period)
5. **Server updates** player's submission
6. **Server broadcasts** confirmation

## Type Safety

- **TypeScript** everywhere (frontend + backend)
- **Zod schemas** validate all client inputs
- **Socket.io events** are fully typed

```typescript
// Zod schema for pixel validation
const PixelSchema = z.string()
  .length(64)
  .regex(/^[0-9A-Fa-f]+$/)
  .transform(s => s.toUpperCase());

// Anti-AFK validation
function validateMinPixels(pixels: string): { valid: boolean; setPixels: number } {
  const setPixels = [...pixels].filter(c => c !== '1').length;
  return { valid: setPixels >= 5, setPixels };
}
```

## Security Features

### Anti-Cheat
- Phase timing validation with 2s grace period
- Minimum 3s draw time before submission (bot detection)
- Assignment-based voting (can only vote for assigned images)
- Self-vote prevention

### DoS Protection
- Connection rate limit: 10/IP/minute
- Global limit: 15,000 concurrent connections
- Per-IP limit: 5 concurrent connections
- Idle timeout: 5 minutes (with 4-min warning)
- Payload limit: 1KB max

### Session Security
- Timing-safe session comparison (crypto.timingSafeEqual)
- Session expiry: 24 hours max
- Reconnect grace period: 15 seconds
- Browser fingerprinting for duplicate-tab prevention

## Next Steps

- [Game Flow](/docs/en/architecture/game-flow/) - Phase state machine
- [Frontend Architecture](/docs/en/architecture/frontend/) - Component structure
- [Backend Architecture](/docs/en/architecture/backend/) - Server internals
