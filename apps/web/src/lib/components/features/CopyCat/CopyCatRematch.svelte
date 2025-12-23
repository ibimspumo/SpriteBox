<!-- CopyCatRematch - Rematch prompt for CopyCat mode -->
<script lang="ts">
  import { Timer } from '../../utility';
  import { Button } from '../../atoms';
  import { copyCat, currentUser } from '$lib/stores';
  import { copyCatRematchVote } from '$lib/socketBridge';
  import { t } from '$lib/i18n';

  let votes = $derived($copyCat.rematchVotes);
  let result = $derived($copyCat.rematchResult);
  let hasVoted = $derived($copyCat.hasVotedRematch);
  let user = $derived($currentUser);
  let results = $derived($copyCat.results);

  // Find my playerId from the results (which contain the mapping)
  let myPlayerId = $derived(
    results.find(r => r.user.fullName === user?.fullName)?.playerId || ''
  );

  // Find opponent's vote (the one that isn't mine)
  let opponentVote = $derived(
    votes.find(v => v.playerId !== myPlayerId)
  );

  function handleYes() {
    if (!hasVoted) {
      copyCatRematchVote(true);
    }
  }

  function handleNo() {
    if (!hasVoted) {
      copyCatRematchVote(false);
    }
  }
</script>

<div class="rematch-container">
  <div class="header">
    {#if result}
      {#if result.rematch}
        <h1 class="title success">{$t.copyCat.rematchAccepted}</h1>
        <p class="subtitle">{$t.copyCat.startingNewRound}</p>
      {:else}
        <h1 class="title">{$t.copyCat.backToLobby}</h1>
        <p class="subtitle">
          {result.reason === 'declined' ? $t.copyCat.opponentDeclined : $t.copyCat.rematchTimeout}
        </p>
      {/if}
    {:else}
      <h1 class="title">{$t.copyCat.playAgain}</h1>
      <p class="subtitle">{$t.copyCat.rematchQuestion}</p>
    {/if}
  </div>

  <div class="timer-section">
    <Timer />
  </div>

  {#if !result}
    <div class="vote-section">
      {#if hasVoted}
        <div class="waiting-message">
          <span class="waiting-icon">...</span>
          <span>{$t.copyCat.waitingForOpponent}</span>
        </div>
      {:else}
        <div class="button-row">
          <Button variant="action" size="lg" onclick={handleYes}>
            {$t.copyCat.yesRematch}
          </Button>
          <Button variant="secondary" size="lg" onclick={handleNo}>
            {$t.copyCat.noThanks}
          </Button>
        </div>
      {/if}
    </div>

    <!-- Vote status -->
    <div class="vote-status">
      {#each votes as vote (vote.playerId)}
        <div class="vote-indicator" class:yes={vote.wantsRematch} class:no={!vote.wantsRematch}>
          {vote.wantsRematch ? $t.copyCat.wantsRematch : $t.copyCat.declined}
        </div>
      {/each}
    </div>
  {/if}
</div>

<style>
  .rematch-container {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--space-6);
    padding: var(--space-6);
    width: 100%;
    max-width: 400px;
    margin: 0 auto;
  }

  .header {
    text-align: center;
  }

  .title {
    font-size: var(--font-size-2xl);
    color: var(--color-accent);
    margin: 0;
    text-transform: uppercase;
    letter-spacing: 2px;
  }

  .title.success {
    color: var(--color-success);
    animation: celebrate 0.5s ease-out;
  }

  .subtitle {
    font-size: var(--font-size-md);
    color: var(--color-text-secondary);
    margin: var(--space-2) 0 0;
  }

  .timer-section {
    width: 100%;
    display: flex;
    justify-content: center;
  }

  .vote-section {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--space-4);
    width: 100%;
  }

  .button-row {
    display: flex;
    gap: var(--space-4);
    width: 100%;
    justify-content: center;
  }

  .waiting-message {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--space-2);
    padding: var(--space-4);
    background: var(--color-bg-secondary);
    border: 3px solid var(--color-bg-tertiary);
    border-radius: var(--radius-md);
    color: var(--color-text-secondary);
    font-size: var(--font-size-md);
    text-transform: uppercase;
    letter-spacing: 1px;
  }

  .waiting-icon {
    font-size: var(--font-size-2xl);
    animation: blink 1s ease-in-out infinite;
  }

  .vote-status {
    display: flex;
    gap: var(--space-3);
    flex-wrap: wrap;
    justify-content: center;
  }

  .vote-indicator {
    padding: var(--space-2) var(--space-4);
    border-radius: var(--radius-sm);
    font-size: var(--font-size-sm);
    text-transform: uppercase;
    letter-spacing: 1px;
    font-weight: 600;
  }

  .vote-indicator.yes {
    background: rgba(var(--color-success-rgb), 0.2);
    border: 2px solid var(--color-success);
    color: var(--color-success);
  }

  .vote-indicator.no {
    background: rgba(var(--color-error-rgb), 0.2);
    border: 2px solid var(--color-error);
    color: var(--color-error);
  }

  @keyframes celebrate {
    0% {
      transform: scale(0.8);
      opacity: 0;
    }
    50% {
      transform: scale(1.1);
    }
    100% {
      transform: scale(1);
      opacity: 1;
    }
  }

  @keyframes blink {
    0%, 100% {
      opacity: 1;
    }
    50% {
      opacity: 0.3;
    }
  }

  @media (max-width: 480px) {
    .rematch-container {
      padding: var(--space-4);
    }

    .button-row {
      flex-direction: column;
    }
  }
</style>
