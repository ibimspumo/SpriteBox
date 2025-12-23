---
title: Socket-Events
description: Komplette Socket.io Event-Referenz
---

Alle Echtzeit-Kommunikation nutzt Socket.io. Events folgen dem Muster: `noun-verb`.

## Client → Server Events

### Verbindung & Lobby

| Event | Payload | Beschreibung |
|-------|---------|--------------|
| `join-public` | `{ gameMode?: string }` | Öffentlichem Spiel beitreten (Standard: pixel-battle) |
| `create-room` | `{ password?: string; gameMode?: string }` | Privaten Raum erstellen (optionales Passwort & Modus) |
| `join-room` | `{ code: string; password?: string }` | Privatem Raum per Code beitreten |
| `leave-lobby` | `{}` | Aktuelles Spiel verlassen |
| `leave-queue` | `{}` | Warteschlange verlassen |
| `view-mode` | `{ gameMode: string }` | Modus-Auswahl-Seite wird angezeigt |
| `leave-mode` | `{}` | Modus-Seite verlassen |

### Host-Funktionen (Private Räume)

| Event | Payload | Beschreibung |
|-------|---------|--------------|
| `host-start-game` | `{}` | Spiel manuell starten (nur Host) |
| `host-kick-player` | `{ playerId: string }` | Spieler aus Lobby kicken |
| `host-change-password` | `{ password: string \| null }` | Passwort setzen oder entfernen |

### Gameplay

| Event | Payload | Beschreibung |
|-------|---------|--------------|
| `submit-drawing` | `{ pixels: string }` | 64-Zeichen Hex-Kunstwerk einreichen |
| `vote` | `{ chosenId: string }` | Für Bild im Matchup stimmen |
| `finale-vote` | `{ playerId: string }` | Für Finalist stimmen |
| `copycat-rematch-vote` | `{ wantsRematch: boolean }` | CopyCat-Modus: Für Revanche stimmen |

### Benutzer-Verwaltung

| Event | Payload | Beschreibung |
|-------|---------|--------------|
| `change-name` | `{ name: string }` | Anzeigenamen ändern (1-20 Zeichen) |
| `restore-user` | `{ displayName: string }` | Benutzername aus localStorage wiederherstellen |
| `restore-session` | `{ sessionId: string }` | Session nach Neuverbindung wiederherstellen |
| `ping` | `callback` | Latenz-Check |

## Server → Client Events

### Verbindung & Fehler

| Event | Payload | Beschreibung |
|-------|---------|--------------|
| `connected` | `{ socketId, serverTime, user, sessionId }` | Willkommens-Event mit Session-Token |
| `error` | `{ code, message?, retryAfter? }` | Fehlerbenachrichtigung |
| `idle-warning` | `{ timeLeft: number }` | Warnung vor Inaktivitäts-Trennung |
| `idle-disconnect` | `{ reason: string }` | Wegen Inaktivität getrennt |

### Lobby-Events

| Event | Payload | Beschreibung |
|-------|---------|--------------|
| `lobby-joined` | Siehe unten | Erfolgreich Lobby beigetreten |
| `room-created` | `{ code, instanceId }` | Privater Raum erstellt |
| `player-joined` | `{ user: User }` | Neuer Spieler in Lobby |
| `player-left` | `{ playerId, user?, kicked? }` | Spieler hat verlassen |
| `player-updated` | `{ playerId, user }` | Spieler-Info aktualisiert |
| `player-disconnected` | `{ playerId, user, timestamp }` | Spieler getrennt (Gnadenfrist) |
| `player-reconnected` | `{ playerId, user, timestamp }` | Spieler wieder verbunden |
| `name-changed` | `{ user: User }` | Namensänderung bestätigt |
| `left-lobby` | `{}` | Lobby-Verlassen bestätigt |
| `kicked` | `{ reason: string }` | Du wurdest gekickt |
| `lobby-timer-started` | `{ duration, startsAt }` | Countdown zum Auto-Start |
| `lobby-timer-cancelled` | `{}` | Timer abgebrochen (nicht genug Spieler) |
| `password-required` | `{ code: string }` | Passwort zum Beitreten benötigt |
| `password-changed` | `{ hasPassword: boolean }` | Passwort aktualisiert |

**`lobby-joined` Payload:**

```typescript
{
  instanceId: string;
  type: 'public' | 'private';
  code?: string;
  isHost?: boolean;
  hasPassword: boolean;
  players: User[];
  spectator: boolean;
  gameMode: string;
  phase?: GamePhase;
  prompt?: Prompt;
  timerEndsAt?: number;
  votingRound?: number;
  votingTotalRounds?: number;
}
```

### Spielstatus-Events

| Event | Payload | Beschreibung |
|-------|---------|--------------|
| `phase-changed` | Siehe unten | Phasenwechsel |
| `submission-received` | `{ success, submissionCount }` | Zeichnung eingereicht |
| `submission-count` | `{ count, total }` | Einreichungs-Fortschritt |

**`phase-changed` Payload:**

```typescript
{
  phase: GamePhase;
  prompt?: Prompt;
  promptIndices?: PromptIndices;
  duration?: number;
  startsAt?: number;
  endsAt?: number;
  message?: string;
  round?: number;
  totalRounds?: number;
}
```

### Voting-Events

