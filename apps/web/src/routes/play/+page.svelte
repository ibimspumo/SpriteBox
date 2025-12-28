<!-- Mode Selection Page - /play (Native mobile vertical scroll) -->
<script lang="ts">
  import { goto } from '$app/navigation';
  import { dev } from '$app/environment';
  import { t } from '$lib/i18n';
  import { onlineCountByMode, availableGameModes, currentUser, type GameModeInfo } from '$lib/stores';
  import { ModeCard, UsernameEditor } from '$lib/components/molecules';
  import { getSlugFromMode } from '$lib/modeRoutes';

  // Client-only solo modes (not from server)
  const soloModes: GameModeInfo[] = [
    {
      id: 'colordle',
      displayName: 'Colordle',
      i18nKey: 'gameModes.colordle',
      players: { min: 1, max: 1 },
      allowPrivate: false,
    },
    {
      id: 'idle-pixel',
      displayName: 'Idle Pixel',
      i18nKey: 'gameModes.idlePixel',
      players: { min: 1, max: 1 },
      allowPrivate: false,
    },
  ];

  // Filter out dev-only modes (like pixel-survivor) in production
  const visibleGameModes = $derived(
    [...$availableGameModes, ...soloModes].filter(mode => {
      // pixel-survivor is dev-only
      if (mode.id === 'pixel-survivor') return dev;
      return true;
    })
  );

  // Split modes into multiplayer and solo
  const multiplayerModes = $derived(
    visibleGameModes.filter(mode => mode.players.max > 1)
  );
  const soloGameModes = $derived(
    visibleGameModes.filter(mode => mode.players.max === 1)
  );

  function selectMode(modeId: string): void {
    // Check if it's a solo mode with direct route
    if (modeId === 'colordle') {
      goto('/play/colordle');
      return;
    }
    if (modeId === 'idle-pixel') {
      goto('/play/idle');
      return;
    }

    const slug = getSlugFromMode(modeId);
    if (slug) {
      goto(`/play/${slug}`);
    }
  }

  function goHome(): void {
    goto('/');
  }
</script>

