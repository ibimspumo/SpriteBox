# Architektur-Refactoring

Dieses Verzeichnis enthält die Dokumentation für alle geplanten Refactoring-Maßnahmen im SpriteBox-Projekt.

## Status-Übersicht

| # | Bereich | Status | Priorität |
|---|---------|--------|-----------|
| 1 | [Phase-Management](./01-phases.md) | In Arbeit | KRITISCH |
| 2 | [Socket-Handler](./02-socket-handlers.md) | ✅ Abgeschlossen | KRITISCH |
| 3 | [Server: Weitere](./03-server-weitere.md) | ✅ Abgeschlossen | MITTEL |
| 4 | [Frontend: Komponenten](./04-frontend-komponenten.md) | ✅ Abgeschlossen | HOCH |
| 5 | [Frontend: Mode-Metadaten](./05-mode-metadaten.md) | ✅ Abgeschlossen | HOCH |
| 6 | [Frontend: Phasen-Routing](./06-phasen-routing.md) | ✅ Abgeschlossen | MITTEL |
| 7 | [Shared Types](./07-shared-types.md) | ✅ Abgeschlossen | MITTEL |

## Empfohlene Reihenfolge

### Quick Wins (je unter 1 Tag)

1. **[Mode-Metadaten](./05-mode-metadaten.md)** — ✅ Abgeschlossen (4 if-else-Ketten eliminiert)
2. **[Phasen-Routing](./06-phasen-routing.md)** — ✅ Abgeschlossen (~30 if-else → 1 Map-Eintrag pro Phase)

### Server-Refactoring

3. **[Phase-Management](./01-phases.md)** — In Arbeit
4. **[Socket-Handler](./02-socket-handlers.md)** — ✅ Abgeschlossen (1.454 → 230 Zeilen)
5. **[Server: Weitere](./03-server-weitere.md)** — ✅ debug.ts (973→31), itemSystem (689→176), gameLoop (666→441)

### Frontend-Komponenten

6. **[Frontend: Komponenten](./04-frontend-komponenten.md)** — Große Svelte-Komponenten

### Architektur

7. **[Shared Types](./07-shared-types.md)** — ✅ Abgeschlossen (`@spritebox/types` Package mit 76 Tests)

## Erfolgskriterien

- [ ] Keine Datei über 500 Zeilen (außer Types/Konfiguration)
- [ ] Keine modus-spezifischen if-else-Ketten im Core-Code
- [ ] Neue Spielmodi ohne Änderung an Core-Dateien hinzufügbar
- [x] Types zwischen Server und Client geteilt
- [ ] Alle bestehenden Tests bestehen weiterhin
