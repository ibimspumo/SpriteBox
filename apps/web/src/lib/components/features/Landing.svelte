<!-- Landing Page - SpriteBox Introduction -->
<script lang="ts">
  import { goto } from '$app/navigation';
  import { t } from '$lib/i18n';
  import { Button, OnlineBadge } from '$lib/components/atoms';
  import { DemoCanvas } from '$lib/components/utility';
  import { globalOnlineCount } from '$lib/stores';
  import { onMount } from 'svelte';

  let mounted = $state(false);

  function handleStartPlaying() {
    goto('/play');
  }

  onMount(() => {
    setTimeout(() => {
      mounted = true;
    }, 100);
  });

  // Generate floating pixel positions
  const floatingPixels = Array.from({ length: 12 }, (_, i) => ({
    id: i,
    left: Math.random() * 100,
    top: Math.random() * 100,
    delay: Math.random() * 5,
    duration: 8 + Math.random() * 6,
    size: 4 + Math.random() * 8,
    color: ['#4ecdc4', '#f5a623', '#22c55e', '#ff3b30', '#af52de', '#007aff'][Math.floor(Math.random() * 6)]
  }));
</script>

<div class="landing" class:mounted>
  <!-- Floating background pixels -->
  <div class="floating-pixels" aria-hidden="true">
    {#each floatingPixels as pixel}
      <div
        class="floating-pixel"
        style="
          left: {pixel.left}%;
          top: {pixel.top}%;
          animation-delay: {pixel.delay}s;
          animation-duration: {pixel.duration}s;
          width: {pixel.size}px;
          height: {pixel.size}px;
          background: {pixel.color};
        "
      ></div>
    {/each}
  </div>

  <!-- Main Content -->
  <div class="hero">
    <!-- Player Count Badge -->
    {#if $globalOnlineCount > 0}
      <div class="online-badge-wrapper">
        <OnlineBadge count={$globalOnlineCount} label={$t.modeSelection.players} />
      </div>
    {/if}

    <!-- Logo -->
    <div class="logo-container">
      <img src="/logo.png" alt="SpriteBox" class="logo" />
    </div>

    <!-- Title & Description -->
    <div class="title-section">
      <h1 class="title">{$t.landing.heroTitle}</h1>
      <p class="subtitle">{$t.landing.heroSubtitle}</p>
      <p class="description">{$t.landing.heroDescription}</p>
    </div>

    <!-- Interactive Demo -->
    <div class="demo-section">
      <span class="demo-label">{$t.landing.tryIt}</span>
      <DemoCanvas size={180} />
    </div>

    <!-- CTA Section -->
    <div class="cta-section">
      <Button variant="primary" size="lg" onclick={handleStartPlaying}>
        {$t.landing.startPlaying}
      </Button>
      <span class="modes-hint">{$t.landing.multipleModesHint}</span>
    </div>
  </div>
</div>

<style>
  .landing {
    min-height: 100vh;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    position: relative;
    overflow: hidden;
    padding: var(--space-6);
    background:
      radial-gradient(ellipse at 30% 20%, rgba(78, 205, 196, 0.12) 0%, transparent 50%),
      radial-gradient(ellipse at 70% 80%, rgba(245, 166, 35, 0.08) 0%, transparent 50%),
      var(--color-bg-primary);
  }

  /* Floating background pixels */
  .floating-pixels {
    position: absolute;
    inset: 0;
    pointer-events: none;
    overflow: hidden;
  }

  .floating-pixel {
    position: absolute;
    opacity: 0.15;
    animation: float linear infinite;
    image-rendering: pixelated;
  }

  @keyframes float {
    0%, 100% {
      transform: translateY(0) rotate(0deg);
      opacity: 0.1;
    }
    25% {
      opacity: 0.2;
    }
    50% {
      transform: translateY(-30px) rotate(180deg);
      opacity: 0.15;
    }
    75% {
      opacity: 0.2;
    }
  }

  /* Hero section */
  .hero {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--space-5);
    max-width: 500px;
    width: 100%;
    z-index: 1;
  }

  /* Logo */
  .logo-container {
    opacity: 0;
    transform: translateY(-20px) scale(0.9);
    transition: all 0.6s cubic-bezier(0.34, 1.56, 0.64, 1);
  }

  .mounted .logo-container {
    opacity: 1;
    transform: translateY(0) scale(1);
  }

  .logo {
    width: 260px;
    height: auto;
    filter: drop-shadow(0 4px 20px rgba(245, 166, 35, 0.4));
    animation: logoGlow 3s ease-in-out infinite;
  }

  @keyframes logoGlow {
    0%, 100% {
      filter: drop-shadow(0 4px 20px rgba(245, 166, 35, 0.4));
    }
    50% {
      filter: drop-shadow(0 4px 30px rgba(245, 166, 35, 0.6));
    }
  }

  /* Title Section */
  .title-section {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--space-2);
    text-align: center;
    opacity: 0;
    transform: translateY(20px);
    transition: all 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) 0.1s;
  }

  .mounted .title-section {
    opacity: 1;
    transform: translateY(0);
  }

  .title {
    margin: 0;
    font-size: var(--font-size-3xl);
    font-weight: var(--font-weight-bold);
    color: var(--color-text-primary);
    text-transform: uppercase;
    letter-spacing: 3px;
    text-shadow:
      0 0 40px rgba(78, 205, 196, 0.5),
      4px 4px 0 rgba(0, 0, 0, 0.3);
  }

  .subtitle {
    margin: 0;
    font-size: var(--font-size-lg);
    color: var(--color-brand);
    font-weight: var(--font-weight-semibold);
    letter-spacing: 2px;
  }

  .description {
    margin: 0;
    margin-top: var(--space-2);
    font-size: var(--font-size-sm);
    color: var(--color-text-secondary);
    max-width: 380px;
    line-height: var(--line-height-relaxed);
  }

  /* Demo section */
  .demo-section {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--space-3);
    padding: var(--space-5);
    background: rgba(26, 26, 62, 0.6);
    border: 2px solid var(--color-bg-tertiary);
    border-radius: var(--radius-lg);
    backdrop-filter: blur(10px);
    opacity: 0;
    transform: translateY(20px) scale(0.95);
    transition: all 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) 0.2s;
  }

  .mounted .demo-section {
    opacity: 1;
    transform: translateY(0) scale(1);
  }

  .demo-label {
    font-size: var(--font-size-sm);
    color: var(--color-text-muted);
    text-transform: uppercase;
    letter-spacing: 2px;
    font-weight: var(--font-weight-medium);
  }

  /* CTA Section */
  .cta-section {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--space-3);
    opacity: 0;
    transform: translateY(20px);
    transition: all 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) 0.3s;
  }

  .mounted .cta-section {
    opacity: 1;
    transform: translateY(0);
  }

  .cta-section :global(.pixel-btn) {
    animation: ctaPulse 2s ease-in-out infinite;
  }

  @keyframes ctaPulse {
    0%, 100% {
      box-shadow: 0 0 0 0 rgba(34, 197, 94, 0.4);
    }
    50% {
      box-shadow: 0 0 0 8px rgba(34, 197, 94, 0);
    }
  }

  .modes-hint {
    font-size: var(--font-size-xs);
    color: var(--color-text-muted);
    letter-spacing: 1px;
  }

  .online-badge-wrapper {
    opacity: 0;
    transform: translateY(-10px);
    transition: all 0.5s cubic-bezier(0.34, 1.56, 0.64, 1);
  }

  .mounted .online-badge-wrapper {
    opacity: 1;
    transform: translateY(0);
  }

  /* Responsive */
  @media (max-width: 480px) {
    .landing {
      padding: var(--space-4);
    }

    .logo {
      width: 180px;
    }

    .title {
      font-size: var(--font-size-2xl);
      letter-spacing: 2px;
    }

    .subtitle {
      font-size: var(--font-size-md);
    }

    .description {
      font-size: var(--font-size-xs);
      max-width: 300px;
    }

    .demo-section {
      padding: var(--space-4);
    }
  }

  @media (max-height: 700px) {
    .hero {
      gap: var(--space-3);
    }

    .logo {
      width: 160px;
    }

    .demo-section {
      padding: var(--space-3);
    }

    .description {
      display: none;
    }
  }

  /* Reduced motion */
  @media (prefers-reduced-motion: reduce) {
    .floating-pixel,
    .logo,
    .cta-section :global(.pixel-btn) {
      animation: none;
    }

    .logo-container,
    .title-section,
    .demo-section,
    .cta-section {
      transition: none;
      opacity: 1;
      transform: none;
    }
  }
</style>
