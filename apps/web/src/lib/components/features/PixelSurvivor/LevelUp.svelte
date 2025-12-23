<!-- PixelSurvivor/LevelUp.svelte - Upgrade selection screen -->
<script lang="ts">
  import { Button } from '../../atoms';
  import { t, currentLanguage } from '$lib/i18n';
  import {
    survivorRun,
    getLevelUpChoices,
    selectUpgrade,
    getLocalizedText,
    type UpgradeData,
  } from '$lib/survivor';

  let mounted = $state(false);
  let upgrades = $state<UpgradeData[]>([]);
  let loading = $state(true);
  let selectedId = $state<string | null>(null);

  // Get current run data
  const run = $derived($survivorRun);

  // Load upgrade choices
  $effect(() => {
    loadUpgradeChoices();
  });

  async function loadUpgradeChoices(): Promise<void> {
    loading = true;
    upgrades = await getLevelUpChoices();
    loading = false;
  }

  $effect(() => {
    setTimeout(() => {
      mounted = true;
    }, 100);
  });

  function handleSelect(upgradeId: string): void {
    selectedId = upgradeId;
  }

  function handleConfirm(): void {
    if (selectedId) {
      selectUpgrade(selectedId);
    }
  }

  function getRarityClass(rarity: string): string {
    return `rarity-${rarity}`;
  }

  function getRarityLabel(rarity: string): string {
    return $t.pixelSurvivor.rarities[rarity as keyof typeof $t.pixelSurvivor.rarities] ?? rarity;
  }

  function getUpgradeStacks(upgradeId: string): number {
    if (!run) return 0;
    return run.upgrades.filter((id) => id === upgradeId).length;
  }
</script>

<div class="levelup-screen" class:mounted>
  <!-- Header -->
  <div class="levelup-header">
    <div class="level-badge">
      {$t.pixelSurvivor.level} {run?.level ?? 1}
    </div>
    <h1 class="levelup-title">{$t.pixelSurvivor.levelUp}</h1>
    <p class="levelup-subtitle">{$t.pixelSurvivor.chooseUpgrade}</p>
  </div>

  {#if loading}
    <div class="loading">
      <div class="loading-spinner"></div>
    </div>
  {:else}
    <!-- Upgrade Cards -->
    <div class="upgrades-container">
      {#each upgrades as upgrade}
        {@const stacks = getUpgradeStacks(upgrade.id)}
        <button
          class="upgrade-card {getRarityClass(upgrade.rarity)}"
          class:selected={selectedId === upgrade.id}
          onclick={() => handleSelect(upgrade.id)}
        >
          <div class="upgrade-rarity">{getRarityLabel(upgrade.rarity)}</div>
          <h3 class="upgrade-name">
            {getLocalizedText(upgrade.name, upgrade.nameDE, $currentLanguage)}
          </h3>
          <p class="upgrade-description">
            {getLocalizedText(upgrade.description, upgrade.descriptionDE, $currentLanguage)}
          </p>
          {#if stacks > 0}
            <div class="upgrade-stacks">
              {stacks}/{upgrade.maxStacks}
            </div>
          {/if}
        </button>
      {/each}
    </div>

    <!-- Confirm Button -->
    <div class="actions">
      <Button
        variant="primary"
        size="lg"
        onclick={handleConfirm}
        disabled={!selectedId}
      >
        {$t.pixelSurvivor.continue}
      </Button>
    </div>
  {/if}
</div>

<style>
  .levelup-screen {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--space-4);
    width: 100%;
    max-width: 500px;
    padding: var(--space-4);
    opacity: 0;
    transform: translateY(20px);
    transition: all 0.4s ease;
  }

  .levelup-screen.mounted {
    opacity: 1;
    transform: translateY(0);
  }

  .levelup-header {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--space-2);
    text-align: center;
  }

  .level-badge {
    padding: var(--space-1) var(--space-3);
    background: var(--color-accent);
    border-radius: var(--radius-full);
    font-size: var(--font-size-sm);
    font-weight: var(--font-weight-bold);
    color: var(--color-bg-primary);
    text-transform: uppercase;
  }

  .levelup-title {
    margin: 0;
    font-size: var(--font-size-2xl);
    font-weight: var(--font-weight-bold);
    color: var(--color-accent);
    text-transform: uppercase;
    letter-spacing: 3px;
    animation: pulse 1.5s ease-in-out infinite;
  }

  .levelup-subtitle {
    margin: 0;
    font-size: var(--font-size-sm);
    color: var(--color-text-secondary);
  }

  .loading {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: var(--space-8);
  }

  .loading-spinner {
    width: var(--space-8);
    height: var(--space-8);
    border: 3px solid var(--color-bg-tertiary);
    border-top-color: var(--color-accent);
    border-radius: 50%;
    animation: spin 1s linear infinite;
  }

  .upgrades-container {
    display: flex;
    flex-direction: column;
    gap: var(--space-3);
    width: 100%;
  }

  .upgrade-card {
    position: relative;
    width: 100%;
    padding: var(--space-4);
    background: var(--color-bg-secondary);
    border: 3px solid var(--color-bg-tertiary);
    border-radius: var(--radius-md);
    text-align: left;
    cursor: pointer;
    transition: all var(--transition-fast);
  }

  .upgrade-card:hover {
    transform: translateX(4px);
    border-color: var(--color-bg-elevated);
  }

  .upgrade-card.selected {
    border-color: var(--color-accent);
    background: var(--color-bg-tertiary);
  }

  /* Rarity colors */
  .upgrade-card.rarity-common .upgrade-rarity {
    color: var(--color-text-muted);
  }

  .upgrade-card.rarity-uncommon .upgrade-rarity {
    color: var(--color-success);
  }

  .upgrade-card.rarity-rare .upgrade-rarity {
    color: var(--color-info);
  }

  .upgrade-card.rarity-legendary .upgrade-rarity {
    color: #d4af37;
  }

  .upgrade-card.rarity-legendary {
    background: linear-gradient(
      135deg,
      var(--color-bg-secondary) 0%,
      rgba(212, 175, 55, 0.1) 100%
    );
  }

  .upgrade-rarity {
    font-size: var(--font-size-xs);
    font-weight: var(--font-weight-bold);
    text-transform: uppercase;
    letter-spacing: 1px;
    margin-bottom: var(--space-1);
  }

  .upgrade-name {
    margin: 0 0 var(--space-2);
    font-size: var(--font-size-lg);
    font-weight: var(--font-weight-bold);
    color: var(--color-text-primary);
  }

  .upgrade-description {
    margin: 0;
    font-size: var(--font-size-sm);
    color: var(--color-text-secondary);
  }

  .upgrade-stacks {
    position: absolute;
    top: var(--space-2);
    right: var(--space-2);
    padding: var(--space-1) var(--space-2);
    background: var(--color-bg-elevated);
    border-radius: var(--radius-sm);
    font-size: var(--font-size-xs);
    font-weight: var(--font-weight-bold);
    color: var(--color-text-muted);
  }

  .actions {
    width: 100%;
    margin-top: var(--space-2);
  }

  @media (max-width: 480px) {
    .levelup-screen {
      padding: var(--space-3);
    }

    .upgrade-card {
      padding: var(--space-3);
    }
  }
</style>
