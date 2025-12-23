---
title: Installation
description: How to set up SpriteBox for local development
---

## Prerequisites

Before you begin, ensure you have the following installed:

- **[Node.js](https://nodejs.org)** version 20 or newer
- **[pnpm](https://pnpm.io)** package manager

### Installing pnpm

If you don't have pnpm installed:

```bash
npm install -g pnpm
```

## Clone the Repository

```bash
git clone https://github.com/ibimspumo/SpriteBox.git
cd SpriteBox
```

## Install Dependencies

```bash
pnpm install
```

This installs dependencies for both the frontend (`apps/web`) and backend (`apps/server`).

## Project Structure

After installation, your directory looks like this:

```
SpriteBox/
├── apps/
│   ├── server/          # Node.js backend
│   │   └── src/
│   │       ├── index.ts      # Entry point
│   │       ├── socket.ts     # WebSocket handlers
│   │       ├── instance.ts   # Game instance logic
│   │       ├── voting.ts     # Elo algorithm
│   │       └── phases.ts     # Game phase management
│   └── web/             # Svelte frontend
│       └── src/
│           ├── lib/
│           │   ├── components/   # Atomic Design structure
│           │   ├── stores.ts     # Svelte stores
│           │   └── socket.ts     # Socket client
│           └── routes/           # SvelteKit routes
├── package.json         # Workspace scripts
└── pnpm-workspace.yaml  # Monorepo configuration
```

## Next Steps

- [Quick Start](/docs/getting-started/quick-start/) - Run the development server
