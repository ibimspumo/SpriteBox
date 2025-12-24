<!-- PixelSurvivor/CharacterView.svelte - Read-only character stats display -->
<script lang="ts">
  import { Button, Icon } from '../../atoms';
  import { Modal } from '../../organisms';
  import { PixelCanvas } from '../../utility';
  import { t } from '$lib/i18n';
  import {
    survivorRun,
    currentHp,
    maxHp,
    currentMana,
    maxMana,
    playerAttack,
    playerDefense,
    playerSpeed,
    playerLuck,
    playerLevel,
    currentElement,
    currentTrait,
  } from '$lib/survivor';

  interface Props {
    show: boolean;
    onclose: () => void;
  }

  let { show, onclose }: Props = $props();

  // Character data
  const character = $derived($survivorRun?.character);
  const pixels = $derived(character?.pixels);
  const name = $derived(character?.name ?? 'Unknown');

  // Stats config
  const COMBAT_STATS = [
    { key: 'attack', icon: 'zap', color: 'var(--color-danger)', getValue: () => $playerAttack },
    { key: 'defense', icon: 'shield', color: 'var(--color-info)', getValue: () => $playerDefense },
    { key: 'speed', icon: 'speed-fast', color: 'var(--color-stat-speed)', getValue: () => $playerSpeed },
    { key: 'luck', icon: 'dice', color: 'var(--color-stat-luck)', getValue: () => $playerLuck },
  ] as const;

  // Element color mapping
  function getElementColor(element: string): string {
    const colors: Record<string, string> = {
      fire: 'var(--color-danger)',
      water: 'var(--color-info)',
      earth: 'var(--color-warning)',
      air: 'var(--color-text-secondary)',
      dark: 'var(--color-text-primary)',
      light: 'var(--color-warning)',
      neutral: 'var(--color-text-muted)',
    };
    return colors[element] ?? colors.neutral;
  }
</script>

