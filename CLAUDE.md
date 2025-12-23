# CLAUDE.md
We are in the Year 2025

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
        ├── lib/
        │   ├── components/   # Atomic Design structure (see below)
        │   ├── stores.ts     # Svelte stores
        │   ├── socket.ts     # Socket client
        │   └── styles/       # Design tokens
        └── routes/           # SvelteKit routes
```

## Frontend Component Architecture (Atomic Design)

The frontend follows **Atomic Design** principles for maintainability and consistency.

### Component Hierarchy

```
components/
├── atoms/           # Smallest UI building blocks
│   ├── Button.svelte
│   ├── Input.svelte
│   ├── Badge.svelte
│   └── ProgressBar.svelte
├── molecules/       # Combinations of atoms
│   ├── StatItem.svelte
│   ├── PromptDisplay.svelte
│   └── PasswordInput.svelte
├── organisms/       # Complex UI sections
│   ├── Modal.svelte
│   ├── Card.svelte
│   ├── GalleryGrid.svelte
│   └── PlayerList.svelte
├── features/        # Game-phase components
│   ├── Lobby/
│   │   ├── index.svelte
│   │   ├── LobbyMenu.svelte
│   │   └── LobbyRoom.svelte
│   ├── Drawing.svelte
│   ├── Voting.svelte
│   ├── Finale.svelte
│   └── Results.svelte
├── utility/         # Functional components
│   ├── PixelCanvas.svelte
│   ├── ColorPalette.svelte
│   └── Timer.svelte
└── debug/           # Development tools
    └── DebugPanel.svelte
```

### Design Tokens

All styling uses CSS variables defined in `lib/styles/tokens.css`:

```css
/* Colors */
--color-bg-primary, --color-accent, --color-success, etc.

/* Spacing */
--space-1 (4px) to --space-8 (32px)

/* Border Radius */
--radius-sm (4px) to --radius-xl (20px)

/* Typography */
--font-size-xs to --font-size-2xl
```

### Imports (Barrel Exports)

```typescript
// DO: Use barrel exports
import { Button, Input } from '$lib/components/atoms';
import { Modal, Card } from '$lib/components/organisms';
import { Lobby, Drawing } from '$lib/components/features';

// DON'T: Direct file imports
import Button from '$lib/components/atoms/Button.svelte';
```

### Component Guidelines

**DO:**
- Use design tokens (`var(--space-4)`) instead of hardcoded values
- Keep atoms small and single-purpose
- Compose molecules from atoms
- Pass data via props, not global stores (when possible)
- Use TypeScript interfaces for props

**DON'T:**
- Create new atoms if an existing one can be extended
- Put business logic in atoms/molecules
- Duplicate styles across components
- Use inline styles for reusable patterns
- Skip the component hierarchy (e.g., feature importing atom directly for complex UI)

### Adding a New Component

1. **Atom**: Simple, single-purpose UI element (button, input, badge)
   - No business logic, just props and styling
   - Example: `<Button variant="primary" onclick={...}>Click</Button>`

2. **Molecule**: Combination of 2-3 atoms with minimal logic
   - Example: `<PasswordInput value={...} onsubmit={...} />`

3. **Organism**: Complex section with multiple molecules/atoms
   - Can have local state
   - Example: `<Modal show={...}><PasswordInput /></Modal>`

4. **Feature**: Game-phase component
   - Contains business logic, uses stores
   - Composes organisms/molecules/atoms

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

## Internationalization (i18n)

The app supports **English** and **German**. All user-facing text MUST be multilingual.

### i18n Structure

```text
apps/web/src/lib/i18n/
├── index.ts                    # Stores, toggleLanguage(), getLanguage()
└── translations/
    ├── types.ts                # TypeScript interface (all translation keys)
    ├── en.ts                   # English translations (default)
    └── de.ts                   # German translations (informal "du" form)
```

### Usage Pattern

```svelte
<script lang="ts">
  import { t } from '$lib/i18n';
</script>

<button>{$t.common.submit}</button>
<p>{$t.errors.roomNotFound}</p>
```

### i18n DO's

- **ALWAYS** use `$t.section.key` for ANY user-visible text
- Add new translation keys to `types.ts` first (for type safety)
- Add translations to BOTH `en.ts` AND `de.ts`
- Use informal "du" form in German (not "Sie")
- Use `$derived` for reactive translations in component logic
- Keep translation keys descriptive: `lobbyRoom.startGame` not `lr.sg`

### i18n DON'Ts

- **NEVER** hardcode user-visible strings in components
- **NEVER** add a translation to only one language file
- **NEVER** use template literals for full sentences (breaks translation)
- Don't use formal "Sie" in German translations

### Adding New Translations

1. Add the key to `types.ts`:

   ```typescript
   mySection: {
     myNewKey: string;
   };
   ```

2. Add English text to `en.ts`:

   ```typescript
   mySection: {
     myNewKey: 'My new text',
   },
   ```

3. Add German text to `de.ts`:

   ```typescript
   mySection: {
     myNewKey: 'Mein neuer Text',
   },
   ```

4. Use in component:

   ```svelte
   <span>{$t.mySection.myNewKey}</span>
   ```

### Localized Prompts

Drawing prompts are localized per-user. The server sends **prompt indices**, and the client assembles the localized text:

- `apps/server/data/prompts.json` - English prompts
- `apps/server/data/prompts_de.json` - German prompts (same structure)
- `apps/web/src/lib/prompts.ts` - Client-side localization

Both prompt files MUST have identical array lengths and structure.

## What NOT to Do

- Don't add external database dependencies
- Don't require API keys or secrets
- Don't break the "one command to run" experience
- Don't add heavy client-side processing (server is authoritative)
- Don't store persistent user data (intentionally ephemeral)
- **Don't hardcode UI text** - All user-facing strings MUST use the i18n system (`$t.section.key`)

## Reference Files

- [SPEC.md](SPEC.md) - Full technical specification (detailed)
- [prompt.json](apps/server/data/prompts.json) - Prompt word lists
