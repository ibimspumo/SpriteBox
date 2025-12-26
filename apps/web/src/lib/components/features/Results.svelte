<!-- Results Feature Component - Celebration Podium -->
<script lang="ts">
  import { goto } from '$app/navigation';
  import { onMount, onDestroy } from 'svelte';
  import { results, currentUser, localizedResultsPrompt } from '$lib/stores';
  import { returnToLobby } from '$lib/socketBridge';
  import { t } from '$lib/i18n';
  import { Badge, Button, ShareButton } from '../atoms';
  import { PromptDisplay } from '../molecules';
  import { GalleryGrid } from '../organisms';
  import { PixelCanvas } from '../utility';

  const medals = ['🥇', '🥈', '🥉'];
  let medalLabels = $derived([$t.results.firstPlace, $t.results.secondPlace, $t.results.thirdPlace]);

  let mounted = $state(false);

  // Auto-redirect to /play after 30 seconds of inactivity
  const REDIRECT_DELAY = 30000;
  let redirectTimer: ReturnType<typeof setTimeout> | null = null;
  let interacted = $state(false);

  function resetRedirectTimer() {
    if (redirectTimer) clearTimeout(redirectTimer);
    if (!interacted) {
      redirectTimer = setTimeout(() => {
        goto('/play');
      }, REDIRECT_DELAY);
    }
  }

  function handlePlayAgain() {
    interacted = true;
    if (redirectTimer) clearTimeout(redirectTimer);
    returnToLobby();
  }

  function handleDifferentMode() {
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
      <div class="podium">
        {#each $results.rankings.slice(0, 3) as entry, index}
          {@const isOwn = entry.user.fullName === $currentUser?.fullName}
          {@const isWinner = index === 0}
          <div
            class="podium-slot slot-{index}"
            class:winner={isWinner}
            class:own={isOwn}
            style="--slot-delay: {index === 0 ? 0.2 : index === 1 ? 0 : 0.4}s"
          >
            <div class="medal-badge">
              <span class="medal">{medals[index]}</span>
            </div>

            <div class="pixel-card" class:gold={isWinner} class:own={isOwn}>
              <div class="card-glow"></div>
              <div class="place-label">{medalLabels[index]}</div>

              <div class="canvas-frame" class:gold={isWinner}>
                <PixelCanvas
                  pixelData={entry.pixels}
                  size={isWinner ? 140 : 110}
                  readonly
                />
              </div>

              <div class="player-info">
                <span class="player-name">{entry.user.fullName}</span>
                <div class="vote-display">
                  <span class="vote-count">{entry.finalVotes}</span>
                  <span class="vote-label">{$t.results.votes}</span>
                </div>
                <div class="player-actions">
                  {#if isOwn}
                    <Badge variant="success" text={`${$t.common.you}!`} />
                  {/if}
                  <ShareButton pixels={entry.pixels} username={entry.user.fullName} size="sm" />
                </div>
              </div>
            </div>
          </div>
        {/each}
      </div>

      <!-- Gallery Section -->
      {#if $results.rankings.length > 3}
        <div class="gallery-section">
          <h3 class="gallery-title">
            <span class="gallery-icon">🎨</span>
            {$t.results.allSubmissions} ({$results.totalParticipants})
          </h3>
          <div class="gallery-container">
            <GalleryGrid gap="sm">
              {#each $results.rankings.slice(3) as entry, index}
                {@const isOwn = entry.user.fullName === $currentUser?.fullName}
                <div
                  class="gallery-item"
                  class:own={isOwn}
                  style="--item-delay: {0.5 + index * 0.03}s"
                >
                  <div class="gallery-frame">
                    <PixelCanvas pixelData={entry.pixels} size={64} readonly />
                  </div>
                  <span class="rank-badge">#{entry.place}</span>
                  <span class="gallery-name">{entry.user.fullName}</span>
                  <div class="gallery-actions">
                    {#if isOwn}
                      <Badge variant="success" text={$t.common.you} />
                    {/if}
                    <ShareButton pixels={entry.pixels} username={entry.user.fullName} size="sm" />
                  </div>
                </div>
              {/each}
            </GalleryGrid>
          </div>
        </div>
      {/if}
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

  /* ===== Podium ===== */
  .podium {
    display: flex;
    align-items: flex-end;
    justify-content: center;
    gap: var(--space-4);
    width: 100%;
    max-width: 800px;
    padding: var(--space-4) 0;
  }

  .podium-slot {
    position: relative;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--space-2);
    opacity: 0;
    transform: translateY(40px);
    transition: all 0.6s cubic-bezier(0.34, 1.56, 0.64, 1);
    transition-delay: var(--slot-delay, 0s);
  }

  .mounted .podium-slot {
    opacity: 1;
    transform: translateY(0);
  }

  /* Podium ordering: 2nd, 1st, 3rd */
  .podium-slot.slot-0 { order: 1; }
  .podium-slot.slot-1 { order: 0; }
  .podium-slot.slot-2 { order: 2; }

  .podium-slot.slot-0 {
    margin-top: var(--space-6);
  }

  .medal-badge {
    margin-bottom: var(--space-1);
  }

  .medal {
    font-size: 2.5rem;
    filter: drop-shadow(0 4px 8px rgba(0, 0, 0, 0.4));
    animation: medalBounce 2s ease-in-out infinite;
  }

  .podium-slot.slot-0 .medal {
    font-size: 3rem;
    animation-delay: 0.2s;
  }

  @keyframes medalBounce {
    0%, 100% { transform: translateY(0) rotate(-5deg); }
    50% { transform: translateY(-8px) rotate(5deg); }
  }

  /* ===== Pixel Cards ===== */
  .pixel-card {
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
    overflow: hidden;
  }

  .pixel-card.gold {
    border-color: var(--color-brand);
    box-shadow:
      var(--shadow-pixel-lg),
      0 0 40px rgba(245, 166, 35, 0.4);
  }

  .pixel-card.own:not(.gold) {
    border-color: var(--color-success);
    box-shadow:
      var(--shadow-pixel-lg),
      0 0 30px rgba(34, 197, 94, 0.3);
  }

  .pixel-card.gold.own {
    box-shadow:
      var(--shadow-pixel-lg),
      0 0 40px rgba(245, 166, 35, 0.4),
      0 0 20px rgba(34, 197, 94, 0.2);
  }

  .card-glow {
    position: absolute;
    inset: 0;
    background: radial-gradient(ellipse at center, rgba(245, 166, 35, 0.1) 0%, transparent 70%);
    opacity: 0;
  }

  .pixel-card.gold .card-glow {
    opacity: 1;
    animation: cardGlow 3s ease-in-out infinite;
  }

  @keyframes cardGlow {
    0%, 100% { opacity: 0.5; }
    50% { opacity: 1; }
  }

  .place-label {
    font-size: var(--font-size-xs);
    font-weight: var(--font-weight-bold);
    color: var(--color-text-secondary);
    text-transform: uppercase;
    letter-spacing: 1px;
  }

  .pixel-card.gold .place-label {
    color: var(--color-brand);
  }

  .canvas-frame {
    position: relative;
    padding: var(--space-2);
    max-width: 100%;
    box-sizing: border-box;
    background: var(--color-bg-primary);
    border-radius: var(--radius-md);
    border: 2px solid var(--color-bg-elevated);
  }

  .canvas-frame.gold {
    border-color: var(--color-brand-dark);
    box-shadow: 0 0 20px rgba(245, 166, 35, 0.2);
  }

  .player-info {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--space-2);
    width: 100%;
  }

  .player-name {
    font-size: var(--font-size-md);
    font-weight: var(--font-weight-bold);
    color: var(--color-text-primary);
    text-align: center;
    max-width: 120px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .pixel-card.gold .player-name {
    color: var(--color-brand-light);
    text-shadow: 0 0 10px rgba(245, 166, 35, 0.3);
  }

  .vote-display {
    display: flex;
    align-items: baseline;
    gap: var(--space-2);
    padding: var(--space-2) var(--space-3);
    background: rgba(78, 205, 196, 0.1);
    border-radius: var(--radius-full);
    border: 1px solid rgba(78, 205, 196, 0.3);
  }

  .vote-count {
    font-size: var(--font-size-lg);
    font-weight: var(--font-weight-bold);
    color: var(--color-accent);
  }

  .pixel-card.gold .vote-count {
    color: var(--color-brand-light);
  }

  .vote-label {
    font-size: var(--font-size-xs);
    color: var(--color-text-secondary);
    text-transform: uppercase;
    letter-spacing: 1px;
  }

  .player-actions {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    margin-top: var(--space-1);
  }

  /* ===== Gallery Section ===== */
  .gallery-section {
    width: 100%;
    display: flex;
    flex-direction: column;
    gap: var(--space-4);
    opacity: 0;
    transform: translateY(20px);
    transition: all 0.5s ease 0.4s;
  }

  .mounted .gallery-section {
    opacity: 1;
    transform: translateY(0);
  }

  .gallery-title {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: var(--space-2);
    font-size: var(--font-size-lg);
    font-weight: var(--font-weight-bold);
    color: var(--color-text-secondary);
    text-transform: uppercase;
    letter-spacing: 2px;
    margin: 0;
    padding: var(--space-3);
    background: rgba(26, 26, 62, 0.9);
    border-radius: var(--radius-lg);
    border: 2px solid var(--color-border-strong);
  }

  .gallery-icon {
    font-size: 1.2rem;
  }

  .gallery-container {
    padding: var(--space-4);
    background: rgba(26, 26, 62, 0.8);
    border-radius: var(--radius-lg);
    border: 2px solid var(--color-border);
    backdrop-filter: blur(10px);
  }

  .gallery-item {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--space-2);
    padding: var(--space-3);
    background: var(--color-bg-tertiary);
    border-radius: var(--radius-md);
    border: 2px solid transparent;
    transition: all 0.3s ease;
    opacity: 0;
    transform: translateY(10px);
  }

  .mounted .gallery-item {
    opacity: 1;
    transform: translateY(0);
    transition-delay: var(--item-delay, 0s);
  }

  .gallery-item:hover {
    transform: translateY(-4px);
    border-color: var(--color-accent);
    box-shadow: 0 0 20px rgba(78, 205, 196, 0.2);
  }

  .gallery-item.own {
    border-color: var(--color-success);
    background: linear-gradient(145deg, rgba(34, 197, 94, 0.1) 0%, var(--color-bg-tertiary) 100%);
  }

  .gallery-frame {
    padding: var(--space-2);
    background: var(--color-bg-primary);
    border-radius: var(--radius-sm);
    border: 2px solid var(--color-bg-elevated);
  }

  .rank-badge {
    font-size: var(--font-size-xs);
    font-weight: var(--font-weight-bold);
    color: var(--color-text-muted);
    padding: var(--space-1) var(--space-2);
    background: var(--color-bg-elevated);
    border-radius: var(--radius-sm);
  }

  .gallery-name {
    font-size: var(--font-size-xs);
    color: var(--color-text-secondary);
    text-align: center;
    max-width: 80px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .gallery-actions {
    display: flex;
    align-items: center;
    gap: var(--space-2);
  }

  /* ===== Responsive ===== */
  @media (max-width: 768px) {
    .podium {
      flex-direction: column;
      align-items: center;
      gap: var(--space-4);
    }

    .podium-slot {
      width: 100%;
      max-width: 250px;
    }

    .podium-slot.slot-0,
    .podium-slot.slot-1,
    .podium-slot.slot-2 {
      order: 0;
      margin-top: 0;
    }

    .title {
      font-size: var(--font-size-xl);
    }

    .trophy {
      font-size: 1.5rem;
    }

    .medal {
      font-size: 2rem;
    }

    .podium-slot.slot-0 .medal {
      font-size: 2.5rem;
    }
  }

  @media (max-width: 380px) {
    .pixel-card {
      padding: var(--space-3);
    }

    .results-header {
      padding: var(--space-4);
    }
  }

  /* Reduce motion */
  @media (prefers-reduced-motion: reduce) {
    .trophy,
    .medal,
    .card-glow {
      animation: none;
    }

    .results-header,
    .next-round-section,
    .podium-slot,
    .gallery-section,
    .gallery-item {
      transition: opacity 0.2s ease;
      transform: none;
    }

    .mounted .podium-slot,
    .mounted .gallery-item {
      transform: none;
    }
  }
</style>
