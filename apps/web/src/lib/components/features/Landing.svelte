<!-- Landing Page - SpriteBox Introduction -->
<script lang="ts">
  import { t } from '$lib/i18n';
  import { Button } from '$lib/components/atoms';
  import { DemoCanvas } from '$lib/components/utility';
  import { onMount } from 'svelte';

  interface Props {
    onEnterGame: () => void;
  }

  let { onEnterGame }: Props = $props();

  let mounted = $state(false);

  onMount(() => {
    // Trigger entrance animations
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
    <!-- Logo -->
    <div class="logo-container">
      <img src="/logo.png" alt="SpriteBox" class="logo" />
    </div>

    <!-- Title -->
    <h1 class="title">{$t.landing.heroTitle}</h1>
    <p class="subtitle">{$t.landing.heroSubtitle}</p>

    <!-- Interactive Demo -->
    <div class="demo-section">
      <span class="demo-label">{$t.landing.tryIt}</span>
      <DemoCanvas size={180} />
    </div>

    <!-- Feature Stats -->
    <div class="features">
      <div class="feature">
        <span class="feature-icon">&#9998;</span>
        <span class="feature-value">{$t.landing.seconds}</span>
        <span class="feature-label">{$t.landing.drawingTime}</span>
      </div>
      <div class="feature-divider"></div>
      <div class="feature">
        <span class="feature-icon">&#9733;</span>
        <span class="feature-value">{$t.landing.perRound}</span>
        <span class="feature-label">{$t.landing.votingRounds}</span>
      </div>
      <div class="feature-divider"></div>
      <div class="feature">
        <span class="feature-icon">&#9889;</span>
        <span class="feature-value">{$t.landing.underMinutes}</span>
        <span class="feature-label">{$t.landing.quickMatches}</span>
      </div>
    </div>

    <!-- CTA Button -->
    <div class="cta-container">
      <Button variant="primary" size="lg" onclick={onEnterGame}>
        {$t.landing.startPlaying}
      </Button>
    </div>

    <!-- Scroll indicator for mobile -->
    <div class="scroll-hint" aria-hidden="true">
      <span class="scroll-arrow"></span>
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
    width: 280px;
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

  /* Title */
  .title {
    margin: 0;
    font-size: var(--font-size-3xl);
    font-weight: var(--font-weight-bold);
    text-align: center;
    color: var(--color-text-primary);
    text-transform: uppercase;
    letter-spacing: 3px;
    opacity: 0;
    transform: translateY(20px);
    transition: all 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) 0.1s;
    text-shadow:
      0 0 40px rgba(78, 205, 196, 0.5),
      4px 4px 0 rgba(0, 0, 0, 0.3);
  }

  .mounted .title {
    opacity: 1;
    transform: translateY(0);
  }

  .subtitle {
    margin: 0;
    font-size: var(--font-size-lg);
    color: var(--color-brand);
    text-align: center;
    font-weight: var(--font-weight-semibold);
    letter-spacing: 2px;
    opacity: 0;
    transform: translateY(20px);
    transition: all 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) 0.2s;
  }

  .mounted .subtitle {
    opacity: 1;
    transform: translateY(0);
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
    transition: all 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) 0.3s;
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

  /* Features */
  .features {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: var(--space-4);
    flex-wrap: wrap;
    opacity: 0;
    transform: translateY(20px);
    transition: all 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) 0.4s;
  }

  .mounted .features {
    opacity: 1;
    transform: translateY(0);
  }

  .feature {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--space-1);
    padding: var(--space-3) var(--space-4);
    min-width: 80px;
  }

  .feature-icon {
    font-size: var(--font-size-xl);
    color: var(--color-accent);
    line-height: 1;
  }

  .feature-value {
    font-size: var(--font-size-lg);
    font-weight: var(--font-weight-bold);
    color: var(--color-text-primary);
    letter-spacing: 1px;
  }

  .feature-label {
    font-size: var(--font-size-xs);
    color: var(--color-text-muted);
    text-transform: uppercase;
    letter-spacing: 1px;
  }

  .feature-divider {
    width: 2px;
    height: 40px;
    background: var(--color-bg-tertiary);
    border-radius: 1px;
  }

  /* CTA */
  .cta-container {
    margin-top: var(--space-2);
    opacity: 0;
    transform: translateY(20px);
    transition: all 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) 0.5s;
  }

  .mounted .cta-container {
    opacity: 1;
    transform: translateY(0);
  }

  .cta-container :global(.pixel-btn) {
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

  /* Scroll hint */
  .scroll-hint {
    position: absolute;
    bottom: var(--space-6);
    left: 50%;
    transform: translateX(-50%);
    opacity: 0;
    transition: opacity 0.6s ease 1s;
    display: none;
  }

  .mounted .scroll-hint {
    opacity: 0.4;
  }

  .scroll-arrow {
    display: block;
    width: 16px;
    height: 16px;
    border-right: 3px solid var(--color-text-muted);
    border-bottom: 3px solid var(--color-text-muted);
    transform: rotate(45deg);
    animation: scrollBounce 1.5s ease-in-out infinite;
  }

  @keyframes scrollBounce {
    0%, 100% {
      transform: rotate(45deg) translateY(0);
    }
    50% {
      transform: rotate(45deg) translateY(6px);
    }
  }

  /* Responsive */
  @media (max-width: 480px) {
    .landing {
      padding: var(--space-4);
      padding-bottom: var(--space-12);
    }

    .logo {
      width: 150px;
      height: auto;
    }

    .title {
      font-size: var(--font-size-2xl);
      letter-spacing: 2px;
    }

    .subtitle {
      font-size: var(--font-size-md);
    }

    .demo-section {
      padding: var(--space-4);
    }

    .features {
      gap: var(--space-2);
    }

    .feature {
      padding: var(--space-2) var(--space-3);
      min-width: 70px;
    }

    .feature-value {
      font-size: var(--font-size-md);
    }

    .feature-divider {
      height: 30px;
    }

    .scroll-hint {
      display: block;
    }
  }

  @media (max-height: 700px) {
    .hero {
      gap: var(--space-3);
    }

    .logo {
      width: 150px;
      height: auto;
    }

    .demo-section {
      padding: var(--space-3);
    }
  }

  /* Reduced motion */
  @media (prefers-reduced-motion: reduce) {
    .floating-pixel,
    .logo,
    .cta-container :global(.pixel-btn),
    .scroll-arrow {
      animation: none;
    }

    .logo-container,
    .title,
    .subtitle,
    .demo-section,
    .features,
    .cta-container {
      transition: none;
      opacity: 1;
      transform: none;
    }
  }
</style>
