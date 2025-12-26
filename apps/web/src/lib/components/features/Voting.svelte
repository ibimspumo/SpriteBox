<!-- Voting Feature Component - Dramatic Duel Presentation -->
<script lang="ts">
  import { voting } from '$lib/stores';
  import { vote } from '$lib/socketBridge';
  import { t } from '$lib/i18n';
  import { PixelCanvas, Timer } from '../utility';
  import { onMount } from 'svelte';

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
      <div class="duel-arena" class:show={showCards}>
        <!-- Left Contender -->
        <button
          class="contender left"
          onclick={() => handleVote($voting.imageA!.playerId)}
          aria-label={$t.voting.voteForImageA}
        >
          <div class="contender-glow"></div>
          <div class="canvas-frame">
            <div class="frame-accent top"></div>
            <div class="frame-accent bottom"></div>
            <PixelCanvas
              pixelData={$voting.imageA.pixels}
              size={140}
              readonly
            />
          </div>
          <div class="vote-prompt">
            <span class="tap-icon">👆</span>
            <span class="tap-text">{$t.voting.clickToVote}</span>
          </div>
        </button>

        <!-- VS Badge -->
        <div class="vs-container">
          <div class="vs-badge">
            <span class="vs-text">{$t.voting.vs}</span>
          </div>
          <div class="vs-lightning left">⚡</div>
          <div class="vs-lightning right">⚡</div>
        </div>

        <!-- Right Contender -->
        <button
          class="contender right"
          onclick={() => handleVote($voting.imageB!.playerId)}
          aria-label={$t.voting.voteForImageB}
        >
          <div class="contender-glow"></div>
          <div class="canvas-frame">
            <div class="frame-accent top"></div>
            <div class="frame-accent bottom"></div>
            <PixelCanvas
              pixelData={$voting.imageB.pixels}
              size={140}
              readonly
            />
          </div>
          <div class="vote-prompt">
            <span class="tap-icon">👆</span>
            <span class="tap-text">{$t.voting.clickToVote}</span>
          </div>
        </button>
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

  .duel-arena.show .contender {
    opacity: 1;
    transform: translateY(0) scale(1);
  }

  .duel-arena.show .vs-container {
    opacity: 1;
    transform: scale(1);
  }

  /* ===== Contender Cards ===== */
  .contender {
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
    opacity: 0;
    transform: translateY(30px) scale(0.9);
    transition: all 0.5s cubic-bezier(0.34, 1.56, 0.64, 1);
    box-shadow: var(--shadow-pixel-lg);
    width: 100%;
    max-width: 200px;
  }

  .contender.left {
    transition-delay: 0.1s;
  }

  .contender.right {
    transition-delay: 0.2s;
  }

  .contender:hover,
  .contender:focus-visible {
    transform: translateY(-4px) scale(1.02);
    border-color: var(--color-accent);
    box-shadow:
      var(--shadow-pixel-lg),
      0 0 40px rgba(78, 205, 196, 0.3);
  }

  .contender:active {
    transform: translateY(-2px) scale(1);
  }

  .contender:focus-visible {
    outline: 2px solid var(--color-accent);
    outline-offset: 4px;
  }

  .contender.left:hover .contender-glow,
  .contender.left:focus-visible .contender-glow {
    opacity: 1;
    background: radial-gradient(circle at center, rgba(78, 205, 196, 0.2) 0%, transparent 70%);
  }

  .contender.right:hover .contender-glow,
  .contender.right:focus-visible .contender-glow {
    opacity: 1;
    background: radial-gradient(circle at center, rgba(245, 166, 35, 0.2) 0%, transparent 70%);
  }

  .contender-glow {
    position: absolute;
    inset: -20px;
    border-radius: var(--radius-xl);
    opacity: 0;
    transition: opacity 0.3s ease;
    pointer-events: none;
  }

  .canvas-frame {
    position: relative;
    padding: var(--space-3);
    max-width: 100%;
    box-sizing: border-box;
    background: var(--color-bg-primary);
    border-radius: var(--radius-md);
    border: 2px solid var(--color-bg-elevated);
  }

  .frame-accent {
    position: absolute;
    left: 50%;
    transform: translateX(-50%);
    width: 40%;
    height: 3px;
    border-radius: var(--radius-full);
    opacity: 0.5;
    transition: all 0.3s ease;
  }

  .frame-accent.top {
    top: -2px;
    background: var(--color-accent);
  }

  .frame-accent.bottom {
    bottom: -2px;
    background: var(--color-brand);
  }

  .contender:hover .frame-accent {
    width: 60%;
    opacity: 1;
  }

  .vote-prompt {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    opacity: 0.6;
    transition: all 0.3s ease;
  }

  .contender:hover .vote-prompt,
  .contender:focus-visible .vote-prompt {
    opacity: 1;
  }

  .tap-icon {
    font-size: 1.2rem;
    animation: bounce 1s ease-in-out infinite;
  }

  .tap-text {
    font-size: var(--font-size-xs);
    font-weight: var(--font-weight-bold);
    color: var(--color-text-muted);
    text-transform: uppercase;
    letter-spacing: 1px;
  }

  .contender:hover .tap-text {
    color: var(--color-accent);
  }

  /* ===== VS Badge ===== */
  .vs-container {
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: var(--space-2) 0;
    opacity: 0;
    transform: scale(0.5);
    transition: all 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) 0.3s;
  }

  .vs-badge {
    padding: var(--space-3) var(--space-5);
    background: linear-gradient(145deg, var(--color-bg-tertiary) 0%, var(--color-bg-elevated) 100%);
    border: 3px solid var(--color-brand);
    border-radius: var(--radius-lg);
    box-shadow:
      var(--shadow-pixel),
      0 0 30px rgba(245, 166, 35, 0.3);
  }

  .vs-text {
    font-size: var(--font-size-2xl);
    font-weight: var(--font-weight-bold);
    color: var(--color-brand);
    text-transform: uppercase;
    letter-spacing: 4px;
    text-shadow: 2px 2px 0 rgba(0, 0, 0, 0.5);
    animation: vsPulse 2s ease-in-out infinite;
  }

  @keyframes vsPulse {
    0%, 100% { transform: scale(1); }
    50% { transform: scale(1.1); }
  }

  .vs-lightning {
    position: absolute;
    top: 50%;
    transform: translateY(-50%);
    font-size: 1.5rem;
    opacity: 0.7;
    animation: flash 1s ease-in-out infinite;
  }

  .vs-lightning.left {
    left: -30px;
    animation-delay: 0s;
  }

  .vs-lightning.right {
    right: -30px;
    animation-delay: 0.5s;
  }

  @keyframes flash {
    0%, 100% { opacity: 0.3; transform: translateY(-50%) scale(0.9); }
    50% { opacity: 1; transform: translateY(-50%) scale(1.1); }
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

    .contender {
      max-width: none;
      flex: 1;
    }

    .vs-container {
      flex: 0 0 auto;
    }
  }

  @media (max-width: 380px) {
    .contender {
      padding: var(--space-3);
    }
  }

  /* Reduce motion */
  @media (prefers-reduced-motion: reduce) {
    .vs-text,
    .vs-lightning,
    .tap-icon,
    .voted-shimmer,
    .loading-spinner {
      animation: none;
    }

    .voting-header,
    .instruction,
    .contender,
    .vs-container,
    .voted-card,
    .timer-section {
      transition: opacity 0.2s ease;
      transform: none;
    }

    .duel-arena.show .contender,
    .duel-arena.show .vs-container {
      transform: none;
    }
  }
</style>
