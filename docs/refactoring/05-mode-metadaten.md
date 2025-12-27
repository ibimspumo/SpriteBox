# 05: Frontend - Mode-Metadaten-System

**Status:** ✅ Abgeschlossen
**Priorität:** HOCH (Quick Win)
**Aufwand:** Klein (unter 1 Tag)

---

## Problem

Die Datei `ModeCard.svelte` (486 Zeilen) enthielt **4 identische if-else-Ketten**, die bei jedem neuen Spielmodus manuell aktualisiert werden mussten:

1. Icon-Mapping (Zeilen 31-52)
2. Farb-Mapping (Zeilen 55-76)
3. Name-Mapping (Zeilen 104-122)
4. Beschreibungs-Mapping (Zeilen 129-147)

### Symptom

Jeder neue Spielmodus erforderte Änderungen an 4 Stellen in derselben Datei.

---

## Lösung (Implementiert)

Zentrales Metadaten-System erstellt in `apps/web/src/lib/modeMetadata.ts`:

```typescript
export type GameModeId =
  | 'pixel-battle'
  | 'copy-cat'
  | 'copy-cat-solo'
  | 'pixel-guesser'
  | 'pixel-survivor'
  | 'zombie-pixel'
  | 'copycat-royale'
  | 'colordle';

export interface ModeMetadata {
  id: GameModeId;
  icon: string;
  accentColor: string;
  selectionKey: ModeSelectionKey;  // For i18n lookups
  legacyI18nKey: string;           // Backwards compatibility
  isAlpha: boolean;
  slug: string;                     // URL routing
}

export const GAME_MODE_METADATA: Record<GameModeId, ModeMetadata> = {
  'pixel-battle': { id: 'pixel-battle', icon: '⚔️', accentColor: 'var(--color-success)', ... },
  'copy-cat': { id: 'copy-cat', icon: '🎭', accentColor: 'var(--color-brand)', ... },
  // ... alle 8 Modi
};

// Helper-Funktionen
export function getModeMetadata(id: string): ModeMetadata | undefined;
export function getModeIcon(id: string): string;
export function getModeAccentColor(id: string): string;
export function getModeSelectionKey(id: string): ModeSelectionKey | undefined;
export function isModeAlpha(id: string): boolean;
export function getModeMetadataByLegacyKey(legacyKey: string): ModeMetadata | undefined;
```

---

## Betroffene Dateien

| Datei | Aktion | Ergebnis |
|-------|--------|----------|
| `apps/web/src/lib/modeMetadata.ts` | Neu erstellt | Zentrale Metadaten für 8 Modi |
| `apps/web/src/lib/modeRoutes.ts` | Refaktoriert | Bezieht Slugs aus modeMetadata.ts |
| `apps/web/src/lib/components/molecules/ModeCard.svelte` | Refaktoriert | 4 if-else-Ketten eliminiert |
| `apps/web/src/lib/components/molecules/GameModeSelector.svelte` | Refaktoriert | Nutzt zentrale Metadaten |

---

## Ergebnisse

### Vorher (ModeCard.svelte)
- **486 Zeilen**
- 4 identische if-else-Ketten (Icons, Farben, Namen, Beschreibungen)
- Hardcoded Alpha-Badge-Prüfung
- Jeder neue Modus: 4 Stellen ändern

### Nachher (ModeCard.svelte)
- **~410 Zeilen** (~16% Reduktion)
- Alle Mappings durch zentrale Helper ersetzt
- Alpha-Status aus Metadaten
- Jeder neue Modus: 1 Eintrag in modeMetadata.ts

### Vorher (modeRoutes.ts)
- Duplizierte Slug-Mappings (MODE_SLUGS + SLUG_FROM_MODE)
- Manuell synchronisiert

### Nachher (modeRoutes.ts)
- Generiert Mappings dynamisch aus modeMetadata.ts
- Automatisch synchron mit zentraler Quelle

---

## Vorteile

- **Single Source of Truth**: Alle Mode-Eigenschaften an einem Ort
- **Automatische Unterstützung neuer Modi**: Nur 1 Eintrag in modeMetadata.ts
- **Type-Safety**: TypeScript-Types für alle Modi und Eigenschaften
- **Einfache Wartung**: Eine Datei statt verteilte if-else-Ketten
- **Keine Duplikation**: modeRoutes.ts bezieht Slugs aus Metadaten

---

## Checkliste

- [x] modeMetadata.ts erstellen
- [x] Alle 8 Modi mit Metadaten definieren
- [x] Helper-Funktionen implementieren (getModeIcon, getModeAccentColor, etc.)
- [x] ModeCard.svelte refactoren (4 if-else-Ketten eliminiert)
- [x] modeRoutes.ts integrieren (Slugs aus Metadaten generieren)
- [x] GameModeSelector.svelte aktualisieren
- [x] TypeScript-Check erfolgreich
