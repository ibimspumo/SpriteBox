<!-- apps/web/src/routes/+page.svelte -->
<!-- Landing Page - Entry point for SpriteBox -->
<script lang="ts">
  import { sessionBlocked } from '$lib/stores';
  import { t } from '$lib/i18n';
  import { Landing } from '$lib/components/features';
  import { Button } from '$lib/components/atoms';
</script>

<main>
  {#if $sessionBlocked}
    <div class="blocked-overlay">
      <div class="blocked-message">
        <span class="blocked-icon">🎮</span>
        <h2>{$t.sessionBlocked.title}</h2>
        <p>{$t.sessionBlocked.message1}</p>
        <p>{$t.sessionBlocked.message2}</p>
        <Button variant="secondary" onclick={() => window.location.reload()}>{$t.sessionBlocked.tryAgain}</Button>
      </div>
    </div>
  {:else}
    <Landing />
  {/if}
</main>

<style>
  main {
    flex: 1;
    display: flex;
    flex-direction: column;
  }

  .blocked-overlay {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: var(--space-6);
  }

  .blocked-message {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--space-4);
    text-align: center;
    padding: var(--space-8);
    background: var(--color-bg-secondary);
    border: 3px solid var(--color-warning);
    border-radius: var(--radius-md);
    max-width: 400px;
  }

  .blocked-icon {
    font-size: 3rem;
  }

  .blocked-message h2 {
    margin: 0;
    font-size: var(--font-size-xl);
    color: var(--color-warning);
  }

  .blocked-message p {
    margin: 0;
    color: var(--color-text-secondary);
    font-size: var(--font-size-sm);
  }
</style>
