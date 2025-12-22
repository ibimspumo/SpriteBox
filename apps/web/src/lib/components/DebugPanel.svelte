<!-- apps/web/src/lib/components/DebugPanel.svelte -->
<!-- Visual Debug Panel - Only visible in development mode -->
<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { dev } from '$app/environment';
  import { lobby, game } from '$lib/stores';

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

  // API base URL
  const API_BASE = dev ? 'http://localhost:3000' : '';

  // Fetch debug info
  async function fetchDebugInfo(): Promise<void> {
    try {
      const res = await fetch(`${API_BASE}/debug/info`);
      if (!res.ok) throw new Error('Failed to fetch debug info');
      debugInfo = await res.json();
    } catch (e) {
      console.error('Debug fetch error:', e);
    }
  }

  // Fetch instance info
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

  // Add bots
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

  // Remove all bots
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

  // Remove bots from current instance
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

  // Force start game
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

  // Quick start (create instance with bots and start)
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

  // Refresh all data
  async function refresh(): Promise<void> {
    await Promise.all([fetchDebugInfo(), fetchInstanceInfo()]);
  }

  // Toggle panel
  function toggle(): void {
    isOpen = !isOpen;
    if (isOpen) {
      refresh();
    }
  }

  // Format uptime
  function formatUptime(seconds: number): string {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    if (h > 0) return `${h}h ${m}m`;
    if (m > 0) return `${m}m ${s}s`;
    return `${s}s`;
  }

  // Auto-refresh when open
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
  <!-- Toggle Button -->
  <button class="debug-toggle" onclick={toggle} title="Debug Panel">
    {isOpen ? '×' : '🔧'}
  </button>

  <!-- Debug Panel -->
  {#if isOpen}
    <div class="debug-panel">
      <div class="panel-header">
        <h3>Debug Panel</h3>
        <button class="refresh-btn" onclick={refresh} disabled={isLoading}>
          ↻
        </button>
      </div>

      {#if error}
        <div class="error-msg">{error}</div>
      {/if}

      <!-- Quick Actions -->
      <section class="section">
        <h4>Quick Actions</h4>
        <div class="button-row">
          <button onclick={quickStart} disabled={isLoading} class="primary">
            Quick Start
          </button>
          {#if $lobby.instanceId && $game.phase === 'lobby'}
            <button onclick={forceStart} disabled={isLoading}>
              Force Start
            </button>
          {/if}
        </div>
      </section>

      <!-- Bot Controls -->
      <section class="section">
        <h4>Bots</h4>
        <div class="control-row">
          <label>
            Count:
            <input type="number" bind:value={botCount} min="1" max="50" />
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
          <button onclick={addBots} disabled={isLoading || !$lobby.instanceId}>
            + Bots
          </button>
          <button onclick={removeInstanceBots} disabled={isLoading || !$lobby.instanceId}>
            - Instance Bots
          </button>
          <button onclick={removeAllBots} disabled={isLoading} class="danger">
            Remove All
          </button>
        </div>
      </section>

      <!-- Server Stats -->
      {#if debugInfo}
        <section class="section">
          <h4>Server</h4>
          <div class="stats-grid">
            <div class="stat">
              <span class="label">Bots</span>
              <span class="value">{debugInfo.bots.total}/{debugInfo.bots.maxAllowed}</span>
            </div>
            <div class="stat">
              <span class="label">Instances</span>
              <span class="value">{debugInfo.instances.total}</span>
            </div>
            <div class="stat">
              <span class="label">Players</span>
              <span class="value">{debugInfo.instances.totalPlayers}</span>
            </div>
            <div class="stat">
              <span class="label">Memory</span>
              <span class="value">{debugInfo.memory.heapUsed}MB</span>
            </div>
            <div class="stat">
              <span class="label">Uptime</span>
              <span class="value">{formatUptime(debugInfo.uptime)}</span>
            </div>
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

          <!-- Player List -->
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
    bottom: 1rem;
    left: 1rem;
    z-index: 9999;
    width: 48px;
    height: 48px;
    border-radius: 50%;
    background: #e94560;
    color: white;
    border: none;
    font-size: 1.5rem;
    cursor: pointer;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
    transition: transform 0.2s, background 0.2s;
  }

  .debug-toggle:hover {
    transform: scale(1.1);
    background: #ff6b6b;
  }

  .debug-panel {
    position: fixed;
    bottom: 70px;
    left: 1rem;
    z-index: 9998;
    width: 360px;
    max-height: calc(100vh - 100px);
    overflow-y: auto;
    background: #1a1a2e;
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 12px;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
    font-size: 0.85rem;
  }

  .panel-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 12px 16px;
    background: #16213e;
    border-radius: 12px 12px 0 0;
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  }

  .panel-header h3 {
    margin: 0;
    font-size: 1rem;
    color: #e94560;
  }

  .refresh-btn {
    background: transparent;
    border: 1px solid rgba(255, 255, 255, 0.2);
    color: #aaa;
    width: 28px;
    height: 28px;
    border-radius: 4px;
    cursor: pointer;
    font-size: 1rem;
  }

  .refresh-btn:hover {
    background: rgba(255, 255, 255, 0.1);
    color: white;
  }

  .error-msg {
    background: rgba(239, 68, 68, 0.2);
    color: #f87171;
    padding: 8px 16px;
    font-size: 0.8rem;
  }

  .section {
    padding: 12px 16px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  }

  .section h4 {
    margin: 0 0 8px 0;
    font-size: 0.75rem;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    color: #888;
  }

  .button-row {
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
  }

  button {
    padding: 6px 12px;
    border-radius: 6px;
    border: 1px solid rgba(255, 255, 255, 0.2);
    background: rgba(255, 255, 255, 0.05);
    color: #eee;
    cursor: pointer;
    font-size: 0.8rem;
    transition: all 0.2s;
  }

  button:hover:not(:disabled) {
    background: rgba(255, 255, 255, 0.1);
    border-color: rgba(255, 255, 255, 0.3);
  }

  button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  button.primary {
    background: #e94560;
    border-color: #e94560;
  }

  button.primary:hover:not(:disabled) {
    background: #ff6b6b;
    border-color: #ff6b6b;
  }

  button.danger {
    background: rgba(239, 68, 68, 0.2);
    border-color: rgba(239, 68, 68, 0.5);
    color: #f87171;
  }

  button.danger:hover:not(:disabled) {
    background: rgba(239, 68, 68, 0.3);
  }

  .control-row {
    display: flex;
    gap: 12px;
    margin-bottom: 8px;
  }

  .control-row label {
    display: flex;
    flex-direction: column;
    gap: 4px;
    font-size: 0.75rem;
    color: #888;
  }

  input[type="number"],
  select {
    padding: 6px 8px;
    border-radius: 4px;
    border: 1px solid rgba(255, 255, 255, 0.2);
    background: rgba(0, 0, 0, 0.3);
    color: #eee;
    font-size: 0.85rem;
    width: 100px;
  }

  select {
    width: 120px;
  }

  .hint {
    margin: 4px 0 8px 0;
    font-size: 0.7rem;
    color: #666;
    font-style: italic;
  }

  .stats-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 8px;
  }

  .stat {
    background: rgba(0, 0, 0, 0.2);
    padding: 8px;
    border-radius: 6px;
    text-align: center;
  }

  .stat .label {
    display: block;
    font-size: 0.65rem;
    color: #666;
    text-transform: uppercase;
  }

  .stat .value {
    display: block;
    font-size: 1rem;
    font-weight: bold;
    color: #e94560;
  }

  .instance-info {
    background: rgba(0, 0, 0, 0.2);
    border-radius: 6px;
    padding: 8px;
    margin-bottom: 8px;
  }

  .info-row {
    display: flex;
    justify-content: space-between;
    padding: 4px 0;
    font-size: 0.8rem;
  }

  .info-row span:first-child {
    color: #888;
  }

  code {
    background: rgba(255, 255, 255, 0.1);
    padding: 2px 6px;
    border-radius: 4px;
    font-family: monospace;
    font-size: 0.75rem;
  }

  .phase-badge {
    padding: 2px 8px;
    border-radius: 10px;
    font-size: 0.7rem;
    font-weight: bold;
    text-transform: uppercase;
  }

  .phase-lobby { background: #3b82f6; }
  .phase-countdown { background: #f59e0b; }
  .phase-drawing { background: #22c55e; }
  .phase-voting { background: #8b5cf6; }
  .phase-finale { background: #ec4899; }
  .phase-results { background: #6366f1; }

  .player-list h5 {
    margin: 8px 0 4px 0;
    font-size: 0.75rem;
    color: #888;
  }

  .players {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
    max-height: 120px;
    overflow-y: auto;
  }

  .player {
    display: flex;
    align-items: center;
    gap: 4px;
    background: rgba(255, 255, 255, 0.05);
    padding: 4px 8px;
    border-radius: 4px;
    font-size: 0.75rem;
  }

  .player.bot {
    background: rgba(233, 69, 96, 0.2);
  }

  .player .icon {
    font-size: 0.9rem;
  }

  .player .name {
    max-width: 100px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  details summary {
    cursor: pointer;
    color: #888;
    font-size: 0.8rem;
  }

  details summary:hover {
    color: #eee;
  }

  .bot-list {
    margin-top: 8px;
    max-height: 150px;
    overflow-y: auto;
  }

  .bot-item {
    display: flex;
    justify-content: space-between;
    padding: 4px 8px;
    background: rgba(255, 255, 255, 0.03);
    border-radius: 4px;
    margin-bottom: 2px;
    font-size: 0.75rem;
  }

  .bot-item.inactive {
    opacity: 0.5;
  }

  .bot-behavior {
    color: #888;
    font-size: 0.7rem;
  }

  .muted {
    color: #666;
    font-size: 0.8rem;
    text-align: center;
    padding: 8px 0;
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
