<!-- apps/web/src/routes/+layout.svelte -->
<script lang="ts">
  import { onMount } from 'svelte';
  import { browser } from '$app/environment';
  import { initSocketBridge } from '$lib/socketBridge';
  import { connectionStatus } from '$lib/stores';
  import { initTheme, toggleTheme, theme } from '$lib/theme';

  let { children } = $props();

  onMount(() => {
    if (browser) {
      initTheme();
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

  <button class="theme-toggle" onclick={toggleTheme} aria-label="Toggle theme">
    {$theme === 'dark' ? '☀️' : '🌙'}
  </button>

  {@render children()}
</div>

<style>
  /* CSS Variables for theming */
  :global(:root) {
    /* Dark theme (default) */
    --bg-primary: #1a1a2e;
    --bg-secondary: #16213e;
    --bg-tertiary: #0f3460;
    --text-primary: #eee;
    --text-secondary: #aaa;
    --text-muted: #666;
    --accent: #e94560;
    --accent-hover: #ff6b6b;
    --success: #4ade80;
    --warning: #fbbf24;
    --border: rgba(255, 255, 255, 0.1);
    --overlay: rgba(0, 0, 0, 0.8);
  }

  :global([data-theme="light"]) {
    --bg-primary: #f5f5f5;
    --bg-secondary: #ffffff;
    --bg-tertiary: #e0e0e0;
    --text-primary: #1a1a1a;
    --text-secondary: #666;
    --text-muted: #999;
    --accent: #e94560;
    --accent-hover: #d63950;
    --success: #22c55e;
    --warning: #f59e0b;
    --border: rgba(0, 0, 0, 0.1);
    --overlay: rgba(255, 255, 255, 0.9);
  }

  :global(*, *::before, *::after) {
    box-sizing: border-box;
  }

  :global(body) {
    margin: 0;
    padding: 0;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    background: var(--bg-primary);
    color: var(--text-primary);
    min-height: 100vh;
    transition: background-color 0.3s ease, color 0.3s ease;
  }

  .app {
    min-height: 100vh;
    display: flex;
    flex-direction: column;
  }

  .theme-toggle {
    position: fixed;
    top: 1rem;
    right: 1rem;
    z-index: 100;
    background: var(--bg-secondary);
    border: 1px solid var(--border);
    border-radius: 50%;
    width: 40px;
    height: 40px;
    cursor: pointer;
    font-size: 1.2rem;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: transform 0.2s ease, background-color 0.3s ease;
  }

  .theme-toggle:hover {
    transform: scale(1.1);
    background: var(--bg-tertiary);
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
