<!-- VSBadge - VS indicator badge for voting duel -->
<script lang="ts">
  import { t } from '$lib/i18n';

  interface Props {
    show?: boolean;
  }

  let { show = false }: Props = $props();
</script>

<div class="vs-container" class:show>
  <div class="vs-badge">
    <span class="vs-text">{$t.voting.vs}</span>
  </div>
  <div class="vs-lightning left" aria-hidden="true">&#x26A1;</div>
  <div class="vs-lightning right" aria-hidden="true">&#x26A1;</div>
</div>

<style>
  /* ===== VS Badge ===== */
  .vs-container {
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: var(--space-2) 0;
    opacity: 0;
    transform: scale(0.5);
    transition: all 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) 0.3s;
  }

  .vs-container.show {
    opacity: 1;
    transform: scale(1);
  }

  .vs-badge {
    padding: var(--space-3) var(--space-5);
    background: linear-gradient(145deg, var(--color-bg-tertiary) 0%, var(--color-bg-elevated) 100%);
    border: 3px solid var(--color-brand);
    border-radius: var(--radius-lg);
    box-shadow:
      var(--shadow-pixel),
      0 0 30px rgba(245, 166, 35, 0.3);
  }

  .vs-text {
    font-size: var(--font-size-2xl);
    font-weight: var(--font-weight-bold);
    color: var(--color-brand);
    text-transform: uppercase;
    letter-spacing: 4px;
    text-shadow: 2px 2px 0 rgba(0, 0, 0, 0.5);
    animation: vsPulse 2s ease-in-out infinite;
  }

  @keyframes vsPulse {
    0%, 100% { transform: scale(1); }
    50% { transform: scale(1.1); }
  }

  .vs-lightning {
    position: absolute;
    top: 50%;
    transform: translateY(-50%);
    font-size: 1.5rem;
    opacity: 0.7;
    animation: flash 1s ease-in-out infinite;
  }

  .vs-lightning.left {
    left: -30px;
    animation-delay: 0s;
  }

  .vs-lightning.right {
    right: -30px;
    animation-delay: 0.5s;
  }

  @keyframes flash {
    0%, 100% { opacity: 0.3; transform: translateY(-50%) scale(0.9); }
    50% { opacity: 1; transform: translateY(-50%) scale(1.1); }
  }

  /* Reduce motion */
  @media (prefers-reduced-motion: reduce) {
    .vs-text,
    .vs-lightning {
      animation: none;
    }

    .vs-container {
      transition: opacity 0.2s ease;
      transform: none;
    }

    .vs-container.show {
      transform: none;
    }
  }

  @media (min-width: 640px) {
    .vs-container {
      flex: 0 0 auto;
    }
  }
</style>
