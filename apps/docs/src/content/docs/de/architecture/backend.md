---
title: Backend-Architektur
description: Node.js Server-Implementierung
---

## Tech-Stack

- **Node.js** mit Express für HTTP
- **Socket.io** für WebSocket-Kommunikation
- **Zod** für Schema-Validierung
- **TypeScript** für Typsicherheit

## Dateistruktur

```
apps/server/src/
├── index.ts          # Einstiegspunkt, Express-Setup
├── socket.ts         # Socket.io Event-Handler
├── instance.ts       # Spielinstanz-Verwaltung
├── phases.ts         # Phasen-State-Machine
├── gameModes/        # Spielmodus-System
│   ├── index.ts          # Modus-Initialisierung
│   ├── registry.ts       # Modus-Registrierung
│   ├── types.ts          # Modus-Interfaces
│   ├── helpers.ts        # Hilfsfunktionen
│   └── modes/
│       ├── pixelBattle.ts    # Klassisch (5-100 Spieler)
│       ├── copyCat.ts        # 1v1 Gedächtnisduell
│       ├── pixelGuesser.ts   # Pictionary-Stil
│       └── pixelSurvivor.ts  # Solo-Roguelike
├── voting/           # Abstimmungssystem
│   ├── index.ts          # Strategie-Factory
│   └── strategies/
│       ├── EloVotingStrategy.ts
│       └── NoVotingStrategy.ts
├── validation.ts     # Zod-Schemas
├── rateLimit.ts      # DoS-Schutz
└── types.ts          # TypeScript-Typdefinitionen
```

## Kernmodule

### Instance Manager (`instance.ts`)

Verwaltet Spielinstanzen:

```typescript
const instances = new Map<string, GameInstance>();

interface GameInstance {
  id: string;
  type: 'public' | 'private';
  players: Map<string, Player>;
  submissions: Map<string, Submission>;
  phase: Phase;
  prompt: PromptIndices;
  host?: string;
  password?: string;
}
```

### Socket Handler (`socket.ts`)

Verarbeitet Echtzeit-Events:

```typescript
io.on('connection', (socket) => {
  socket.on('join-room', (data) => {
    const validated = joinRoomSchema.parse(data);
    // Spieler zur Instanz hinzufügen
  });

  socket.on('submit-drawing', (data) => {
    const validated = drawingSchema.parse(data);
    // Zeichnung speichern
  });
});
```

### Voting System (`voting.ts`)

Elo-Rating-Berechnung:

```typescript
function calculateElo(
  winnerRating: number,
  loserRating: number,
  k: number = 32
): [number, number] {
  const expectedWinner = 1 / (1 + Math.pow(10, (loserRating - winnerRating) / 400));
  const expectedLoser = 1 - expectedWinner;

  return [
    winnerRating + k * (1 - expectedWinner),
    loserRating + k * (0 - expectedLoser)
  ];
}
```

## Validierung mit Zod

Alle Client-Eingaben werden validiert:

```typescript
const joinRoomSchema = z.object({
  username: z.string().min(1).max(20),
  roomCode: z.string().length(4).optional(),
  password: z.string().optional(),
});

const drawingSchema = z.object({
  pixels: z.string().length(64).regex(/^[0-9a-f]+$/i),
});
```

## Rate Limiting

Schutz gegen Spam:

```typescript
const rateLimits = {
  'submit-drawing': { max: 5, window: 60000 },
  'cast-vote': { max: 100, window: 60000 },
  'join-room': { max: 10, window: 60000 },
};
```

## Nächste Schritte

- [Socket-Events](/docs/de/api/socket-events/) - Komplette Event-Referenz
- [Datenformate](/docs/de/api/data-formats/) - Pixel-Daten & Kompression
