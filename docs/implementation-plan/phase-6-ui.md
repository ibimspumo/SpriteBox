# Phase 6: UI-Komponenten

**Ziel:** Alle Svelte-Komponenten für das Spiel erstellen: Canvas, Palette, Lobby, Voting, Finale, Results.

**Voraussetzungen:**
- Phase 5 abgeschlossen
- Stores und Socket-Bridge funktionieren
- Frontend verbindet mit Backend

---

## Aufgaben

### 6.1 PixelCanvas-Komponente

- [ ] 📁 `apps/web/src/lib/components/PixelCanvas.svelte`
- [ ] 🔧 8x8 Grid mit Touch/Mouse-Support
- [ ] 🔧 Zoom für Mobile

**Datei:**

```svelte
<!-- apps/web/src/lib/components/PixelCanvas.svelte -->
<script lang="ts">
  import { pixels, selectedColor } from '$lib/stores';
  import { PALETTE, indexToHexChar, hexCharToIndex } from '$lib/palette';

  export let readonly = false;
  export let pixelData: string | null = null; // Für Anzeige fremder Bilder
  export let size = 256; // Canvas-Größe in Pixeln

  const GRID_SIZE = 8;
  const cellSize = size / GRID_SIZE;

  // Verwende entweder übergebene Daten oder Store
  $: displayPixels = pixelData ?? $pixels;

  let isDrawing = false;

  function getPixelIndex(x: number, y: number): number {
    return y * GRID_SIZE + x;
  }

  function setPixel(x: number, y: number): void {
    if (readonly || pixelData) return;

    const index = getPixelIndex(x, y);
    const newPixels = displayPixels.split('');
    newPixels[index] = indexToHexChar($selectedColor);
    pixels.set(newPixels.join(''));
  }

  function handlePointerDown(e: PointerEvent): void {
    if (readonly || pixelData) return;
    isDrawing = true;
    handlePointerMove(e);
  }

  function handlePointerMove(e: PointerEvent): void {
    if (!isDrawing || readonly || pixelData) return;

    const rect = (e.target as HTMLElement).closest('.canvas')?.getBoundingClientRect();
    if (!rect) return;

    const x = Math.floor((e.clientX - rect.left) / cellSize);
    const y = Math.floor((e.clientY - rect.top) / cellSize);

    if (x >= 0 && x < GRID_SIZE && y >= 0 && y < GRID_SIZE) {
      setPixel(x, y);
    }
  }

  function handlePointerUp(): void {
    isDrawing = false;
  }

  function getPixelColor(index: number): string {
    const hexChar = displayPixels[index] || '1';
    const colorIndex = hexCharToIndex(hexChar);
    return PALETTE[colorIndex]?.hex ?? '#FFFFFF';
  }
</script>

<div
  class="canvas"
  style="--size: {size}px; --cell-size: {cellSize}px"
  on:pointerdown={handlePointerDown}
  on:pointermove={handlePointerMove}
  on:pointerup={handlePointerUp}
  on:pointerleave={handlePointerUp}
  role="img"
  aria-label="Pixel Canvas"
>
  {#each Array(GRID_SIZE * GRID_SIZE) as _, i}
    <div
      class="pixel"
      style="background-color: {getPixelColor(i)}"
    />
  {/each}
</div>

<style>
  .canvas {
    width: var(--size);
    height: var(--size);
    display: grid;
    grid-template-columns: repeat(8, 1fr);
    grid-template-rows: repeat(8, 1fr);
    border: 2px solid #333;
    border-radius: 4px;
    touch-action: none;
    user-select: none;
    cursor: crosshair;
  }

  .pixel {
    width: var(--cell-size);
    height: var(--cell-size);
    border: 1px solid rgba(0, 0, 0, 0.1);
  }
</style>
```

---

### 6.2 ColorPalette-Komponente

- [ ] 📁 `apps/web/src/lib/components/ColorPalette.svelte`
- [ ] 🔧 16 Farben auswählbar

**Datei:**

