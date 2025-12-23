# Pre-Commit Documentation Check

Analysiere die aktuellen Git-Änderungen und aktualisiere bei Bedarf die Dokumentation.

## Aufgaben

1. **Git Diff analysieren**: Führe `git diff --cached --name-only` und `git diff --name-only` aus um zu sehen welche Dateien geändert wurden.

2. **Änderungen kategorisieren**:
   - Server-Code (`apps/server/`) → Prüfe Backend-Docs
   - Frontend-Code (`apps/web/src/lib/`) → Prüfe Frontend-Docs
   - Socket-Events → Prüfe API-Docs
   - i18n-Änderungen → Prüfe ob beide Sprachen aktuell
   - Neue Features → Prüfe Getting Started / Quick Start

3. **Dokumentation aktualisieren** falls nötig:
   - `apps/docs/src/content/docs/` - Starlight Docs (EN)
   - `apps/docs/src/content/docs/de/` - Starlight Docs (DE)
   - Halte beide Sprachen synchron!

4. **CLAUDE.md prüfen** falls:
   - Neue Patterns/Konventionen eingeführt wurden
   - Projekt-Struktur sich geändert hat
   - Neue Commands hinzugefügt wurden
   - Build-Prozess sich geändert hat

5. **README.md prüfen** falls:
   - Neue Features für Endnutzer hinzugefügt wurden
   - Setup-Prozess sich geändert hat
   - Neue Abhängigkeiten hinzugefügt wurden

6. **Docs bauen**: Führe `pnpm docs:build` aus um sicherzustellen dass die Docs kompilieren.

## Wichtig

- Dokumentiere nur signifikante Änderungen (keine Typo-Fixes, kleine Refactors)
- Halte den gleichen Stil wie existierende Docs
- Deutsche Docs verwenden informelles "du" (nicht "Sie")
- Erstelle KEINE neuen Docs-Seiten ohne guten Grund
- Frage nach wenn unklar ob Dokumentation nötig ist
