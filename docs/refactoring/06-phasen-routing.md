# 06: Frontend - Phasen-Routing

**Status:** Offen
**Priorität:** MITTEL (Quick Win)
**Aufwand:** Klein (unter 1 Tag)

---

## Problem

Die Route-Datei `routes/play/[mode]/[code]/+page.svelte` enthält eine 12+-Zweig if-else-Kette für die Phasen-Anzeige.

### Aktueller Code (vereinfacht)

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

Jede neue Phase erfordert einen weiteren `{:else if}` Block.

---

## Lösung

Datengetriebenes Phasen-Routing:

```typescript
// apps/web/src/lib/phaseRouter.ts

import Lobby from '$lib/components/features/Lobby/index.svelte';
import Countdown from '$lib/components/features/Countdown.svelte';
import Drawing from '$lib/components/features/Drawing.svelte';
import Voting from '$lib/components/features/Voting.svelte';
import Finale from '$lib/components/features/Finale.svelte';
import Results from '$lib/components/features/Results.svelte';
import Memorize from '$lib/components/features/CopyCat/Memorize.svelte';
// ... weitere Imports

import type { Component } from 'svelte';

type GamePhase =
  | 'lobby'
  | 'countdown'
  | 'drawing'
  | 'voting'
  | 'finale'
  | 'results'
  | 'memorize'
  | 'copycat-result'
  | 'guessing'
  | 'reveal'
  | 'active'
  | 'royale-initial-drawing'
  | 'royale-show-reference'
  | 'royale-drawing'
  | 'royale-results'
  | 'royale-winner';

export const PHASE_COMPONENTS: Record<GamePhase, Component> = {
  'lobby': Lobby,
  'countdown': Countdown,
  'drawing': Drawing,
  'voting': Voting,
  'finale': Finale,
  'results': Results,
  'memorize': Memorize,
  'copycat-result': CopyCatResult,
  'guessing': Guessing,
  'reveal': Reveal,
  'active': ZombieActive,
  'royale-initial-drawing': RoyaleInitialDrawing,
  'royale-show-reference': RoyaleShowReference,
  'royale-drawing': RoyaleDrawing,
  'royale-results': RoyaleResults,
  'royale-winner': RoyaleWinner,
};

export function getPhaseComponent(phase: string): Component | null {
  return PHASE_COMPONENTS[phase as GamePhase] ?? null;
}
```

### Verwendung in der Route

```svelte
<script lang="ts">
  import { getPhaseComponent } from '$lib/phaseRouter';

  let { phase } = $props();

  let PhaseComponent = $derived(getPhaseComponent(phase));
</script>

{#if PhaseComponent}
  <PhaseComponent />
{:else}
  <div>Unbekannte Phase: {phase}</div>
{/if}
```

---

## Betroffene Dateien

| Datei | Aktion |
|-------|--------|
| `apps/web/src/lib/phaseRouter.ts` | Neu erstellen |
| `apps/web/src/routes/play/[mode]/[code]/+page.svelte` | Refactoring |

---

## Implementierungsschritte

1. `phaseRouter.ts` erstellen
2. Alle Phase-Komponenten importieren
3. PHASE_COMPONENTS Map definieren
4. Helper-Funktion implementieren
5. Route-Komponente refactoren
6. Testen mit allen Spielmodi und Phasen

---

## Vorteile

- **Deklarativ**: Phasen-Mapping an einem Ort
- **Type-Safety**: TypeScript prüft gültige Phasen
- **Erweiterbar**: Neue Phasen = nur Map-Eintrag hinzufügen
- **Weniger Code**: ~50 Zeilen if-else → ~5 Zeilen

---

## Hinweis

Svelte 5 unterstützt dynamische Komponenten mit `<svelte:component this={...}>` oder direkt als `{#if PhaseComponent}<PhaseComponent />{/if}`.

---

## Checkliste

- [ ] phaseRouter.ts erstellen
- [ ] Alle Phasen-Komponenten importieren
- [ ] PHASE_COMPONENTS Map definieren
- [ ] Route-Komponente refactoren
- [ ] Mit allen Spielmodi testen