```svelte
<!-- apps/web/src/lib/components/ColorPalette.svelte -->
<script lang="ts">
  import { selectedColor } from '$lib/stores';
  import { PALETTE } from '$lib/palette';
</script>

<div class="palette">
  {#each PALETTE as color, index}
    <button
      class="color-button"
      class:selected={$selectedColor === index}
      style="background-color: {color.hex}"
      on:click={() => selectedColor.set(index)}
      title={color.name}
      aria-label={color.name}
    />
  {/each}
</div>

<style>
  .palette {
    display: grid;
    grid-template-columns: repeat(8, 1fr);
    gap: 4px;
    padding: 8px;
    background: #16213e;
    border-radius: 8px;
  }

  .color-button {
    width: 32px;
    height: 32px;
    border: 2px solid transparent;
    border-radius: 4px;
    cursor: pointer;
    transition: transform 0.1s, border-color 0.1s;
  }

  .color-button:hover {
    transform: scale(1.1);
  }

  .color-button.selected {
    border-color: #fff;
    transform: scale(1.15);
  }

  @media (max-width: 400px) {
    .color-button {
      width: 28px;
      height: 28px;
    }
  }
</style>
```

---

### 6.3 Timer-Komponente

- [ ] 📁 `apps/web/src/lib/components/Timer.svelte`

**Datei:**

```svelte
<!-- apps/web/src/lib/components/Timer.svelte -->
<script lang="ts">
  import { game } from '$lib/stores';

  $: seconds = $game.timer ? Math.ceil($game.timer.remaining / 1000) : 0;
  $: progress = $game.timer
    ? ($game.timer.remaining / $game.timer.duration) * 100
    : 100;
  $: isLow = seconds <= 10;
</script>

{#if $game.timer}
  <div class="timer" class:low={isLow}>
    <div class="progress-bar">
      <div class="progress" style="width: {progress}%" />
    </div>
    <span class="seconds">{seconds}s</span>
  </div>
{/if}

<style>
  .timer {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 8px 16px;
    background: #16213e;
    border-radius: 20px;
  }

  .progress-bar {
    width: 120px;
    height: 8px;
    background: #0f3460;
    border-radius: 4px;
    overflow: hidden;
  }

  .progress {
    height: 100%;
    background: #4ade80;
    transition: width 0.1s linear;
  }

  .timer.low .progress {
    background: #ef4444;
  }

  .seconds {
    font-size: 1.25rem;
    font-weight: bold;
    min-width: 40px;
  }

  .timer.low .seconds {
    color: #ef4444;
    animation: pulse 0.5s ease-in-out infinite;
  }

  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.5; }
  }
</style>
```

---

### 6.4 Lobby-Komponente

- [ ] 📁 `apps/web/src/lib/components/Lobby.svelte`

**Datei:**

