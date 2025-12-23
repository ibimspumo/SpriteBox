<!-- PixelGuesser Final Results -->
<script lang="ts">
  import { pixelGuesser, currentUser } from '$lib/stores';
  import { t } from '$lib/i18n';
  import { Badge } from '../../atoms';
  import { Timer } from '../../utility';

  let scores = $derived($pixelGuesser.scores);
  let totalRounds = $derived($pixelGuesser.totalRounds);
  let user = $derived($currentUser);

  // Sort by total score descending
  let rankings = $derived([...scores].sort((a, b) => b.score - a.score));

  // Get podium (top 3)
  let podium = $derived(rankings.slice(0, 3));

  // Check if current user is winner
  let isWinner = $derived(rankings[0]?.user.fullName === user?.fullName);
</script>

<div class="final-results">
  <div class="header">
    <h1 class="title">{$t.pixelGuesser.finalResults}</h1>
    <Timer />
  </div>

  <!-- Podium -->
  <div class="podium">
    {#each podium as entry, index (entry.playerId)}
      {@const place = index + 1}
      {@const isCurrentUser = entry.user.fullName === user?.fullName}
      <div class="podium-spot place-{place}" class:you={isCurrentUser}>
        <div class="place-indicator">
          {#if place === 1}
            <span class="crown">👑</span>
          {/if}
          <span class="place-number">#{place}</span>
        </div>
        <div class="player-name">
          {isCurrentUser ? $t.common.you : entry.user.displayName}
        </div>
        <div class="score">
          <span class="score-value">{entry.score}</span>
          <span class="score-label">{$t.pixelGuesser.points}</span>
        </div>
      </div>
    {/each}
  </div>

  <!-- Full Rankings -->
  <div class="rankings">
    <h3 class="rankings-title">{$t.pixelGuesser.totalScore}</h3>
    <div class="rankings-list">
      {#each rankings as entry, index (entry.playerId)}
        {@const isCurrentUser = entry.user.fullName === user?.fullName}
        <div class="ranking-entry" class:you={isCurrentUser} class:top3={index < 3}>
          <span class="rank">#{index + 1}</span>
          <span class="name">{isCurrentUser ? $t.common.you : entry.user.displayName}</span>
          <span class="points">{entry.score} {$t.pixelGuesser.points}</span>
        </div>
      {/each}
    </div>
  </div>

  <div class="rounds-played">
    {totalRounds} {$t.pixelGuesser.round}s
  </div>
</div>

<style>
  .final-results {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--space-6);
    padding: var(--space-6);
    width: 100%;
    max-width: 600px;
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

  .podium {
    display: flex;
    align-items: flex-end;
    justify-content: center;
    gap: var(--space-3);
    width: 100%;
    max-width: 400px;
    min-height: 200px;
  }

  .podium-spot {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--space-2);
    padding: var(--space-4);
    background: var(--color-bg-secondary);
    border-radius: var(--radius-md);
    border: 3px solid var(--color-bg-tertiary);
    transition: all 0.3s ease;
    animation: slideUp 0.5s ease-out;
  }

  .podium-spot.you {
    border-color: var(--color-accent);
    background: rgba(var(--color-accent-rgb), 0.1);
  }

  .podium-spot.place-1 {
    order: 2;
    min-height: 180px;
    border-color: var(--color-warning);
    background: rgba(var(--color-warning-rgb), 0.1);
    animation-delay: 0.2s;
  }

  .podium-spot.place-2 {
    order: 1;
    min-height: 140px;
    animation-delay: 0.1s;
  }

  .podium-spot.place-3 {
    order: 3;
    min-height: 100px;
    animation-delay: 0.3s;
  }

  .place-indicator {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--space-1);
  }

  .crown {
    font-size: 32px;
    animation: bounce 1s ease-in-out infinite;
  }

  .place-number {
    font-size: var(--font-size-xl);
    font-weight: var(--font-weight-bold);
    color: var(--color-accent);
  }

  .place-1 .place-number {
    color: var(--color-warning);
  }

  .player-name {
    font-size: var(--font-size-md);
    font-weight: 600;
    color: var(--color-text-primary);
    text-align: center;
    max-width: 100px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .score {
    display: flex;
    flex-direction: column;
    align-items: center;
  }

  .score-value {
    font-size: var(--font-size-xl);
    font-weight: var(--font-weight-bold);
    color: var(--color-success);
  }

  .score-label {
    font-size: var(--font-size-xs);
    color: var(--color-text-muted);
    text-transform: uppercase;
  }

  .rankings {
    width: 100%;
    max-width: 400px;
    background: var(--color-bg-secondary);
    border-radius: var(--radius-md);
    padding: var(--space-4);
  }

  .rankings-title {
    margin: 0 0 var(--space-3);
    font-size: var(--font-size-lg);
    color: var(--color-text-primary);
    text-align: center;
    text-transform: uppercase;
    letter-spacing: 1px;
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
    padding: var(--space-2) var(--space-3);
    background: var(--color-bg-tertiary);
    border-radius: var(--radius-sm);
    border-left: 3px solid transparent;
  }

  .ranking-entry.you {
    border-left-color: var(--color-accent);
    background: rgba(var(--color-accent-rgb), 0.1);
  }

  .ranking-entry.top3 {
    border-left-color: var(--color-warning);
  }

  .ranking-entry.top3.you {
    border-left-color: var(--color-accent);
  }

  .rank {
    font-weight: var(--font-weight-bold);
    color: var(--color-accent);
    min-width: 30px;
  }

  .ranking-entry.top3 .rank {
    color: var(--color-warning);
  }

  .name {
    flex: 1;
    color: var(--color-text-primary);
    font-weight: 500;
  }

  .points {
    font-weight: var(--font-weight-bold);
    color: var(--color-success);
  }

  .rounds-played {
    font-size: var(--font-size-sm);
    color: var(--color-text-muted);
  }

  @media (max-width: 400px) {
    .final-results {
      padding: var(--space-4);
    }

    .podium {
      gap: var(--space-2);
    }

    .podium-spot {
      padding: var(--space-3);
    }

    .player-name {
      font-size: var(--font-size-sm);
      max-width: 70px;
    }
  }
</style>
