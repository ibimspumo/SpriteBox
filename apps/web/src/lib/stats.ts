// apps/web/src/lib/stats.ts
import { browser } from '$app/environment';
import { writable, get, derived } from 'svelte/store';
import type { GameModeStats } from './socket';

const STORAGE_KEY = 'spritebox-stats';
const HISTORY_STORAGE_KEY = 'spritebox-history';
const MAX_HISTORY_ENTRIES = 50; // Limit to prevent localStorage bloat

// === Legacy Stats (for backward compatibility) ===
export interface LegacyPlayerStats {
  gamesPlayed: number;
  placements: {
    1: number;
    2: number;
    3: number;
  };
}

// === New Multi-Mode Stats ===
export interface PlayerStats {
  // Stats per game mode (keyed by mode ID)
  byMode: Record<string, GameModeStats>;
  // Last sync timestamp
  lastSyncedAt?: number;
}

const defaultStats: PlayerStats = {
  byMode: {},
};

function getDefaultModeStats(): GameModeStats {
  return {
    gamesPlayed: 0,
    wins: 0,
    top3: 0,
    currentWinStreak: 0,
    bestWinStreak: 0,
  };
}

function loadStats(): PlayerStats {
  if (!browser) return defaultStats;

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);

      // Check if it's legacy format (has placements directly)
      if (parsed.placements && typeof parsed.placements === 'object') {
        // Migrate legacy stats to new format
        const legacyStats = parsed as LegacyPlayerStats;
        const migrated: PlayerStats = {
          byMode: {
            'pixel-battle': {
              gamesPlayed: legacyStats.gamesPlayed,
              wins: legacyStats.placements[1],
              top3: legacyStats.placements[1] + legacyStats.placements[2] + legacyStats.placements[3],
              currentWinStreak: 0,
              bestWinStreak: 0,
            },
          },
        };
        // Save migrated stats
        saveStats(migrated);
        console.log('[Stats] Migrated legacy stats to new format');
        return migrated;
      }

      // New format - validate structure
      if (parsed.byMode && typeof parsed.byMode === 'object') {
        return parsed as PlayerStats;
      }
    }
  } catch (e) {
    console.error('Failed to load stats:', e);
  }

  return defaultStats;
}

function saveStats(stats: PlayerStats): void {
  if (!browser) return;

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(stats));
  } catch (e) {
    console.error('Failed to save stats:', e);
  }
}

export const stats = writable<PlayerStats>(loadStats());

// Auto-save on changes
stats.subscribe((value) => {
  saveStats(value);
});

// === Derived Stores for Easy Access ===

/**
 * Get stats for a specific game mode
 */
export function getModeStats(gameMode: string): GameModeStats {
  const current = get(stats);
  return current.byMode[gameMode] ?? getDefaultModeStats();
}

/**
 * Derived store for total stats across all modes
 */
export const totalStats = derived(stats, ($stats) => {
  let totalGames = 0;
  let totalWins = 0;
  let totalTop3 = 0;
  let bestWinStreak = 0;

  for (const modeStats of Object.values($stats.byMode)) {
    totalGames += modeStats.gamesPlayed;
    totalWins += modeStats.wins;
    totalTop3 += modeStats.top3;
    if (modeStats.bestWinStreak > bestWinStreak) {
      bestWinStreak = modeStats.bestWinStreak;
    }
  }

  return { totalGames, totalWins, totalTop3, bestWinStreak };
});

/**
 * Updates stats after a game (called from server event)
 */
