<!-- PixelSurvivor/DayStart.svelte - Day start screen showing status and event preview -->
<script lang="ts">
  import { Button } from '../../atoms';
  import { t, currentLanguage } from '$lib/i18n';
  import {
    survivorRun,
    hpPercent,
    xpPercent,
    effectiveStats,
    loadEvents,
    proceedToEvent,
    getLocalizedText,
    type GameEvent,
  } from '$lib/survivor';

  let mounted = $state(false);
  let currentEvent = $state<GameEvent | null>(null);
  let loading = $state(true);

  // Get current run data
  const run = $derived($survivorRun);
  const hp = $derived($hpPercent);
  const xp = $derived($xpPercent);
  const stats = $derived($effectiveStats);

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
    setTimeout(() => {
      mounted = true;
    }, 100);
  });

  function handleContinue(): void {
    proceedToEvent();
  }

  function getEventTypeIcon(type: string): string {
    switch (type) {
      case 'combat':
        return '';
      case 'survival':
        return '';
      case 'exploration':
        return '';
      case 'social':
        return '';
      case 'mystery':
        return '';
      case 'boss':
        return '';
      default:
        return '';
    }
  }
</script>

<div class="day-start" class:mounted>
  <!-- Day Header -->
  <div class="day-header">
    <span class="day-label">{$t.pixelSurvivor.day}</span>
    <span class="day-number">{run?.day ?? 1}</span>
    <span class="day-of">/30</span>
  </div>

  <!-- Character Status -->
  <div class="status-card">
    <div class="character-preview">
      <div class="character-name">{run?.character.name ?? 'Survivor'}</div>
      <div class="level-badge">
        {$t.pixelSurvivor.level} {run?.level ?? 1}
      </div>
    </div>

    <!-- HP Bar -->
    <div class="stat-bar-container">
      <div
        class="stat-bar hp"
        style="width: {hp}%"
        class:low={hp < 30}
        class:critical={hp < 15}
      >
        <span class="stat-label">{$t.pixelSurvivor.hp}</span>
        <span class="stat-value">{run?.hp ?? 0}/{run?.maxHp ?? 100}</span>
      </div>
    </div>

    <!-- XP Bar -->
    <div class="stat-bar-container">
      <div class="stat-bar xp" style="width: {xp}%">
        <span class="stat-label">XP</span>
        <span class="stat-value">{run?.xp ?? 0}/{run?.xpToNextLevel ?? 50}</span>
      </div>
    </div>

    <!-- Resources -->
    <div class="resources">
      <div class="resource">
        <span class="resource-icon food"></span>
        <span class="resource-value">{run?.food ?? 0}</span>
        <span class="resource-label">{$t.pixelSurvivor.food}</span>
      </div>
      <div class="resource">
        <span class="resource-icon gold"></span>
        <span class="resource-value">{run?.gold ?? 0}</span>
        <span class="resource-label">{$t.pixelSurvivor.gold}</span>
      </div>
      <div class="resource">
        <span class="resource-icon materials"></span>
        <span class="resource-value">{run?.materials ?? 0}</span>
        <span class="resource-label">{$t.pixelSurvivor.materials}</span>
      </div>
    </div>
  </div>

  <!-- Event Preview -->
  {#if loading}
    <div class="event-preview loading">
      <div class="loading-spinner"></div>
    </div>
  {:else if currentEvent}
    <div class="event-preview">
      <div class="event-type">
        <span class="type-icon">{getEventTypeIcon(currentEvent.type)}</span>
        <span class="type-label">
          {$t.pixelSurvivor.eventCategories[currentEvent.type]}
        </span>
      </div>
      <h2 class="event-name">
        {getLocalizedText(currentEvent.name, currentEvent.nameDE, $currentLanguage)}
      </h2>
      <p class="event-description">
        {getLocalizedText(currentEvent.description, currentEvent.descriptionDE, $currentLanguage)}
      </p>
    </div>
  {/if}

  <!-- Continue Button -->
  <div class="actions">
    <Button variant="primary" size="lg" onclick={handleContinue} disabled={loading}>
      {$t.pixelSurvivor.continue}
    </Button>
  </div>
</div>

<style>
  .day-start {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--space-5);
    width: 100%;
    max-width: 400px;
    padding: var(--space-4);
    opacity: 0;
    transform: translateY(20px);
    transition: all 0.4s ease;
  }

  .day-start.mounted {
    opacity: 1;
    transform: translateY(0);
  }

  .day-header {
    display: flex;
    align-items: baseline;
    gap: var(--space-2);
  }

  .day-label {
    font-size: var(--font-size-lg);
    color: var(--color-text-secondary);
    text-transform: uppercase;
    letter-spacing: 2px;
  }

  .day-number {
    font-size: var(--font-size-3xl);
    font-weight: var(--font-weight-bold);
    color: var(--color-warning);
  }

  .day-of {
    font-size: var(--font-size-lg);
    color: var(--color-text-muted);
  }

  .status-card {
    width: 100%;
    padding: var(--space-4);
    background: var(--color-bg-secondary);
    border: 3px solid var(--color-bg-tertiary);
    border-radius: var(--radius-md);
  }

  .character-preview {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: var(--space-4);
    padding-bottom: var(--space-3);
    border-bottom: 2px solid var(--color-bg-tertiary);
  }

  .character-name {
    font-size: var(--font-size-lg);
    font-weight: var(--font-weight-bold);
    color: var(--color-text-primary);
  }

  .level-badge {
    padding: var(--space-1) var(--space-2);
    background: var(--color-accent);
    border-radius: var(--radius-sm);
    font-size: var(--font-size-sm);
    font-weight: var(--font-weight-bold);
    color: var(--color-bg-primary);
  }

  .stat-bar-container {
    height: 28px;
    background: var(--color-bg-tertiary);
    border-radius: var(--radius-sm);
    overflow: hidden;
    margin-bottom: var(--space-2);
  }

  .stat-bar {
    height: 100%;
    border-radius: var(--radius-sm);
    transition: width 0.3s ease;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 var(--space-2);
    min-width: 80px;
  }

  .stat-bar.hp {
    background: var(--color-success);
  }

  .stat-bar.hp.low {
    background: var(--color-warning);
  }

  .stat-bar.hp.critical {
    background: var(--color-danger);
    animation: pulse 1s infinite;
  }

  .stat-bar.xp {
    background: var(--color-accent);
  }

  .stat-label {
    font-size: var(--font-size-xs);
    font-weight: var(--font-weight-bold);
    color: rgba(255, 255, 255, 0.9);
    text-shadow: 0 1px 2px rgba(0, 0, 0, 0.5);
    text-transform: uppercase;
  }

  .stat-value {
    font-size: var(--font-size-sm);
    font-weight: var(--font-weight-bold);
    color: white;
    text-shadow: 0 1px 2px rgba(0, 0, 0, 0.5);
  }

  .resources {
    display: flex;
    justify-content: space-around;
    margin-top: var(--space-3);
    padding-top: var(--space-3);
    border-top: 2px solid var(--color-bg-tertiary);
  }

  .resource {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--space-1);
  }

  .resource-icon {
    width: var(--space-5);
    height: var(--space-5);
    border-radius: var(--radius-sm);
  }

  .resource-icon.food {
    background: var(--color-success);
  }

  .resource-icon.gold {
    background: var(--color-warning);
  }

  .resource-icon.materials {
    background: var(--color-info);
  }

  .resource-value {
    font-size: var(--font-size-md);
    font-weight: var(--font-weight-bold);
    color: var(--color-text-primary);
  }

  .resource-label {
    font-size: var(--font-size-xs);
    color: var(--color-text-muted);
    text-transform: uppercase;
  }

  .event-preview {
    width: 100%;
    padding: var(--space-4);
    background: var(--color-bg-secondary);
    border: 3px solid var(--color-danger);
    border-radius: var(--radius-md);
    text-align: center;
  }

  .event-preview.loading {
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 120px;
  }

  .loading-spinner {
    width: 32px;
    height: 32px;
    border: 3px solid var(--color-bg-tertiary);
    border-top-color: var(--color-accent);
    border-radius: 50%;
    animation: spin 1s linear infinite;
  }

  .event-type {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: var(--space-2);
    margin-bottom: var(--space-2);
  }

  .type-icon {
    font-size: var(--font-size-lg);
  }

  .type-label {
    font-size: var(--font-size-sm);
    font-weight: var(--font-weight-bold);
    color: var(--color-danger);
    text-transform: uppercase;
    letter-spacing: 1px;
  }

  .event-name {
    margin: 0 0 var(--space-2);
    font-size: var(--font-size-xl);
    font-weight: var(--font-weight-bold);
    color: var(--color-text-primary);
  }

  .event-description {
    margin: 0;
    font-size: var(--font-size-sm);
    color: var(--color-text-secondary);
    line-height: 1.5;
  }

  .actions {
    width: 100%;
  }

  @media (max-width: 480px) {
    .day-start {
      padding: var(--space-3);
    }
  }
</style>
