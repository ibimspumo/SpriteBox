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
| `copy-cat-solo` | Solo memory practice: recreate images alone | 1 (solo) |
| `pixel-guesser` | Pictionary mode: one draws, others guess | 2-20 |
| `pixel-survivor` | Roguelike survival: draw to survive 30 days | 1 (solo) |
| `zombie-pixel` | Infection game: zombies chase survivors | 1-100 (bots fill) |
| `copycat-royale` | Battle royale elimination: recreate images, lowest accuracy eliminated | 3-100 |

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

## CopyCat Solo Mode

CopyCat Solo is a single-player practice mode for memory-based pixel art recreation.

### CopyCat Solo Phase Flow

```text
  LOBBY                    MEMORIZE (5s)            DRAWING (30s)
  ┌─────────────┐          ┌─────────────┐          ┌─────────────┐
  │  Player     │ Instant  │  Reference  │          │  Draw from  │
  │  Joins      │ ───────► │  Image      │ ───────► │  Memory     │
  │  (Solo)     │  start   │  Shown      │          │             │
  └─────────────┘          └─────────────┘          └─────────────┘
                                                           │
       ┌───────────────────────────────────────────────────┘
       │
       ▼
  RESULT (8s)               NEXT ROUND
  ┌─────────────┐           ┌─────────────┐
  │  Accuracy   │  Play     │  Back to    │
  │  Shown      │ ─────────►│  Lobby      │
  │             │  again    │             │
  └─────────────┘           └─────────────┘
```

### CopyCat Solo Phases

| Phase | Duration | Description |
|-------|----------|-------------|
| Lobby | Instant | Game starts immediately when player joins |
| Memorize | 5 seconds | Reference image shown |
| Drawing | 30 seconds | Recreate from memory |
| Result | 8 seconds | Accuracy displayed |

### Key Differences from 1v1 CopyCat

- **No countdown phase**: Starts immediately
- **No opponent**: Practice at your own pace
- **Shorter result phase**: 8s instead of 10s
- **No rematch voting**: Simply play again
- **No private rooms**: Solo mode uses public queue only

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

Pixel Survivor is a single-player RPG where your pixel art determines your character's stats, element, and personality trait.

### Core Concept

- **Draw your character**: Stats determined by pixel art properties (shape, color, density)
- **Element system**: Dominant colors determine elemental affinity (Fire, Water, Earth, Air, Light, Dark)
- **Trait system**: Drawing style determines personality traits affecting gameplay
- **Engine-based**: Flexible RPG engine with stats, modifiers, effects, and dice rolls

### Pixel Survivor Phase Flow

```text
  MENU                      CHARACTER                GAMEPLAY
  ┌─────────────┐           ┌─────────────┐          ┌─────────────┐
  │  New Run /  │  Start    │  Draw Your  │  Done    │  RPG        │
  │  Continue / │ ─────────►│  Character  │ ────────►│  Gameplay   │
  │  Stats      │           │  (8x8 grid) │          │  (Engine)   │
  └─────────────┘           └─────────────┘          └─────────────┘
        ▲                                                   │
        │                                                   │
        └───────────────── Exit / Game Over ────────────────┘
```

### Pixel Survivor Phases

| Phase | Description |
|-------|-------------|
| Menu | New run, continue saved run, or view statistics |
| Character | Draw 8x8 character, see live stat preview |
| Gameplay | Active gameplay with the created character |

### Character Creation System

When you draw your character, the engine analyzes the pixel art in real-time:

#### Stats from Drawing

| Property | Stat Affected | How It Works |
|----------|---------------|--------------|
| Pixel count | Max HP | More filled pixels = more HP |
| Asymmetry | Attack | Asymmetric designs = higher attack |
| Symmetry | Defense | Symmetric, compact designs = higher defense |
| Density | Speed | Sparse/light designs = higher speed |
| Color variety | Luck | More colors used = higher luck |

#### Element Detection

The dominant colors in your drawing determine your elemental affinity:

