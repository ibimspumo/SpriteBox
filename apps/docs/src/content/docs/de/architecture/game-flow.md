---
title: Spielablauf
description: Phasen-System und Spielschleife
---

## Spielmodi

SpriteBox unterstützt mehrere Spielmodi mit unterschiedlichem Ablauf:

| Modus | Beschreibung | Spielerzahl |
|-------|--------------|-------------|
| `pixel-battle` | Klassisch: Prompts zeichnen, Kunstwerke bewerten | 5-100 |
| `copy-cat` | Memory: Referenzbild nachzeichnen | 2 (1v1) |

## Phasen-Überblick (Pixel Battle)

```
┌─────────┐    ┌───────────┐    ┌─────────┐    ┌────────┐
│  Lobby  │───>│ Countdown │───>│ Drawing │───>│ Voting │
└─────────┘    └───────────┘    └─────────┘    └────┬───┘
     ▲                                              │
     │         ┌─────────┐    ┌────────┐           │
     └─────────│ Results │<───│ Finale │<──────────┘
               └─────────┘    └────────┘
```

## Phasen-Details

### 1. Lobby
- Spieler treten bei (min. 5, max. 100)
- Host kann Spiel starten (private Räume)
- Öffentliche Räume starten automatisch

### 2. Countdown (5 Sekunden)
- Prompt wird enthüllt
- Spieler bereiten sich vor
- Kein Zeichnen möglich

### 3. Drawing (60 Sekunden)
- 8x8 Pixel-Canvas
- 16-Farben-Palette
- Zeichnung wird automatisch gesendet

### 4. Voting (2-7 Runden, je 5 Sekunden)
- Elo-basierte Paarauswahl
- Spieler wählen das bessere Bild
- Ratings werden aktualisiert

### 5. Finale (15 Sekunden)
- Top 10% treten gegeneinander an
- Letzte Abstimmungsrunde
- Finale Rankings werden berechnet

### 6. Results (10 Sekunden)
- Gewinner werden angezeigt
- Galerie aller Einreichungen
- Zurück zur Lobby

## Timing-Konfiguration

```typescript
const PHASE_TIMERS = {
  countdown: 5000,      // 5 Sekunden
  drawing: 60000,       // 60 Sekunden
  voting: 5000,         // 5 Sekunden pro Runde
  finale: 15000,        // 15 Sekunden
  results: 10000,       // 10 Sekunden
};
```

## Elo-System

### Grundformel

```
Erwarteter Score = 1 / (1 + 10^((Rb - Ra) / 400))
Neues Rating = Ra + K * (Ergebnis - Erwarteter Score)
```

### K-Faktor

- **K = 32** für normale Spieler
- Höhere K-Werte für volatile Rankings

### Paarauswahl

1. Spieler nach Rating sortieren
2. Ähnliche Ratings paaren
3. Zufällige Variation hinzufügen
4. Wiederholte Paare vermeiden

## Server-Autorität

Alle Phasenübergänge werden vom Server kontrolliert:

```typescript
// Server steuert Timing
setTimeout(() => {
  transitionToPhase('voting');
  broadcastToInstance('phase-changed', { phase: 'voting' });
}, PHASE_TIMERS.drawing);
```

## CopyCat-Modus

CopyCat ist ein 1v1 Memory-basierter Spielmodus mit anderem Phasenablauf.

### Phasenablauf

```
  LOBBY                    COUNTDOWN (5s)           MEMORIZE (5s)
  ┌─────────────┐          ┌─────────────┐          ┌─────────────┐
  │  2 Spieler  │  Auto    │   Bereit    │          │  Referenz-  │
  │  treten bei │ ───────► │   machen    │ ───────► │  bild wird  │
  │  (1v1)      │  start   │             │          │  gezeigt    │
  └─────────────┘          └─────────────┘          └─────────────┘
                                                           │
       ┌───────────────────────────────────────────────────┘
       │
       ▼
  DRAWING (30s)            ERGEBNIS (10s)           REVANCHE?
  ┌─────────────┐          ┌─────────────┐          ┌─────────────┐
  │  Aus dem    │          │  Genauigkeit│   Vote   │  Beide      │
  │  Gedächtnis │ ───────► │  vergleichen│ ───────► │  stimmen    │
  │  zeichnen   │          │  Sieger     │          │  ab         │
  └─────────────┘          └─────────────┘          └─────────────┘
```

### CopyCat-Phasen

| Phase | Dauer | Beschreibung |
|-------|-------|--------------|
| Lobby | Bis 2 Spieler | Sofortstart bei 2. Spieler |
| Countdown | 5 Sekunden | Spieler bereiten sich vor |
| Memorize | 5 Sekunden | Referenzbild wird gezeigt |
| Drawing | 30 Sekunden | Aus dem Gedächtnis nachzeichnen |
| Ergebnis | 10 Sekunden | Genauigkeitsvergleich |
| Revanche | 15 Sekunden | Optional: für neue Runde abstimmen |

### Genauigkeitsberechnung

```typescript
genauigkeit = (übereinstimmendePixel / gesamtPixel) × 100
// Höhere Genauigkeit gewinnt
// Bei Gleichstand: schnellere Einreichung gewinnt
```

## Nächste Schritte

- [Backend-Architektur](/docs/de/architecture/backend/) - Implementierungsdetails
- [Socket-Events](/docs/de/api/socket-events/) - Echtzeit-Kommunikation
