# Phase 8: Polish & Extras

**Ziel:** Stats-System, Galerie, Reconnect-Logik, LZ-String Kompression, Dark/Light Mode, Sounds.

**Voraussetzungen:**
- Phase 7 abgeschlossen
- Sicherheitsmaßnahmen implementiert
- Spiel ist spielbar

---

## Aufgaben

### 8.1 LocalStorage Stats

- [ ] 📁 `apps/web/src/lib/stats.ts` erstellen
- [ ] 🔧 Stats persistent speichern

**Datei:**

```typescript
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
      return JSON.parse(stored);
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

// Auto-save bei Änderungen
stats.subscribe((value) => {
  saveStats(value);
});

/**
 * Aktualisiert Stats nach einem Spiel
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
 * Setzt Stats zurück
 */
export function resetStats(): void {
  stats.set(defaultStats);
}

/**
 * Synct Stats mit Server
 */
export function syncStatsWithServer(socket: any): void {
  const currentStats = get(stats);
  socket.emit('sync-stats', currentStats);
}
```

---

### 8.2 Reconnect-Logik

- [ ] 🔧 Grace-Period auf Server
- [ ] 🔧 Auto-Reconnect auf Client

**Server - `instance.ts` erweitern:**

```typescript
import { TIMERS } from './constants.js';

/**
 * Handhabt Disconnect mit Grace-Period
 */
export function handlePlayerDisconnect(instance: Instance, player: Player): void {
  player.status = 'disconnected';
  player.disconnectedAt = Date.now();

  // Grace-Period Timer
  setTimeout(() => {
    // Noch disconnected?
    if (player.status === 'disconnected') {
      // Endgültig entfernen
      removePlayerFromInstance(instance, player.id);
      log('Reconnect', `Grace period expired for ${player.user.fullName}`);
    }
  }, TIMERS.RECONNECT_GRACE);

  log('Reconnect', `${player.user.fullName} disconnected, grace period started`);
}

/**
 * Handhabt Reconnect
 */
export function handlePlayerReconnect(
  instance: Instance,
  sessionId: string,
  newSocket: Socket
): { success: boolean; player?: Player } {
  // Player mit Session-ID finden
  for (const [id, player] of instance.players) {
    if (player.sessionId === sessionId && player.status === 'disconnected') {
      // Reconnect erfolgreich
      player.status = 'connected';
      player.disconnectedAt = undefined;
      player.socketId = newSocket.id;

      log('Reconnect', `${player.user.fullName} reconnected`);
      return { success: true, player };
    }
  }

  return { success: false };
}
```

**Client - Reconnect-Event:**

```typescript
// In socketBridge.ts erweitern
socket.on('reconnect', () => {
  console.log('[Socket] Reconnected');

  // Session wiederherstellen
  const savedSession = localStorage.getItem('spritebox-session');
  if (savedSession) {
    socket.emit('restore-session', JSON.parse(savedSession));
  }
});

socket.on('session-restored', (data) => {
  console.log('[Socket] Session restored:', data);
  // Stores aktualisieren
});
```

---

### 8.3 LZ-String Kompression

- [ ] 🔧 Server: Galerie komprimieren ab 50 Spieler
- [ ] 🔧 Client: Dekomprimieren

**Server:**

```bash
cd apps/server
pnpm add lz-string
pnpm add -D @types/lz-string
```

```typescript
// apps/server/src/compression.ts
import LZString from 'lz-string';
import { COMPRESSION } from './constants.js';

/**
 * Komprimiert Daten wenn lohnend
 */
export function compressIfNeeded<T>(
  data: T,
  playerCount: number
): { compressed: boolean; data: string | T } {
  if (playerCount < COMPRESSION.THRESHOLD_PLAYERS) {
    return { compressed: false, data };
  }

  const json = JSON.stringify(data);
  const compressed = LZString.compressToUTF16(json);

  return { compressed: true, data: compressed };
}

/**
 * Dekomprimiert Daten
 */
export function decompress<T>(data: string): T {
  const json = LZString.decompressFromUTF16(data);
  return JSON.parse(json!);
}
```

**Client:**

```bash
cd apps/web
pnpm add lz-string
```

