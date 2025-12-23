<!-- PixelSurvivor/Menu.svelte - Main menu for Pixel Survivor mode -->
<script lang="ts">
  import { goto } from '$app/navigation';
  import { Button, Badge } from '../../atoms';
  import { t } from '$lib/i18n';
  import {
    survivorRun,
    survivorStats,
    hasActiveRunStore,
    initializeSurvivor,
    abandonRun,
    setPhase,
    enterCharacterCreation,
    showStatsScreen,
    showTutorial,
  } from '$lib/survivor';
  import { onMount } from 'svelte';

  let mounted = $state(false);
  let showAbandonConfirm = $state(false);

  onMount(() => {
    // Initialize survivor data from localStorage
    initializeSurvivor();

    setTimeout(() => {
      mounted = true;
    }, 100);
  });

  function handleNewRun() {
    if ($hasActiveRunStore) {
      showAbandonConfirm = true;
    } else {
      goToCharacterCreation();
    }
  }

  function goToCharacterCreation() {
    // Transition to character creation phase
    showAbandonConfirm = false;
    abandonRun();
    enterCharacterCreation();
  }

  function handleContinue() {
    if ($survivorRun) {
      setPhase($survivorRun.phase);
    }
  }

  function handleStatistics() {
    showStatsScreen.set(true);
  }

  function handleHowToPlay() {
    showTutorial.set(true);
  }

  function handleBackToModes() {
    goto('/play');
  }

  function cancelAbandon() {
    showAbandonConfirm = false;
  }

  function confirmAbandon() {
    goToCharacterCreation();
  }
</script>

