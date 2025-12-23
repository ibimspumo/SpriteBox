<!-- Pixel Survivor Page - /play/survivor -->
<!-- Single-player roguelike mode - no socket connection needed -->
<script lang="ts">
  import { onMount } from 'svelte';
  import { t } from '$lib/i18n';
  import {
    SurvivorMenu,
    CharacterCreation,
    DayStart,
    SurvivorEvent,
    SurvivorResult,
    LevelUp,
    BossBattle,
    GameOver,
    Victory,
    SurvivorStatistics,
    HowToPlay,
  } from '$lib/components/features';
  import {
    survivorPhase,
    survivorRun,
    showStatsScreen,
    showTutorial,
    initializeSurvivor,
    startNewDay,
  } from '$lib/survivor';

  let mounted = $state(false);

  onMount(() => {
    // Initialize survivor data from localStorage
    initializeSurvivor();

    setTimeout(() => {
      mounted = true;
    }, 100);
  });

  // Current phase determines which component to show
  const phase = $derived($survivorPhase);
  const run = $derived($survivorRun);

  // Trigger day start when entering day-start phase without an event
  $effect(() => {
    if (phase === 'survivor-day-start' && run && !run.currentEvent) {
      startNewDay();
    }
  });
</script>

<div class="survivor-page" class:mounted>
  <div class="survivor-container">
    {#if phase === 'survivor-menu'}
      <SurvivorMenu />
    {:else if phase === 'survivor-character'}
      <CharacterCreation />
    {:else if phase === 'survivor-day-start'}
      <DayStart />
    {:else if phase === 'survivor-event'}
      <SurvivorEvent />
    {:else if phase === 'survivor-drawing'}
      <!-- Drawing submitted, show result -->
      <SurvivorResult />
    {:else if phase === 'survivor-result'}
      <SurvivorResult />
    {:else if phase === 'survivor-levelup'}
      <LevelUp />
    {:else if phase === 'survivor-boss'}
      <BossBattle />
    {:else if phase === 'survivor-gameover'}
      <GameOver />
    {:else if phase === 'survivor-victory'}
      <Victory />
    {:else}
      <!-- Fallback to menu -->
      <SurvivorMenu />
    {/if}
  </div>

  <!-- Statistics Modal -->
  <SurvivorStatistics
    show={$showStatsScreen}
    onclose={() => showStatsScreen.set(false)}
  />

  <!-- How to Play Modal -->
  <HowToPlay
    show={$showTutorial}
    onclose={() => showTutorial.set(false)}
  />
</div>

<style>
  .survivor-page {
    min-height: 100vh;
    display: flex;
    flex-direction: column;
    background:
      radial-gradient(ellipse at 30% 20%, rgba(255, 100, 100, 0.08) 0%, transparent 50%),
      radial-gradient(ellipse at 70% 80%, rgba(255, 200, 100, 0.06) 0%, transparent 50%),
      var(--color-bg-primary);
    opacity: 0;
    transition: opacity 0.3s ease;
  }

  .survivor-page.mounted {
    opacity: 1;
  }

  .survivor-container {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: var(--space-6);
  }

  @media (max-width: 640px) {
    .survivor-container {
      padding: var(--space-4);
    }
  }
</style>