```typescript
// In socket.ts Event-Handler
import LZString from 'lz-string';

socket.on('gallery', (payload: { compressed: boolean; data: any }) => {
  let gallery;

  if (payload.compressed) {
    const json = LZString.decompressFromUTF16(payload.data);
    gallery = JSON.parse(json!);
  } else {
    gallery = payload.data;
  }

  // Gallery-Store aktualisieren
});
```

---

### 8.4 Theme-Toggle (Dark/Light Mode)

- [ ] 📁 `apps/web/src/lib/theme.ts`
- [ ] 🔧 LocalStorage Persistenz

**Datei:**

```typescript
// apps/web/src/lib/theme.ts
import { browser } from '$app/environment';
import { writable } from 'svelte/store';

type Theme = 'dark' | 'light';

const STORAGE_KEY = 'spritebox-theme';

function getInitialTheme(): Theme {
  if (!browser) return 'dark';

  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored === 'light' || stored === 'dark') {
    return stored;
  }

  // System-Präferenz
  if (window.matchMedia('(prefers-color-scheme: light)').matches) {
    return 'light';
  }

  return 'dark';
}

export const theme = writable<Theme>(getInitialTheme());

theme.subscribe((value) => {
  if (!browser) return;

  localStorage.setItem(STORAGE_KEY, value);
  document.documentElement.setAttribute('data-theme', value);
});

export function toggleTheme(): void {
  theme.update((t) => (t === 'dark' ? 'light' : 'dark'));
}
```

**CSS Variables:**

```css
/* In app.css oder +layout.svelte */
:root {
  --bg-primary: #1a1a2e;
  --bg-secondary: #16213e;
  --bg-tertiary: #0f3460;
  --text-primary: #eee;
  --text-secondary: #aaa;
  --accent: #e94560;
}

[data-theme="light"] {
  --bg-primary: #f5f5f5;
  --bg-secondary: #ffffff;
  --bg-tertiary: #e0e0e0;
  --text-primary: #1a1a1a;
  --text-secondary: #666;
  --accent: #e94560;
}

body {
  background: var(--bg-primary);
  color: var(--text-primary);
}
```

---

### 8.5 Sound-Effekte (optional)

- [ ] 📁 `apps/web/static/sounds/` Ordner
- [ ] 📁 `apps/web/src/lib/sounds.ts`

**Datei:**

```typescript
// apps/web/src/lib/sounds.ts
import { browser } from '$app/environment';
import { writable, get } from 'svelte/store';

export const soundEnabled = writable<boolean>(true);

const sounds: Record<string, HTMLAudioElement> = {};

const SOUND_FILES = {
  vote: '/sounds/vote.mp3',
  submit: '/sounds/submit.mp3',
  countdown: '/sounds/countdown.mp3',
  win: '/sounds/win.mp3',
  phaseChange: '/sounds/phase.mp3',
};

/**
 * Lädt alle Sounds vor
 */
export function preloadSounds(): void {
  if (!browser) return;

  for (const [name, path] of Object.entries(SOUND_FILES)) {
    const audio = new Audio(path);
    audio.preload = 'auto';
    sounds[name] = audio;
  }
}

/**
 * Spielt einen Sound ab
 */
export function playSound(name: keyof typeof SOUND_FILES): void {
  if (!browser || !get(soundEnabled)) return;

  const audio = sounds[name];
  if (audio) {
    audio.currentTime = 0;
    audio.play().catch(() => {
      // Ignorieren - möglicherweise autoplay blockiert
    });
  }
}

/**
 * Toggle Sound
 */
export function toggleSound(): void {
  soundEnabled.update((s) => !s);
}
```

---

### 8.6 Galerie-Komponente erweitern

- [ ] 🔧 Scroll durch alle Bilder
- [ ] 🔧 Sortierung

**In `Results.svelte` erweitern:**

