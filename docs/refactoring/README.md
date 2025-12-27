# Architektur-Refactoring

Dieses Verzeichnis enthält die Dokumentation für alle geplanten Refactoring-Maßnahmen im SpriteBox-Projekt.

## Status-Übersicht

| # | Bereich | Status | Priorität |
|---|---------|--------|-----------|
| 1 | [Phase-Management](./01-phases.md) | In Arbeit | KRITISCH |
| 2 | [Socket-Handler](./02-socket-handlers.md) | Offen | KRITISCH |
| 3 | [Server: Weitere](./03-server-weitere.md) | Offen | MITTEL |
| 4 | [Frontend: Komponenten](./04-frontend-komponenten.md) | Offen | HOCH |
| 5 | [Frontend: Mode-Metadaten](./05-mode-metadaten.md) | Offen | HOCH |
| 6 | [Frontend: Phasen-Routing](./06-phasen-routing.md) | Offen | MITTEL |
| 7 | [Shared Types](./07-shared-types.md) | Offen | MITTEL |

## Empfohlene Reihenfolge

### Quick Wins (je unter 1 Tag)

1. **[Mode-Metadaten](./05-mode-metadaten.md)** — Entfernt 4 if-else-Ketten, hoher Impact
2. **[Phasen-Routing](./06-phasen-routing.md)** — Ersetzt 12-Zweig if-else

### Server-Refactoring

3. **[Phase-Management](./01-phases.md)** — In Arbeit
4. **[Socket-Handler](./02-socket-handlers.md)** — God-Object auflösen
5. **[Server: Weitere](./03-server-weitere.md)** — debug.ts, ZombiePixel-Subsysteme

### Frontend-Komponenten

6. **[Frontend: Komponenten](./04-frontend-komponenten.md)** — Große Svelte-Komponenten

### Architektur

7. **[Shared Types](./07-shared-types.md)** — Type-Bibliothek für Monorepo

## Erfolgskriterien

- [ ] Keine Datei über 500 Zeilen (außer Types/Konfiguration)
- [ ] Keine modus-spezifischen if-else-Ketten im Core-Code
- [ ] Neue Spielmodi ohne Änderung an Core-Dateien hinzufügbar
- [ ] Types zwischen Server und Client geteilt
- [ ] Alle bestehenden Tests bestehen weiterhin
