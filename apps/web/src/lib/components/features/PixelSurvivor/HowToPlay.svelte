<!-- PixelSurvivor/HowToPlay.svelte - Tutorial modal -->
<!-- Simplified: Only character creation tutorial -->
<script lang="ts">
  import { Button } from '../../atoms';
  import { Modal } from '../../organisms';
  import { t } from '$lib/i18n';

  interface Props {
    show: boolean;
    onclose: () => void;
  }

  let { show, onclose }: Props = $props();
</script>

<Modal {show} {onclose} title={$t.pixelSurvivor.howToPlay}>
  <div class="tutorial-content">
    <!-- Character -->
    <section class="tutorial-section">
      <h3 class="section-title">{$t.pixelSurvivor.tutorial.character}</h3>
      <p class="section-text">
        {$t.pixelSurvivor.tutorial.characterText}
      </p>
      <ul class="stat-list">
        <li>{$t.pixelSurvivor.tutorial.characterStats.morePixels}</li>
        <li>{$t.pixelSurvivor.tutorial.characterStats.asymmetric}</li>
        <li>{$t.pixelSurvivor.tutorial.characterStats.bulky}</li>
        <li>{$t.pixelSurvivor.tutorial.characterStats.spreadOut}</li>
        <li>{$t.pixelSurvivor.tutorial.characterStats.manyColors}</li>
      </ul>
    </section>

    <!-- Coming Soon -->
    <section class="tutorial-section highlight">
      <h3 class="section-title">{$t.pixelSurvivor.tutorial.comingSoon}</h3>
      <p class="section-text">
        {$t.pixelSurvivor.tutorial.comingSoonText}
      </p>
    </section>
  </div>

  <div class="modal-actions">
    <Button variant="primary" onclick={onclose}>
      {$t.common.gotIt}
    </Button>
  </div>
</Modal>

<style>
  .tutorial-content {
    display: flex;
    flex-direction: column;
    gap: var(--space-4);
    max-height: 60vh;
    overflow-y: auto;
    padding: var(--space-2);
  }

  .tutorial-section {
    padding: var(--space-3);
    background: var(--color-bg-tertiary);
    border-radius: var(--radius-md);
  }

  .tutorial-section.highlight {
    background: linear-gradient(135deg, var(--color-bg-tertiary) 0%, rgba(200, 100, 50, 0.2) 100%);
    border: 2px solid var(--color-warning);
  }

  .section-title {
    margin: 0 0 var(--space-2);
    font-size: var(--font-size-md);
    font-weight: var(--font-weight-bold);
    color: var(--color-accent);
    text-transform: uppercase;
    letter-spacing: 1px;
  }

  .section-text {
    margin: 0;
    font-size: var(--font-size-sm);
    color: var(--color-text-secondary);
    line-height: 1.6;
  }

  .stat-list {
    margin: var(--space-2) 0 0;
    padding-left: var(--space-4);
    font-size: var(--font-size-sm);
    color: var(--color-text-secondary);
    line-height: 1.8;
  }

  .stat-list li {
    margin-bottom: var(--space-1);
  }

  .modal-actions {
    display: flex;
    justify-content: center;
    margin-top: var(--space-4);
  }
</style>
