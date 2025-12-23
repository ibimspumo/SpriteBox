// apps/web/src/lib/survivor/types.ts
// Type definitions for Pixel Survivor mode

// === Game Phase ===
export type PixelSurvivorPhase =
  | 'survivor-menu'
  | 'survivor-character'
  | 'survivor-day-start'
  | 'survivor-event'
  | 'survivor-drawing'
  | 'survivor-result'
  | 'survivor-levelup'
  | 'survivor-boss'
  | 'survivor-gameover'
  | 'survivor-victory';

// === Elements ===
export type Element = 'fire' | 'water' | 'earth' | 'air' | 'dark' | 'light' | 'neutral';

// === Traits ===
export type Trait =
  | 'perfectionist'
  | 'chaotic'
  | 'bulky'
  | 'minimalist'
  | 'creative'
  | 'focused'
  | 'intellectual'
  | 'grounded'
  | 'balanced';

// === Event Categories ===
export type EventCategory = 'combat' | 'survival' | 'exploration' | 'social' | 'mystery' | 'boss';

// === Character Stats ===
export interface CharacterStats {
  maxHp: number;        // 50-150
  attack: number;       // 20-100
  defense: number;      // 20-100
  speed: number;        // 20-100
  luck: number;         // 10-50
  element: Element;
  trait: Trait;
}

// === Character ===
export interface SurvivorCharacter {
  pixels: string;       // 64-character hex string
  name: string;         // Optional character name
  stats: CharacterStats;
}

// === Status Effects ===
export interface StatusEffect {
  id: string;           // 'poison' | 'bleed' | 'weak' | 'burn'
  duration: number;     // Remaining days
  damage?: number;      // Damage per day
  statMod?: {
    stat: keyof CharacterStats;
    amount: number;
  };
}

// === Drawing Record ===
export interface DrawingRecord {
  day: number;
  eventId: string;
  pixels: string;
  category: string;
  success: boolean;
  timestamp: number;
}

// === Current Event ===
export interface CurrentEvent {
  eventId: string;
  drawnPixels?: string;
  analysisResult?: DrawingAnalysis;
  outcome?: 'pending' | 'success' | 'failure';
}

// === Drawing Analysis ===
export interface DrawingAnalysis {
  category: string;
  effectiveness: number;  // 0-100
  bonuses: string[];
  pixelCount: number;
}

// === Upgrade ===
export interface Upgrade {
  id: string;
  name: string;
  description: string;
  effect: UpgradeEffect;
  rarity: 'common' | 'uncommon' | 'rare' | 'legendary';
}

export interface UpgradeEffect {
  type: 'stat' | 'resource' | 'special';
  stat?: keyof CharacterStats;
  amount?: number;
  specialId?: string;
}

// === Boss State ===
export interface BossState {
  id: string;
  currentHp: number;
  maxHp: number;
  phase: number;
}

// === Current Run ===
export interface PixelSurvivorRun {
  // Meta
  version: number;
  runId: string;
  startedAt: number;
  lastSavedAt: number;
  seed: number;

  // Character
  character: SurvivorCharacter;

  // Current State
  day: number;          // 1-30
  phase: PixelSurvivorPhase;

  // Resources
  hp: number;
  maxHp: number;
  food: number;         // 0-100
  gold: number;
  materials: number;    // 0-50

  // Progression
  level: number;        // 1-20
  xp: number;
  xpToNextLevel: number;

  // Upgrades
  upgrades: string[];   // Upgrade IDs

  // Status Effects
  effects: StatusEffect[];

  // Current Event
  currentEvent?: CurrentEvent;

  // History
  eventHistory: string[];
  drawingHistory: DrawingRecord[];
  monstersKilled: number;
  eventsCompleted: number;

  // Boss State
  boss?: BossState;
}

// === Statistics ===
export interface PixelSurvivorStats {
  version: number;

  // Run Stats
  totalRuns: number;
  totalWins: number;
  totalDeaths: number;

  // Progress Stats
  totalDaysSurvived: number;
  bestDayReached: number;
  totalMonstersKilled: number;
  totalEventsCompleted: number;
  totalLevelsGained: number;

  // Drawing Stats
  totalDrawings: number;
  categoryUsage: Record<string, number>;
  favoriteCategory: string;

  // Resource Stats
  totalGoldEarned: number;
  totalDamageTaken: number;
  totalDamageDealt: number;
  totalHealing: number;

  // Timing Stats
  totalPlayTime: number;
  fastestWin: number | null;
  longestRun: number;

  // Streaks
  currentWinStreak: number;
  bestWinStreak: number;
  currentLossStreak: number;
}

// === Highscores ===
export interface HighscoreEntry {
  runId: string;
  date: number;
  score: number;
  dayReached: number;
  won: boolean;
  level: number;
  monstersKilled: number;
  characterPixels: string;
  characterName: string;
  trait: Trait;
  element: Element;
  duration: number;
  deathCause?: string;
}

export interface PixelSurvivorHighscores {
  version: number;
  entries: HighscoreEntry[];
}

// === Settings ===
export interface PixelSurvivorSettings {
  version: number;
  musicVolume: number;
  sfxVolume: number;
  musicEnabled: boolean;
  sfxEnabled: boolean;
  showDamageNumbers: boolean;
  showHints: boolean;
  reducedMotion: boolean;
  autoSubmit: boolean;
  confirmClear: boolean;
  tutorialCompleted: boolean;
  showTutorialTips: boolean;
}

// === Default Values ===
export const DEFAULT_STATS: PixelSurvivorStats = {
  version: 1,
  totalRuns: 0,
  totalWins: 0,
  totalDeaths: 0,
  totalDaysSurvived: 0,
  bestDayReached: 0,
  totalMonstersKilled: 0,
  totalEventsCompleted: 0,
  totalLevelsGained: 0,
  totalDrawings: 0,
  categoryUsage: {},
  favoriteCategory: '',
  totalGoldEarned: 0,
  totalDamageTaken: 0,
  totalDamageDealt: 0,
  totalHealing: 0,
  totalPlayTime: 0,
  fastestWin: null,
  longestRun: 0,
  currentWinStreak: 0,
  bestWinStreak: 0,
  currentLossStreak: 0,
};

export const DEFAULT_SETTINGS: PixelSurvivorSettings = {
  version: 1,
  musicVolume: 70,
  sfxVolume: 80,
  musicEnabled: true,
  sfxEnabled: true,
  showDamageNumbers: true,
  showHints: true,
  reducedMotion: false,
  autoSubmit: true,
  confirmClear: true,
  tutorialCompleted: false,
  showTutorialTips: true,
};

export const DEFAULT_HIGHSCORES: PixelSurvivorHighscores = {
  version: 1,
  entries: [],
};
