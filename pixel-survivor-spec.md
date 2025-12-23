# Pixel Survivor – Game Specification

A roguelike survival game where you draw to survive. Every decision is made with pixels.

---

## Table of Contents

1. [Core Concept](#core-concept)
2. [Character Creation](#character-creation)
3. [Gameplay Loop](#gameplay-loop)
4. [Drawing Recognition System](#drawing-recognition-system)
5. [Drawable Objects](#drawable-objects)
6. [Events System](#events-system)
7. [Monsters](#monsters)
8. [Level & Progression System](#level--progression-system)
9. [Roguelike Upgrades](#roguelike-upgrades)
10. [World Scaling](#world-scaling)
11. [Technical Implementation](#technical-implementation)

---

## Core Concept

### The Idea

You're stranded in a hostile world. Every challenge requires you to **draw a solution** on an 8x8 pixel grid. Draw a weapon to fight, draw shelter to hide, draw fire to survive the cold.

### Key Features

- **Draw your character** → Stats based on your design
- **Draw to survive** → Every event needs a creative solution
- **Roguelike runs** → Permadeath, random events, upgrades per run
- **No AI recognition** → Pure geometric analysis (no ML needed)
- **Quick sessions** → 10-20 minutes per run

### Win/Lose Conditions

- **Lose:** HP reaches 0 (Permadeath)
- **Win:** Survive 30 days OR defeat the Final Boss on Day 30
- **Scoring:** Days survived × Level × Monsters killed

---

## Character Creation

### Overview

Before each run, players draw their character on an 8x8 grid. The drawing is analyzed to generate base stats.

```
┌─────────────────────────────────────────────────────────┐
│  CREATE YOUR SURVIVOR                                   │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  Draw your character!                                   │
│                                                         │
│         ┌────────────────┐                              │
│         │ ⬜⬜⬛⬛⬛⬛⬜⬜ │                              │
│         │ ⬜⬛🟦⬛⬛🟦⬛⬜ │                              │
│         │ ⬜⬛⬛⬛⬛⬛⬛⬜ │                              │
│         │ ⬜⬜⬛🟥⬛⬛⬜⬜ │                              │
│         │ ⬜⬜🟫🟫🟫🟫⬜⬜ │                              │
│         │ ⬜⬜🟫⬜⬜🟫⬜⬜ │                              │
│         │ ⬜⬜🟫⬜⬜🟫⬜⬜ │                              │
│         │ ⬜⬜⬛⬜⬜⬛⬜⬜ │                              │
│         └────────────────┘                              │
│                                                         │
│  ═══════════════════════════════════════════════════   │
│                                                         │
│  PREVIEW STATS:                                         │
│                                                         │
│  ❤️  HP:      ████████████████░░░░ 80                   │
│  ⚔️  Attack:  ██████████░░░░░░░░░░ 50                   │
│  🛡️  Defense: ████████████░░░░░░░░ 60                   │
│  ⚡ Speed:   ██████████████░░░░░░ 70                   │
│  🎯 Luck:    ████████░░░░░░░░░░░░ 40                   │
│                                                         │
│  Element: NEUTRAL                                       │
│  Trait: "Balanced" - No bonuses or penalties           │
│                                                         │
│  [Randomize] [Clear] [Start Run →]                     │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### Character Analysis

```typescript
interface CharacterAnalysis {
  // Dimensions
  height: number;          // Vertical pixel span
  width: number;           // Horizontal pixel span
  pixelCount: number;      // Total filled pixels
  
  // Shape properties
  symmetry: number;        // 0-1, left-right symmetry
  balance: number;         // 0-1, top-bottom balance
  density: number;         // Filled / bounding box
  compactness: number;     // How clustered vs spread
  
  // Color analysis
  // Palette: 0=Black, 1=White(empty), 2=Red, 3=Green, 4=Blue, 5=Yellow,
  // 6=Magenta, 7=Cyan, 8=Orange, 9=Purple, A=Light Blue, B=Lime,
  // C=Pink, D=Gray, E=Light Gray, F=Brown
  dominantColor: string;
  colorCount: number;
  hasRed: boolean;         // 2, 8, C (Red, Orange, Pink)
  hasBlue: boolean;        // 4, 7, A (Blue, Cyan, Light Blue)
  hasGreen: boolean;       // 3, B (Green, Lime)
  hasYellow: boolean;      // 5 (Yellow)
  
  // Special detections
  headRatio: number;       // Top portion density
  bodyRatio: number;       // Middle portion density
  legRatio: number;        // Bottom portion density
}
```

### Stat Calculation

```typescript
interface CharacterStats {
  maxHp: number;       // 50-150
  attack: number;      // 20-100
  defense: number;     // 20-100
  speed: number;       // 20-100
  luck: number;        // 10-50
  element: Element;
  trait: Trait;
}

type Element = 
  | 'fire'      // Red dominant → +20% fire damage, -20% water resist
  | 'water'     // Blue dominant → +20% water damage, -20% fire resist
  | 'earth'     // Brown/green → +20% defense, -10% speed
  | 'air'       // Light/white → +20% speed, -10% defense
  | 'dark'      // Black dominant → +20% crit chance, -10% luck
  | 'light'     // Yellow dominant → +20% luck, -10% attack
  | 'neutral';  // Mixed/no dominant → No bonuses or penalties

function calculateCharacterStats(analysis: CharacterAnalysis): CharacterStats {
  // BASE HP: More pixels = more substance = more HP
  const baseHp = 50 + Math.round(analysis.pixelCount * 2.5);
  const maxHp = Math.min(150, Math.max(50, baseHp));
  
  // ATTACK: Asymmetric + pointy = aggressive
  const asymmetryBonus = (1 - analysis.symmetry) * 40;
  const attack = 20 + Math.round(30 + asymmetryBonus);
  
  // DEFENSE: Symmetric + compact = stable
  const symmetryBonus = analysis.symmetry * 30;
  const compactnessBonus = analysis.compactness * 20;
  const defense = 20 + Math.round(symmetryBonus + compactnessBonus);
  
  // SPEED: Less dense = lighter = faster
  const speed = 20 + Math.round((1 - analysis.density) * 60 + 20);
  
  // LUCK: Color variety = interesting = lucky
  const luck = 10 + Math.round(analysis.colorCount * 8);
  
  // ELEMENT: Based on dominant color
  const element = determineElement(analysis);
  
  // TRAIT: Based on overall characteristics
  const trait = determineTrait(analysis);
  
  return {
    maxHp: clamp(maxHp, 50, 150),
    attack: clamp(attack, 20, 100),
    defense: clamp(defense, 20, 100),
    speed: clamp(speed, 20, 100),
    luck: clamp(luck, 10, 50),
    element,
    trait,
  };
}

function determineElement(analysis: CharacterAnalysis): Element {
  // Color reference: 0=Black, 1=White, 2=Red, 3=Green, 4=Blue, 5=Yellow,
  // 6=Magenta, 7=Cyan, 8=Orange, 9=Purple, A=Light Blue, B=Lime, 
  // C=Pink, D=Gray, E=Light Gray, F=Brown
  
  if (analysis.hasRed && !analysis.hasBlue) return 'fire';      // Red/Orange/Pink
  if (analysis.hasBlue && !analysis.hasRed) return 'water';     // Blue/Cyan/Light Blue
  if (['F', '3', 'B'].includes(analysis.dominantColor)) return 'earth';  // Brown/Green/Lime
  if (['5', 'E'].includes(analysis.dominantColor)) return 'light';       // Yellow/Light Gray
  if (analysis.dominantColor === '0') return 'dark';            // Black
  if (analysis.density < 0.3) return 'air';                     // Sparse = airy
  return 'neutral';
}

function determineTrait(analysis: CharacterAnalysis): Trait {
  if (analysis.symmetry > 0.9) return 'perfectionist';
  if (analysis.symmetry < 0.2) return 'chaotic';
  if (analysis.pixelCount > 50) return 'bulky';
  if (analysis.pixelCount < 15) return 'minimalist';
  if (analysis.colorCount >= 5) return 'creative';
  if (analysis.colorCount === 1) return 'focused';
  if (analysis.headRatio > 0.4) return 'intellectual';
  if (analysis.legRatio > 0.4) return 'grounded';
  return 'balanced';
}
```

### Traits

| Trait | Condition | Effect |
|-------|-----------|--------|
| Perfectionist | Symmetry > 90% | +15% Defense, Shelter always 100% |
| Chaotic | Symmetry < 20% | +25% Crit Chance, -10% Accuracy |
| Bulky | 50+ pixels | +30 Max HP, -15% Speed |
| Minimalist | < 15 pixels | +25% Speed, -20 Max HP |
| Creative | 5+ colors | +20% Luck, Distraction +30% |
| Focused | 1 color | +20% Attack, -10% Luck |
| Intellectual | Big head | +15% XP gain, Tool +20% |
| Grounded | Big legs | +10% Defense, Bridge/Boat +20% |
| Balanced | Default | No bonuses or penalties |

---

## Gameplay Loop

### Run Structure

```
┌─────────────────────────────────────────────────────────┐
│                                                         │
│   CHARACTER CREATION                                    │
│        │                                                │
│        ▼                                                │
│   ┌─────────────────────────────────────────────────┐  │
│   │              MAIN GAME LOOP                      │  │
│   │                                                  │  │
│   │   Day Start                                      │  │
│   │      │                                           │  │
│   │      ▼                                           │  │
│   │   Random Event (Draw to solve)                   │  │
│   │      │                                           │  │
│   │      ├── Success → +XP, +Resources, Continue    │  │
│   │      │                                           │  │
│   │      └── Fail → Take Damage, Continue           │  │
│   │             │                                    │  │
│   │             └── HP = 0? → GAME OVER             │  │
│   │      │                                           │  │
│   │      ▼                                           │  │
│   │   Level Up? → Choose Upgrade                     │  │
│   │      │                                           │  │
│   │      ▼                                           │  │
│   │   Day 30? → Final Boss                          │  │
│   │      │                                           │  │
│   │      └── No → Next Day (loop)                   │  │
│   │                                                  │  │
│   └─────────────────────────────────────────────────┘  │
│        │                                                │
│        ▼                                                │
│   GAME OVER / VICTORY                                   │
│   Show Score, Unlock Achievements                       │
│        │                                                │
│        ▼                                                │
│   [New Run] [Main Menu]                                │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### Day Structure

Each day consists of:
1. **Dawn** (optional): Random positive event or nothing
2. **Main Event**: The challenge you must draw to solve
3. **Dusk** (optional): Random encounter or nothing

### Resources

| Resource | Max | Usage |
|----------|-----|-------|
| HP | Varies | Health, 0 = death |
| Food | 100 | -10 per day, 0 = starvation damage |
| Materials | 50 | Improves drawing effectiveness |
| Gold | ∞ | Buy upgrades at shops |

---

## Drawing Recognition System

### Core Principle

**We don't recognize WHAT the player draws. We measure PROPERTIES and map them to categories.**

### Shape Analysis

```typescript
interface ShapeAnalysis {
  // Dimensions
  width: number;           // 1-8
  height: number;          // 1-8
  aspectRatio: number;     // height / width
  
  // Position
  centerX: number;         // 0-7, horizontal center of mass
  centerY: number;         // 0-7, vertical center of mass
  
  // Form
  isHollow: boolean;       // Empty center?
  isPointy: boolean;       // Tapered end?
  isFlat: boolean;         // Horizontal orientation?
  density: number;         // Filled pixels / bounding box
  
  // Colors
  dominantColor: string;
  hasWarmColors: boolean;  // Red, orange, yellow
  hasCoolColors: boolean;  // Blue, green, purple
}

function analyzeShape(pixels: string[]): ShapeAnalysis {
  const grid = toGrid(pixels);  // 8x8 2D array
  const filled = getFilledPixels(grid);
  
  if (filled.length === 0) return null;
  
  // Bounding box
  const xs = filled.map(p => p.x);
  const ys = filled.map(p => p.y);
  const minX = Math.min(...xs), maxX = Math.max(...xs);
  const minY = Math.min(...ys), maxY = Math.max(...ys);
  
  const width = maxX - minX + 1;
  const height = maxY - minY + 1;
  
  // Center of mass
  const centerX = filled.reduce((sum, p) => sum + p.x, 0) / filled.length;
  const centerY = filled.reduce((sum, p) => sum + p.y, 0) / filled.length;
  
  // Hollow check (center empty, edges filled)
  const midX = Math.floor((minX + maxX) / 2);
  const midY = Math.floor((minY + maxY) / 2);
  let centerEmpty = 0;
  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      const x = midX + dx, y = midY + dy;
      if (x >= 0 && x < 8 && y >= 0 && y < 8) {
        if (grid[y][x] === '1') centerEmpty++;  // '1' = White = Empty
      }
    }
  }
  const isHollow = centerEmpty >= 5 && filled.length >= 12;
  
  // Pointy check (top or bottom narrower)
  const topWidth = countRowPixels(grid, minY);
  const bottomWidth = countRowPixels(grid, maxY);
  const midWidth = countRowPixels(grid, midY);
  const isPointy = (topWidth < midWidth * 0.5) || (bottomWidth < midWidth * 0.5);
  
  // Flat check (wider than tall)
  const isFlat = width > height * 1.5;
  
  // Density
  const density = filled.length / (width * height);
  
  // Colors
  const colors = filled.map(p => p.color);
  const dominantColor = mostCommon(colors);
  const warmColors = ['2', '5', '8', 'C'];  // Red, yellow, orange, pink
  const coolColors = ['3', '4', '7', '9', 'A'];  // Green, blue, cyan, purple, light blue
  
  return {
    width,
    height,
    aspectRatio: height / width,
    centerX,
    centerY,
    isHollow,
    isPointy,
    isFlat,
    density,
    dominantColor,
    hasWarmColors: colors.some(c => warmColors.includes(c)),
    hasCoolColors: colors.some(c => coolColors.includes(c)),
  };
}

// COLOR PALETTE REFERENCE:
// 0: #000000 - Black
// 1: #FFFFFF - White (Background/Empty)
// 2: #FF0000 - Red
// 3: #00FF00 - Green
// 4: #0000FF - Blue
// 5: #FFFF00 - Yellow
// 6: #FF00FF - Magenta
// 7: #00FFFF - Cyan
// 8: #FF8000 - Orange
// 9: #8000FF - Purple
// A: #0080FF - Light Blue
// B: #80FF00 - Lime
// C: #FF0080 - Pink
// D: #808080 - Gray
// E: #C0C0C0 - Light Gray
// F: #804000 - Brown
```

### Category Detection

```typescript
type DrawingCategory =
  | 'weapon'       // Long, thin, possibly pointy
  | 'shield'       // Wide, solid, compact
  | 'shelter'      // Hollow, large
  | 'fire'         // Warm colors, scattered
  | 'water'        // Blue, fluid shape
  | 'food'         // Small, green or brown
  | 'tool'         // Compact, mixed
  | 'trap'         // Pointy, low position
  | 'bridge'       // Horizontal, long
  | 'boat'         // Hollow, bottom position
  | 'rope'         // Very thin, long
  | 'light'        // Yellow, small
  | 'armor'        // Large, solid, surrounds
  | 'potion'       // Small, round, colorful
  | 'distraction'  // Colorful, chaotic
  | 'unknown';

function detectCategory(analysis: ShapeAnalysis): DrawingCategory {
  const { width, height, aspectRatio, isHollow, isPointy, isFlat, 
          density, centerY, hasWarmColors, hasCoolColors, dominantColor } = analysis;
  
  // Color reference: 0=Black, 1=White(empty), 2=Red, 3=Green, 4=Blue, 5=Yellow,
  // 6=Magenta, 7=Cyan, 8=Orange, 9=Purple, A=Light Blue, B=Lime, 
  // C=Pink, D=Gray, E=Light Gray, F=Brown
  
  // WEAPON: Tall and thin
  if (aspectRatio >= 2.5 && width <= 2) {
    return 'weapon';
  }
  
  // ROPE: Very thin and long
  if (aspectRatio >= 4 && width === 1) {
    return 'rope';
  }
  
  // BRIDGE: Flat and wide
  if (isFlat && height <= 2 && width >= 5) {
    return 'bridge';
  }
  
  // FIRE: Warm colors (red, yellow, orange, pink)
  if (hasWarmColors && ['2', '5', '8', 'C'].includes(dominantColor)) {
    return 'fire';
  }
  
  // LIGHT: Mainly yellow, small
  if (dominantColor === '5' && width <= 3 && height <= 3) {
    return 'light';
  }
  
  // WATER: Blue/cyan dominant
  if (['4', '7', 'A'].includes(dominantColor) && hasCoolColors) {
    return 'water';
  }
  
  // SHELTER: Hollow and large
  if (isHollow && width >= 4 && height >= 4) {
    return 'shelter';
  }
  
  // BOAT: Hollow and at bottom
  if (isHollow && centerY >= 5) {
    return 'boat';
  }
  
  // TRAP: Pointy and at bottom
  if (isPointy && centerY >= 5) {
    return 'trap';
  }
  
  // SHIELD: Wide, solid, compact (gray/dark colors)
  if (width >= 3 && height >= 3 && density > 0.7 && !isHollow) {
    return 'shield';
  }
  
  // ARMOR: Large and dense
  if (width >= 5 && height >= 5 && density > 0.5) {
    return 'armor';
  }
  
  // FOOD: Small and green/brown/lime
  if (width <= 3 && height <= 3 && ['3', 'B', 'F'].includes(dominantColor)) {
    return 'food';
  }
  
  // POTION: Small and round-ish
  if (width <= 3 && height <= 4 && density > 0.6) {
    return 'potion';
  }
  
  // DISTRACTION: Colorful and spread out
  if (density < 0.4 && !isHollow) {
    return 'distraction';
  }
  
  // TOOL: Default for compact shapes
  if (density > 0.5) {
    return 'tool';
  }
  
  return 'unknown';
}
```

---

## Drawable Objects

### Complete Object List (50 Objects)

Objects are grouped by category. Each has detection rules and base effectiveness.

#### Weapons (10)

| ID | Name | Detection | Base Power | Bonus Conditions |
|----|------|-----------|------------|------------------|
| W01 | Spear | Tall (6+), thin (1-2), brown | 60 | +15 if pointy |
| W02 | Sword | Tall (5+), thin (2), gray | 65 | +10 if symmetric |
| W03 | Axe | Medium, wide top | 70 | +15 if dense top |
| W04 | Club | Thick, dense | 55 | +20 if very dense |
| W05 | Bow | Curved, hollow-ish | 60 | +15 if symmetric |
| W06 | Dagger | Short (3-4), thin | 50 | +25 if pointy |
| W07 | Hammer | T-shape, dense | 75 | +10 if compact |
| W08 | Staff | Very tall (7+), thin | 45 | +20 if colorful (magic) |
| W09 | Trident | Tall, 3 points top | 65 | +15 if blue (water) |
| W10 | Whip | Thin, curved | 40 | +30 if long |

#### Defensive (8)

| ID | Name | Detection | Base Power | Bonus Conditions |
|----|------|-----------|------------|------------------|
| D01 | Shield | Wide, solid, compact | 70 | +15 if symmetric |
| D02 | Armor | Large, dense, covering | 60 | +20 if full coverage |
| D03 | Helmet | Small, top position | 50 | +10 if hollow |
| D04 | Wall | Very wide, flat | 80 | +10 if tall |
| D05 | Barrier | Medium, solid | 55 | +15 if colorful (magic) |
| D06 | Cloak | Large, low density | 45 | +20 if dark color |
| D07 | Mask | Small, hollow center | 40 | +25 if scary colors |
| D08 | Fortress | Very large, hollow | 90 | -20 if small |

#### Shelter (6)

| ID | Name | Detection | Base Power | Bonus Conditions |
|----|------|-----------|------------|------------------|
| S01 | Hut | Hollow, medium | 75 | +10 if has "door" (gap) |
| S02 | Tent | Triangle-ish, pointy top | 65 | +15 if symmetric |
| S03 | Cave | Hollow, irregular | 80 | +10 if dark colors |
| S04 | Tree House | Hollow, top heavy | 60 | +20 if green + brown |
| S05 | Bunker | Hollow, dense walls | 85 | +10 if compact |
| S06 | Igloo | Round, hollow, white | 70 | +20 if all white |

#### Fire & Light (6)

| ID | Name | Detection | Base Power | Bonus Conditions |
|----|------|-----------|------------|------------------|
| F01 | Campfire | Red + yellow, scattered | 80 | +15 if large |
| F02 | Torch | Tall + fire colors on top | 75 | +10 if brown base |
| F03 | Lantern | Hollow + yellow | 60 | +20 if has handle |
| F04 | Bonfire | Large, red + yellow + orange | 90 | -10 if small |
| F05 | Candle | Thin, yellow top | 50 | +15 if white base |
| F06 | Flare | Bright, scattered | 70 | +20 if red |

#### Tools & Utility (8)

| ID | Name | Detection | Base Power | Bonus Conditions |
|----|------|-----------|------------|------------------|
| T01 | Rope | Very thin, long | 65 | +20 if 7+ height |
| T02 | Bridge | Horizontal, flat | 70 | +15 if 6+ width |
| T03 | Ladder | Tall, with gaps | 60 | +20 if symmetric |
| T04 | Raft | Hollow, flat bottom | 65 | +15 if brown |
| T05 | Boat | Hollow, curved bottom | 75 | +10 if has mast |
| T06 | Net | Grid pattern, hollow | 55 | +25 if large |
| T07 | Bucket | Hollow, small | 50 | +15 if has handle |
| T08 | Shovel | T-shape, thin handle | 60 | +15 if gray top |

#### Traps (5)

| ID | Name | Detection | Base Power | Bonus Conditions |
|----|------|-----------|------------|------------------|
| TR01 | Spike Trap | Pointy, bottom position | 70 | +20 if multiple spikes |
| TR02 | Pit | Hollow, bottom, wide | 65 | +15 if deep (tall) |
| TR03 | Snare | Loop shape, thin | 55 | +25 if has trigger |
| TR04 | Cage | Hollow, grid pattern | 60 | +20 if dense walls |
| TR05 | Decoy | Any shape, colorful | 40 | +30 if looks like creature |

#### Consumables (7)

| ID | Name | Detection | Base Power | Bonus Conditions |
|----|------|-----------|------------|------------------|
| C01 | Food | Small, green/brown | 80 | +10 if round |
| C02 | Health Potion | Small, red, round | 85 | +15 if has cork |
| C03 | Speed Potion | Small, blue, round | 80 | +15 if has cork |
| C04 | Strength Potion | Small, orange, round | 80 | +15 if has cork |
| C05 | Antidote | Small, green, round | 75 | +10 if has label |
| C06 | Water | Blue, any shape | 70 | +20 if in container |
| C07 | Berries | Small dots, red/blue | 65 | +15 if clustered |

```typescript
// COLOR PALETTE:
// 0: #000000 - Black      | 8: #FF8000 - Orange
// 1: #FFFFFF - White      | 9: #8000FF - Purple
// 2: #FF0000 - Red        | A: #0080FF - Light Blue
// 3: #00FF00 - Green      | B: #80FF00 - Lime
// 4: #0000FF - Blue       | C: #FF0080 - Pink
// 5: #FFFF00 - Yellow     | D: #808080 - Gray
// 6: #FF00FF - Magenta    | E: #C0C0C0 - Light Gray
// 7: #00FFFF - Cyan       | F: #804000 - Brown

const DRAWABLE_OBJECTS: DrawableObject[] = [
  // WEAPONS
  {
    id: 'W01',
    name: 'Spear',
    category: 'weapon',
    basePower: 60,
    detection: (a) => a.aspectRatio >= 3 && a.width <= 2,
    bonuses: [
      { condition: (a) => a.isPointy, bonus: 15, text: 'Sharp tip!' },
      { condition: (a) => a.dominantColor === 'F', bonus: 10, text: 'Wooden shaft!' },
    ],
    description: 'Long reach, good for keeping distance',
  },
  {
    id: 'W02',
    name: 'Sword',
    category: 'weapon',
    basePower: 65,
    detection: (a) => a.aspectRatio >= 2 && a.aspectRatio < 3 && a.width <= 2,
    bonuses: [
      { condition: (a) => a.density > 0.7, bonus: 10, text: 'Solid blade!' },
      { condition: (a) => a.dominantColor === 'D', bonus: 10, text: 'Steel!' },
    ],
    description: 'Balanced weapon for combat',
  },
  // ... (all 50 objects defined similarly)
];
```

---

## Events System

### Event Structure

```typescript
interface GameEvent {
  id: string;
  name: string;
  description: string;
  hint: string;
  type: EventType;
  minDay: number;           // Earliest day this can appear
  maxDay: number;           // Latest day (0 = no limit)
  probability: number;      // Base probability weight
  difficulty: number;       // 1-10, affects damage and rewards
  solutions: Solution[];
  rewards: Reward;
  punishment: Punishment;
}

type EventType = 
  | 'combat'        // Fight something
  | 'survival'      // Survive nature
  | 'exploration'   // Navigate/traverse
  | 'social'        // NPC interaction
  | 'mystery'       // Puzzle/choice
  | 'boss';         // Major fight

interface Solution {
  categories: DrawingCategory[];  // What drawings work
  effectiveness: number;          // Base success rate
  bonuses?: BonusCondition[];
  successText: string;
  failText: string;
}

interface Reward {
  xp: number;
  gold?: number;
  food?: number;
  materials?: number;
  item?: string;              // Special item ID
}

interface Punishment {
  damage: number;
  foodLoss?: number;
  goldLoss?: number;
  effect?: StatusEffect;      // Poison, bleeding, etc.
}
```

### Complete Event List (50 Events)

#### Combat Events (15)

| ID | Name | Days | Prob | Diff | Good Solutions | Damage |
|----|------|------|------|------|----------------|--------|
| E01 | Wolf Attack | 1-10 | 12% | 2 | weapon, fire, shelter | 20 |
| E02 | Bear Encounter | 5-20 | 8% | 5 | fire, distraction, shelter | 40 |
| E03 | Snake Strike | 1-15 | 10% | 2 | weapon, light, trap | 25 |
| E04 | Bandit Ambush | 8-25 | 7% | 6 | weapon, shield, trap, distraction | 45 |
| E05 | Wild Boar Charge | 3-18 | 9% | 4 | weapon, shelter, trap | 35 |
| E06 | Spider Nest | 5-20 | 6% | 4 | fire, weapon, light | 30 |
| E07 | Hawk Attack | 1-12 | 8% | 2 | shield, shelter, weapon | 15 |
| E08 | Hungry Wolves (Pack) | 10-25 | 5% | 7 | fire, shelter, weapon | 55 |
| E09 | Mountain Lion | 12-28 | 4% | 7 | fire, weapon, trap | 50 |
| E10 | Goblin Scout | 8-22 | 7% | 4 | weapon, trap, distraction | 30 |
| E11 | Skeleton Warrior | 15-30 | 4% | 6 | weapon, light, shield | 40 |
| E12 | Giant Rat Swarm | 5-18 | 8% | 3 | fire, trap, weapon | 25 |
| E13 | Venomous Frog | 3-15 | 6% | 3 | weapon, trap, light | 20+poison |
| E14 | Angry Bees | 2-12 | 9% | 2 | fire, water, shelter | 15 |
| E15 | Territorial Moose | 8-20 | 5% | 5 | distraction, shelter, weapon | 45 |

#### Survival Events (15)

| ID | Name | Days | Prob | Diff | Good Solutions | Damage |
|----|------|------|------|------|----------------|--------|
| E16 | Freezing Night | 1-30 | 10% | 3 | fire, shelter, armor | 25 |
| E17 | Starvation | 3-30 | 8% | 3 | food, trap, weapon | 30 |
| E18 | Dehydration | 2-30 | 8% | 3 | water, tool, food | 25 |
| E19 | Heat Wave | 5-25 | 6% | 4 | water, shelter, tool | 30 |
| E20 | Thunderstorm | 3-20 | 9% | 4 | shelter, armor, tool | 35 |
| E21 | Poisoned! | 8-30 | 5% | 5 | potion, water, food | 40+poison |
| E22 | Injury | 5-30 | 7% | 4 | potion, tool, shelter | 20+bleed |
| E23 | Exhaustion | 10-30 | 6% | 3 | shelter, food, fire | 15 |
| E24 | Blizzard | 12-30 | 4% | 6 | shelter, fire, armor | 45 |
| E25 | Sandstorm | 10-25 | 4% | 5 | shelter, armor, tool | 35 |
| E26 | Flood | 8-22 | 5% | 5 | boat, bridge, rope | 40 |
| E27 | Landslide | 12-28 | 3% | 6 | shelter, shield, tool | 50 |
| E28 | Sickness | 5-30 | 7% | 4 | potion, fire, food | 30+weak |
| E29 | Nightmare | 8-30 | 6% | 2 | light, fire, shield | 10 |
| E30 | Quicksand | 6-20 | 5% | 4 | rope, tool, bridge | 35 |

#### Exploration Events (12)

| ID | Name | Days | Prob | Diff | Good Solutions | Damage |
|----|------|------|------|------|----------------|--------|
| E31 | River Crossing | 1-20 | 12% | 2 | boat, bridge, rope | 20 |
| E32 | Cliff Descent | 5-25 | 7% | 4 | rope, tool, bridge | 35 |
| E33 | Dense Jungle | 3-18 | 8% | 3 | weapon, tool, fire | 20 |
| E34 | Dark Cave | 5-22 | 9% | 4 | light, fire, rope | 30 |
| E35 | Swamp Navigation | 8-25 | 6% | 5 | boat, bridge, tool | 35 |
| E36 | Mountain Pass | 10-28 | 5% | 5 | rope, tool, shelter | 40 |
| E37 | Fallen Tree Blocks Path | 2-15 | 10% | 2 | weapon, tool, fire | 15 |
| E38 | Locked Gate | 8-25 | 5% | 3 | tool, weapon, trap | 25 |
| E39 | Crumbling Bridge | 5-20 | 7% | 4 | rope, bridge, tool | 35 |
| E40 | Lost in Fog | 6-22 | 6% | 3 | light, fire, tool | 20 |
| E41 | Raging Rapids | 8-25 | 5% | 5 | boat, rope, bridge | 45 |
| E42 | Thorny Thicket | 3-18 | 8% | 2 | weapon, fire, armor | 20 |

#### Social Events (5)

| ID | Name | Days | Prob | Diff | Good Solutions | Damage |
|----|------|------|------|------|----------------|--------|
| E43 | Wandering Merchant | 5-25 | 6% | 1 | gold (trade) | 0 |
| E44 | Lost Traveler | 3-20 | 7% | 2 | food, light, shelter | 0 |
| E45 | Hermit's Challenge | 10-28 | 4% | 5 | any (puzzle) | 25 |
| E46 | Rival Survivor | 8-25 | 5% | 4 | weapon, distraction, trap | 35 |
| E47 | Friendly Camp | 5-20 | 6% | 1 | food (share for bonus) | 0 |

#### Mystery Events (3)

| ID | Name | Days | Prob | Diff | Good Solutions | Damage |
|----|------|------|------|------|----------------|--------|
| E48 | Ancient Shrine | 12-30 | 3% | 3 | light, tool, potion | 20 |
| E49 | Mysterious Chest | 8-25 | 4% | 4 | tool, trap, weapon | 30 |
| E50 | Strange Noise | 5-30 | 8% | 2 | light, fire, weapon | 15 |

### Event Probability Calculation

```typescript
function selectEvent(day: number, previousEvents: string[]): GameEvent {
  // Filter eligible events
  const eligible = EVENTS.filter(e => 
    day >= e.minDay && 
    (e.maxDay === 0 || day <= e.maxDay) &&
    !previousEvents.slice(-3).includes(e.id)  // No repeat within 3 days
  );
  
  // Weight by probability and day scaling
  const weights = eligible.map(e => {
    let weight = e.probability;
    
    // Increase combat probability in later days
    if (e.type === 'combat' && day > 15) {
      weight *= 1.2;
    }
    
    // Increase boss events near day 30
    if (e.type === 'boss' && day >= 25) {
      weight *= 2;
    }
    
    return { event: e, weight };
  });
  
  // Weighted random selection
  const totalWeight = weights.reduce((sum, w) => sum + w.weight, 0);
  let random = Math.random() * totalWeight;
  
  for (const { event, weight } of weights) {
    random -= weight;
    if (random <= 0) return event;
  }
  
  return weights[0].event;  // Fallback
}
```

### Detailed Event Definitions

```typescript
const EVENTS: GameEvent[] = [
  {
    id: 'E01',
    name: 'Wolf Attack',
    description: 'A hungry wolf emerges from the bushes, growling!',
    hint: 'Fight it off, scare it, or hide!',
    type: 'combat',
    minDay: 1,
    maxDay: 10,
    probability: 12,
    difficulty: 2,
    solutions: [
      {
        categories: ['weapon'],
        effectiveness: 65,
        bonuses: [
          { check: (a) => a.isPointy, bonus: 15, text: 'Sharp!' },
          { check: (a) => a.height >= 5, bonus: 10, text: 'Long reach!' },
        ],
        successText: 'You strike at the wolf! It yelps and runs away!',
        failText: 'You swing but miss! The wolf bites your arm!',
      },
      {
        categories: ['fire'],
        effectiveness: 80,
        bonuses: [
          { check: (a) => a.width >= 3, bonus: 15, text: 'Big flames!' },
        ],
        successText: 'The wolf is terrified of fire! It flees into the night!',
        failText: 'Your fire sputters out. The wolf attacks!',
      },
      {
        categories: ['shelter'],
        effectiveness: 90,
        bonuses: [],
        successText: 'You hide in your shelter. The wolf loses interest and leaves.',
        failText: 'Your shelter has gaps! The wolf finds a way in!',
      },
      {
        categories: ['distraction'],
        effectiveness: 45,
        bonuses: [
          { check: (a) => a.colorCount >= 3, bonus: 20, text: 'Eye-catching!' },
        ],
        successText: 'The wolf investigates your distraction. You sneak away.',
        failText: 'The wolf ignores it completely!',
      },
    ],
    rewards: { xp: 25, gold: 10 },
    punishment: { damage: 20 },
  },
  
  {
    id: 'E02',
    name: 'Bear Encounter',
    description: 'A massive bear blocks your path, sniffing the air...',
    hint: 'Fighting is risky! Maybe scare it or avoid it?',
    type: 'combat',
    minDay: 5,
    maxDay: 20,
    probability: 8,
    difficulty: 5,
    solutions: [
      {
        categories: ['fire'],
        effectiveness: 85,
        bonuses: [
          { check: (a) => a.height >= 4, bonus: 10, text: 'Tall flames!' },
        ],
        successText: 'The bear panics at the flames and crashes away!',
        failText: 'The fire angers the bear! It charges!',
      },
      {
        categories: ['distraction'],
        effectiveness: 70,
        bonuses: [
          { check: (a) => a.density < 0.3, bonus: 15, text: 'Confusing!' },
        ],
        successText: 'The bear investigates your distraction. You slip away.',
        failText: 'The bear sees through your trick!',
      },
      {
        categories: ['shelter'],
        effectiveness: 75,
        bonuses: [
          { check: (a) => a.density > 0.6, bonus: 15, text: 'Sturdy!' },
        ],
        successText: 'You hide until the bear wanders off.',
        failText: 'The bear smells you inside...',
      },
      {
        categories: ['weapon'],
        effectiveness: 35,
        bonuses: [
          { check: (a) => a.height >= 6, bonus: 20, text: 'Long weapon!' },
        ],
        successText: 'Against all odds, you fend off the bear!',
        failText: 'The bear swats your weapon away like a toy!',
      },
    ],
    rewards: { xp: 60, gold: 25, materials: 10 },
    punishment: { damage: 40 },
  },
  
  {
    id: 'E16',
    name: 'Freezing Night',
    description: 'The temperature plummets. You can see your breath freezing!',
    hint: 'You need warmth to survive!',
    type: 'survival',
    minDay: 1,
    maxDay: 30,
    probability: 10,
    difficulty: 3,
    solutions: [
      {
        categories: ['fire'],
        effectiveness: 95,
        bonuses: [
          { check: (a) => a.width >= 3 && a.height >= 3, bonus: 5, text: 'Warm!' },
        ],
        successText: 'You huddle around the fire until dawn. Warm and safe.',
        failText: 'The fire dies out in the wind. The cold seeps into your bones.',
      },
      {
        categories: ['shelter'],
        effectiveness: 80,
        bonuses: [
          { check: (a) => a.isHollow, bonus: 15, text: 'Insulated!' },
        ],
        successText: 'Your shelter blocks the wind. You shiver but survive.',
        failText: 'Your shelter has too many gaps! The cold gets in.',
      },
      {
        categories: ['armor'],
        effectiveness: 60,
        bonuses: [
          { check: (a) => a.density > 0.7, bonus: 20, text: 'Thick!' },
        ],
        successText: 'Your makeshift clothing keeps you warm enough.',
        failText: 'It\'s not enough. The cold is unbearable.',
      },
    ],
    rewards: { xp: 30 },
    punishment: { damage: 25 },
  },
  
  {
    id: 'E31',
    name: 'River Crossing',
    description: 'A wide river blocks your path. The current looks strong.',
    hint: 'Find a way across safely!',
    type: 'exploration',
    minDay: 1,
    maxDay: 20,
    probability: 12,
    difficulty: 2,
    solutions: [
      {
        categories: ['boat'],
        effectiveness: 85,
        bonuses: [
          { check: (a) => a.width >= 4, bonus: 10, text: 'Stable!' },
        ],
        successText: 'You paddle across safely!',
        failText: 'Your boat tips over! You lose some supplies.',
      },
      {
        categories: ['bridge'],
        effectiveness: 75,
        bonuses: [
          { check: (a) => a.width >= 6, bonus: 20, text: 'Long enough!' },
        ],
        successText: 'You carefully cross your makeshift bridge!',
        failText: 'The bridge is too short! You fall in!',
      },
      {
        categories: ['rope'],
        effectiveness: 55,
        bonuses: [
          { check: (a) => a.height >= 6, bonus: 25, text: 'Good length!' },
        ],
        successText: 'You swing across on your rope!',
        failText: 'The rope snaps! You plunge into the water!',
      },
    ],
    rewards: { xp: 20, gold: 5 },
    punishment: { damage: 20, foodLoss: 10 },
  },
  
  // ... (remaining 46 events defined similarly)
];
```

---

## Monsters

### Monster Structure

```typescript
interface Monster {
  id: string;
  name: string;
  description: string;
  tier: 1 | 2 | 3 | 4 | 5;     // Difficulty tier
  baseHp: number;
  baseAttack: number;
  baseDefense: number;
  speed: number;
  element: Element;
  abilities: Ability[];
  weaknesses: DrawingCategory[];
  resistances: DrawingCategory[];
  drops: Drop[];
  minDay: number;
  maxDay: number;
}

interface Ability {
  name: string;
  chance: number;         // % chance per turn
  effect: AbilityEffect;
}

type AbilityEffect = 
  | { type: 'damage', amount: number }
  | { type: 'heal', amount: number }
  | { type: 'buff', stat: string, amount: number }
  | { type: 'debuff', stat: string, amount: number, target: 'player' }
  | { type: 'status', status: StatusEffect };
```

### Complete Monster List (50 Monsters)

#### Tier 1 - Early Game (Days 1-10)

| ID | Name | HP | ATK | DEF | SPD | Element | Weak To | Resist |
|----|------|-----|-----|-----|-----|---------|---------|--------|
| M01 | Forest Wolf | 40 | 25 | 15 | 60 | neutral | fire, weapon | - |
| M02 | Wild Boar | 55 | 30 | 25 | 40 | earth | weapon, trap | fire |
| M03 | Giant Rat | 25 | 20 | 10 | 70 | dark | fire, trap | - |
| M04 | Venomous Snake | 20 | 35 | 5 | 80 | earth | weapon, trap | - |
| M05 | Angry Hawk | 30 | 25 | 10 | 90 | air | weapon, trap | fire |
| M06 | Cave Bat | 15 | 15 | 5 | 85 | dark | light, fire | - |
| M07 | Poison Frog | 20 | 15 | 10 | 50 | water | weapon, fire | water |
| M08 | Wild Dog | 35 | 22 | 12 | 65 | neutral | fire, weapon | - |
| M09 | Rabid Squirrel | 15 | 18 | 8 | 95 | neutral | trap, weapon | - |
| M10 | Swamp Leech | 20 | 20 | 5 | 30 | water | fire, light | water |

#### Tier 2 - Mid-Early Game (Days 6-15)

| ID | Name | HP | ATK | DEF | SPD | Element | Weak To | Resist |
|----|------|-----|-----|-----|-----|---------|---------|--------|
| M11 | Brown Bear | 90 | 45 | 30 | 35 | earth | fire, trap | weapon |
| M12 | Mountain Lion | 70 | 50 | 20 | 75 | neutral | fire, trap | - |
| M13 | Giant Spider | 50 | 35 | 25 | 55 | dark | fire, light | trap |
| M14 | Bee Swarm | 40 | 30 | 10 | 80 | air | fire, water | weapon |
| M15 | Crocodile | 80 | 55 | 40 | 25 | water | weapon, trap | water |
| M16 | Wolverine | 60 | 45 | 25 | 65 | neutral | fire, trap | - |
| M17 | Elk | 75 | 35 | 30 | 50 | earth | weapon, trap | - |
| M18 | Python | 55 | 40 | 20 | 40 | earth | fire, weapon | - |
| M19 | Territorial Moose | 85 | 40 | 35 | 45 | earth | fire, trap | weapon |
| M20 | Wild Cat | 45 | 40 | 15 | 85 | neutral | trap, weapon | - |

#### Tier 3 - Mid Game (Days 11-22)

| ID | Name | HP | ATK | DEF | SPD | Element | Weak To | Resist |
|----|------|-----|-----|-----|-----|---------|---------|--------|
| M21 | Goblin Scout | 60 | 40 | 30 | 60 | dark | light, fire | - |
| M22 | Orc Grunt | 100 | 55 | 45 | 35 | earth | fire, weapon | trap |
| M23 | Giant Wasp | 45 | 50 | 15 | 90 | air | fire, water | weapon |
| M24 | Dire Wolf | 80 | 55 | 30 | 70 | dark | fire, light | trap |
| M25 | Troll | 130 | 60 | 50 | 20 | earth | fire | weapon, trap |
| M26 | Harpy | 55 | 45 | 20 | 85 | air | weapon, trap | fire |
| M27 | Lizardman | 75 | 50 | 40 | 55 | water | fire, trap | water |
| M28 | Skeleton Warrior | 65 | 45 | 35 | 45 | dark | light, fire | weapon |
| M29 | Ghoul | 70 | 50 | 25 | 60 | dark | light, fire | weapon |
| M30 | Swamp Creature | 90 | 45 | 35 | 30 | water | fire, light | water |

#### Tier 4 - Late Game (Days 18-28)

| ID | Name | HP | ATK | DEF | SPD | Element | Weak To | Resist |
|----|------|-----|-----|-----|-----|---------|---------|--------|
| M31 | Orc Warrior | 120 | 65 | 55 | 40 | earth | fire | weapon |
| M32 | Goblin Shaman | 70 | 50 | 30 | 50 | dark | light, weapon | fire |
| M33 | Giant Scorpion | 100 | 70 | 50 | 45 | earth | fire, water | weapon |
| M34 | Cave Troll | 160 | 70 | 60 | 15 | earth | fire | all physical |
| M35 | Shadow Wolf | 90 | 65 | 35 | 80 | dark | light, fire | trap |
| M36 | Undead Knight | 110 | 60 | 65 | 30 | dark | light, fire | weapon |
| M37 | Wyvern | 100 | 75 | 45 | 75 | fire | water, weapon | fire |
| M38 | Stone Golem | 180 | 55 | 80 | 10 | earth | water | fire, weapon |
| M39 | Werewolf | 120 | 80 | 40 | 70 | dark | fire, light | weapon |
| M40 | Bandit Leader | 100 | 70 | 50 | 60 | neutral | trap, fire | - |

#### Tier 5 - End Game (Days 25-30)

| ID | Name | HP | ATK | DEF | SPD | Element | Weak To | Resist |
|----|------|-----|-----|-----|-----|---------|---------|--------|
| M41 | Orc Chieftain | 150 | 80 | 65 | 45 | earth | fire | weapon |
| M42 | Necromancer | 90 | 70 | 40 | 55 | dark | light, fire | weapon |
| M43 | Ice Giant | 200 | 85 | 70 | 20 | water | fire | water |
| M44 | Fire Elemental | 120 | 90 | 30 | 65 | fire | water | fire |
| M45 | Vampire Lord | 130 | 85 | 55 | 80 | dark | light, fire | weapon |
| M46 | Dragon Wyrmling | 180 | 95 | 75 | 50 | fire | water | fire, weapon |
| M47 | Demon | 160 | 100 | 60 | 70 | fire/dark | light, water | fire |
| M48 | Ancient Treant | 220 | 65 | 90 | 15 | earth | fire | water, weapon |
| M49 | Lich | 140 | 95 | 50 | 45 | dark | light, fire | weapon, trap |
| M50 | Alpha Dire Wolf | 170 | 90 | 55 | 85 | dark | fire, light | trap |

### Boss Monsters (Day 30)

| ID | Name | HP | ATK | DEF | SPD | Special |
|----|------|-----|-----|-----|-----|---------|
| B01 | Forest Guardian | 300 | 80 | 70 | 40 | Summons wolves |
| B02 | Mountain King | 350 | 100 | 90 | 30 | Earthquake attack |
| B03 | Shadow Lord | 280 | 110 | 50 | 80 | Teleport, fear |
| B04 | Dragon | 400 | 120 | 85 | 60 | Fire breath |
| B05 | The Survivor | 250 | 90 | 60 | 90 | Copies your drawings |

### Monster Stat Scaling

```typescript
function scaleMonster(base: Monster, day: number, playerLevel: number): Monster {
  // Scaling factor: 1.0 at day 1, ~2.0 at day 30
  const dayScale = 1 + (day - 1) * 0.035;
  
  // Additional scaling based on player level
  const levelScale = 1 + (playerLevel - 1) * 0.05;
  
  const totalScale = dayScale * levelScale;
  
  return {
    ...base,
    baseHp: Math.round(base.baseHp * totalScale),
    baseAttack: Math.round(base.baseAttack * totalScale),
    baseDefense: Math.round(base.baseDefense * totalScale),
  };
}
```

---

## Level & Progression System

### XP and Levels

```typescript
interface PlayerProgression {
  level: number;           // 1-20
  currentXp: number;
  xpToNextLevel: number;
  totalXp: number;
}

// XP curve: Each level requires more XP
function getXpForLevel(level: number): number {
  return Math.floor(50 * Math.pow(level, 1.5));
}

// Level 1: 50 XP
// Level 5: 279 XP
// Level 10: 790 XP
// Level 15: 1452 XP
// Level 20: 2236 XP

const XP_TABLE = [
  0,      // Level 1 (start)
  50,     // Level 2
  119,    // Level 3
  200,    // Level 4
  279,    // Level 5
  367,    // Level 6
  458,    // Level 7
  553,    // Level 8
  650,    // Level 9
  790,    // Level 10
  894,    // Level 11
  1000,   // Level 12
  1109,   // Level 13
  1279,   // Level 14
  1452,   // Level 15
  1575,   // Level 16
  1700,   // Level 17
  1900,   // Level 18
  2066,   // Level 19
  2236,   // Level 20
];
```

### Level-Up Stat Bonuses

```typescript
function applyLevelUp(player: Player): void {
  player.level++;
  
  // Base stat increases per level
  player.maxHp += 10;
  player.attack += 3;
  player.defense += 3;
  player.speed += 2;
  player.luck += 1;
  
  // Full heal on level up
  player.hp = player.maxHp;
  
  // Trigger upgrade selection
  showUpgradeSelection(player);
}
```

### XP Sources

| Source | Base XP | Notes |
|--------|---------|-------|
| Event Success | 15-80 | Based on difficulty |
| Monster Kill | 20-150 | Based on tier |
| Day Survived | 10 | Flat bonus |
| Perfect Solution | +50% | No damage taken |
| Boss Kill | 200-500 | End-game reward |

---

## Roguelike Upgrades

### Upgrade System

After each level-up, players choose 1 of 3 random upgrades. Upgrades persist for the entire run.

```typescript
interface Upgrade {
  id: string;
  name: string;
  description: string;
  rarity: 'common' | 'uncommon' | 'rare' | 'legendary';
  maxStacks: number;       // How many times you can take this
  effect: UpgradeEffect;
}

type UpgradeEffect =
  | { type: 'stat', stat: string, value: number, isPercent: boolean }
  | { type: 'category_boost', category: DrawingCategory, value: number }
  | { type: 'element_boost', element: Element, value: number }
  | { type: 'heal', value: number }
  | { type: 'special', specialId: string };

function selectUpgradeOptions(player: Player): Upgrade[] {
  const available = UPGRADES.filter(u => {
    // Check if max stacks reached
    const currentStacks = player.upgrades.filter(p => p.id === u.id).length;
    if (currentStacks >= u.maxStacks) return false;
    
    // Rarity weighting
    return true;
  });
  
  // Weight by rarity
  const weights = {
    common: 50,
    uncommon: 30,
    rare: 15,
    legendary: 5,
  };
  
  // Select 3 random upgrades
  return weightedRandomSelection(available, weights, 3);
}
```

### Complete Upgrade List (50 Upgrades)

#### Stat Upgrades (15)

| ID | Name | Rarity | Effect | Max |
|----|------|--------|--------|-----|
| U01 | Tough Skin | Common | +15 Max HP | 5 |
| U02 | Iron Muscles | Common | +8 Attack | 5 |
| U03 | Stone Wall | Common | +8 Defense | 5 |
| U04 | Quick Feet | Common | +10 Speed | 5 |
| U05 | Lucky Charm | Common | +5 Luck | 5 |
| U06 | Vitality | Uncommon | +10% Max HP | 3 |
| U07 | Strength | Uncommon | +10% Attack | 3 |
| U08 | Fortitude | Uncommon | +10% Defense | 3 |
| U09 | Agility | Uncommon | +10% Speed | 3 |
| U10 | Fortune | Uncommon | +15% Luck | 3 |
| U11 | Giant's Blood | Rare | +50 Max HP | 2 |
| U12 | Berserker | Rare | +25 Attack, -10 Defense | 2 |
| U13 | Fortress | Rare | +25 Defense, -10 Speed | 2 |
| U14 | Wind Walker | Rare | +30 Speed, -15 Defense | 2 |
| U15 | Golden Touch | Legendary | +25 All Stats | 1 |

#### Drawing Category Boosts (12)

| ID | Name | Rarity | Effect | Max |
|----|------|--------|--------|-----|
| U16 | Weaponmaster | Common | +15% Weapon effectiveness | 3 |
| U17 | Fire Starter | Common | +15% Fire effectiveness | 3 |
| U18 | Architect | Common | +15% Shelter effectiveness | 3 |
| U19 | Trapsmith | Common | +15% Trap effectiveness | 3 |
| U20 | Shipwright | Uncommon | +20% Boat/Bridge effectiveness | 2 |
| U21 | Pyromancer | Uncommon | +25% Fire effectiveness | 2 |
| U22 | Defender | Uncommon | +20% Shield/Armor effectiveness | 2 |
| U23 | Alchemist | Uncommon | +30% Potion effectiveness | 2 |
| U24 | Master Builder | Rare | +35% All shelter/construction | 2 |
| U25 | Weapons Expert | Rare | +35% All weapon types | 2 |
| U26 | Elementalist | Rare | +30% Fire/Water/Light | 1 |
| U27 | Universal Craft | Legendary | +25% ALL drawing categories | 1 |

#### Special Abilities (15)

| ID | Name | Rarity | Effect | Max |
|----|------|--------|--------|-----|
| U28 | Second Wind | Common | 20% heal after surviving event | 3 |
| U29 | Scavenger | Common | +25% resource drops | 3 |
| U30 | Thick Skin | Common | -3 damage from all sources | 3 |
| U31 | Quick Draw | Uncommon | +5 seconds drawing time | 2 |
| U32 | Efficient | Uncommon | -20% food consumption | 2 |
| U33 | Merchant | Uncommon | -20% shop prices | 2 |
| U34 | Adrenaline | Uncommon | +20% damage at low HP | 2 |
| U35 | Regeneration | Rare | Heal 5 HP per day | 2 |
| U36 | Dodge Master | Rare | 15% chance to avoid damage | 2 |
| U37 | Critical Eye | Rare | +20% crit chance | 2 |
| U38 | Vampiric | Rare | Heal 20% of damage dealt | 1 |
| U39 | Phoenix | Legendary | Survive death once per run with 50% HP | 1 |
| U40 | Time Bender | Legendary | +10 seconds drawing time | 1 |
| U41 | Perfectionist | Legendary | Perfect solutions give 2x rewards | 1 |
| U42 | Lucky Star | Legendary | 25% chance for free reroll | 1 |

#### Synergy Upgrades (8)

| ID | Name | Rarity | Effect | Requirement |
|----|------|--------|--------|-------------|
| U43 | Burning Weapons | Rare | Weapons deal fire damage | Have Fire Starter |
| U44 | Fortress Fire | Rare | Shelter heals 10 HP | Have Architect |
| U45 | Trap Master | Rare | Traps do 2x damage | Have Trapsmith x2 |
| U46 | Swift Strike | Rare | Speed adds to attack | Have Quick Feet x3 |
| U47 | Tank | Legendary | Defense reduces damage by 50% | Have Fortitude x3 |
| U48 | Glass Cannon | Legendary | 2x attack, 50% max HP | Have Strength x3 |
| U49 | Elemental Master | Legendary | +50% all elemental damage | Have Elementalist |
| U50 | Survivor | Legendary | +100% effectiveness below 25% HP | Have Adrenaline x2 |

### Upgrade Selection UI

```
┌─────────────────────────────────────────────────────────┐
│  ⬆️ LEVEL UP! Choose an upgrade:                        │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ┌─────────────────┐  ┌─────────────────┐             │
│  │ ⭐ COMMON       │  │ ⭐⭐ UNCOMMON   │             │
│  │                 │  │                 │             │
│  │  Tough Skin    │  │  Pyromancer     │             │
│  │                 │  │                 │             │
│  │  +15 Max HP    │  │  +25% Fire      │             │
│  │                 │  │  effectiveness  │             │
│  │  [Select]      │  │  [Select]      │             │
│  └─────────────────┘  └─────────────────┘             │
│                                                         │
│  ┌─────────────────┐                                   │
│  │ ⭐⭐⭐ RARE     │                                   │
│  │                 │                                   │
│  │  Dodge Master   │                                   │
│  │                 │                                   │
│  │  15% chance to  │                                   │
│  │  avoid damage   │                                   │
│  │                 │                                   │
│  │  [Select]      │                                   │
│  └─────────────────┘                                   │
│                                                         │
│  [🎲 Reroll - 50 Gold]                                 │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

---

## World Scaling

### Day-Based Difficulty

```typescript
interface WorldState {
  day: number;
  difficulty: number;      // 1.0 - 3.0
  eventTier: number;       // 1-5
  monsterTier: number;     // 1-5
}

function calculateWorldState(day: number): WorldState {
  // Difficulty scales from 1.0 to 3.0 over 30 days
  const difficulty = 1 + (day - 1) * (2 / 29);
  
  // Event and monster tiers
  let eventTier: number;
  let monsterTier: number;
  
  if (day <= 5) {
    eventTier = 1;
    monsterTier = 1;
  } else if (day <= 10) {
    eventTier = 2;
    monsterTier = Math.random() < 0.7 ? 1 : 2;
  } else if (day <= 15) {
    eventTier = 2;
    monsterTier = 2;
  } else if (day <= 20) {
    eventTier = 3;
    monsterTier = Math.random() < 0.6 ? 2 : 3;
  } else if (day <= 25) {
    eventTier = 4;
    monsterTier = Math.random() < 0.5 ? 3 : 4;
  } else {
    eventTier = 5;
    monsterTier = Math.random() < 0.4 ? 4 : 5;
  }
  
  return { day, difficulty, eventTier, monsterTier };
}
```

### Scaling Table

| Day | Difficulty | Event Tier | Monster Tier | Monster HP Scale | Damage Scale |
|-----|------------|------------|--------------|------------------|--------------|
| 1-5 | 1.0-1.3 | 1 | 1 | 100% | 100% |
| 6-10 | 1.3-1.6 | 2 | 1-2 | 115% | 115% |
| 11-15 | 1.7-2.0 | 2-3 | 2 | 135% | 130% |
| 16-20 | 2.0-2.3 | 3-4 | 2-3 | 160% | 150% |
| 21-25 | 2.4-2.7 | 4 | 3-4 | 190% | 175% |
| 26-30 | 2.7-3.0 | 5 | 4-5 | 225% | 200% |

### Reward Scaling

```typescript
function scaleRewards(baseRewards: Reward, day: number): Reward {
  const scale = 1 + (day - 1) * 0.05;  // +5% per day
  
  return {
    xp: Math.round(baseRewards.xp * scale),
    gold: baseRewards.gold ? Math.round(baseRewards.gold * scale) : undefined,
    food: baseRewards.food ? Math.round(baseRewards.food * scale) : undefined,
    materials: baseRewards.materials ? Math.round(baseRewards.materials * scale) : undefined,
    item: baseRewards.item,
  };
}
```

---

## Technical Implementation

### Game State

```typescript
interface GameState {
  // Run info
  runId: string;
  startedAt: number;
  seed: number;            // For deterministic random
  
  // Player
  player: Player;
  
  // Progress
  day: number;
  phase: GamePhase;
  
  // World
  world: WorldState;
  
  // History
  eventHistory: string[];  // Event IDs
  drawingHistory: DrawingRecord[];
}

interface Player {
  // Identity
  name: string;
  characterPixels: string;  // The drawn character
  
  // Base stats (from character creation)
  baseStats: CharacterStats;
  
  // Current stats (with upgrades)
  maxHp: number;
  hp: number;
  attack: number;
  defense: number;
  speed: number;
  luck: number;
  element: Element;
  trait: Trait;
  
  // Progression
  level: number;
  xp: number;
  
  // Resources
  food: number;
  gold: number;
  materials: number;
  
  // Upgrades
  upgrades: Upgrade[];
  
  // Status effects
  effects: StatusEffect[];
}

type GamePhase =
  | 'character_creation'
  | 'day_start'
  | 'event_intro'
  | 'drawing'
  | 'event_result'
  | 'level_up'
  | 'day_end'
  | 'game_over'
  | 'victory';
```

### Event Processing

```typescript
function processEvent(
  state: GameState,
  event: GameEvent,
  pixels: string[]
): EventResult {
  const analysis = analyzeShape(pixels);
  
  if (!analysis) {
    return {
      success: false,
      message: "You didn't draw anything!",
      damage: event.punishment.damage,
      category: 'unknown',
    };
  }
  
  const category = detectCategory(analysis);
  const solution = event.solutions.find(s => s.categories.includes(category));
  
  if (!solution) {
    return {
      success: false,
      message: `Your ${category} doesn't help here...`,
      damage: event.punishment.damage,
      category,
    };
  }
  
  // Calculate effectiveness
  let effectiveness = solution.effectiveness;
  const bonuses: string[] = [];
  
  // Apply solution bonuses
  if (solution.bonuses) {
    for (const bonus of solution.bonuses) {
      if (bonus.check(analysis)) {
        effectiveness += bonus.bonus;
        bonuses.push(bonus.text);
      }
    }
  }
  
  // Apply player upgrades
  const categoryBoost = getUpgradeBoost(state.player, 'category', category);
  effectiveness += categoryBoost;
  
  // Apply player trait
  const traitBoost = getTraitBoost(state.player.trait, category);
  effectiveness += traitBoost;
  
  // Apply luck
  effectiveness += state.player.luck * 0.5;
  
  // Cap at 95%
  effectiveness = Math.min(95, effectiveness);
  
  // Roll!
  const roll = Math.random() * 100;
  const success = roll < effectiveness;
  
  // Calculate final damage/rewards
  let damage = 0;
  let rewards = { ...event.rewards };
  
  if (success) {
    rewards = scaleRewards(rewards, state.day);
    
    // Perfect solution bonus
    if (roll < effectiveness * 0.5) {
      rewards.xp = Math.round(rewards.xp * 1.5);
      bonuses.push('Perfect!');
    }
  } else {
    damage = event.punishment.damage;
    
    // Apply defense
    damage = Math.max(1, damage - Math.floor(state.player.defense * 0.3));
    
    // Apply dodge chance from upgrades
    const dodgeChance = getUpgradeValue(state.player, 'dodge');
    if (Math.random() * 100 < dodgeChance) {
      damage = 0;
      bonuses.push('Dodged!');
    }
  }
  
  return {
    success,
    category,
    effectiveness: Math.round(effectiveness),
    roll: Math.round(roll),
    bonuses,
    message: success ? solution.successText : solution.failText,
    damage,
    rewards: success ? rewards : undefined,
  };
}
```

### Save System (LocalStorage)

```typescript
interface SaveData {
  // Current run
  currentRun: GameState | null;
  
  // Persistent data
  statistics: PlayerStatistics;
  achievements: string[];
  highscores: Highscore[];
  
  // Settings
  settings: GameSettings;
}

interface PlayerStatistics {
  totalRuns: number;
  totalDaysSurvived: number;
  totalMonstersKilled: number;
  totalEventsCompleted: number;
  bestDay: number;
  bestScore: number;
  totalDrawings: number;
  favoriteCategory: DrawingCategory;
}

function saveGame(state: GameState): void {
  const saveData: SaveData = {
    currentRun: state,
    statistics: loadStatistics(),
    achievements: loadAchievements(),
    highscores: loadHighscores(),
    settings: loadSettings(),
  };
  
  localStorage.setItem('pixel_survivor_save', JSON.stringify(saveData));
}

function loadGame(): GameState | null {
  const raw = localStorage.getItem('pixel_survivor_save');
  if (!raw) return null;
  
  const saveData: SaveData = JSON.parse(raw);
  return saveData.currentRun;
}
```

---

## UI Flow

### Main Menu

```
┌─────────────────────────────────────────────────────────┐
│                                                         │
│             ██████╗ ██╗██╗  ██╗███████╗██╗             │
│             ██╔══██╗██║╚██╗██╔╝██╔════╝██║             │
│             ██████╔╝██║ ╚███╔╝ █████╗  ██║             │
│             ██╔═══╝ ██║ ██╔██╗ ██╔══╝  ██║             │
│             ██║     ██║██╔╝ ██╗███████╗███████╗        │
│             ╚═╝     ╚═╝╚═╝  ╚═╝╚══════╝╚══════╝        │
│                                                         │
│             ███████╗██╗   ██╗██████╗ ██╗   ██╗         │
│             ██╔════╝██║   ██║██╔══██╗██║   ██║         │
│             ███████╗██║   ██║██████╔╝██║   ██║         │
│             ╚════██║██║   ██║██╔══██╗╚██╗ ██╔╝         │
│             ███████║╚██████╔╝██║  ██║ ╚████╔╝          │
│             ╚══════╝ ╚═════╝ ╚═╝  ╚═╝  ╚═══╝           │
│                                                         │
│                    [New Run]                           │
│                                                         │
│                    [Continue]                          │
│                                                         │
│                    [Statistics]                        │
│                                                         │
│                    [How to Play]                       │
│                                                         │
│                                                         │
│  Best Run: Day 23 | High Score: 12,450                 │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### Drawing Screen

```
┌─────────────────────────────────────────────────────────┐
│  Day 7 | ❤️ 65/80 | 🍖 60 | 💰 45 | Lv.4               │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ⚠️ WOLF ATTACK!                                        │
│  "A hungry wolf emerges from the bushes!"              │
│                                                         │
│  ┌────────────────────────────────────────────────┐    │
│  │                                                │    │
│  │                                                │    │
│  │             [8x8 Drawing Grid]                │    │
│  │                                                │    │
│  │                                                │    │
│  └────────────────────────────────────────────────┘    │
│                                                         │
│  [Color Palette - 16 colors]                           │
│  ⬜⬛🟥🟧🟨🟩🟦🟪 ...                                  │
│                                                         │
│  HINT: Weapons, fire, or shelter might work!           │
│                                                         │
│  ⏱️ 12 seconds remaining                               │
│                                                         │
│  [Clear] [Undo]                    [Submit Drawing →]  │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### Result Screen

```
┌─────────────────────────────────────────────────────────┐
│  Day 7 | WOLF ATTACK - RESULT                          │
├─────────────────────────────────────────────────────────┤
│                                                         │
│    Your Drawing:         Analysis:                     │
│  ┌────────────────┐                                    │
│  │ ⬜⬜⬜🟫⬜⬜⬜⬜ │      Category: WEAPON              │
│  │ ⬜⬜⬜🟫⬜⬜⬜⬜ │      ├── Tall shape ✓             │
│  │ ⬜⬜⬜🟫⬜⬜⬜⬜ │      ├── Thin ✓                   │
│  │ ⬜⬜⬜🟫⬜⬜⬜⬜ │      └── Pointy ✓                 │
│  │ ⬜⬜⬜🟫⬜⬜⬜⬜ │                                    │
│  │ ⬜⬜⬜🟫⬜⬜⬜⬜ │      Base: 65%                     │
│  │ ⬜⬜⬜🟫⬜⬜⬜⬜ │      Bonuses:                      │
│  │ ⬜⬜⬜⬜⬜⬜⬜⬜ │      ├── Sharp tip! +15%          │
│  └────────────────┘      ├── Long reach! +10%          │
│                          └── Luck +5%                  │
│                                                         │
│  ═══════════════════════════════════════════════════   │
│                                                         │
│  🎲 Roll: 42 vs 95%                                    │
│                                                         │
│  ✅ SUCCESS!                                           │
│  "You strike at the wolf! It yelps and runs away!"    │
│                                                         │
│  Rewards: +25 XP | +10 Gold                            │
│                                                         │
│                               [Continue → Day 8]       │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

---

## Summary

### Core Features

1. **Draw Your Character** → Stats based on design
2. **Draw to Survive** → Every challenge needs a drawn solution
3. **Roguelike Progression** → Permadeath, upgrades per run
4. **50 Events** → Combat, survival, exploration, social
5. **50 Monsters** → 5 tiers of difficulty
6. **50 Upgrades** → Choose on level-up
7. **50 Drawable Objects** → Weapons, tools, shelter, etc.
8. **30-Day Runs** → Survive to win
9. **No AI Recognition** → Pure geometric analysis

### Technical Requirements

- 8x8 pixel grid
- 16-color palette (0=Black, 1=White as background/empty)
- LocalStorage for saves
- No database needed
- No login required
- Mobile-first design

### Estimated Development Time

| Component | Time |
|-----------|------|
| Core drawing system | 8h |
| Shape analysis | 12h |
| Character creation | 8h |
| Event system | 16h |
| Monster system | 8h |
| Upgrade system | 10h |
| UI/UX | 20h |
| Testing/Balance | 16h |
| **Total** | **~100h** |

---

*Pixel Survivor - Draw to Live, Die to Draw Again*
