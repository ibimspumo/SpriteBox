<!-- PixelGuesser Guessing Phase -->
<script lang="ts">
  import { game, pixelGuesser, currentUser, pixels, selectedColor } from '$lib/stores';
  import { pixelGuesserDraw, pixelGuesserGuess } from '$lib/socketBridge';
  import { t } from '$lib/i18n';
  import { localizePrompt } from '$lib/prompts';
  import { Button, Badge } from '../../atoms';
  import { PromptDisplay } from '../../molecules';
  import { PixelCanvas, ColorPalette, Timer } from '../../utility';

  let guessInput = $state('');

  let isArtist = $derived($pixelGuesser.isYouArtist);
  let artistUser = $derived($pixelGuesser.artistUser);
  let currentDrawing = $derived($pixelGuesser.currentDrawing);
  let hasGuessedCorrectly = $derived($pixelGuesser.hasGuessedCorrectly);
  let lastGuessResult = $derived($pixelGuesser.lastGuessResult);
  let correctGuessers = $derived($pixelGuesser.correctGuessers);
  let round = $derived($pixelGuesser.round);
  let totalRounds = $derived($pixelGuesser.totalRounds);
  let user = $derived($currentUser);

  // Localized secret prompt for the artist
  let localizedSecretPrompt = $derived(
    $pixelGuesser.secretPromptIndices
      ? localizePrompt($pixelGuesser.secretPromptIndices)
      : $pixelGuesser.secretPrompt
        ? { prefix: '', subject: $pixelGuesser.secretPrompt, suffix: '' }
        : null
  );

  // Send drawing updates as the artist draws
  function handlePixelChange(): void {
    if (isArtist) {
      pixelGuesserDraw($pixels);
    }
  }

  function handleSubmitGuess(): void {
    if (guessInput.trim() && !hasGuessedCorrectly) {
      pixelGuesserGuess(guessInput.trim());
      guessInput = '';
    }
  }

  function handleKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter') {
      handleSubmitGuess();
    }
  }

  // Subscribe to pixel changes and send updates
  $effect(() => {
    if (isArtist) {
      const unsubscribe = pixels.subscribe(() => {
        handlePixelChange();
      });
      return unsubscribe;
    }
  });
</script>

