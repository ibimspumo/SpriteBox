// apps/web/src/lib/stats.ts
import { browser } from '$app/environment';
import { writable, get } from 'svelte/store';

const STORAGE_KEY = 'spritebox-stats';

export interface PlayerStats {
  gamesPlayed: number;
  placements: {
    1: number;
    2: number;
    3: number;
  };
}

const defaultStats: PlayerStats = {
  gamesPlayed: 0,
  placements: { 1: 0, 2: 0, 3: 0 },
};

function loadStats(): PlayerStats {
  if (!browser) return defaultStats;

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      // Validate structure
      if (
        typeof parsed.gamesPlayed === 'number' &&
        typeof parsed.placements === 'object' &&
        typeof parsed.placements[1] === 'number' &&
        typeof parsed.placements[2] === 'number' &&
        typeof parsed.placements[3] === 'number'
      ) {
        return parsed;
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

/**
 * Updates stats after a game
 */
export function recordGameResult(placement: number): void {
  stats.update((s) => {
    const updated = {
      gamesPlayed: s.gamesPlayed + 1,
      placements: { ...s.placements },
    };

    if (placement >= 1 && placement <= 3) {
      updated.placements[placement as 1 | 2 | 3]++;
    }

    return updated;
  });
}

/**
 * Resets all stats
 */
export function resetStats(): void {
  stats.set(defaultStats);
}

/**
 * Syncs stats with server
 */
export function syncStatsWithServer(socket: { emit: (event: 'sync-stats', data: PlayerStats) => void }): void {
  const currentStats = get(stats);
  socket.emit('sync-stats', currentStats);
}

/**
 * Returns current stats without subscribing
 */
export function getStats(): PlayerStats {
  return get(stats);
}
