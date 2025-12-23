<!-- PixelGuesser Reveal Phase - Shows round results -->
<script lang="ts">
  import { pixelGuesser, currentUser, game } from '$lib/stores';
  import { localizePrompt } from '$lib/prompts';
  import { t } from '$lib/i18n';
  import { Badge } from '../../atoms';
  import { PromptDisplay } from '../../molecules';
  import { PixelCanvas, Timer } from '../../utility';

  let scores = $derived($pixelGuesser.scores);
  let artistId = $derived($pixelGuesser.artistId);
  let artistUser = $derived($pixelGuesser.artistUser);
  let currentDrawing = $derived($pixelGuesser.currentDrawing);
  let round = $derived($pixelGuesser.round);
  let totalRounds = $derived($pixelGuesser.totalRounds);
  let user = $derived($currentUser);

  // Localized secret prompt
  let localizedSecretPrompt = $derived(
    $pixelGuesser.secretPromptIndices
      ? localizePrompt($pixelGuesser.secretPromptIndices)
      : $pixelGuesser.secretPrompt
        ? { prefix: '', subject: $pixelGuesser.secretPrompt, suffix: '' }
        : null
  );

  // Get the artist's entry for bonus display
  let artistEntry = $derived(scores.find(s => s.playerId === artistId));

  // Sort scores by total points descending
  let sortedScores = $derived([...scores].sort((a, b) => b.score - a.score));
</script>

