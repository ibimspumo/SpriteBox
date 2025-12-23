<!-- PixelSurvivor/Result.svelte - Event result screen -->
<script lang="ts">
  import { Button } from '../../atoms';
  import { t, currentLanguage } from '$lib/i18n';
  import { PALETTE, hexCharToIndex } from '$lib/palette';
  import {
    survivorRun,
    loadEvents,
    resolveEvent,
    applyEventResults,
    proceedFromResult,
    getLocalizedText,
    getCategoryIcon,
    getCategoryColor,
    explainCategoryMatch,
    getSolutionCategories,
    analyzeShape,
    type GameEvent,
    type EventSolution,
    type CategoryMatchExplanation,
    type DrawingCategory,
  } from '$lib/survivor';

  // Get color from pixel hex character
  function getPixelColor(pixel: string): string {
    const index = hexCharToIndex(pixel);
    return PALETTE[index]?.hex ?? PALETTE[0].hex;
  }

  let mounted = $state(false);
  let currentEvent = $state<GameEvent | null>(null);
  let loading = $state(true);
  let resolved = $state(false);
  let isResolving = $state(false);

  // Result state
  let success = $state(false);
  let solution = $state<EventSolution | null>(null);
  let bonusTexts = $state<string[]>([]);
  let totalEffectiveness = $state(0);

  // Rewards state
  let xpGained = $state(0);
  let goldGained = $state(0);
  let foodGained = $state(0);
  let materialsGained = $state(0);
  let damageTaken = $state(0);
  let effectApplied = $state<string | null>(null);
  let leveledUp = $state(false);
  let foodBonusReason = $state<string | null>(null);

  // Explanation state
  let explanation = $state<CategoryMatchExplanation | null>(null);

  // Get current run data
  const run = $derived($survivorRun);

  // Load event and resolve
  $effect(() => {
    if (run?.currentEvent?.eventId && !resolved && !isResolving) {
      resolveCurrentEvent(run.currentEvent.eventId);
    }
  });

  async function resolveCurrentEvent(eventId: string): Promise<void> {
    // Prevent multiple simultaneous calls (race condition from $effect)
    if (isResolving || resolved) return;
    isResolving = true;
    loading = true;

    // Load event data
    const eventsData = await loadEvents();
    currentEvent = eventsData.events.find((e) => e.id === eventId) ?? null;

    // Resolve the event
    const result = await resolveEvent();
    success = result.success;
    solution = result.solution;
    bonusTexts = result.bonusTexts;
    totalEffectiveness = result.totalEffectiveness;

    // Apply results
    const rewards = await applyEventResults(success);
    xpGained = rewards.xpGained;
    goldGained = rewards.goldGained;
    foodGained = rewards.foodGained;
    materialsGained = rewards.materialsGained;
    damageTaken = rewards.damageTaken;
    effectApplied = rewards.effectApplied;
    leveledUp = rewards.leveledUp;
    foodBonusReason = rewards.foodBonusReason;

    // Generate explanation for failures
    if (!success && run?.currentEvent?.drawnPixels && currentEvent?.solutions) {
      const analysis = analyzeShape(run.currentEvent.drawnPixels);
      if (analysis && run.currentEvent.analysisResult) {
        const validCategories = getSolutionCategories(currentEvent.solutions);
        // Find the closest valid category (use first one as primary target)
        const closestValid = validCategories[0]?.id ?? 'unknown';
        const detectedCat = run.currentEvent.analysisResult.category;
        explanation = explainCategoryMatch(
          analysis,
          detectedCat as DrawingCategory,
          closestValid as DrawingCategory
        );
      }
    }

    resolved = true;
    loading = false;
  }

  $effect(() => {
    setTimeout(() => {
      mounted = true;
    }, 100);
  });

  function handleContinue(): void {
    proceedFromResult();
  }

  function getResultText(): string {
    if (!solution || !currentEvent) return '';

    if (success) {
      return getLocalizedText(
        solution.successText,
        solution.successTextDE,
        $currentLanguage
      );
    } else {
      return getLocalizedText(
        solution.failText,
        solution.failTextDE,
        $currentLanguage
      );
    }
  }
</script>

