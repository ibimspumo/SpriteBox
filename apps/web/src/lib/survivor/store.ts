// apps/web/src/lib/survivor/store.ts
// Svelte stores for Pixel Survivor mode

import { writable, derived } from 'svelte/store';
import type {
  PixelSurvivorRun,
  PixelSurvivorStats,
  PixelSurvivorSettings,
  PixelSurvivorPhase,
  CharacterStats,
  DrawingAnalysis,
  SurvivorCharacter,
} from './types.js';
import { loadRun, loadStats, loadSettings, saveRun, saveStats, saveSettings, deleteRun } from './storage.js';
import { DEFAULT_STATS, DEFAULT_SETTINGS } from './types.js';

// XP required for each level (index = level - 1)
const XP_TABLE = [
  0, // Level 1 (start)
  50, // Level 2
  119, // Level 3
  200, // Level 4
  279, // Level 5
  367, // Level 6
  458, // Level 7
  553, // Level 8
  650, // Level 9
  790, // Level 10
  894, // Level 11
  1000, // Level 12
  1109, // Level 13
  1279, // Level 14
  1452, // Level 15
  1575, // Level 16
  1700, // Level 17
  1900, // Level 18
  2066, // Level 19
  2236, // Level 20
];

// ============================================
// CURRENT RUN STORE
// ============================================

export const survivorRun = writable<PixelSurvivorRun | null>(null);

// Character Creation State (separate from run, since run doesn't exist yet)
// Declared here because survivorPhase depends on it
export const isCreatingCharacter = writable<boolean>(false);

// Derived: Current Phase (accounts for character creation state)
export const survivorPhase = derived(
  [survivorRun, isCreatingCharacter],
  ([$run, $isCreating]): PixelSurvivorPhase => {
    if ($isCreating) return 'survivor-character';
    return $run?.phase ?? 'survivor-menu';
  }
);

// Derived: Is a run active?
export const hasActiveRun = derived(
  survivorRun,
  ($run) => $run !== null
);

// Derived: Character Stats (with upgrades applied)
export const effectiveStats = derived(
  survivorRun,
  ($run): CharacterStats | null => {
    if (!$run) return null;

    // TODO: Apply upgrade effects to base stats
    const base = $run.character.stats;
    return {
      ...base,
      maxHp: $run.maxHp,
    };
  }
);

// Derived: HP Percent
export const hpPercent = derived(
  survivorRun,
  ($run) => $run ? ($run.hp / $run.maxHp) * 100 : 100
);

// Derived: XP Percent
export const xpPercent = derived(
  survivorRun,
  ($run) => $run ? ($run.xp / $run.xpToNextLevel) * 100 : 0
);

// ============================================
// STATISTICS STORE
// ============================================

export const survivorStats = writable<PixelSurvivorStats>(DEFAULT_STATS);

// ============================================
// SETTINGS STORE
// ============================================

export const survivorSettings = writable<PixelSurvivorSettings>(DEFAULT_SETTINGS);

// ============================================
// UI STATE
// ============================================

// Drawing Phase State
export const currentDrawing = writable<string>('1'.repeat(64));
export const survivorSelectedColor = writable<number>(0);

// Analysis Result
export const analysisResult = writable<DrawingAnalysis | null>(null);

// UI Modal States
export const showStatsScreen = writable<boolean>(false);
export const showTutorial = writable<boolean>(false);

// ============================================
// ACTIONS
// ============================================

/**
 * Initialize Pixel Survivor - load saved data
 */
export function initializeSurvivor(): void {
  // Load saved run if exists
  const savedRun = loadRun();
  if (savedRun) {
    survivorRun.set(savedRun);
  }

  // Load stats
  const stats = loadStats();
  survivorStats.set(stats);

  // Load settings
  const settings = loadSettings();
  survivorSettings.set(settings);
}

/**
 * Reset to menu phase
 */
export function resetToMenu(): void {
  survivorRun.update((run) => {
    if (run) {
      return { ...run, phase: 'survivor-menu' as PixelSurvivorPhase };
    }
    return null;
  });
}

/**
 * Set the current phase
 */
export function setPhase(phase: PixelSurvivorPhase): void {
  survivorRun.update((run) => {
    if (run) {
      const updated = { ...run, phase };
      saveRun(updated);
      return updated;
    }
    return run;
  });
}

