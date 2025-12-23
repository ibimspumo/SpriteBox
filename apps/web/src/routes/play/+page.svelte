<!-- Mode Selection Page - /play -->
<script lang="ts">
  import { goto } from '$app/navigation';
  import { onMount } from 'svelte';
  import { t } from '$lib/i18n';
  import { onlineCountByMode, availableGameModes, selectedGameMode, currentUser } from '$lib/stores';
  import { ModeCard, UsernameEditor } from '$lib/components/molecules';
  import { Button } from '$lib/components/atoms';
  import { getSlugFromMode } from '$lib/modeRoutes';

  let mounted = $state(false);

  onMount(() => {
    setTimeout(() => {
      mounted = true;
    }, 100);
  });

  function selectMode(modeId: string) {
    selectedGameMode.set(modeId);
    const slug = getSlugFromMode(modeId);
    if (slug) {
      goto(`/play/${slug}`);
    }
  }

  function goHome() {
    goto('/');
  }
</script>

<div class="mode-selection" class:mounted>
  <div class="header">
    <button class="back-link" onclick={goHome}>
      <span class="back-arrow">&larr;</span>
      {$t.common.backToHome}
    </button>
  </div>

  <div class="content">
    <h1 class="title">{$t.modeSelection.title}</h1>

    <div class="mode-grid">
      {#each $availableGameModes as mode, i}
        <div
          class="mode-card-wrapper"
          style="animation-delay: {0.1 + i * 0.1}s"
        >
          <ModeCard
            {mode}
            playerCount={$onlineCountByMode[mode.id] ?? 0}
            selected={$selectedGameMode === mode.id}
            onclick={() => selectMode(mode.id)}
          />
        </div>
      {/each}
    </div>
  </div>

  {#if $currentUser}
    <div class="footer">
      <UsernameEditor
        displayName={$currentUser.displayName}
        discriminator={$currentUser.discriminator}
      />
    </div>
  {/if}
</div>

<style>
  .mode-selection {
    min-height: 100vh;
    display: flex;
    flex-direction: column;
    padding: var(--space-6);
    background:
      radial-gradient(ellipse at 30% 20%, rgba(78, 205, 196, 0.08) 0%, transparent 50%),
      radial-gradient(ellipse at 70% 80%, rgba(245, 166, 35, 0.06) 0%, transparent 50%),
      var(--color-bg-primary);
  }

  .header {
    display: flex;
    justify-content: flex-start;
    align-items: center;
    margin-bottom: var(--space-8);
    opacity: 0;
    transform: translateY(-10px);
    transition: all 0.4s ease;
  }

  .mounted .header {
    opacity: 1;
    transform: translateY(0);
  }

  .back-link {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    background: none;
    border: none;
    color: var(--color-text-secondary);
    font-family: var(--font-family);
    font-size: var(--font-size-sm);
    cursor: pointer;
    padding: var(--space-2) var(--space-3);
    border-radius: var(--radius-sm);
    transition: var(--transition-fast);
  }

  .back-link:hover {
    color: var(--color-accent);
    background: var(--color-bg-secondary);
  }

  .back-arrow {
    font-size: var(--font-size-lg);
  }

  .content {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: var(--space-8);
  }

  .title {
    margin: 0;
    font-size: var(--font-size-2xl);
    font-weight: var(--font-weight-bold);
    color: var(--color-text-primary);
    text-align: center;
    opacity: 0;
    transform: translateY(20px);
    transition: all 0.5s ease 0.1s;
  }

  .mounted .title {
    opacity: 1;
    transform: translateY(0);
  }

  .mode-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(280px, 320px));
    justify-content: center;
    gap: var(--space-6);
    max-width: 700px;
    width: 100%;
  }

  .mode-card-wrapper {
    display: flex;
    justify-content: center;
    opacity: 0;
    transform: translateY(20px);
    animation: fadeSlideUp 0.5s ease forwards;
  }

  .mounted .mode-card-wrapper {
    animation-play-state: running;
  }

  .footer {
    display: flex;
    justify-content: center;
    padding-top: var(--space-8);
    opacity: 0;
    transform: translateY(10px);
    transition: all 0.4s ease 0.4s;
  }

  .mounted .footer {
    opacity: 1;
    transform: translateY(0);
  }

  @media (max-width: 640px) {
    .mode-selection {
      padding: var(--space-4);
    }

    .title {
      font-size: var(--font-size-xl);
    }

    .mode-grid {
      grid-template-columns: 1fr;
    }
  }
</style>
