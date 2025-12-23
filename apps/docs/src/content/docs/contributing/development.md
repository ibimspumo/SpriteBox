---
title: Development Setup
description: Detailed development environment setup
---

## Prerequisites

| Tool | Version | Install |
|------|---------|---------|
| Node.js | 20+ | [nodejs.org](https://nodejs.org) |
| pnpm | 8+ | `npm install -g pnpm` |
| Git | Any | [git-scm.com](https://git-scm.com) |

## IDE Setup

### VS Code (Recommended)

Install these extensions:

- **Svelte for VS Code** - Svelte language support
- **ESLint** - Linting
- **Prettier** - Formatting
- **TypeScript Vue Plugin** - Vue/Svelte TypeScript

### Settings

```json
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "typescript.preferences.importModuleSpecifier": "relative"
}
```

## Project Scripts

### Root Level

| Script | Description |
|--------|-------------|
| `pnpm dev` | Start all dev servers |
| `pnpm build` | Production build |
| `pnpm start` | Start production server |
| `pnpm lint` | Run ESLint everywhere |
| `pnpm typecheck` | TypeScript checks |

### Frontend (`apps/web`)

| Script | Description |
|--------|-------------|
| `pnpm dev` | Vite dev server (port 5173) |
| `pnpm build` | Build static files |
| `pnpm preview` | Preview production build |

### Backend (`apps/server`)

| Script | Description |
|--------|-------------|
| `pnpm dev` | ts-node-dev with hot reload |
| `pnpm build` | Compile TypeScript |
| `pnpm start` | Run compiled JS |

## Debugging

### Frontend (Browser DevTools)

1. Open Chrome DevTools (F12)
2. Go to Sources → Filesystem
3. Add `apps/web/src` folder
4. Set breakpoints in `.svelte` files

### Backend (VS Code)

Create `.vscode/launch.json`:

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "node",
      "request": "attach",
      "name": "Attach to Server",
      "port": 9229,
      "restart": true
    }
  ]
}
```

Start server with inspect:

```bash
cd apps/server
pnpm dev --inspect
```

### Socket.io Debugging

Enable debug logs:

```bash
DEBUG=socket.io* pnpm dev
```

Or in browser console:

```javascript
localStorage.debug = 'socket.io-client:*';
```

## Testing Locally

### Multi-Player Testing

1. Open 5+ browser tabs at `http://localhost:5173`
2. Each tab is a separate player
3. Game auto-starts at 5 players

:::tip
Use incognito windows for truly separate sessions.
:::

### Private Room Testing

1. Tab 1: Create private room → get code
2. Tab 2-5: Join with room code
3. Tab 1 (host): Start game manually

### Mobile Testing

```bash
# Find your local IP
ifconfig | grep "inet "
# → 192.168.1.x

# Access from phone
http://192.168.1.x:5173
```

## Common Issues

### "Port 3000 already in use"

```bash
# Find process
lsof -i :3000
# Kill it
kill -9 <PID>
```

### "Cannot find module"

```bash
# Clear node_modules and reinstall
rm -rf node_modules apps/*/node_modules
pnpm install
```

### TypeScript Errors After Pull

```bash
# Restart TS server in VS Code
Cmd+Shift+P → "TypeScript: Restart TS Server"
```

### Hot Reload Not Working

```bash
# Restart dev server
Ctrl+C
pnpm dev
```

## Architecture Tips

### Adding a Socket Event

1. Define handler in `apps/server/src/socket.ts`
2. Add Zod schema in `validation.ts`
3. Add rate limit in `rateLimit.ts`
4. Update client in `apps/web/src/lib/socketBridge.ts`
5. Add types to both sides

### Adding a Game Phase

1. Add phase to `GamePhase` type
2. Implement logic in `phases.ts`
3. Add timer handling
4. Create UI component in `features/`
5. Handle in `socketBridge.ts`

### Adding a Component

Follow Atomic Design:

1. **Atom**: Single-purpose, no business logic
2. **Molecule**: 2-3 atoms combined
3. **Organism**: Complex section
4. **Feature**: Game phase with business logic
