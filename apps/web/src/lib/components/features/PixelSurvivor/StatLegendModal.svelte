<!-- PixelSurvivor/StatLegendModal.svelte - Detailed guide for character creation -->
<script lang="ts">
  import { Modal } from '../../organisms';
  import { Icon } from '../../atoms';
  import { t } from '$lib/i18n';
  import { STAT_BUDGET_CONFIG, DETECTION_THRESHOLDS } from '$lib/survivor/engine';

  interface Props {
    show: boolean;
    onclose: () => void;
  }

  let { show, onclose }: Props = $props();

  // Tab state
  type Tab = 'stats' | 'elements' | 'traits';
  let activeTab = $state<Tab>('stats');

  // Dynamic thresholds from engine
  const thresholds = DETECTION_THRESHOLDS;
  const budget = STAT_BUDGET_CONFIG;

  // Stat constraints from the engine
  const statRanges = [
    { key: 'maxHp', label: 'HP', color: 'var(--color-success)', ...budget.constraints.maxHp },
    { key: 'attack', label: 'ATK', color: 'var(--color-danger)', ...budget.constraints.attack },
    { key: 'defense', label: 'DEF', color: 'var(--color-info)', ...budget.constraints.defense },
    { key: 'speed', label: 'SPD', color: 'var(--color-stat-speed)', ...budget.constraints.speed },
    { key: 'maxMana', label: 'Mana', color: 'var(--color-stat-mana)', ...budget.constraints.maxMana },
    { key: 'luck', label: 'Luck', color: 'var(--color-stat-luck)', ...budget.constraints.luck },
  ];

  // Color to element mappings (matching COLOR_ELEMENT_AFFINITY)
  const colorMappings: Array<{ hex: string; key: string; element: string; secondary?: string }> = [
    { hex: '#000000', key: 'black', element: 'dark' },
    { hex: '#FFFFFF', key: 'white', element: 'light' },
    { hex: '#FF0000', key: 'red', element: 'fire' },
    { hex: '#00AA00', key: 'green', element: 'earth', secondary: 'air' },
    { hex: '#0000FF', key: 'blue', element: 'water' },
    { hex: '#FFFF00', key: 'yellow', element: 'light', secondary: 'fire' },
    { hex: '#FF00FF', key: 'magenta', element: 'fire', secondary: 'dark' },
    { hex: '#00FFFF', key: 'cyan', element: 'water', secondary: 'air' },
    { hex: '#FF8800', key: 'orange', element: 'fire', secondary: 'earth' },
    { hex: '#8800FF', key: 'purple', element: 'dark', secondary: 'water' },
    { hex: '#88CCFF', key: 'lightBlue', element: 'water', secondary: 'air' },
    { hex: '#88FF88', key: 'lime', element: 'earth', secondary: 'light' },
    { hex: '#FF88CC', key: 'pink', element: 'fire', secondary: 'light' },
    { hex: '#888888', key: 'gray', element: 'neutral' },
    { hex: '#CCCCCC', key: 'lightGray', element: 'air', secondary: 'light' },
    { hex: '#884400', key: 'brown', element: 'earth' },
  ];

  // Trait definitions with dynamic thresholds from engine
  $effect(() => {
    // Reactive to language changes
  });

  function setTab(tab: Tab) {
    activeTab = tab;
  }

  function getElementName(element: string): string {
    return $t.pixelSurvivor.elements[element as keyof typeof $t.pixelSurvivor.elements] || element;
  }

  // Get trait definitions with dynamic values
  function getTraitDefs() {
    return [
      {
        trait: 'perfectionist',
        criteria: $t.pixelSurvivor.legend.traitCriteria.symmetryMin,
        value: `${Math.round(thresholds.perfectionist.symmetryMin * 100)}%`,
        color: 'var(--color-success)',
      },
      {
        trait: 'chaotic',
        criteria: $t.pixelSurvivor.legend.traitCriteria.symmetryMax,
        value: `${Math.round(thresholds.chaotic.symmetryMax * 100)}%`,
        color: 'var(--color-danger)',
      },
      {
        trait: 'bulky',
        criteria: $t.pixelSurvivor.legend.traitCriteria.pixelsMin,
        value: `${thresholds.bulky.pixelsMin}`,
        color: 'var(--color-info)',
      },
      {
        trait: 'minimalist',
        criteria: $t.pixelSurvivor.legend.traitCriteria.pixelsMax,
        value: `${thresholds.minimalist.pixelsMax}`,
        color: 'var(--color-stat-speed)',
      },
      {
        trait: 'creative',
        criteria: $t.pixelSurvivor.legend.traitCriteria.colorsMin,
        value: `${thresholds.creative.colorsMin}`,
        color: 'var(--color-accent)',
      },
      {
        trait: 'focused',
        criteria: $t.pixelSurvivor.legend.traitCriteria.colorsExact,
        value: '',
        color: 'var(--color-stat-luck)',
      },
      {
        trait: 'intellectual',
        criteria: $t.pixelSurvivor.legend.traitCriteria.headRatio,
        value: `${Math.round(thresholds.intellectual.headRatioMin * 100)}%`,
        color: 'var(--color-info)',
      },
      {
        trait: 'grounded',
        criteria: $t.pixelSurvivor.legend.traitCriteria.legRatio,
        value: `${Math.round(thresholds.grounded.legRatioMin * 100)}%`,
        color: 'var(--color-success)',
      },
      {
        trait: 'balanced',
        criteria: $t.pixelSurvivor.legend.traitCriteria.noTrait,
        value: '',
        color: 'var(--color-text-muted)',
      },
    ];
  }

  let traitDefs = $derived(getTraitDefs());
