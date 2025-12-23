---
title: Game Flow
description: Phase state machine and game lifecycle
---

## Game Modes

SpriteBox supports multiple game modes, each with its own phase flow:

| Mode | Description | Player Count |
|------|-------------|--------------|
| `pixel-battle` | Classic mode: draw prompts, vote on artwork | 5-100 |
| `copy-cat` | Memory mode: recreate a reference image | 2 (1v1) |
| `pixel-guesser` | Pictionary mode: one draws, others guess | 2-20 |
| `pixel-survivor` | Roguelike survival: draw to survive 30 days | 1 (solo) |

## Game Phases (Pixel Battle)

The classic Pixel Battle mode uses a state machine with 6 phases:

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

## CopyCat Mode

CopyCat is a 1v1 memory-based game mode with a different phase flow.

### Phase Flow

```text
  LOBBY                    COUNTDOWN (5s)           MEMORIZE (5s)
  ┌─────────────┐          ┌─────────────┐          ┌─────────────┐
  │  2 Players  │  Auto    │   Get       │          │  Reference  │
  │  Join Room  │ ───────► │   Ready     │ ───────► │  Image      │
  │  (1v1)      │  start   │             │          │  Shown      │
  └─────────────┘          └─────────────┘          └─────────────┘
                                                           │
       ┌───────────────────────────────────────────────────┘
       │
       ▼
  DRAWING (30s)            RESULT (10s)             REMATCH?
  ┌─────────────┐          ┌─────────────┐          ┌─────────────┐
  │  Draw from  │          │  Compare    │   Vote   │  Both vote  │
  │  Memory     │ ───────► │  Accuracy   │ ───────► │  for new    │
  │             │          │  Winner     │          │  round      │
  └─────────────┘          └─────────────┘          └─────────────┘
```

### CopyCat Phases

| Phase | Duration | Description |
|-------|----------|-------------|
| Lobby | Until 2 players | Instant start when 2nd player joins |
| Countdown | 5 seconds | Players prepare |
| Memorize | 5 seconds | Reference image shown |
| Drawing | 30 seconds | Recreate from memory |
| Result | 10 seconds | Accuracy comparison |
| Rematch | 15 seconds | Optional: vote for new round |

### Accuracy Calculation

```typescript
accuracy = (matchingPixels / totalPixels) × 100
// Higher accuracy wins
// Tie: faster submission wins
```

## Pixel Guesser Mode

Pixel Guesser is a Pictionary-style game where one player draws while others guess.

### Pixel Guesser Phase Flow

```text
  LOBBY                    COUNTDOWN (3s)           GUESSING (45s)
  ┌─────────────┐          ┌─────────────┐          ┌─────────────┐
  │  2-20       │  Auto    │   Next      │          │  Artist     │
  │  Players    │ ───────► │   Round     │ ───────► │  Draws Live │
  │  Join       │  start   │   Starts    │          │  Others Guess│
  └─────────────┘          └─────────────┘          └─────────────┘
                                                           │
       ┌───────────────────────────────────────────────────┘
       │
       ▼
  REVEAL (5s)              NEXT ROUND?              RESULTS (15s)
  ┌─────────────┐          ┌─────────────┐          ┌─────────────┐
  │  Correct    │   More   │  Back to    │   Game   │  Final      │
  │  Answer +   │ ───────► │  Countdown  │ ───────► │  Rankings   │
  │  Scores     │  rounds  │             │   over   │             │
  └─────────────┘          └─────────────┘          └─────────────┘
```

### Pixel Guesser Phases

| Phase | Duration | Description |
|-------|----------|-------------|
| Lobby | Until 2+ players | Auto-start when threshold reached |
| Countdown | 3 seconds | Prepare for next round |
| Guessing | 45 seconds | Artist draws, others guess the word |
| Reveal | 5 seconds | Show correct answer and round scores |
| Results | 15 seconds | Final rankings after all rounds |

### How It Works

1. **Artist Rotation**: Each player takes a turn as the artist
2. **Secret Prompt**: Artist sees a word to draw (localized EN/DE)
3. **Live Drawing**: Canvas updates stream to guessers in real-time
4. **Guessing**: Players type guesses, matched against both languages
5. **Scoring**: Faster correct guesses earn more points

### Scoring System

| Time to Guess | Points |
|---------------|--------|
| Under 10s | 100 + position bonus |
| Under 20s | 75 + position bonus |
| Under 30s | 50 + position bonus |
| Over 30s | 25 + position bonus |