/**
 * Update run and auto-save
 */
export function updateRun(updater: (run: PixelSurvivorRun) => PixelSurvivorRun): void {
  survivorRun.update((run) => {
    if (run) {
      const updated = updater(run);
      saveRun(updated);
      return updated;
    }
    return run;
  });
}

/**
 * End the current run (game over or victory)
 */
export function endRun(won: boolean): void {
  const run = loadRun();
  if (!run) return;

  // Calculate run duration for fastest win tracking
  const duration = Date.now() - run.startedAt;

  // Update stats
  survivorStats.update((stats) => {
    const updated: PixelSurvivorStats = {
      ...stats,
      totalRuns: stats.totalRuns + 1,
      totalWins: stats.totalWins + (won ? 1 : 0),
      totalDeaths: stats.totalDeaths + (won ? 0 : 1),
      totalDaysSurvived: stats.totalDaysSurvived + run.day,
      bestDayReached: Math.max(stats.bestDayReached, run.day),
      totalMonstersKilled: stats.totalMonstersKilled + run.monstersKilled,
      totalEventsCompleted: stats.totalEventsCompleted + run.eventsCompleted,
      totalLevelsGained: stats.totalLevelsGained + run.level - 1,
      totalDrawings: stats.totalDrawings + run.drawingHistory.length,
      currentWinStreak: won ? stats.currentWinStreak + 1 : 0,
      bestWinStreak: won ? Math.max(stats.bestWinStreak, stats.currentWinStreak + 1) : stats.bestWinStreak,
      currentLossStreak: won ? 0 : stats.currentLossStreak + 1,
      // Track fastest win time
      fastestWin: won && (!stats.fastestWin || duration < stats.fastestWin) ? duration : stats.fastestWin,
    };
    saveStats(updated);
    return updated;
  });

  // Delete the run
  deleteRun();
  survivorRun.set(null);
}

/**
 * Clear run without ending (abandon)
 */
export function abandonRun(): void {
  deleteRun();
  survivorRun.set(null);
}

/**
 * Generate a unique run ID
 */
function generateRunId(): string {
  const randomPart = Array.from(crypto.getRandomValues(new Uint8Array(5)))
    .map(b => b.toString(36))
    .join('')
    .substring(0, 7);
  return `run_${Date.now()}_${randomPart}`;
}

/**
 * Start a new run with a character
 */
export function startNewRun(character: SurvivorCharacter): void {
  const now = Date.now();
  const maxHp = character.stats.maxHp;

  const newRun: PixelSurvivorRun = {
    // Meta
    version: 1,
    runId: generateRunId(),
    startedAt: now,
    lastSavedAt: now,
    seed: crypto.getRandomValues(new Uint32Array(1))[0] % 1000000,

    // Character
    character,

    // Current State
    day: 1,
    phase: 'survivor-day-start',

    // Resources
    hp: maxHp,
    maxHp,
    food: 100,
    gold: 0,
    materials: 0,

    // Progression
    level: 1,
    xp: 0,
    xpToNextLevel: XP_TABLE[1], // XP needed for level 2

    // Upgrades
    upgrades: [],

    // Status Effects
    effects: [],

    // History
    eventHistory: [],
    drawingHistory: [],
    monstersKilled: 0,
    eventsCompleted: 0,
  };

  // Save and set
  saveRun(newRun);
  survivorRun.set(newRun);

  // Exit character creation mode
  isCreatingCharacter.set(false);

  // Reset drawing state
  currentDrawing.set('1'.repeat(64));
  survivorSelectedColor.set(0);
}

/**
 * Enter character creation phase (for new run)
 */
export function enterCharacterCreation(): void {
  // Clear any existing run data
  deleteRun();
  survivorRun.set(null);

  // Enter character creation mode
  isCreatingCharacter.set(true);

  // Reset drawing state for character creation
  currentDrawing.set('1'.repeat(64));
  survivorSelectedColor.set(0);
}

/**
 * Exit character creation without starting a run
 */
export function cancelCharacterCreation(): void {
  isCreatingCharacter.set(false);
  currentDrawing.set('1'.repeat(64));
}

// ============================================
// SUBSCRIPTIONS FOR AUTO-SAVE
// ============================================

// Auto-save settings when changed
survivorSettings.subscribe((settings) => {
  if (settings.version > 0) {
    saveSettings(settings);
  }
});