<div class="reveal">
  <div class="header">
    <Badge variant="accent" text="{$t.pixelGuesser.round} {round}/{totalRounds}" />
    <Timer />
  </div>

  <div class="word-reveal">
    <span class="reveal-label">{$t.pixelGuesser.theWordWas}</span>
    {#if localizedSecretPrompt}
      <PromptDisplay prompt={localizedSecretPrompt} size="lg" />
    {/if}
  </div>

  <div class="drawing-section">
    <div class="artist-info">
      <span class="artist-label">{$t.pixelGuesser.artist}:</span>
      <span class="artist-name">{artistUser?.displayName ?? '...'}</span>
    </div>
    <div class="canvas-wrapper">
      <PixelCanvas pixelData={currentDrawing} size={180} readonly />
    </div>
    {#if artistEntry && artistEntry.roundScore > 0}
      <div class="artist-bonus">
        <Badge variant="success" text="+{artistEntry.roundScore} {$t.pixelGuesser.artistBonus}" />
      </div>
    {/if}
  </div>

  <!-- Scoreboard -->
  <div class="scoreboard">
    <h3 class="scoreboard-title">{$t.pixelGuesser.score}</h3>
    <div class="score-list">
      {#each sortedScores as entry, index (entry.playerId)}
        {@const isCurrentUser = entry.user.fullName === user?.fullName}
        {@const isArtist = entry.playerId === artistId}
        <div
          class="score-entry"
          class:you={isCurrentUser}
          class:artist={isArtist}
          class:guessed={entry.guessedCorrectly}
        >
          <div class="position">#{index + 1}</div>
          <div class="player-info">
            <span class="name">
              {isCurrentUser ? $t.common.you : entry.user.displayName}
              {#if isArtist}
                <span class="artist-badge">{$t.pixelGuesser.artist}</span>
              {/if}
            </span>
            {#if entry.guessedCorrectly && entry.guessTime}
              <span class="guess-time">
                {$t.pixelGuesser.guessedIn.replace('{{time}}', (entry.guessTime / 1000).toFixed(1))}
              </span>
            {:else if !isArtist && !entry.guessedCorrectly}
              <span class="no-guess">-</span>
            {/if}
          </div>
          <div class="points">
            {#if entry.roundScore > 0}
              <span class="round-score">+{entry.roundScore}</span>
            {/if}
            <span class="total-score">{entry.score} {$t.pixelGuesser.points}</span>
          </div>
        </div>
      {/each}
    </div>
  </div>

  {#if sortedScores.every(s => !s.guessedCorrectly || s.wasArtist)}
    <div class="no-guesses">
      <span>{$t.pixelGuesser.noOneGuessed}</span>
    </div>
  {/if}
</div>

<style>
  .reveal {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--space-5);
    padding: var(--space-4);
    width: 100%;
    max-width: 600px;
    margin: 0 auto;
  }

  .header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    width: 100%;
    flex-wrap: wrap;
    gap: var(--space-3);
  }

  .word-reveal {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--space-2);
    animation: fadeSlideUp 0.5s ease-out;
  }

  .reveal-label {
    font-size: var(--font-size-md);
    color: var(--color-text-secondary);
    text-transform: uppercase;
    letter-spacing: 1px;
  }

  .drawing-section {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--space-3);
  }

  .artist-info {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    font-size: var(--font-size-sm);
  }

  .artist-label {
    color: var(--color-text-secondary);
  }

  .artist-name {
    color: var(--color-text-primary);
    font-weight: var(--font-weight-bold);
  }

  .canvas-wrapper {
    padding: var(--space-3);
    background: var(--color-bg-secondary);
    border: 3px solid var(--color-bg-tertiary);
    border-radius: var(--radius-md);
    box-shadow: var(--shadow-pixel);
  }

  .artist-bonus {
    animation: scaleBounce 0.5s ease-out;
  }

  .scoreboard {
    width: 100%;
    max-width: 400px;
    background: var(--color-bg-secondary);
    border-radius: var(--radius-md);
    padding: var(--space-4);
  }

  .scoreboard-title {
    margin: 0 0 var(--space-3);
    font-size: var(--font-size-lg);
    color: var(--color-text-primary);
    text-align: center;
    text-transform: uppercase;
    letter-spacing: 1px;
  }

  .score-list {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
  }

  .score-entry {
    display: flex;
    align-items: center;
    gap: var(--space-3);
    padding: var(--space-3);
    background: var(--color-bg-tertiary);
    border-radius: var(--radius-sm);
    border-left: 3px solid transparent;
    transition: all 0.2s ease;
  }

  .score-entry.you {
    border-left-color: var(--color-accent);
    background: rgba(var(--color-accent-rgb), 0.1);
  }

  .score-entry.guessed {
    border-left-color: var(--color-success);
  }

  .score-entry.artist {
    border-left-color: var(--color-warning);
  }

  .position {
    font-size: var(--font-size-lg);
    font-weight: var(--font-weight-bold);
    color: var(--color-accent);
    min-width: 30px;
  }

  .player-info {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: var(--space-1);
  }

  .name {
    font-weight: 600;
    color: var(--color-text-primary);
    display: flex;
    align-items: center;
    gap: var(--space-2);
  }

  .artist-badge {
    font-size: var(--font-size-xs);
    padding: var(--space-1) var(--space-2);
    background: var(--color-warning);
    color: var(--color-bg-primary);
    border-radius: var(--radius-sm);
    text-transform: uppercase;
  }

  .guess-time {
    font-size: var(--font-size-xs);
    color: var(--color-success);
  }

  .no-guess {
    font-size: var(--font-size-xs);
    color: var(--color-text-muted);
  }

  .points {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: var(--space-1);
  }

  .round-score {
    font-size: var(--font-size-sm);
    color: var(--color-success);
    font-weight: var(--font-weight-bold);
  }

  .total-score {
    font-size: var(--font-size-md);
    font-weight: var(--font-weight-bold);
    color: var(--color-text-primary);
  }

  .no-guesses {
    padding: var(--space-3) var(--space-4);
    background: rgba(var(--color-warning-rgb), 0.1);
    border-radius: var(--radius-md);
    color: var(--color-warning);
    font-size: var(--font-size-sm);
  }

  @media (max-width: 400px) {
    .reveal {
      padding: var(--space-3);
    }

    .score-entry {
      padding: var(--space-2);
    }
  }
</style>