| Element | Colors | Strengths |
|---------|--------|-----------|
| Fire | Red, Orange | Strong vs Earth, weak vs Water |
| Water | Blue, Cyan | Strong vs Fire, weak vs Earth |
| Earth | Green, Brown | Strong vs Water, weak vs Air |
| Air | White, Light Gray | Strong vs Earth, weak vs Fire |
| Light | Yellow, Gold | Strong vs Dark |
| Dark | Purple, Black | Strong vs Light |
| Neutral | Mixed/Gray | No weaknesses, no strengths |

#### Trait Detection

Your drawing style determines personality traits:

| Trait | Detection | Effect |
|-------|-----------|--------|
| Aggressive | High asymmetry, warm colors | +Attack, -Defense |
| Defensive | High symmetry, compact | +Defense, -Speed |
| Swift | Low density, sparse | +Speed, -HP |
| Lucky | High color variety | +Luck, +Critical chance |
| Balanced | Even distribution | No bonuses or penalties |
| Chaotic | Complex patterns | Random stat variations |

### Engine Systems

The game uses a modular RPG engine:

#### StatManager

Manages all character stats with base values and modifiers:

- **Resources**: HP, Mana, Shield
- **Combat**: Attack, Defense, Speed, Luck
- **Progression**: Level, XP, XP to next level

#### EffectProcessor

Handles buffs, debuffs, and status effects:

- Time-based effects (poison, regeneration)
- Triggered effects (on hit, on critical)
- Stackable modifiers

#### DiceRoller

Handles skill checks and damage calculations:

- D20-based skill checks
- Damage rolls with modifiers
- Critical hit/miss system

### Combat System

The gameplay loop centers around turn-based combat using a D20 dice system.

#### Combat Flow

```text
  ENCOUNTER                 PLAYER TURN              RESOLUTION
  ┌─────────────┐           ┌─────────────┐          ┌─────────────┐
  │  Monster    │  Init     │  Choose     │  Roll    │  Apply      │
  │  Spawns     │ ─────────►│  Action     │ ───────► │  Damage     │
  │             │           │             │          │             │
  └─────────────┘           └─────────────┘          └─────────────┘
                                                            │
       ┌────────────────────────────────────────────────────┘
       │
       ▼
  MONSTER TURN              CHECK                    OUTCOME
  ┌─────────────┐           ┌─────────────┐          ┌─────────────┐
  │  Monster    │           │  Victory?   │   Yes    │  XP + Loot  │
  │  Attacks    │ ─────────►│  Defeat?    │ ───────► │  or         │
  │             │           │  Continue?  │          │  Game Over  │
  └─────────────┘           └─────────────┘          └─────────────┘
```

#### Combat Phases

| Phase | Description |
|-------|-------------|
| `player_turn` | Player chooses an action |
| `player_rolling` | D20 dice roll animation |
| `player_attack` | Attack animation plays |
| `monster_turn` | Monster AI decides action |
| `monster_attack` | Monster attack animation |
| `victory` | Player defeated the monster |
| `defeat` | Player was defeated |
| `fled` | Player successfully escaped |

#### Combat Actions

| Action | Description |
|--------|-------------|
| `attack` | Basic attack using stats |
| `defend` | Defensive stance (+defense) |
| `ability` | Use special ability |
| `flee` | Attempt to escape (40% base chance) |

#### D20 Damage Modifiers

The D20 roll modifies damage dealt:

| Roll | Category | Damage Modifier |
|------|----------|-----------------|
| 1 | Critical Failure | -50% damage |
| 2-5 | Poor | -20% damage |
| 6-14 | Normal | No modifier |
| 15-19 | Good | +20% damage |
| 20 | Critical Hit | +50% damage |

#### Damage Formula