<div class="survivor-wrapper" class:mounted>
  <!-- Hero Section -->
  <div class="hero-section">
    <div class="logo-container">
      <img src="/logo.png" alt="SpriteBox" class="logo" />
    </div>
    <div class="title-row">
      <h1 class="mode-title">{$t.pixelSurvivor.title}</h1>
      <Badge variant="warning" size="sm" text={$t.common.alpha} />
    </div>
    <p class="mode-description">{$t.pixelSurvivor.subtitle}</p>
  </div>

  <!-- Menu Card -->
  <div class="survivor-menu">
    {#if showAbandonConfirm}
      <!-- Abandon Confirmation -->
      <div class="confirm-panel">
        <p class="confirm-text">
          {$t.pixelSurvivor.day} {$survivorRun?.day ?? 1} - {$t.pixelSurvivor.level} {$survivorRun?.level ?? 1}
        </p>
        <p class="confirm-warning">
          {$t.pixelSurvivor.abandonWarning}
        </p>
        <div class="confirm-actions">
          <Button variant="danger" onclick={confirmAbandon}>
            {$t.pixelSurvivor.newRun}
          </Button>
          <Button variant="ghost" onclick={cancelAbandon}>
            {$t.common.cancel}
          </Button>
        </div>
      </div>
    {:else}
      <!-- Continue Run (if active) -->
      {#if $hasActiveRunStore}
        <div class="active-run-info">
          <span class="run-status">{$t.pixelSurvivor.day} {$survivorRun?.day ?? 1}/30</span>
          <span class="run-details">
            {$t.pixelSurvivor.level} {$survivorRun?.level ?? 1} · {$survivorRun?.hp ?? 100}/{$survivorRun?.maxHp ?? 100} {$t.pixelSurvivor.hp}
          </span>
        </div>
        <Button variant="primary" size="lg" fullWidth onclick={handleContinue}>
          {$t.pixelSurvivor.continueRun}
        </Button>
        <div class="divider">
          <span class="divider-line"></span>
          <span class="divider-text">{$t.common.or}</span>
          <span class="divider-line"></span>
        </div>
      {/if}

      <!-- New Run -->
      <Button
        variant={$hasActiveRunStore ? 'secondary' : 'primary'}
        size={$hasActiveRunStore ? 'md' : 'lg'}
        fullWidth
        onclick={handleNewRun}
      >
        {$t.pixelSurvivor.newRun}
      </Button>

      <!-- Statistics -->
      {#if $survivorStats.totalRuns > 0}
        <Button variant="ghost" fullWidth onclick={handleStatistics}>
          {$t.pixelSurvivor.statistics}
        </Button>
      {/if}

      <!-- How to Play -->
      <Button variant="ghost" fullWidth onclick={handleHowToPlay}>
        {$t.pixelSurvivor.howToPlay}
      </Button>
    {/if}
  </div>

  <!-- Stats Preview -->
  {#if $survivorStats.totalRuns > 0}
    <div class="stats-preview">
      <span class="stat-item">
        <span class="stat-value">{$survivorStats.totalRuns}</span>
        <span class="stat-label">{$t.pixelSurvivor.runs}</span>
      </span>
      <span class="stat-divider">·</span>
      <span class="stat-item">
        <span class="stat-value">{$survivorStats.totalWins}</span>
        <span class="stat-label">{$t.pixelSurvivor.wins}</span>
      </span>
      <span class="stat-divider">·</span>
      <span class="stat-item">
        <span class="stat-value">{$survivorStats.bestDayReached}</span>
        <span class="stat-label">{$t.pixelSurvivor.bestDayLabel}</span>
      </span>
    </div>
  {/if}

  <!-- Back to mode selection -->
  <button class="back-link" onclick={handleBackToModes}>
    ← {$t.common.backToModes}
  </button>
</div>

<style>
  .survivor-wrapper {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--space-6);
    width: 100%;
    max-width: 360px;
    opacity: 0;
    transform: translateY(20px);
    transition: all 0.4s ease;
  }

  .survivor-wrapper.mounted {
    opacity: 1;
    transform: translateY(0);
  }

  .hero-section {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--space-3);
    text-align: center;
  }

  .logo-container {
    display: flex;
    justify-content: center;
  }

  .logo {
    width: 180px;
    height: auto;
    image-rendering: pixelated;
    image-rendering: crisp-edges;
  }

  .title-row {
    display: flex;
    align-items: center;
    gap: var(--space-2);
  }

  .mode-title {
    margin: 0;
    font-size: var(--font-size-2xl);
    font-weight: var(--font-weight-bold);
    color: var(--color-danger);
    text-transform: uppercase;
    letter-spacing: 3px;
    text-shadow: 2px 2px 0 rgba(0, 0, 0, 0.3);
  }

  .mode-description {
    margin: 0;
    font-size: var(--font-size-sm);
    color: var(--color-text-secondary);
    max-width: 300px;
    line-height: 1.5;
  }

  .survivor-menu {
    width: 100%;
    display: flex;
    flex-direction: column;
    gap: var(--space-4);
    padding: var(--space-6);
    background: var(--color-bg-secondary);
    border: 3px solid var(--color-bg-tertiary);
    border-radius: var(--radius-md);
  }

  .active-run-info {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--space-1);
    padding: var(--space-3);
    background: var(--color-bg-tertiary);
    border-radius: var(--radius-sm);
    text-align: center;
  }

  .run-status {
    font-size: var(--font-size-lg);
    font-weight: var(--font-weight-bold);
    color: var(--color-warning);
  }

  .run-details {
    font-size: var(--font-size-sm);
    color: var(--color-text-secondary);
  }

  .divider {
    display: flex;
    align-items: center;
    gap: var(--space-3);
    margin: var(--space-2) 0;
  }

  .divider-line {
    flex: 1;
    height: 2px;
    background: var(--color-bg-tertiary);
  }

  .divider-text {
    font-size: var(--font-size-sm);
    color: var(--color-text-muted);
    text-transform: uppercase;
    letter-spacing: 2px;
  }

  .confirm-panel {
    display: flex;
    flex-direction: column;
    gap: var(--space-4);
    text-align: center;
  }

  .confirm-text {
    margin: 0;
    font-size: var(--font-size-lg);
    font-weight: var(--font-weight-bold);
    color: var(--color-warning);
  }

  .confirm-warning {
    margin: 0;
    font-size: var(--font-size-sm);
    color: var(--color-text-secondary);
  }

  .confirm-actions {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
  }

  .stats-preview {
    display: flex;
    align-items: center;
    gap: var(--space-3);
    padding: var(--space-3) var(--space-4);
    background: var(--color-bg-secondary);
    border: 2px solid var(--color-bg-tertiary);
    border-radius: var(--radius-sm);
  }

  .stat-item {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 2px;
  }

  .stat-value {
    font-size: var(--font-size-lg);
    font-weight: var(--font-weight-bold);
    color: var(--color-accent);
  }

  .stat-label {
    font-size: var(--font-size-xs);
    color: var(--color-text-muted);
    text-transform: uppercase;
    letter-spacing: 1px;
  }

  .stat-divider {
    color: var(--color-text-muted);
  }

  .back-link {
    display: inline-flex;
    align-items: center;
    gap: var(--space-1);
    padding: var(--space-2) var(--space-3);
    background: transparent;
    border: none;
    font-family: var(--font-family);
    font-size: var(--font-size-sm);
    color: var(--color-text-muted);
    cursor: pointer;
    transition: color var(--transition-fast);
  }

  .back-link:hover {
    color: var(--color-accent);
  }

  /* Mobile adjustments */
  @media (max-width: 480px) {
    .logo {
      width: 140px;
    }

    .mode-title {
      font-size: var(--font-size-xl);
    }

    .survivor-menu {
      padding: var(--space-4);
    }
  }
</style>
