---
title: Frontend Architecture
description: Svelte 5 component structure and design system
---

## Component Architecture (Atomic Design)

The frontend follows **Atomic Design** principles:

```
components/
├── atoms/           # Smallest UI building blocks
│   ├── Button.svelte        # 5 variants, 3 sizes
│   ├── Input.svelte         # With validation
│   ├── Badge.svelte         # Tag element
│   ├── ProgressBar.svelte   # Progress indicator
│   ├── Icon.svelte          # Icon wrapper
│   └── LanguageToggle.svelte # EN/DE switcher
│
├── molecules/       # Combinations of atoms
│   ├── PromptDisplay.svelte  # Shows prompt (prefix + subject + suffix)
│   ├── StatItem.svelte       # Player statistics
│   ├── PasswordInput.svelte  # Password with validation
│   └── UsernameEditor.svelte # Name editor (max 32 chars)
│
├── organisms/       # Complex UI sections
│   ├── Modal.svelte          # Modal with overlay
│   ├── Card.svelte           # Card component
│   ├── GalleryGrid.svelte    # Pixel art gallery (rankings)
│   ├── PlayerList.svelte     # Active players + spectators
│   └── CookieNotice.svelte   # Privacy notice
│
├── features/        # Game-phase components
│   ├── Landing.svelte        # Interactive landing page
│   ├── Lobby/
│   │   ├── index.svelte      # Main lobby
│   │   ├── LobbyMenu.svelte  # Public/Private selection
│   │   └── LobbyRoom.svelte  # Room view with players
│   ├── Drawing.svelte        # Drawing phase
│   ├── Voting.svelte         # Voting rounds
│   ├── Finale.svelte         # Top 10% finale
│   └── Results.svelte        # Results with podium
│
├── utility/         # Functional components
│   ├── PixelCanvas.svelte    # 8x8 drawing canvas
│   ├── ColorPalette.svelte   # 16-color selector
│   ├── Timer.svelte          # Countdown timer
│   └── DemoCanvas.svelte     # Landing page demo
│
└── debug/           # Development tools
    └── DebugPanel.svelte
```

## Component Guidelines

### DO

- Use design tokens (`var(--space-4)`)
- Keep atoms single-purpose, no business logic
- Compose molecules from atoms
- Use barrel exports for imports
- Use TypeScript interfaces for props

### DON'T

- Put business logic in atoms/molecules
- Import atoms directly in features (use organisms/molecules)
- Hardcode colors or spacing values
- Create new atoms if existing ones can be extended

## Svelte Stores

### Connection State
```typescript
connectionStatus: 'disconnected' | 'connecting' | 'connected'
socketId: string | null
globalOnlineCount: number
sessionBlocked: boolean  // Too many browser sessions
idleWarning: { show: boolean; timeLeft: number }
```

### User State
```typescript
interface User {
  displayName: string;
  discriminator: string;  // 4 digits "0000"-"9999"
  fullName: string;       // "Name#0000"
}

currentUser: writable<User | null>
```

### Lobby State
```typescript
interface LobbyState {
  instanceId: string | null;
  type: 'public' | 'private' | null;
  code: string | null;      // 4-char room code
  isHost: boolean;
  hasPassword: boolean;
  players: User[];
  isSpectator: boolean;
  onlineCount: number;
  gameMode: string;
}
```

### Game State
```typescript
type GamePhase = 'idle' | 'lobby' | 'countdown' | 'drawing' | 'voting' | 'finale' | 'results';

interface GameState {
  phase: GamePhase;
  prompt: Prompt | null;
  promptIndices: PromptIndices | null;
  timer: { duration: number; endsAt: number; remaining: number } | null;
}
```

### Derived Stores
```typescript
localizedPrompt       // Auto-updates on language change
localizedResultsPrompt
isInGame: boolean     // instanceId !== null
isHost: boolean
playerCount: number
```

## Design Tokens

All styling uses CSS variables from `lib/styles/tokens.css`:

### Colors (Dark Mode)
```css
/* Backgrounds */
--color-bg-primary: #0f0f23;
--color-bg-secondary: #1a1a3e;
--color-bg-tertiary: #252552;
--color-bg-elevated: #2d2d5a;

/* Brand (Orange/Yellow) */
--color-brand: #f5a623;
--color-brand-light: #ffc857;

/* Accent (Cyan) */
--color-accent: #4ecdc4;

/* Buttons */
--color-btn-primary: #22c55e;    /* Green */
--color-btn-secondary: #4b5563;  /* Gray */
--color-btn-action: #3b82f6;     /* Blue */
--color-btn-danger: #dc2626;     /* Red */

/* Semantic */
--color-success: #22c55e;
--color-warning: #f59e0b;
--color-error: #ef4444;
```

### Spacing (4px base)
```css
--space-1: 4px;   --space-2: 8px;
--space-3: 12px;  --space-4: 16px;
--space-5: 20px;  --space-6: 24px;
--space-8: 32px;  --space-10: 40px;
```

### Typography
```css
--font-family: 'Pixelify Sans', 'Press Start 2P', monospace;

--font-size-xs: 0.75rem;   /* 12px */
--font-size-sm: 0.875rem;  /* 14px */
--font-size-md: 1rem;      /* 16px */
--font-size-lg: 1.25rem;   /* 20px */
--font-size-xl: 1.5rem;    /* 24px */
```

### Pixel-Art Rendering
```css
.pixel-art, canvas {
  image-rendering: pixelated;
  image-rendering: crisp-edges;
}
```

## Barrel Exports

```typescript
// DO: Use barrel exports
import { Button, Input } from '$lib/components/atoms';
import { Modal, Card } from '$lib/components/organisms';
import { Lobby, Drawing } from '$lib/components/features';

// DON'T: Direct file imports
import Button from '$lib/components/atoms/Button.svelte';
```

## Socket Bridge

The `socketBridge.ts` connects Socket.io events to Svelte stores:

```typescript
function setupEventHandlers(socket: AppSocket) {
  socket.on('connected', (data) => {
    currentUser.set(data.user);
    saveUser(data.user);
  });

  socket.on('lobby-joined', (data) => {
    lobby.set({...});
    if (data.timerEndsAt) startTimer(...);
  });

  socket.on('phase-changed', ({ phase, promptIndices }) => {
    game.update(g => ({ ...g, phase, promptIndices }));
  });
}
```

## Internationalization (i18n)

All user-facing text uses the i18n system:

```svelte
<script lang="ts">
  import { t } from '$lib/i18n';
</script>

<button>{$t.common.submit}</button>
<p>{$t.errors.roomNotFound}</p>
```

### Localized Prompts

Prompts use indices for localization:

```typescript
// Server sends indices
{ prefixIdx: 5, subjectIdx: 20, suffixIdx: null }

// Client localizes based on language
localizePrompt(indices) // → { prefix: "blue", subject: "pizza", suffix: "" }
                        // or { prefix: "blau", subject: "Pizza", suffix: "" }
```

:::caution[Important]
Never hardcode user-visible strings. Always use `$t.section.key`.
:::