</script>

<Modal {show} {onclose} title={$t.pixelSurvivor.legend.title} maxWidth="600px">
  <!-- Tabs -->
  <div class="tabs">
    <button
      class="tab"
      class:active={activeTab === 'stats'}
      onclick={() => setTab('stats')}
    >
      <Icon name="chart-bar" size="sm" />
      {$t.pixelSurvivor.legend.statCriteria.title}
    </button>
    <button
      class="tab"
      class:active={activeTab === 'elements'}
      onclick={() => setTab('elements')}
    >
      <Icon name="moon-stars" size="sm" />
      {$t.pixelSurvivor.legend.elementCriteria.title}
    </button>
    <button
      class="tab"
      class:active={activeTab === 'traits'}
      onclick={() => setTab('traits')}
    >
      <Icon name="label" size="sm" />
      {$t.pixelSurvivor.legend.traitCriteria.title}
    </button>
  </div>

  <!-- Tab Content -->
  <div class="tab-content">
    {#if activeTab === 'stats'}
      <!-- Stats Tab -->
      <div class="section">
        <h4>{$t.pixelSurvivor.legend.howStatsWork}</h4>
        <div class="budget-info">
          <div class="budget-row">
            <span class="budget-label">{$t.pixelSurvivor.legend.totalBudget}:</span>
            <span class="budget-value">{budget.primaryBudget + budget.secondaryBudget} {$t.pixelSurvivor.legend.points}</span>
          </div>
          <div class="budget-breakdown">
            <span>{$t.pixelSurvivor.legend.primaryStats}: {budget.primaryBudget} {$t.pixelSurvivor.legend.points}</span>
            <span>{$t.pixelSurvivor.legend.secondaryStats}: {budget.secondaryBudget} {$t.pixelSurvivor.legend.points}</span>
          </div>
        </div>
      </div>

      <div class="section">
        <div class="criteria-list">
          <div class="criteria-item">
            <Icon name="heart" size="sm" />
            <span>{$t.pixelSurvivor.legend.statCriteria.hp}</span>
          </div>
          <div class="criteria-item">
            <Icon name="zap" size="sm" />
            <span>{$t.pixelSurvivor.legend.statCriteria.attack}</span>
          </div>
          <div class="criteria-item">
            <Icon name="shield" size="sm" />
            <span>{$t.pixelSurvivor.legend.statCriteria.defense}</span>
          </div>
          <div class="criteria-item">
            <Icon name="speed-fast" size="sm" />
            <span>{$t.pixelSurvivor.legend.statCriteria.speed}</span>
          </div>
          <div class="criteria-item">
            <Icon name="drop" size="sm" />
            <span>{$t.pixelSurvivor.legend.statCriteria.mana}</span>
          </div>
          <div class="criteria-item">
            <Icon name="dice" size="sm" />
            <span>{$t.pixelSurvivor.legend.statCriteria.luck}</span>
          </div>
        </div>
      </div>

      <div class="section">
        <h4>{$t.pixelSurvivor.legend.ranges.title}</h4>
        <div class="range-table">
          {#each statRanges as stat}
            <div class="range-row">
              <span class="range-stat" style="color: {stat.color}">
                {stat.label}
              </span>
              <div class="range-bar">
                <div
                  class="range-fill"
                  style="left: {(stat.min / 150) * 100}%; width: {((stat.max - stat.min) / 150) * 100}%; background: {stat.color};"
                ></div>
              </div>
              <span class="range-values">{stat.min} - {stat.max}</span>
            </div>
          {/each}
        </div>
      </div>

    {:else if activeTab === 'elements'}
      <!-- Elements Tab -->
      <div class="section">
        <h4>{$t.pixelSurvivor.legend.elementCriteria.colorInfluence}</h4>
        <div class="color-grid">
          {#each colorMappings as mapping}
            <div class="color-item">
              <span
                class="color-swatch"
                style="background: {mapping.hex}; {mapping.key === 'white' ? 'border: 1px solid var(--color-bg-tertiary);' : ''}"
              ></span>
              <span class="color-name">{$t.pixelSurvivor.legend.colors[mapping.key as keyof typeof $t.pixelSurvivor.legend.colors]}</span>
              <span class="color-arrow">→</span>
              <span class="color-element">
                {getElementName(mapping.element)}
                {#if mapping.secondary}
                  <span class="secondary">/ {getElementName(mapping.secondary)}</span>
                {/if}
              </span>
            </div>
          {/each}
        </div>
      </div>

      <div class="section">
        <h4>{$t.pixelSurvivor.legend.elementCriteria.modifiers.title}</h4>
        <div class="modifier-list">
          <div class="modifier-item air">
            {$t.pixelSurvivor.legend.elementCriteria.modifiers.lowDensity}
          </div>
          <div class="modifier-item earth">
            {$t.pixelSurvivor.legend.elementCriteria.modifiers.highDensity}
          </div>
          <div class="modifier-item light">
            {$t.pixelSurvivor.legend.elementCriteria.modifiers.brightColors}
          </div>
          <div class="modifier-item dark">
            {$t.pixelSurvivor.legend.elementCriteria.modifiers.darkColors}
          </div>
          <div class="modifier-item neutral">
            {$t.pixelSurvivor.legend.elementCriteria.modifiers.highDiversity}
          </div>
        </div>
      </div>

    {:else if activeTab === 'traits'}
      <!-- Traits Tab -->
      <div class="section">
        <div class="trait-list">
          {#each traitDefs as def}
            <div class="trait-item" style="border-color: {def.color}">
              <span class="trait-name" style="color: {def.color}">
                {$t.pixelSurvivor.traits[def.trait as keyof typeof $t.pixelSurvivor.traits]}
              </span>
              <span class="trait-criteria">
                {def.criteria} {def.value}
              </span>
            </div>
          {/each}
        </div>
      </div>
    {/if}
  </div>
</Modal>

<style>
  .tabs {
    display: flex;
    gap: var(--space-1);
    background: var(--color-bg-tertiary);
    padding: var(--space-1);
    border-radius: var(--radius-sm);
  }

  .tab {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: var(--space-1);
    padding: var(--space-2) var(--space-3);
    background: transparent;
    border: none;
    border-radius: var(--radius-sm);
    color: var(--color-text-muted);
    font-size: var(--font-size-xs);
    font-weight: var(--font-weight-medium);
    cursor: pointer;
    transition: all var(--transition-fast);
  }

  .tab:hover {
    color: var(--color-text-secondary);
    background: var(--color-bg-elevated);
  }

  .tab.active {
    background: var(--color-bg-primary);
    color: var(--color-accent);
  }

  .tab-content {
    max-height: 400px;
    overflow-y: auto;
    padding-right: var(--space-2);
  }

  .section {
    margin-bottom: var(--space-4);
  }

  .section:last-child {
    margin-bottom: 0;
  }

  .section h4 {
    margin: 0 0 var(--space-2);
    font-size: var(--font-size-sm);
    color: var(--color-text-secondary);
    text-transform: uppercase;
    letter-spacing: 1px;
  }

  /* Budget Info */
  .budget-info {
    background: var(--color-bg-tertiary);
    padding: var(--space-3);
    border-radius: var(--radius-sm);
  }

  .budget-row {
    display: flex;
    justify-content: space-between;
    margin-bottom: var(--space-2);
  }

  .budget-label {
    color: var(--color-text-muted);
  }

  .budget-value {
    font-weight: var(--font-weight-bold);
    color: var(--color-accent);
  }

  .budget-breakdown {
    display: flex;
    flex-direction: column;
    gap: var(--space-1);
    font-size: var(--font-size-xs);
    color: var(--color-text-muted);
  }

  /* Criteria List */
  .criteria-list {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
  }

  .criteria-item {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    padding: var(--space-2);
    background: var(--color-bg-tertiary);
    border-radius: var(--radius-sm);
    font-size: var(--font-size-sm);
    color: var(--color-text-secondary);
  }

  /* Range Table */
  .range-table {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
  }

  .range-row {
    display: grid;
    grid-template-columns: 50px 1fr 70px;
    align-items: center;
    gap: var(--space-2);
  }

  .range-stat {
    font-weight: var(--font-weight-bold);
    font-size: var(--font-size-xs);
  }

  .range-bar {
    position: relative;
    height: 8px;
    background: var(--color-bg-tertiary);
    border-radius: var(--radius-sm);
  }

  .range-fill {
    position: absolute;
    height: 100%;
    border-radius: var(--radius-sm);
    opacity: 0.8;
  }

  .range-values {
    font-size: var(--font-size-xs);
    color: var(--color-text-muted);
    text-align: right;
  }

  /* Color Grid */
  .color-grid {
    display: flex;
    flex-direction: column;
    gap: var(--space-1);
  }

  .color-item {
    display: grid;
    grid-template-columns: 20px 80px 20px 1fr;
    align-items: center;
    gap: var(--space-2);
    padding: var(--space-1) var(--space-2);
    background: var(--color-bg-tertiary);
    border-radius: var(--radius-sm);
    font-size: var(--font-size-xs);
  }

  .color-swatch {
    width: 16px;
    height: 16px;
    border-radius: 2px;
  }

  .color-name {
    color: var(--color-text-secondary);
  }

  .color-arrow {
    color: var(--color-text-muted);
    text-align: center;
  }

  .color-element {
    color: var(--color-accent);
    font-weight: var(--font-weight-medium);
  }

  .color-element .secondary {
    color: var(--color-text-muted);
    font-weight: normal;
  }

  /* Modifier List */
  .modifier-list {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
  }

  .modifier-item {
    padding: var(--space-2);
    border-radius: var(--radius-sm);
    font-size: var(--font-size-sm);
    border-left: 3px solid;
  }

  .modifier-item.air {
    background: rgba(224, 231, 255, 0.1);
    border-color: var(--color-text-secondary);
    color: var(--color-text-secondary);
  }

  .modifier-item.earth {
    background: rgba(251, 191, 36, 0.1);
    border-color: var(--color-warning);
    color: var(--color-warning);
  }

  .modifier-item.light {
    background: rgba(250, 204, 21, 0.1);
    border-color: var(--color-warning);
    color: var(--color-warning);
  }

  .modifier-item.dark {
    background: rgba(139, 92, 246, 0.1);
    border-color: var(--color-stat-dark);
    color: var(--color-stat-luck);
  }

  .modifier-item.neutral {
    background: rgba(156, 163, 175, 0.1);
    border-color: var(--color-text-muted);
    color: var(--color-text-muted);
  }

  /* Trait List */
  .trait-list {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
  }

  .trait-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: var(--space-2) var(--space-3);
    background: var(--color-bg-tertiary);
    border-radius: var(--radius-sm);
    border-left: 3px solid;
  }

  .trait-name {
    font-weight: var(--font-weight-bold);
    font-size: var(--font-size-sm);
  }

  .trait-criteria {
    font-size: var(--font-size-xs);
    color: var(--color-text-muted);
  }

  /* Scrollbar styling */
  .tab-content::-webkit-scrollbar {
    width: 6px;
  }

  .tab-content::-webkit-scrollbar-track {
    background: var(--color-bg-tertiary);
    border-radius: var(--radius-sm);
  }

  .tab-content::-webkit-scrollbar-thumb {
    background: var(--color-bg-elevated);
    border-radius: var(--radius-sm);
  }

  /* Mobile */
  @media (max-width: 480px) {
    .tab {
      font-size: var(--font-size-2xs);
      padding: var(--space-2);
    }

    .color-item {
      grid-template-columns: 16px 60px 16px 1fr;
    }

    .trait-item {
      flex-direction: column;
      align-items: flex-start;
      gap: var(--space-1);
    }
  }
</style>
