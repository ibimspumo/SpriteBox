<!-- PixelSurvivor/CharacterCreation.svelte - Draw your character to generate stats -->
<script lang="ts">
  import { Button, Icon } from '../../atoms';
  import { PixelCanvas } from '../../utility';
  import StatLegendModal from './StatLegendModal.svelte';
  import { t } from '$lib/i18n';
  import { PALETTE } from '$lib/palette';
  import { selectedColor } from '$lib/stores';
  import {
    currentDrawing,
    startNewRunFromPixels,
    cancelCharacterCreation,
    previewCharacter,
    generateRandomCharacter,
    generateRandomName,
  } from '$lib/survivor';
  import type { CharacterPreview } from '$lib/survivor';

  // Stat definitions with icons and translation keys
  const STATS = [
    { key: 'maxHp', transKey: 'hp', icon: 'heart', color: '#4ade80', min: 50, max: 150 },
    { key: 'attack', transKey: 'attack', icon: 'zap', color: '#f87171', min: 20, max: 100 },
    { key: 'defense', transKey: 'defense', icon: 'shield', color: '#60a5fa', min: 20, max: 100 },
    { key: 'speed', transKey: 'speed', icon: 'speed-fast', color: '#fbbf24', min: 20, max: 100 },
    { key: 'luck', transKey: 'luck', icon: 'dice', color: '#a78bfa', min: 10, max: 50 },
  ] as const;

  let mounted = $state(false);
  let characterName = $state('');
  let showLegend = $state(false);

  // Preview character stats in real-time using CharacterFactory
  let previewStats = $derived<CharacterPreview | null>(previewCharacter($currentDrawing));

  // Check if character has enough pixels
  let hasEnoughPixels = $derived(previewStats !== null && previewStats.isValid);

  // Check if name is valid (required)
  let hasValidName = $derived(characterName.trim().length > 0);

  // Can start run only if both conditions are met
  let canStartRun = $derived(hasEnoughPixels && hasValidName);

  $effect(() => {
    setTimeout(() => {
      mounted = true;
    }, 100);
  });

  function handlePixelChange(newPixels: string): void {
    currentDrawing.set(newPixels);
  }

  function handleColorSelect(index: number): void {
    selectedColor.set(index);
  }

  function handleClear(): void {
    currentDrawing.set('1'.repeat(64));
  }

  function handleRandomize(): void {
    // Generate anatomically coherent character using template system
    const pixels = generateRandomCharacter();
    currentDrawing.set(pixels);
  }

  async function handleRandomizeName(): Promise<void> {
    const name = await generateRandomName();
    characterName = name;
  }

  function handleStartRun(): void {
    if (!canStartRun) return;

    startNewRunFromPixels($currentDrawing, characterName.trim());
  }

  function handleBack(): void {
    cancelCharacterCreation();
  }

  // Format stat for display with bar
  function getStatPercent(value: number, min: number, max: number): number {
    return ((value - min) / (max - min)) * 100;
  }

  // Get element color
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

