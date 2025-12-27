# 02: Socket-Handler Refactoring

**Status:** ✅ Abgeschlossen
**Priorität:** KRITISCH
**Aufwand:** Mittel (2-3 Tage)

---

## Problem

Die Datei `apps/server/src/socket.ts` (1.454 Zeilen) war ein "God Object", das alle Socket-Events verwaltete:

- Verbindungsmanagement
- Lobby-Operationen
- Host-Privilegien
- Spielmodus-spezifische Events (CopyCat, PixelGuesser, ZombiePixel, etc.)

### Symptome

- Spielmodus-Checks verstreut über die gesamte Datei
- `submit-drawing` Handler enthält Mode-Branching
- Jeder neue Modus erforderte Änderungen an mehreren Stellen

---

## Lösung (Implementiert)

Event-Handler wurden nach Domäne und Spielmodus aufgeteilt:

```
apps/server/src/handlers/
├── index.ts              # Haupt-Export und Re-Exports
├── types.ts              # TypedServer, TypedSocket, Handler-Types
├── common.ts             # Gemeinsame Utilities (emitError, validateX, etc.)
├── session.ts            # Session-Token-Management
├── connection.ts         # DoS-Schutz, IP-Tracking
├── lobby.ts              # join-public, create-room, join-room, leave-lobby
├── host.ts               # host-start-game, host-kick-player, host-change-password
├── game.ts               # submit-drawing, vote, finale-vote, restore-session
└── modes/
    ├── index.ts          # Mode-Handler Exports
    ├── copycat.ts        # copycat-rematch-vote
    ├── pixelGuesser.ts   # pixelguesser-draw, pixelguesser-guess
    ├── zombiePixel.ts    # zombie-move
    └── copycatRoyale.ts  # royale-submit
```

---

## Betroffene Dateien

| Datei | Aktion |
|-------|--------|
| `apps/server/src/socket.ts` | Reduziert auf ~230 Zeilen (Core-Setup) |
| `apps/server/src/handlers/*` | Neue Handler-Module (10 Dateien) |

---

## Neue Struktur

### socket.ts (Core)
- ~230 Zeilen (vorher 1.454)
- Nur noch Connection-Setup, Middleware, Player-Init
- Ruft Handler-Module auf

### handlers/common.ts
Gemeinsame Utilities für alle Handler:
- `emitError()` - Standardisierte Fehleremission
- `validateInstanceAndPhase()` - Instanz- und Phasenvalidierung
- `validatePhaseTime()` - Zeitvalidierung
- `validateActivePlayer()` - Spieler-Aktivitätsprüfung
- `validateHost()` - Host-Berechtigungsprüfung
- `validateAndEmit()` - Zod-Validierung mit Fehleremission
- `checkRateLimitAndEmit()` - Rate-Limiting mit Fehler
- `checkRateLimitSilent()` - Rate-Limiting für High-Frequency Events
- `checkGameMode()` / `checkPhase()` - Stille Prüfungen

### handlers/session.ts
Session-Token-Management:
- `storeSessionToken()` - Token speichern
- `validateSessionToken()` - Timing-sichere Validierung
- `removeSessionToken()` - Token entfernen
- `cleanupExpiredSessions()` - Periodische Bereinigung

### handlers/connection.ts
DoS-Schutz und Verbindungsverwaltung:
- `getClientIP()` - IP-Extraktion (inkl. Proxy-Support)
- `registerConnection()` / `unregisterConnection()` - Tracking
- `checkConnectionAllowed()` - Verbindungsprüfung
- `setupConnectionMiddleware()` - Socket.io Middleware

---

## Tests

Unit-Tests wurden hinzugefügt mit vitest:

```bash
pnpm --filter server test        # Tests ausführen
pnpm --filter server test:watch  # Tests im Watch-Modus
pnpm --filter server test:coverage  # Mit Coverage
```

### Test-Dateien:
- `handlers/session.test.ts` - 9 Tests für Session-Management
- `handlers/common.test.ts` - 26 Tests für Common-Utilities

---

## Vorteile der neuen Struktur

1. **Separation of Concerns** - Jeder Handler hat eine klare Verantwortung
2. **Wiederverwendbare Utilities** - Validierungslogik zentralisiert
3. **Einfachere Tests** - Handler können isoliert getestet werden
4. **Neue Modi einfacher** - Nur neue Datei in `handlers/modes/` erstellen
5. **Bessere Wartbarkeit** - Keine 1.400-Zeilen-Datei mehr

---

## Checkliste

- [x] Handler-Verzeichnisstruktur erstellen
- [x] Gemeinsame Utilities extrahieren
- [x] Lobby-Handler migrieren
- [x] Host-Handler migrieren
- [x] Game-Handler migrieren
- [x] Mode-spezifische Handler migrieren
- [x] socket.ts auf Core reduzieren
- [x] TypeScript-Checks bestanden
- [x] Unit-Tests hinzugefügt (35 Tests)
