<!-- DebugPanel - Visual Debug Panel (Development only) -->
<script lang="ts">
  import { onDestroy } from 'svelte';
  import { dev } from '$app/environment';
  import { lobby, game } from '$lib/stores';
  import { Button } from '../atoms';
  import { StatItem } from '../molecules';

  // Only render in development
  if (!dev) {
    // Return early - component won't render
  }

  // Panel state
  let isOpen = $state(false);
  let isLoading = $state(false);
  let error = $state<string | null>(null);

  // Debug data
  let debugInfo = $state<DebugInfo | null>(null);
  let instanceInfo = $state<InstanceInfo | null>(null);

  // Bot controls
  let botCount = $state(6);
  let selectedBehavior = $state<string>('fast');

  // Types
  interface DebugInfo {
    enabled: boolean;
    bots: {
      total: number;
      maxAllowed: number;
      list: BotInfo[];
    };
    instances: {
      total: number;
      public: number;
      private: number;
      totalPlayers: number;
    };
    memory: {
      heapUsed: number;
      heapTotal: number;
    };
    uptime: number;
  }

  interface BotInfo {
    id: string;
    name: string;
    behavior: string;
    instanceId: string | null;
    isActive: boolean;
  }

  interface InstanceInfo {
    id: string;
    type: string;
    phase: string;
    prompt: string | null;
    players: { id: string; name: string; isBot: boolean }[];
    spectators: number;
    submissions: number;
    votes: number;
    bots: BotInfo[];
    votingState: {
      currentRound: number;
      totalRounds: number;
      pendingAssignments: number;
      votersVoted: number;
    } | null;
  }

  const behaviors = [
    { value: 'fast', label: 'Fast', desc: 'Instant actions' },
    { value: 'normal', label: 'Normal', desc: 'Realistic' },
    { value: 'slow', label: 'Slow', desc: 'Slow actions' },
    { value: 'afk', label: 'AFK', desc: 'No actions' },
    { value: 'disconnector', label: 'Disconnector', desc: '30% DC chance' },
  ];

  const API_BASE = dev ? 'http://localhost:3000' : '';

  async function fetchDebugInfo(): Promise<void> {
    try {
      const res = await fetch(`${API_BASE}/debug/info`);
      if (!res.ok) throw new Error('Failed to fetch debug info');
      debugInfo = await res.json();
    } catch (e) {
      console.error('Debug fetch error:', e);
    }
  }

  async function fetchInstanceInfo(): Promise<void> {
    if (!$lobby.instanceId) {
      instanceInfo = null;
      return;
    }
    try {
      const res = await fetch(`${API_BASE}/debug/instance/${$lobby.instanceId}`);
      if (!res.ok) throw new Error('Failed to fetch instance info');
      instanceInfo = await res.json();
    } catch (e) {
      console.error('Instance fetch error:', e);
    }
  }

  async function addBots(): Promise<void> {
    isLoading = true;
    error = null;
    try {
      const res = await fetch(`${API_BASE}/debug/bots/add`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          instanceId: $lobby.instanceId,
          count: botCount,
          behavior: selectedBehavior,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to add bots');
      await refresh();
    } catch (e) {
      error = e instanceof Error ? e.message : 'Unknown error';
    } finally {
      isLoading = false;
    }
  }

  async function removeAllBots(): Promise<void> {
    isLoading = true;
    error = null;
    try {
      const res = await fetch(`${API_BASE}/debug/bots/remove`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ all: true }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to remove bots');
      await refresh();
    } catch (e) {
      error = e instanceof Error ? e.message : 'Unknown error';
    } finally {
      isLoading = false;
    }
  }

  async function removeInstanceBots(): Promise<void> {
    if (!$lobby.instanceId) return;
    isLoading = true;
    error = null;
    try {
      const res = await fetch(`${API_BASE}/debug/bots/remove`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ instanceId: $lobby.instanceId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to remove bots');
      await refresh();
    } catch (e) {
      error = e instanceof Error ? e.message : 'Unknown error';
    } finally {
      isLoading = false;
    }
  }

  async function forceStart(): Promise<void> {
    if (!$lobby.instanceId) return;
    isLoading = true;
    error = null;
    try {
      const res = await fetch(`${API_BASE}/debug/game/force-start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ instanceId: $lobby.instanceId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to start game');
      await refresh();
    } catch (e) {
      error = e instanceof Error ? e.message : 'Unknown error';
    } finally {
      isLoading = false;
    }
  }

  async function quickStart(): Promise<void> {
    isLoading = true;
    error = null;
    try {
      const res = await fetch(`${API_BASE}/debug/quick-start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          botCount: botCount,
          behavior: selectedBehavior,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to quick start');
      await refresh();
    } catch (e) {
      error = e instanceof Error ? e.message : 'Unknown error';
    } finally {
      isLoading = false;
    }
  }

  async function refresh(): Promise<void> {
    await Promise.all([fetchDebugInfo(), fetchInstanceInfo()]);
  }

  function toggle(): void {
    isOpen = !isOpen;
    if (isOpen) {
      refresh();
    }
  }

  function formatUptime(seconds: number): string {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    if (h > 0) return `${h}h ${m}m`;
    if (m > 0) return `${m}m ${s}s`;
    return `${s}s`;
  }

  let refreshInterval: ReturnType<typeof setInterval> | null = null;

  $effect(() => {
    if (isOpen) {
      refresh();
      refreshInterval = setInterval(refresh, 2000);
    } else if (refreshInterval) {
      clearInterval(refreshInterval);
      refreshInterval = null;
    }
  });

  onDestroy(() => {
    if (refreshInterval) {
      clearInterval(refreshInterval);
    }
  });
</script>

{#if dev}
  <button class="debug-toggle" onclick={toggle} title="Debug Panel">
    {isOpen ? '×' : '🔧'}
  </button>

  {#if isOpen}
    <div class="debug-panel">
      <div class="panel-header">
        <h3>Debug Panel</h3>
        <button class="refresh-btn" onclick={refresh} disabled={isLoading}>↻</button>
      </div>

      {#if error}
        <div class="error-msg">{error}</div>
      {/if}

      <!-- Quick Actions -->
      <section class="section">
        <h4>Quick Actions</h4>
        <div class="button-row">
          <Button variant="primary" size="sm" onclick={quickStart} disabled={isLoading}>
            Quick Start
          </Button>
          {#if $lobby.instanceId && $game.phase === 'lobby'}
            <Button size="sm" onclick={forceStart} disabled={isLoading}>
              Force Start
            </Button>
          {/if}
        </div>
      </section>

      <!-- Bot Controls -->
      <section class="section">
        <h4>Bots</h4>
        <div class="control-row">
          <label>
            Count:
            <input type="number" bind:value={botCount} min="1" />
          </label>
          <label>
            Behavior:
            <select bind:value={selectedBehavior}>
              {#each behaviors as b}
                <option value={b.value}>{b.label}</option>
              {/each}
            </select>
          </label>
        </div>
        <p class="hint">{behaviors.find(b => b.value === selectedBehavior)?.desc}</p>
        <div class="button-row">
          <Button size="sm" onclick={addBots} disabled={isLoading || !$lobby.instanceId}>
            + Bots
          </Button>
          <Button size="sm" onclick={removeInstanceBots} disabled={isLoading || !$lobby.instanceId}>
            - Instance
          </Button>
          <Button size="sm" variant="danger" onclick={removeAllBots} disabled={isLoading}>
            Remove All
          </Button>
        </div>
      </section>

      <!-- Server Stats -->
      {#if debugInfo}
        <section class="section">
          <h4>Server</h4>
          <div class="stats-grid">
            <StatItem label="Bots" value="{debugInfo.bots.total}/{debugInfo.bots.maxAllowed}" variant="highlight" size="sm" />
            <StatItem label="Instances" value={debugInfo.instances.total} size="sm" />
            <StatItem label="Players" value={debugInfo.instances.totalPlayers} size="sm" />
            <StatItem label="Memory" value="{debugInfo.memory.heapUsed}MB" size="sm" />
            <StatItem label="Uptime" value={formatUptime(debugInfo.uptime)} size="sm" />
          </div>
        </section>
      {/if}

      <!-- Current Instance -->
      {#if instanceInfo}
        <section class="section">
          <h4>Current Instance</h4>
          <div class="instance-info">
            <div class="info-row">
              <span>ID:</span>
              <code>{instanceInfo.id.slice(0, 8)}...</code>
            </div>
            <div class="info-row">
              <span>Phase:</span>
              <span class="phase-badge phase-{instanceInfo.phase}">{instanceInfo.phase}</span>
            </div>
            {#if instanceInfo.prompt}
              <div class="info-row">
                <span>Prompt:</span>
                <em>{instanceInfo.prompt}</em>
              </div>
            {/if}
            <div class="info-row">
              <span>Players:</span>
              <span>{instanceInfo.players.length} ({instanceInfo.bots.length} Bots)</span>
            </div>
            <div class="info-row">
              <span>Submissions:</span>
              <span>{instanceInfo.submissions}</span>
            </div>
            {#if instanceInfo.votingState}
              <div class="info-row">
                <span>Voting:</span>
                <span>Round {instanceInfo.votingState.currentRound}/{instanceInfo.votingState.totalRounds}</span>
              </div>
            {/if}
          </div>

          <div class="player-list">
            <h5>Players ({instanceInfo.players.length})</h5>
            <div class="players">
              {#each instanceInfo.players as player}
                <div class="player" class:bot={player.isBot}>
                  <span class="icon">{player.isBot ? '🤖' : '👤'}</span>
                  <span class="name">{player.name}</span>
                </div>
              {/each}
            </div>
          </div>
        </section>
      {:else if $lobby.instanceId}
        <section class="section">
          <p class="muted">Loading instance info...</p>
        </section>
      {:else}
        <section class="section">
          <p class="muted">No active instance. Join a game or use Quick Start.</p>
        </section>
      {/if}

      <!-- All Bots -->
      {#if debugInfo && debugInfo.bots.list.length > 0}
        <section class="section collapsible">
          <details>
            <summary>All Bots ({debugInfo.bots.total})</summary>
            <div class="bot-list">
              {#each debugInfo.bots.list as bot}
                <div class="bot-item" class:inactive={!bot.isActive}>
                  <span class="bot-name">{bot.name}</span>
                  <span class="bot-behavior">{bot.behavior}</span>
                </div>
              {/each}
            </div>
          </details>
        </section>
      {/if}
    </div>
  {/if}
{/if}

<style>
  .debug-toggle {
    position: fixed;
    bottom: var(--space-4);
    left: var(--space-4);
    z-index: 9999;
    width: 48px;
    height: 48px;
    border-radius: var(--radius-full);
    background: var(--color-accent);
    color: white;
    border: none;
    font-size: var(--font-size-xl);
    cursor: pointer;
    box-shadow: var(--shadow-lg);
    transition: transform var(--transition-normal), background var(--transition-normal);
  }

  .debug-toggle:hover {
    transform: scale(1.1);
    background: var(--color-accent-hover);
  }

  .debug-panel {
    position: fixed;
    bottom: 70px;
    left: var(--space-4);
    z-index: 9998;
    width: 360px;
    max-height: calc(100vh - 100px);
    overflow-y: auto;
    background: var(--color-bg-primary);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-lg);
    box-shadow: var(--shadow-lg);
    font-size: var(--font-size-sm);
  }

  .panel-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: var(--space-3) var(--space-4);
    background: var(--color-bg-secondary);
    border-radius: var(--radius-lg) var(--radius-lg) 0 0;
    border-bottom: 1px solid var(--color-border);
  }

  .panel-header h3 {
    margin: 0;
    font-size: var(--font-size-md);
    color: var(--color-accent);
  }

  .refresh-btn {
    background: transparent;
    border: 1px solid var(--color-border);
    color: var(--color-text-secondary);
    width: 28px;
    height: 28px;
    border-radius: var(--radius-sm);
    cursor: pointer;
    font-size: var(--font-size-md);
  }

  .refresh-btn:hover {
    background: rgba(255, 255, 255, 0.1);
    color: var(--color-text-primary);
  }

  .error-msg {
    background: rgba(239, 68, 68, 0.2);
    color: var(--color-error);
    padding: var(--space-2) var(--space-4);
    font-size: var(--font-size-xs);
  }

  .section {
    padding: var(--space-3) var(--space-4);
    border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  }

  .section h4 {
    margin: 0 0 var(--space-2) 0;
    font-size: var(--font-size-xs);
    text-transform: uppercase;
    letter-spacing: 0.5px;
    color: var(--color-text-muted);
  }

  .button-row {
    display: flex;
    gap: var(--space-2);
    flex-wrap: wrap;
  }

  .control-row {
    display: flex;
    gap: var(--space-3);
    margin-bottom: var(--space-2);
  }

  .control-row label {
    display: flex;
    flex-direction: column;
    gap: var(--space-1);
    font-size: var(--font-size-xs);
    color: var(--color-text-muted);
  }

  input[type="number"],
  select {
    padding: var(--space-2);
    border-radius: var(--radius-sm);
    border: 1px solid var(--color-border);
    background: rgba(0, 0, 0, 0.3);
    color: var(--color-text-primary);
    font-size: var(--font-size-sm);
    width: 100px;
  }

  select {
    width: 120px;
  }

  .hint {
    margin: var(--space-1) 0 var(--space-2) 0;
    font-size: var(--font-size-xs);
    color: var(--color-text-muted);
    font-style: italic;
  }

  .stats-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: var(--space-2);
  }

  .stats-grid :global(.stat-item) {
    background: rgba(0, 0, 0, 0.2);
    padding: var(--space-2);
    border-radius: var(--radius-sm);
    text-align: center;
  }

  .instance-info {
    background: rgba(0, 0, 0, 0.2);
    border-radius: var(--radius-sm);
    padding: var(--space-2);
    margin-bottom: var(--space-2);
  }

  .info-row {
    display: flex;
    justify-content: space-between;
    padding: var(--space-1) 0;
    font-size: var(--font-size-xs);
  }

  .info-row span:first-child {
    color: var(--color-text-muted);
  }

  code {
    background: rgba(255, 255, 255, 0.1);
    padding: 2px var(--space-2);
    border-radius: var(--radius-sm);
    font-family: monospace;
    font-size: var(--font-size-xs);
  }

  .phase-badge {
    padding: 2px var(--space-2);
    border-radius: var(--radius-xl);
    font-size: var(--font-size-xs);
    font-weight: var(--font-weight-bold);
    text-transform: uppercase;
  }

  .phase-lobby { background: #3b82f6; }
  .phase-countdown { background: #f59e0b; }
  .phase-drawing { background: #22c55e; }
  .phase-voting { background: #8b5cf6; }
  .phase-finale { background: #ec4899; }
  .phase-results { background: #6366f1; }

  .player-list h5 {
    margin: var(--space-2) 0 var(--space-1) 0;
    font-size: var(--font-size-xs);
    color: var(--color-text-muted);
  }

  .players {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-1);
    max-height: 120px;
    overflow-y: auto;
  }

  .player {
    display: flex;
    align-items: center;
    gap: var(--space-1);
    background: rgba(255, 255, 255, 0.05);
    padding: var(--space-1) var(--space-2);
    border-radius: var(--radius-sm);
    font-size: var(--font-size-xs);
  }

  .player.bot {
    background: rgba(233, 69, 96, 0.2);
  }

  .player .icon {
    font-size: var(--font-size-sm);
  }

  .player .name {
    max-width: 100px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  details summary {
    cursor: pointer;
    color: var(--color-text-muted);
    font-size: var(--font-size-xs);
  }

  details summary:hover {
    color: var(--color-text-primary);
  }

  .bot-list {
    margin-top: var(--space-2);
    max-height: 150px;
    overflow-y: auto;
  }

  .bot-item {
    display: flex;
    justify-content: space-between;
    padding: var(--space-1) var(--space-2);
    background: rgba(255, 255, 255, 0.03);
    border-radius: var(--radius-sm);
    margin-bottom: 2px;
    font-size: var(--font-size-xs);
  }

  .bot-item.inactive {
    opacity: 0.5;
  }

  .bot-behavior {
    color: var(--color-text-muted);
    font-size: var(--font-size-xs);
  }

  .muted {
    color: var(--color-text-muted);
    font-size: var(--font-size-xs);
    text-align: center;
    padding: var(--space-2) 0;
  }

  /* Scrollbar styling */
  .debug-panel::-webkit-scrollbar,
  .players::-webkit-scrollbar,
  .bot-list::-webkit-scrollbar {
    width: 6px;
  }

  .debug-panel::-webkit-scrollbar-track,
  .players::-webkit-scrollbar-track,
  .bot-list::-webkit-scrollbar-track {
    background: transparent;
  }

  .debug-panel::-webkit-scrollbar-thumb,
  .players::-webkit-scrollbar-thumb,
  .bot-list::-webkit-scrollbar-thumb {
    background: rgba(255, 255, 255, 0.2);
    border-radius: 3px;
  }
</style>