| Event | Payload | Beschreibung |
|-------|---------|--------------|
| `voting-round` | Siehe unten | Neue Voting-Runde gestartet |
| `vote-received` | `{ success, eloChange? }` | Stimme registriert |
| `finale-start` | Siehe unten | Finale-Phase gestartet |
| `finale-vote-received` | `{ success }` | Finale-Stimme registriert |

**`voting-round` Payload:**

```typescript
{
  round: number;
  totalRounds: number;
  imageA: { playerId: string; pixels: string };
  imageB: { playerId: string; pixels: string };
  timeLimit: number;
  endsAt: number;
}
```

**`finale-start` Payload:**

```typescript
{
  finalists: Array<{
    playerId: string;
    pixels: string;
    user: User;
    elo: number;
  }>;
  timeLimit: number;
  endsAt: number;
}
```

### CopyCat-Modus Events

CopyCat ist ein 1v1 Memory-basierter Spielmodus mit eigenen Phasen.

| Event | Payload | Beschreibung |
|-------|---------|--------------|
| `copycat-image` | `{ pixels: string }` | Referenzbild zum Merken |
| `copycat-result` | Siehe unten | Rundenergebnis mit Genauigkeit |
| `copycat-rematch-update` | `{ votes, declined? }` | Revanche-Status |

**`copycat-result` Payload:**

```typescript
{
  yourPixels: string;
  opponentPixels: string;
  referencePixels: string;
  yourAccuracy: number;      // 0-100 Prozent
  opponentAccuracy: number;
  winner: 'you' | 'opponent' | 'draw';
  player: { user: User; accuracy: number };
  opponent: { user: User; accuracy: number };
}
```

### Ergebnisse & Galerie

| Event | Payload | Beschreibung |
|-------|---------|--------------|
| `game-results` | Siehe unten | Finale Platzierungen |

**`game-results` Payload:**

```typescript
{
  prompt?: Prompt;
  promptIndices?: PromptIndices;
  rankings: Array<{
    place: number;
    playerId: string;
    user: User;
    pixels: string;
    finalVotes: number;
    elo: number;
  }>;
  compressedRankings?: string;  // LZ-String bei 50+ Spielern
  totalParticipants: number;
}
```

### Warteschlange & Server-Status

| Event | Payload | Beschreibung |
|-------|---------|--------------|
| `queued` | `{ position, estimatedWait }` | Zur Warteschlange hinzugefügt |
| `queue-update` | `{ position, estimatedWait }` | Warteschlangen-Position geändert |
| `queue-ready` | `{ message }` | Platz verfügbar |
| `queue-removed` | `{ reason }` | Aus Warteschlange entfernt |
| `server-status` | `{ status, currentPlayers, maxPlayers }` | Server-Status |
| `online-count` | `{ count, total, byMode }` | Online-Spieler (gesamt + pro Modus) |

### Session-Events

| Event | Payload | Beschreibung |
|-------|---------|--------------|
| `session-restored` | Siehe unten | Session nach Neuverbindung wiederhergestellt |
| `session-restore-failed` | `{ reason }` | Wiederherstellung fehlgeschlagen |
| `instance-closing` | `{ reason }` | Spielinstanz wird geschlossen |
| `game-modes` | `{ available[], default }` | Verfügbare Spielmodi |

## Rate Limits

| Event | Limit |
|-------|-------|
| Global | 50 Anfragen/Sekunde pro Socket |
| `submit-drawing` | 5/Minute |
| `vote` | 3/Sekunde |
| `create-room` | 3/Minute |
| `join-room` | 5/10 Sekunden |
| `change-name` | 5/Minute |
| `copycat-rematch-vote` | 2/10 Sekunden |

## Fehlercodes

| Code | Beschreibung |
|------|--------------|
| `ROOM_NOT_FOUND` | Raumcode existiert nicht |
| `ROOM_FULL` | Maximale Spielerzahl erreicht |
| `WRONG_PASSWORD` | Falsches Passwort |
| `GAME_IN_PROGRESS` | Kann laufendem Spiel nicht beitreten |
| `RATE_LIMITED` | Zu viele Anfragen |
| `VALIDATION_ERROR` | Ungültige Eingabedaten |
| `NOT_IN_GAME` | Nicht in einem Spiel |
| `WRONG_PHASE` | Falsche Spielphase |

## Beispiel

```typescript
import { io } from 'socket.io-client';

const socket = io('wss://spritebox.de');

// Verbindung behandeln
socket.on('connected', ({ user, sessionId }) => {
  console.log('Verbunden als', user.fullName);
  localStorage.setItem('sessionId', sessionId);
});

// Öffentlichem Spiel beitreten (Standard-Modus)
socket.emit('join-public', {});

// Bestimmtem Spielmodus beitreten
socket.emit('join-public', { gameMode: 'copy-cat' });

// Phasenwechsel behandeln
socket.on('phase-changed', ({ phase, promptIndices }) => {
  if (phase === 'drawing') {
    showCanvas();
  }
});

// Kunstwerk einreichen
socket.emit('submit-drawing', {
  pixels: '0000000000000000000F0F00000F0F0000FFFF0000000000000000000000000'
});

// Voting behandeln
socket.on('voting-round', ({ imageA, imageB }) => {
  displayMatchup(imageA, imageB);
});

socket.emit('vote', { chosenId: imageA.playerId });
```