<Modal {show} {onclose} title={$t.pixelSurvivor.viewCharacter}>
  {#if character}
    <div class="character-view">
      <!-- Character Portrait -->
      <div class="portrait-section">
        <div class="portrait-frame">
          {#if pixels}
            <PixelCanvas pixelData={pixels} size={120} editable={false} />
          {/if}
        </div>
        <div class="character-identity">
          <h2 class="character-name">{name}</h2>
          <div class="character-tags">
            <span class="tag element" style="color: {getElementColor($currentElement)}">
              {$t.pixelSurvivor.elements[$currentElement]}
            </span>
            <span class="tag-separator">·</span>
            <span class="tag trait">
              {$t.pixelSurvivor.traits[$currentTrait]}
            </span>
          </div>
        </div>
      </div>

      <!-- Level -->
      <div class="level-section">
        <span class="level-badge">
          <span class="level-label">LVL</span>
          <span class="level-value">{$playerLevel}</span>
        </span>
      </div>

      <!-- Resources -->
      <div class="stats-section">
        <h3 class="section-title">{$t.pixelSurvivor.resources}</h3>
        <div class="resource-grid">
          <div class="resource-item">
            <Icon name="heart" size="md" />
            <div class="resource-info">
              <span class="resource-label">HP</span>
              <span class="resource-value hp">{$currentHp} / {$maxHp}</span>
            </div>
          </div>
          <div class="resource-item">
            <Icon name="drop" size="md" />
            <div class="resource-info">
              <span class="resource-label">Mana</span>
              <span class="resource-value mana">{$currentMana} / {$maxMana}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Combat Stats -->
      <div class="stats-section">
        <h3 class="section-title">{$t.pixelSurvivor.previewStats}</h3>
        <div class="stats-grid">
          {#each COMBAT_STATS as stat}
            <div class="stat-card">
              <span class="stat-icon" style="color: {stat.color}">
                <Icon name={stat.icon} size="md" />
              </span>
              <div class="stat-info">
                <span class="stat-label">{$t.pixelSurvivor.stats[stat.key]}</span>
                <span class="stat-value">{stat.getValue()}</span>
              </div>
            </div>
          {/each}
        </div>
      </div>
    </div>
  {:else}
    <p class="no-character">{$t.pixelSurvivor.noCharacter}</p>
  {/if}

  <div class="modal-actions">
    <Button variant="primary" onclick={onclose}>
      {$t.common.close}
    </Button>
  </div>
</Modal>

<style>
  .character-view {
    display: flex;
    flex-direction: column;
    gap: var(--space-4);
    padding: var(--space-2);
  }

  /* Portrait Section */
  .portrait-section {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--space-3);
    text-align: center;
  }

  .portrait-frame {
    padding: var(--space-3);
    background: var(--color-bg-tertiary);
    border: 3px solid var(--color-bg-elevated);
    border-radius: var(--radius-md);
  }

  .character-identity {
    display: flex;
    flex-direction: column;
    gap: var(--space-1);
  }

  .character-name {
    margin: 0;
    font-size: var(--font-size-xl);
    font-weight: var(--font-weight-bold);
    color: var(--color-warning);
    text-transform: uppercase;
    letter-spacing: 2px;
  }

  .character-tags {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: var(--space-2);
    font-size: var(--font-size-sm);
  }

  .tag {
    font-weight: var(--font-weight-medium);
    text-transform: uppercase;
  }

  .tag.element {
    font-weight: var(--font-weight-bold);
  }

  .tag.trait {
    color: var(--color-accent);
  }

  .tag-separator {
    color: var(--color-text-muted);
  }

  /* Level Section */
  .level-section {
    display: flex;
    justify-content: center;
  }

  .level-badge {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    padding: var(--space-2) var(--space-4);
    background: var(--color-warning);
    border-radius: var(--radius-sm);
    color: var(--color-bg-primary);
    font-weight: var(--font-weight-bold);
  }

  .level-label {
    font-size: var(--font-size-sm);
    opacity: 0.8;
  }

  .level-value {
    font-size: var(--font-size-lg);
  }

  /* Stats Sections */
  .stats-section {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
  }

  .section-title {
    margin: 0;
    font-size: var(--font-size-xs);
    font-weight: var(--font-weight-bold);
    color: var(--color-text-muted);
    text-transform: uppercase;
    letter-spacing: 1px;
  }

  /* Resources */
  .resource-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: var(--space-3);
  }

  .resource-item {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    padding: var(--space-3);
    background: var(--color-bg-tertiary);
    border-radius: var(--radius-sm);
  }

  .resource-item :global(.icon) {
    flex-shrink: 0;
  }

  .resource-item:first-child :global(.icon) {
    color: var(--color-error);
  }

  .resource-item:last-child :global(.icon) {
    color: var(--color-info);
  }

  .resource-info {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .resource-label {
    font-size: var(--font-size-xs);
    color: var(--color-text-muted);
    text-transform: uppercase;
  }

  .resource-value {
    font-size: var(--font-size-md);
    font-weight: var(--font-weight-bold);
    font-variant-numeric: tabular-nums;
  }

  .resource-value.hp {
    color: var(--color-success);
  }

  .resource-value.mana {
    color: var(--color-info);
  }

  /* Combat Stats Grid */
  .stats-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: var(--space-2);
  }

  .stat-card {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    padding: var(--space-3);
    background: var(--color-bg-tertiary);
    border-radius: var(--radius-sm);
  }

  .stat-icon {
    display: flex;
    flex-shrink: 0;
  }

  .stat-info {
    display: flex;
    flex-direction: column;
    gap: 2px;
    flex: 1;
  }

  .stat-label {
    font-size: var(--font-size-xs);
    color: var(--color-text-secondary);
    text-transform: uppercase;
  }

  .stat-value {
    font-size: var(--font-size-lg);
    font-weight: var(--font-weight-bold);
    color: var(--color-text-primary);
  }

  /* No Character */
  .no-character {
    text-align: center;
    color: var(--color-text-muted);
    padding: var(--space-6);
  }

  /* Actions */
  .modal-actions {
    display: flex;
    justify-content: center;
    margin-top: var(--space-4);
  }

  /* Mobile */
  @media (max-width: 480px) {
    .stats-grid,
    .resource-grid {
      grid-template-columns: 1fr;
    }
  }
</style>
