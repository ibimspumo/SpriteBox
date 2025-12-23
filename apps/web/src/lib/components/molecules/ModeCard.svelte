<!-- ModeCard Molecule - Game mode selection card -->
<script lang="ts">
  import { Card } from '$lib/components/organisms';
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

  // Get mode icon based on mode id
  const modeIcon = $derived(() => {
    switch (mode.id) {
      case 'pixel-battle':
        return '';
      case 'copy-cat':
        return '';
      default:
        return '';
    }
  });
</script>

<Card
  padding="lg"
  hoverable
  clickable
  {selected}
  {onclick}
>
  <div class="mode-card">
    <div class="mode-icon">{modeIcon()}</div>

    <div class="mode-header">
      <h3 class="mode-name">
        {#if mode.i18nKey === 'gameModes.pixelBattle'}
          {$t.modeSelection.classic.name}
        {:else if mode.i18nKey === 'gameModes.copyCat'}
          {$t.modeSelection.copycat.name}
        {:else}
          {mode.displayName}
        {/if}
      </h3>
      <Badge
        variant={playerCount > 0 ? 'success' : 'default'}
        size="sm"
        text="{playerCount} {$t.modeSelection.playersActive}"
      />
    </div>

    <p class="mode-description">
      {#if mode.i18nKey === 'gameModes.pixelBattle'}
        {$t.modeSelection.classic.description}
      {:else if mode.i18nKey === 'gameModes.copyCat'}
        {$t.modeSelection.copycat.description}
      {:else}
        {mode.displayName}
      {/if}
    </p>

    <div class="mode-footer">
      <span class="player-range">{playerRange()} {$t.modeSelection.players}</span>
    </div>

    {#if playerCount > 0}
      <div class="online-indicator"></div>
    {/if}
  </div>
</Card>

<style>
  .mode-card {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--space-3);
    text-align: center;
    width: 100%;
    min-width: 200px;
    position: relative;
  }

  .mode-icon {
    font-size: var(--font-size-4xl);
    line-height: 1;
  }

  .mode-header {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--space-2);
  }

  .mode-name {
    font-size: var(--font-size-xl);
    font-weight: var(--font-weight-bold);
    color: var(--color-text-primary);
    margin: 0;
  }

  .mode-description {
    font-size: var(--font-size-sm);
    color: var(--color-text-secondary);
    margin: 0;
    max-width: 200px;
  }

  .mode-footer {
    margin-top: var(--space-2);
  }

  .player-range {
    font-size: var(--font-size-xs);
    color: var(--color-text-muted);
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .online-indicator {
    position: absolute;
    top: var(--space-2);
    right: var(--space-2);
    width: 8px;
    height: 8px;
    background: var(--color-success);
    border-radius: var(--radius-full);
    animation: pulse 2s ease-in-out infinite;
  }
</style>
