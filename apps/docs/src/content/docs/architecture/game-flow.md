---
title: Game Flow
description: Phase state machine and game lifecycle
---

## Game Phases

SpriteBox uses a state machine with 6 phases:

```typescript
type GamePhase = 'lobby' | 'countdown' | 'drawing' | 'voting' | 'finale' | 'results';
```

## Phase Flow Diagram

```text
  LOBBY (0-30s)               COUNTDOWN (5s)              DRAWING (30s)
  ┌─────────────┐             ┌─────────────┐             ┌─────────────┐
  │  Players    │   Auto or   │   Prompt    │             │   Draw on   │
  │  Join Room  │ ──────────► │  Revealed   │ ──────────► │   8×8 Grid  │
  │  (5-100)    │   Manual    │             │             │             │
  └─────────────┘             └─────────────┘             └─────────────┘
                                                                 │
        ┌────────────────────────────────────────────────────────┘
        │
        ▼
  VOTING (2-7 rounds)         FINALE (15s)                RESULTS (15s)
  ┌─────────────┐             ┌─────────────┐             ┌─────────────┐
  │  Pick A or  │   After     │  Top 10%    │   Final     │   Podium +  │
  │  B (5s/rd)  │ ──────────► │  Compete    │ ──────────► │   Gallery   │
  │  Elo-based  │   all rds   │             │   ranking   │             │
  └─────────────┘             └─────────────┘             └─────────────┘
        │                                                        │
        │                                                        │
        └────────────────────── Back to LOBBY ◄──────────────────┘
```

## Phase Timings

| Phase | Duration | Notes |
|-------|----------|-------|
| Lobby | Until ready | Min 5 players, auto-start after 30s timer |
| Countdown | 5 seconds | Prompt revealed |
| Drawing | 30 seconds | 8×8 pixel canvas active |
| Voting | 5 sec × rounds | 2-7 rounds based on player count |
| Finale | 15 seconds | Top 10% compete |
| Results | 15 seconds | Rankings displayed |

## Phase Details

### 1. Lobby

Players join and wait for minimum player count.

**Triggers for game start:**

| Trigger | Condition |
|---------|-----------|
| Auto-start | 5+ players in public lobby, 30s timer |
| Manual start | Host clicks start (private rooms only) |
| Instant start | 100 players (capacity reached) |

**Private rooms:** Host must manually start, no auto-timer.

### 2. Countdown (5 seconds)

- Prompt indices generated on server
- Prompt revealed to all players
- Players prepare to draw

**Prompt generation:**

```typescript
// ~70% have prefix, ~50% have suffix, subject always present
{
  prefixIdx: 5,      // "blue" or null
  subjectIdx: 20,    // "pizza" (always)
  suffixIdx: null    // "on fire" or null
}
```

### 3. Drawing (30 seconds)

- 8×8 pixel canvas active
- 16-color palette available
- Real-time submission to server

**Validation requirements:**

- Minimum 5 non-background pixels (anti-AFK)
- Minimum 3 seconds draw time (anti-bot)
- 64-character hex string format

**After timer:** Players without submission become spectators.

### 4. Voting (2-7 rounds × 5 seconds each)

- Elo-based pairing algorithm
- Two artworks shown per round
- Players vote A or B
- Ratings updated after each vote

**Round calculation:**

```typescript
// Based on player count
1-10 players:   3 rounds
11-20 players:  4 rounds
21-30 players:  5 rounds
31-50 players:  6 rounds
50+ players:    7 rounds
```

**Early ending:** If all players vote before timer, round ends immediately.

### 5. Finale (15 seconds)

Top performers compete for final ranking.

**Finalist selection:**

```typescript
finalistCount = ceil(playerCount × 0.10)  // Top 10%
finalistCount = min(10, max(3, finalistCount))
```

- All players (including spectators) can vote
- Each finalist receives vote count
- Early end if all votes received

### 6. Results (15 seconds)

- Podium: Top 3 displayed prominently
- Gallery: All artworks with rankings
- Statistics: Elo scores, vote counts

**After results:**

- Spectators return to active players
- Submissions/votes cleared
- New round starts in lobby

## Elo Voting System

Instead of simple upvotes, SpriteBox uses chess-style Elo ratings.

### How it works

- Every artwork starts at **1000 Elo**
- Each vote is a **1v1 match** between two artworks
- Winner gains points, loser loses points
- Amount depends on rating difference

### Elo Formula

```typescript
// Expected win probability
expected = 1 / (1 + 10^((loserElo - winnerElo) / 400))

// Rating change (K-factor = 32)
winnerChange = 32 × (1 - expected)
loserChange = -winnerChange
```

### Example

- Player A: 1000 Elo vs Player B: 1100 Elo
- If A wins (upset): A +21, B -21
- If B wins (expected): B +10, A -10

### Fairness Guarantees

- Each image shown approximately equal times
- No image faces the same opponent twice
- Fairness validation: `max_shows - min_shows ≤ 2`

## Anti-Cheat Mechanisms

### Phase Timing Validation

```typescript
function isWithinPhaseTime(instanceId: string, gracePeriodMs = 2000): boolean {
  return now <= phaseEndsAt + gracePeriodMs;
}
```

All submissions validated against phase timing.

### Drawing Phase

- Minimum 3 seconds before submission allowed
- Minimum 5 non-background pixels required
- 64-char hex format validated

### Voting Phase

- Can only vote for assigned matchup images
- Cannot vote for own submission
- One vote per round enforced
