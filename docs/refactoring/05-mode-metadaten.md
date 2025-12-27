# 05: Frontend - Mode-Metadaten-System

**Status:** Offen
**Priorität:** HOCH (Quick Win)
**Aufwand:** Klein (unter 1 Tag)

---

## Problem

Die Datei `ModeCard.svelte` (486 Zeilen) enthält **4 identische if-else-Ketten**, die bei jedem neuen Spielmodus manuell aktualisiert werden müssen:

1. Icon-Mapping (Zeilen 31-52)
2. Farb-Mapping (Zeilen 55-76)
3. Beschreibungs-Mapping (Zeilen 104-122)
4. Feature-Mapping (Zeilen 129-147)

### Symptom

Jeder neue Spielmodus erfordert Änderungen an 4 Stellen in derselben Datei.

---

## Lösung

Zentrales Metadaten-System erstellen:

```typescript
// apps/web/src/lib/modeMetadata.ts

type GameModeId =
  | 'pixel-battle'
  | 'copy-cat'
  | 'copy-cat-solo'
  | 'pixel-guesser'
  | 'zombie-pixel'
  | 'copycat-royale'
  | 'pixel-survivor';

interface ModeMetadata {
  id: GameModeId;
  icon: string;
  accentColor: string;
  descriptionKey: string;  // i18n key
  features: string[];      // i18n keys
  minPlayers: number;
  maxPlayers: number;
  allowPrivate: boolean;
  allowPublic: boolean;
}

export const GAME_MODE_METADATA: Record<GameModeId, ModeMetadata> = {
  'pixel-battle': {
    id: 'pixel-battle',
    icon: '⚔️',
    accentColor: 'var(--color-accent)',
    descriptionKey: 'modes.pixelBattle.description',
    features: ['modes.pixelBattle.feature1', 'modes.pixelBattle.feature2'],
    minPlayers: 5,
    maxPlayers: 100,
    allowPrivate: true,
    allowPublic: true,
  },
  'copy-cat': {
    id: 'copy-cat',
    icon: '🎭',
    accentColor: 'var(--color-copycat)',
    // ...
  },
  // ... weitere Modi
};

// Helper-Funktionen
export function getModeMetadata(id: GameModeId): ModeMetadata {
  return GAME_MODE_METADATA[id];
}

export function getModeIcon(id: GameModeId): string {
  return GAME_MODE_METADATA[id]?.icon ?? '🎮';
}

export function getModeColor(id: GameModeId): string {
  return GAME_MODE_METADATA[id]?.accentColor ?? 'var(--color-accent)';
}
```

---

## Betroffene Dateien

| Datei | Aktion |
|-------|--------|
| `apps/web/src/lib/modeMetadata.ts` | Neu erstellen |
| `apps/web/src/lib/components/molecules/ModeCard.svelte` | Refactoring |

---

## Implementierungsschritte

1. `modeMetadata.ts` erstellen mit allen Modi
2. Helper-Funktionen implementieren
3. ModeCard.svelte refactoren:
   - if-else-Ketten durch Metadaten-Lookup ersetzen
   - Zeilen von ~486 auf ~200 reduzieren
4. Testen mit allen Spielmodi

---

## Vorteile

- **Single Source of Truth**: Alle Mode-Eigenschaften an einem Ort
- **Automatische Unterstützung neuer Modi**: Nur Metadaten hinzufügen
- **Type-Safety**: TypeScript verhindert falsche Mode-IDs
- **Einfache Wartung**: Eine Datei statt 4 if-else-Ketten

---

## Checkliste

- [ ] modeMetadata.ts erstellen
- [ ] Alle Modi mit Metadaten definieren
- [ ] Helper-Funktionen implementieren
- [ ] ModeCard.svelte refactoren
- [ ] Andere Komponenten prüfen (ggf. auch umstellen)
- [ ] Testen
