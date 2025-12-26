<!-- ModeCard Molecule - Game mode selection card (Native mobile-first) -->
<script lang="ts">
  import { Badge } from '$lib/components/atoms';
  import { t } from '$lib/i18n';
  import type { GameModeInfo } from '$lib/stores';

  interface Props {
    mode: GameModeInfo;
    playerCount: number;
    selected?: boolean;
    onclick?: () => void;
  }

  let {
    mode,
    playerCount,
    selected = false,
    onclick
  }: Props = $props();

  // Get player range display
  const playerRange = $derived(() => {
    const { min, max } = mode.players;
    if (min === max) {
      return min === 2 ? '1v1' : `${min}`;
    }
    return `${min}-${max}`;
  });

  // Get mode-specific pixel art icon (8-bit style emoji alternatives)
  const modePixelIcon = $derived(() => {
    switch (mode.id) {
      case 'pixel-battle':
        return '⚔️';
      case 'copy-cat':
        return '🎭';
      case 'pixel-guesser':
        return '🔮';
      case 'pixel-survivor':
        return '💀';
      case 'copycat-solo':
        return '🎯';
      case 'colordle':
        return '🎨';
      default:
        return '🎮';
    }
  });

  // Get mode accent color
  const modeAccentColor = $derived(() => {
    switch (mode.id) {
      case 'pixel-battle':
        return 'var(--color-success)';
      case 'copy-cat':
        return 'var(--color-brand)';
      case 'pixel-guesser':
        return 'var(--color-info)';
      case 'pixel-survivor':
        return 'var(--color-danger)';
      case 'copycat-solo':
        return 'var(--color-stat-mana)';
      case 'colordle':
        return 'var(--color-accent)';
      default:
        return 'var(--color-accent)';
    }
  });

  // Check if mode is solo
  const isSoloMode = $derived(mode.players.max === 1);
</script>

<button
  class="mode-card"
  class:selected
  class:has-players={playerCount > 0}
  class:solo={isSoloMode}
  style="--mode-accent: {modeAccentColor()}"
  {onclick}
  aria-label={$t.gameModes.selectMode}
