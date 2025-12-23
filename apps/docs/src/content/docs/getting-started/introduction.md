---
title: Introduction
description: What is SpriteBox and why was it built?
---

SpriteBox is a **free, browser-based multiplayer game** where you compete to create the best 8x8 pixel art based on creative prompts. Think *Gartic Phone* meets *Pixel Art* with a competitive Elo-based ranking twist.

## Core Philosophy

- **100% Open Source** - MIT licensed, inspect and modify everything
- **No External Database** - All state lives in memory
- **No Secrets Required** - Zero configuration deployment
- **One Command to Start** - `pnpm dev` and you're running

## Tech Stack

| Layer | Technology | Purpose |
|-------|------------|---------|
| **Frontend** | Svelte 5 + Vite | Reactive UI with tiny bundles |
| **Backend** | Node.js + Express | HTTP server + static files |
| **Real-time** | Socket.io | WebSocket communication |
| **Validation** | Zod | Runtime type safety |
| **Compression** | LZ-String | Efficient large gallery transfer |
| **Package Manager** | pnpm | Fast monorepo management |

## Game Modes

SpriteBox offers **4 unique game modes**:

| Mode | Players | Description |
|------|---------|-------------|
| **Pixel Battle** | 5-100 | Classic mode: draw prompts, Elo-based voting, finale |
| **CopyCat** | 2 (1v1) | Memory duel: memorize and recreate a reference image |
| **Pixel Guesser** | 2-20 | Pictionary-style: one draws, others guess the word |
| **Pixel Survivor** | 1 (solo) | Roguelike: draw your character and survive 30 days |

Each mode supports **public matchmaking** or **private rooms** (4-letter codes).

## Next Steps

- [Installation Guide](/docs/getting-started/installation/) - Set up your development environment
- [Quick Start](/docs/getting-started/quick-start/) - Run SpriteBox locally
- [Architecture Overview](/docs/architecture/overview/) - Understand how it works
