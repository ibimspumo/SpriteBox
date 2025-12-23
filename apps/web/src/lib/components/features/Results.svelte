<!-- Results Feature Component -->
<script lang="ts">
  import { results, currentUser, localizedResultsPrompt } from '$lib/stores';
  import { returnToLobby } from '$lib/socketBridge';
  import { t } from '$lib/i18n';
  import { Badge, Button } from '../atoms';
  import { PromptDisplay } from '../molecules';
  import { GalleryGrid } from '../organisms';
  import { PixelCanvas } from '../utility';

  const medals = ['🥇', '🥈', '🥉'];
  let medalLabels = $derived([$t.results.firstPlace, $t.results.secondPlace, $t.results.thirdPlace]);
</script>

<div class="results">
  {#if $results}
    <header class="results-header">
      <h2 class="title">{$t.results.title}</h2>
      <PromptDisplay prompt={$localizedResultsPrompt} label={$t.results.prompt} size="md" centered />
    </header>

    <!-- Next Round Notice (moved higher) -->
    <div class="next-round-section">
      <p class="next-round-text">{$t.results.nextRoundStarting}</p>
      <Button variant="primary" onclick={returnToLobby}>
        {$t.results.returnToLobby}
      </Button>
    </div>

    <div class="podium">
      {#each $results.rankings.slice(0, 3) as entry, index}
        {@const isOwn = entry.user.fullName === $currentUser?.fullName}
        {@const isWinner = index === 0}
        <div class="podium-slot slot-{index}" class:winner={isWinner} class:own={isOwn}>
          <div class="medal-badge">{medals[index]}</div>
          <div class="card-wrapper">
            <div class="pixel-card" class:gold={isWinner} class:own={isOwn}>
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
                {#if isOwn}
                  <Badge variant="success" text={`${$t.common.you}!`} />
                {/if}
              </div>
            </div>
          </div>
        </div>
      {/each}
    </div>

    {#if $results.rankings.length > 3}
      <div class="gallery-section">
        <h3 class="gallery-title">{$t.results.allSubmissions} ({$results.totalParticipants})</h3>
        <div class="gallery-container">
          <GalleryGrid gap="sm">
            {#each $results.rankings.slice(3) as entry}
              {@const isOwn = entry.user.fullName === $currentUser?.fullName}
              <div class="gallery-item" class:own={isOwn}>
                <div class="gallery-frame">
                  <PixelCanvas pixelData={entry.pixels} size={64} readonly />
                </div>
                <span class="rank-badge">#{entry.place}</span>
                <span class="gallery-name">{entry.user.fullName}</span>
                {#if isOwn}
                  <Badge variant="success" text={$t.common.you} />
                {/if}
              </div>
            {/each}
          </GalleryGrid>
        </div>
      </div>
    {/if}
  {/if}
</div>

<style>
  .results {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--space-8);
    padding: var(--space-6);
    width: 100%;
    max-width: 1200px;
    margin: 0 auto;
  }

  /* ===== Header ===== */
  .results-header {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--space-4);
    width: 100%;
    padding: var(--space-6);
    background: var(--color-bg-secondary);
    border-radius: var(--radius-md);
    border: 3px solid var(--color-brand);
    box-shadow: var(--shadow-pixel-lg);
  }

  .title {
    font-size: var(--font-size-3xl);
    font-weight: var(--font-weight-bold);
    color: var(--color-brand);
    text-transform: uppercase;
    letter-spacing: 2px;
    margin: 0;
    text-shadow: 2px 2px 0 rgba(0, 0, 0, 0.5);
  }

  /* ===== Podium ===== */
  .podium {
    display: flex;
    align-items: flex-end;
    justify-content: center;
    gap: var(--space-6);
    width: 100%;
    max-width: 900px;
    padding: var(--space-4);
  }

  /* Podium ordering: 2nd, 1st, 3rd */
  .podium-slot.slot-0 {
    order: 1;
  }

  .podium-slot.slot-1 {
    order: 0;
  }

  .podium-slot.slot-2 {
    order: 2;
  }

  .podium-slot {
    position: relative;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--space-2);
    animation: slideUp 0.5s ease-out forwards;
    opacity: 0;
  }

  .podium-slot.slot-0 {
    animation-delay: 0.2s;
  }

  .podium-slot.slot-1 {
    animation-delay: 0s;
  }

  .podium-slot.slot-2 {
    animation-delay: 0.4s;
  }

  .podium-slot.slot-0 .card-wrapper {
    transform: translateY(-30px);
  }

  .medal-badge {
    font-size: var(--font-size-3xl);
    margin-bottom: var(--space-2);
    filter: drop-shadow(2px 2px 4px rgba(0, 0, 0, 0.5));
  }

  /* ===== Pixel Cards ===== */
  .pixel-card {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--space-3);
    padding: var(--space-5);
    background: var(--color-bg-secondary);
    border-radius: var(--radius-md);
    border: 3px solid var(--color-border-strong);
    box-shadow: var(--shadow-pixel-lg);
    transition: transform var(--transition-normal);
  }

  .pixel-card.gold {
    background: linear-gradient(135deg, rgba(245, 158, 11, 0.15) 0%, var(--color-bg-secondary) 100%);
    border-color: var(--color-brand);
    box-shadow:
      var(--shadow-pixel-lg),
      0 0 30px rgba(245, 158, 11, 0.3);
  }

  .pixel-card.own {
    border-color: var(--color-success);
    box-shadow:
      var(--shadow-pixel-lg),
      0 0 20px rgba(34, 197, 94, 0.3);
  }

  .pixel-card.gold.own {
    border-color: var(--color-brand);
    box-shadow:
      var(--shadow-pixel-lg),
      0 0 30px rgba(245, 158, 11, 0.4),
      0 0 20px rgba(34, 197, 94, 0.2);
  }

  .place-label {
    font-size: var(--font-size-sm);
    font-weight: var(--font-weight-bold);
    color: var(--color-text-secondary);
    text-transform: uppercase;
    letter-spacing: 1px;
  }

  .pixel-card.gold .place-label {
    color: var(--color-brand);
  }

  /* ===== Canvas Frame ===== */
  .canvas-frame {
    display: flex;
    justify-content: center;
    align-items: center;
    padding: var(--space-3);
    background: var(--color-bg-tertiary);
    border-radius: var(--radius-sm);
    border: 3px solid var(--color-bg-elevated);
    box-shadow: inset 2px 2px 0 rgba(0, 0, 0, 0.3);
  }

  .canvas-frame.gold {
    border-color: var(--color-brand-dark);
    background: linear-gradient(135deg, rgba(245, 158, 11, 0.1) 0%, var(--color-bg-tertiary) 100%);
    box-shadow:
      inset 2px 2px 0 rgba(0, 0, 0, 0.3),
      0 0 15px rgba(245, 158, 11, 0.2);
  }

  /* ===== Player Info ===== */
  .player-info {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--space-2);
    width: 100%;
  }

  .player-name {
    font-size: var(--font-size-lg);
    font-weight: var(--font-weight-bold);
    color: var(--color-text-primary);
    text-align: center;
  }

  .pixel-card.gold .player-name {
    color: var(--color-brand-light);
    text-shadow: 1px 1px 0 rgba(0, 0, 0, 0.5);
  }

  .vote-display {
    display: flex;
    align-items: baseline;
    gap: var(--space-2);
    padding: var(--space-2) var(--space-4);
    background: var(--color-bg-tertiary);
    border-radius: var(--radius-sm);
    border: 2px solid var(--color-bg-elevated);
  }

  .vote-count {
    font-size: var(--font-size-xl);
    font-weight: var(--font-weight-bold);
    color: var(--color-accent);
  }

  .pixel-card.gold .vote-count {
    color: var(--color-brand-light);
  }

  .vote-label {
    font-size: var(--font-size-sm);
    color: var(--color-text-secondary);
    text-transform: uppercase;
    letter-spacing: 1px;
  }

  /* ===== Gallery Section ===== */
  .gallery-section {
    width: 100%;
    max-width: 900px;
    display: flex;
    flex-direction: column;
    gap: var(--space-4);
  }

  .gallery-title {
    font-size: var(--font-size-xl);
    font-weight: var(--font-weight-bold);
    color: var(--color-text-secondary);
    text-transform: uppercase;
    letter-spacing: 2px;
    text-align: center;
    margin: 0;
    padding: var(--space-3);
    background: var(--color-bg-secondary);
    border-radius: var(--radius-md);
    border: 3px solid var(--color-border-strong);
  }

  .gallery-container {
    padding: var(--space-4);
    background: var(--color-bg-secondary);
    border-radius: var(--radius-md);
    border: 3px solid var(--color-border);
  }

  .gallery-item {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--space-2);
    padding: var(--space-3);
    background: var(--color-bg-tertiary);
    border-radius: var(--radius-sm);
    border: 2px solid transparent;
    transition: all var(--transition-normal);
  }

  .gallery-item:hover {
    transform: translateY(-2px);
    border-color: var(--color-accent);
  }

  .gallery-item.own {
    border-color: var(--color-success);
    background: linear-gradient(135deg, rgba(34, 197, 94, 0.1) 0%, var(--color-bg-tertiary) 100%);
  }

  .gallery-frame {
    display: flex;
    justify-content: center;
    align-items: center;
    padding: var(--space-2);
    background: var(--color-bg-elevated);
    border-radius: var(--radius-sm);
    border: 2px solid var(--color-border);
  }

  .rank-badge {
    font-size: var(--font-size-xs);
    font-weight: var(--font-weight-bold);
    color: var(--color-text-muted);
    text-transform: uppercase;
    letter-spacing: 1px;
    padding: var(--space-1) var(--space-2);
    background: var(--color-bg-elevated);
    border-radius: var(--radius-sm);
    border: 2px solid var(--color-border);
  }

  .gallery-name {
    font-size: var(--font-size-xs);
    color: var(--color-text-secondary);
    text-align: center;
    max-width: 100px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  /* ===== Next Round Section ===== */
  .next-round-section {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--space-3);
    padding: var(--space-5);
    background: var(--color-bg-secondary);
    border-radius: var(--radius-md);
    border: 3px solid var(--color-accent);
    box-shadow: var(--shadow-pixel-lg);
    width: 100%;
    max-width: 500px;
    animation: glow 2s ease-in-out infinite;
  }

  .next-round-text {
    font-size: var(--font-size-lg);
    font-weight: var(--font-weight-bold);
    color: var(--color-accent);
    text-transform: uppercase;
    letter-spacing: 1px;
    margin: 0;
    text-align: center;
    animation: pulse 2s ease-in-out infinite;
  }

  /* ===== Animations ===== */
  @keyframes slideUp {
    from {
      transform: translateY(30px);
      opacity: 0;
    }
    to {
      transform: translateY(0);
      opacity: 1;
    }
  }

  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.6; }
  }

  @keyframes glow {
    0%, 100% {
      box-shadow: 0 0 10px rgba(78, 205, 196, 0.3);
    }
    50% {
      box-shadow: 0 0 20px rgba(78, 205, 196, 0.5);
    }
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
      max-width: 300px;
    }

    .podium-slot.slot-0,
    .podium-slot.slot-1,
    .podium-slot.slot-2 {
      order: 0;
    }

    .podium-slot.slot-0 .card-wrapper {
      transform: none;
    }

    .title {
      font-size: var(--font-size-2xl);
    }

    .medal-badge {
      font-size: var(--font-size-2xl);
    }
  }
</style>