```svelte
<!-- apps/web/src/lib/components/Lobby.svelte -->
<script lang="ts">
  import { lobby, game, currentUser } from '$lib/stores';
  import { joinPublicGame, createPrivateRoom, joinPrivateRoom, leaveLobby, hostStartGame } from '$lib/socketBridge';
  import Timer from './Timer.svelte';

  let roomCode = '';
  let showJoinInput = false;
</script>

<div class="lobby">
  {#if !$lobby.instanceId}
    <!-- Nicht in einer Lobby -->
    <div class="menu">
      <h2>Spielen</h2>

      <button class="btn primary" on:click={joinPublicGame}>
        🎮 Öffentliches Spiel
      </button>

      <button class="btn secondary" on:click={createPrivateRoom}>
        🔒 Privaten Raum erstellen
      </button>

      <div class="divider">oder</div>

      {#if showJoinInput}
        <div class="join-input">
          <input
            type="text"
            bind:value={roomCode}
            placeholder="Code eingeben"
            maxlength="4"
          />
          <button class="btn" on:click={() => joinPrivateRoom(roomCode.toUpperCase())}>
            Beitreten
          </button>
        </div>
      {:else}
        <button class="btn text" on:click={() => showJoinInput = true}>
          Raum-Code eingeben
        </button>
      {/if}
    </div>
  {:else}
    <!-- In einer Lobby -->
    <div class="in-lobby">
      <div class="lobby-header">
        <h2>
          {#if $lobby.type === 'private'}
            Raum: {$lobby.code}
          {:else}
            Öffentliche Lobby
          {/if}
        </h2>
        <Timer />
      </div>

      <div class="players">
        <h3>{$lobby.players.length} Spieler</h3>
        <ul>
          {#each $lobby.players as player}
            <li class:you={player.fullName === $currentUser?.fullName}>
              {player.fullName}
              {#if player.fullName === $currentUser?.fullName}
                <span class="tag">Du</span>
              {/if}
            </li>
          {/each}
        </ul>
      </div>

      {#if $lobby.isSpectator}
        <p class="spectator-notice">Du bist Zuschauer für diese Runde</p>
      {/if}

      <div class="actions">
        {#if $lobby.isHost && $lobby.type === 'private'}
          <button
            class="btn primary"
            on:click={hostStartGame}
            disabled={$lobby.players.length < 5}
          >
            Spiel starten
          </button>
        {:else if $lobby.type === 'public'}
          <p class="info">Warte auf {5 - $lobby.players.length} weitere Spieler...</p>
        {/if}

        <button class="btn text" on:click={leaveLobby}>
          Lobby verlassen
        </button>
      </div>
    </div>
  {/if}
</div>

<style>
  .lobby {
    width: 100%;
    max-width: 400px;
    margin: 0 auto;
  }

  .menu, .in-lobby {
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  h2 {
    text-align: center;
    color: #e94560;
  }

  .btn {
    padding: 12px 24px;
    border: none;
    border-radius: 8px;
    font-size: 1rem;
    cursor: pointer;
    transition: transform 0.1s, opacity 0.1s;
  }

  .btn:hover:not(:disabled) {
    transform: translateY(-2px);
  }

  .btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .btn.primary {
    background: #e94560;
    color: white;
  }

  .btn.secondary {
    background: #0f3460;
    color: white;
  }

  .btn.text {
    background: transparent;
    color: #aaa;
    text-decoration: underline;
  }

  .divider {
    text-align: center;
    color: #666;
  }

  .join-input {
    display: flex;
    gap: 8px;
  }

  .join-input input {
    flex: 1;
    padding: 12px;
    border: 2px solid #0f3460;
    border-radius: 8px;
    background: #16213e;
    color: white;
    font-size: 1.25rem;
    text-transform: uppercase;
    text-align: center;
    letter-spacing: 4px;
  }

  .lobby-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    flex-wrap: wrap;
    gap: 12px;
  }

  .players ul {
    list-style: none;
    padding: 0;
    margin: 0;
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .players li {
    padding: 8px 12px;
    background: #16213e;
    border-radius: 4px;
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .players li.you {
    background: #0f3460;
  }

  .tag {
    font-size: 0.75rem;
    padding: 2px 6px;
    background: #e94560;
    border-radius: 4px;
  }

  .spectator-notice {
    padding: 12px;
    background: #3b2d00;
    border: 1px solid #fbbf24;
    border-radius: 8px;
    text-align: center;
  }

  .info {
    text-align: center;
    color: #aaa;
  }

  .actions {
    display: flex;
    flex-direction: column;
    gap: 8px;
    margin-top: 16px;
  }
</style>
```

---

### 6.5 Drawing-Komponente

- [ ] 📁 `apps/web/src/lib/components/Drawing.svelte`

**Datei:**

```svelte
<!-- apps/web/src/lib/components/Drawing.svelte -->
<script lang="ts">
  import { game, pixels, hasSubmitted } from '$lib/stores';
  import { submitDrawing } from '$lib/socketBridge';
  import PixelCanvas from './PixelCanvas.svelte';
  import ColorPalette from './ColorPalette.svelte';
  import Timer from './Timer.svelte';

  function handleSubmit(): void {
    submitDrawing($pixels);
  }

  function handleClear(): void {
    pixels.set('1'.repeat(64));
  }
</script>

<div class="drawing">
  <div class="header">
    <div class="prompt">
      <span class="label">Zeichne:</span>
      <span class="text">{$game.prompt}</span>
    </div>
    <Timer />
  </div>

  <div class="canvas-container">
    <PixelCanvas size={280} readonly={$hasSubmitted} />
  </div>

  <ColorPalette />

  <div class="actions">
    {#if $hasSubmitted}
      <div class="submitted">
        ✅ Abgegeben! Warte auf andere...
      </div>
    {:else}
      <button class="btn secondary" on:click={handleClear}>
        🗑️ Löschen
      </button>
      <button class="btn primary" on:click={handleSubmit}>
        ✅ Abgeben
      </button>
    {/if}
  </div>
</div>

<style>
  .drawing {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 20px;
    padding: 16px;
  }

  .header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    width: 100%;
    max-width: 400px;
    flex-wrap: wrap;
    gap: 12px;
  }

  .prompt {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .prompt .label {
    font-size: 0.875rem;
    color: #aaa;
  }

  .prompt .text {
    font-size: 1.25rem;
    font-weight: bold;
    color: #e94560;
  }

  .canvas-container {
    background: #16213e;
    padding: 16px;
    border-radius: 12px;
  }

  .actions {
    display: flex;
    gap: 12px;
    width: 100%;
    max-width: 280px;
  }

  .btn {
    flex: 1;
    padding: 12px;
    border: none;
    border-radius: 8px;
    font-size: 1rem;
    cursor: pointer;
  }

  .btn.primary {
    background: #4ade80;
    color: #000;
  }

  .btn.secondary {
    background: #0f3460;
    color: #fff;
  }

  .submitted {
    padding: 16px;
    background: #16213e;
    border-radius: 8px;
    text-align: center;
    color: #4ade80;
    width: 100%;
  }
</style>
```

