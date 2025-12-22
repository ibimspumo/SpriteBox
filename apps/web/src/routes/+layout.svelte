<!-- apps/web/src/routes/+layout.svelte -->
<script lang="ts">
  import { onMount } from 'svelte';
  import { browser } from '$app/environment';
  import { initSocketBridge } from '$lib/socketBridge';
  import { connectionStatus, lastError } from '$lib/stores';
  import DebugPanel from '$lib/components/debug/DebugPanel.svelte';
  import { CookieNotice } from '$lib/components/organisms';
  import '$lib/styles/tokens.css';

  let { children } = $props();
  let showCopiedToast = $state(false);
  let errorToast = $state<{ message: string; code: string } | null>(null);
  let errorTimeout: ReturnType<typeof setTimeout> | null = null;

  // Watch for errors and show toast
  $effect(() => {
    const error = $lastError;
    if (error && error.code !== 'INVALID_NAME') {
      // Show error toast (except INVALID_NAME which is handled by UsernameEditor)
      errorToast = {
        message: error.message || getErrorMessage(error.code),
        code: error.code,
      };

      // Clear previous timeout
      if (errorTimeout) clearTimeout(errorTimeout);

      // Auto-dismiss after 5 seconds
      errorTimeout = setTimeout(() => {
        errorToast = null;
        lastError.set(null);
      }, 5000);
    }
  });

  function dismissError() {
    errorToast = null;
    lastError.set(null);
    if (errorTimeout) clearTimeout(errorTimeout);
  }

  function getErrorMessage(code: string): string {
    const messages: Record<string, string> = {
      'DUPLICATE_SESSION': 'You are already in this game in another tab',
      'ALREADY_IN_GAME': 'You are already in a game',
      'JOIN_FAILED': 'Failed to join the game',
      'ROOM_NOT_FOUND': 'Room not found',
      'WRONG_PASSWORD': 'Incorrect password',
      'PASSWORD_BLOCKED': 'Too many failed attempts. Try again later.',
      'NOT_ENOUGH_PLAYERS': 'Not enough players to start',
      'KICKED': 'You were kicked from the game',
      'IDLE_DISCONNECT': 'Disconnected due to inactivity',
      'INSTANCE_CLOSED': 'The game was closed',
    };
    return messages[code] || 'An error occurred';
  }

  onMount(() => {
    if (browser) {
      initSocketBridge();
    }
  });

  async function handleShare() {
    const shareUrl = typeof window !== 'undefined' ? window.location.origin : 'https://spritebox.io';
    const shareData = {
      title: 'SpriteBox',
      text: 'Play SpriteBox - Multiplayer Pixel Art Game!',
      url: shareUrl
    };

    // Try Web Share API first (mobile)
    if (navigator.share && navigator.canShare?.(shareData)) {
      try {
        await navigator.share(shareData);
        return;
      } catch (err) {
        if ((err as Error).name === 'AbortError') return;
      }
    }

    // Fallback: Copy to clipboard
    try {
      await navigator.clipboard.writeText(shareUrl);
      showCopiedToast = true;
      setTimeout(() => { showCopiedToast = false; }, 2000);
    } catch {
      prompt('Copy this link:', shareUrl);
    }
  }
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

  <!-- Debug Panel (only in Development) -->
  <DebugPanel />

  <!-- Cookie/Privacy Notice -->
  <CookieNotice />

  <!-- Copied Toast -->
  {#if showCopiedToast}
    <div class="copied-toast">Link copied!</div>
  {/if}

  <!-- Error Toast -->
  {#if errorToast}
    <button class="error-toast" onclick={dismissError}>
      <span class="error-message">{errorToast.message}</span>
      <span class="error-dismiss">×</span>
    </button>
  {/if}

  <!-- Share Button - Always visible -->
  <button
    class="share-fab"
    onclick={handleShare}
    title="Share SpriteBox"
  >
    <img src="/icons/link.svg" alt="Share" class="share-icon" />
    <span class="share-text">Share</span>
  </button>

  <!-- GitHub Link - Desktop Only -->
  <a
    href="https://github.com/ibimspumo/SpriteBox"
    target="_blank"
    rel="noopener noreferrer"
    class="github-fab"
    title="View on GitHub"
  >
    <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
      <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
    </svg>
    <span class="github-text">Open Source</span>
  </a>
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

  /* Copied Toast */
  .copied-toast {
    position: fixed;
    top: var(--space-6);
    left: 50%;
    transform: translateX(-50%);
    padding: var(--space-3) var(--space-5);
    background: var(--color-success);
    color: white;
    font-size: var(--font-size-sm);
    font-weight: var(--font-weight-bold);
    text-transform: uppercase;
    letter-spacing: 1px;
    border: 3px solid rgba(255, 255, 255, 0.3);
    border-radius: var(--radius-sm);
    box-shadow: var(--shadow-pixel);
    z-index: var(--z-notification);
    animation: toastIn 0.2s ease-out;
  }

  @keyframes toastIn {
    from {
      opacity: 0;
      transform: translateX(-50%) translateY(-10px);
    }
    to {
      opacity: 1;
      transform: translateX(-50%) translateY(0);
    }
  }

  /* Error Toast */
  .error-toast {
    position: fixed;
    top: var(--space-6);
    left: 50%;
    transform: translateX(-50%);
    display: flex;
    align-items: center;
    gap: var(--space-3);
    padding: var(--space-3) var(--space-5);
    background: var(--color-danger);
    color: white;
    font-family: var(--font-family);
    font-size: var(--font-size-sm);
    font-weight: var(--font-weight-medium);
    border: 3px solid rgba(255, 255, 255, 0.3);
    border-radius: var(--radius-sm);
    box-shadow: var(--shadow-pixel);
    z-index: var(--z-notification);
    cursor: pointer;
    animation: toastIn 0.2s ease-out;
    max-width: calc(100vw - var(--space-8));
  }

  .error-toast:hover {
    background: var(--color-danger-hover, #d32f2f);
  }

  .error-message {
    flex: 1;
    text-align: left;
  }

  .error-dismiss {
    font-size: var(--font-size-lg);
    opacity: 0.7;
    line-height: 1;
  }

  .error-toast:hover .error-dismiss {
    opacity: 1;
  }

  /* Share Button - Always visible, bottom left */
  .share-fab {
    display: flex;
    position: fixed;
    bottom: var(--space-6);
    left: var(--space-6);
    align-items: center;
    gap: var(--space-2);
    padding: var(--space-3) var(--space-4);
    background: var(--color-bg-secondary);
    border: var(--border-width) solid var(--color-accent);
    border-radius: var(--radius-full);
    color: var(--color-text-secondary);
    font-family: var(--font-family);
    font-size: var(--font-size-sm);
    cursor: pointer;
    transition: var(--transition-normal);
    z-index: var(--z-sticky);
    box-shadow: var(--shadow-pixel-sm);
  }

  .share-fab:hover {
    background: var(--color-accent);
    color: var(--color-text-primary);
    transform: translateY(-2px);
    box-shadow: var(--shadow-pixel);
  }

  .share-icon {
    width: 20px;
    height: 20px;
    filter: brightness(0) invert(0.7);
  }

  .share-fab:hover .share-icon {
    filter: brightness(0) invert(1);
  }

  .share-text {
    font-weight: var(--font-weight-medium);
  }

  /* GitHub Floating Action Button - Desktop Only */
  .github-fab {
    display: none;
    position: fixed;
    bottom: var(--space-6);
    right: var(--space-6);
    align-items: center;
    gap: var(--space-2);
    padding: var(--space-3) var(--space-4);
    background: var(--color-bg-secondary);
    border: var(--border-width) solid var(--color-bg-tertiary);
    border-radius: var(--radius-full);
    color: var(--color-text-secondary);
    text-decoration: none;
    font-size: var(--font-size-sm);
    transition: var(--transition-normal);
    z-index: var(--z-sticky);
    box-shadow: var(--shadow-pixel-sm);
  }

  .github-fab:hover {
    background: var(--color-bg-tertiary);
    color: var(--color-text-primary);
    text-decoration: none;
    transform: translateY(-2px);
    box-shadow: var(--shadow-pixel);
  }

  .github-fab svg {
    flex-shrink: 0;
  }

  .github-text {
    font-weight: var(--font-weight-medium);
  }

  /* Show GitHub FAB only on desktop (768px+) */
  @media (min-width: 768px) {
    .github-fab {
      display: flex;
    }
  }
</style>
