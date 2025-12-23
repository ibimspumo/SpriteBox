<div align="center">

<img src="https://raw.githubusercontent.com/ibimspumo/SpriteBox/main/apps/web/static/logo.png" alt="SpriteBox Logo" width="420" />

# SpriteBox

### The Multiplayer Pixel Art Arena

**Draw. Vote. Win.**

[![Play Now](https://img.shields.io/badge/Play_Now-spritebox.de-22c55e?style=for-the-badge&logo=gamepad&logoColor=white)](https://spritebox.de)
[![Documentation](https://img.shields.io/badge/Docs-spritebox.de%2Fdocs-4ecdc4?style=for-the-badge&logo=gitbook&logoColor=white)](https://spritebox.de/docs)

<br />

[![MIT License](https://img.shields.io/badge/License-MIT-green.svg?style=flat-square)](LICENSE)
[![Node.js 20+](https://img.shields.io/badge/Node.js-20+-339933?style=flat-square&logo=node.js&logoColor=white)](https://nodejs.org)
[![Svelte 5](https://img.shields.io/badge/Svelte-5-FF3E00?style=flat-square&logo=svelte&logoColor=white)](https://svelte.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![Socket.io](https://img.shields.io/badge/Socket.io-4-010101?style=flat-square&logo=socket.io&logoColor=white)](https://socket.io)
[![pnpm](https://img.shields.io/badge/pnpm-monorepo-F69220?style=flat-square&logo=pnpm&logoColor=white)](https://pnpm.io)

<br />

<img src="https://raw.githubusercontent.com/ibimspumo/SpriteBox/main/apps/web/static/og-image.png" alt="SpriteBox Preview" width="600" />

<br />

**100% Free & Open Source** · **No Account Required** · **One Command to Host**

---

[**Play**](#-play-now) · [**Game Modes**](#-game-modes) · [**Features**](#-features) · [**Quick Start**](#-quick-start) · [**For Developers**](#-for-developers) · [**Contributing**](#-contributing)

</div>

---

## What is SpriteBox?

SpriteBox is a **browser-based multiplayer pixel art game** where creativity meets competition. Draw 8×8 pixel masterpieces, vote on others' creations, and climb the ranks with our chess-inspired Elo rating system.

Think **Gartic Phone** meets **Pixel Art** with a competitive twist.

```
    ╔═══════════════════════════════════════════════════════════════╗
    ║                                                               ║
    ║     Prompt: "sleepy robot eating pizza"                       ║
    ║                                                               ║
    ║         ┌────────────────┐                                    ║
    ║         │  ▓▓▓▓▓▓▓▓▓▓▓▓  │     You have 30 seconds           ║
    ║         │  ▓░░░░░░░░░░▓  │     to draw this!                  ║
    ║         │  ▓░██░░░░██░▓  │                                    ║
    ║         │  ▓░░░░░░░░░░▓  │     8×8 pixels                     ║
    ║         │  ▓░░░████░░░▓  │     16 colors                      ║
    ║         │  ▓░░░░░░░░░░▓  │     Unlimited creativity           ║
    ║         │  ▓▓▓▓▓▓▓▓▓▓▓▓  │                                    ║
    ║         └────────────────┘                                    ║
    ║                                                               ║
    ╚═══════════════════════════════════════════════════════════════╝
```

### Why SpriteBox?

| | |
|---|---|
| **100% Free & Open Source** | No ads, no paywalls, no tracking, MIT licensed |
| **No Account Required** | Just open the link and play instantly |
| **Works Everywhere** | Desktop, mobile, tablet — any modern browser |
| **Multilingual** | Full English and German support |
| **Self-Hostable** | One command to run your own server |
| **Privacy First** | No persistent user data stored |

---

## 🎮 Play Now

### For Everyone (No Technical Knowledge Needed)

1. **Go to [spritebox.de](https://spritebox.de)**
2. **Choose a game mode** (see below)
3. **Draw** when prompted — you have 30 seconds!
4. **Vote** on other players' creations
5. **Win** and show off your pixel art skills

---

## 🕹️ Game Modes

SpriteBox offers **4 unique game modes** for every type of player:

<table>
<tr>
<td width="50%" valign="top">

### ⚔️ Pixel Battle
**The Classic Experience**

- 5–100 players
- Draw based on creative prompts
- Elo-based voting system
- Top 10% compete in finale
- Public matchmaking or private rooms

**Perfect for:** Party games, streams, large groups

</td>
<td width="50%" valign="top">

### 🎯 CopyCat
**1v1 Memory Duel**

- Exactly 2 players
- Memorize a reference image (5 sec)
- Recreate it from memory
- Accuracy determines winner
- Speed is the tiebreaker

**Perfect for:** Quick duels, testing your memory

</td>
</tr>
<tr>
<td width="50%" valign="top">

### 🖼️ Pixel Guesser
**Pictionary-Style Fun**

- 2–20 players
- One artist draws, others guess
- Guess faster = more points
- Everyone takes turns drawing
- Real-time pixel-by-pixel reveal

**Perfect for:** Friends, family game nights

</td>
<td width="50%" valign="top">

### 🗡️ Pixel Survivor
**Single-Player Roguelike**

- Solo adventure
- Create your character via pixel art
- Stats derived from your artwork
- Survive 30 days of challenges
- Boss battle finale

**Perfect for:** Solo practice, roguelike fans

</td>
</tr>
</table>

---

## ✨ Features

### Core Gameplay

- **8×8 Pixel Canvas** — Simple constraints spark maximum creativity
- **16-Color Palette** — Classic pixel art aesthetic
- **2.5M+ Unique Prompts** — *"angry robot underwater"*, *"tiny pizza on fire"*
- **Elo Rating System** — Fair, chess-inspired ranking for every artwork
- **Real-time Multiplayer** — See players join, draw, and vote live

### Player Experience

- **No Registration** — Jump in instantly
- **Mobile-Optimized** — Touch-friendly drawing on any device
- **Dark Theme** — Easy on the eyes, pixel-perfect aesthetics
- **Sound Effects** — Satisfying audio feedback
- **Idle Detection** — Warnings before disconnect
- **Reconnection Support** — 15-second grace period if disconnected
- **Spectator Mode** — Watch full games without participating

### Technical Philosophy

```
┌─────────────────────────────────────────────────────────────────┐
│  🔒 Zero Configuration     No database, no API keys, no secrets │
│  🛡️ Server-Authoritative   All game logic runs on the server    │
│  🔐 Privacy First          No persistent user data stored       │
│  📦 Fully Open Source      Inspect, modify, self-host freely    │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🎲 How It Works

### Game Flow (Pixel Battle)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                                                                             │
│    LOBBY          COUNTDOWN         DRAWING          VOTING                 │
│   ┌─────┐         ┌─────┐          ┌─────┐         ┌─────┐                 │
│   │     │  5 sec  │     │  30 sec  │     │  5s×N   │     │                 │
│   │ 5+  │ ──────► │ GET │ ───────► │DRAW!│ ──────► │A vs │                 │
│   │     │         │READY│          │     │         │  B  │                 │
│   └─────┘         └─────┘          └─────┘         └─────┘                 │
│      │                                                │                     │
│      │            ┌─────────────────────────────────┐ │                     │
│      │            │                                 │ │                     │
│      │            ▼                                 │ ▼                     │
│      │         RESULTS          FINALE         ◄───┘                       │
│      │         ┌─────┐         ┌─────┐                                     │
│      │  15 sec │     │  15 sec │TOP  │                                     │
│      └──────── │ 🏆  │ ◄────── │10%  │                                     │
│                │     │         │     │                                     │
│                └─────┘         └─────┘                                     │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### The Elo Voting System

Instead of simple upvotes, SpriteBox uses **chess-style Elo ratings**:

| Concept | How It Works |
|---------|--------------|
| **Starting Rating** | Every artwork begins at 1000 Elo |
| **1v1 Matchups** | Each vote is a head-to-head comparison |
| **Dynamic Gains** | Beating a higher-rated artwork = more points |
| **Fair Exposure** | Algorithm ensures every submission is seen equally |
| **Adaptive Rounds** | More players = more voting rounds (2–7) |

### Phase Timing

| Phase | Duration | Description |
|-------|----------|-------------|
| **Lobby** | Until 5+ players | Waiting room |
| **Countdown** | 5 seconds | Prompt revealed |
| **Drawing** | 30 seconds | Create your masterpiece |
| **Voting** | 5s × 2–7 rounds | Pick your favorites |
| **Finale** | 15 seconds | Top 10% face off |
| **Results** | 15 seconds | Winners announced |

---

## 🚀 Quick Start

### For Players

Just visit **[spritebox.de](https://spritebox.de)** — no installation needed!

### For Self-Hosting

Want to run your own SpriteBox server? It's simple:

#### Prerequisites

- [Node.js](https://nodejs.org) 20 or newer
- [pnpm](https://pnpm.io) (`npm install -g pnpm`)

#### One-Command Setup

```bash
git clone https://github.com/ibimspumo/SpriteBox.git
cd SpriteBox
pnpm install
pnpm dev
```

Open **[http://localhost:5173](http://localhost:5173)** — done!

#### Production Deployment

```bash
pnpm build
pnpm start
```

Server runs on port 3000, serving both API and frontend.

> **No environment variables. No secrets. No database.**

---

## 👨‍💻 For Developers

### Tech Stack

| Layer | Technology | Purpose |
|-------|------------|---------|
| **Frontend** | Svelte 5 + Vite | Reactive UI with runes (`$state`, `$derived`) |
| **Backend** | Node.js + Express | HTTP server + static file serving |
| **Real-time** | Socket.io | WebSocket communication |
| **Validation** | Zod | Runtime type safety |
| **Compression** | LZ-String | Efficient large gallery transfer |
| **Package Manager** | pnpm | Fast monorepo management |
| **i18n** | Custom stores | English & German support |

### Architecture Overview

```
SpriteBox/
├── apps/
│   ├── server/                    # Node.js Backend
│   │   ├── src/
│   │   │   ├── index.ts           # Entry + Express setup
│   │   │   ├── socket.ts          # WebSocket handlers
│   │   │   ├── gameModes/         # Mode-specific logic
│   │   │   │   ├── modes/
│   │   │   │   │   ├── pixelBattle.ts
│   │   │   │   │   ├── copyCat.ts
│   │   │   │   │   ├── pixelGuesser.ts
│   │   │   │   │   └── pixelSurvivor.ts
│   │   │   │   └── registry.ts    # Mode registration
│   │   │   ├── voting/            # Elo algorithm
│   │   │   ├── validation.ts      # Zod schemas
│   │   │   └── rateLimit.ts       # DoS protection
│   │   └── data/
│   │       ├── prompts.json       # English prompts
│   │       └── prompts_de.json    # German prompts
│   │
│   ├── web/                       # Svelte 5 Frontend
│   │   ├── src/
│   │   │   ├── lib/
│   │   │   │   ├── components/    # Atomic Design (50 components)
│   │   │   │   │   ├── atoms/     # Button, Input, Badge
│   │   │   │   │   ├── molecules/ # PromptDisplay, ModeCard
│   │   │   │   │   ├── organisms/ # Modal, Card, GalleryGrid
│   │   │   │   │   ├── features/  # Lobby, Drawing, Voting, Results
│   │   │   │   │   │   ├── CopyCat/
│   │   │   │   │   │   ├── PixelGuesser/
│   │   │   │   │   │   └── PixelSurvivor/
│   │   │   │   │   └── utility/   # PixelCanvas, Timer
│   │   │   │   ├── i18n/          # Translation system
│   │   │   │   ├── stores.ts      # Svelte stores
│   │   │   │   └── styles/
│   │   │   │       └── tokens.css # Design system
│   │   │   └── routes/
│   │   │       └── play/[mode]/   # Dynamic game routes
│   │   └── static/
│   │       ├── fonts/             # Pixelify Sans
│   │       └── audio/             # Sound effects
│   │
│   └── docs/                      # Astro/Starlight documentation
│
├── package.json                   # Workspace scripts
├── pnpm-workspace.yaml            # Monorepo config
└── CLAUDE.md                      # AI assistant context
```

### Key Design Decisions

<details>
<summary><strong>Server-Authoritative</strong></summary>

All game logic runs on the server. Clients send inputs, receive state updates. This prevents cheating and ensures consistent gameplay.
</details>

<details>
<summary><strong>In-Memory State</strong></summary>

No database. All game data lives in JavaScript `Map` objects. Games are intentionally ephemeral — when the server restarts, everything resets. This means:
- Zero configuration
- No data breaches possible
- Lightning-fast operations
</details>

<details>
<summary><strong>Atomic Design</strong></summary>

Frontend follows strict component hierarchy:
- **Atoms**: Basic UI elements (Button, Input, Badge)
- **Molecules**: Combinations of atoms (PasswordInput, ModeCard)
- **Organisms**: Complex sections (Modal, GalleryGrid)
- **Features**: Game phases (Lobby, Drawing, Voting)
</details>

<details>
<summary><strong>Type Safety</strong></summary>

- TypeScript everywhere
- Zod schemas validate all client inputs
- Socket.io events are fully typed
- Shared types between client and server
</details>

### Development Commands

```bash
pnpm install      # Install all dependencies
pnpm dev          # Start both servers with hot reload
pnpm build        # Production build
pnpm start        # Start production server
pnpm lint         # Run ESLint
pnpm typecheck    # Run TypeScript checks
```

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

## 🌐 Deployment

### Render.com (Recommended)

1. Connect your GitHub repository
2. Create new **Web Service**
3. Set build command: `pnpm install && pnpm build`
4. Set start command: `pnpm start`
5. Deploy

**No environment variables. No secrets. No database.**

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

```json
{
  "status": "ok",
  "memory": { "heapUsedMB": 45, "status": "ok" },
  "players": { "current": 847, "max": 10000 },
  "instances": { "active": 12, "public": 9, "private": 3 }
}
```

---

## 🤝 Contributing

We welcome contributions! See [CONTRIBUTING.md](CONTRIBUTING.md) for detailed guidelines.

### Quick Setup

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
- **New game modes**
- **Bug fixes**
- **Translations**

### Guidelines

- Follow existing code style (ESLint + TypeScript strict)
- Write descriptive commit messages
- Test locally before submitting
- Keep PRs focused on a single feature/fix

---

## 📖 Documentation

Full documentation available at **[spritebox.de/docs](https://spritebox.de/docs)**

- Getting Started
- Architecture Deep-Dive
- Socket.io Event Reference
- Data Formats & Validation
- Contributing Guide

---

## 🗺️ Roadmap

- [ ] Achievement system
- [ ] Custom color palettes
- [ ] Drawing replay/timelapse
- [ ] Tournament mode
- [ ] PWA offline support
- [ ] Docker container
- [ ] More languages

---

## ❓ FAQ

<details>
<summary><strong>Do I need to create an account?</strong></summary>

No! Just open the website and play. Your session is temporary and private.
</details>

<details>
<summary><strong>Can I play on mobile?</strong></summary>

Yes! The game is fully optimized for touch devices.
</details>

<details>
<summary><strong>How many players can play together?</strong></summary>

5 to 100 players per game (depending on mode).
</details>

<details>
<summary><strong>What happens if I disconnect?</strong></summary>

You have 15 seconds to rejoin and keep your progress.
</details>

<details>
<summary><strong>Why no database?</strong></summary>

Simplicity. No setup, no maintenance, no data breaches. Games are ephemeral by design.
</details>

<details>
<summary><strong>Can I self-host this?</strong></summary>

Yes! Clone the repo and run `pnpm install && pnpm build && pnpm start`.
</details>

<details>
<summary><strong>Is this production-ready?</strong></summary>

Yes! It's designed with rate limiting, input validation, and DoS protection.
</details>

---

## 🔒 Security

SpriteBox follows security best practices:

- **Server-Authoritative** — All game logic on server
- **Input Validation** — Zod schemas validate everything
- **Rate Limiting** — Protection against spam and DoS
- **XSS Prevention** — All user input is sanitized
- **Timing-Safe Auth** — Password verification is timing-safe
- **No Secrets** — Nothing to leak

Report vulnerabilities to: **security@spritebox.de**

---

## 📄 License

**MIT License** — Do whatever you want with it.

See [LICENSE](LICENSE) for details.

---

## 🙏 Acknowledgments

- Inspired by [Gartic Phone](https://garticphone.com), [Skribbl.io](https://skribbl.io), and classic pixel art tools
- Built with [Svelte](https://svelte.dev), [Socket.io](https://socket.io), and [Vite](https://vite.dev)
- Uses [Pixelify Sans](https://fonts.google.com/specimen/Pixelify+Sans) font

---

<div align="center">

**[Play Now](https://spritebox.de)** · **[Documentation](https://spritebox.de/docs)** · **[Report Bug](https://github.com/ibimspumo/SpriteBox/issues)** · **[Request Feature](https://github.com/ibimspumo/SpriteBox/issues)**

---

<sub>Made with pixels and ❤️</sub>

<sub>⭐ Star this repo if you like SpriteBox!</sub>

</div>