---

### 6.6 Voting-Komponente

- [ ] 📁 `apps/web/src/lib/components/Voting.svelte`

**Datei:**

```svelte
<!-- apps/web/src/lib/components/Voting.svelte -->
<script lang="ts">
  import { voting } from '$lib/stores';
  import { vote } from '$lib/socketBridge';
  import PixelCanvas from './PixelCanvas.svelte';
  import Timer from './Timer.svelte';

  function handleVote(chosenId: string): void {
    vote(chosenId);
  }
</script>

<div class="voting">
  <div class="header">
    <span>Runde {$voting.round}/{$voting.totalRounds}</span>
    <Timer />
  </div>

  {#if $voting.hasVoted}
    <div class="waiting">
      ✅ Abgestimmt! Warte auf nächste Runde...
    </div>
  {:else if $voting.imageA && $voting.imageB}
    <p class="instruction">Welches Bild ist besser?</p>

    <div class="duel">
      <button
        class="image-btn"
        on:click={() => handleVote($voting.imageA!.playerId)}
      >
        <PixelCanvas
          pixelData={$voting.imageA.pixels}
          size={140}
          readonly
        />
      </button>

      <span class="vs">VS</span>

      <button
        class="image-btn"
        on:click={() => handleVote($voting.imageB!.playerId)}
      >
        <PixelCanvas
          pixelData={$voting.imageB.pixels}
          size={140}
          readonly
        />
      </button>
    </div>
  {:else}
    <div class="waiting">
      Warte auf Bilder...
    </div>
  {/if}
</div>

<style>
  .voting {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 24px;
    padding: 16px;
  }

  .header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    width: 100%;
    max-width: 400px;
  }

  .instruction {
    font-size: 1.25rem;
    color: #aaa;
  }

  .duel {
    display: flex;
    align-items: center;
    gap: 24px;
  }

  .image-btn {
    padding: 12px;
    background: #16213e;
    border: 3px solid transparent;
    border-radius: 12px;
    cursor: pointer;
    transition: transform 0.1s, border-color 0.2s;
  }

  .image-btn:hover {
    transform: scale(1.05);
    border-color: #e94560;
  }

  .vs {
    font-size: 1.5rem;
    font-weight: bold;
    color: #e94560;
  }

  .waiting {
    padding: 32px;
    background: #16213e;
    border-radius: 12px;
    text-align: center;
    color: #4ade80;
  }

  @media (max-width: 400px) {
    .duel {
      flex-direction: column;
    }
  }
</style>
```

---

### 6.7 Finale-Komponente

- [ ] 📁 `apps/web/src/lib/components/Finale.svelte`

**Datei:**

