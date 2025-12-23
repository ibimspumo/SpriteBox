---
title: Architektur-Überblick
description: High-Level Systemdesign von SpriteBox
---

## Systemdiagramm

```
┌─────────────────────────────────────────────────────────────┐
│                        Clients                               │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐        │
│  │Browser 1│  │Browser 2│  │Browser 3│  │Browser N│        │
│  └────┬────┘  └────┬────┘  └────┬────┘  └────┬────┘        │
│       │            │            │            │              │
│       └────────────┼────────────┼────────────┘              │
│                    │            │                           │
│                    ▼            ▼                           │
│              ┌──────────────────────┐                       │
│              │     Socket.io        │                       │
│              │   (WebSocket/HTTP)   │                       │
│              └──────────┬───────────┘                       │
└─────────────────────────┼───────────────────────────────────┘
                          │
┌─────────────────────────┼───────────────────────────────────┐
│                   Server│                                    │
│              ┌──────────▼───────────┐                       │
│              │    Express + HTTP    │                       │
│              │   (Statische Files)  │                       │
│              └──────────┬───────────┘                       │
│                         │                                   │
│    ┌────────────────────┼────────────────────┐              │
│    │                    │                    │              │
│    ▼                    ▼                    ▼              │
│ ┌──────┐          ┌──────────┐        ┌──────────┐         │
│ │Lobby │          │Instanzen │        │ Spieler  │         │
│ │Queue │          │  (Map)   │        │  (Map)   │         │
│ └──────┘          └──────────┘        └──────────┘         │
│                         │                                   │
│              ┌──────────┴───────────┐                       │
│              │   Spielinstanz       │                       │
│              │  ┌────────────────┐  │                       │
│              │  │ Phase Machine  │  │                       │
│              │  │ Einreichungen  │  │                       │
│              │  │ Elo Ratings    │  │                       │
│              │  └────────────────┘  │                       │
│              └──────────────────────┘                       │
└─────────────────────────────────────────────────────────────┘
```

## Kernprinzipien

### Server ist Autorität

Alle Spiellogik läuft auf dem Server. Der Client sendet Aktionen, der Server validiert und sendet Zustandsänderungen.

```
Client                    Server
  │                          │
  │──── submitDrawing ──────>│
  │                          │ validieren
  │                          │ speichern
  │<─── drawingAccepted ─────│
  │                          │
```

### Kein persistenter Zustand

Alles lebt im Arbeitsspeicher:
- Spielinstanzen: `Map<string, GameInstance>`
- Spieler: `Map<string, Player>`
- Einreichungen: `Map<string, Submission>`

Wenn der Server neu startet, wird alles zurückgesetzt. Das ist beabsichtigt.

### Instanz-System

**Öffentliche Instanzen:**
- Auto-Sharding basierend auf Spielerzahl
- Spieler werden offenen Instanzen zugewiesen
- Neue Instanz wenn bestehende voll (100 Spieler)

**Private Instanzen:**
- 4-Zeichen-Raumcodes (z.B. "A7X2")
- Optionaler Passwortschutz
- Host kontrolliert Spielstart

## Datenfluss

1. **Verbindung**: Client verbindet → Socket-ID zugewiesen
2. **Beitritt**: Client sendet join-Anfrage → Server weist Instanz zu
3. **Spielschleife**: Server steuert Timer → Clients synchronisieren
4. **Einreichung**: Client sendet Zeichnung → Server validiert & speichert
5. **Abstimmung**: Server wählt Paare → Clients sehen & stimmen ab
6. **Ergebnisse**: Server berechnet Elo → Clients zeigen Rangliste

## Nächste Schritte

- [Frontend-Architektur](/docs/de/architecture/frontend/) - Komponenten-Struktur
- [Backend-Architektur](/docs/de/architecture/backend/) - Server-Implementierung
- [Spielablauf](/docs/de/architecture/game-flow/) - Phasen-System
