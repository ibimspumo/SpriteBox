<!-- PodiumSlot Component - Single podium place display -->
<script lang="ts">
  import type { User } from '$lib/socket';
  import { t } from '$lib/i18n';
  import { Badge, ShareButton } from '../../atoms';
  import { PixelCanvas } from '../../utility';

  interface Props {
    entry: {
      place: number;
      playerId: string;
      user: User;
      pixels: string;
      finalVotes: number;
      elo: number;
    };
    index: number;
    isOwn: boolean;
    mounted: boolean;
  }

  let { entry, index, isOwn, mounted }: Props = $props();

  const medals = ['🥇', '🥈', '🥉'];
  let medalLabels = $derived([$t.results.firstPlace, $t.results.secondPlace, $t.results.thirdPlace]);

  let isWinner = $derived(index === 0);
  let slotDelay = $derived(index === 0 ? 0.2 : index === 1 ? 0 : 0.4);
  let canvasSize = $derived(isWinner ? 140 : 110);
</script>

<div
  class="podium-slot slot-{index}"
  class:winner={isWinner}
  class:own={isOwn}
  class:mounted
  style="--slot-delay: {slotDelay}s"
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
        size={canvasSize}
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

<style>
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

  .podium-slot.mounted {
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

  /* ===== Responsive ===== */
  @media (max-width: 768px) {
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
  }

  /* Reduce motion */
  @media (prefers-reduced-motion: reduce) {
    .medal,
    .card-glow {
      animation: none;
    }

    .podium-slot {
      transition: opacity 0.2s ease;
      transform: none;
    }

    .podium-slot.mounted {
      transform: none;
    }
  }
</style>
