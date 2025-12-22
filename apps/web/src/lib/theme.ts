// apps/web/src/lib/theme.ts
import { browser } from '$app/environment';
import { writable } from 'svelte/store';

export type Theme = 'dark' | 'light';

const STORAGE_KEY = 'spritebox-theme';

function getInitialTheme(): Theme {
  if (!browser) return 'dark';

  // Check stored preference
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored === 'light' || stored === 'dark') {
    return stored;
  }

  // Check system preference
  if (window.matchMedia('(prefers-color-scheme: light)').matches) {
    return 'light';
  }

  return 'dark';
}

function createThemeStore() {
  const { subscribe, set, update } = writable<Theme>(getInitialTheme());

  return {
    subscribe,
    set: (value: Theme) => {
      if (browser) {
        localStorage.setItem(STORAGE_KEY, value);
        document.documentElement.setAttribute('data-theme', value);
      }
      set(value);
    },
    toggle: () => {
      update((current) => {
        const newTheme = current === 'dark' ? 'light' : 'dark';
        if (browser) {
          localStorage.setItem(STORAGE_KEY, newTheme);
          document.documentElement.setAttribute('data-theme', newTheme);
        }
        return newTheme;
      });
    },
  };
}

export const theme = createThemeStore();

/**
 * Initializes theme on page load
 * Call this in +layout.svelte onMount
 */
export function initTheme(): void {
  if (!browser) return;

  const currentTheme = getInitialTheme();
  document.documentElement.setAttribute('data-theme', currentTheme);
  theme.set(currentTheme);

  // Listen for system preference changes
  const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
  mediaQuery.addEventListener('change', (e) => {
    // Only auto-switch if user hasn't set a preference
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) {
      theme.set(e.matches ? 'dark' : 'light');
    }
  });
}

/**
 * Toggles between dark and light mode
 */
export function toggleTheme(): void {
  theme.toggle();
}
