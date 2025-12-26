<!-- CopyCatResult - Shows comparison results with dramatic reveal -->
<script lang="ts">
  import { PixelCanvas } from '../../utility';
  import { Timer } from '../../utility';
  import { copyCat, currentUser } from '$lib/stores';
  import { t } from '$lib/i18n';
  import { onMount } from 'svelte';

  let mounted = $state(false);
  let showComparison = $state(false);

  onMount(() => {
    requestAnimationFrame(() => {
      mounted = true;
      // Stagger the comparison reveal
      setTimeout(() => {
        showComparison = true;
      }, 300);
    });
  });

  let results = $derived($copyCat.results);
  let winner = $derived($copyCat.winner);
  let referenceImage = $derived($copyCat.referenceImage);
  let isDraw = $derived($copyCat.isDraw);
  let user = $derived($currentUser);

  // Solo mode detection (only 1 player in results)
  let isSoloMode = $derived(results.length === 1);
  let isWinner = $derived(winner?.user.fullName === user?.fullName);
  let myResult = $derived(results.find(r => r.user.fullName === user?.fullName));

</script>

<div class="result-phase" class:mounted>
  <!-- Background -->
  <div class="phase-background" aria-hidden="true">
    <div class="bg-gradient"></div>
  </div>

  <!-- Main Content -->
  <div class="result-content">
    <!-- Header -->
    <header class="result-header">
      {#if isSoloMode}
        <div class="result-badge solo">
          <span class="result-icon">🎯</span>
          <span class="accuracy-display">{myResult?.accuracy ?? 0}%</span>
          <span class="accuracy-label">{$t.copyCat.accuracy}</span>
        </div>
      {:else if isDraw}
        <div class="result-badge draw">
          <span class="result-icon">🤝</span>
          <span class="result-text">{$t.copyCat.draw}!</span>
        </div>
      {:else if isWinner}
        <div class="result-badge winner">
          <span class="result-icon">👑</span>
          <span class="result-text">{$t.copyCat.youWon}</span>
        </div>
      {:else}
        <div class="result-badge loser">
          <span class="result-icon">😔</span>
          <span class="result-text">{$t.copyCat.youLost}</span>
        </div>
      {/if}
    </header>

    <!-- Timer -->
    <div class="timer-section">
      <Timer />
    </div>

    <!-- Reference Image -->
    <div class="reference-section" class:show={showComparison}>
      <h2 class="section-title">{$t.copyCat.referenceImage}</h2>
      {#if referenceImage}
        <div class="canvas-frame reference">
          <div class="frame-label">{$t.copyCat.original}</div>
          <PixelCanvas pixelData={referenceImage} size={120} readonly />
        </div>
      {/if}
    </div>

    <!-- Player Results -->
    <div class="players-section" class:show={showComparison}>
      {#each results as result, index (result.playerId)}
        {@const isCurrentUser = result.user.fullName === user?.fullName}
        {@const isResultWinner = !isDraw && winner?.playerId === result.playerId}
        <div
          class="player-card"
          class:winner={isResultWinner}
          class:you={isCurrentUser}
          style="--card-delay: {0.1 + index * 0.15}s"
        >
          <div class="card-glow"></div>

          <!-- Player Header -->
          <div class="player-header">
            <span class="player-name">
              {isCurrentUser ? $t.common.you : result.user.displayName}
            </span>
            {#if isResultWinner}
              <span class="crown">👑</span>
            {/if}
          </div>

          <!-- Canvas -->
          <div class="canvas-frame player">
            <PixelCanvas pixelData={result.pixels} size={100} readonly />
          </div>

          <!-- Stats -->
          <div class="stats">
            <div class="stat accuracy">
              <span class="stat-value">{result.accuracy}%</span>
              <span class="stat-label">{$t.copyCat.accuracy}</span>
            </div>
            <div class="stat pixels">
              <span class="stat-value">{result.matchingPixels}/64</span>
              <span class="stat-label">{$t.copyCat.matchingPixels}</span>
            </div>
          </div>
        </div>
      {/each}
    </div>
  </div>
</div>

<style>
  .result-phase {
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
    overflow: hidden;
  }

  .bg-gradient {
    position: absolute;
    inset: 0;
    background: radial-gradient(ellipse at 50% 30%, rgba(78, 205, 196, 0.08) 0%, transparent 50%);
  }

  /* ===== Main Content ===== */
  .result-content {
    position: relative;
    z-index: 1;
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: var(--space-4);
    gap: var(--space-5);
    max-width: 600px;
    margin: 0 auto;
    width: 100%;
  }

  /* ===== Header ===== */
  .result-header {
    opacity: 0;
    transform: translateY(-30px) scale(0.8);
    transition: all 0.6s cubic-bezier(0.34, 1.56, 0.64, 1);
  }

  .mounted .result-header {
    opacity: 1;
    transform: translateY(0) scale(1);
  }

  .result-badge {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--space-2);
    padding: var(--space-5) var(--space-8);
    background: rgba(26, 26, 62, 0.9);
    border: 3px solid;
    border-radius: var(--radius-xl);
    backdrop-filter: blur(10px);
    text-align: center;
  }

  .result-badge.winner {
    border-color: var(--color-success);
    box-shadow: 0 0 40px rgba(34, 197, 94, 0.4);
  }

  .result-badge.loser {
    border-color: var(--color-error);
    box-shadow: 0 0 30px rgba(239, 68, 68, 0.3);
  }

  .result-badge.draw {
    border-color: var(--color-warning);
    box-shadow: 0 0 30px rgba(250, 204, 21, 0.3);
  }

  .result-badge.solo {
    border-color: var(--color-accent);
    box-shadow: 0 0 40px rgba(78, 205, 196, 0.4);
  }

  .result-icon {
    font-size: 2.5rem;
    animation: iconBounce 1s ease-in-out infinite;
  }

  @keyframes iconBounce {
    0%, 100% { transform: translateY(0); }
    50% { transform: translateY(-8px); }
  }

  .result-text {
    font-size: var(--font-size-xl);
    font-weight: var(--font-weight-bold);
    text-transform: uppercase;
    letter-spacing: 2px;
  }

  .result-badge.winner .result-text {
    color: var(--color-success);
    text-shadow: 0 0 20px rgba(34, 197, 94, 0.5);
  }

  .result-badge.loser .result-text {
    color: var(--color-error);
  }

  .result-badge.draw .result-text {
    color: var(--color-warning);
  }

  .accuracy-display {
    font-size: var(--font-size-3xl);
    font-weight: var(--font-weight-bold);
    color: var(--color-accent);
    text-shadow: 0 0 20px rgba(78, 205, 196, 0.5);
  }

  .accuracy-label {
    font-size: var(--font-size-sm);
    color: var(--color-text-secondary);
    text-transform: uppercase;
    letter-spacing: 1px;
  }

  /* ===== Timer Section ===== */
  .timer-section {
    opacity: 0;
    transform: translateY(10px);
    transition: all 0.5s ease 0.1s;
  }

  .mounted .timer-section {
    opacity: 1;
    transform: translateY(0);
  }

  /* ===== Reference Section ===== */
  .reference-section {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--space-3);
    opacity: 0;
    transform: translateY(20px);
    transition: all 0.5s ease;
  }

  .reference-section.show {
    opacity: 1;
    transform: translateY(0);
  }

  .section-title {
    font-size: var(--font-size-sm);
    font-weight: var(--font-weight-bold);
    color: var(--color-text-muted);
    text-transform: uppercase;
    letter-spacing: 2px;
    margin: 0;
  }

  .canvas-frame {
    position: relative;
    padding: var(--space-3);
    max-width: 100%;
    box-sizing: border-box;
    background: linear-gradient(145deg, var(--color-bg-secondary) 0%, var(--color-bg-tertiary) 100%);
    border-radius: var(--radius-lg);
    box-shadow: var(--shadow-pixel-lg);
  }

  .canvas-frame.reference {
    border: 3px solid var(--color-accent);
    box-shadow:
      var(--shadow-pixel-lg),
      0 0 30px rgba(78, 205, 196, 0.2);
  }

  .frame-label {
    position: absolute;
    top: -10px;
    left: 50%;
    transform: translateX(-50%);
    padding: var(--space-1) var(--space-3);
    background: var(--color-accent);
    color: var(--color-bg-primary);
    font-size: var(--font-size-xs);
    font-weight: var(--font-weight-bold);
    text-transform: uppercase;
    letter-spacing: 1px;
    border-radius: var(--radius-full);
  }

  /* ===== Players Section ===== */
  .players-section {
    display: flex;
    gap: var(--space-5);
    flex-wrap: wrap;
    justify-content: center;
    width: 100%;
  }

  .players-section.show .player-card {
    opacity: 1;
    transform: translateY(0) scale(1);
  }

  .player-card {
    position: relative;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--space-3);
    padding: var(--space-4);
    background: linear-gradient(145deg, var(--color-bg-secondary) 0%, var(--color-bg-tertiary) 100%);
    border: 3px solid var(--color-border-strong);
    border-radius: var(--radius-lg);
    box-shadow: var(--shadow-pixel-lg);
    opacity: 0;
    transform: translateY(30px) scale(0.9);
    transition: all 0.5s cubic-bezier(0.34, 1.56, 0.64, 1);
    transition-delay: var(--card-delay, 0s);
    overflow: hidden;
  }

  .player-card.winner {
    border-color: var(--color-success);
    box-shadow:
      var(--shadow-pixel-lg),
      0 0 40px rgba(34, 197, 94, 0.3);
  }

  .player-card.you:not(.winner) {
    border-color: var(--color-accent);
  }

  .card-glow {
    position: absolute;
    inset: 0;
    background: radial-gradient(ellipse at center, rgba(34, 197, 94, 0.1) 0%, transparent 70%);
    opacity: 0;
  }

  .player-card.winner .card-glow {
    opacity: 1;
    animation: cardGlow 3s ease-in-out infinite;
  }

  @keyframes cardGlow {
    0%, 100% { opacity: 0.5; }
    50% { opacity: 1; }
  }

  .player-header {
    display: flex;
    align-items: center;
    gap: var(--space-2);
  }

  .player-name {
    font-size: var(--font-size-md);
    font-weight: var(--font-weight-bold);
    color: var(--color-text-primary);
    text-transform: uppercase;
    letter-spacing: 1px;
  }

  .crown {
    font-size: 1.2rem;
    animation: crownBounce 1s ease-in-out infinite;
  }

  @keyframes crownBounce {
    0%, 100% { transform: translateY(0) rotate(-5deg); }
    50% { transform: translateY(-5px) rotate(5deg); }
  }

  .canvas-frame.player {
    border: 2px solid var(--color-bg-elevated);
  }

  .player-card.winner .canvas-frame.player {
    border-color: var(--color-success);
  }

  .stats {
    display: flex;
    gap: var(--space-4);
  }

  .stat {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--space-1);
    padding: var(--space-2) var(--space-3);
    background: rgba(0, 0, 0, 0.2);
    border-radius: var(--radius-md);
  }

  .stat-value {
    font-size: var(--font-size-lg);
    font-weight: var(--font-weight-bold);
    color: var(--color-text-primary);
  }

  .stat.accuracy .stat-value {
    color: var(--color-success);
  }

  .stat-label {
    font-size: var(--font-size-xs);
    color: var(--color-text-muted);
    text-transform: uppercase;
    letter-spacing: 1px;
  }

  /* ===== Responsive ===== */
  @media (max-width: 480px) {
    .result-content {
      padding: var(--space-3);
      gap: var(--space-4);
    }

    .players-section {
      flex-direction: column;
      align-items: center;
    }

    .player-card {
      width: 100%;
      max-width: 200px;
    }

    .result-badge {
      padding: var(--space-4) var(--space-6);
    }

    .accuracy-display {
      font-size: var(--font-size-2xl);
    }
  }

  /* Reduce motion */
  @media (prefers-reduced-motion: reduce) {
    .result-icon,
    .crown,
    .card-glow {
      animation: none;
    }

    .result-header,
    .timer-section,
    .reference-section,
    .player-card {
      transition: opacity 0.2s ease;
      transform: none;
    }

    .players-section.show .player-card {
      transform: none;
    }
  }
</style>
