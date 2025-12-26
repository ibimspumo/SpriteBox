<!-- Finale Feature Component - Premium Gallery Showcase -->
<script lang="ts">
  import { finale, finaleVoted, currentUser } from '$lib/stores';
  import { finaleVote } from '$lib/socketBridge';
  import { t } from '$lib/i18n';
  import { Badge } from '../atoms';
  import { PixelCanvas, Timer } from '../utility';
  import { onMount } from 'svelte';

  let mounted = $state(false);

  onMount(() => {
    requestAnimationFrame(() => {
      mounted = true;
    });
  });

  let myPlayerId = $derived($currentUser?.fullName ?? '');

</script>

<div class="finale-phase" class:mounted>
  <!-- Background -->
  <div class="phase-background" aria-hidden="true">
    <div class="bg-gradient"></div>
  </div>

  <!-- Main Content -->
  <div class="finale-content">
    <!-- Header -->
    <header class="finale-header">
      <div class="title-section">
        <div class="trophy-icon">🏆</div>
        <h2 class="title">{$t.finale.title}</h2>
        <div class="title-glow"></div>
      </div>
      <div class="timer-section">
        <Timer />
      </div>
    </header>

    <!-- Instruction -->
    <div class="instruction">
      <span class="instruction-text">{$t.finale.pickYourFavorite}</span>
    </div>

    {#if $finaleVoted}
      <!-- Voted State -->
      <div class="voted-container">
        <div class="voted-card">
          <div class="voted-content">
            <span class="voted-icon">✓</span>
            <span class="voted-text">{$t.finale.votedResultsSoon}</span>
          </div>
          <div class="voted-shimmer"></div>
        </div>
      </div>
    {:else if $finale}
      <!-- Gallery Grid -->
      <div class="gallery">
        {#each $finale.finalists as finalist, index}
          {@const isOwn = finalist.user?.fullName === myPlayerId}
          <button
            class="finalist-card"
            class:own={isOwn}
            class:disabled={isOwn}
            style="--delay: {index * 0.08}s"
            onclick={isOwn ? undefined : () => finaleVote(finalist.playerId)}
            disabled={isOwn}
            aria-label={isOwn ? $t.finale.yourArt : `${$t.voting.clickToVote}: ${finalist.user?.fullName}`}
          >
            <div class="card-glow"></div>

            {#if isOwn}
              <div class="own-badge">
                <Badge variant="default" text={$t.finale.yourArt} />
              </div>
            {/if}

            <div class="canvas-frame">
              <PixelCanvas
                pixelData={finalist.pixels}
                size={100}
                readonly
              />
            </div>

            <div class="finalist-info">
              <span class="finalist-name">{finalist.user?.fullName ?? $t.common.anonymous}</span>
              <div class="elo-badge">
                <span class="elo-icon">⭐</span>
                <span class="elo-value">{finalist.elo}</span>
              </div>
            </div>

            {#if !isOwn}
              <div class="vote-hint">
                <span>👆</span>
              </div>
            {/if}
          </button>
        {/each}
      </div>
    {/if}
  </div>
</div>

<style>
  .finale-phase {
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
    background: radial-gradient(ellipse at 50% 0%, rgba(245, 166, 35, 0.1) 0%, transparent 50%);
  }

  /* ===== Main Content ===== */
  .finale-content {
    position: relative;
    z-index: 1;
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: var(--space-4);
    gap: var(--space-5);
    max-width: 900px;
    margin: 0 auto;
    width: 100%;
  }

  /* ===== Header ===== */
  .finale-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    width: 100%;
    gap: var(--space-3);
    opacity: 0;
    transform: translateY(-20px);
    transition: all 0.6s cubic-bezier(0.34, 1.56, 0.64, 1);
  }

  .mounted .finale-header {
    opacity: 1;
    transform: translateY(0);
  }

  .title-section {
    position: relative;
    display: flex;
    align-items: center;
    gap: var(--space-3);
    padding: var(--space-3) var(--space-5);
    background: rgba(26, 26, 62, 0.9);
    border: 2px solid var(--color-brand);
    border-radius: var(--radius-lg);
    backdrop-filter: blur(10px);
    box-shadow: 0 0 30px rgba(245, 166, 35, 0.3);
    overflow: hidden;
  }

  .trophy-icon {
    font-size: 1.5rem;
    animation: bounce 1s ease-in-out infinite;
  }

  .title {
    margin: 0;
    font-size: var(--font-size-xl);
    font-weight: var(--font-weight-bold);
    color: var(--color-brand);
    text-transform: uppercase;
    letter-spacing: 2px;
    text-shadow: 0 0 20px rgba(245, 166, 35, 0.5);
  }

  .title-glow {
    position: absolute;
    inset: 0;
    background: radial-gradient(ellipse at center, rgba(245, 166, 35, 0.1) 0%, transparent 70%);
    animation: glowPulse 3s ease-in-out infinite;
  }

  @keyframes glowPulse {
    0%, 100% { opacity: 0.5; }
    50% { opacity: 1; }
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
    transition: all 0.5s ease 0.1s;
  }

  .mounted .instruction {
    opacity: 1;
    transform: translateY(0);
  }

  .instruction-text {
    font-size: var(--font-size-md);
    font-weight: var(--font-weight-bold);
    color: var(--color-text-primary);
    text-transform: uppercase;
    letter-spacing: 1px;
    padding: var(--space-2) var(--space-4);
    background: rgba(26, 26, 62, 0.8);
    border: 2px solid var(--color-border-strong);
    border-radius: var(--radius-md);
  }

  /* ===== Gallery ===== */
  .gallery {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: var(--space-4);
    width: 100%;
  }

  .finalist-card {
    position: relative;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--space-3);
    padding: var(--space-4);
    background: linear-gradient(145deg, var(--color-bg-secondary) 0%, var(--color-bg-tertiary) 100%);
    border: 3px solid var(--color-border-strong);
    border-radius: var(--radius-lg);
    cursor: pointer;
    font-family: var(--font-family);
    box-shadow: var(--shadow-pixel-lg);
    opacity: 0;
    transform: translateY(20px) scale(0.95);
    transition: all 0.5s cubic-bezier(0.34, 1.56, 0.64, 1);
    transition-delay: var(--delay, 0s);
  }

  .mounted .finalist-card {
    opacity: 1;
    transform: translateY(0) scale(1);
  }

  .finalist-card:not(.disabled):hover,
  .finalist-card:not(.disabled):focus-visible {
    transform: translateY(-4px) scale(1.02);
    border-color: var(--color-brand);
    box-shadow:
      var(--shadow-pixel-lg),
      0 0 40px rgba(245, 166, 35, 0.3);
  }

  .finalist-card:not(.disabled):active {
    transform: translateY(-2px) scale(1);
  }

  .finalist-card:focus-visible {
    outline: 2px solid var(--color-brand);
    outline-offset: 4px;
  }

  .finalist-card.own {
    border-color: var(--color-accent);
    cursor: default;
  }

  .finalist-card.disabled {
    cursor: not-allowed;
  }

  .card-glow {
    position: absolute;
    inset: -10px;
    border-radius: var(--radius-xl);
    background: radial-gradient(circle at center, rgba(245, 166, 35, 0.15) 0%, transparent 70%);
    opacity: 0;
    transition: opacity 0.3s ease;
    pointer-events: none;
  }

  .finalist-card:not(.disabled):hover .card-glow {
    opacity: 1;
  }

  .own-badge {
    position: absolute;
    top: var(--space-2);
    right: var(--space-2);
    z-index: 2;
  }

  .canvas-frame {
    position: relative;
    padding: var(--space-2);
    max-width: 100%;
    box-sizing: border-box;
    background: var(--color-bg-primary);
    border-radius: var(--radius-md);
    border: 2px solid var(--color-bg-elevated);
    transition: border-color 0.3s ease;
  }

  .finalist-card:not(.disabled):hover .canvas-frame {
    border-color: var(--color-brand);
  }

  .finalist-info {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--space-1);
  }

  .finalist-name {
    font-size: var(--font-size-sm);
    font-weight: var(--font-weight-bold);
    color: var(--color-text-primary);
    text-transform: uppercase;
    letter-spacing: 1px;
    text-align: center;
    max-width: 120px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .elo-badge {
    display: flex;
    align-items: center;
    gap: var(--space-1);
    padding: var(--space-1) var(--space-2);
    background: rgba(245, 166, 35, 0.15);
    border-radius: var(--radius-full);
    border: 1px solid rgba(245, 166, 35, 0.3);
  }

  .elo-icon {
    font-size: 0.8rem;
  }

  .elo-value {
    font-size: var(--font-size-xs);
    font-weight: var(--font-weight-bold);
    color: var(--color-brand);
  }

  .vote-hint {
    position: absolute;
    bottom: var(--space-2);
    right: var(--space-2);
    font-size: 1.2rem;
    opacity: 0.5;
    transition: all 0.3s ease;
    animation: bounce 1s ease-in-out infinite;
  }

  .finalist-card:hover .vote-hint {
    opacity: 1;
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
    font-size: var(--font-size-lg);
    font-weight: var(--font-weight-bold);
    color: var(--color-success);
    text-transform: uppercase;
    letter-spacing: 2px;
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

  /* ===== Responsive ===== */
  @media (min-width: 640px) {
    .gallery {
      grid-template-columns: repeat(3, 1fr);
    }

    .title {
      font-size: var(--font-size-2xl);
    }
  }

  @media (min-width: 900px) {
    .gallery {
      grid-template-columns: repeat(4, 1fr);
    }
  }

  @media (max-width: 380px) {
    .finalist-card {
      padding: var(--space-3);
    }

    .title-section {
      padding: var(--space-2) var(--space-3);
    }

    .title {
      font-size: var(--font-size-lg);
    }
  }

  /* Reduce motion */
  @media (prefers-reduced-motion: reduce) {
    .trophy-icon,
    .title-glow,
    .vote-hint,
    .voted-shimmer {
      animation: none;
    }

    .finale-header,
    .instruction,
    .finalist-card,
    .voted-card,
    .timer-section {
      transition: opacity 0.2s ease;
      transform: none;
    }

    .mounted .finalist-card {
      transform: none;
    }
  }
</style>
