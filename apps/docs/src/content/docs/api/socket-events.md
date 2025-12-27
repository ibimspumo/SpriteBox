---
title: Socket Events
description: Complete reference of Socket.io events
---

All real-time communication uses Socket.io. Events follow the pattern: `noun-verb`.

## Client → Server Events

### Connection & Lobby

| Event | Payload | Description |
|-------|---------|-------------|
| `join-public` | `{ gameMode?: string }` | Join a public game (defaults to pixel-battle) |
| `create-room` | `{ password?: string; gameMode?: string }` | Create private room (optional password & mode) |
| `join-room` | `{ code: string; password?: string }` | Join private room by code |
| `leave-lobby` | `{}` | Leave current game |
| `leave-queue` | `{}` | Leave waiting queue |
| `view-mode` | `{ gameMode: string }` | Track viewing mode selection page |
| `leave-mode` | `{}` | Stop tracking mode page viewing |

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
| `copycat-rematch-vote` | `{ wantsRematch: boolean }` | CopyCat mode: vote for rematch |
| `pixelguesser-draw` | `{ pixels: string }` | PixelGuesser: artist sends drawing update |
| `pixelguesser-guess` | `{ guess: string }` | PixelGuesser: player submits a guess |
| `zombie-move` | `{ direction: Direction }` | ZombiePixel: move player (8 directions) |

### User Management

| Event | Payload | Description |
|-------|---------|-------------|
| `change-name` | `{ name: string }` | Change display name (1-20 chars) |
| `restore-user` | `{ displayName: string }` | Restore username from localStorage (discriminator is always new) |
| `restore-session` | `{ sessionId: string }` | Restore session after reconnect |
| `ping` | `callback` | Latency check |
| `activity-ping` | `{}` | Lightweight ping to prevent idle timeout |

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
| `lobby-timer-cancelled` | `{}` | Timer cancelled (not enough players) |
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

### CopyCat Mode Events

CopyCat is a 1v1 memory-based game mode with unique phases.

| Event | Payload | Description |
|-------|---------|-------------|
| `copycat-image` | `{ pixels: string }` | Reference image to memorize |
| `copycat-result` | See below | Round results with accuracy |
| `copycat-rematch-update` | `{ votes, declined? }` | Rematch vote status |

**`copycat-result` payload:**

```typescript
{
  yourPixels: string;
  opponentPixels: string;
  referencePixels: string;
  yourAccuracy: number;      // 0-100 percentage
  opponentAccuracy: number;
  winner: 'you' | 'opponent' | 'draw';
  player: { user: User; accuracy: number };
  opponent: { user: User; accuracy: number };
}
```

### PixelGuesser Mode Events

PixelGuesser is a Pictionary-style game where one player draws while others guess.

| Event | Payload | Description |
|-------|---------|-------------|
| `pixelguesser-round-start` | See below | New round started |
| `pixelguesser-drawing-update` | `{ pixels: string }` | Artist's canvas updated |
| `pixelguesser-guess-result` | `{ correct, guess, message? }` | Result of player's guess |
| `pixelguesser-correct-guess` | See below | Someone guessed correctly |
| `pixelguesser-reveal` | See below | Round ended, answer revealed |
| `pixelguesser-final-results` | See below | Game over, final rankings |

**`pixelguesser-round-start` payload:**

```typescript
{
  round: number;
  totalRounds: number;
  artistId: string;
  artistUser: User;
  isYouArtist: boolean;
  secretPrompt?: string;          // Only sent to artist
  secretPromptIndices?: PromptIndices;
  duration: number;
  endsAt: number;
}
```

**`pixelguesser-correct-guess` payload:**

```typescript
{
  playerId: string;
  user: User;
  points: number;
  timeMs: number;                 // How fast they guessed
  position: number;               // 1st, 2nd, 3rd...
  remainingGuessers: number;
}
```

**`pixelguesser-reveal` payload:**

