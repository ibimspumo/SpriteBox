# Phase 6: Speicherung & Offline-Fortschritt

> LocalStorage-Persistenz und Offline-Berechnung

## Übersicht

```
┌─────────────────────────────────────────────────────────┐
│                    STORAGE SYSTEM                        │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  Game State ──▶ Serialize ──▶ LocalStorage              │
│       ▲                            │                     │
│       │                            ▼                     │
│  Validate ◀── Deserialize ◀── Load                      │
│       │                                                  │
│       ▼                                                  │
│  Offline-Fortschritt berechnen (max 24h)                │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

---

## LocalStorage-Schema

### Schlüssel & Version

```typescript
/**
 * Storage-Konstanten
 */
export const STORAGE_KEY = 'spritebox_idle_pixel_v1';
export const STORAGE_VERSION = 1;

/**
 * Gespeichertes Datenformat
 */
export interface SaveData {
  /** Schema-Version für Migrations */
  version: number;
  /** Spielzustand */
  state: IdlePixelGameState;
  /** Zeitstempel des Speicherns */
  savedAt: number;
  /** Checksumme (optional, für Integritätsprüfung) */
  checksum?: string;
}
```

---

## Storage-Service

```typescript
/**
 * Speicherung und Laden des Spielzustands
 */
export class StorageService {
  private readonly MAX_OFFLINE_HOURS = 24;
  private autoSaveInterval: number | null = null;

  /**
   * Speichert den aktuellen Spielzustand
   */
  save(state: IdlePixelGameState): boolean {
    try {
      const saveData: SaveData = {
        version: STORAGE_VERSION,
        state: {
          ...state,
          lastSaved: Date.now(),
        },
        savedAt: Date.now(),
      };

      const serialized = JSON.stringify(saveData);
      localStorage.setItem(STORAGE_KEY, serialized);

      console.log('[Storage] Game saved successfully');
      return true;
    } catch (error) {
      console.error('[Storage] Failed to save:', error);
      return false;
    }
  }

  /**
   * Lädt den Spielzustand aus LocalStorage
   */
  load(): IdlePixelGameState | null {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;

      const saveData: SaveData = JSON.parse(raw);

      // Version prüfen und ggf. migrieren
      if (saveData.version !== STORAGE_VERSION) {
        return this.migrate(saveData);
      }

      // Validierung mit Zod
      const result = IdlePixelGameStateSchema.safeParse(saveData.state);
      if (!result.success) {
        console.error('[Storage] Invalid save data:', result.error);
        return null;
      }

      return result.data;
    } catch (error) {
      console.error('[Storage] Failed to load:', error);
      return null;
    }
  }

  /**
   * Löscht den gespeicherten Spielzustand
   */
  clear(): void {
    localStorage.removeItem(STORAGE_KEY);
    console.log('[Storage] Save data cleared');
  }

  /**
   * Prüft, ob ein Spielstand existiert
   */
  hasSaveData(): boolean {
    return localStorage.getItem(STORAGE_KEY) !== null;
  }

  /**
   * Startet Auto-Save (alle 30 Sekunden)
   */
  startAutoSave(getState: () => IdlePixelGameState): void {
    if (this.autoSaveInterval) return;

    this.autoSaveInterval = window.setInterval(() => {
      this.save(getState());
    }, 30000); // 30 Sekunden

    // Auch bei Tab-Wechsel speichern
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        this.save(getState());
      }
    });

    // Bei Fenster-Schließen speichern
    window.addEventListener('beforeunload', () => {
      this.save(getState());
    });
  }

  /**
   * Stoppt Auto-Save
   */
  stopAutoSave(): void {
    if (this.autoSaveInterval) {
      clearInterval(this.autoSaveInterval);
      this.autoSaveInterval = null;
    }
  }

  /**
   * Migriert alte Spielstände
   */
  private migrate(saveData: SaveData): IdlePixelGameState | null {
    console.log(`[Storage] Migrating from v${saveData.version} to v${STORAGE_VERSION}`);

    // Migrations-Logik hier
    switch (saveData.version) {
      case 0:
        // v0 → v1 Migration
        return this.migrateV0ToV1(saveData.state);
      default:
        console.error(`[Storage] Unknown version: ${saveData.version}`);
        return null;
    }
  }

  private migrateV0ToV1(oldState: unknown): IdlePixelGameState {
    // Beispiel-Migration
    return createNewGameState();
  }
}

export const storageService = new StorageService();
```

---

## Offline-Fortschritt

### Konzept

Wenn der Spieler zurückkehrt, wird der Offline-Fortschritt berechnet:

```
┌─────────────────────────────────────────────────────────┐
│                   OFFLINE CALCULATION                    │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  lastTick: 1703000000000 (10:00 Uhr)                    │
│  now:      1703086400000 (10:00 Uhr +24h)               │
│  Differenz: 86400 Sekunden (24 Stunden)                 │
│                                                          │
│  Produktion: 1000 Pixel/Sek                             │
│  Offline-Ertrag: 1000 × 86400 = 86,400,000 Pixel       │
│                                                          │
│  (Clicker werden NICHT berechnet - nur passive Prod.)   │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

