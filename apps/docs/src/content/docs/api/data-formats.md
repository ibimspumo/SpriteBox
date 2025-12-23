---
title: Data Formats
description: Pixel art encoding, prompts, and validation schemas
---

## Pixel Art Format

Artwork is stored as **64-character hexadecimal strings**.

### Encoding

- 8×8 grid = 64 pixels
- 16 colors = 4 bits = 1 hex character per pixel
- Row-major order (left to right, top to bottom)

```text
Grid Position:       Hex String Index:
┌─┬─┬─┬─┬─┬─┬─┬─┐
│0│1│2│3│4│5│6│7│    0-7
├─┼─┼─┼─┼─┼─┼─┼─┤
│8│9│...        │    8-15
├─┼─┼─┼─┼─┼─┼─┼─┤
│...            │    ...
├─┼─┼─┼─┼─┼─┼─┼─┤
│56│...      │63│    56-63
└─┴─┴─┴─┴─┴─┴─┴─┘
```

### Example

```typescript
// Empty canvas (all white - color index 1)
const empty = "1111111111111111111111111111111111111111111111111111111111111111";

// Simple smiley face
const smiley = "1111111111111111111F1F11111F1F1111FFFF11111111111111111111111111";
//                    ^^  ^^           <- eyes (color F = tan)
//                          ^^^^^^     <- mouth (color F = tan)
```

## Color Palette (16 colors)

| Index | Hex | Color | Use Cases |
|-------|-----|-------|-----------|
| 0 | `#000000` | Black | Outlines, shadows |
| 1 | `#FFFFFF` | White | Background (default) |
| 2 | `#FF3B30` | Red | Fire, hearts, "angry" |
| 3 | `#8B1A1A` | Dark Red | Blood, deep shadows |
| 4 | `#4CD964` | Green | Grass, leaves, slime |
| 5 | `#2D5A27` | Dark Green | Trees, cacti |
| 6 | `#007AFF` | Blue | Water, sky, "sad" |
| 7 | `#1C2541` | Dark Blue | Space, night |
| 8 | `#FFCC00` | Yellow | Sun, stars, coins |
| 9 | `#FF9500` | Orange | Fire, lava, "burning" |
| A | `#A0522D` | Brown | Wood, earth, burgers |
| B | `#FF2D92` | Pink | Flowers, love, "happy" |
| C | `#AF52DE` | Purple | Magic, gems, potions |
| D | `#5AC8FA` | Cyan | Ice, "frozen" |
| E | `#8E8E93` | Gray | Skulls, stone, metal |
| F | `#D4A574` | Tan | Skin, cookies, sand |

### Encoding/Decoding

```typescript
// Encode 2D array to hex string
function encodeArtwork(grid: number[][]): string {
  let hex = '';
  for (let y = 0; y < 8; y++) {
    for (let x = 0; x < 8; x++) {
      hex += grid[y][x].toString(16).toUpperCase();
    }
  }
  return hex;
}

// Decode hex string to 2D array
function decodeArtwork(hex: string): number[][] {
  const grid: number[][] = [];
  for (let y = 0; y < 8; y++) {
    const row: number[] = [];
    for (let x = 0; x < 8; x++) {
      const index = y * 8 + x;
      row.push(parseInt(hex[index], 16));
    }
    grid.push(row);
  }
  return grid;
}
```

## Prompt System

Prompts are generated from three word lists and sent as **indices** for localization.

### Server Format

```typescript
interface PromptIndices {
  prefixIdx: number | null;  // ~70% chance to have prefix
  subjectIdx: number;        // Always present
  suffixIdx: number | null;  // ~50% chance to have suffix
}

// Example
{ prefixIdx: 5, subjectIdx: 20, suffixIdx: null }
```

### Prompt Data Structure

```json
{
  "prefixes": ["red", "blue", "happy", "burning", ...],
  "subjects": ["heart", "sword", "pizza", "cat", ...],
  "suffixes": ["on fire", "in space", "melting", ...]
}
```

- **29 prefixes** (colors, emotions, states)
- **44 subjects** (objects, animals, items)
- **25 suffixes** (contexts, situations)
- **~31,900 possible combinations**

### Client Assembly

```typescript
// Client localizes based on current language
function localizePrompt(indices: PromptIndices): Prompt {
  const data = getLanguage() === 'de' ? promptsDe : promptsEn;

  return {
    prefix: indices.prefixIdx !== null
      ? data.prefixes[indices.prefixIdx]
      : '',
    subject: data.subjects[indices.subjectIdx],
    suffix: indices.suffixIdx !== null
      ? data.suffixes[indices.suffixIdx]
      : ''
  };
}

// Assemble to display string
function assemblePrompt(prompt: Prompt): string {
  const parts = [];
  if (prompt.prefix) parts.push(prompt.prefix);
  parts.push(prompt.subject);
  if (prompt.suffix) parts.push(prompt.suffix);
  return parts.join(' ');  // "blue pizza on fire"
}
```

### Localization Files

Both files must have **identical array lengths**:

- `apps/server/data/prompts.json` - English
- `apps/server/data/prompts_de.json` - German

## Validation Schemas (Zod)

### Pixel Data

```typescript
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

### Room Code

```typescript
const RoomCodeSchema = z.string()
  .length(4)
  .regex(/^[A-Z0-9]+$/i)
  .transform(s => s.toUpperCase());
```

### Username

```typescript
const UsernameSchema = z.string()
  .min(1)
  .max(20)
  .transform(s => s.trim())
  .refine(s => !FORBIDDEN_NAMES.includes(s.toLowerCase()))
  .refine(s => !XSS_PATTERNS.some(p => p.test(s)))
  .transform(escapeHtml);

const FORBIDDEN_NAMES = [
  'admin', 'moderator', 'system', 'null',
  'undefined', 'bot', 'server', 'host'
];
```

### Vote

```typescript
const VoteSchema = z.object({
  chosenId: z.string().min(1).max(50)
});

const FinaleVoteSchema = z.object({
  playerId: z.string().min(1).max(50)
});
```

### Stats

```typescript
const StatsSchema = z.object({
  gamesPlayed: z.number().int().min(0).max(1000000),
  placements: z.object({
    1: z.number().int().min(0).max(100000),
    2: z.number().int().min(0).max(100000),
    3: z.number().int().min(0).max(100000)
  })
});
```

## Gallery Compression

For large games (50+ players), rankings are compressed with LZ-String:

```typescript
import LZString from 'lz-string';

// Server compresses if needed
function compressIfNeeded(rankings: RankingEntry[], playerCount: number) {
  if (playerCount < 50) {
    return { compressed: false, data: '' };
  }

  const json = JSON.stringify(rankings);
  const compressed = LZString.compressToBase64(json);
  return { compressed: true, data: compressed };
}

// Client decompresses
socket.on('game-results', ({ compressedRankings, rankings }) => {
  if (compressedRankings) {
    const json = LZString.decompressFromBase64(compressedRankings);
    rankings = JSON.parse(json);
  }
  displayRankings(rankings);
});
```

**Compression ratio:** ~70-80% size reduction for large galleries.

## TypeScript Interfaces

```typescript
interface User {
  displayName: string;
  discriminator: string;  // "0000"-"9999"
  fullName: string;       // "Name#0000"
}

interface Prompt {
  prefix: string;
  subject: string;
  suffix: string;
}

interface Submission {
  playerId: string;
  pixels: string;         // 64-char hex
  timestamp: number;
}

interface RankingEntry {
  place: number;
  playerId: string;
  user: User;
  pixels: string;
  finalVotes: number;
  elo: number;
}
```
