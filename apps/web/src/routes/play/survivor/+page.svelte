<!-- Pixel Survivor Page - /play/survivor -->
<!-- Single-player roguelike mode with persistent game shell -->
<script lang="ts">
  import { onMount } from 'svelte';
  import {
    SurvivorMenu,
    CharacterCreation,
    SurvivorStatistics,
    HowToPlay,
    GameplayDemo,
  } from '$lib/components/features';
  import { SurvivorGameShell } from '$lib/components/organisms';
  import {
    survivorPhase,
    showStatsScreen,
    showTutorial,
    initializeSurvivor,
    exitGameplay,
    D20Tester,
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

  // Is this a gameplay phase that needs the shell?
  const isGameplayPhase = $derived(phase === 'survivor-gameplay');

  function handleHomeClick(): void {
    exitGameplay();
  }
</script>

<div class="survivor-page" class:mounted>
  {#if isGameplayPhase}
    <!-- Gameplay phases use the persistent game shell -->
    <SurvivorGameShell
      gold={125}
      showSidebar={true}
      onhome={handleHomeClick}
    >
      <GameplayDemo />
    </SurvivorGameShell>
  {:else}
    <!-- Non-gameplay phases (menu, character creation) have their own layout -->
    <div class="survivor-container">
      {#if phase === 'survivor-menu'}
        <SurvivorMenu />
      {:else if phase === 'survivor-character'}
        <CharacterCreation />
      {:else}
        <!-- Fallback to menu -->
        <SurvivorMenu />
      {/if}
    </div>
  {/if}

  <!-- Statistics Modal (available in all phases) -->
  <SurvivorStatistics
    show={$showStatsScreen}
    onclose={() => showStatsScreen.set(false)}
  />

  <!-- How to Play Modal (available in all phases) -->
  <HowToPlay
    show={$showTutorial}
    onclose={() => showTutorial.set(false)}
  />

  <!-- D20 Tester (Dev Mode Only) -->
  <D20Tester />
</div>

<style>
  .survivor-page {
    min-height: 100vh;
    display: flex;
    flex-direction: column;
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
    background:
      radial-gradient(ellipse at 30% 20%, rgba(255, 100, 100, 0.08) 0%, transparent 50%),
      radial-gradient(ellipse at 70% 80%, rgba(255, 200, 100, 0.06) 0%, transparent 50%),
      var(--color-bg-primary);
  }

  @media (max-width: 640px) {
    .survivor-container {
      padding: var(--space-4);
    }
  }
</style>