```svelte
<!-- apps/web/src/lib/components/Finale.svelte -->
<script lang="ts">
  import { finale, finaleVoted, currentUser } from '$lib/stores';
  import { finaleVote } from '$lib/socketBridge';
  import PixelCanvas from './PixelCanvas.svelte';
  import Timer from './Timer.svelte';

  $: myPlayerId = $currentUser?.fullName ?? '';
</script>

<div class="finale">
  <div class="header">
    <h2>🏆 Finale</h2>
    <Timer />
  </div>

  <p class="instruction">Wähle deinen Favoriten!</p>

  {#if $finaleVoted}
    <div class="voted">
      ✅ Abgestimmt! Ergebnisse kommen gleich...
    </div>
  {:else if $finale}
    <div class="finalists">
      {#each $finale.finalists as finalist}
        {@const isOwn = finalist.user?.fullName === myPlayerId}
        <button
          class="finalist"
          class:own={isOwn}
          disabled={isOwn}
          on:click={() => finaleVote(finalist.playerId)}
        >
          <PixelCanvas
            pixelData={finalist.pixels}
            size={100}
            readonly
          />
          <span class="name">{finalist.user?.displayName ?? 'Anonym'}</span>
          <span class="elo">Elo: {finalist.elo}</span>
          {#if isOwn}
            <span class="own-tag">Dein Bild</span>
          {/if}
        </button>
      {/each}
    </div>
  {/if}
</div>

<style>
  .finale {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 24px;
    padding: 16px;
  }

  .header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    width: 100%;
    max-width: 600px;
  }

  .header h2 {
    margin: 0;
    color: #fbbf24;
  }

  .instruction {
    color: #aaa;
  }

  .finalists {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    gap: 16px;
    max-width: 600px;
  }

  .finalist {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
    padding: 12px;
    background: #16213e;
    border: 2px solid transparent;
    border-radius: 12px;
    cursor: pointer;
    transition: transform 0.1s, border-color 0.2s;
  }

  .finalist:not(:disabled):hover {
    transform: scale(1.05);
    border-color: #fbbf24;
  }

  .finalist:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .finalist.own {
    border-color: #0f3460;
  }

  .name {
    font-weight: bold;
  }

  .elo {
    font-size: 0.75rem;
    color: #aaa;
  }

  .own-tag {
    font-size: 0.75rem;
    padding: 2px 8px;
    background: #0f3460;
    border-radius: 4px;
  }

  .voted {
    padding: 32px;
    background: #16213e;
    border-radius: 12px;
    color: #4ade80;
  }
</style>
```

---

### 6.8 Results-Komponente

- [ ] 📁 `apps/web/src/lib/components/Results.svelte`

**Datei:**

```svelte
<!-- apps/web/src/lib/components/Results.svelte -->
<script lang="ts">
  import { results, currentUser } from '$lib/stores';
  import PixelCanvas from './PixelCanvas.svelte';

  const medals = ['🥇', '🥈', '🥉'];
</script>

<div class="results">
  {#if $results}
    <h2>🎉 Ergebnisse</h2>
    <p class="prompt">Prompt: "{$results.prompt}"</p>

    <div class="podium">
      {#each $results.rankings.slice(0, 3) as entry, index}
        {@const isOwn = entry.user.fullName === $currentUser?.fullName}
        <div class="winner" class:first={index === 0} class:own={isOwn}>
          <span class="medal">{medals[index]}</span>
          <PixelCanvas
            pixelData={entry.pixels}
            size={index === 0 ? 120 : 100}
            readonly
          />
          <span class="name">{entry.user.displayName}</span>
          <span class="votes">{entry.finalVotes} Votes</span>
          {#if isOwn}
            <span class="own-tag">Du!</span>
          {/if}
        </div>
      {/each}
    </div>

    <div class="gallery">
      <h3>Alle Bilder ({$results.totalParticipants})</h3>
      <div class="gallery-grid">
        {#each $results.rankings.slice(3) as entry}
          <div class="gallery-item">
            <PixelCanvas pixelData={entry.pixels} size={60} readonly />
            <span>#{entry.place}</span>
          </div>
        {/each}
      </div>
    </div>

    <p class="next-round">Nächste Runde startet gleich...</p>
  {/if}
</div>

<style>
  .results {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 24px;
    padding: 16px;
    text-align: center;
  }

  h2 {
    color: #fbbf24;
    margin: 0;
  }

  .prompt {
    color: #aaa;
    font-style: italic;
  }

  .podium {
    display: flex;
    align-items: flex-end;
    gap: 16px;
  }

  .winner {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
    padding: 16px;
    background: #16213e;
    border-radius: 12px;
  }

  .winner.first {
    order: -1;
    transform: translateY(-20px);
  }

  .winner.own {
    border: 2px solid #4ade80;
  }

  .medal {
    font-size: 2rem;
  }

  .name {
    font-weight: bold;
  }

  .votes {
    font-size: 0.875rem;
    color: #aaa;
  }

  .own-tag {
    font-size: 0.75rem;
    padding: 2px 8px;
    background: #4ade80;
    color: #000;
    border-radius: 4px;
  }

  .gallery {
    width: 100%;
    max-width: 500px;
  }

  .gallery h3 {
    color: #aaa;
  }

  .gallery-grid {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    gap: 8px;
  }

  .gallery-item {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 4px;
    font-size: 0.75rem;
    color: #666;
  }

  .next-round {
    color: #aaa;
    animation: pulse 1s ease-in-out infinite;
  }

  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.5; }
  }
</style>
```

