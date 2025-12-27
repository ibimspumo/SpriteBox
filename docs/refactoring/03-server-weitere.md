# 03: Server - Weitere Kandidaten

**Status:** ✅ ABGESCHLOSSEN
**Priorität:** MITTEL
**Aufwand:** Mittel (2-3 Tage gesamt)

---

## 3.1 debug.ts (973 → 31 Zeilen) ✅ ABGESCHLOSSEN

### Problem

Monolithische `BotController`-Klasse mit Bot-Verhalten, Zeichnungsgenerierung und REST-Endpoints.

### Lösung (Implementiert)

```
apps/server/src/bots/
├── index.ts              # Barrel exports (31 Zeilen)
├── types.ts              # Bot, BotConfig, BotBehavior (32 Zeilen)
├── config.ts             # DEBUG_CONFIG, BOT_BEHAVIORS, BOT_NAMES (80 Zeilen)
├── BotController.ts      # Core-Orchestrierung (295 Zeilen)
├── endpoints.ts          # REST-API Endpoints (291 Zeilen)
├── handlers/
│   ├── index.ts          # Handler exports (5 Zeilen)
│   ├── DrawingHandler.ts # Drawing-Phase Handler (131 Zeilen)
│   └── VotingHandler.ts  # Voting-Phase Handler (124 Zeilen)
└── drawing/
    ├── index.ts          # Drawing exports (14 Zeilen)
    └── PatternGenerator.ts # Pattern-Generatoren (184 Zeilen)

apps/server/src/debug.ts  # Fassade mit Re-Exports (31 Zeilen)
```

### Checkliste

- [x] Verzeichnisstruktur erstellen
- [x] DrawingGenerator extrahieren → `bots/drawing/PatternGenerator.ts`
- [x] BotBehavior extrahieren → `bots/config.ts`
- [x] Handler extrahieren → `bots/handlers/`
- [x] BotController refactoren → `bots/BotController.ts`
- [x] debug.ts auf Fassade reduzieren (Backward Compatibility)

### Ergebnis

- **Vorher:** 973 Zeilen in einer Datei
- **Nachher:** Keine Datei über 295 Zeilen
- **Backward Compatibility:** 100% (debug.ts als Re-Export-Fassade)

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

## 3.3 ZombiePixel-Subsysteme ✅ ABGESCHLOSSEN

### itemSystem.ts (689 → 176 Zeilen) ✅

```
apps/server/src/gameModes/zombiePixel/systems/
├── itemTypes.ts       # Type definitions (97 Zeilen)
├── ItemRegistry.ts    # Item-Definitionen (84 Zeilen)
├── EffectSystem.ts    # Effekt-Management (212 Zeilen)
├── SpawnSystem.ts     # Spawn-Logik (115 Zeilen)
├── CollectionSystem.ts # Item-Collection (117 Zeilen)
└── index.ts           # Barrel exports (27 Zeilen)

apps/server/src/gameModes/zombiePixel/itemSystem.ts  # Orchestrator (176 Zeilen)
```

### gameLoop.ts (666 → 441 Zeilen) ✅

```
apps/server/src/gameModes/zombiePixel/systems/
├── InfectionSystem.ts  # Infektionsmechanik (153 Zeilen)
├── BroadcastSystem.ts  # State-Updates (85 Zeilen)
└── MovementSystem.ts   # Spieler-Bewegung (85 Zeilen)

apps/server/src/gameModes/zombiePixel/gameLoop.ts  # Orchestrator (441 Zeilen)
```

### Checkliste ZombiePixel

- [x] ItemRegistry extrahieren → `systems/ItemRegistry.ts`
- [x] EffectSystem extrahieren → `systems/EffectSystem.ts`
- [x] SpawnSystem extrahieren → `systems/SpawnSystem.ts`
- [x] CollectionSystem extrahieren → `systems/CollectionSystem.ts`
- [x] InfectionSystem extrahieren → `systems/InfectionSystem.ts`
- [x] MovementSystem extrahieren → `systems/MovementSystem.ts`
- [x] BroadcastSystem extrahieren → `systems/BroadcastSystem.ts`
- [x] itemSystem.ts auf Orchestrierung reduzieren (176 Zeilen)
- [x] gameLoop.ts auf Orchestrierung reduzieren (441 Zeilen)

### Ergebnis

- **itemSystem.ts:** 689 → 176 Zeilen (+ 6 neue Dateien)
- **gameLoop.ts:** 666 → 441 Zeilen (+ 3 neue Dateien)
- **Keine Datei über 450 Zeilen**
- **Backward Compatibility:** 100% (alle Exports erhalten)

---

## Priorisierung

1. **debug.ts** — ✅ Abgeschlossen (973 → 31 Zeilen)
2. **Spielmodus-Dateien** — Teil von Phase-Management
3. **ZombiePixel-Subsysteme** — ✅ Abgeschlossen (1355 → 617 Zeilen in Hauptdateien)

---

## Zusammenfassung Phase 3

| Bereich | Vorher | Nachher | Reduktion |
|---------|--------|---------|-----------|
| debug.ts | 973 | 31 | -97% |
| itemSystem.ts | 689 | 176 | -74% |
| gameLoop.ts | 666 | 441 | -34% |
| **Gesamt (Hauptdateien)** | **2328** | **648** | **-72%** |

Alle Dateien liegen jetzt unter dem Erfolgskriterium von 500 Zeilen.
