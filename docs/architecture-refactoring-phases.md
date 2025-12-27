# Architektur-Refactoring: Phase-Management System

## Zusammenfassung

Dieses Dokument beschreibt das geplante Refactoring des Phase-Management-Systems im SpriteBox-Server. Ziel ist es, die monolithische `phases.ts` Datei (1.770 Zeilen) in modulare, spielmodus-spezifische Komponenten aufzuteilen.

---

## Problemstellung

### Aktuelle Situation

Mit der wachsenden Anzahl an Spielmodi (aktuell 6) ist die zentrale `phases.ts` Datei zu einem Monolithen geworden:

| Datei | Zeilen | Verantwortlichkeiten |
|-------|--------|---------------------|
| `phases.ts` | 1.770 | Phase-Routing, Timer, Handler-Logik für ALLE Modi |
| `socket.ts` | 1.454 | Event-Handler mit Mode-spezifischen Verzweigungen |

### Symptome des Problems

1. **Lange if-else-Ketten**: `startGame()` und `handleCountdown()` haben jeweils 5+ Verzweigungen basierend auf dem Spielmodus
2. **Switch mit 17 Cases**: `transitionTo()` routet zu 17 verschiedenen Phasen
3. **Keine Isolation**: Änderungen an einem Modus können unbeabsichtigt andere Modi beeinflussen
4. **Schwere Testbarkeit**: Die gesamte Phase-Logik muss zusammen getestet werden
5. **Onboarding-Hürde**: Neue Entwickler müssen 1.700+ Zeilen verstehen, um einen einzelnen Modus zu ändern

### Betroffene Spielmodi

- **Standard (PixelBattle)**: Elo-basiertes Voting mit Finale
- **CopyCat**: 1v1 Memory-Spiel mit Referenzbild
- **CopyCat Solo**: Einzelspieler-Variante
- **PixelGuesser**: Pictionary-Style Ratespiel
- **ZombiePixel**: Echtzeit-Infektionsspiel
- **CopyCat Royale**: Battle-Royale Eliminierungsmodus

---

## Bestehende Architektur (positiv)

Es existiert bereits eine gute Grundstruktur, auf der wir aufbauen können:

### Strategy-Pattern für Lobby-Verhalten

```
lobby/
├── types.ts                    # LobbyStrategy Interface
├── index.ts                    # Factory mit Caching
└── strategies/
    ├── StandardLobbyStrategy.ts
    ├── PrivateLobbyStrategy.ts
    ├── CopyCatLobbyStrategy.ts
    ├── CopyCatSoloLobbyStrategy.ts
    ├── ZombiePixelLobbyStrategy.ts
    └── CopyCatRoyaleLobbyStrategy.ts
```

**Funktioniert bereits gut**: Jeder Modus definiert eigene Join-Regeln, Auto-Start-Logik und Timer-Verhalten.

### Strategy-Pattern für Phase-Konfiguration

```
phases/
├── types.ts                    # PhaseManager Interface
├── index.ts                    # Factory mit Caching
└── strategies/
    ├── StandardPhaseManager.ts
    ├── CopyCatPhaseManager.ts
    ├── PixelGuesserPhaseManager.ts
    ├── PixelSurvivorPhaseManager.ts
    ├── ZombiePixelPhaseManager.ts
    └── CopyCatRoyalePhaseManager.ts
```

**Problem**: Diese Strategies definieren nur die Konfiguration (welche Phasen, Timings, Voting-Regeln), aber nicht die eigentliche Handler-Logik.

### GameMode Registry

```
gameModes/
├── registry.ts                 # Zentrales Register
├── helpers.ts                  # Utility-Funktionen
└── modes/                      # Konfiguration pro Modus
```

**Funktioniert bereits gut**: Zentrale Konfiguration aller Spielmodi.

---

## Kernproblem

**Die PhaseManager-Strategies sind nur Konfigurationsobjekte.**

Die eigentliche Handler-Logik (`handleDrawing()`, `handleVoting()`, `handleZombieActive()`, etc.) liegt komplett in der monolithischen `phases.ts`:

| Modus | Handler in phases.ts | Zeilen |
|-------|---------------------|--------|
| Standard | 12 Funktionen | ~420 |
| CopyCat | 7 Funktionen | ~265 |
| PixelGuesser | 6 Funktionen | ~290 |
| ZombiePixel | 2 Funktionen | ~75 |
| CopyCat Royale | 8 Funktionen | ~380 |

---

## Lösungsansatz

### Ziel-Architektur

Die Phase-Handler-Logik wird in die bestehenden Strategy-Dateien integriert. `phases.ts` wird zum reinen Router reduziert.

**Vorher:**
```
phases.ts (1.770 Zeilen)
├── Core-Routing (startGame, transitionTo)
├── Standard-Handler (handleDrawing, handleVoting, ...)
├── CopyCat-Handler (handleMemorize, handleCopyCatResult, ...)
├── PixelGuesser-Handler (handleGuessing, handleReveal, ...)
├── ZombiePixel-Handler (handleZombieActive, ...)
└── CopyCatRoyale-Handler (handleRoyale*, ...)
```

**Nachher:**
```
phases/
├── index.ts (~300 Zeilen)           # Nur Routing und gemeinsame Utilities
├── types.ts                          # Erweiterte Interfaces
├── common.ts                         # Shared-Funktionen
└── strategies/
    ├── StandardPhaseManager.ts       # Konfiguration + Handler
    ├── CopyCatPhaseManager.ts        # Konfiguration + Handler
    ├── PixelGuesserPhaseManager.ts   # Konfiguration + Handler
    ├── ZombiePixelPhaseManager.ts    # Konfiguration + Handler
    └── CopyCatRoyalePhaseManager.ts  # Konfiguration + Handler
```

