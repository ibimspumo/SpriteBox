---
title: Socket Events
description: Complete reference of Socket.io events
---

All real-time communication uses Socket.io. Events follow the pattern: `noun-verb`.

## Client → Server Events

### Connection & Lobby

| Event | Payload | Description |
|-------|---------|-------------|
| `join-public` | `{}` | Join a public game |
| `create-room` | `{ password?: string }` | Create private room (optional password) |
| `join-room` | `{ code: string; password?: string }` | Join private room by code |
| `leave-lobby` | `{}` | Leave current game |
| `leave-queue` | `{}` | Leave waiting queue |

### Host Functions (Private Rooms)

| Event | Payload | Description |
|-------|---------|-------------|
| `host-start-game` | `{}` | Start game manually (host only) |
| `host-kick-player` | `{ playerId: string }` | Kick player from lobby |
| `host-change-password` | `{ password: string \| null }` | Set or remove room password |

### Gameplay

| Event | Payload | Description |
|-------|---------|-------------|
| `submit-drawing` | `{ pixels: string }` | Submit 64-char hex artwork |
| `vote` | `{ chosenId: string }` | Vote for image in matchup |
| `finale-vote` | `{ playerId: string }` | Vote for finalist |

### User Management

| Event | Payload | Description |
|-------|---------|-------------|
| `change-name` | `{ name: string }` | Change display name (1-20 chars) |
| `restore-user` | `{ displayName, discriminator }` | Restore user from localStorage |
| `restore-session` | `{ sessionId: string }` | Restore session after reconnect |
| `sync-stats` | `{ gamesPlayed, placements }` | Sync local stats with server |
| `ping` | `callback` | Latency check |

## Server → Client Events

### Connection & Errors

| Event | Payload | Description |
|-------|---------|-------------|
| `connected` | `{ socketId, serverTime, user, sessionId }` | Welcome event with session token |
| `error` | `{ code, message?, retryAfter? }` | Error notification |
| `idle-warning` | `{ timeLeft: number }` | Warning before idle disconnect |
| `idle-disconnect` | `{ reason: string }` | Disconnected due to inactivity |

### Lobby Events

| Event | Payload | Description |
|-------|---------|-------------|
| `lobby-joined` | See below | Successfully joined lobby |
| `room-created` | `{ code, instanceId }` | Private room created |
| `player-joined` | `{ user: User }` | New player in lobby |
| `player-left` | `{ playerId, user?, kicked? }` | Player left |
| `player-updated` | `{ playerId, user }` | Player info updated |
| `player-disconnected` | `{ playerId, user, timestamp }` | Player disconnected (grace period) |
| `player-reconnected` | `{ playerId, user, timestamp }` | Player reconnected |
| `name-changed` | `{ user: User }` | Name change confirmed |
| `left-lobby` | `{}` | Left lobby confirmed |
| `kicked` | `{ reason: string }` | You were kicked |
| `lobby-timer-started` | `{ duration, startsAt }` | Countdown to auto-start |
| `password-required` | `{ code: string }` | Password needed to join |
| `password-changed` | `{ hasPassword: boolean }` | Password updated |

**`lobby-joined` payload:**

```typescript
{
  instanceId: string;
  type: 'public' | 'private';
  code?: string;
  isHost?: boolean;
  hasPassword: boolean;
  players: User[];
  spectator: boolean;
  gameMode: string;
  phase?: GamePhase;
  prompt?: Prompt;
  timerEndsAt?: number;
  votingRound?: number;
  votingTotalRounds?: number;
}
```

### Game State Events

| Event | Payload | Description |
|-------|---------|-------------|
| `phase-changed` | See below | Phase transition |
| `submission-received` | `{ success, submissionCount }` | Drawing submitted |
| `submission-count` | `{ count, total }` | Submission progress |

**`phase-changed` payload:**

```typescript
{
  phase: GamePhase;
  prompt?: Prompt;
  promptIndices?: PromptIndices;
  duration?: number;
  startsAt?: number;
  endsAt?: number;
  message?: string;
  round?: number;
  totalRounds?: number;
}
```

### Voting Events

| Event | Payload | Description |
|-------|---------|-------------|
| `voting-round` | See below | New voting round started |
| `vote-received` | `{ success, eloChange? }` | Vote registered |
| `finale-start` | See below | Finale phase started |
| `finale-vote-received` | `{ success }` | Finale vote registered |

**`voting-round` payload:**

```typescript
{
  round: number;
  totalRounds: number;
  imageA: { playerId: string; pixels: string };
  imageB: { playerId: string; pixels: string };
  timeLimit: number;
  endsAt: number;
}
```

**`finale-start` payload:**

```typescript
{
  finalists: Array<{
    playerId: string;
    pixels: string;
    user: User;
    elo: number;
  }>;
  timeLimit: number;
  endsAt: number;
}
```

### Results & Gallery

| Event | Payload | Description |
|-------|---------|-------------|
| `game-results` | See below | Final rankings |

**`game-results` payload:**

```typescript
{
  prompt?: Prompt;
  promptIndices?: PromptIndices;
  rankings: Array<{
    place: number;
    playerId: string;
    user: User;
    pixels: string;
    finalVotes: number;
    elo: number;
  }>;
  compressedRankings?: string;  // LZ-String if 50+ players
  totalParticipants: number;
}
```

### Queue & Server Status

| Event | Payload | Description |
|-------|---------|-------------|
| `queued` | `{ position, estimatedWait }` | Added to queue |
| `queue-update` | `{ position, estimatedWait }` | Queue position changed |
| `queue-ready` | `{ message }` | Spot available |
| `queue-removed` | `{ reason }` | Removed from queue |
| `server-status` | `{ status, currentPlayers, maxPlayers }` | Server health |
| `online-count` | `{ count }` | Global online players |

### Session Events

| Event | Payload | Description |
|-------|---------|-------------|
| `session-restored` | See below | Session restored after reconnect |
| `session-restore-failed` | `{ reason }` | Restore failed |
| `instance-closing` | `{ reason }` | Game instance closing |
| `game-modes` | `{ available[], default }` | Available game modes |

## Rate Limits

| Event | Limit |
|-------|-------|
| Global | 50 requests/second per socket |
| `submit-drawing` | 5/minute |
| `vote` | 3/second |
| `create-room` | 3/minute |
| `join-room` | 5/10 seconds |
| `change-name` | 5/minute |

## Example Usage

```typescript
import { io } from 'socket.io-client';

const socket = io('wss://spritebox.de');

// Handle connection
socket.on('connected', ({ user, sessionId }) => {
  console.log('Connected as', user.fullName);
  localStorage.setItem('sessionId', sessionId);
});

// Join public game
socket.emit('join-public', {});

// Handle phase changes
socket.on('phase-changed', ({ phase, promptIndices }) => {
  if (phase === 'drawing') {
    showCanvas();
  }
});

// Submit artwork
socket.emit('submit-drawing', {
  pixels: '0000000000000000000F0F00000F0F0000FFFF0000000000000000000000000'
});

// Handle voting
socket.on('voting-round', ({ imageA, imageB }) => {
  displayMatchup(imageA, imageB);
});

socket.emit('vote', { chosenId: imageA.playerId });
```
