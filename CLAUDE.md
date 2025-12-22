# CLAUDE.md

This file provides context for AI assistants working on this codebase.

## Project Overview

SpriteBox is a real-time multiplayer pixel art game. Players draw 8x8 pixel art based on prompts and vote on each other's creations using an Elo-based ranking system.

**Core Philosophy**: 100% open source, no external databases, no secrets, one command to start.

## Tech Stack

- **Frontend**: Svelte 5 + Vite + TypeScript
- **Backend**: Node.js + Express + Socket.io
- **State**: In-memory only (no database)
- **Package Manager**: pnpm (monorepo)
- **Validation**: Zod
- **Compression**: LZ-String (for large galleries)

## Project Structure

```
apps/
├── server/          # Node.js backend
│   └── src/
│       ├── index.ts      # Entry point
│       ├── socket.ts     # WebSocket handlers
│       ├── instance.ts   # Game instance logic
│       ├── voting.ts     # Elo algorithm
│       └── phases.ts     # Game phase management
└── web/             # Svelte frontend
    └── src/
        ├── lib/          # Shared utilities, stores, types
        ├── components/   # Svelte components
        └── routes/       # SvelteKit routes
```

## Key Commands

```bash
pnpm install      # Install all dependencies
pnpm dev          # Start dev servers (frontend + backend)
pnpm build        # Production build
pnpm start        # Start production server
pnpm lint         # Run ESLint
pnpm typecheck    # Run TypeScript checks
```

## Architecture Notes

### Game Flow
1. **Lobby** → Players join (min 5, max 100)
2. **Countdown** → 5s, prompt revealed
3. **Drawing** → 60s to draw on 8x8 grid
4. **Voting** → 2-7 Elo-based voting rounds (5s each)
5. **Finale** → Top 10% compete (15s)
6. **Results** → Winners shown, loop to lobby

### Server is Authoritative
All game logic runs on the server. Never trust client input. Validate everything with Zod schemas.

### Instance System
- **Public**: Auto-sharding, players assigned to open instances
- **Private**: 4-character room codes (e.g., "A7X2"), host controls

### Data Format
- Pixel art stored as 64-character hex strings (8x8 grid, 16 colors = 4 bits per pixel)
- Example: `"0000000000000000000F0F00000F0F0000FFFF00000000000000000000000000"`

## Important Patterns

### Socket Events
All real-time communication uses Socket.io. Events follow pattern: `noun-verb` (e.g., `lobby-timer-started`, `game-results`).

### State Management
- Server: JavaScript `Map` objects for instances, players, submissions
- Client: Svelte stores (`$state`, `$derived` in Svelte 5)

### Compression
LZ-String compression activates automatically when gallery has 50+ players. Individual images are never compressed (too small).

## Common Tasks

### Adding a new socket event
1. Define handler in `apps/server/src/socket.ts`
2. Add Zod validation schema
3. Add rate limit config if needed
4. Update client in `apps/web/src/lib/socket.ts`

### Adding a new game phase
1. Add phase type to `apps/server/src/phases.ts`
2. Implement phase logic with timer
3. Add corresponding UI state in frontend

### Modifying the prompt system
Edit `apps/server/data/prompts.json` - structure is `{ prefixes, subjects, suffixes }`.

## What NOT to Do

- Don't add external database dependencies
- Don't require API keys or secrets
- Don't break the "one command to run" experience
- Don't add heavy client-side processing (server is authoritative)
- Don't store persistent user data (intentionally ephemeral)

## Reference Files

- [SPEC.md](SPEC.md) - Full technical specification (detailed)
- [prompt.json](apps/server/data/prompts.json) - Prompt word lists