```typescript
{
  secretPrompt: string;
  secretPromptIndices?: PromptIndices;
  artistId: string;
  artistUser: User;
  artistPixels: string;
  scores: PixelGuesserScoreEntry[];
  duration: number;
  endsAt: number;
}
```

**`pixelguesser-final-results` payload:**

```typescript
{
  rankings: PixelGuesserScoreEntry[];
  totalRounds: number;
  duration: number;
  endsAt: number;
}
```

### ZombiePixel Mode Events

ZombiePixel is a real-time infection game on a 32x32 grid with up to 100 players (bots fill empty slots).

| Event | Payload | Description |
|-------|---------|-------------|
| `zombie-game-state` | See below | Game state update (players, time, counts, items) |
| `zombie-roles-assigned` | See below | Initial role and position assignment |
| `zombie-infection` | `{ victimId, victimName, zombieId, zombieName, survivorsRemaining, timerExtendedBy }` | Player was infected (+1s timer) |
| `zombie-healed` | `{ healedId, healedName, healerId, healerName }` | Zombie was healed back to survivor |
| `zombie-game-end` | See below | Game ended with winner/stats |
| `zombie-item-spawned` | See below | Power-up item spawned on the map |
| `zombie-item-collected` | `{ itemId, playerId, playerName, itemType, isZombie }` | Player collected an item |
| `zombie-effect-started` | See below | Effect started (speed boost, healing touch) |
| `zombie-effect-ended` | `{ effectId, type, affectedId }` | Effect expired |

**`zombie-game-state` payload:**

```typescript
{
  players: Array<{
    id: string;
    name: string;
    x: number;
    y: number;
    isZombie: boolean;
    isBot: boolean;
    hasHealingItem: boolean;
  }>;
  timeRemaining: number;
  survivorCount: number;
  zombieCount: number;
  items: ZombieItemClient[];
  effects: ZombieEffectClient[];
  zombieSpeedBoostActive: boolean;
  zombieSpeedBoostRemaining: number;
  playersWithHealingTouch: string[];
}
```

**`zombie-roles-assigned` payload:**

```typescript
{
  yourId: string;
  yourRole: 'zombie' | 'survivor';
  yourPosition: { x: number; y: number };
  zombieCount: number;
  survivorCount: number;
}
```

**`zombie-item-spawned` payload:**

```typescript
{
  id: string;
  type: string;           // 'speed-boost' | 'healing-touch'
  x: number;
  y: number;
  icon: string;
  color: string;
  visibility: 'zombies' | 'survivors' | 'all';
}
```

**`zombie-effect-started` payload:**

```typescript
{
  effectId: string;
  type: string;
  affectedId: string;     // Player ID or 'zombies'/'survivors'
  expiresAt: number | null;
  remainingUses: number | null;
  sharedEffect: boolean;
  icon: string;
  color: string;
}
```

**`zombie-game-end` payload:**

```typescript
{
  winner: { id: string; name: string; isBot: boolean } | null;
  zombiesWin: boolean;
  duration: number;
  stats: {
    totalInfections: number;
    gameDuration: number;
    firstInfectionTime: number | null;
    mostInfections: { playerId: string; name: string; count: number } | null;
    longestSurvivor: { playerId: string; name: string; survivalTime: number } | null;
  };
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
| `online-count` | `{ count, total, byMode }` | Online players (total + per mode) |

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
| `copycat-rematch-vote` | 2/10 seconds |

## Example Usage

```typescript
import { io } from 'socket.io-client';

const socket = io('wss://spritebox.de');

// Handle connection
socket.on('connected', ({ user, sessionId }) => {
  console.log('Connected as', user.fullName);
  localStorage.setItem('sessionId', sessionId);
});

// Join public game (default mode)
socket.emit('join-public', {});

// Join specific game mode
socket.emit('join-public', { gameMode: 'copy-cat' });

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
