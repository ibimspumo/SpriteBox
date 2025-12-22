<!-- apps/web/src/routes/+layout.svelte -->
<script lang="ts">
  import { onMount } from 'svelte';
  import { browser } from '$app/environment';
  import { initSocketBridge } from '$lib/socketBridge';
  import { connectionStatus } from '$lib/stores';
  import DebugPanel from '$lib/components/debug/DebugPanel.svelte';
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
      <p>Verbindung wird hergestellt...</p>
    </div>
  {/if}

  {@render children()}

  <!-- Debug Panel (nur in Development) -->
  <DebugPanel />
</div>

<style>
  /* Legacy aliases - mapped to new design tokens */
  :global(:root) {
    --bg-primary: var(--color-bg-primary);
    --bg-secondary: var(--color-bg-secondary);
    --bg-tertiary: var(--color-bg-tertiary);
    --text-primary: var(--color-text-primary);
    --text-secondary: var(--color-text-secondary);
    --text-muted: var(--color-text-muted);
    --accent: var(--color-accent);
    --accent-hover: var(--color-accent-hover);
    --success: var(--color-success);
    --warning: var(--color-warning);
    --border: var(--color-border);
    --overlay: var(--color-overlay);
  }

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
  }

  .app {
    min-height: 100vh;
    display: flex;
    flex-direction: column;
  }

  .connection-overlay {
    position: fixed;
    inset: 0;
    background: var(--overlay);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
  }

  .connection-overlay p {
    font-size: 1.5rem;
    color: var(--text-primary);
  }
</style>
