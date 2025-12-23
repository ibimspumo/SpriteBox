<!-- PixelSurvivor/HowToPlay.svelte - Tutorial modal -->
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
    <!-- Goal -->
    <section class="tutorial-section">
      <h3 class="section-title">{$t.pixelSurvivor.tutorial.goal}</h3>
      <p class="section-text">
        {$t.pixelSurvivor.tutorial.goalText}
      </p>
    </section>

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

    <!-- Events -->
    <section class="tutorial-section">
      <h3 class="section-title">{$t.pixelSurvivor.tutorial.events}</h3>
      <p class="section-text">
        {$t.pixelSurvivor.tutorial.eventsText}
      </p>
      <ul class="example-list">
        <li>{$t.pixelSurvivor.tutorial.eventCategories.combat}</li>
        <li>{$t.pixelSurvivor.tutorial.eventCategories.survival}</li>
        <li>{$t.pixelSurvivor.tutorial.eventCategories.exploration}</li>
        <li>{$t.pixelSurvivor.tutorial.eventCategories.social}</li>
      </ul>
    </section>

    <!-- Drawing Tips -->
    <section class="tutorial-section">
      <h3 class="section-title">{$t.pixelSurvivor.tutorial.drawingTips}</h3>
      <ul class="tip-list">
        <li>{$t.pixelSurvivor.tutorial.drawingTipsList.analyzeShape}</li>
        <li>{$t.pixelSurvivor.tutorial.drawingTipsList.tallThin}</li>
        <li>{$t.pixelSurvivor.tutorial.drawingTipsList.wideHollow}</li>
        <li>{$t.pixelSurvivor.tutorial.drawingTipsList.warmColors}</li>
        <li>{$t.pixelSurvivor.tutorial.drawingTipsList.coolColors}</li>
      </ul>
    </section>

    <!-- Resources -->
    <section class="tutorial-section">
      <h3 class="section-title">{$t.pixelSurvivor.tutorial.resources}</h3>
      <ul class="resource-list">
        <li>{$t.pixelSurvivor.tutorial.resourcesList.hp}</li>
        <li>{$t.pixelSurvivor.tutorial.resourcesList.food}</li>
        <li>{$t.pixelSurvivor.tutorial.resourcesList.gold}</li>
        <li>{$t.pixelSurvivor.tutorial.resourcesList.xp}</li>
      </ul>
    </section>

    <!-- Win Condition -->
    <section class="tutorial-section highlight">
      <h3 class="section-title">{$t.pixelSurvivor.tutorial.victory}</h3>
      <p class="section-text">
        {$t.pixelSurvivor.tutorial.victoryText}
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

  .stat-list,
  .example-list,
  .tip-list,
  .resource-list {
    margin: var(--space-2) 0 0;
    padding-left: var(--space-4);
    font-size: var(--font-size-sm);
    color: var(--color-text-secondary);
    line-height: 1.8;
  }

  .stat-list li,
  .tip-list li,
  .resource-list li {
    margin-bottom: var(--space-1);
  }

  .example-list li {
    margin-bottom: var(--space-2);
  }

  .modal-actions {
    display: flex;
    justify-content: center;
    margin-top: var(--space-4);
  }
</style>
