<!-- Results Feature Component - Celebration Podium -->
<script lang="ts">
  import { goto } from '$app/navigation';
  import { onMount, onDestroy } from 'svelte';
  import { results, currentUser, localizedResultsPrompt } from '$lib/stores';
  import { returnToLobby } from '$lib/socketBridge';
  import { t } from '$lib/i18n';
  import { Button } from '../atoms';
  import { PromptDisplay } from '../molecules';
  import ResultsPodium from './Results/ResultsPodium.svelte';
  import ResultsGallery from './Results/ResultsGallery.svelte';

  let mounted = $state(false);

  // Auto-redirect to /play after 30 seconds of inactivity
  const REDIRECT_DELAY = 30000;
  let redirectTimer: ReturnType<typeof setTimeout> | null = null;
  let interacted = $state(false);

  function resetRedirectTimer(): void {
    if (redirectTimer) clearTimeout(redirectTimer);
    if (!interacted) {
      redirectTimer = setTimeout(() => {
        goto('/play');
      }, REDIRECT_DELAY);
    }
  }

  function handlePlayAgain(): void {
    interacted = true;
    if (redirectTimer) clearTimeout(redirectTimer);
    returnToLobby();
  }

  function handleDifferentMode(): void {
    interacted = true;
    if (redirectTimer) clearTimeout(redirectTimer);
    goto('/play');
  }

  onMount(() => {
    resetRedirectTimer();
    requestAnimationFrame(() => {
      mounted = true;
    });
  });

  onDestroy(() => {
    if (redirectTimer) clearTimeout(redirectTimer);
  });
</script>

<div class="results-phase" class:mounted>
  <!-- Background -->
  <div class="phase-background" aria-hidden="true">
    <div class="bg-gradient"></div>
  </div>

  {#if $results}
    <div class="results-content">
      <!-- Header -->
      <header class="results-header">
        <div class="title-section">
          <span class="trophy">🏆</span>
          <h2 class="title">{$t.results.title}</h2>
          <span class="trophy">🏆</span>
        </div>
        <div class="prompt-wrapper">
          <PromptDisplay prompt={$localizedResultsPrompt} label={$t.results.prompt} size="md" centered />
        </div>
      </header>

      <!-- Next Round Actions -->
      <div class="next-round-section">
        <p class="next-round-text">{$t.results.nextRoundStarting}</p>
        <div class="action-buttons">
          <Button variant="primary" onclick={handlePlayAgain}>
            {$t.results.returnToLobby}
          </Button>
          <Button variant="secondary" onclick={handleDifferentMode}>
            {$t.common.differentMode}
          </Button>
        </div>
      </div>

      <!-- Podium -->
      <ResultsPodium
        rankings={$results.rankings}
        currentUserFullName={$currentUser?.fullName}
        {mounted}
      />

      <!-- Gallery Section -->
      <ResultsGallery
        rankings={$results.rankings}
        totalParticipants={$results.totalParticipants}
        currentUserFullName={$currentUser?.fullName}
        {mounted}
      />
    </div>
  {/if}
</div>

<style>
  .results-phase {
    position: relative;
    min-height: 100dvh;
    width: 100%;
    display: flex;
    flex-direction: column;
    overflow-x: hidden;
  }

  /* ===== Animated Background ===== */
  .phase-background {
    position: fixed;
    inset: 0;
    pointer-events: none;
    z-index: 0;
    overflow: hidden;
  }

  .bg-gradient {
    position: absolute;
    inset: 0;
    background: radial-gradient(ellipse at 50% 0%, rgba(245, 166, 35, 0.12) 0%, transparent 50%);
  }

  /* ===== Main Content ===== */
  .results-content {
    position: relative;
    z-index: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--space-6);
    padding: var(--space-4);
    padding-bottom: var(--space-8);
    width: 100%;
    max-width: 1000px;
    margin: 0 auto;
  }

  /* ===== Header ===== */
  .results-header {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--space-4);
    width: 100%;
    padding: var(--space-5);
    background: rgba(26, 26, 62, 0.9);
    border: 2px solid var(--color-brand);
    border-radius: var(--radius-lg);
    backdrop-filter: blur(10px);
    box-shadow: 0 0 40px rgba(245, 166, 35, 0.3);
    opacity: 0;
    transform: translateY(-20px);
    transition: all 0.6s cubic-bezier(0.34, 1.56, 0.64, 1);
  }

  .mounted .results-header {
    opacity: 1;
    transform: translateY(0);
  }

  .title-section {
    display: flex;
    align-items: center;
    gap: var(--space-3);
  }

  .trophy {
    font-size: 2rem;
    animation: bounce 1s ease-in-out infinite;
  }

  .title {
    margin: 0;
    font-size: var(--font-size-2xl);
    font-weight: var(--font-weight-bold);
    color: var(--color-brand);
    text-transform: uppercase;
    letter-spacing: 2px;
    text-shadow: 0 0 30px rgba(245, 166, 35, 0.5);
  }

  .prompt-wrapper {
    width: 100%;
    max-width: 400px;
  }

  /* ===== Next Round Section ===== */
  .next-round-section {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--space-3);
    padding: var(--space-4);
    background: rgba(26, 26, 62, 0.9);
    border: 2px solid var(--color-accent);
    border-radius: var(--radius-lg);
    backdrop-filter: blur(10px);
    box-shadow: 0 0 30px rgba(78, 205, 196, 0.2);
    width: 100%;
    max-width: 400px;
    opacity: 0;
    transform: translateY(20px);
    transition: all 0.5s ease 0.2s;
  }

  .mounted .next-round-section {
    opacity: 1;
    transform: translateY(0);
  }

  .next-round-text {
    font-size: var(--font-size-md);
    font-weight: var(--font-weight-bold);
    color: var(--color-accent);
    text-transform: uppercase;
    letter-spacing: 1px;
    margin: 0;
    text-align: center;
    animation: pulse 2s ease-in-out infinite;
  }

  .action-buttons {
    display: flex;
    gap: var(--space-3);
    flex-wrap: wrap;
    justify-content: center;
  }

  /* ===== Responsive ===== */
  @media (max-width: 768px) {
    .title {
      font-size: var(--font-size-xl);
    }

    .trophy {
      font-size: 1.5rem;
    }
  }

  @media (max-width: 380px) {
    .results-header {
      padding: var(--space-4);
    }
  }

  /* Reduce motion */
  @media (prefers-reduced-motion: reduce) {
    .trophy {
      animation: none;
    }

    .results-header,
    .next-round-section {
      transition: opacity 0.2s ease;
      transform: none;
    }
  }
</style>
