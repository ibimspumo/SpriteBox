# 03: Server - Weitere Kandidaten

**Status:** Offen
**Priorität:** MITTEL
**Aufwand:** Mittel (2-3 Tage gesamt)

---

## 3.1 debug.ts (973 Zeilen)

### Problem

Monolithische `BotController`-Klasse mit Bot-Verhalten, Zeichnungsgenerierung und REST-Endpoints.

### Lösung

```
apps/server/src/bots/
├── BotController.ts        # Core-Orchestrierung
├── BotBehavior.ts          # Verhaltenskonfiguration
├── handlers/
│   ├── BotDrawingHandler.ts
│   └── BotVotingHandler.ts
└── drawing/
    └── DrawingGenerator.ts  # Pattern-Generatoren
```

### Checkliste

- [ ] Verzeichnisstruktur erstellen
- [ ] DrawingGenerator extrahieren
- [ ] BotBehavior extrahieren
- [ ] Handler extrahieren
- [ ] BotController refactoren
- [ ] debug.ts auf Endpoints reduzieren

---

## 3.2 Spielmodus-spezifische Dateien

Diese Dateien enthalten isolierte Logik, die in die entsprechenden PhaseManager integriert werden könnte:

| Datei | Zeilen | Ziel |
|-------|--------|------|
| `pixelGuesser.ts` | 643 | → PixelGuesserPhaseManager |
| `copycatRoyale.ts` | 597 | → CopyCatRoyalePhaseManager |
| `copycat.ts` | 328 | → CopyCatPhaseManager |

### Hinweis

Diese Migration ist Teil des [Phase-Management Refactorings](./01-phases.md) und sollte dort behandelt werden.

---

## 3.3 ZombiePixel-Subsysteme

Die ZombiePixel-Implementierung könnte weiter modularisiert werden:

### itemSystem.ts (689 Zeilen)

| Mögliche Aufteilung | Verantwortlichkeit |
|---------------------|-------------------|
| `ItemRegistry.ts` | Item-Definitionen |
| `ItemManager.ts` | Spawn-Logik, Collection |
| `EffectSystem.ts` | Effekt-Anwendung, Tracking |

### gameLoop.ts (666 Zeilen)

| Mögliche Aufteilung | Verantwortlichkeit |
|---------------------|-------------------|
| `MovementSystem.ts` | Spieler/Bot-Bewegung |
| `CollisionSystem.ts` | Infektionsmechanik |
| `BroadcastSystem.ts` | State-Updates an Clients |

### Checkliste ZombiePixel

- [ ] ItemRegistry extrahieren
- [ ] ItemManager extrahieren
- [ ] EffectSystem extrahieren
- [ ] MovementSystem extrahieren
- [ ] CollisionSystem extrahieren
- [ ] BroadcastSystem extrahieren
- [ ] gameLoop.ts auf Orchestrierung reduzieren

---

## Priorisierung

1. **debug.ts** — Unabhängig, guter Einstieg
2. **Spielmodus-Dateien** — Teil von Phase-Management
3. **ZombiePixel-Subsysteme** — Optional, nur bei Bedarf