```typescript
// 1. Base damage (fixed value + trait bonus)
// Player: 5 + trait bonus (offensive +1, defensive -1, utility 0)
// Monster: 5
baseDamage = 5 + traitBonus

// 2. Apply D20 modifier
d20Modified = baseDamage × d20Multiplier

// 3. Apply ability multiplier (if using special ability)
afterAbility = d20Modified × abilityMultiplier

// 4. Apply attack stat multiplier (1 + attack/100)
// Examples: 40 attack = 1.4×, 100 attack = 2.0×
afterAttack = afterAbility × (1 + attackStat / 100)

// 5. Apply defense multiplier (1 - defense/100, soft capped)
// Defense is capped at 50% reduction by default
defenseMultiplier = max(0.1, 1 - min(defense, 50) / 100)
afterDefense = afterAttack × defenseMultiplier

// 6. Apply element multiplier
finalDamage = max(1, afterDefense × elementMultiplier)
```

### Monster System

Monsters are the primary enemies in Pixel Survivor.

#### Monster Properties

| Property | Description |
|----------|-------------|
| `element` | Fire, Water, Earth, Air, Light, Dark, Neutral |
| `rarity` | common, uncommon, rare, epic, legendary, boss |
| `behavior` | aggressive, defensive, balanced, berserker, tactical |
| `size` | tiny, small, medium, large, huge |

#### Monster Rarity Effects

| Rarity | Spawn Rate | XP Multiplier | Stat Bonus |
|--------|------------|---------------|------------|
| Common | High | 1.0× | None |
| Uncommon | Medium | 1.25× | +10% |
| Rare | Low | 1.5× | +25% |
| Epic | Very Low | 2.0× | +50% |
| Legendary | Rare | 3.0× | +100% |
| Boss | Scripted | 5.0× | +200% |

#### Zone System

Monsters spawn based on zones and round progression:

```typescript
interface ZoneDefinition {
  id: string;           // 'forest', 'cave', 'volcano'
  startRound: number;   // When zone becomes available
  endRound: number;     // When zone ends (-1 = unlimited)
  monsterIds: string[]; // Which monsters can spawn
  environmentElement?: ElementType; // Element bonus
}
```

#### Monster Abilities

Monsters can have special abilities:

| Ability Type | Example | Effect |
|--------------|---------|--------|
| Damage | Bite | 1.5× damage multiplier |
| Buff | Howl | Increases own attack |
| Heal | Regenerate | Recover HP over time |
| Debuff | Poison | Deal damage over time |

### Technical Notes

- **Single-player**: Runs entirely client-side
- **LocalStorage**: Character and run data persisted locally
- **No server rooms**: Registered as game mode for consistency
- **Real-time preview**: Stats update as you draw

## Zombie Pixel Mode

Zombie Pixel is a real-time infection game on a 32x32 grid arena. One player starts as a zombie and must infect all survivors before time runs out.

### Zombie Pixel Phase Flow

```text
  LOBBY                    COUNTDOWN (3s)           GAMEPLAY (90s)
  ┌─────────────┐          ┌─────────────┐          ┌─────────────┐
  │  Players    │  Bots    │   Roles     │          │  Zombies    │
  │  Join       │ ───────► │   Assigned  │ ───────► │  Chase      │
  │  (1-100)    │  fill    │             │          │  Survivors  │
  └─────────────┘          └─────────────┘          └─────────────┘
                                                           │
       ┌───────────────────────────────────────────────────┘
       │
       ▼
  RESULTS
  ┌─────────────┐
  │  Winner +   │
  │  Stats      │
  │  Shown      │
  └─────────────┘
```

### Zombie Pixel Phases

| Phase | Duration | Description |
|-------|----------|-------------|
| Lobby | Until ready | Bots fill to 100 players, auto-start |
| Countdown | 3 seconds | Roles assigned, positions revealed |
| Gameplay | 90 seconds | Real-time movement and infection |
| Results | 10 seconds | Winner announced with game stats |

### How It Works

1. **Bot Filling**: Lobby fills with AI bots up to 100 players
2. **Role Assignment**: One random player starts as zombie
3. **Movement**: 8-directional movement via keyboard, touch joystick, or swipe
4. **Infection**: Zombies infect survivors by touching them on the grid
5. **Win Condition**: Last survivor wins, or zombies win if all infected

### Controls

| Input | Method |
|-------|--------|
| Keyboard | Arrow keys or WASD for 8-directional movement |
| Touch | Virtual joystick or swipe gestures |
| Gamepad | D-pad or left stick |

