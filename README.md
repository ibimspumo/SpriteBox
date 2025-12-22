<div align="center">

# SpriteBox

**A real-time multiplayer pixel art battle game**

Draw. Vote. Win.

[![MIT License](https://img.shields.io/badge/License-MIT-green.svg)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/Node.js-20+-339933?logo=node.js&logoColor=white)](https://nodejs.org)
[![Svelte](https://img.shields.io/badge/Svelte-5-FF3E00?logo=svelte&logoColor=white)](https://svelte.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![Socket.io](https://img.shields.io/badge/Socket.io-4-010101?logo=socket.io&logoColor=white)](https://socket.io)

[Features](#features) | [Quick Start](#quick-start) | [How It Works](#how-it-works) | [Tech Stack](#tech-stack) | [Contributing](#contributing)

</div>

---

## What is SpriteBox?

SpriteBox is a web-based multiplayer game where players compete to create the best 8x8 pixel art based on creative prompts. Think *Gartic Phone* meets *Pixel Art* with a competitive twist.

```
  "sleepy ghost eating cake"

  +-----------------+
  |     @@@@        |
  |   @@####@@      |  <- You have 60 seconds
  |   @@####@@      |     to draw this
  |     @@@@        |
  |                 |
  |  ##        ##   |
  |  ############   |
  +-----------------+
```

**100% Open Source** | **No Database Required** | **One Command to Run**

---

## Features

### Core Gameplay
- **8x8 Pixel Canvas** - Constrained creativity with a 16-color palette
- **Random Prompts** - Over 2.5 million unique combinations (*"angry robot underwater"*, *"tiny pizza on fire"*)
- **Elo-Based Voting** - Fair matchmaking ensures every artwork gets equal exposure
- **Real-time Multiplayer** - See other players join, vote, and compete live

### Game Modes
- **Public Games** - Auto-matchmaking with 5-100 players
- **Private Rooms** - Create a 4-character code and play with friends

### Technical Highlights
- **Zero Configuration** - Clone, install, run. No API keys, no database setup
- **Mobile First** - Touch-optimized UI that works great on phones
- **Dark/Light Mode** - Respects system preference with manual toggle
- **In-Memory State** - All game data lives in RAM (intentionally ephemeral)
- **LZ-String Compression** - Efficient data transfer for large lobbies

---

## Quick Start

### Prerequisites

- [Node.js](https://nodejs.org) 20+
- [pnpm](https://pnpm.io) 8+

### Installation

```bash
# Clone the repository
git clone https://github.com/YOUR_USERNAME/spritebox.git
cd spritebox

# Install dependencies
pnpm install

# Start development servers
pnpm dev
```

That's it. Open [http://localhost:5173](http://localhost:5173) and start playing.

### Production Build

```bash
# Build both frontend and backend
pnpm build

# Start production server
pnpm start
```

---

## How It Works

### Game Flow

```
+-------------------------------------------------------------+
|  1. LOBBY                                                   |
|     Players join. Timer starts at 5 players (45s countdown) |
|     or starts immediately when 100 players reached          |
+-------------------------------------------------------------+
                              |
                              v
+-------------------------------------------------------------+
|  2. COUNTDOWN (5s)                                          |
|     Prompt is revealed: "floating burger in space"          |
+-------------------------------------------------------------+
                              |
                              v
+-------------------------------------------------------------+
|  3. DRAWING (60s)                                           |
|     Draw your masterpiece on the 8x8 grid                   |
|     Minimum 5 pixels required to submit                     |
+-------------------------------------------------------------+
                              |
                              v
+-------------------------------------------------------------+
|  4. VOTING (2-7 rounds x 5s each)                           |
|     See two random artworks -> pick your favorite           |
|     Elo rating determines final rankings                    |
+-------------------------------------------------------------+
                              |
                              v
+-------------------------------------------------------------+
|  5. FINALE (15s)                                            |
|     Top 10% compete for the podium                          |
|     Everyone votes on finalists                             |
+-------------------------------------------------------------+
                              |
                              v
+-------------------------------------------------------------+
|  6. RESULTS                                                 |
|     Winners announced! Full gallery available               |
|     New round starts automatically                          |
+-------------------------------------------------------------+
```

### Elo Voting System

Instead of simple upvotes, SpriteBox uses an **Elo rating system** for fair ranking:

- Every artwork starts at 1000 Elo
- Each vote is a "match" between two artworks
- Winning against a higher-rated artwork gives more points
- This ensures every submission gets roughly equal exposure

---

## Tech Stack

| Layer | Technology | Why |
|-------|------------|-----|
| **Frontend** | Svelte 5 + Vite | Reactive, fast, tiny bundles |
| **Backend** | Node.js + Express | Simple, proven, efficient |
| **Real-time** | Socket.io | WebSocket with automatic fallbacks |
| **State** | In-Memory (Map) | No database = no complexity |
| **Validation** | Zod | Runtime type safety |
| **Compression** | LZ-String | Efficient gallery data transfer |
| **Package Manager** | pnpm | Fast, disk-efficient monorepo support |

---

## Project Structure

```
spritebox/
├── apps/
│   ├── server/                 # Backend
│   │   ├── src/
│   │   │   ├── index.ts        # Entry point
│   │   │   ├── socket.ts       # WebSocket handlers
│   │   │   ├── instance.ts     # Game instance logic
│   │   │   ├── voting.ts       # Elo algorithm
│   │   │   └── phases.ts       # Game phase management
│   │   └── data/
│   │       └── prompts.json    # Prompt database
│   │
│   └── web/                    # Frontend
│       ├── src/
│       │   ├── lib/
│       │   │   ├── socket.ts   # Socket.io client
│       │   │   ├── stores.ts   # Svelte stores
│       │   │   └── types.ts    # Shared types
│       │   ├── components/
│   │   │   ├── PixelCanvas.svelte
│   │   │   ├── ColorPalette.svelte
│   │   │   ├── Lobby.svelte
│   │   │   ├── Voting.svelte
│   │   │   └── Results.svelte
│       │   └── routes/
│       │       └── +page.svelte
│       └── vite.config.ts
│
├── package.json                # Workspace root
├── pnpm-workspace.yaml
├── CLAUDE.md                   # AI assistant context
├── CONTRIBUTING.md
├── CODE_OF_CONDUCT.md
└── LICENSE                     # MIT
```

---

## Configuration

SpriteBox is designed to work out of the box, but you can tune these values:

| Setting | Default | Description |
|---------|---------|-------------|
| `MAX_PLAYERS` | 100 | Maximum players per instance |
| `MIN_PLAYERS` | 5 | Minimum to start a game |
| `LOBBY_TIMEOUT` | 45s | Wait time before auto-start |
| `DRAWING_TIME` | 60s | Time to draw |
| `VOTING_TIME` | 5s | Time per voting round |
| `RECONNECT_GRACE` | 15s | Time to reconnect if disconnected |

---

## Deployment

### Render (Recommended)

1. Connect your GitHub repository at [render.com](https://render.com)
2. Create a new **Web Service**
3. Select **Frankfurt (EU)** region for lowest latency
4. Set build command: `pnpm install && pnpm build`
5. Set start command: `pnpm start`
6. Deploy

No environment variables needed. No secrets. No database.

### Self-Hosting

```bash
# On any Linux server
git clone https://github.com/YOUR_USERNAME/spritebox.git
cd spritebox
pnpm install
pnpm build
pnpm start
```

### Resource Requirements

| Players | RAM | Notes |
|---------|-----|-------|
| 1,000 | ~100 MB | Comfortable |
| 5,000 | ~250 MB | No issues |
| 10,000 | ~500 MB | Single server limit |

---

## API Endpoints

### Health Check

```
GET /health
```

Returns server status, memory usage, and player counts. Useful for load balancers.

```json
{
  "status": "healthy",
  "memory": {
    "heapUsedMB": 45,
    "heapTotalMB": 120
  },
  "players": {
    "current": 847,
    "max": 10000,
    "queued": 0
  },
  "instances": {
    "active": 12,
    "public": 9,
    "private": 3
  }
}
```

---

## Contributing

We welcome contributions! See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

### Development Workflow

```bash
# Install dependencies
pnpm install

# Start dev servers (hot reload)
pnpm dev

# Run linter
pnpm lint

# Run type checker
pnpm typecheck

# Build for production
pnpm build
```

### Areas We Need Help

- UI/UX improvements
- Accessibility (a11y)
- Translations (i18n)
- Performance optimization
- Mobile touch gestures
- Sound effects

---

## Roadmap

- [ ] Sound effects and music
- [ ] Achievement system
- [ ] Custom color palettes
- [ ] Replay/timelapse of drawings
- [ ] Tournament mode
- [ ] PWA support (offline play)
- [ ] Docker support

---

## Security

SpriteBox follows security best practices:

- **Server-Authoritative** - All game logic runs on the server
- **Input Validation** - Zod schemas validate all client inputs
- **Rate Limiting** - Protection against spam and DoS
- **XSS Prevention** - DOMPurify sanitizes all user content
- **No Secrets** - Nothing to leak (no API keys, no database credentials)

See [SECURITY.md](SECURITY.md) for vulnerability reporting.

---

## License

MIT License - do whatever you want with it.

See [LICENSE](LICENSE) for details.

---

## Acknowledgments

- Inspired by [Gartic Phone](https://garticphone.com), [Skribbl.io](https://skribbl.io), and classic pixel art tools
- Built with [Svelte](https://svelte.dev), [Socket.io](https://socket.io), and [Vite](https://vite.dev)
- Prompt system inspired by [Drawful](https://www.jackboxgames.com/drawful-2)

---

<div align="center">

**[Play Now](https://spritebox.example.com)** | **[Report Bug](https://github.com/YOUR_USERNAME/spritebox/issues)** | **[Request Feature](https://github.com/YOUR_USERNAME/spritebox/issues)**

Made with pixels and love

</div>