>
  <!-- Left accent bar -->
  <div class="accent-bar"></div>

  <!-- Icon container -->
  <div class="icon-container">
    <span class="mode-icon">{modePixelIcon()}</span>
  </div>

  <!-- Main content -->
  <div class="card-content">
    <div class="content-top">
      <div class="title-row">
        <h3 class="mode-name">
          {#if mode.i18nKey === 'gameModes.pixelBattle'}
            {$t.modeSelection.classic.name}
          {:else if mode.i18nKey === 'gameModes.copyCat'}
            {$t.modeSelection.copycat.name}
          {:else if mode.i18nKey === 'gameModes.pixelGuesser'}
            {$t.modeSelection.pixelguesser.name}
          {:else if mode.i18nKey === 'gameModes.pixelSurvivor'}
            {$t.modeSelection.survivor.name}
          {:else if mode.i18nKey === 'gameModes.copyCatSolo'}
            {$t.modeSelection.copycatsolo.name}
          {:else if mode.i18nKey === 'gameModes.colordle'}
            {$t.modeSelection.colordle.name}
          {:else}
            {mode.displayName}
          {/if}
        </h3>
        {#if mode.i18nKey === 'gameModes.pixelSurvivor'}
          <Badge variant="warning" size="sm" text={$t.common.alpha} />
        {/if}
      </div>
      <p class="mode-description">
        {#if mode.i18nKey === 'gameModes.pixelBattle'}
          {$t.modeSelection.classic.description}
        {:else if mode.i18nKey === 'gameModes.copyCat'}
          {$t.modeSelection.copycat.description}
        {:else if mode.i18nKey === 'gameModes.pixelGuesser'}
          {$t.modeSelection.pixelguesser.description}
        {:else if mode.i18nKey === 'gameModes.pixelSurvivor'}
          {$t.modeSelection.survivor.description}
        {:else if mode.i18nKey === 'gameModes.copyCatSolo'}
          {$t.modeSelection.copycatsolo.description}
        {:else if mode.i18nKey === 'gameModes.colordle'}
          {$t.modeSelection.colordle.description}
        {:else}
          {mode.displayName}
        {/if}
      </p>
    </div>

    <!-- Meta info -->
    <div class="meta-row">
      {#if !isSoloMode}
        <span class="player-info">
          <span class="player-icon">👥</span>
          <span class="player-text">{playerRange()}</span>
        </span>
        {#if playerCount > 0}
          <span class="active-badge">
            <span class="pulse-dot"></span>
            <span>{playerCount} {$t.modeSelection.online}</span>
          </span>
        {/if}
      {:else}
        <span class="solo-tag">{$t.modeSelection.soloTag}</span>
      {/if}
    </div>
  </div>

  <!-- Arrow indicator -->
  <div class="arrow-indicator">
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
      <path d="M9 18l6-6-6-6"/>
    </svg>
  </div>
</button>

<style>
  .mode-card {
    position: relative;
    display: flex;
    align-items: stretch;
    width: 100%;
    min-height: 88px;
    padding: 0;
    background: var(--color-bg-secondary);
    border: 2px solid var(--color-bg-elevated);
    border-radius: var(--radius-md);
    cursor: pointer;
    font-family: var(--font-family);
    color: var(--color-text-primary);
    text-align: left;
    overflow: hidden;
    transition:
      border-color 0.15s ease,
      background-color 0.15s ease,
      transform 0.15s ease;
  }

  /* Left accent bar */
  .accent-bar {
    width: 4px;
    min-height: 100%;
    background: var(--mode-accent);
    flex-shrink: 0;
  }

  /* Icon container */
  .icon-container {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 56px;
    flex-shrink: 0;
    background: linear-gradient(
      135deg,
      rgba(255, 255, 255, 0.03) 0%,
      transparent 100%
    );
  }

  .mode-icon {
    font-size: 1.5rem;
    line-height: 1;
  }

  /* Card content */
  .card-content {
    flex: 1;
    display: flex;
    flex-direction: column;
    justify-content: center;
    gap: var(--space-1);
    padding: var(--space-3) var(--space-2) var(--space-3) 0;
    min-width: 0;
  }

  .content-top {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .title-row {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    flex-wrap: wrap;
  }

  .mode-name {
    margin: 0;
    font-size: var(--font-size-sm);
    font-weight: var(--font-weight-bold);
    color: var(--color-text-primary);
    letter-spacing: 0.01em;
  }

  .mode-description {
    margin: 0;
    font-size: 10px;
    color: var(--color-text-muted);
    line-height: 1.4;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }

  /* Meta row */
  .meta-row {
    display: flex;
    align-items: center;
    gap: var(--space-3);
    margin-top: var(--space-1);
  }

  .player-info {
    display: flex;
    align-items: center;
    gap: 4px;
    font-size: 10px;
    color: var(--color-text-muted);
  }

  .player-icon {
    font-size: 11px;
  }

  .player-text {
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .active-badge {
    display: flex;
    align-items: center;
    gap: 4px;
    padding: 2px 6px;
    background: rgba(74, 222, 128, 0.15);
    border-radius: var(--radius-sm);
    font-size: 9px;
    color: var(--color-success);
    font-weight: var(--font-weight-bold);
  }

  .pulse-dot {
    width: 5px;
    height: 5px;
    background: var(--color-success);
    border-radius: var(--radius-full);
    animation: pulse 2s ease-in-out infinite;
  }

  .solo-tag {
    padding: 2px 6px;
    background: linear-gradient(135deg, var(--mode-accent), color-mix(in srgb, var(--mode-accent) 70%, white));
    border-radius: var(--radius-sm);
    font-size: 9px;
    font-weight: var(--font-weight-bold);
    color: var(--color-bg-primary);
    letter-spacing: 0.08em;
  }

  /* Arrow indicator */
  .arrow-indicator {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    flex-shrink: 0;
    color: var(--color-text-muted);
    transition: color 0.15s ease, transform 0.15s ease;
  }

  .arrow-indicator svg {
    width: 16px;
    height: 16px;
  }

  /* Hover/Active states */
  .mode-card:hover,
  .mode-card:focus-visible {
    border-color: var(--mode-accent);
    background: var(--color-bg-tertiary);
  }

  .mode-card:hover .arrow-indicator,
  .mode-card:focus-visible .arrow-indicator {
    color: var(--mode-accent);
    transform: translateX(2px);
  }

  .mode-card:active {
    transform: scale(0.99);
    transition-duration: 0.05s;
  }

  .mode-card.selected {
    border-color: var(--color-success);
    background: var(--color-bg-tertiary);
  }

  .mode-card.selected .accent-bar {
    background: var(--color-success);
  }

  /* Focus visible outline */
  .mode-card:focus-visible {
    outline: 2px solid var(--mode-accent);
    outline-offset: 2px;
  }

  .mode-card:focus:not(:focus-visible) {
    outline: none;
  }

  /* Players active indicator dot */
  .mode-card.has-players::before {
    content: '';
    position: absolute;
    top: 8px;
    right: 8px;
    width: 8px;
    height: 8px;
    background: var(--color-success);
    border-radius: var(--radius-full);
    box-shadow: 0 0 6px var(--color-success);
    animation: pulse 2s ease-in-out infinite;
  }

  /* Tablet and above - larger cards */
  @media (min-width: 640px) {
    .mode-card {
      min-height: 120px;
      border-radius: var(--radius-lg);
    }

    .accent-bar {
      width: 5px;
    }

    .icon-container {
      width: 72px;
    }

    .mode-icon {
      font-size: 2rem;
    }

    .card-content {
      padding: var(--space-4) var(--space-3) var(--space-4) 0;
      gap: var(--space-2);
    }

    .mode-name {
      font-size: var(--font-size-md);
    }

    .mode-description {
      font-size: var(--font-size-xs);
      -webkit-line-clamp: 2;
      line-clamp: 2;
    }

    .meta-row {
      gap: var(--space-4);
    }

    .player-info {
      font-size: var(--font-size-xs);
    }

    .active-badge {
      font-size: 10px;
      padding: 3px 8px;
    }

    .solo-tag {
      font-size: 10px;
      padding: 3px 8px;
    }

    .arrow-indicator {
      width: 40px;
    }

    .arrow-indicator svg {
      width: 20px;
      height: 20px;
    }
  }

  /* Desktop - expanded cards with more room */
  @media (min-width: 1024px) {
    .mode-card {
      min-height: 140px;
    }

    .icon-container {
      width: 80px;
    }

    .mode-icon {
      font-size: 2.25rem;
    }

    .mode-name {
      font-size: var(--font-size-lg);
    }

    .mode-description {
      -webkit-line-clamp: 3;
      line-clamp: 3;
    }

    .mode-card:hover {
      transform: translateY(-2px);
    }

    .mode-card:active {
      transform: translateY(-1px) scale(0.995);
    }
  }
</style>
