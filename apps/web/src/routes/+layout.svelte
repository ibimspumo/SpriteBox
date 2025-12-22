<!-- apps/web/src/routes/+layout.svelte -->
<script lang="ts">
  import { onMount } from 'svelte';
  import { browser } from '$app/environment';
  import { initSocketBridge } from '$lib/socketBridge';
  import { connectionStatus } from '$lib/stores';
  import DebugPanel from '$lib/components/debug/DebugPanel.svelte';
  import { CookieNotice } from '$lib/components/organisms';
  import '$lib/styles/tokens.css';

  let { children } = $props();

  onMount(() => {
    if (browser) {
      initSocketBridge();
    }
  });
</script>

<div class="app">
  {#if $connectionStatus === 'disconnected'}
    <div class="connection-overlay">
      <div class="connection-box">
        <div class="loading-dots">
          <span></span>
          <span></span>
          <span></span>
        </div>
        <p>Connecting...</p>
      </div>
    </div>
  {/if}

  {@render children()}

  <!-- Debug Panel (nur in Development) -->
  <DebugPanel />

  <!-- Cookie/Privacy Notice -->
  <CookieNotice />
</div>

<style>
  :global(*, *::before, *::after) {
    box-sizing: border-box;
  }

  :global(body) {
    margin: 0;
    padding: 0;
    font-family: var(--font-family);
    background: var(--color-bg-primary);
    color: var(--color-text-primary);
    min-height: 100vh;
    line-height: var(--line-height-normal);
  }

  :global(a) {
    color: var(--color-accent);
    text-decoration: none;
  }

  :global(a:hover) {
    color: var(--color-accent-hover);
    text-decoration: underline;
  }

  /* Scrollbar styling */
  :global(::-webkit-scrollbar) {
    width: 8px;
    height: 8px;
  }

  :global(::-webkit-scrollbar-track) {
    background: var(--color-bg-secondary);
  }

  :global(::-webkit-scrollbar-thumb) {
    background: var(--color-bg-tertiary);
    border-radius: var(--radius-sm);
  }

  :global(::-webkit-scrollbar-thumb:hover) {
    background: var(--color-bg-elevated);
  }

  .app {
    min-height: 100vh;
    display: flex;
    flex-direction: column;
    background:
      radial-gradient(ellipse at 50% 0%, rgba(78, 205, 196, 0.08) 0%, transparent 50%),
      var(--color-bg-primary);
  }

  .connection-overlay {
    position: fixed;
    inset: 0;
    background: var(--color-overlay);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: var(--z-modal);
  }

  .connection-box {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--space-4);
    padding: var(--space-8);
    background: var(--color-bg-secondary);
    border: 3px solid var(--color-bg-tertiary);
    border-radius: var(--radius-md);
  }

  .connection-box p {
    margin: 0;
    font-size: var(--font-size-lg);
    color: var(--color-text-primary);
  }

  .loading-dots {
    display: flex;
    gap: var(--space-2);
  }

  .loading-dots span {
    width: 12px;
    height: 12px;
    background: var(--color-accent);
    animation: dotPulse 1.4s ease-in-out infinite;
  }

  .loading-dots span:nth-child(1) {
    animation-delay: 0s;
  }

  .loading-dots span:nth-child(2) {
    animation-delay: 0.2s;
  }

  .loading-dots span:nth-child(3) {
    animation-delay: 0.4s;
  }

  @keyframes dotPulse {
    0%, 80%, 100% {
      transform: scale(0.6);
      opacity: 0.5;
    }
    40% {
      transform: scale(1);
      opacity: 1;
    }
  }
</style>