**Position Bonus**: 1st: +20, 2nd: +10, 3rd: +5

**Artist Bonus**: 20% of total points earned by guessers

## Pixel Survivor Mode

Pixel Survivor is a single-player roguelike where you draw to survive 30 days of challenges.

### Core Concept

- **Draw your character**: Stats (HP, Attack, Defense, Speed, Luck) determined by pixel art properties
- **Draw to survive**: Each event requires a drawn solution analyzed geometrically
- **Roguelike progression**: Permadeath, upgrades on level-up, 30-day runs
- **No AI recognition**: Pure geometric analysis (shape, color, density)

### Pixel Survivor Phase Flow

```text
  MENU                      CHARACTER (120s)         DAY START (3s)
  ┌─────────────┐           ┌─────────────┐          ┌─────────────┐
  │  New Run /  │  Start    │  Draw Your  │          │  Day X      │
  │  Continue / │ ─────────►│  Survivor   │ ────────►│  Resource   │
  │  Stats      │           │  Stats Gen  │          │  Update     │
  └─────────────┘           └─────────────┘          └─────────────┘
                                                            │
       ┌────────────────────────────────────────────────────┘
       │
       ▼
  EVENT (5s)                DRAWING (60s)            RESULT (5s)
  ┌─────────────┐           ┌─────────────┐          ┌─────────────┐
  │  Random     │           │  Draw       │          │  Success or │
  │  Challenge  │ ─────────►│  Solution   │ ────────►│  Failure    │
  │  + Hint     │           │             │          │  +Rewards   │
  └─────────────┘           └─────────────┘          └─────────────┘
       │                                                    │
       │                         ┌──────────────────────────┘
       │                         │
       │                         ▼
       │                    LEVEL UP? (30s)          GAME OVER/VICTORY
       │                    ┌─────────────┐          ┌─────────────┐
       │      HP > 0        │  Choose 1   │  Day 30  │  Score      │
       └────────────────────│  of 3       │ ────────►│  Stats      │
         Next Day           │  Upgrades   │  or HP=0 │  Highscore  │
                            └─────────────┘          └─────────────┘
```

### Pixel Survivor Phases

| Phase | Duration | Description |
|-------|----------|-------------|
| Menu | - | New run, continue, or view statistics |
| Character | 120 seconds | Draw character, stats calculated from design |
| Day Start | 3 seconds | Show day number, update resources |
| Event | 5 seconds | Display random challenge with hint |
| Drawing | 60 seconds | Draw solution to the event |
| Result | 5 seconds | Show success/failure, rewards/damage |
| Level Up | 30 seconds | Choose 1 of 3 random upgrades |
| Game Over | - | Show score if HP reaches 0 |
| Victory | - | Show score if survived 30 days |

### Character Stats from Drawing

Character pixel art is analyzed to generate stats:

| Property | Affects | Example |
|----------|---------|---------|
| Pixel count | Max HP | More pixels = more HP (50-150) |
| Asymmetry | Attack | Asymmetric = aggressive (20-100) |
| Symmetry + Compactness | Defense | Symmetric = stable (20-100) |
| Low density | Speed | Sparse = light/fast (20-100) |
| Color variety | Luck | More colors = luckier (10-50) |
| Dominant color | Element | Red=Fire, Blue=Water, etc. |

### Drawing Recognition

Drawings are categorized by geometric properties, not AI recognition:

| Category | Detection Criteria |
|----------|-------------------|
| Weapon | Tall (aspect ratio ≥2.5), thin (width ≤2) |
| Shield | Wide, solid, compact, dense (>0.7) |
| Fire | Warm colors (red/yellow/orange), scattered |
| Shelter | Hollow, large (≥4x4) |
| Bridge | Horizontal, flat (height ≤2), long (width ≥5) |
| Boat | Hollow, bottom position |
| Trap | Pointy, low position |

### Event Types

- **Combat**: Fight creatures (wolf, bear, bandits)
- **Survival**: Survive nature (cold, hunger, storms)
- **Exploration**: Navigate terrain (rivers, cliffs, caves)
- **Social**: NPC interactions (merchants, travelers)
- **Mystery**: Puzzles and choices

### Win/Lose Conditions

- **Win**: Survive 30 days OR defeat Final Boss on Day 30
- **Lose**: HP reaches 0 (permadeath)
- **Score**: Days survived × Level × Monsters killed

### Technical Notes

- **Single-player**: Runs client-side with LocalStorage persistence
- **No server rooms**: Mode registration only for consistency
- **No voting**: Geometric analysis replaces player voting
