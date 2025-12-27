<!-- VotingContenderCard - Single contender card for voting duel -->
<script lang="ts">
  import { t } from '$lib/i18n';
  import { PixelCanvas } from '../../utility';

  interface Props {
    position: 'left' | 'right';
    pixelData: string;
    ariaLabel: string;
    show?: boolean;
    onVote: () => void;
  }

  let { position, pixelData, ariaLabel, show = false, onVote }: Props = $props();
</script>

<button
  class="contender {position}"
  class:show
  onclick={onVote}
  aria-label={ariaLabel}
>
  <div class="contender-glow"></div>
  <div class="canvas-frame">
    <div class="frame-accent top"></div>
    <div class="frame-accent bottom"></div>
    <PixelCanvas
      {pixelData}
      size={140}
      readonly
    />
  </div>
  <div class="vote-prompt">
    <span class="tap-icon">&#x1F446;</span>
    <span class="tap-text">{$t.voting.clickToVote}</span>
  </div>
</button>

<style>
  /* ===== Contender Cards ===== */
  .contender {
    position: relative;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--space-3);
    padding: var(--space-4);
    background: linear-gradient(145deg, var(--color-bg-secondary) 0%, var(--color-bg-tertiary) 100%);
    border: 3px solid var(--color-border-strong);
    border-radius: var(--radius-lg);
    cursor: pointer;
    font-family: var(--font-family);
    opacity: 0;
    transform: translateY(30px) scale(0.9);
    transition: all 0.5s cubic-bezier(0.34, 1.56, 0.64, 1);
    box-shadow: var(--shadow-pixel-lg);
    width: 100%;
    max-width: 200px;
  }

  .contender.left {
    transition-delay: 0.1s;
  }

  .contender.right {
    transition-delay: 0.2s;
  }

  .contender.show {
    opacity: 1;
    transform: translateY(0) scale(1);
  }

  .contender:hover,
  .contender:focus-visible {
    transform: translateY(-4px) scale(1.02);
    border-color: var(--color-accent);
    box-shadow:
      var(--shadow-pixel-lg),
      0 0 40px rgba(78, 205, 196, 0.3);
  }

  .contender:active {
    transform: translateY(-2px) scale(1);
  }

  .contender:focus-visible {
    outline: 2px solid var(--color-accent);
    outline-offset: 4px;
  }

  .contender.left:hover .contender-glow,
  .contender.left:focus-visible .contender-glow {
    opacity: 1;
    background: radial-gradient(circle at center, rgba(78, 205, 196, 0.2) 0%, transparent 70%);
  }

  .contender.right:hover .contender-glow,
  .contender.right:focus-visible .contender-glow {
    opacity: 1;
    background: radial-gradient(circle at center, rgba(245, 166, 35, 0.2) 0%, transparent 70%);
  }

  .contender-glow {
    position: absolute;
    inset: -20px;
    border-radius: var(--radius-xl);
    opacity: 0;
    transition: opacity 0.3s ease;
    pointer-events: none;
  }

  .canvas-frame {
    position: relative;
    padding: var(--space-3);
    max-width: 100%;
    box-sizing: border-box;
    background: var(--color-bg-primary);
    border-radius: var(--radius-md);
    border: 2px solid var(--color-bg-elevated);
  }

  .frame-accent {
    position: absolute;
    left: 50%;
    transform: translateX(-50%);
    width: 40%;
    height: 3px;
    border-radius: var(--radius-full);
    opacity: 0.5;
    transition: all 0.3s ease;
  }

  .frame-accent.top {
    top: -2px;
    background: var(--color-accent);
  }

  .frame-accent.bottom {
    bottom: -2px;
    background: var(--color-brand);
  }

  .contender:hover .frame-accent {
    width: 60%;
    opacity: 1;
  }

  .vote-prompt {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    opacity: 0.6;
    transition: all 0.3s ease;
  }

  .contender:hover .vote-prompt,
  .contender:focus-visible .vote-prompt {
    opacity: 1;
  }

  .tap-icon {
    font-size: 1.2rem;
    animation: bounce 1s ease-in-out infinite;
  }

  .tap-text {
    font-size: var(--font-size-xs);
    font-weight: var(--font-weight-bold);
    color: var(--color-text-muted);
    text-transform: uppercase;
    letter-spacing: 1px;
  }

  .contender:hover .tap-text {
    color: var(--color-accent);
  }

  /* Reduce motion */
  @media (prefers-reduced-motion: reduce) {
    .tap-icon {
      animation: none;
    }

    .contender {
      transition: opacity 0.2s ease;
      transform: none;
    }

    .contender.show {
      transform: none;
    }
  }

  @media (min-width: 640px) {
    .contender {
      max-width: none;
      flex: 1;
    }
  }

  @media (max-width: 380px) {
    .contender {
      padding: var(--space-3);
    }
  }
</style>