### Prinzip

Jeder PhaseManager übernimmt die vollständige Verantwortung für seinen Spielmodus:
- Phasen-Konfiguration (bereits vorhanden)
- Phasen-Übergänge
- Timer-Management
- Event-Handling innerhalb der Phasen
- Spielende-Logik

---

## Vorteile des Refactorings

### 1. Isolation
Jeder Spielmodus ist vollständig gekapselt. Änderungen an ZombiePixel können CopyCat nicht beeinflussen.

### 2. Testbarkeit
Einzelne Modi können unabhängig getestet werden, ohne die gesamte Phase-Logik zu laden.

### 3. Erweiterbarkeit
Neue Spielmodi hinzufügen = Eine neue Strategy-Datei erstellen + im Factory registrieren. Keine Änderungen an Core-Dateien nötig.

### 4. Lesbarkeit
Entwickler müssen nur ~300-400 Zeilen verstehen, um einen einzelnen Modus vollständig zu erfassen.

### 5. Konsistenz
Alle Modi folgen dem gleichen Muster, was das Onboarding neuer Entwickler erleichtert.

### 6. Parallelarbeit
Verschiedene Entwickler können an verschiedenen Modi arbeiten, ohne Merge-Konflikte zu riskieren.

---

## Betroffene Dateien

### Primär (Refactoring-Fokus)

| Datei | Aktion | Erwartete Änderung |
|-------|--------|-------------------|
| `apps/server/src/phases.ts` | Aufspalten | 1.770 → ~300 Zeilen |
| `apps/server/src/phases/strategies/StandardPhaseManager.ts` | Erweitern | +~400 Zeilen Handler |
| `apps/server/src/phases/strategies/CopyCatPhaseManager.ts` | Erweitern | +~265 Zeilen Handler |
| `apps/server/src/phases/strategies/CopyCatRoyalePhaseManager.ts` | Erweitern | +~380 Zeilen Handler |
| `apps/server/src/phases/strategies/PixelGuesserPhaseManager.ts` | Erweitern | +~290 Zeilen Handler |
| `apps/server/src/phases/strategies/ZombiePixelPhaseManager.ts` | Erweitern | +~75 Zeilen Handler |

### Sekundär (Konsolidierung)

Diese Dateien enthalten modus-spezifische Logik, die in die Strategies integriert werden sollte:

| Datei | Aktion |
|-------|--------|
| `apps/server/src/copycat.ts` | In CopyCatPhaseManager integrieren |
| `apps/server/src/copycatRoyale.ts` | In CopyCatRoyalePhaseManager integrieren |
| `apps/server/src/pixelGuesser.ts` | In PixelGuesserPhaseManager integrieren |

### Tertiär (Optional)

| Datei | Aktion |
|-------|--------|
| `apps/server/src/socket.ts` | Mode-spezifische Submission-Handler extrahieren |

### Keine Änderung nötig

Diese Dateien sind bereits gut strukturiert:

- `apps/server/src/instance.ts` — Delegiert bereits vollständig an Strategies
- `apps/server/src/lobby/` — Strategy-Pattern bereits implementiert
- `apps/server/src/gameModes/` — Registry-Pattern funktioniert gut

---

## Implementierungsreihenfolge

### Phase 1: Infrastruktur
1. `PhaseManager` Interface um `handlePhase()` Methode erweitern
2. Gemeinsame Utilities in `phases/common.ts` extrahieren
3. `phases/index.ts` als Router umstrukturieren

### Phase 2: Modi migrieren (einer nach dem anderen)
1. **ZombiePixel** (kleinster Modus, ~75 Zeilen) — Proof of Concept
2. **CopyCat + CopyCatSolo** (eigenständig, keine Voting-Logik)
3. **PixelGuesser** (eigenständig, Punkte statt Elo)
4. **CopyCat Royale** (komplex, aber isoliert)
5. **Standard** (größter Modus, als letztes)

### Phase 3: Aufräumen
1. Leere Handler aus `phases.ts` entfernen
2. Standalone-Dateien (`copycat.ts`, etc.) löschen
3. Imports in `socket.ts` aktualisieren

---

## Risiken und Mitigierung

### Risiko: Regressions während der Migration
**Mitigierung**: Modi einzeln migrieren, nach jedem Schritt vollständig testen

### Risiko: Shared State zwischen Modi
**Mitigierung**: Gemeinsame Utilities klar in `common.ts` definieren, keine impliziten Abhängigkeiten

### Risiko: Inkonsistente Schnittstellen
**Mitigierung**: Strikte TypeScript-Interfaces definieren, bevor Handler verschoben werden

---

## Erfolgskriterien

- [ ] `phases.ts` hat weniger als 400 Zeilen
- [ ] Jeder PhaseManager enthält vollständige Handler-Logik für seinen Modus
- [ ] Keine modus-spezifischen if-else-Ketten im Core-Router
- [ ] Alle bestehenden Tests bestehen weiterhin
- [ ] Neue Modi können ohne Änderung an Core-Dateien hinzugefügt werden

---

## Referenzen

- `apps/server/src/phases.ts` — Aktuelle monolithische Implementierung
- `apps/server/src/phases/strategies/` — Bestehende Strategy-Struktur
- `apps/server/src/lobby/` — Referenz für gut implementiertes Strategy-Pattern
- `apps/server/src/gameModes/` — GameMode-Konfigurationssystem
