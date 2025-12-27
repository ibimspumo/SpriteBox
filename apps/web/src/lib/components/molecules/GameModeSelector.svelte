<!-- GameModeSelector - Dropdown/tabs for selecting game mode -->
<script lang="ts">
  import { availableGameModes, selectedGameMode, type GameModeInfo } from '$lib/stores';
  import { t } from '$lib/i18n';
  import { getModeMetadata } from '$lib/modeMetadata';

  function getDisplayName(mode: GameModeInfo): string {
    // Use central metadata system for mode names
    const metadata = getModeMetadata(mode.id);
    if (metadata) {
      const key = metadata.selectionKey;
      return $t.modeSelection[key]?.name ?? mode.displayName;
    }
    return mode.displayName;
  }

  function selectMode(modeId: string): void {
    selectedGameMode.set(modeId);
  }

  function handleKeyDown(e: KeyboardEvent, modeId: string): void {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      selectMode(modeId);
    }
  }
</script>

{#if $availableGameModes.length > 1}
  <div class="mode-selector" role="tablist" aria-label={$t.gameModes.selectMode}>
    {#each $availableGameModes as mode (mode.id)}
      <button
        type="button"
        role="tab"
        class="mode-tab"
        class:active={$selectedGameMode === mode.id}
        aria-selected={$selectedGameMode === mode.id}
        onclick={() => selectMode(mode.id)}
        onkeydown={(e) => handleKeyDown(e, mode.id)}
      >
        <span class="mode-name">{getDisplayName(mode)}</span>
        <span class="mode-players">
          {mode.players.min === mode.players.max
            ? `${mode.players.min}v${mode.players.min}`
            : `${mode.players.min}-${mode.players.max}`}
        </span>
      </button>
    {/each}
  </div>
{/if}

<style>
  .mode-selector {
    display: flex;
    gap: var(--space-2);
    padding: var(--space-2);
    background: var(--color-bg-tertiary);
    border-radius: var(--radius-sm);
  }

  .mode-tab {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--space-1);
    padding: var(--space-3) var(--space-2);
    background: transparent;
    border: 2px solid transparent;
    border-radius: var(--radius-sm);
    cursor: pointer;
    transition: all 0.15s ease;
    color: var(--color-text-secondary);
  }

  .mode-tab:hover {
    background: var(--color-bg-secondary);
    color: var(--color-text-primary);
  }

  .mode-tab:focus-visible {
    outline: 2px solid var(--color-accent);
    outline-offset: 2px;
  }

  .mode-tab.active {
    background: var(--color-accent);
    border-color: var(--color-accent);
    color: var(--color-bg-primary);
  }

  .mode-name {
    font-size: var(--font-size-sm);
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 1px;
  }

  .mode-players {
    font-size: var(--font-size-xs);
    opacity: 0.8;
  }

  .mode-tab.active .mode-players {
    opacity: 1;
  }
</style>
