<div align="center">

<img src="https://raw.githubusercontent.com/ibimspumo/SpriteBox/main/apps/web/static/logo.png" alt="SpriteBox Logo" width="400" />

# SpriteBox

### Real-time Multiplayer Pixel Art Battle Game

**Draw. Vote. Win.**

[![Play Now](https://img.shields.io/badge/Play%20Now-spritebox.de-4ecdc4?style=for-the-badge&logo=gamepad&logoColor=white)](https://spritebox.de)

[![MIT License](https://img.shields.io/badge/License-MIT-green.svg?style=flat-square)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/Node.js-20+-339933?style=flat-square&logo=node.js&logoColor=white)](https://nodejs.org)
[![Svelte](https://img.shields.io/badge/Svelte-5-FF3E00?style=flat-square&logo=svelte&logoColor=white)](https://svelte.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![Socket.io](https://img.shields.io/badge/Socket.io-4-010101?style=flat-square&logo=socket.io&logoColor=white)](https://socket.io)

---

[Play](#-play-now) | [Features](#-features) | [Quick Start](#-quick-start) | [How It Works](#-how-it-works) | [For Developers](#-for-developers) | [Contributing](#-contributing)

</div>

---

## What is SpriteBox?

SpriteBox is a **free, browser-based multiplayer game** where you compete to create the best 8x8 pixel art based on creative prompts. Think *Gartic Phone* meets *Pixel Art* with a competitive Elo-based ranking twist.

```
       Prompt: "sleepy ghost eating cake"

       +-----------------+
       |     @@@@        |
       |   @@    @@      |     You have 30 seconds
       |   @@    @@      |     to draw this!
       |     @@@@        |
       |                 |
       |  ##        ##   |
       |  ############   |
       +-----------------+
```

### Why SpriteBox?

- **100% Free & Open Source** - No ads, no paywalls, no tracking
- **No Account Required** - Just open the link and play
- **Works Everywhere** - Desktop, mobile, tablet - any modern browser
- **One Command to Host** - Self-host your own server in seconds

---

## How to Play

### For Everyone (No Technical Knowledge Needed)

1. **Go to [spritebox.de](https://spritebox.de)**
2. **Click "Join Public Game"** or create a private room with friends
3. **Wait for players** (minimum 5 to start)
4. **Draw!** When the prompt appears, you have 30 seconds to create pixel art
5. **Vote!** Pick your favorite between two artworks each round
6. **Win!** See who created the best pixel art

### Game Modes

| Mode | Players | Description |
|------|---------|-------------|
| **Public** | 5-100 | Auto-matchmaking with strangers |
| **Private** | 5-100 | Create a 4-letter room code and share with friends |

---

## Features

### Core Gameplay
- **8x8 Pixel Canvas** - Simple constraints spark creativity
- **16-Color Palette** - Classic pixel art colors
- **2.5M+ Unique Prompts** - *"angry robot underwater"*, *"tiny pizza on fire"*
- **Elo-Based Ranking** - Fair voting ensures equal artwork exposure
- **Real-time Multiplayer** - See players join, vote, and compete live

### Player Experience
- **No Registration** - Jump in instantly
- **Mobile-Optimized** - Touch-friendly drawing on phones
- **Dark Theme** - Easy on the eyes
- **Reconnection Support** - Rejoin within 15 seconds if disconnected

### Technical Philosophy
- **Zero Configuration** - No database, no API keys, no secrets
- **Privacy First** - No persistent user data stored
- **Fully Open Source** - Inspect, modify, self-host

---

## How It Works

### Game Flow

```
  LOBBY                    COUNTDOWN                  DRAWING
  +---------+              +---------+               +---------+
  | Players |    5 sec     | Prompt  |    30 sec    |  Draw!  |
  |  Join   | -----------> |Revealed | -----------> |         |
  | (5-100) |              |         |              |  8x8    |
  +---------+              +---------+               +---------+
                                                          |
       +--------------------------------------------------+
       |
       v
  VOTING                   FINALE                    RESULTS
  +---------+              +---------+               +---------+
  | Pick    |    15 sec    | Top 10% |    15 sec    | Winners |
  | A or B  | -----------> | Compete | -----------> |  Shown  |
  | x2-7    |              |         |              |         |
  +---------+              +---------+               +---------+
                                                          |
       +--------------------------------------------------+
       |
       v
   (Back to Lobby)
```

### The Elo Voting System

Instead of simple upvotes, SpriteBox uses **chess-style Elo ratings** for fair ranking:

- Every artwork starts at **1000 Elo**
- Each vote is a **1v1 match** between two artworks
- **Beating a higher-rated artwork** gives more points
- This ensures **every submission gets equal exposure**

### Timing

| Phase | Duration |
|-------|----------|
| Lobby | Until 5+ players (or instantly at 100) |
| Countdown | 5 seconds |
| Drawing | 30 seconds |
| Voting | 5 seconds per round (2-7 rounds) |
| Finale | 15 seconds |
| Results | 15 seconds |

---

## Quick Start

### For Players

Just visit **[spritebox.de](https://spritebox.de)** - no installation needed!

### For Hosts (Self-Hosting)

Want to run your own SpriteBox server? It's easy:

#### Prerequisites
- [Node.js](https://nodejs.org) 20 or newer
- [pnpm](https://pnpm.io) (install with `npm install -g pnpm`)

#### Installation

```bash
# Clone the repository
git clone https://github.com/ibimspumo/SpriteBox.git
cd SpriteBox

# Install dependencies
pnpm install

# Start development servers
pnpm dev
```

Open **[http://localhost:5173](http://localhost:5173)** - that's it!

#### Production Deployment

```bash
# Build for production
pnpm build

# Start server
pnpm start
```

The server runs on port 3000 and serves both the API and the frontend.

---

## For Developers

### Tech Stack

| Layer | Technology | Purpose |
|-------|------------|---------|
| **Frontend** | Svelte 5 + Vite | Reactive UI with tiny bundles |
| **Backend** | Node.js + Express | HTTP server + static files |
| **Real-time** | Socket.io | WebSocket communication |
| **Validation** | Zod | Runtime type safety |
| **Compression** | LZ-String | Efficient large gallery transfer |
| **Package Manager** | pnpm | Fast monorepo management |

### Architecture

```
SpriteBox/
├── apps/
│   ├── server/                    # Node.js Backend
│   │   ├── src/
│   │   │   ├── index.ts           # Entry point + Express setup
│   │   │   ├── socket.ts          # WebSocket event handlers
│   │   │   ├── instance.ts        # Game instance management
│   │   │   ├── phases.ts          # Game phase state machine
│   │   │   ├── voting.ts          # Elo algorithm implementation
│   │   │   ├── validation.ts      # Zod schemas for input validation
│   │   │   └── rateLimit.ts       # DoS protection
│   │   └── data/
│   │       └── prompts.json       # 2.5M+ prompt combinations
│   │
│   └── web/                       # Svelte 5 Frontend
│       ├── src/
│       │   ├── lib/
│       │   │   ├── components/    # Atomic Design structure
│       │   │   │   ├── atoms/     # Button, Input, Badge, etc.
│       │   │   │   ├── molecules/ # PromptDisplay, PasswordInput
│       │   │   │   ├── organisms/ # Modal, Card, GalleryGrid
│       │   │   │   ├── features/  # Lobby, Drawing, Voting, Results
│       │   │   │   └── utility/   # PixelCanvas, ColorPalette, Timer
│       │   │   ├── stores.ts      # Svelte stores (state management)
│       │   │   ├── socket.ts      # Socket.io client types
│       │   │   ├── socketBridge.ts # Event handlers + store updates
│       │   │   └── styles/
│       │   │       └── tokens.css # Design system variables
│       │   └── routes/
│       │       └── +page.svelte   # Main game component
│       └── static/
│           └── fonts/             # Pixelify Sans (pixel font)
│
├── package.json                   # Workspace scripts
├── pnpm-workspace.yaml            # Monorepo configuration
└── CLAUDE.md                      # AI assistant context
```

### Key Design Decisions

#### Server-Authoritative
All game logic runs on the server. Clients only send inputs and receive state updates. This prevents cheating.

#### In-Memory State
No database. All game data lives in JavaScript `Map` objects. Games are intentionally ephemeral - when the server restarts, everything resets.

#### Atomic Design (Frontend)
Components follow strict hierarchy:
- **Atoms**: Basic UI elements (Button, Input)
- **Molecules**: Combinations of atoms (PasswordInput)
- **Organisms**: Complex sections (Modal, PlayerList)
- **Features**: Game phases (Lobby, Drawing, Voting)

#### Type Safety
- TypeScript everywhere
- Zod schemas validate all client inputs
- Socket.io events are fully typed

### Development Commands

```bash
pnpm install      # Install all dependencies
pnpm dev          # Start both servers with hot reload
pnpm build        # Production build
pnpm start        # Start production server
pnpm lint         # Run ESLint
pnpm typecheck    # Run TypeScript checks
```

### Environment

No environment variables needed! The server auto-detects:
- Available RAM for player limits
- Development vs production mode
- CORS settings

### Rate Limiting & Security

| Protection | Limit |
|------------|-------|
| Global requests | 50/second |
| Drawing submissions | 5/minute |
| Votes | 3/second |
| Room creation | 3/minute |
| Connections per IP | 5 simultaneous |
| Max payload size | 1KB |

---

## Deployment

### Render.com (Recommended)

1. Connect GitHub repository at [render.com](https://render.com)
2. Create new **Web Service**
3. Set build command: `pnpm install && pnpm build`
4. Set start command: `pnpm start`
5. Deploy

No environment variables. No secrets. No database.

### Resource Requirements

| Players | RAM |
|---------|-----|
| 1,000 | ~100 MB |
| 5,000 | ~250 MB |
| 10,000 | ~500 MB |

### Health Check

```
GET /health
```

Returns server status for load balancers:

```json
{
  "status": "ok",
  "memory": { "heapUsedMB": 45, "heapTotalMB": 120, "status": "ok" },
  "players": { "current": 847, "max": 10000, "queued": 0 },
  "instances": { "active": 12, "public": 9, "private": 3 }
}
```

---

## Contributing

We welcome contributions! Here's how to get started:

### Setup

```bash
git clone https://github.com/ibimspumo/SpriteBox.git
cd SpriteBox
pnpm install
pnpm dev
```

### What We Need Help With

- **UI/UX improvements**
- **Accessibility (a11y)**
- **Performance optimization**
- **Mobile touch gestures**
- **Sound effects**
- **Bug fixes**

### Guidelines

- Follow the existing code style (ESLint + TypeScript strict mode)
- Write descriptive commit messages
- Test your changes locally before submitting
- Keep PRs focused on a single feature/fix

See [CONTRIBUTING.md](CONTRIBUTING.md) for detailed guidelines.

---

## Roadmap

- [ ] Sound effects and music
- [ ] Achievement system
- [ ] Custom color palettes
- [ ] Drawing replay/timelapse
- [ ] Tournament mode
- [ ] PWA offline support
- [ ] Docker container

---

## FAQ

### For Players

**Q: Do I need to create an account?**
A: No! Just open the website and play.

**Q: Can I play on mobile?**
A: Yes! The game is fully mobile-optimized.

**Q: How many players can play together?**
A: 5 to 100 players per game.

**Q: What happens if I disconnect?**
A: You have 15 seconds to rejoin and keep your progress.

### For Developers

**Q: Why no database?**
A: Simplicity. No setup, no maintenance, no data breaches. Games are ephemeral by design.

**Q: Can I self-host this?**
A: Yes! Clone the repo and run `pnpm install && pnpm build && pnpm start`.

**Q: Is this production-ready?**
A: Yes! It's been designed with rate limiting, input validation, and DoS protection.

---

## Security

SpriteBox follows security best practices:

- **Server-Authoritative** - All game logic on server
- **Input Validation** - Zod schemas validate everything
- **Rate Limiting** - Protection against spam and DoS
- **XSS Prevention** - All user input is sanitized
- **No Secrets** - Nothing to leak

Report vulnerabilities to: **security@spritebox.de**

---

## License

**MIT License** - Do whatever you want with it.

See [LICENSE](LICENSE) for details.

---

## Acknowledgments

- Inspired by [Gartic Phone](https://garticphone.com), [Skribbl.io](https://skribbl.io), and classic pixel art tools
- Built with [Svelte](https://svelte.dev), [Socket.io](https://socket.io), and [Vite](https://vite.dev)
- Uses [Pixelify Sans](https://fonts.google.com/specimen/Pixelify+Sans) font

---

<div align="center">

**[Play Now](https://spritebox.de)** | **[Report Bug](https://github.com/ibimspumo/SpriteBox/issues)** | **[Request Feature](https://github.com/ibimspumo/SpriteBox/issues)**

---

Made with pixels and love

*Star this repo if you like SpriteBox!*

</div>
