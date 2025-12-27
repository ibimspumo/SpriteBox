---
title: Frontend-Architektur
description: Svelte 5 Komponenten-Struktur und State-Management
---

## Tech-Stack

- **Svelte 5** mit Runes (`$state`, `$derived`, `$effect`)
- **Vite** für Bundling und HMR
- **TypeScript** für Typsicherheit
- **Socket.io Client** für Echtzeit-Kommunikation

## Komponenten-Struktur (Atomic Design)

```
components/
├── atoms/           # Kleinste UI-Bausteine
│   ├── Button.svelte
│   ├── Input.svelte
│   ├── Badge.svelte
│   └── ProgressBar.svelte
├── molecules/       # Kombinationen von Atoms
│   ├── StatItem.svelte
│   ├── PromptDisplay.svelte
│   └── PasswordInput.svelte
├── organisms/       # Komplexe UI-Abschnitte
│   ├── Modal.svelte
│   ├── Card.svelte
│   ├── GalleryGrid.svelte
│   └── PlayerList.svelte
├── features/        # Spielphasen-Komponenten
│   ├── Lobby/
│   │   ├── index.svelte
│   │   ├── LobbyMenu.svelte
│   │   └── LobbyRoom.svelte
│   ├── Drawing.svelte        # Zeichenphase
│   ├── Voting.svelte         # Abstimmung (nutzt Voting/)
│   ├── Voting/               # Abstimmungs-Subkomponenten
│   │   ├── VotingContenderCard.svelte
│   │   └── VSBadge.svelte
│   ├── Finale.svelte         # Top 10% Finale
│   ├── Results.svelte        # Ergebnisse (nutzt Results/)
│   ├── Results/              # Ergebnis-Subkomponenten
│   │   ├── ResultsPodium.svelte
│   │   ├── PodiumSlot.svelte
│   │   ├── ResultsGallery.svelte
│   │   └── GalleryItemCard.svelte
│   ├── Countdown.svelte      # Countdown vor Spielstart
│   ├── CopyCat/              # 1v1 Gedächtnis-Modus
│   │   ├── Memorize.svelte       # Referenzbild anzeigen
│   │   ├── CopyCatResult.svelte  # Genauigkeitsvergleich
│   │   └── CopyCatRematch.svelte # Rematch-Abstimmung
│   ├── CopyCatRoyale/        # Battle Royale Modus (NEU)
│   │   ├── index.svelte              # Container
│   │   ├── RoyaleInitialDrawing.svelte  # Kunst erstellen
│   │   ├── RoyaleShowReference.svelte   # Einprägen
│   │   ├── RoyaleDrawing.svelte         # Nachzeichnen
│   │   ├── RoyaleResults.svelte         # Rundenergebnis
│   │   └── RoyaleWinner.svelte          # Siegerehrung
│   ├── PixelGuesser/         # Pictionary-Modus
│   │   ├── Guessing.svelte       # Live-Zeichnen + Raten
│   │   ├── Reveal.svelte         # Antwort enthüllen
│   │   └── FinalResults.svelte   # Spielrangliste
│   ├── PixelSurvivor/        # Roguelike-Modus
│   │   ├── Menu.svelte           # Neues Spiel/Fortsetzen
│   │   ├── Gameplay.svelte       # Haupt-Gameplay
│   │   ├── Combat/               # Kampf-Subsystem
│   │   │   ├── index.svelte
│   │   │   ├── CombatArena.svelte
│   │   │   └── CombatActions.svelte
│   │   └── ... (10+ Komponenten)
│   └── ZombiePixel/          # Echtzeit-Infektionsspiel (NEU)
│       ├── index.svelte          # Spiel-Container
│       ├── ZombieGrid.svelte     # Canvas-basiertes Raster
│       ├── ZombieGridLegend.svelte
│       ├── ZombieControls.svelte # Touch/Tastatur-Steuerung
│       ├── ZombieHUD.svelte      # Status-Anzeige
│       ├── ZombieResults.svelte  # Endergebnis
│       ├── zombieGridConstants.ts
│       └── zombieGridRenderers.ts
├── utility/         # Funktionale Komponenten
│   ├── PixelCanvas.svelte
│   ├── ColorPalette.svelte
│   └── Timer.svelte
└── debug/           # Entwicklungs-Tools
    └── DebugPanel.svelte
```

## State-Management

### Globale Stores (`stores.ts`)

```typescript
// Spielzustand
export const gameState = $state<GameState>('lobby');
export const currentPhase = $state<Phase>('waiting');

// Spieler-Daten
export const players = $state<Player[]>([]);
export const mySubmission = $state<string | null>(null);

// Abgeleiteter Zustand
export const playerCount = $derived(players.length);
export const isHost = $derived(/* Logik */);
```

### Socket-Integration

```typescript
// socket.ts
socket.on('game-state-changed', (state) => {
  gameState.value = state;
});

socket.on('players-updated', (list) => {
  players.value = list;
});
```

## Design-Tokens

Alle Styles nutzen CSS-Variablen aus `tokens.css`:

```css
/* Farben */
--color-bg-primary: #1a1a2e;
--color-accent: #e94560;
--color-success: #4ade80;

/* Abstände */
--space-1: 4px;
--space-2: 8px;
--space-4: 16px;
--space-8: 32px;

/* Radien */
--radius-sm: 4px;
--radius-md: 8px;
--radius-xl: 20px;
```

## i18n-System

Alle sichtbaren Texte nutzen das i18n-System:

```svelte
<script lang="ts">
  import { t } from '$lib/i18n';
</script>

<button>{$t.common.submit}</button>
<p>{$t.errors.roomNotFound}</p>
```

## Nächste Schritte

- [Backend-Architektur](/docs/de/architecture/backend/) - Server-Implementierung
- [Socket-Events](/docs/de/api/socket-events/) - Echtzeit-Kommunikation
