<!-- PixelGuesser Final Results -->
<script lang="ts">
  import { pixelGuesser, currentUser } from '$lib/stores';
  import { t } from '$lib/i18n';
  import { Timer } from '../../utility';

  let scores = $derived($pixelGuesser.scores);
  let totalRounds = $derived($pixelGuesser.totalRounds);
  let user = $derived($currentUser);

  // Sort by total score descending
  let rankings = $derived([...scores].sort((a, b) => b.score - a.score));

  // Winner info
  let winner = $derived(rankings[0]);
  let winnerIsCurrentUser = $derived(winner?.user.fullName === user?.fullName);
  let isDraw = $derived(rankings.length >= 2 && rankings[0]?.score === rankings[1]?.score);
</script>

<div class="final-results">
  <div class="header">
    {#if isDraw}
      <h1 class="title draw">{$t.pixelGuesser.draw}</h1>
    {:else if winnerIsCurrentUser}
      <h1 class="title winner">{$t.pixelGuesser.youWin}</h1>
    {:else}
      <h1 class="title">{$t.pixelGuesser.finalResults}</h1>
    {/if}
    <Timer />
  </div>

  <!-- Winner Card (only if not a draw) -->
  {#if winner && !isDraw}
    <div class="winner-card">
      <div class="winner-crown">👑</div>
      <div class="winner-info">
        <span class="winner-label">#1</span>
        <span class="winner-name">{winnerIsCurrentUser ? $t.common.you : winner.user.displayName}</span>
      </div>
      <div class="winner-score">
        <span class="winner-score-value">{winner.score}</span>
        <span class="winner-score-label">{$t.pixelGuesser.points}</span>
      </div>
    </div>
  {/if}

  <!-- Full Rankings List -->
  <div class="rankings">
    <div class="rankings-list">
      {#each rankings as entry, index (entry.playerId)}
        {@const isCurrentUser = entry.user.fullName === user?.fullName}
        {@const isFirst = index === 0}
        <div
          class="ranking-entry"
          class:you={isCurrentUser}
          class:winner={isFirst && !isDraw}
        >
          <span class="rank" class:gold={isFirst && !isDraw}>#{index + 1}</span>
          <span class="name">{isCurrentUser ? $t.common.you : entry.user.displayName}</span>
          <span class="points">{entry.score} {$t.pixelGuesser.points}</span>
        </div>
      {/each}
    </div>
  </div>

  <div class="rounds-played">
    {totalRounds} {totalRounds === 1 ? $t.pixelGuesser.round : $t.pixelGuesser.rounds}
  </div>
</div>

<style>
  .final-results {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--space-5);
    padding: var(--space-6);
    width: 100%;
    max-width: 400px;
    margin: 0 auto;
  }

  .header {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--space-3);
    width: 100%;
  }

  .title {
    font-size: var(--font-size-2xl);
    color: var(--color-text-primary);
    margin: 0;
    text-transform: uppercase;
    letter-spacing: 2px;
    animation: fadeSlideUp 0.5s ease-out;
  }

  .title.winner {
    color: var(--color-success);
  }

  .title.draw {
    color: var(--color-warning);
  }

  /* === Winner Card === */
  .winner-card {
    display: flex;
    align-items: center;
    gap: var(--space-4);
    width: 100%;
    padding: var(--space-4);
    background: linear-gradient(
      135deg,
      rgba(var(--color-warning-rgb), 0.15) 0%,
      rgba(var(--color-warning-rgb), 0.05) 100%
    );
    border: 3px solid var(--color-warning);
    border-radius: var(--radius-lg);
    animation: scaleIn 0.4s ease-out;
  }

  .winner-crown {
    font-size: 40px;
    animation: bounce 1s ease-in-out infinite;
    filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.3));
  }

  .winner-info {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: var(--space-1);
  }

  .winner-label {
    font-size: var(--font-size-sm);
    font-weight: var(--font-weight-bold);
    color: var(--color-warning);
    text-transform: uppercase;
    letter-spacing: 1px;
  }

  .winner-name {
    font-size: var(--font-size-xl);
    font-weight: var(--font-weight-bold);
    color: var(--color-text-primary);
  }

  .winner-score {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: var(--space-1);
  }

  .winner-score-value {
    font-size: var(--font-size-2xl);
    font-weight: var(--font-weight-bold);
    color: var(--color-success);
  }

  .winner-score-label {
    font-size: var(--font-size-xs);
    color: var(--color-text-muted);
    text-transform: uppercase;
    letter-spacing: 1px;
  }

  /* === Rankings List === */
  .rankings {
    width: 100%;
    background: var(--color-bg-secondary);
    border-radius: var(--radius-md);
    padding: var(--space-3);
    animation: fadeSlideUp 0.5s ease-out 0.2s backwards;
  }

  .rankings-list {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
  }

  .ranking-entry {
    display: flex;
    align-items: center;
    gap: var(--space-3);
    padding: var(--space-3) var(--space-4);
    background: var(--color-bg-tertiary);
    border-radius: var(--radius-sm);
    border-left: 4px solid transparent;
    transition: all 0.2s ease;
  }

  .ranking-entry.winner {
    border-left-color: var(--color-warning);
    background: rgba(var(--color-warning-rgb), 0.1);
  }

  .ranking-entry.you:not(.winner) {
    border-left-color: var(--color-accent);
    background: rgba(var(--color-accent-rgb), 0.1);
  }

  .rank {
    font-size: var(--font-size-md);
    font-weight: var(--font-weight-bold);
    color: var(--color-text-muted);
    min-width: 32px;
  }

  .rank.gold {
    color: var(--color-warning);
  }

  .name {
    flex: 1;
    font-size: var(--font-size-md);
    color: var(--color-text-primary);
    font-weight: 500;
  }

  .points {
    font-size: var(--font-size-md);
    font-weight: var(--font-weight-bold);
    color: var(--color-success);
  }

  .rounds-played {
    font-size: var(--font-size-sm);
    color: var(--color-text-muted);
  }

  /* === Animations === */
  @keyframes fadeSlideUp {
    from {
      opacity: 0;
      transform: translateY(10px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  @keyframes scaleIn {
    from {
      opacity: 0;
      transform: scale(0.95);
    }
    to {
      opacity: 1;
      transform: scale(1);
    }
  }

  @keyframes bounce {
    0%, 100% {
      transform: translateY(0);
    }
    50% {
      transform: translateY(-4px);
    }
  }

  /* === Mobile === */
  @media (max-width: 400px) {
    .final-results {
      padding: var(--space-4);
      gap: var(--space-4);
    }

    .winner-card {
      padding: var(--space-3);
      gap: var(--space-3);
    }

    .winner-crown {
      font-size: 32px;
    }

    .winner-name {
      font-size: var(--font-size-lg);
    }

    .winner-score-value {
      font-size: var(--font-size-xl);
    }

    .ranking-entry {
      padding: var(--space-2) var(--space-3);
    }
  }
</style>