### Implementierung

```typescript
/**
 * Offline-Fortschritt-System
 */
export class OfflineProgressService {
  private readonly MAX_OFFLINE_SECONDS = 24 * 60 * 60; // 24 Stunden
  private readonly OFFLINE_EFFICIENCY = 0.5; // 50% der normalen Rate

  /**
   * Berechnet und wendet Offline-Fortschritt an
   */
  calculateOfflineProgress(state: IdlePixelGameState): {
    newState: IdlePixelGameState;
    offlineTime: number;
    offlineEarnings: number;
  } {
    const now = Date.now();
    const offlineSeconds = Math.min(
      (now - state.lastTick) / 1000,
      this.MAX_OFFLINE_SECONDS
    );

    // Mindestens 1 Minute offline für Berechnung
    if (offlineSeconds < 60) {
      return {
        newState: { ...state, lastTick: now },
        offlineTime: 0,
        offlineEarnings: 0,
      };
    }

    // Produktion berechnen (ohne Clicker-Boni)
    const production = this.calculateOfflineProduction(state);
    const offlineEarnings = Math.floor(
      production * offlineSeconds * this.OFFLINE_EFFICIENCY
    );

    // State aktualisieren
    const newState: IdlePixelGameState = {
      ...state,
      currency: state.currency + offlineEarnings,
      stats: {
        ...state.stats,
        totalEarned: state.stats.totalEarned + offlineEarnings,
        playTime: state.stats.playTime + offlineSeconds,
      },
      lastTick: now,
      // Energie-Balken wird NICHT offline gefüllt
      clicker: {
        ...state.clicker,
        // Goldener Pixel: Nächster Spawn nach jetzt
        goldenPixelNextSpawn: now + 30000,
        goldenPixelActive: false,
      },
    };

    return {
      newState,
      offlineTime: offlineSeconds,
      offlineEarnings,
    };
  }

  /**
   * Berechnet Offline-Produktion (nur passive Produktion)
   */
  private calculateOfflineProduction(state: IdlePixelGameState): number {
    // Basis-Produktion aus Grid
    let baseProduction = 0;

    for (const slot of state.grid) {
      if (slot.pixel) {
        baseProduction += slot.pixel.baseProduction;
      }
    }

    // Upgrade-Multiplikatoren (nur Produktions-Upgrades)
    const upgradeMultiplier = upgradeEngine.calculateEffect(
      state,
      'multiply_production'
    );

    // Prestige-Multiplikator
    const prestigeMultiplier = prestigeEngine.getPrestigeProductionMultiplier(state);

    return baseProduction * upgradeMultiplier * prestigeMultiplier;
  }

  /**
   * Formatiert die Offline-Zeit für Anzeige
   */
  formatOfflineTime(seconds: number): string {
    if (seconds < 60) return `${Math.floor(seconds)}s`;

    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);

    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  }
}

export const offlineProgressService = new OfflineProgressService();
```

---

## Offline-Willkommen-Modal

```svelte
<!-- OfflineModal.svelte -->
<script lang="ts">
  import { offlineProgressService } from '$lib/idle-pixel/storage';
  import { formatNumber } from '$lib/utils';

  interface Props {
    offlineTime: number;
    offlineEarnings: number;
    onClose: () => void;
  }

  let { offlineTime, offlineEarnings, onClose }: Props = $props();

  const formattedTime = $derived(
    offlineProgressService.formatOfflineTime(offlineTime)
  );
</script>

<div class="offline-modal-backdrop" onclick={onClose}>
  <div class="offline-modal" onclick={(e) => e.stopPropagation()}>
    <div class="welcome-header">
      <span class="wave">👋</span>
      <h2>{$t.idlePixel.offline.welcomeBack}</h2>
    </div>

    <div class="offline-stats">
      <div class="stat">
        <span class="label">{$t.idlePixel.offline.timeAway}</span>
        <span class="value">{formattedTime}</span>
      </div>

      <div class="stat earnings">
        <span class="label">{$t.idlePixel.offline.earned}</span>
        <span class="value">+{formatNumber(offlineEarnings)}</span>
        <span class="unit">{$t.idlePixel.currency}</span>
      </div>
    </div>

    <p class="efficiency-note">
      {$t.idlePixel.offline.efficiencyNote}
    </p>

    <button class="continue-button" onclick={onClose}>
      {$t.idlePixel.offline.continue}
    </button>
  </div>
</div>

<style>
  .offline-modal-backdrop {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.8);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
  }

  .offline-modal {
    background: var(--color-bg-secondary);
    border-radius: var(--radius-lg);
    padding: var(--space-6);
    max-width: 400px;
    text-align: center;
    animation: modalIn 0.3s ease-out;
  }

  .welcome-header {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--space-2);
    margin-bottom: var(--space-4);
  }

  .wave {
    font-size: 48px;
    animation: wave 1s ease-in-out;
  }

  .offline-stats {
    display: flex;
    flex-direction: column;
    gap: var(--space-3);
    padding: var(--space-4);
    background: var(--color-bg-tertiary);
    border-radius: var(--radius-md);
    margin-bottom: var(--space-4);
  }

  .stat {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
  }

  .stat.earnings .value {
    color: var(--color-success);
    font-size: var(--font-size-xl);
    font-weight: 700;
  }

  .efficiency-note {
    font-size: var(--font-size-sm);
    color: var(--color-text-secondary);
    margin-bottom: var(--space-4);
  }

  .continue-button {
    width: 100%;
    padding: var(--space-3);
    background: var(--color-accent);
    border: none;
    border-radius: var(--radius-md);
    color: var(--color-text-primary);
    font-weight: 600;
    cursor: pointer;
  }

  @keyframes modalIn {
    from {
      opacity: 0;
      transform: scale(0.9);
    }
    to {
      opacity: 1;
      transform: scale(1);
    }
  }

  @keyframes wave {
    0%, 100% { transform: rotate(0deg); }
    25% { transform: rotate(20deg); }
    75% { transform: rotate(-20deg); }
  }
</style>
```