### Game Mechanics

- **Grid Size**: 32x32 cells
- **Viewport**: 13x13 visible area centered on player
- **Infection**: Zombie and survivor on same cell = infection
- **Movement Rate**: Server-controlled tick rate (100ms)
- **Bot AI**: Zombies chase nearest survivor, survivors flee from zombies

### Technical Notes

- **Real-time**: Uses Socket.io for low-latency game state sync
- **Server authoritative**: All movement validated on server
- **Bot system**: Server-side AI fills empty slots
- **Rate limited**: Movement commands rate-limited to prevent spam

## CopyCat Royale Mode

CopyCat Royale is a battle royale elimination game combining memory-based pixel art with competitive elimination rounds. Players draw images, then compete to recreate them from memory with the lowest accuracy players being eliminated each round.

### CopyCat Royale Phase Flow

```text
  LOBBY                    COUNTDOWN (5s)           INITIAL DRAW (30s)
  ┌─────────────┐          ┌─────────────┐          ┌─────────────┐
  │  3-100      │  Auto    │   Get       │          │  All Draw   │
  │  Players    │ ───────► │   Ready     │ ───────► │  Freely     │
  │  Join       │  start   │             │          │  (Pool)     │
  └─────────────┘          └─────────────┘          └─────────────┘
                                                           │
       ┌───────────────────────────────────────────────────┘
       │
       ▼
  SHOW REF (5s)            DRAW (25s)               RESULTS (8s)
  ┌─────────────┐          ┌─────────────┐          ┌─────────────┐
  │  Random     │          │  Recreate   │          │  Accuracy   │
  │  Pool Image │ ───────► │  From       │ ───────► │  Ranked     │
  │  Shown      │          │  Memory     │          │  Eliminate  │
  └─────────────┘          └─────────────┘          └─────────────┘
       ▲                                                   │
       │                                                   │
       └──── More players? ────────────────────────────────┘
                                                           │
                                                           ▼
                                                    WINNER (15s)
                                                    ┌─────────────┐
                                                    │  Final      │
                                                    │  Rankings   │
                                                    │  Shown      │
                                                    └─────────────┘
```

### CopyCat Royale Phases

| Phase | Duration | Description |
|-------|----------|-------------|
| Lobby | Until 3+ players | Auto-start after timer |
| Countdown | 5 seconds | Players prepare |
| Initial Drawing | 30 seconds | All players draw freely (creates image pool) |
| Show Reference | 5 seconds | Random pool image shown |
| Drawing | 25 seconds | Recreate from memory |
| Results | 8 seconds | Accuracy ranked, eliminations shown |
| Winner | 15 seconds | Final rankings displayed |

### How It Works

1. **Initial Drawing**: All players draw freely, creating the image pool
2. **Round Start**: A random image from the pool is displayed
3. **Memorize**: Players have 5 seconds to memorize the image
4. **Recreate**: Players draw from memory (reference hidden)
5. **Scoring**: Accuracy calculated by pixel-by-pixel comparison
6. **Elimination**: Lowest accuracy players eliminated each round
7. **Repeat**: Continue until one player remains

### Elimination Mechanics

- Each round eliminates approximately 1/3 of remaining players
- Elimination count adapts based on player count
- Finale triggers when 3 or fewer players remain
- Ties broken by submission time (faster = better)

### Royale Accuracy Scoring

```typescript
accuracy = (matchingPixels / 64) × 100
// Higher accuracy survives
// Tie: faster submission time wins
```

### Final Rankings

| Rank    | Description                                 |
|---------|---------------------------------------------|
| 1st     | Last player standing (winner)               |
| 2nd-3rd | Eliminated in finale round                  |
| Others  | Ranked by round eliminated (later = better) |

### Technical Notes

- **Image Pool**: Player drawings from initial round become references
- **Fair Selection**: Images selected randomly, avoiding repeats
- **Early Submit**: All players submitting ends phase early
- **Spectator Mode**: Eliminated players can watch remaining rounds
