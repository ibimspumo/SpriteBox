# 06: Frontend - Phasen-Routing

**Status:** ✅ Abgeschlossen
**Priorität:** MITTEL (Quick Win)
**Aufwand:** Klein (unter 1 Tag)

---

## Problem

Die Route-Dateien `routes/play/[mode]/+page.svelte` und `routes/play/[mode]/[code]/+page.svelte` enthielten je eine 12+-Zweig if-else-Kette für die Phasen-Anzeige.

### Alter Code (vereinfacht)

```svelte
{#if phase === 'lobby'}
  <Lobby />
{:else if phase === 'countdown'}
  <Countdown />
{:else if phase === 'drawing'}
  <Drawing />
{:else if phase === 'voting'}
  <Voting />
{:else if phase === 'finale'}
  <Finale />
{:else if phase === 'results'}
  <Results />
{:else if phase === 'memorize'}
  <Memorize />
{:else if phase === 'copycat-result'}
  <CopyCatResult />
{:else if phase === 'guessing'}
  <Guessing />
<!-- ... und so weiter -->
{/if}
```

### Symptom

Jede neue Phase erforderte einen weiteren `{:else if}` Block in ZWEI Dateien.

---

## Lösung

Datengetriebenes Phasen-Routing mit zentraler Phase-Komponenten-Map:

### apps/web/src/lib/phaseRouter.ts

```typescript
import type { Component } from 'svelte';
import type { GamePhase } from './stores';

// Alle Phasen-Komponenten importiert...

const PHASE_COMPONENTS: Partial<Record<GamePhase, Component>> = {
  // Standard phases
  idle: Lobby,
  lobby: Lobby,
  countdown: Countdown,
  drawing: Drawing,
  voting: Voting,
  finale: Finale,
  results: Results,

  // CopyCat mode phases
  memorize: Memorize,
  'copycat-result': CopyCatResult,
  'copycat-rematch': CopyCatRematch,

  // PixelGuesser mode phases
  guessing: Guessing,
  reveal: Reveal,
  'pixelguesser-results': FinalResults,

  // ZombiePixel mode
  active: ZombiePixelGame,

  // CopyCatRoyale mode (all phases use the container)
  'royale-initial-drawing': CopyCatRoyaleGame,
  'royale-show-reference': CopyCatRoyaleGame,
  'royale-drawing': CopyCatRoyaleGame,
  'royale-results': CopyCatRoyaleGame,
  'royale-winner': CopyCatRoyaleGame,
};

export function getPhaseComponent(phase: GamePhase, gameMode?: string): Component | null {
  // Special case: ZombiePixel mode shows its game container for 'results' phase
  if (phase === 'results' && gameMode === 'zombie-pixel') {
    return ZombiePixelGame;
  }
  return PHASE_COMPONENTS[phase] ?? null;
}
```

### Neue Verwendung in Route-Dateien

```svelte
<script lang="ts">
  import { getPhaseComponent } from '$lib/phaseRouter';
  import { game, lobby } from '$lib/stores';

  const PhaseComponent = $derived(getPhaseComponent($game.phase, $lobby.gameMode));
</script>

{#if PhaseComponent}
  <PhaseComponent />
{:else}
  <div class="unknown-phase">Unknown phase: {$game.phase}</div>
{/if}
```

---

## Betroffene Dateien

| Datei | Aktion |
|-------|--------|
| `apps/web/src/lib/phaseRouter.ts` | ✅ Neu erstellt |
| `apps/web/src/lib/components/features/Countdown.svelte` | ✅ Neu erstellt (war inline) |
| `apps/web/src/lib/components/features/index.ts` | ✅ Export hinzugefügt |
| `apps/web/src/routes/play/[mode]/+page.svelte` | ✅ Refactored |
| `apps/web/src/routes/play/[mode]/[code]/+page.svelte` | ✅ Refactored |

---

## Ergebnis

### Vorher vs. Nachher

| Metrik | Vorher | Nachher |
|--------|--------|---------|
| if-else-Zweige pro Route | ~15 | 1 |
| Zeilen in [mode]/+page.svelte | 147 | 103 |
| Zeilen in [mode]/[code]/+page.svelte | 299 | 261 |
| Orte für neue Phase | 2 Dateien | 1 Map-Eintrag |

### Vorteile

- **Deklarativ**: Phasen-Mapping an EINEM Ort
- **Type-Safety**: TypeScript prüft gültige Phasen via GamePhase-Type
- **Erweiterbar**: Neue Phasen = nur Map-Eintrag hinzufügen
- **Weniger Code**: ~50 Zeilen if-else pro Datei → ~5 Zeilen
- **Keine Duplikation**: Beide Route-Dateien nutzen dieselbe Logik

---

## Hinweise

### Countdown-Komponente

Die Countdown-Phase war vorher inline in den Route-Dateien definiert. Sie wurde in eine eigene Komponente extrahiert (`Countdown.svelte`), um mit dem Phase-Router kompatibel zu sein.

### Modus-spezifische Container

Einige Modi wie ZombiePixel und CopyCatRoyale verwenden Container-Komponenten, die ihre internen Phasen selbst handhaben:
- `ZombiePixelGame` handhabt `active` Phase und zeigt intern verschiedene States
- `CopyCatRoyaleGame` handhabt alle `royale-*` Phasen intern

### Spezialfall: results + zombie-pixel

Der `getPhaseComponent` hat eine Sonderbehandlung für die `results`-Phase im `zombie-pixel` Modus, da ZombiePixel seine eigene Results-Darstellung verwendet.

---

## Checkliste

- [x] phaseRouter.ts erstellen
- [x] Countdown.svelte extrahieren
- [x] Alle Phasen-Komponenten importieren
- [x] PHASE_COMPONENTS Map definieren
- [x] Route-Komponenten refactoren (beide)
- [x] Barrel-Export aktualisieren
- [x] TypeScript-Check bestanden