<div class="result-screen" class:mounted>
  {#if loading}
    <div class="loading">
      <div class="loading-spinner"></div>
      <span>{$t.pixelSurvivor.analyzing}...</span>
    </div>
  {:else}
    <!-- Result Header -->
    <div class="result-header" class:success class:failure={!success}>
      <h1 class="result-title">
        {success ? $t.pixelSurvivor.success : $t.pixelSurvivor.failure}
      </h1>
    </div>

    <!-- Drawing Preview -->
    {#if run?.currentEvent?.drawnPixels}
      <div class="drawing-preview">
        <div class="preview-grid">
          {#each run.currentEvent.drawnPixels.split('') as pixel, i}
            {@const row = Math.floor(i / 8)}
            {@const col = i % 8}
            <div
              class="preview-pixel"
              style="background-color: {getPixelColor(pixel)}; grid-row: {row + 1}; grid-column: {col + 1};"
            ></div>
          {/each}
        </div>
        {#if run.currentEvent.analysisResult}
          {@const categoryStr = run.currentEvent.analysisResult.category}
          <div
            class="category-badge"
            style="--category-color: {getCategoryColor(categoryStr as DrawingCategory)}"
          >
            <span class="category-icon">{getCategoryIcon(categoryStr as DrawingCategory)}</span>
            <span class="category-name">
              {$t.pixelSurvivor.categories[categoryStr as DrawingCategory]}
            </span>
          </div>
        {/if}
      </div>
    {/if}

    <!-- Result Text -->
    {#if solution}
      <div class="result-text">
        <p>{getResultText()}</p>
      </div>
    {/if}

    <!-- Failure Explanation -->
    {#if !success && explanation}
      <div class="explanation-section">
        <div class="explanation-header">
          <span>{$t.pixelSurvivor.resultExplanation.whatWasWrong}</span>
        </div>

        <div class="explanation-row">
          <span class="label">{$t.pixelSurvivor.resultExplanation.detectedAs}</span>
          <span class="value">
            <span class="category-icon">{getCategoryIcon(explanation.detectedCategory)}</span>
            {$t.pixelSurvivor.categories[explanation.detectedCategory]}
          </span>
        </div>

        {#if explanation.targetCategory !== explanation.detectedCategory}
          <div class="explanation-row">
            <span class="label">{$t.pixelSurvivor.resultExplanation.expectedCategory}</span>
            <span class="value">
              <span class="category-icon">{getCategoryIcon(explanation.targetCategory)}</span>
              {$t.pixelSurvivor.categories[explanation.targetCategory]}
            </span>
          </div>
        {/if}

        {#if explanation.missingConditions.length > 0}
          <div class="missing-conditions">
            <span class="conditions-header">{$t.pixelSurvivor.resultExplanation.howToFix}</span>
            <ul>
              {#each explanation.missingConditions.slice(0, 3) as condition}
                <li>{$t.pixelSurvivor.hints[condition as keyof typeof $t.pixelSurvivor.hints]}</li>
              {/each}
            </ul>
          </div>
        {/if}

        <div class="match-score">
          <div class="match-score-bar">
            <div class="match-score-fill" style="width: {explanation.matchScore}%"></div>
          </div>
          <span class="match-score-text">{explanation.matchScore}% {$t.pixelSurvivor.match}</span>
        </div>
      </div>
    {/if}

    <!-- Effectiveness -->
    <div class="effectiveness">
      <div class="effectiveness-bar-container">
        <div
          class="effectiveness-bar"
          class:success
          style="width: {totalEffectiveness}%"
        ></div>
      </div>
      <span class="effectiveness-value">{totalEffectiveness}%</span>
    </div>

    <!-- Bonuses -->
    {#if bonusTexts.length > 0}
      <div class="bonuses">
        {#each bonusTexts as bonus}
          <span class="bonus-tag">{bonus}</span>
        {/each}
      </div>
    {/if}

    <!-- Rewards/Punishment -->
    <div class="rewards-section">
      {#if success}
        <div class="rewards">
          {#if xpGained > 0}
            <div class="reward-item xp">
              <span class="reward-label">{$t.pixelSurvivor.xpGained}</span>
              <span class="reward-value">+{xpGained}</span>
            </div>
          {/if}
          {#if goldGained > 0}
            <div class="reward-item gold">
              <span class="reward-label">{$t.pixelSurvivor.goldGained}</span>
              <span class="reward-value">+{goldGained}</span>
            </div>
          {/if}
          {#if foodGained > 0}
            <div class="reward-item food">
              <span class="reward-label">
                {$t.pixelSurvivor.food}
                {#if foodBonusReason === 'foraged'}
                  <span class="food-bonus-tag">{$t.pixelSurvivor.foragedFood}</span>
                {:else if foodBonusReason === 'cooked'}
                  <span class="food-bonus-tag">{$t.pixelSurvivor.cookedMeal}</span>
                {/if}
              </span>
              <span class="reward-value">+{foodGained}</span>
            </div>
          {/if}
          {#if materialsGained > 0}
            <div class="reward-item materials">
              <span class="reward-label">{$t.pixelSurvivor.materials}</span>
              <span class="reward-value">+{materialsGained}</span>
            </div>
          {/if}
        </div>
      {:else}
        <div class="punishment">
          {#if damageTaken > 0}
            <div class="punishment-item damage">
              <span class="punishment-label">{$t.pixelSurvivor.damageTaken}</span>
              <span class="punishment-value">-{damageTaken}</span>
            </div>
          {/if}
          {#if effectApplied}
            <div class="punishment-item effect">
              <span class="punishment-label">{$t.pixelSurvivor.effect}</span>
              <span class="punishment-value">{effectApplied}</span>
            </div>
          {/if}
          {#if goldGained < 0}
            <div class="punishment-item gold-loss">
              <span class="punishment-label">{$t.pixelSurvivor.gold}</span>
              <span class="punishment-value">{goldGained}</span>
            </div>
          {/if}
        </div>
      {/if}

      {#if leveledUp}
        <div class="level-up-notice">
          {$t.pixelSurvivor.levelUp}!
        </div>
      {/if}
    </div>

    <!-- HP Status -->
    {#if run}
      <div class="hp-status" class:critical={run.hp < run.maxHp * 0.2}>
        <span class="hp-label">{$t.pixelSurvivor.hp}</span>
        <span class="hp-value">{run.hp}/{run.maxHp}</span>
      </div>
    {/if}

    <!-- Continue Button -->
    <div class="actions">
      <Button variant="primary" size="lg" onclick={handleContinue}>
        {$t.pixelSurvivor.continue}
      </Button>
    </div>
  {/if}
</div>

<style>
  .result-screen {
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

  .result-screen.mounted {
    opacity: 1;
    transform: translateY(0);
  }

  .loading {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--space-3);
    padding: var(--space-8);
  }

  .loading-spinner {
    width: 40px;
    height: 40px;
    border: 4px solid var(--color-bg-tertiary);
    border-top-color: var(--color-accent);
    border-radius: 50%;
    animation: spin 1s linear infinite;
  }

  .loading span {
    color: var(--color-text-secondary);
    font-size: var(--font-size-sm);
  }

  .result-header {
    width: 100%;
    padding: var(--space-4);
    border-radius: var(--radius-md);
    text-align: center;
  }

  .result-header.success {
    background: linear-gradient(135deg, var(--color-success) 0%, var(--color-success) 100%);
  }

  .result-header.failure {
    background: linear-gradient(135deg, var(--color-danger) 0%, var(--color-danger) 100%);
  }

  .result-title {
    margin: 0;
    font-size: var(--font-size-2xl);
    font-weight: var(--font-weight-bold);
    color: white;
    text-transform: uppercase;
    letter-spacing: 3px;
  }

  .drawing-preview {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--space-2);
  }

  .preview-grid {
    display: grid;
    grid-template-columns: repeat(8, 1fr);
    gap: var(--space-1);
    padding: var(--space-2);
    background: var(--color-bg-secondary);
    border: 3px solid var(--color-bg-tertiary);
    border-radius: var(--radius-sm);
  }

  .preview-pixel {
    width: 16px;
    height: 16px;
    border-radius: 1px;
  }

  .category-badge {
    display: flex;
    align-items: center;
    gap: var(--space-1);
    padding: var(--space-1) var(--space-3);
    background: var(--category-color, var(--color-bg-tertiary));
    border-radius: var(--radius-sm);
    font-size: var(--font-size-sm);
    font-weight: var(--font-weight-bold);
    color: white;
    text-transform: uppercase;
  }

  .category-icon {
    font-size: var(--font-size-md);
  }

  .category-name {
    letter-spacing: 1px;
  }

  .result-text {
    width: 100%;
    padding: var(--space-3);
    background: var(--color-bg-secondary);
    border-radius: var(--radius-sm);
    text-align: center;
  }

  .result-text p {
    margin: 0;
    font-size: var(--font-size-sm);
    color: var(--color-text-primary);
    line-height: 1.5;
  }

  .effectiveness {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    width: 100%;
  }

  .effectiveness-bar-container {
    flex: 1;
    height: 8px;
    background: var(--color-bg-tertiary);
    border-radius: 4px;
    overflow: hidden;
  }

  .effectiveness-bar {
    height: 100%;
    background: var(--color-danger);
    border-radius: 4px;
    transition: width 0.5s ease;
  }

  .effectiveness-bar.success {
    background: var(--color-success);
  }

  .effectiveness-value {
    width: 45px;
    font-size: var(--font-size-sm);
    font-weight: var(--font-weight-bold);
    color: var(--color-text-primary);
    text-align: right;
  }

  .bonuses {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-2);
    justify-content: center;
  }

  .bonus-tag {
    padding: var(--space-1) var(--space-2);
    background: var(--color-success);
    border-radius: var(--radius-sm);
    font-size: var(--font-size-xs);
    font-weight: var(--font-weight-bold);
    color: white;
  }

  .rewards-section {
    width: 100%;
    padding: var(--space-3);
    background: var(--color-bg-secondary);
    border: 2px solid var(--color-bg-tertiary);
    border-radius: var(--radius-md);
  }

  .rewards,
  .punishment {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
  }

  .reward-item,
  .punishment-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .reward-label,
  .punishment-label {
    font-size: var(--font-size-sm);
    color: var(--color-text-secondary);
  }

  .reward-value {
    font-size: var(--font-size-md);
    font-weight: var(--font-weight-bold);
    color: var(--color-success);
  }

  .food-bonus-tag {
    display: inline-block;
    margin-left: var(--space-2);
    padding: 2px var(--space-2);
    background: var(--color-success);
    border-radius: var(--radius-sm);
    font-size: var(--font-size-xs);
    font-weight: var(--font-weight-bold);
    color: white;
  }

  .punishment-value {
    font-size: var(--font-size-md);
    font-weight: var(--font-weight-bold);
    color: var(--color-danger);
  }

  .level-up-notice {
    margin-top: var(--space-3);
    padding: var(--space-2);
    background: var(--color-accent);
    border-radius: var(--radius-sm);
    text-align: center;
    font-size: var(--font-size-md);
    font-weight: var(--font-weight-bold);
    color: var(--color-bg-primary);
    text-transform: uppercase;
    letter-spacing: 2px;
  }

  .hp-status {
    display: flex;
    gap: var(--space-2);
    padding: var(--space-2) var(--space-3);
    background: var(--color-bg-secondary);
    border-radius: var(--radius-sm);
  }

  .hp-status.critical {
    background: var(--color-danger);
    animation: pulse 1s infinite;
  }

  .hp-label {
    font-size: var(--font-size-sm);
    color: var(--color-text-muted);
  }

  .hp-value {
    font-size: var(--font-size-sm);
    font-weight: var(--font-weight-bold);
    color: var(--color-text-primary);
  }

  .hp-status.critical .hp-label,
  .hp-status.critical .hp-value {
    color: white;
  }

  .actions {
    width: 100%;
  }

  /* Explanation Section */
  .explanation-section {
    width: 100%;
    padding: var(--space-3);
    background: rgba(255, 193, 7, 0.1);
    border: 2px solid rgba(255, 193, 7, 0.3);
    border-radius: var(--radius-md);
    display: flex;
    flex-direction: column;
    gap: var(--space-3);
  }

  .explanation-header {
    font-size: var(--font-size-sm);
    font-weight: var(--font-weight-bold);
    color: var(--color-warning);
    text-transform: uppercase;
    letter-spacing: 1px;
  }

  .explanation-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: var(--space-2);
  }

  .explanation-row .label {
    font-size: var(--font-size-xs);
    color: var(--color-text-secondary);
    text-transform: uppercase;
  }

  .explanation-row .value {
    display: flex;
    align-items: center;
    gap: var(--space-1);
    font-size: var(--font-size-sm);
    font-weight: var(--font-weight-bold);
    color: var(--color-text-primary);
  }

  .missing-conditions {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
  }

  .conditions-header {
    font-size: var(--font-size-xs);
    font-weight: var(--font-weight-bold);
    color: var(--color-accent);
    text-transform: uppercase;
    letter-spacing: 1px;
  }

  .missing-conditions ul {
    margin: 0;
    padding-left: var(--space-4);
    display: flex;
    flex-direction: column;
    gap: var(--space-1);
  }

  .missing-conditions li {
    font-size: var(--font-size-xs);
    color: var(--color-text-primary);
    line-height: 1.4;
  }

  .match-score {
    display: flex;
    flex-direction: column;
    gap: var(--space-1);
  }

  .match-score-bar {
    height: 6px;
    background: var(--color-bg-tertiary);
    border-radius: 3px;
    overflow: hidden;
  }

  .match-score-fill {
    height: 100%;
    background: linear-gradient(90deg, var(--color-danger) 0%, var(--color-warning) 100%);
    border-radius: 3px;
    transition: width 0.5s ease;
  }

  .match-score-text {
    font-size: var(--font-size-xs);
    color: var(--color-text-secondary);
    text-align: right;
  }
</style>
