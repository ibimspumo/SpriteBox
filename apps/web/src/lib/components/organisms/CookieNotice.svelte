<!-- Cookie Notice - GDPR/Privacy notice for session data -->
<script lang="ts">
  import { onMount } from 'svelte';
  import { browser } from '$app/environment';
  import { Button } from '$lib/components/atoms';
  import { t } from '$lib/i18n';

  const STORAGE_KEY = 'cookie-notice-accepted';

  let showNotice = $state(false);

  onMount(() => {
    if (browser) {
      const accepted = localStorage.getItem(STORAGE_KEY);
      showNotice = !accepted;
    }
  });

  function acceptNotice() {
    if (browser) {
      localStorage.setItem(STORAGE_KEY, 'true');
    }
    showNotice = false;
  }
</script>

{#if showNotice}
  <div class="cookie-notice">
    <p>
      {$t.cookieNotice.sessionData}
      {$t.cookieNotice.ipUsage}
      {$t.cookieNotice.noPersonalData}
    </p>
    <Button variant="primary" size="sm" onclick={acceptNotice}>
      {$t.cookieNotice.gotIt}
    </Button>
  </div>
{/if}

<style>
  .cookie-notice {
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    background: var(--color-bg-secondary);
    padding: var(--space-4);
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--space-3);
    z-index: var(--z-notification);
    border-top: var(--border-width-thin) solid var(--color-border-strong);
    animation: slideUp 0.3s ease-out;
  }

  .cookie-notice p {
    font-size: var(--font-size-sm);
    color: var(--color-text-secondary);
    margin: 0;
    text-align: center;
    max-width: 600px;
    line-height: var(--line-height-relaxed);
  }

  @media (min-width: 640px) {
    .cookie-notice {
      flex-direction: row;
      justify-content: center;
      gap: var(--space-6);
    }

    .cookie-notice p {
      text-align: left;
    }
  }
</style>