export function recordGameResult(gameMode: string, placement: number, extraData?: { accuracy?: number }): void {
  stats.update((s) => {
    const modeStats = s.byMode[gameMode] ?? getDefaultModeStats();

    // Update games played
    modeStats.gamesPlayed++;

    // Update placements
    if (placement === 1) {
      modeStats.wins++;
      modeStats.top3++;
      modeStats.currentWinStreak++;
      if (modeStats.currentWinStreak > modeStats.bestWinStreak) {
        modeStats.bestWinStreak = modeStats.currentWinStreak;
      }
    } else if (placement <= 3) {
      modeStats.top3++;
      modeStats.currentWinStreak = 0;
    } else {
      modeStats.currentWinStreak = 0;
    }

    // CopyCat specific: track best accuracy
    if (gameMode === 'copy-cat' && extraData?.accuracy !== undefined) {
      if (modeStats.bestAccuracy === undefined || extraData.accuracy > modeStats.bestAccuracy) {
        modeStats.bestAccuracy = extraData.accuracy;
      }
    }

    return {
      ...s,
      byMode: {
        ...s.byMode,
        [gameMode]: modeStats,
      },
    };
  });
}

/**
 * Resets all stats
 */
export function resetStats(): void {
  stats.set(defaultStats);
}

/**
 * Returns current stats without subscribing
 */
export function getStats(): PlayerStats {
  return get(stats);
}

// =============================================================================
// === Game History (stores individual game results with drawings) =============
// =============================================================================

/**
 * A single game history entry
 */
export interface GameHistoryEntry {
  id: string;              // Unique ID for the entry
  timestamp: number;       // When the game was played
  gameMode: string;        // e.g., 'pixel-battle', 'copy-cat'
  placement: number;       // User's final placement (1 = winner)
  totalPlayers: number;    // Total players in the game
  pixels: string;          // User's drawing (64-char hex string)
  prompt?: string;         // The prompt text (if available)
}

/**
 * Game history store
 */
const defaultHistory: GameHistoryEntry[] = [];

function loadHistory(): GameHistoryEntry[] {
  if (!browser) return defaultHistory;

  try {
    const stored = localStorage.getItem(HISTORY_STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed)) {
        return parsed as GameHistoryEntry[];
      }
    }
  } catch (e) {
    console.error('Failed to load game history:', e);
  }

  return defaultHistory;
}

function saveHistory(history: GameHistoryEntry[]): void {
  if (!browser) return;

  try {
    localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(history));
  } catch (e) {
    console.error('Failed to save game history:', e);
  }
}

export const gameHistory = writable<GameHistoryEntry[]>(loadHistory());

// Auto-save on changes
gameHistory.subscribe((value) => {
  saveHistory(value);
});

/**
 * Adds a new game to history
 */
export function addGameToHistory(entry: Omit<GameHistoryEntry, 'id' | 'timestamp'>): void {
  gameHistory.update((history) => {
    const newEntry: GameHistoryEntry = {
      ...entry,
      id: `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      timestamp: Date.now(),
    };

    // Add to beginning of array (newest first)
    const updated = [newEntry, ...history];

    // Limit history size
    if (updated.length > MAX_HISTORY_ENTRIES) {
      return updated.slice(0, MAX_HISTORY_ENTRIES);
    }

    return updated;
  });
}

/**
 * Gets history filtered by game mode
 */
export function getHistoryByMode(gameMode: string): GameHistoryEntry[] {
  return get(gameHistory).filter((entry) => entry.gameMode === gameMode);
}

/**
 * Gets recent history (last N entries)
 */
export function getRecentHistory(limit: number = 10): GameHistoryEntry[] {
  return get(gameHistory).slice(0, limit);
}

/**
 * Clears all game history
 */
export function clearHistory(): void {
  gameHistory.set([]);
}

/**
 * Derived store for history stats
 */
export const historyStats = derived(gameHistory, ($history) => {
  const byMode: Record<string, { games: number; wins: number; bestPlacement: number }> = {};

  for (const entry of $history) {
    if (!byMode[entry.gameMode]) {
      byMode[entry.gameMode] = { games: 0, wins: 0, bestPlacement: Infinity };
    }
    byMode[entry.gameMode].games++;
    if (entry.placement === 1) {
      byMode[entry.gameMode].wins++;
    }
    if (entry.placement < byMode[entry.gameMode].bestPlacement) {
      byMode[entry.gameMode].bestPlacement = entry.placement;
    }
  }

  return {
    totalGames: $history.length,
    byMode,
  };
});
