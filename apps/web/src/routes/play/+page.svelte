<!-- Mode Selection Page - /play (Mobile-first redesign) -->
<script lang="ts">
  import { goto } from '$app/navigation';
  import { dev } from '$app/environment';
  import { t } from '$lib/i18n';
  import { onlineCountByMode, availableGameModes, selectedGameMode, currentUser, type GameModeInfo } from '$lib/stores';
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

    selectedGameMode.set(modeId);
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
  <!-- Decorative background elements -->
  <div class="bg-decoration">
    <div class="bg-grid"></div>
    <div class="bg-glow glow-1"></div>
    <div class="bg-glow glow-2"></div>
  </div>

  <!-- Header -->
  <header class="header">
    <button class="back-link" onclick={goHome} aria-label={$t.common.backToHome}>
      <svg class="back-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M19 12H5M12 19l-7-7 7-7"/>
      </svg>
      <span class="back-text">{$t.common.backToHome}</span>
    </button>
  </header>

  <!-- Main content -->
  <main class="content">
    <div class="title-section">
      <h1 class="title">{$t.modeSelection.title}</h1>
      <div class="title-decoration">
        <span class="pixel-dot"></span>
        <span class="pixel-dot"></span>
        <span class="pixel-dot"></span>
      </div>
    </div>

    <!-- Multiplayer modes section -->
    {#if multiplayerModes.length > 0}
      <section class="mode-section">
        <div class="section-header">
          <span class="section-icon">🎮</span>
          <h2 class="section-title">{$t.modeSelection.multiplayer ?? 'Multiplayer'}</h2>
        </div>
        <div class="mode-scroll-container">
          <div class="mode-grid multiplayer">
            {#each multiplayerModes as mode}
              <div class="mode-card-wrapper">
                <ModeCard
                  {mode}
                  playerCount={$onlineCountByMode[mode.id] ?? 0}
                  selected={$selectedGameMode === mode.id}
                  onclick={() => selectMode(mode.id)}
                />
              </div>
            {/each}
          </div>
        </div>
      </section>
    {/if}

    <!-- Solo modes section -->
    {#if soloGameModes.length > 0}
      <section class="mode-section solo-section">
        <div class="section-header">
          <span class="section-icon">🎯</span>
          <h2 class="section-title">{$t.modeSelection.solo ?? 'Solo'}</h2>
        </div>
        <div class="mode-scroll-container">
          <div class="mode-grid solo">
            {#each soloGameModes as mode}
              <div class="mode-card-wrapper">
                <ModeCard
                  {mode}
                  playerCount={0}
                  selected={$selectedGameMode === mode.id}
                  onclick={() => selectMode(mode.id)}
                />
              </div>
            {/each}
          </div>
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
    padding: var(--space-4);
    overflow-x: hidden;
  }

  /* Background decorations */
  .bg-decoration {
    position: fixed;
    inset: 0;
    pointer-events: none;
    z-index: 0;
  }

  .bg-grid {
    position: absolute;
    inset: 0;
    background-image:
      linear-gradient(rgba(78, 205, 196, 0.03) 1px, transparent 1px),
      linear-gradient(90deg, rgba(78, 205, 196, 0.03) 1px, transparent 1px);
    background-size: 32px 32px;
    mask-image: radial-gradient(ellipse at center, black 0%, transparent 70%);
  }

  .bg-glow {
    position: absolute;
    border-radius: 50%;
    filter: blur(100px);
    opacity: 0.4;
  }

  .glow-1 {
    top: 10%;
    left: -10%;
    width: 50%;
    height: 50%;
    background: var(--color-accent);
    opacity: 0.08;
  }

  .glow-2 {
    bottom: 10%;
    right: -10%;
    width: 40%;
    height: 40%;
    background: var(--color-brand);
    opacity: 0.06;
  }

  /* Header */
  .header {
    position: relative;
    z-index: 1;
    display: flex;
    justify-content: flex-start;
    padding-bottom: var(--space-4);
  }

  .back-link {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    background: var(--color-bg-secondary);
    border: 2px solid var(--color-border);
    border-radius: var(--radius-full);
    color: var(--color-text-secondary);
    font-family: var(--font-family);
    font-size: var(--font-size-xs);
    cursor: pointer;
    padding: var(--space-2) var(--space-4);
    transition: all 0.2s ease;
  }

  .back-link:hover,
  .back-link:focus-visible {
    color: var(--color-accent);
    border-color: var(--color-accent);
    background: rgba(78, 205, 196, 0.1);
    transform: translateX(-4px);
  }

  .back-link:focus-visible {
    outline: 2px solid var(--color-accent);
    outline-offset: 2px;
  }

  .back-icon {
    width: 16px;
    height: 16px;
  }

  .back-text {
    display: none;
  }

  /* Main content */
  .content {
    position: relative;
    z-index: 1;
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: var(--space-6);
    padding-bottom: var(--space-6);
  }

  /* Title section */
  .title-section {
    text-align: center;
    padding: var(--space-2) 0 var(--space-4);
  }

  .title {
    margin: 0;
    font-size: var(--font-size-xl);
    font-weight: var(--font-weight-bold);
    color: var(--color-text-primary);
    text-shadow: 0 2px 20px rgba(78, 205, 196, 0.3);
  }

  .title-decoration {
    display: flex;
    justify-content: center;
    gap: var(--space-2);
    margin-top: var(--space-3);
  }

  .pixel-dot {
    width: 6px;
    height: 6px;
    background: var(--color-accent);
    opacity: 0.6;
  }

  .pixel-dot:nth-child(2) {
    background: var(--color-brand);
    animation-delay: 0.2s;
  }

  .pixel-dot:nth-child(3) {
    background: var(--color-success);
    animation-delay: 0.4s;
  }

  .section-header {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    margin-bottom: var(--space-3);
    padding-left: var(--space-1);
  }

  .section-icon {
    font-size: 1.25rem;
  }

  .section-title {
    margin: 0;
    font-size: var(--font-size-sm);
    font-weight: var(--font-weight-bold);
    color: var(--color-text-secondary);
    text-transform: uppercase;
    letter-spacing: 0.1em;
  }

  /* Mode grid and scroll container */
  .mode-scroll-container {
    margin: 0 calc(-1 * var(--space-4));
    padding: 0 var(--space-4);
    overflow-x: auto;
    overflow-y: hidden;
    scrollbar-width: none;
    -ms-overflow-style: none;
    scroll-snap-type: x mandatory;
    -webkit-overflow-scrolling: touch;
  }

  .mode-scroll-container::-webkit-scrollbar {
    display: none;
  }

  .mode-grid {
    display: flex;
    gap: var(--space-4);
    padding-bottom: var(--space-2);
  }

  .mode-card-wrapper {
    flex: 0 0 calc(100% - var(--space-8));
    max-width: 340px;
    scroll-snap-align: center;
  }

  /* Solo section specific styles */
  .mode-grid.solo .mode-card-wrapper {
    flex: 0 0 calc(100% - var(--space-8));
    max-width: 340px;
  }

  /* Footer */
  .footer {
    position: relative;
    z-index: 1;
    display: flex;
    justify-content: center;
    padding-top: var(--space-4);
    margin-top: auto;
  }

  /* Tablet and above */
  @media (min-width: 640px) {
    .mode-selection {
      padding: var(--space-6);
    }

    .back-text {
      display: inline;
    }

    .title {
      font-size: var(--font-size-2xl);
    }

    .mode-scroll-container {
      margin: 0;
      padding: 0;
      overflow: visible;
    }

    .mode-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: var(--space-5);
    }

    .mode-card-wrapper {
      flex: none;
      max-width: none;
    }

    .mode-grid.solo {
      grid-template-columns: repeat(2, 1fr);
    }

    .mode-grid.solo .mode-card-wrapper {
      flex: none;
      max-width: none;
    }
  }

  /* Desktop */
  @media (min-width: 1024px) {
    .mode-selection {
      padding: var(--space-8);
    }

    .content {
      max-width: 900px;
      margin: 0 auto;
      width: 100%;
    }

    .mode-grid.multiplayer {
      grid-template-columns: repeat(2, 1fr);
    }

    .mode-grid.solo {
      grid-template-columns: repeat(3, 1fr);
    }
  }

  /* Large desktop */
  @media (min-width: 1280px) {
    .content {
      max-width: 1100px;
    }

    .mode-grid.multiplayer {
      grid-template-columns: repeat(3, 1fr);
    }
  }

</style>
