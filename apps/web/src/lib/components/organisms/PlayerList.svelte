<!-- PlayerList Organism -->
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
    <h3 class="count">{players.length} Players</h3>
  {/if}

  <ul class="list" style={maxHeight ? `max-height: ${maxHeight}; overflow-y: auto;` : undefined}>
    {#each players as player}
      {@const isCurrentPlayer = player.fullName === currentPlayerName}
      <li class="player" class:current={isCurrentPlayer}>
        <span class="name">{player.displayName || player.fullName}</span>
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
    color: var(--color-text-primary);
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
    background: var(--color-bg-secondary);
    border-radius: var(--radius-sm);
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-2);
  }

  .player.current {
    background: var(--color-bg-tertiary);
  }

  .name {
    font-size: var(--font-size-sm);
    color: var(--color-text-primary);
  }
</style>