<div class="guessing">
  <div class="header">
    <div class="round-info">
      <Badge variant="accent" text="{$t.pixelGuesser.round} {round}/{totalRounds}" />
      <span class="artist-label">
        {$t.pixelGuesser.artist}: {artistUser?.displayName ?? '...'}
      </span>
    </div>
    <Timer />
  </div>

  {#if isArtist}
    <!-- Artist View -->
    <div class="artist-view">
      <div class="secret-word">
        <span class="label">{$t.pixelGuesser.youAreArtist}</span>
        {#if localizedSecretPrompt}
          <PromptDisplay prompt={localizedSecretPrompt} label={$t.pixelGuesser.drawThisWord} size="lg" />
        {/if}
      </div>

      <div class="canvas-wrapper artist-canvas">
        <PixelCanvas size={280} readonly={false} />
      </div>

      <ColorPalette />

      <div class="clear-action">
        <Button variant="secondary" onclick={() => pixels.set('1'.repeat(64))}>
          {$t.drawing.clear}
        </Button>
      </div>
    </div>
  {:else}
    <!-- Guesser View -->
    <div class="guesser-view">
      <div class="guess-prompt">
        <span class="label">{$t.pixelGuesser.guessTheWord}</span>
      </div>

      <div class="canvas-wrapper guesser-canvas">
        <PixelCanvas pixelData={currentDrawing} size={280} readonly />
      </div>

      {#if hasGuessedCorrectly}
        <div class="already-guessed">
          <Badge variant="success" text={$t.pixelGuesser.correct} />
          <span class="waiting">{$t.pixelGuesser.waitingForReveal}</span>
        </div>
      {:else}
        <div class="guess-input-section">
          {#if lastGuessResult && !lastGuessResult.correct}
            <div class="guess-feedback" class:close={lastGuessResult.close}>
              {lastGuessResult.close ? $t.pixelGuesser.close : $t.pixelGuesser.wrong}
            </div>
          {/if}

          <div class="input-row">
            <input
              type="text"
              class="guess-input"
              bind:value={guessInput}
              onkeydown={handleKeydown}
              placeholder={$t.pixelGuesser.guessPlaceholder}
              aria-label={$t.pixelGuesser.enterGuess}
              maxlength="50"
            />
            <Button variant="primary" onclick={handleSubmitGuess} disabled={!guessInput.trim()}>
              {$t.common.submit}
            </Button>
          </div>
        </div>
      {/if}
    </div>
  {/if}

  <!-- Correct guessers list -->
  {#if correctGuessers.length > 0}
    <div class="correct-guessers">
      {#each correctGuessers as guesser (guesser.playerId)}
        <div class="guesser-item">
          <span class="position">#{guesser.position}</span>
          <span class="name">{guesser.user.displayName}</span>
          <span class="points">+{guesser.points} {$t.pixelGuesser.points}</span>
        </div>
      {/each}
    </div>
  {/if}
</div>

<style>
  .guessing {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--space-4);
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

  .round-info {
    display: flex;
    align-items: center;
    gap: var(--space-3);
  }

  .artist-label {
    color: var(--color-text-secondary);
    font-size: var(--font-size-sm);
  }

  .artist-view,
  .guesser-view {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--space-4);
    width: 100%;
  }

  .secret-word {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--space-2);
  }

  .secret-word .label {
    color: var(--color-success);
    font-size: var(--font-size-lg);
    font-weight: var(--font-weight-bold);
    text-transform: uppercase;
    letter-spacing: 1px;
  }

  .guess-prompt .label {
    color: var(--color-text-primary);
    font-size: var(--font-size-lg);
    font-weight: var(--font-weight-bold);
    text-transform: uppercase;
    letter-spacing: 1px;
  }

  .canvas-wrapper {
    padding: var(--space-4);
    background: var(--color-bg-secondary);
    border: 3px solid var(--color-bg-tertiary);
    border-radius: var(--radius-md);
    box-shadow: var(--shadow-pixel);
  }

  .canvas-wrapper.artist-canvas {
    border-color: var(--color-success);
  }

  .canvas-wrapper.guesser-canvas {
    border-color: var(--color-accent);
  }

  .clear-action {
    width: 100%;
    max-width: 280px;
  }

  .already-guessed {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--space-2);
    padding: var(--space-4);
    background: var(--color-bg-secondary);
    border: 3px solid var(--color-success);
    border-radius: var(--radius-md);
    width: 100%;
    max-width: 300px;
  }

  .already-guessed .waiting {
    color: var(--color-text-secondary);
    font-size: var(--font-size-sm);
  }

  .guess-input-section {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
    width: 100%;
    max-width: 350px;
  }

  .guess-feedback {
    text-align: center;
    font-size: var(--font-size-sm);
    color: var(--color-text-secondary);
    padding: var(--space-2);
    border-radius: var(--radius-sm);
    background: var(--color-bg-secondary);
  }

  .guess-feedback.close {
    color: var(--color-warning);
    background: rgba(var(--color-warning-rgb), 0.1);
    font-weight: var(--font-weight-bold);
  }

  .input-row {
    display: flex;
    gap: var(--space-2);
    width: 100%;
  }

  .guess-input {
    flex: 1;
    padding: var(--space-3);
    border: 2px solid var(--color-bg-tertiary);
    border-radius: var(--radius-sm);
    background: var(--color-bg-secondary);
    color: var(--color-text-primary);
    font-size: var(--font-size-md);
  }

  .guess-input:focus {
    outline: none;
    border-color: var(--color-accent);
  }

  .guess-input::placeholder {
    color: var(--color-text-muted);
  }

  .correct-guessers {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-2);
    justify-content: center;
    padding: var(--space-3);
    background: var(--color-bg-secondary);
    border-radius: var(--radius-md);
    width: 100%;
    max-width: 400px;
  }

  .guesser-item {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    padding: var(--space-2) var(--space-3);
    background: var(--color-bg-tertiary);
    border-radius: var(--radius-sm);
    font-size: var(--font-size-sm);
  }

  .guesser-item .position {
    color: var(--color-accent);
    font-weight: var(--font-weight-bold);
  }

  .guesser-item .name {
    color: var(--color-text-primary);
  }

  .guesser-item .points {
    color: var(--color-success);
    font-weight: var(--font-weight-bold);
  }

  @media (max-width: 400px) {
    .guessing {
      padding: var(--space-3);
    }

    .canvas-wrapper {
      padding: var(--space-3);
    }

    .input-row {
      flex-direction: column;
    }
  }
</style>
