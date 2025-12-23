---
title: Spielablauf
description: Phasen-System und Spielschleife
---

## Phasen-Überblick

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

## Nächste Schritte

- [Backend-Architektur](/docs/de/architecture/backend/) - Implementierungsdetails
- [Socket-Events](/docs/de/api/socket-events/) - Echtzeit-Kommunikation
