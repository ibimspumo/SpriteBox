# 01: Phase-Management Refactoring

**Status:** In Arbeit
**Priorität:** KRITISCH
**Aufwand:** Groß (mehrere Tage)

---

## Detaillierte Dokumentation

Die vollständige Dokumentation befindet sich in:
**[../architecture-refactoring-phases.md](../architecture-refactoring-phases.md)**

---

## Kurzübersicht

### Problem

Die Datei `apps/server/src/phases.ts` (1.770 Zeilen) enthält die gesamte Phase-Handler-Logik für alle Spielmodi in einer einzigen Datei.

### Lösung

Handler-Logik in die bestehenden PhaseManager-Strategies extrahieren.

### Betroffene Dateien

- `apps/server/src/phases.ts` → Aufspalten (~300 Zeilen Core)
- `apps/server/src/phases/strategies/*.ts` → Handler hinzufügen

---

## Checkliste

- [ ] PhaseManager Interface um `handlePhase()` erweitern
- [ ] Gemeinsame Utilities in `phases/common.ts` extrahieren
- [ ] ZombiePixel-Handler migrieren (Proof of Concept)
- [ ] CopyCat-Handler migrieren
- [ ] PixelGuesser-Handler migrieren
- [ ] CopyCat Royale-Handler migrieren
- [ ] Standard-Handler migrieren
- [ ] Alte Handler aus phases.ts entfernen
- [ ] Tests aktualisieren
