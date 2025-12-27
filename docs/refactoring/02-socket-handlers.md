# 02: Socket-Handler Refactoring

**Status:** Offen
**Priorität:** KRITISCH
**Aufwand:** Mittel (2-3 Tage)

---

## Problem

Die Datei `apps/server/src/socket.ts` (1.454 Zeilen) ist ein "God Object", das alle Socket-Events verwaltet:

- Verbindungsmanagement
- Lobby-Operationen
- Host-Privilegien
- Spielmodus-spezifische Events (CopyCat, PixelGuesser, ZombiePixel, etc.)

### Symptome

- Spielmodus-Checks verstreut über die gesamte Datei
- `submit-drawing` Handler enthält Mode-Branching (Zeile 930)
- Jeder neue Modus erfordert Änderungen an mehreren Stellen

---

## Lösung

Event-Handler nach Domäne und Spielmodus aufteilen:

```
apps/server/src/handlers/
├── lobby/
│   ├── joinPublic.ts
│   ├── joinRoom.ts
│   ├── createRoom.ts
│   └── leaveRoom.ts
├── host/
│   ├── startGame.ts
│   ├── kickPlayer.ts
│   └── changePassword.ts
├── game/
│   ├── submitDrawing.ts
│   ├── vote.ts
│   └── finaleVote.ts
└── modes/
    ├── copyCatHandlers.ts
    ├── pixelGuesserHandlers.ts
    ├── zombiePixelHandlers.ts
    └── copyCatRoyaleHandlers.ts
```

---

## Betroffene Dateien

| Datei | Aktion |
|-------|--------|
| `apps/server/src/socket.ts` | Aufspalten in Handler-Module |

---

## Implementierungsschritte

### Phase 1: Infrastruktur

1. Handler-Verzeichnisstruktur erstellen
2. Gemeinsame Utilities extrahieren (Validierung, Error-Handling)
3. Handler-Registrierungs-Pattern definieren

### Phase 2: Lobby-Handler

4. `joinPublic` extrahieren
5. `joinRoom` extrahieren
6. `createRoom` extrahieren
7. `leaveRoom` extrahieren

### Phase 3: Host-Handler

8. `startGame` extrahieren
9. `kickPlayer` extrahieren
10. `changePassword` extrahieren

### Phase 4: Game-Handler

11. `submitDrawing` extrahieren (mit Mode-Branching auflösen)
12. `vote` extrahieren
13. `finaleVote` extrahieren

### Phase 5: Mode-spezifische Handler

14. CopyCat-Handler extrahieren
15. PixelGuesser-Handler extrahieren
16. ZombiePixel-Handler extrahieren
17. CopyCat Royale-Handler extrahieren

### Phase 6: Aufräumen

18. socket.ts auf Core-Logik reduzieren
19. Tests aktualisieren

---

## Checkliste

- [ ] Handler-Verzeichnisstruktur erstellen
- [ ] Gemeinsame Utilities extrahieren
- [ ] Lobby-Handler migrieren
- [ ] Host-Handler migrieren
- [ ] Game-Handler migrieren
- [ ] Mode-spezifische Handler migrieren
- [ ] socket.ts auf Core reduzieren
- [ ] Tests aktualisieren
