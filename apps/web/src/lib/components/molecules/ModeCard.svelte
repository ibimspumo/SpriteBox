<!-- ModeCard Molecule - Game mode selection card (Mobile-first redesign) -->
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
  <!-- Pixel border decoration -->
  <div class="pixel-corner top-left"></div>
  <div class="pixel-corner top-right"></div>
  <div class="pixel-corner bottom-left"></div>
  <div class="pixel-corner bottom-right"></div>

  <div class="card-content">
    <!-- Icon & Title Row -->
    <div class="mode-header">
      <span class="mode-icon">{modePixelIcon()}</span>
      <div class="title-group">
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
    </div>

    <!-- Description -->
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

    <!-- Footer: Player count & active indicator -->
    <div class="mode-footer">
      {#if !isSoloMode}
        <span class="player-range">
          <span class="player-icon">👥</span>
          {playerRange()} {$t.modeSelection.players}
        </span>
        <div class="active-players" class:has-active={playerCount > 0}>
          <span class="pulse-dot"></span>
          <span class="count">{playerCount}</span>
          <span class="label">{$t.modeSelection.playersActive}</span>
        </div>
      {:else}
        <div class="solo-badge">
          <span>SOLO</span>
        </div>
      {/if}
    </div>
  </div>

  <!-- Hover glow effect -->
  <div class="glow-effect"></div>
</button>

<style>
  .mode-card {
    position: relative;
    width: 100%;
    min-height: 140px;
    padding: var(--space-4);
    background: linear-gradient(
      135deg,
      var(--color-bg-secondary) 0%,
      var(--color-bg-tertiary) 100%
    );
    border: 3px solid var(--color-bg-elevated);
    border-radius: var(--radius-lg);
    cursor: pointer;
    font-family: var(--font-family);
    color: var(--color-text-primary);
    text-align: left;
    overflow: hidden;
    transition:
      transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1),
      border-color 0.2s ease,
      box-shadow 0.2s ease;
  }

  /* Pixel corner decorations */
  .pixel-corner {
    position: absolute;
    width: 8px;
    height: 8px;
    background: var(--mode-accent);
    opacity: 0.6;
    transition: opacity 0.2s ease, transform 0.2s ease;
  }

  .top-left { top: 6px; left: 6px; }
  .top-right { top: 6px; right: 6px; }
  .bottom-left { bottom: 6px; left: 6px; }
  .bottom-right { bottom: 6px; right: 6px; }

  .mode-card:hover .pixel-corner,
  .mode-card:focus-visible .pixel-corner {
    opacity: 1;
    transform: scale(1.25);
  }

  /* Card content */
  .card-content {
    position: relative;
    z-index: 1;
    display: flex;
    flex-direction: column;
    gap: var(--space-3);
    height: 100%;
  }

  /* Header with icon and title */
  .mode-header {
    display: flex;
    align-items: center;
    gap: var(--space-3);
  }

  .mode-icon {
    font-size: 2rem;
    line-height: 1;
    filter: drop-shadow(0 2px 4px rgba(0,0,0,0.3));
  }

  .title-group {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    flex-wrap: wrap;
  }

  .mode-name {
    margin: 0;
    font-size: var(--font-size-lg);
    font-weight: var(--font-weight-bold);
    color: var(--color-text-primary);
    letter-spacing: 0.02em;
  }

  /* Description */
  .mode-description {
    margin: 0;
    font-size: var(--font-size-xs);
    color: var(--color-text-secondary);
    line-height: var(--line-height-normal);
    flex: 1;
  }

  /* Footer */
  .mode-footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-3);
    margin-top: auto;
    padding-top: var(--space-2);
    border-top: 1px solid var(--color-border);
  }

  .player-range {
    display: flex;
    align-items: center;
    gap: var(--space-1);
    font-size: var(--font-size-xs);
    color: var(--color-text-muted);
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .player-icon {
    font-size: 0.875rem;
  }

  /* Active players indicator */
  .active-players {
    display: flex;
    align-items: center;
    gap: var(--space-1);
    padding: var(--space-1) var(--space-2);
    background: var(--color-bg-primary);
    border-radius: var(--radius-full);
    font-size: var(--font-size-xs);
    color: var(--color-text-muted);
    transition: all 0.2s ease;
  }

  .active-players.has-active {
    background: rgba(74, 222, 128, 0.15);
    color: var(--color-success);
  }

  .pulse-dot {
    width: 6px;
    height: 6px;
    background: var(--color-text-muted);
    border-radius: var(--radius-full);
    transition: background 0.2s ease;
  }

  .active-players.has-active .pulse-dot {
    background: var(--color-success);
    animation: pulse 2s ease-in-out infinite;
  }

  .count {
    font-weight: var(--font-weight-bold);
    min-width: 1ch;
  }

  .label {
    opacity: 0.8;
  }

  /* Solo badge */
  .solo-badge {
    padding: var(--space-1) var(--space-2);
    background: linear-gradient(135deg, var(--mode-accent), color-mix(in srgb, var(--mode-accent) 70%, white));
    border-radius: var(--radius-sm);
    font-size: var(--font-size-xs);
    font-weight: var(--font-weight-bold);
    color: var(--color-bg-primary);
    letter-spacing: 0.1em;
  }

  /* Hover glow effect */
  .glow-effect {
    position: absolute;
    inset: 0;
    background: radial-gradient(
      circle at 50% 50%,
      var(--mode-accent) 0%,
      transparent 70%
    );
    opacity: 0;
    transition: opacity 0.3s ease;
    pointer-events: none;
  }

  /* States */
  .mode-card:hover,
  .mode-card:focus-visible {
    transform: translateY(-4px) scale(1.02);
    border-color: var(--mode-accent);
    box-shadow:
      0 8px 24px rgba(0, 0, 0, 0.3),
      0 0 0 1px var(--mode-accent),
      inset 0 1px 0 rgba(255, 255, 255, 0.1);
  }

  .mode-card:hover .glow-effect,
  .mode-card:focus-visible .glow-effect {
    opacity: 0.08;
  }

  .mode-card:active {
    transform: translateY(-2px) scale(1.01);
    transition-duration: 0.1s;
  }

  .mode-card.selected {
    border-color: var(--color-success);
    box-shadow:
      0 4px 16px rgba(74, 222, 128, 0.2),
      0 0 0 2px var(--color-success),
      inset 0 1px 0 rgba(255, 255, 255, 0.1);
  }

  .mode-card.selected .pixel-corner {
    background: var(--color-success);
    opacity: 1;
  }

  /* Focus visible outline */
  .mode-card:focus-visible {
    outline: 2px solid var(--mode-accent);
    outline-offset: 2px;
  }

  .mode-card:focus:not(:focus-visible) {
    outline: none;
  }

  /* Players active glow for cards with active players */
  .mode-card.has-players::after {
    content: '';
    position: absolute;
    top: -1px;
    right: -1px;
    width: 12px;
    height: 12px;
    background: var(--color-success);
    border-radius: var(--radius-full);
    box-shadow: 0 0 8px var(--color-success);
    animation: pulse 2s ease-in-out infinite;
  }
</style>
