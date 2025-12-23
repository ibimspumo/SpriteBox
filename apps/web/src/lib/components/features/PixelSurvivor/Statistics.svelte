<!-- PixelSurvivor/Statistics.svelte - Player statistics display -->
<script lang="ts">
  import { Button } from '../../atoms';
  import { Modal } from '../../organisms';
  import { t } from '$lib/i18n';
  import { survivorStats } from '$lib/survivor';

  interface Props {
    show: boolean;
    onclose: () => void;
  }

  let { show, onclose }: Props = $props();

  const stats = $derived($survivorStats);

  function formatTime(ms: number): string {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) {
      return `${hours}h ${minutes % 60}m`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    }
    return `${seconds}s`;
  }

  const winRate = $derived(
    stats.totalRuns > 0 ? Math.round((stats.totalWins / stats.totalRuns) * 100) : 0
  );
</script>

<Modal {show} {onclose} title={$t.pixelSurvivor.statistics}>
  <div class="stats-grid">
    <!-- Run Stats -->
    <div class="stat-section">
      <h3 class="section-title">{$t.stats.gamesPlayed}</h3>
      <div class="stat-row">
        <span class="stat-label">Total Runs</span>
        <span class="stat-value">{stats.totalRuns}</span>
      </div>
      <div class="stat-row">
        <span class="stat-label">{$t.stats.wins}</span>
        <span class="stat-value success">{stats.totalWins}</span>
      </div>
      <div class="stat-row">
        <span class="stat-label">Deaths</span>
        <span class="stat-value danger">{stats.totalDeaths}</span>
      </div>
      <div class="stat-row">
        <span class="stat-label">{$t.stats.winRate}</span>
        <span class="stat-value">{winRate}%</span>
      </div>
    </div>

    <!-- Progress Stats -->
    <div class="stat-section">
      <h3 class="section-title">Progress</h3>
      <div class="stat-row">
        <span class="stat-label">Best Day</span>
        <span class="stat-value accent">{stats.bestDayReached}</span>
      </div>
      <div class="stat-row">
        <span class="stat-label">Total Days</span>
        <span class="stat-value">{stats.totalDaysSurvived}</span>
      </div>
      <div class="stat-row">
        <span class="stat-label">Monsters Killed</span>
        <span class="stat-value">{stats.totalMonstersKilled}</span>
      </div>
      <div class="stat-row">
        <span class="stat-label">Levels Gained</span>
        <span class="stat-value">{stats.totalLevelsGained}</span>
      </div>
    </div>

    <!-- Drawing Stats -->
    <div class="stat-section">
      <h3 class="section-title">Drawing</h3>
      <div class="stat-row">
        <span class="stat-label">Total Drawings</span>
        <span class="stat-value">{stats.totalDrawings}</span>
      </div>
      {#if stats.favoriteCategory}
        <div class="stat-row">
          <span class="stat-label">Favorite</span>
          <span class="stat-value accent">{stats.favoriteCategory}</span>
        </div>
      {/if}
    </div>

    <!-- Resource Stats -->
    <div class="stat-section">
      <h3 class="section-title">Resources</h3>
      <div class="stat-row">
        <span class="stat-label">{$t.pixelSurvivor.gold} Earned</span>
        <span class="stat-value">{stats.totalGoldEarned}</span>
      </div>
      <div class="stat-row">
        <span class="stat-label">Damage Taken</span>
        <span class="stat-value danger">{stats.totalDamageTaken}</span>
      </div>
      <div class="stat-row">
        <span class="stat-label">Damage Dealt</span>
        <span class="stat-value success">{stats.totalDamageDealt}</span>
      </div>
    </div>

    <!-- Time Stats -->
    <div class="stat-section">
      <h3 class="section-title">Time</h3>
      <div class="stat-row">
        <span class="stat-label">Total Play Time</span>
        <span class="stat-value">{formatTime(stats.totalPlayTime)}</span>
      </div>
      {#if stats.fastestWin}
        <div class="stat-row">
          <span class="stat-label">Fastest Win</span>
          <span class="stat-value accent">{formatTime(stats.fastestWin)}</span>
        </div>
      {/if}
    </div>
  </div>

  <div class="modal-actions">
    <Button variant="primary" onclick={onclose}>
      {$t.common.close}
    </Button>
  </div>
</Modal>

<style>
  .stats-grid {
    display: flex;
    flex-direction: column;
    gap: var(--space-3);
    max-height: 60vh;
    overflow-y: auto;
    padding: var(--space-2);
  }

  .stat-section {
    padding: var(--space-3);
    background: var(--color-bg-tertiary);
    border-radius: var(--radius-md);
  }

  .section-title {
    margin: 0 0 var(--space-2);
    font-size: var(--font-size-sm);
    font-weight: var(--font-weight-bold);
    color: var(--color-text-muted);
    text-transform: uppercase;
    letter-spacing: 1px;
  }

  .stat-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: var(--space-1) 0;
  }

  .stat-row:not(:last-child) {
    border-bottom: 1px solid var(--color-bg-elevated);
  }

  .stat-label {
    font-size: var(--font-size-sm);
    color: var(--color-text-secondary);
  }

  .stat-value {
    font-size: var(--font-size-md);
    font-weight: var(--font-weight-bold);
    color: var(--color-text-primary);
  }

  .stat-value.success {
    color: var(--color-success);
  }

  .stat-value.danger {
    color: var(--color-danger);
  }

  .stat-value.accent {
    color: var(--color-accent);
  }

  .modal-actions {
    display: flex;
    justify-content: center;
    margin-top: var(--space-4);
  }
</style>
