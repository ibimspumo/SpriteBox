<!-- PixelSurvivor/Statistics.svelte - Player statistics display -->
<!-- Simplified: Only character creation stats -->
<script lang="ts">
  import { Button } from '../../atoms';
  import { Modal } from '../../organisms';
  import { t } from '$lib/i18n';
  import { survivorStats } from '$lib/survivor';
  import type { Element, Trait } from '$lib/survivor';

  interface Props {
    show: boolean;
    onclose: () => void;
  }

  let { show, onclose }: Props = $props();

  const stats = $derived($survivorStats);

  // Get translated element name
  function getElementName(element: string): string {
    const elements = $t.pixelSurvivor.elements;
    return elements[element as Element] ?? element;
  }

  // Get translated trait name
  function getTraitName(trait: string): string {
    const traits = $t.pixelSurvivor.traits;
    return traits[trait as Trait] ?? trait;
  }

  function formatTime(ms: number): string {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) {
      return `${hours}h ${minutes % 60}m`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    }
    return `${seconds}s`;
  }
</script>

<Modal {show} {onclose} title={$t.pixelSurvivor.statistics}>
  <div class="stats-grid">
    <!-- Character Stats -->
    <div class="stat-section">
      <h3 class="section-title">{$t.pixelSurvivor.charactersCreated}</h3>
      <div class="stat-row">
        <span class="stat-label">{$t.pixelSurvivor.totalCharacters}</span>
        <span class="stat-value accent">{stats.totalCharactersCreated}</span>
      </div>
      {#if stats.favoriteElement}
        <div class="stat-row">
          <span class="stat-label">{$t.pixelSurvivor.favoriteElement}</span>
          <span class="stat-value">{getElementName(stats.favoriteElement)}</span>
        </div>
      {/if}
      {#if stats.favoriteTrait}
        <div class="stat-row">
          <span class="stat-label">{$t.pixelSurvivor.favoriteTrait}</span>
          <span class="stat-value">{getTraitName(stats.favoriteTrait)}</span>
        </div>
      {/if}
    </div>

    <!-- Time Stats -->
    <div class="stat-section">
      <h3 class="section-title">{$t.pixelSurvivor.time}</h3>
      <div class="stat-row">
        <span class="stat-label">{$t.pixelSurvivor.totalPlayTime}</span>
        <span class="stat-value">{formatTime(stats.totalPlayTime)}</span>
      </div>
    </div>
  </div>

  <div class="modal-actions">
    <Button variant="primary" onclick={onclose}>
      {$t.common.close}
    </Button>
  </div>
</Modal>

<style>
  .stats-grid {
    display: flex;
    flex-direction: column;
    gap: var(--space-3);
    max-height: 60vh;
    overflow-y: auto;
    padding: var(--space-2);
  }

  .stat-section {
    padding: var(--space-3);
    background: var(--color-bg-tertiary);
    border-radius: var(--radius-md);
  }

  .section-title {
    margin: 0 0 var(--space-2);
    font-size: var(--font-size-sm);
    font-weight: var(--font-weight-bold);
    color: var(--color-text-muted);
    text-transform: uppercase;
    letter-spacing: 1px;
  }

  .stat-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: var(--space-1) 0;
  }

  .stat-row:not(:last-child) {
    border-bottom: 1px solid var(--color-bg-elevated);
  }

  .stat-label {
    font-size: var(--font-size-sm);
    color: var(--color-text-secondary);
  }

  .stat-value {
    font-size: var(--font-size-md);
    font-weight: var(--font-weight-bold);
    color: var(--color-text-primary);
  }

  .stat-value.accent {
    color: var(--color-accent);
  }

  .modal-actions {
    display: flex;
    justify-content: center;
    margin-top: var(--space-4);
  }
</style>
