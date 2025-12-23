---
title: Quick Start
description: Run SpriteBox locally in one command
---

## Development Mode

Start both frontend and backend with hot reload:

```bash
pnpm dev
```

Open **[http://localhost:5173](http://localhost:5173)** in your browser.

The development server provides:
- Hot module replacement (HMR) for instant updates
- Automatic TypeScript compilation
- Real-time Socket.io connection

## Production Build

Build for production deployment:

```bash
pnpm build
```

This creates optimized bundles in:
- `apps/web/build/` - Frontend static files
- `apps/server/dist/` - Backend compiled JavaScript

## Start Production Server

```bash
pnpm start
```

The server runs on **port 3000** and serves both the API and frontend.

## Available Commands

| Command | Description |
|---------|-------------|
| `pnpm install` | Install all dependencies |
| `pnpm dev` | Start dev servers (frontend + backend) |
| `pnpm build` | Production build |
| `pnpm start` | Start production server |
| `pnpm lint` | Run ESLint |
| `pnpm typecheck` | Run TypeScript checks |

## Testing Locally

1. Open `http://localhost:5173` in **5 different browser tabs**
2. Each tab is a different player (uses unique session ID)
3. When 5 players join, the game auto-starts
4. Draw, vote, and see results!

:::tip[Pro Tip]
Use incognito/private windows to simulate truly separate players with different sessions.
:::

## Environment Variables

**None required!** The server auto-detects:
- Available RAM for player limits
- Development vs production mode
- CORS settings

## Next Steps

- [Architecture Overview](/docs/en/architecture/overview/) - Understand the system design
- [Socket Events API](/docs/en/api/socket-events/) - Learn the real-time protocol
