---
title: Socket-Events
description: Komplette Socket.io Event-Referenz
---

## Verbindungs-Events

### Client → Server

#### `join-room`
Tritt einem Spiel bei.

```typescript
socket.emit('join-room', {
  username: string,      // 1-20 Zeichen
  roomCode?: string,     // 4 Zeichen für private Räume
  password?: string,     // Optional für passwortgeschützte Räume
});
```

#### `create-room`
Erstellt einen privaten Raum.

```typescript
socket.emit('create-room', {
  username: string,
  roomName?: string,     // Optionaler Anzeigename
  password?: string,     // Optionaler Passwortschutz
});
```

#### `leave-room`
Verlässt den aktuellen Raum.

```typescript
socket.emit('leave-room');
```

### Server → Client

#### `room-joined`
Bestätigung des Raumbeitritts.

```typescript
socket.on('room-joined', {
  roomCode: string,
  players: Player[],
  isHost: boolean,
});
```

#### `player-joined` / `player-left`
Spieler-Updates.

```typescript
socket.on('player-joined', { player: Player });
socket.on('player-left', { playerId: string });
```

## Spiel-Events

### Client → Server

#### `submit-drawing`
Sendet die Pixel Art.

```typescript
socket.emit('submit-drawing', {
  pixels: string,  // 64 Hex-Zeichen (8x8 Grid, 4 Bit pro Pixel)
});
```

#### `cast-vote`
Stimmt in einer Voting-Runde ab.

```typescript
socket.emit('cast-vote', {
  choice: 'left' | 'right',
});
```

#### `start-game`
Host startet das Spiel (nur private Räume).

```typescript
socket.emit('start-game');
```

### Server → Client

#### `phase-changed`
Spielphase wechselt.

```typescript
socket.on('phase-changed', {
  phase: 'countdown' | 'drawing' | 'voting' | 'finale' | 'results',
  prompt?: PromptIndices,  // Während Countdown
  duration?: number,        // Millisekunden
});
```

#### `voting-round`
Neue Voting-Runde.

```typescript
socket.on('voting-round', {
  round: number,
  left: { pixels: string, playerId: string },
  right: { pixels: string, playerId: string },
});
```

#### `game-results`
Finale Ergebnisse.

```typescript
socket.on('game-results', {
  rankings: Array<{
    playerId: string,
    username: string,
    pixels: string,
    rating: number,
    rank: number,
  }>,
  gallery: string[],  // Alle Einreichungen
});
```

## Timer-Events

#### `lobby-timer-started`

Lobby-Countdown gestartet (genug Spieler vorhanden).

```typescript
socket.on('lobby-timer-started', {
  duration: number,   // Gesamtdauer in ms
  startsAt: number,   // Endzeitpunkt (Unix timestamp)
});
```

#### `lobby-timer-cancelled`

Lobby-Countdown abgebrochen (nicht mehr genug Spieler).

```typescript
socket.on('lobby-timer-cancelled', {});
```

#### `timer-update`
Synchronisiert den Countdown.

```typescript
socket.on('timer-update', {
  remaining: number,  // Millisekunden
  phase: string,
});
```

## Fehler-Events

#### `error`
Server-Fehlermeldung.

```typescript
socket.on('error', {
  code: string,     // z.B. 'ROOM_NOT_FOUND'
  message: string,  // Benutzerfreundliche Nachricht
});
```

### Fehlercodes

| Code | Beschreibung |
|------|--------------|
| `ROOM_NOT_FOUND` | Raumcode existiert nicht |
| `ROOM_FULL` | Maximale Spielerzahl erreicht |
| `WRONG_PASSWORD` | Falsches Passwort |
| `GAME_IN_PROGRESS` | Kann laufendem Spiel nicht beitreten |
| `RATE_LIMITED` | Zu viele Anfragen |
| `VALIDATION_ERROR` | Ungültige Eingabedaten |

## Nächste Schritte

- [Datenformate](/docs/de/api/data-formats/) - Pixel-Daten & Kompression
- [Entwicklung](/docs/de/contributing/development/) - Neue Events hinzufügen
