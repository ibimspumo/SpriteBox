<!-- PixelSurvivor/Event.svelte - Event drawing phase -->
<script lang="ts">
  import { Button } from '../../atoms';
  import { PixelCanvas } from '../../utility';
  import { t, currentLanguage } from '$lib/i18n';
  import { PALETTE } from '$lib/palette';
  import { selectedColor } from '$lib/stores';
  import {
    survivorRun,
    currentDrawing,
    loadEvents,
    submitDrawingSolution,
    getLocalizedText,
    getSolutionCategories,
    getCategoryIcon,
    getCategoryColor,
    getBestHint,
    analyzeShape,
    getDetectedCategorySync,
    preloadDrawableObjects,
    type GameEvent,
    type DrawingCategory,
  } from '$lib/survivor';

  let mounted = $state(false);
  let currentEvent = $state<GameEvent | null>(null);
  let loading = $state(true);
  let submitting = $state(false);
  let cacheReady = $state(false);

  // Get current run data
  const run = $derived($survivorRun);

  // Preload drawable objects cache for consistent detection
  $effect(() => {
    preloadDrawableObjects().then(() => {
      cacheReady = true;
    });
  });

  // Load event data
  $effect(() => {
    if (run?.currentEvent?.eventId) {
      loadEventData(run.currentEvent.eventId);
    }
  });

  async function loadEventData(eventId: string): Promise<void> {
    loading = true;
    const eventsData = await loadEvents();
    currentEvent = eventsData.events.find((e) => e.id === eventId) ?? null;
    loading = false;
  }

  $effect(() => {
    // Reset drawing when entering event phase
    currentDrawing.set('1'.repeat(64));
    selectedColor.set(0);

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

  async function handleSubmit(): Promise<void> {
    if (submitting) return;
    submitting = true;

    await submitDrawingSolution($currentDrawing);
  }

  // Count non-empty pixels
  const pixelCount = $derived(
    $currentDrawing.split('').filter((c) => c !== '1').length
  );

  // Use engine detection for consistency with submission
  // This uses the same detection logic as submitDrawingSolution
  const detectedCategory = $derived(
    cacheReady ? getDetectedCategorySync($currentDrawing) as DrawingCategory | null : null
  );
  const categoryIcon = $derived(detectedCategory ? getCategoryIcon(detectedCategory) : '❓');
  const categoryColor = $derived(detectedCategory ? getCategoryColor(detectedCategory) : '#6b6b8a');
  const categoryName = $derived(
    detectedCategory ? $t.pixelSurvivor.categories[detectedCategory] : $t.pixelSurvivor.noValidShape
  );

  // Get valid solution categories from current event
  const validCategories = $derived(
    currentEvent?.solutions ? getSolutionCategories(currentEvent.solutions) : []
  );

  // Get valid category IDs for hint generation
  const validCategoryIds = $derived(validCategories.map(c => c.id));

  // Get best hint for current drawing (still uses analyzeShape for hint generation)
  const shapeAnalysis = $derived(analyzeShape($currentDrawing));
  const bestHint = $derived(getBestHint(shapeAnalysis, validCategoryIds));
</script>

<div class="event-phase" class:mounted>
  <!-- Event Info -->
  {#if loading}
    <div class="event-info loading">
      <div class="loading-spinner"></div>
    </div>
  {:else if currentEvent}
    <div class="event-info">
      <div class="event-header">
        <span class="day-badge">{$t.pixelSurvivor.day} {run?.day ?? 1}</span>
        <span class="event-type">
          {$t.pixelSurvivor.eventCategories[currentEvent.type]}
        </span>
      </div>
      <h2 class="event-name">
        {getLocalizedText(currentEvent.name, currentEvent.nameDE, $currentLanguage)}
      </h2>
      <p class="event-description">
        {getLocalizedText(currentEvent.description, currentEvent.descriptionDE, $currentLanguage)}
      </p>

      <!-- Valid Solutions -->
      {#if validCategories.length > 0}
        <div class="valid-solutions">
          <span class="solutions-label">{$t.pixelSurvivor.validSolutions}</span>
          <div class="solution-badges">
            {#each validCategories as cat}
              <span class="solution-badge">
                {cat.icon} {$t.pixelSurvivor.categories[cat.id]}
              </span>
            {/each}
          </div>
        </div>
      {/if}

      {#if currentEvent.hint}
        <div class="hint">
          <span class="hint-label">{$t.pixelSurvivor.hint}:</span>
          <span class="hint-text">
            {getLocalizedText(currentEvent.hint, currentEvent.hintDE, $currentLanguage)}
          </span>
        </div>
      {/if}
    </div>
  {/if}

  <!-- Drawing Section -->
  <div class="drawing-section">
    <h3 class="drawing-title">{$t.pixelSurvivor.drawSolution}</h3>

    <div class="canvas-wrapper">
      <PixelCanvas
        pixelData={$currentDrawing}
        editable={true}
        onchange={handlePixelChange}
        size={224}
      />
    </div>

    <!-- Color Palette -->
    <div class="palette-container">
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

    <!-- Detection Preview -->
    <div class="detection-preview">
      <span class="detection-label">{$t.pixelSurvivor.currentlyDetected}</span>
      <span class="category-badge" style="--category-color: {categoryColor}">
        {categoryIcon} {categoryName}
      </span>
    </div>

    <!-- Soft Hint Display -->
    {#if bestHint}
      <div class="soft-hint" class:positive={bestHint.type === 'positive'} class:negative={bestHint.type === 'negative'}>
        {$t.pixelSurvivor.hints[bestHint.key as keyof typeof $t.pixelSurvivor.hints]}
      </div>
    {/if}

    <!-- Pixel Count -->
    <div class="pixel-count">
      <span class="count-value">{pixelCount}</span>
      <span class="count-label">{$t.pixelSurvivor.pixels}</span>
    </div>
  </div>

  <!-- Actions -->
  <div class="actions">
    <Button variant="ghost" size="sm" onclick={handleClear}>
      {$t.pixelSurvivor.clear}
    </Button>
    <Button
      variant="primary"
      size="lg"
      onclick={handleSubmit}
      disabled={pixelCount < 3 || submitting}
    >
      {#if submitting}
        {$t.pixelSurvivor.analyzing}...
      {:else}
        {$t.pixelSurvivor.submit}
      {/if}
    </Button>
  </div>
</div>

<style>
  .event-phase {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--space-4);
    width: 100%;
    max-width: 400px;
    padding: var(--space-4);
    opacity: 0;
    transform: translateY(20px);
    transition: all 0.4s ease;
  }

  .event-phase.mounted {
    opacity: 1;
    transform: translateY(0);
  }

  .event-info {
    width: 100%;
    padding: var(--space-4);
    background: var(--color-bg-secondary);
    border: 3px solid var(--color-danger);
    border-radius: var(--radius-md);
  }

  .event-info.loading {
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 100px;
  }

  .loading-spinner {
    width: 24px;
    height: 24px;
    border: 3px solid var(--color-bg-tertiary);
    border-top-color: var(--color-accent);
    border-radius: 50%;
    animation: spin 1s linear infinite;
  }

  .event-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: var(--space-2);
  }

  .day-badge {
    padding: var(--space-1) var(--space-2);
    background: var(--color-warning);
    border-radius: var(--radius-sm);
    font-size: var(--font-size-xs);
    font-weight: var(--font-weight-bold);
    color: var(--color-bg-primary);
    text-transform: uppercase;
  }

  .event-type {
    font-size: var(--font-size-xs);
    font-weight: var(--font-weight-bold);
    color: var(--color-danger);
    text-transform: uppercase;
    letter-spacing: 1px;
  }

  .event-name {
    margin: 0 0 var(--space-2);
    font-size: var(--font-size-lg);
    font-weight: var(--font-weight-bold);
    color: var(--color-text-primary);
  }

  .event-description {
    margin: 0;
    font-size: var(--font-size-sm);
    color: var(--color-text-secondary);
    line-height: 1.5;
  }

  .hint {
    margin-top: var(--space-3);
    padding: var(--space-2);
    background: var(--color-bg-tertiary);
    border-radius: var(--radius-sm);
  }

  .hint-label {
    font-size: var(--font-size-xs);
    font-weight: var(--font-weight-bold);
    color: var(--color-warning);
    text-transform: uppercase;
  }

  .hint-text {
    display: block;
    margin-top: var(--space-1);
    font-size: var(--font-size-sm);
    color: var(--color-text-primary);
    font-style: italic;
  }

  .drawing-section {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--space-3);
    width: 100%;
  }

  .drawing-title {
    margin: 0;
    font-size: var(--font-size-sm);
    font-weight: var(--font-weight-bold);
    color: var(--color-text-muted);
    text-transform: uppercase;
    letter-spacing: 1px;
  }

  .canvas-wrapper {
    background: var(--color-bg-secondary);
    padding: var(--space-3);
    border: 3px solid var(--color-bg-tertiary);
    border-radius: var(--radius-md);
  }

  .palette-container {
    width: 100%;
    max-width: 280px;
  }

  .palette {
    display: grid;
    grid-template-columns: repeat(8, 1fr);
    gap: 3px;
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

  .pixel-count {
    display: flex;
    align-items: baseline;
    gap: var(--space-1);
  }

  .count-value {
    font-size: var(--font-size-lg);
    font-weight: var(--font-weight-bold);
    color: var(--color-accent);
  }

  .count-label {
    font-size: var(--font-size-sm);
    color: var(--color-text-muted);
  }

  .actions {
    display: flex;
    justify-content: space-between;
    align-items: center;
    width: 100%;
    gap: var(--space-3);
  }

  /* Valid Solutions */
  .valid-solutions {
    margin-top: var(--space-3);
    padding: var(--space-2);
    background: var(--color-bg-tertiary);
    border-radius: var(--radius-sm);
  }

  .solutions-label {
    display: block;
    font-size: var(--font-size-xs);
    font-weight: var(--font-weight-bold);
    color: var(--color-accent);
    text-transform: uppercase;
    margin-bottom: var(--space-2);
  }

  .solution-badges {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-2);
  }

  .solution-badge {
    padding: var(--space-1) var(--space-2);
    background: var(--color-bg-elevated);
    border: 2px solid var(--color-bg-tertiary);
    border-radius: var(--radius-sm);
    font-size: var(--font-size-xs);
    font-weight: var(--font-weight-medium);
    color: var(--color-text-primary);
    white-space: nowrap;
  }

  /* Detection Preview */
  .detection-preview {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--space-2);
    padding: var(--space-2);
    background: var(--color-bg-secondary);
    border: 2px solid var(--color-bg-tertiary);
    border-radius: var(--radius-sm);
  }

  .detection-label {
    font-size: var(--font-size-xs);
    font-weight: var(--font-weight-bold);
    color: var(--color-text-muted);
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  .category-badge {
    padding: var(--space-2) var(--space-3);
    background: var(--color-bg-tertiary);
    border: 3px solid var(--category-color);
    border-radius: var(--radius-md);
    font-size: var(--font-size-sm);
    font-weight: var(--font-weight-bold);
    color: var(--color-text-primary);
    transition: all var(--transition-fast);
  }

  /* Soft Hint Display */
  .soft-hint {
    width: 100%;
    padding: var(--space-2) var(--space-3);
    border-radius: var(--radius-sm);
    font-size: var(--font-size-sm);
    font-weight: var(--font-weight-medium);
    text-align: center;
    font-style: italic;
    transition: all var(--transition-fast);
  }

  .soft-hint.positive {
    background: rgba(34, 197, 94, 0.15);
    border: 2px solid var(--color-success);
    color: var(--color-success);
  }

  .soft-hint.negative {
    background: rgba(245, 158, 11, 0.15);
    border: 2px solid var(--color-warning);
    color: var(--color-warning);
  }

  @media (max-width: 480px) {
    .event-phase {
      padding: var(--space-3);
    }

    .canvas-wrapper {
      padding: var(--space-2);
    }

    .solution-badges {
      gap: var(--space-1);
    }

    .solution-badge {
      padding: var(--space-1);
      font-size: 10px;
    }
  }
</style>
