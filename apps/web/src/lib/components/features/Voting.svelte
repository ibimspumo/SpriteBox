<!-- Voting Feature Component - Dramatic Duel Presentation -->
<script lang="ts">
  import { voting } from '$lib/stores';
  import { vote } from '$lib/socketBridge';
  import { t } from '$lib/i18n';
  import { Timer } from '../utility';
  import { onMount } from 'svelte';
  import { VotingContenderCard, VSBadge } from './Voting';

  let mounted = $state(false);
  let showCards = $state(false);

  onMount(() => {
    requestAnimationFrame(() => {
      mounted = true;
      // Stagger the card reveal
      setTimeout(() => {
        showCards = true;
      }, 200);
    });
  });

  // Reset animation on new round
  $effect(() => {
    if ($voting.round) {
      showCards = false;
      setTimeout(() => {
        showCards = true;
      }, 100);
    }
  });

  function handleVote(chosenId: string): void {
    vote(chosenId);
  }

</script>

<div class="voting-phase" class:mounted>
  <!-- Background -->
  <div class="phase-background" aria-hidden="true">
    <div class="bg-gradient"></div>
  </div>

  <!-- Main Content -->
  <div class="voting-content">
    <!-- Header -->
    <header class="voting-header">
      <div class="round-badge">
        <span class="round-label">{$t.voting.round}</span>
        <span class="round-numbers">
          <span class="current">{$voting.round}</span>
          <span class="separator">/</span>
          <span class="total">{$voting.totalRounds}</span>
        </span>
      </div>
      <div class="timer-section">
        <Timer />
      </div>
    </header>

    {#if $voting.hasVoted}
      <!-- Voted State -->
      <div class="voted-container">
        <div class="voted-card">
          <div class="voted-content">
            <span class="voted-icon">✓</span>
            <span class="voted-text">{$t.voting.voted}</span>
            <span class="waiting-text">{$t.voting.waitingForNextRound}</span>
          </div>
          <div class="voted-shimmer"></div>
        </div>
      </div>
    {:else if $voting.imageA && $voting.imageB}
      <!-- Instruction -->
      <div class="instruction">
        <span class="instruction-text">{$t.voting.whichIsBetter}</span>
      </div>

      <!-- Duel Arena -->
      <div class="duel-arena">
        <!-- Left Contender -->
        <VotingContenderCard
          position="left"
          pixelData={$voting.imageA.pixels}
          ariaLabel={$t.voting.voteForImageA}
          show={showCards}
          onVote={() => handleVote($voting.imageA!.playerId)}
        />

        <!-- VS Badge -->
        <VSBadge show={showCards} />

        <!-- Right Contender -->
        <VotingContenderCard
          position="right"
          pixelData={$voting.imageB.pixels}
          ariaLabel={$t.voting.voteForImageB}
          show={showCards}
          onVote={() => handleVote($voting.imageB!.playerId)}
        />
      </div>
    {:else}
      <!-- Loading State -->
      <div class="loading-container">
        <div class="loading-card">
          <div class="loading-spinner"></div>
          <span class="loading-text">{$t.voting.loadingImages}</span>
        </div>
      </div>
    {/if}
  </div>
</div>

<style>
  .voting-phase {
    position: relative;
    min-height: 100dvh;
    width: 100%;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }

  /* ===== Animated Background ===== */
  .phase-background {
    position: fixed;
    inset: 0;
    pointer-events: none;
    z-index: 0;
  }

  .bg-gradient {
    position: absolute;
    inset: 0;
    background: radial-gradient(ellipse at 50% 30%, rgba(78, 205, 196, 0.08) 0%, transparent 50%);
  }

  /* ===== Main Content ===== */
  .voting-content {
    position: relative;
    z-index: 1;
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: var(--space-4);
    gap: var(--space-5);
  }

  /* ===== Header ===== */
  .voting-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    width: 100%;
    max-width: 400px;
    gap: var(--space-3);
    opacity: 0;
    transform: translateY(-20px);
    transition: all 0.5s cubic-bezier(0.34, 1.56, 0.64, 1);
  }

  .mounted .voting-header {
    opacity: 1;
    transform: translateY(0);
  }

  .round-badge {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    padding: var(--space-2) var(--space-4);
    background: rgba(26, 26, 62, 0.9);
    border: 2px solid var(--color-brand);
    border-radius: var(--radius-full);
    backdrop-filter: blur(10px);
    box-shadow: 0 0 20px rgba(245, 166, 35, 0.2);
  }

  .round-label {
    font-size: var(--font-size-xs);
    color: var(--color-text-muted);
    text-transform: uppercase;
    letter-spacing: 1px;
  }

  .round-numbers {
    display: flex;
    align-items: center;
    gap: var(--space-1);
  }

  .current {
    font-size: var(--font-size-lg);
    font-weight: var(--font-weight-bold);
    color: var(--color-brand);
  }

  .separator {
    color: var(--color-text-muted);
  }

  .total {
    font-size: var(--font-size-sm);
    color: var(--color-text-secondary);
  }

  .timer-section {
    opacity: 0;
    transform: translateY(-10px);
    transition: all 0.4s ease;
  }

  .mounted .timer-section {
    opacity: 1;
    transform: translateY(0);
  }

  /* ===== Instruction ===== */
  .instruction {
    opacity: 0;
    transform: translateY(10px);
    transition: all 0.4s ease 0.2s;
  }

  .mounted .instruction {
    opacity: 1;
    transform: translateY(0);
  }

  .instruction-text {
    font-size: var(--font-size-lg);
    font-weight: var(--font-weight-bold);
    color: var(--color-text-primary);
    text-transform: uppercase;
    letter-spacing: 1px;
    text-shadow: 0 2px 10px rgba(0, 0, 0, 0.5);
  }

  /* ===== Duel Arena ===== */
  .duel-arena {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: var(--space-4);
    width: 100%;
    max-width: 400px;
  }

  /* ===== Voted State ===== */
  .voted-container {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .voted-card {
    position: relative;
    overflow: hidden;
    padding: var(--space-8);
    background: linear-gradient(145deg, rgba(34, 197, 94, 0.15) 0%, rgba(34, 197, 94, 0.05) 100%);
    border: 3px solid var(--color-success);
    border-radius: var(--radius-xl);
    box-shadow: 0 0 40px rgba(34, 197, 94, 0.3);
    animation: voteIn 0.5s cubic-bezier(0.34, 1.56, 0.64, 1);
  }

  @keyframes voteIn {
    0% { transform: scale(0.8); opacity: 0; }
    100% { transform: scale(1); opacity: 1; }
  }

  .voted-content {
    position: relative;
    z-index: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--space-3);
    text-align: center;
  }

  .voted-icon {
    font-size: 3rem;
    color: var(--color-success);
    text-shadow: 0 0 20px rgba(34, 197, 94, 0.5);
  }

  .voted-text {
    font-size: var(--font-size-xl);
    font-weight: var(--font-weight-bold);
    color: var(--color-success);
    text-transform: uppercase;
    letter-spacing: 2px;
  }

  .waiting-text {
    font-size: var(--font-size-sm);
    color: var(--color-text-secondary);
    animation: pulse 2s ease-in-out infinite;
  }

  .voted-shimmer {
    position: absolute;
    top: 0;
    left: -100%;
    width: 50%;
    height: 100%;
    background: linear-gradient(90deg, transparent 0%, rgba(34, 197, 94, 0.2) 50%, transparent 100%);
    animation: shimmer 2s ease-in-out infinite;
  }

  @keyframes shimmer {
    0% { left: -100%; }
    100% { left: 200%; }
  }

  /* ===== Loading State ===== */
  .loading-container {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .loading-card {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--space-4);
    padding: var(--space-8);
    background: var(--color-bg-secondary);
    border: 2px solid var(--color-border);
    border-radius: var(--radius-xl);
  }

  .loading-spinner {
    width: 40px;
    height: 40px;
    border: 4px solid var(--color-bg-tertiary);
    border-top-color: var(--color-accent);
    border-radius: 50%;
    animation: spin 1s linear infinite;
  }

  .loading-text {
    font-size: var(--font-size-sm);
    color: var(--color-text-secondary);
    text-transform: uppercase;
    letter-spacing: 1px;
  }

  /* ===== Responsive ===== */
  @media (min-width: 640px) {
    .duel-arena {
      flex-direction: row;
      max-width: 700px;
    }
  }

  /* Reduce motion */
  @media (prefers-reduced-motion: reduce) {
    .voted-shimmer,
    .loading-spinner {
      animation: none;
    }

    .voting-header,
    .instruction,
    .voted-card,
    .timer-section {
      transition: opacity 0.2s ease;
      transform: none;
    }
  }
</style>
