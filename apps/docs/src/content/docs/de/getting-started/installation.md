---
title: Installation
description: Entwicklungsumgebung für SpriteBox einrichten
---

## Voraussetzungen

- **Node.js** 20.19.0 oder höher
- **pnpm** 9.x oder höher

## Schritt 1: Repository klonen

```bash
git clone https://github.com/ibimspumo/SpriteBox.git
cd SpriteBox
```

## Schritt 2: Abhängigkeiten installieren

```bash
pnpm install
```

Das installiert alle Abhängigkeiten für beide Workspaces:
- `apps/server` - Backend-Server
- `apps/web` - Svelte-Frontend

## Schritt 3: Starten

```bash
pnpm dev
```

Das startet beide Server parallel:
- **Frontend**: http://localhost:5173
- **Backend**: http://localhost:3000

## Projektstruktur

```
SpriteBox/
├── apps/
│   ├── server/          # Node.js Backend
│   │   ├── src/
│   │   │   ├── index.ts      # Einstiegspunkt
│   │   │   ├── socket.ts     # WebSocket-Handler
│   │   │   ├── instance.ts   # Spielinstanz-Logik
│   │   │   ├── voting.ts     # Elo-Algorithmus
│   │   │   └── phases.ts     # Spielphasen-Management
│   │   └── data/
│   │       └── prompts.json  # Prompt-Wortlisten
│   └── web/             # Svelte Frontend
│       └── src/
│           ├── lib/
│           │   ├── components/   # UI-Komponenten
│           │   ├── stores.ts     # Svelte Stores
│           │   ├── socket.ts     # Socket-Client
│           │   └── i18n/         # Übersetzungen
│           └── routes/           # SvelteKit-Routen
├── package.json         # Root-Konfiguration
└── pnpm-workspace.yaml  # Workspace-Definition
```

## Nächste Schritte

- [Schnellstart](/docs/de/getting-started/quick-start/) - SpriteBox starten und spielen
- [Architektur](/docs/de/architecture/overview/) - Verstehen wie alles zusammenhängt