<div class="mode-selection">
  <!-- Subtle background grid -->
  <div class="bg-grid"></div>

  <!-- Header with back button -->
  <header class="header">
    <button class="back-btn" onclick={goHome} aria-label={$t.common.backToHome}>
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
        <path d="M19 12H5M12 19l-7-7 7-7"/>
      </svg>
    </button>
    <h1 class="page-title">{$t.modeSelection.title}</h1>
    <div class="header-spacer"></div>
  </header>

  <!-- Main content - vertical scroll -->
  <main class="content">
    <!-- Multiplayer modes section -->
    {#if multiplayerModes.length > 0}
      <section class="mode-section">
        <div class="section-label">
          <span class="label-icon">🎮</span>
          <span class="label-text">{$t.modeSelection.multiplayer}</span>
          <span class="label-line"></span>
        </div>
        <div class="mode-list">
          {#each multiplayerModes as mode}
            <ModeCard
              {mode}
              playerCount={$onlineCountByMode[mode.id] ?? 0}
              onclick={() => selectMode(mode.id)}
            />
          {/each}
        </div>
      </section>
    {/if}

    <!-- Solo modes section -->
    {#if soloGameModes.length > 0}
      <section class="mode-section">
        <div class="section-label">
          <span class="label-icon">🎯</span>
          <span class="label-text">{$t.modeSelection.solo}</span>
          <span class="label-line"></span>
        </div>
        <div class="mode-list">
          {#each soloGameModes as mode}
            <ModeCard
              {mode}
              playerCount={0}
              onclick={() => selectMode(mode.id)}
            />
          {/each}
        </div>
      </section>
    {/if}
  </main>

  <!-- Footer with username editor -->
  {#if $currentUser}
    <footer class="footer">
      <UsernameEditor
        displayName={$currentUser.displayName}
        discriminator={$currentUser.discriminator}
      />
    </footer>
  {/if}
</div>

<style>
  .mode-selection {
    position: relative;
    min-height: 100dvh;
    display: flex;
    flex-direction: column;
    background: var(--color-bg-primary);
  }

  /* Subtle background grid */
  .bg-grid {
    position: fixed;
    inset: 0;
    background-image:
      linear-gradient(rgba(78, 205, 196, 0.02) 1px, transparent 1px),
      linear-gradient(90deg, rgba(78, 205, 196, 0.02) 1px, transparent 1px);
    background-size: 24px 24px;
    pointer-events: none;
    z-index: 0;
  }

  /* Header */
  .header {
    position: sticky;
    top: 0;
    z-index: 10;
    display: flex;
    align-items: center;
    gap: var(--space-3);
    padding: var(--space-3) var(--space-4);
    background: linear-gradient(
      to bottom,
      var(--color-bg-primary) 0%,
      var(--color-bg-primary) 70%,
      transparent 100%
    );
    backdrop-filter: blur(8px);
  }

  .back-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 40px;
    height: 40px;
    background: var(--color-bg-secondary);
    border: 2px solid var(--color-border);
    border-radius: var(--radius-md);
    color: var(--color-text-secondary);
    cursor: pointer;
    transition: all 0.15s ease;
    flex-shrink: 0;
  }

  .back-btn svg {
    width: 20px;
    height: 20px;
  }

  .back-btn:hover,
  .back-btn:focus-visible {
    color: var(--color-accent);
    border-color: var(--color-accent);
    background: rgba(78, 205, 196, 0.1);
  }

  .back-btn:focus-visible {
    outline: 2px solid var(--color-accent);
    outline-offset: 2px;
  }

  .back-btn:active {
    transform: scale(0.95);
  }

  .page-title {
    flex: 1;
    margin: 0;
    font-size: var(--font-size-md);
    font-weight: var(--font-weight-bold);
    color: var(--color-text-primary);
    text-align: center;
  }

  .header-spacer {
    width: 40px;
    flex-shrink: 0;
  }

  /* Main content */
  .content {
    position: relative;
    z-index: 1;
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: var(--space-6);
    padding: var(--space-2) var(--space-4) var(--space-6);
    overflow-y: auto;
    -webkit-overflow-scrolling: touch;
  }

  /* Section styling */
  .mode-section {
    display: flex;
    flex-direction: column;
    gap: var(--space-3);
  }

  .section-label {
    display: flex;
    align-items: center;
    gap: var(--space-2);
  }

  .label-icon {
    font-size: 1rem;
  }

  .label-text {
    font-size: var(--font-size-xs);
    font-weight: var(--font-weight-bold);
    color: var(--color-text-muted);
    text-transform: uppercase;
    letter-spacing: 0.1em;
    white-space: nowrap;
  }

  .label-line {
    flex: 1;
    height: 1px;
    background: var(--color-border);
    margin-left: var(--space-2);
  }

  /* Mode list - vertical stack */
  .mode-list {
    display: flex;
    flex-direction: column;
    gap: var(--space-3);
  }

  /* Footer */
  .footer {
    position: sticky;
    bottom: 0;
    z-index: 10;
    display: flex;
    justify-content: center;
    padding: var(--space-4);
    background: linear-gradient(
      to top,
      var(--color-bg-primary) 0%,
      var(--color-bg-primary) 70%,
      transparent 100%
    );
  }

  /* Tablet and above */
  @media (min-width: 640px) {
    .header {
      padding: var(--space-4) var(--space-6);
    }

    .page-title {
      font-size: var(--font-size-lg);
    }

    .content {
      padding: var(--space-4) var(--space-6) var(--space-8);
      gap: var(--space-8);
    }

    .mode-list {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: var(--space-4);
    }
  }

  /* Desktop */
  @media (min-width: 1024px) {
    .mode-selection {
      padding: 0;
    }

    .header {
      position: relative;
      padding: var(--space-6) var(--space-8);
      background: transparent;
      backdrop-filter: none;
    }

    .back-btn {
      width: 44px;
      height: 44px;
    }

    .page-title {
      font-size: var(--font-size-xl);
    }

    .content {
      max-width: 900px;
      margin: 0 auto;
      width: 100%;
      padding: 0 var(--space-8) var(--space-10);
    }

    .mode-list {
      gap: var(--space-5);
    }

    .footer {
      position: relative;
      background: transparent;
    }
  }

  /* Large desktop */
  @media (min-width: 1280px) {
    .content {
      max-width: 1000px;
    }

    .mode-list {
      grid-template-columns: repeat(2, 1fr);
    }
  }
</style>
