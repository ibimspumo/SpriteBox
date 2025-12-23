<!-- PixelSurvivor/CharacterCreation.svelte - Draw your character to generate stats -->
<script lang="ts">
  import { Button, Icon } from '../../atoms';
  import { PixelCanvas } from '../../utility';
  import { t } from '$lib/i18n';
  import { PALETTE } from '$lib/palette';
  import { selectedColor } from '$lib/stores';
  import {
    currentDrawing,
    startNewRun,
    cancelCharacterCreation,
    analyzeCharacter,
    calculateCharacterStats,
  } from '$lib/survivor';
  import type { CharacterStats, SurvivorCharacter } from '$lib/survivor';

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

  // Analyze character in real-time
  let analysis = $derived(analyzeCharacter($currentDrawing));
  let previewStats = $derived<CharacterStats | null>(analysis ? calculateCharacterStats(analysis) : null);

  // Check if character has enough pixels
  let hasEnoughPixels = $derived(analysis !== null && analysis.pixelCount >= 5);

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
    // Generate random character pixels
    const colors = ['0', '2', '3', '4', '5', '8', 'F', 'D']; // Common character colors
    let pixels = '';
    for (let i = 0; i < 64; i++) {
      const x = i % 8;
      const y = Math.floor(i / 8);
      // Create a humanoid-ish shape
      const inBody = x >= 2 && x <= 5 && y >= 1 && y <= 6;
      const inHead = x >= 3 && x <= 4 && y >= 0 && y <= 1;
      const inArms = (x === 1 || x === 6) && y >= 2 && y <= 4;
      const inLegs = (x === 2 || x === 3 || x === 4 || x === 5) && y >= 6;

      if (inHead || inBody || inArms || inLegs) {
        if (Math.random() > 0.2) {
          pixels += colors[Math.floor(Math.random() * colors.length)];
        } else {
          pixels += '1';
        }
      } else {
        pixels += '1';
      }
    }
    currentDrawing.set(pixels);
  }

  function handleStartRun(): void {
    if (!previewStats || !hasEnoughPixels) return;

    const character: SurvivorCharacter = {
      pixels: $currentDrawing,
      name: characterName.trim() || 'Survivor',
      stats: previewStats,
    };

    startNewRun(character);
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
      <h2>{$t.pixelSurvivor.previewStats}</h2>

      {#if previewStats}
        <div class="stats-list">
          {#each STATS as stat}
            <div class="stat-bar-container">
              <div class="stat-bar" style="width: {getStatPercent(previewStats[stat.key], stat.min, stat.max)}%; background: {stat.color};">
                <span class="stat-icon-label">
                  <Icon name={stat.icon} size="sm" />
                  <span>{$t.pixelSurvivor.statAbbr[stat.transKey]}</span>
                </span>
                <span class="stat-value">{previewStats[stat.key]}</span>
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
        <label for="character-name">{$t.pixelSurvivor.characterName}</label>
        <input
          id="character-name"
          type="text"
          bind:value={characterName}
          placeholder={$t.pixelSurvivor.defaultName}
          maxlength={20}
        />
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
      disabled={!hasEnoughPixels}
    >
      {$t.pixelSurvivor.startRun} →
    </Button>
  </div>
</div>

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

  .stats-section h2 {
    margin: 0;
    font-size: var(--font-size-sm);
    color: var(--color-text-muted);
    text-transform: uppercase;
    letter-spacing: 1px;
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
    font-size: var(--font-size-xs);
    color: var(--color-text-muted);
    text-transform: uppercase;
    letter-spacing: 1px;
  }

  .name-input input {
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
