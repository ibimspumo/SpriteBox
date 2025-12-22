<!-- apps/web/src/routes/+layout.svelte -->
<script lang="ts">
  import { onMount } from 'svelte';
  import { browser } from '$app/environment';
  import { initSocketBridge } from '$lib/socketBridge';
  import { connectionStatus } from '$lib/stores';

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
</div>

<style>
  :global(*, *::before, *::after) {
    box-sizing: border-box;
  }

  :global(body) {
    margin: 0;
    padding: 0;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    background: #1a1a2e;
    color: #eee;
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
    background: rgba(0, 0, 0, 0.8);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
  }

  .connection-overlay p {
    font-size: 1.5rem;
    color: #fff;
  }
</style>