---

### 6.9 Haupt-Page aktualisieren

- [ ] 🔧 Alle Komponenten einbinden

**Datei aktualisieren:**

```svelte
<!-- apps/web/src/routes/+page.svelte -->
<script lang="ts">
  import { game, lobby, currentUser } from '$lib/stores';
  import Lobby from '$lib/components/Lobby.svelte';
  import Drawing from '$lib/components/Drawing.svelte';
  import Voting from '$lib/components/Voting.svelte';
  import Finale from '$lib/components/Finale.svelte';
  import Results from '$lib/components/Results.svelte';
  import Timer from '$lib/components/Timer.svelte';
</script>

<main>
  <header>
    <h1>🎨 SpriteBox</h1>
    {#if $currentUser}
      <span class="user">{$currentUser.fullName}</span>
    {/if}
  </header>

  <div class="game-container">
    {#if $game.phase === 'idle' || $game.phase === 'lobby'}
      <Lobby />
    {:else if $game.phase === 'countdown'}
      <div class="countdown">
        <h2>Bereit machen!</h2>
        <p class="prompt">Prompt: <strong>{$game.prompt}</strong></p>
        <Timer />
      </div>
    {:else if $game.phase === 'drawing'}
      <Drawing />
    {:else if $game.phase === 'voting'}
      <Voting />
    {:else if $game.phase === 'finale'}
      <Finale />
    {:else if $game.phase === 'results'}
      <Results />
    {/if}
  </div>
</main>

<style>
  /* ... bestehende Styles ... */

  .countdown {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 24px;
    text-align: center;
  }

  .countdown h2 {
    font-size: 2.5rem;
    color: #fbbf24;
    animation: pulse 1s ease-in-out infinite;
  }

  .countdown .prompt {
    font-size: 1.5rem;
    color: #e94560;
  }

  @keyframes pulse {
    0%, 100% { transform: scale(1); }
    50% { transform: scale(1.1); }
  }
</style>
```

---

## Kontrollpunkte

### 🧪 Test 1: Canvas zeichnen

```
- [ ] Klicken setzt Pixel
- [ ] Ziehen malt kontinuierlich
- [ ] Farbe wechseln funktioniert
- [ ] Touch funktioniert auf Mobile
```

### 🧪 Test 2: Lobby funktioniert

```
- [ ] Öffentlichem Spiel beitreten
- [ ] Privaten Raum erstellen
- [ ] Raum-Code eingeben und beitreten
- [ ] Spielerliste aktualisiert sich
```

### 🧪 Test 3: Kompletter Spielablauf

```
- [ ] Lobby -> Countdown -> Drawing -> Voting -> Results
- [ ] Timer zeigt korrekte Zeit
- [ ] Submission funktioniert
- [ ] Voting zeigt zwei Bilder
- [ ] Ergebnisse werden angezeigt
```

---

## Definition of Done

- [ ] PixelCanvas mit Touch-Support
- [ ] ColorPalette mit 16 Farben
- [ ] Timer-Komponente mit Progress-Bar
- [ ] Lobby mit Join/Create-Funktionen
- [ ] Drawing-Phase komplett
- [ ] Voting-Phase mit Duell-Ansicht
- [ ] Finale mit allen Finalisten
- [ ] Results mit Podium und Galerie
- [ ] Mobile-First Design
- [ ] Alle Änderungen sind committed

---

## Nächster Schritt

👉 **Weiter zu [Phase 7: Sicherheit](./phase-7-security.md)**