```svelte
<!-- Galerie-Sektion erweitern -->
<div class="gallery">
  <div class="gallery-header">
    <h3>Alle Bilder ({$results.totalParticipants})</h3>
    <select bind:value={sortBy}>
      <option value="place">Nach Platz</option>
      <option value="votes">Nach Votes</option>
      <option value="elo">Nach Elo</option>
    </select>
  </div>

  <div class="gallery-grid">
    {#each sortedResults as entry}
      <button
        class="gallery-item"
        on:click={() => showDetail(entry)}
      >
        <PixelCanvas pixelData={entry.pixels} size={60} readonly />
        <span class="place">#{entry.place}</span>
        <span class="name">{entry.user.displayName}</span>
      </button>
    {/each}
  </div>
</div>

<!-- Modal für Detail-Ansicht -->
{#if selectedEntry}
  <div class="modal" on:click={() => selectedEntry = null}>
    <div class="modal-content" on:click|stopPropagation>
      <PixelCanvas pixelData={selectedEntry.pixels} size={200} readonly />
      <h3>{selectedEntry.user.fullName}</h3>
      <p>Platz: #{selectedEntry.place}</p>
      <p>Votes: {selectedEntry.finalVotes}</p>
      <p>Elo: {selectedEntry.elo}</p>
    </div>
  </div>
{/if}
```

---

### 8.7 Memory Cleanup erweitern

- [ ] 🔧 Server: Periodischer Cleanup

**In `instance.ts` erweitern:**

```typescript
/**
 * Startet periodischen Cleanup
 */
export function startCleanupInterval(): void {
  setInterval(() => {
    const now = Date.now();

    for (const [id, instance] of instances) {
      // Leere Instanzen löschen
      if (instance.players.size === 0 && instance.spectators.size === 0) {
        if (now - instance.lastActivity > 30_000) {
          cleanupInstance(instance);
        }
      }

      // Stale Instanzen (>1h ohne Aktivität)
      if (now - instance.lastActivity > 60 * 60 * 1000) {
        cleanupInstance(instance);
      }
    }

    // Memory-Stats loggen
    logMemoryUsage();
  }, 60_000); // Jede Minute
}

function logMemoryUsage(): void {
  const usage = process.memoryUsage();
  log('Memory', `Heap: ${Math.round(usage.heapUsed / 1024 / 1024)}MB, ` +
    `Instances: ${instances.size}, ` +
    `Players: ${getInstanceStats().totalPlayers}`);
}
```

---

## Kontrollpunkte

### 🧪 Test 1: Stats werden gespeichert

```javascript
// Spiel beenden mit Platz 1
// Browser schließen und wieder öffnen
// ✅ Stats zeigen 1 Spiel, 1x Platz 1
```

### 🧪 Test 2: Reconnect funktioniert

```
- [ ] Verbindung trennen (Offline gehen)
- [ ] Innerhalb von 15s wieder online
- [ ] ✅ Session wird wiederhergestellt
- [ ] ✅ Spiel kann fortgesetzt werden
```

### 🧪 Test 3: Theme-Toggle

```
- [ ] Toggle klicken
- [ ] ✅ Farben wechseln
- [ ] ✅ Bleibt nach Reload erhalten
```

### 🧪 Test 4: Galerie-Sortierung

```
- [ ] Nach Platz sortieren
- [ ] Nach Votes sortieren
- [ ] ✅ Reihenfolge ändert sich korrekt
```

---

## Definition of Done

- [ ] Stats werden im LocalStorage gespeichert
- [ ] Stats werden nach Spielende aktualisiert
- [ ] Reconnect mit Grace-Period funktioniert
- [ ] LZ-String Kompression ab 50 Spielern
- [ ] Dark/Light Mode Toggle
- [ ] Theme-Präferenz wird gespeichert
- [ ] Galerie zeigt alle Bilder
- [ ] Galerie ist sortierbar
- [ ] Memory-Cleanup läuft periodisch
- [ ] Alle Änderungen sind committed

---

## Optional: Weitere Polish-Aufgaben

| Feature | Priorität | Beschreibung |
|---------|-----------|--------------|
| Sound-Effekte | Niedrig | Audio-Feedback |
| Animationen | Niedrig | Smooth Transitions |
| Responsive Design | Mittel | Tablet-Optimierung |
| Keyboard Shortcuts | Niedrig | Hotkeys für Farben |
| Undo/Redo | Mittel | Canvas-History |
| Export als PNG | Niedrig | Download-Button |

---

## Nächster Schritt

👉 **Weiter zu [Phase 9: Deployment](./phase-9-deployment.md)**