<div class="character-creation" class:mounted>
  <div class="header">
    <h1>{$t.pixelSurvivor.createCharacter}</h1>
    <p class="subtitle">{$t.pixelSurvivor.drawYourCharacter}</p>
  </div>

  <div class="content">
    <!-- Left: Canvas and Palette -->
    <div class="drawing-section">
      <div class="canvas-wrapper">
        <PixelCanvas
          pixelData={$currentDrawing}
          editable={true}
          onchange={handlePixelChange}
          size={256}
        />
      </div>

      <!-- Custom Color Palette for Survivor -->
      <div class="palette-container">
        <span class="palette-label">{$t.colorPalette.title}</span>
        <div class="palette">
          {#each PALETTE as color, index}
            <button
              class="color-button"
              class:selected={$selectedColor === index}
              style="--color: {color.hex}"
              onclick={() => handleColorSelect(index)}
              title={color.name}
              aria-label={color.name}
            >
              <span class="color-swatch" style="background-color: {color.hex}"></span>
            </button>
          {/each}
        </div>
      </div>

      <div class="canvas-actions">
        <Button variant="ghost" size="sm" onclick={handleRandomize}>
          {$t.pixelSurvivor.randomize}
        </Button>
        <Button variant="ghost" size="sm" onclick={handleClear}>
          {$t.pixelSurvivor.clear}
        </Button>
      </div>
    </div>

    <!-- Right: Stats Preview -->
    <div class="stats-section">
      <div class="stats-header">
        <h2>{$t.pixelSurvivor.previewStats}</h2>
        <button class="info-button" onclick={() => showLegend = true} aria-label={$t.pixelSurvivor.legend.title}>
          <Icon name="info-box" size="sm" />
        </button>
      </div>

      {#if previewStats}
        <div class="stats-list">
          {#each STATS as stat}
            <div class="stat-bar-container">
              <div class="stat-bar" style="width: {getStatPercent(previewStats.stats[stat.key], stat.min, stat.max)}%; background: {stat.color};">
                <span class="stat-icon-label">
                  <Icon name={stat.icon} size="sm" />
                  <span>{$t.pixelSurvivor.statAbbr[stat.transKey]}</span>
                </span>
                <span class="stat-value">{previewStats.stats[stat.key]}</span>
              </div>
            </div>
          {/each}
        </div>

        <!-- Legend -->
        <div class="stats-legend">
          {#each STATS as stat}
            <div class="legend-item">
              <span class="legend-abbr" style="color: {stat.color}">{$t.pixelSurvivor.statAbbr[stat.transKey]}</span> = {$t.pixelSurvivor[stat.transKey]}
            </div>
          {/each}
        </div>

        <!-- Element and Trait -->
        <div class="special-stats">
          <div class="special-stat">
            <span class="special-label">{$t.pixelSurvivor.element}:</span>
            <span class="special-value" style="color: {getElementColor(previewStats.element)}">
              {$t.pixelSurvivor.elements[previewStats.element]}
            </span>
          </div>
          <div class="special-stat">
            <span class="special-label">{$t.pixelSurvivor.trait}:</span>
            <span class="special-value trait">
              {$t.pixelSurvivor.traits[previewStats.trait]}
            </span>
          </div>
        </div>
      {:else}
        <div class="no-stats">
          <p>{$t.pixelSurvivor.minPixelsHint}</p>
        </div>
      {/if}

      <!-- Name Input -->
      <div class="name-input">
        <label for="character-name">
          {$t.pixelSurvivor.characterName}
          <span class="required">*</span>
        </label>
        <div class="name-input-row">
          <input
            id="character-name"
            type="text"
            bind:value={characterName}
            placeholder={$t.pixelSurvivor.enterName}
            maxlength={30}
            class:invalid={!hasValidName && characterName.length === 0}
            required
          />
          <button
            type="button"
            class="dice-button"
            onclick={handleRandomizeName}
            aria-label={$t.pixelSurvivor.randomizeName}
            title={$t.pixelSurvivor.randomizeName}
          >
            <Icon name="dice" size="sm" />
          </button>
        </div>
      </div>
    </div>
  </div>

  <!-- Actions -->
  <div class="actions">
    <Button variant="ghost" onclick={handleBack}>
      ← {$t.common.cancel}
    </Button>
    <Button
      variant="primary"
      size="lg"
      onclick={handleStartRun}
      disabled={!canStartRun}
    >
      {$t.pixelSurvivor.startRun} →
    </Button>
  </div>
</div>

<!-- Legend Modal -->
<StatLegendModal show={showLegend} onclose={() => showLegend = false} />

<style>
  .character-creation {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--space-6);
    width: 100%;
    max-width: 700px;
    padding: var(--space-4);
    opacity: 0;
    transform: translateY(20px);
    transition: all 0.4s ease;
  }

  .character-creation.mounted {
    opacity: 1;
    transform: translateY(0);
  }

  .header {
    text-align: center;
  }

  .header h1 {
    margin: 0;
    font-size: var(--font-size-xl);
    color: var(--color-danger);
    text-transform: uppercase;
    letter-spacing: 2px;
  }

  .subtitle {
    margin: var(--space-2) 0 0;
    font-size: var(--font-size-sm);
    color: var(--color-text-secondary);
  }

  .content {
    display: flex;
    gap: var(--space-6);
    width: 100%;
  }

  .drawing-section {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--space-4);
  }

  .canvas-wrapper {
    background: var(--color-bg-secondary);
    padding: var(--space-4);
    border: 3px solid var(--color-bg-tertiary);
    border-radius: var(--radius-md);
  }

  .palette-container {
    width: 100%;
    max-width: 280px;
  }

  .palette-label {
    display: block;
    margin-bottom: var(--space-2);
    font-size: var(--font-size-xs);
    font-weight: var(--font-weight-bold);
    color: var(--color-text-muted);
    text-transform: uppercase;
    letter-spacing: 1px;
  }

  .palette {
    display: grid;
    grid-template-columns: repeat(8, 1fr);
    gap: var(--space-1);
    padding: var(--space-2);
    background: var(--color-bg-secondary);
    border: 2px solid var(--color-bg-tertiary);
    border-radius: var(--radius-sm);
  }

  .color-button {
    aspect-ratio: 1;
    padding: 0;
    background: var(--color-bg-tertiary);
    border: 2px solid var(--color-bg-elevated);
    border-radius: 2px;
    cursor: pointer;
    transition: transform var(--transition-fast);
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .color-swatch {
    width: 70%;
    height: 70%;
    border-radius: 1px;
  }

  .color-button:hover {
    transform: scale(1.1);
    z-index: 1;
  }

  .color-button.selected {
    border-color: var(--color-accent);
    transform: scale(1.15);
    z-index: 2;
  }

  .canvas-actions {
    display: flex;
    gap: var(--space-2);
  }

  .stats-section {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: var(--space-4);
    padding: var(--space-4);
    background: var(--color-bg-secondary);
    border: 3px solid var(--color-bg-tertiary);
    border-radius: var(--radius-md);
  }

  .stats-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .stats-section h2 {
    margin: 0;
    font-size: var(--font-size-sm);
    color: var(--color-text-muted);
    text-transform: uppercase;
    letter-spacing: 1px;
  }

  .info-button {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 28px;
    height: 28px;
    padding: 0;
    background: var(--color-bg-tertiary);
    border: 2px solid var(--color-bg-elevated);
    border-radius: 50%;
    color: var(--color-text-muted);
    cursor: pointer;
    transition: all var(--transition-fast);
  }

  .info-button:hover {
    background: var(--color-bg-elevated);
    color: var(--color-accent);
    border-color: var(--color-accent);
  }

  .stats-list {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
  }

  .stat-bar-container {
    height: 28px;
    background: var(--color-bg-tertiary);
    border-radius: var(--radius-sm);
    overflow: hidden;
  }

  .stat-bar {
    height: 100%;
    border-radius: var(--radius-sm);
    transition: width 0.3s ease;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 var(--space-2);
    min-width: 70px;
  }

  .stat-icon-label {
    display: flex;
    align-items: center;
    gap: var(--space-1);
    font-size: var(--font-size-xs);
    font-weight: var(--font-weight-medium);
    color: rgba(255, 255, 255, 0.85);
    text-shadow: 0 1px 2px rgba(0, 0, 0, 0.5);
  }

  .stat-value {
    font-size: var(--font-size-md);
    font-weight: var(--font-weight-bold);
    color: white;
    text-shadow: 0 1px 2px rgba(0, 0, 0, 0.5);
  }

  .stats-legend {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-2) var(--space-3);
    padding: var(--space-2);
    background: var(--color-bg-tertiary);
    border-radius: var(--radius-sm);
    font-size: var(--font-size-xs);
  }

  .legend-item {
    color: var(--color-text-secondary);
  }

  .legend-abbr {
    font-weight: var(--font-weight-bold);
  }

  .special-stats {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
    padding-top: var(--space-3);
    border-top: 2px solid var(--color-bg-tertiary);
  }

  .special-stat {
    display: flex;
    align-items: center;
    gap: var(--space-2);
  }

  .special-label {
    font-size: var(--font-size-sm);
    color: var(--color-text-muted);
  }

  .special-value {
    font-size: var(--font-size-sm);
    font-weight: var(--font-weight-bold);
    text-transform: uppercase;
  }

  .special-value.trait {
    color: var(--color-accent);
  }

  .no-stats {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--color-text-muted);
    font-size: var(--font-size-sm);
    text-align: center;
  }

  .name-input {
    display: flex;
    flex-direction: column;
    gap: var(--space-1);
    padding-top: var(--space-3);
    border-top: 2px solid var(--color-bg-tertiary);
  }

  .name-input label {
    display: flex;
    align-items: center;
    gap: var(--space-1);
    font-size: var(--font-size-xs);
    color: var(--color-text-muted);
    text-transform: uppercase;
    letter-spacing: 1px;
  }

  .name-input .required {
    color: var(--color-danger);
  }

  .name-input-row {
    display: flex;
    gap: var(--space-2);
  }

  .name-input input {
    flex: 1;
    padding: var(--space-2) var(--space-3);
    background: var(--color-bg-tertiary);
    border: 2px solid var(--color-bg-elevated);
    border-radius: var(--radius-sm);
    color: var(--color-text-primary);
    font-family: var(--font-family);
    font-size: var(--font-size-md);
  }

  .name-input input:focus {
    outline: none;
    border-color: var(--color-accent);
  }

  .name-input input.invalid {
    border-color: var(--color-danger);
  }

  .dice-button {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 40px;
    height: 40px;
    padding: 0;
    background: var(--color-bg-tertiary);
    border: 2px solid var(--color-bg-elevated);
    border-radius: var(--radius-sm);
    color: var(--color-text-muted);
    cursor: pointer;
    transition: all var(--transition-fast);
  }

  .dice-button:hover {
    background: var(--color-bg-elevated);
    color: var(--color-accent);
    border-color: var(--color-accent);
    transform: rotate(15deg);
  }

  .dice-button:active {
    transform: rotate(360deg);
    transition: transform 0.3s ease;
  }

  .actions {
    display: flex;
    justify-content: space-between;
    align-items: center;
    width: 100%;
    gap: var(--space-4);
  }

  /* Mobile layout */
  @media (max-width: 640px) {
    .content {
      flex-direction: column;
    }

    .drawing-section {
      width: 100%;
    }

    .canvas-wrapper {
      display: flex;
      justify-content: center;
    }

    .stats-section {
      width: 100%;
    }
  }
</style>
