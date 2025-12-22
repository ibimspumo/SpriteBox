<!-- PlayerList Organism - Pixel Art Style -->
<script lang="ts">
  import { Badge } from '../atoms';

  interface Player {
    fullName: string;
    displayName?: string;
  }

  interface Props {
    players: Player[];
    currentPlayerName?: string | null;
    showCount?: boolean;
    maxHeight?: string;
  }

  let {
    players,
    currentPlayerName = null,
    showCount = true,
    maxHeight
  }: Props = $props();
</script>

<div class="player-list">
  {#if showCount}
    <h3 class="count">{players.length} Player{players.length !== 1 ? 's' : ''}</h3>
  {/if}

  <ul class="list" style={maxHeight ? `max-height: ${maxHeight}; overflow-y: auto;` : undefined}>
    {#each players as player}
      {@const isCurrentPlayer = player.fullName === currentPlayerName}
      <li class="player" class:current={isCurrentPlayer}>
        <span class="name">{player.fullName}</span>
        {#if isCurrentPlayer}
          <Badge variant="accent" text="You" />
        {/if}
      </li>
    {/each}
  </ul>
</div>

<style>
  .player-list {
    display: flex;
    flex-direction: column;
    gap: var(--space-3);
  }

  .count {
    margin: 0;
    font-size: var(--font-size-md);
    color: var(--color-brand);
    font-weight: var(--font-weight-semibold);
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  .list {
    list-style: none;
    padding: 0;
    margin: 0;
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
  }

  .player {
    padding: var(--space-2) var(--space-3);
    background: var(--color-bg-tertiary);
    border: 2px solid var(--color-bg-elevated);
    border-radius: var(--radius-sm);
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-2);
    transition: transform var(--transition-fast), border-color var(--transition-fast), background var(--transition-fast);
  }

  .player:hover {
    transform: translateX(4px);
    border-color: var(--color-accent);
    background: var(--color-bg-elevated);
  }

  .player.current {
    background: var(--color-bg-elevated);
    border-color: var(--color-brand);
    box-shadow: var(--shadow-pixel-sm);
  }

  .player.current:hover {
    border-color: var(--color-brand-light);
  }

  .name {
    font-size: var(--font-size-sm);
    color: var(--color-text-primary);
    font-weight: var(--font-weight-medium);
  }
</style>