---

## Game-Initialisierung

```typescript
/**
 * Initialisiert das Spiel mit Storage-Support
 */
export function initializeGame(): {
  state: IdlePixelGameState;
  showOfflineModal: boolean;
  offlineTime: number;
  offlineEarnings: number;
} {
  // Versuche gespeicherten Zustand zu laden
  let state = storageService.load();
  let showOfflineModal = false;
  let offlineTime = 0;
  let offlineEarnings = 0;

  if (state) {
    // Offline-Fortschritt berechnen
    const offline = offlineProgressService.calculateOfflineProgress(state);
    state = offline.newState;
    offlineTime = offline.offlineTime;
    offlineEarnings = offline.offlineEarnings;
    showOfflineModal = offlineEarnings > 0;

    console.log(`[Game] Loaded save, offline for ${offlineTime}s`);
  } else {
    // Neues Spiel
    state = createNewGameState();
    console.log('[Game] Starting new game');
  }

  // Auto-Save starten (wird später mit aktuellem State verbunden)
  // storageService.startAutoSave(() => currentState);

  return {
    state,
    showOfflineModal,
    offlineTime,
    offlineEarnings,
  };
}
```

---

## Integration in Haupt-Komponente

```svelte
<!-- IdlePixelGame.svelte -->
<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { initializeGame, storageService } from '$lib/idle-pixel/storage';
  import { OfflineModal } from '$lib/components/features/IdlePixel';

  // Initialisierung
  const init = initializeGame();
  let gameState = $state(init.state);
  let showOfflineModal = $state(init.showOfflineModal);
  let offlineTime = init.offlineTime;
  let offlineEarnings = init.offlineEarnings;

  onMount(() => {
    // Auto-Save starten
    storageService.startAutoSave(() => gameState);
  });

  onDestroy(() => {
    // Beim Verlassen speichern
    storageService.save(gameState);
    storageService.stopAutoSave();
  });

  function handleCloseOfflineModal() {
    showOfflineModal = false;
  }
</script>

<!-- Offline-Modal -->
{#if showOfflineModal}
  <OfflineModal
    {offlineTime}
    {offlineEarnings}
    onClose={handleCloseOfflineModal}
  />
{/if}

<!-- Rest des Spiels -->
<div class="game-container">
  <!-- ... -->
</div>
```

---

## Export/Import (Optional)

```typescript
/**
 * Exportiert den Spielstand als Base64-String
 */
export function exportSave(state: IdlePixelGameState): string {
  const saveData: SaveData = {
    version: STORAGE_VERSION,
    state,
    savedAt: Date.now(),
  };

  const json = JSON.stringify(saveData);
  return btoa(json);
}

/**
 * Importiert einen Spielstand aus Base64-String
 */
export function importSave(encoded: string): IdlePixelGameState | null {
  try {
    const json = atob(encoded);
    const saveData: SaveData = JSON.parse(json);

    const result = IdlePixelGameStateSchema.safeParse(saveData.state);
    if (!result.success) {
      console.error('[Import] Invalid save data');
      return null;
    }

    return result.data;
  } catch (error) {
    console.error('[Import] Failed to import:', error);
    return null;
  }
}
```

---

## Implementierungs-Checkliste

- [ ] `StorageService` Klasse
- [ ] Auto-Save (30s Interval)
- [ ] Save bei Tab-Wechsel/Schließen
- [ ] `OfflineProgressService` Klasse
- [ ] Offline-Berechnung (max 24h, 50% Effizienz)
- [ ] `OfflineModal.svelte` Komponente
- [ ] Game-Initialisierung mit Storage
- [ ] Export/Import Funktionen (optional)
- [ ] Zod-Validierung beim Laden
- [ ] Migrations-System für Schema-Updates
- [ ] i18n-Texte
- [ ] Unit Tests
