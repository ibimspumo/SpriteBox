<!-- DebugPanel - Visual Debug Panel (Development only) -->
<script lang="ts">
  import { onDestroy } from 'svelte';
  import { dev } from '$app/environment';
  import { goto } from '$app/navigation';
  import {
    lobby,
    game,
    voting,
    finale,
    results,
    pixels,
    hasSubmitted,
    copyCat,
    pixelGuesser,
    currentUser,
    startTimer,
    type GamePhase,
  } from '$lib/stores';
  import type { User, FinaleData, GameResultsData } from '$lib/socket';
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

  // Visual Debug state
  let activeTab = $state<'server' | 'visual'>('server');
  let selectedMode = $state<'pixel-battle' | 'copycat' | 'pixelguesser'>('pixel-battle');

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

  // === DEMO DATA ===
  // Sample pixel art patterns (64 hex chars = 8x8 grid with 16 colors)
  const DEMO_PIXELS = {
    smiley: '111111110F1111F0111111111F1111F111FFFF1111111111111111111111111111',
    heart: '1111111111F11F1111FFFF111FFFFFF111FFFF1111FF1111111111111111111111',
    star: '1111E1111111E1111111E111EEEEEEE11111E11111E1E1111E111E11E11111E111',
    alien: '11199111119999111999999199F99F99999999991199119119999999111111111',
    robot: '11AAAA1111AAAA111A0AA0A11AAAAAA11AAAAAA111A11A1111A11A1111111111',
    cat: '11111111F111111FF1F1F1F1F111111FF1FFF1F1F11111F11FF11FF111111111',
    tree: '11122111112222111222222111122111111221111112211111122211122222221',
    house: '11111111111FF1111FFFFFF1FFFFFFFF11FFFF1111F11F1111F11F1111111111',
  };

  const demoUser = (name: string, disc: string): User => ({
    displayName: name,
    discriminator: disc,
    fullName: `${name}#${disc}`,
  });

  const demoUsers = [
    demoUser('Alice', '1234'),
    demoUser('Bob', '5678'),
    demoUser('Charlie', '9012'),
    demoUser('Diana', '3456'),
    demoUser('Eve', '7890'),
    demoUser('Frank', '2345'),
  ];

  const demoPlayers = demoUsers.slice(0, 5);

  // Phase configurations for each mode
  const pixelBattlePhases: { phase: GamePhase; label: string }[] = [
    { phase: 'lobby', label: 'Lobby' },
    { phase: 'countdown', label: 'Countdown' },
    { phase: 'drawing', label: 'Drawing' },
    { phase: 'voting', label: 'Voting' },
    { phase: 'finale', label: 'Finale' },
    { phase: 'results', label: 'Results' },
  ];

  const copycatPhases: { phase: GamePhase; label: string }[] = [
    { phase: 'lobby', label: 'Lobby' },
    { phase: 'memorize', label: 'Memorize' },
    { phase: 'drawing', label: 'Drawing' },
    { phase: 'copycat-result', label: 'Result' },
    { phase: 'copycat-rematch', label: 'Rematch' },
  ];

  const pixelguesserPhases: { phase: GamePhase; label: string }[] = [
    { phase: 'lobby', label: 'Lobby' },
    { phase: 'guessing', label: 'Guessing' },
    { phase: 'reveal', label: 'Reveal' },
    { phase: 'pixelguesser-results', label: 'Results' },
  ];

  // Map debug mode to actual mode ID and slug
  const modeMapping = {
    'pixel-battle': { id: 'pixel-battle', slug: 'classic' },
    'copycat': { id: 'copy-cat', slug: 'copycat' },
    'pixelguesser': { id: 'pixel-guesser', slug: 'guesser' },
  } as const;

  // Set demo data for a specific phase
  function setDemoPhase(phase: GamePhase): void {
    const modeInfo = modeMapping[selectedMode];

    // Always set up basic lobby state BEFORE navigation
    // This prevents the auto-join logic from triggering
    lobby.set({
      instanceId: 'demo-instance-123',
      type: 'private',
      code: 'DEMO',
      isHost: true,
      hasPassword: false,
      players: demoPlayers,
      isSpectator: false,
      onlineCount: 5,
      gameMode: modeInfo.id,
    });

    // Set current user
    currentUser.set(demoUsers[0]);

    // Navigate to the game route (store is already set, so auto-join won't trigger)
    goto(`/play/${modeInfo.slug}/DEMO`);

    // Start a demo timer (60 seconds from now)
    const timerDuration = 60000;
    const timerEndsAt = Date.now() + timerDuration;

    // Set up phase-specific data
    switch (phase) {
      case 'lobby':
        game.set({ phase: 'lobby', prompt: null, promptIndices: null, timer: null });
        break;

      case 'countdown':
        game.set({
          phase: 'countdown',
          prompt: { prefix: 'A happy', subject: 'cat', suffix: 'in space' },
          promptIndices: { prefixIdx: 0, subjectIdx: 1, suffixIdx: 2 },
          timer: null,
        });
        startTimer(5000, Date.now() + 5000);
        break;

      case 'drawing':
        game.set({
          phase: 'drawing',
          prompt: { prefix: 'A happy', subject: 'cat', suffix: 'in space' },
          promptIndices: { prefixIdx: 0, subjectIdx: 1, suffixIdx: 2 },
          timer: null,
        });
        pixels.set(DEMO_PIXELS.smiley);
        hasSubmitted.set(false);
        startTimer(timerDuration, timerEndsAt);
        break;

      case 'voting':
        game.set({
          phase: 'voting',
          prompt: { prefix: 'A happy', subject: 'cat', suffix: 'in space' },
          promptIndices: { prefixIdx: 0, subjectIdx: 1, suffixIdx: 2 },
          timer: null,
        });
        voting.set({
          round: 3,
          totalRounds: 7,
          imageA: { playerId: 'p1', pixels: DEMO_PIXELS.heart },
          imageB: { playerId: 'p2', pixels: DEMO_PIXELS.star },
          hasVoted: false,
        });
        startTimer(5000, Date.now() + 5000);
        break;

      case 'finale':
        game.set({
          phase: 'finale',
          prompt: { prefix: 'A happy', subject: 'cat', suffix: 'in space' },
          promptIndices: { prefixIdx: 0, subjectIdx: 1, suffixIdx: 2 },
          timer: null,
        });
        const finaleData: FinaleData = {
          finalists: [
            { playerId: 'p1', pixels: DEMO_PIXELS.smiley, user: demoUsers[0], elo: 1520 },
            { playerId: 'p2', pixels: DEMO_PIXELS.heart, user: demoUsers[1], elo: 1510 },
            { playerId: 'p3', pixels: DEMO_PIXELS.star, user: demoUsers[2], elo: 1505 },
            { playerId: 'p4', pixels: DEMO_PIXELS.alien, user: demoUsers[3], elo: 1500 },
          ],
          timeLimit: 15000,
          endsAt: Date.now() + 15000,
        };
        finale.set(finaleData);
        startTimer(15000, Date.now() + 15000);
        break;

      case 'results':
        game.set({
          phase: 'results',
          prompt: { prefix: 'A happy', subject: 'cat', suffix: 'in space' },
          promptIndices: { prefixIdx: 0, subjectIdx: 1, suffixIdx: 2 },
          timer: null,
        });
        const resultsData: GameResultsData = {
          prompt: { prefix: 'A happy', subject: 'cat', suffix: 'in space' },
          promptIndices: { prefixIdx: 0, subjectIdx: 1, suffixIdx: 2 },
          rankings: [
            { place: 1, playerId: 'p1', user: demoUsers[0], pixels: DEMO_PIXELS.smiley, finalVotes: 42, elo: 1550 },
            { place: 2, playerId: 'p2', user: demoUsers[1], pixels: DEMO_PIXELS.heart, finalVotes: 38, elo: 1530 },
            { place: 3, playerId: 'p3', user: demoUsers[2], pixels: DEMO_PIXELS.star, finalVotes: 31, elo: 1510 },
            { place: 4, playerId: 'p4', user: demoUsers[3], pixels: DEMO_PIXELS.alien, finalVotes: 25, elo: 1490 },
            { place: 5, playerId: 'p5', user: demoUsers[4], pixels: DEMO_PIXELS.robot, finalVotes: 20, elo: 1475 },
            { place: 6, playerId: 'p6', user: demoUsers[5], pixels: DEMO_PIXELS.cat, finalVotes: 15, elo: 1460 },
          ],
          totalParticipants: 6,
        };
        results.set(resultsData);
        break;

      // CopyCat phases
      case 'memorize':
        game.set({ phase: 'memorize', prompt: null, promptIndices: null, timer: null });
        copyCat.set({
          referenceImage: DEMO_PIXELS.heart,
          results: [],
          winner: null,
          isDraw: false,
          rematchVotes: [],
          rematchResult: null,
          hasVotedRematch: false,
        });
        startTimer(5000, Date.now() + 5000);
        break;

      case 'copycat-result':
        game.set({ phase: 'copycat-result', prompt: null, promptIndices: null, timer: null });
        copyCat.set({
          referenceImage: DEMO_PIXELS.heart,
          results: [
            { playerId: 'p1', user: demoUsers[0], pixels: DEMO_PIXELS.heart, accuracy: 95.3, matchingPixels: 61, submitTime: 12500 },
            { playerId: 'p2', user: demoUsers[1], pixels: DEMO_PIXELS.star, accuracy: 42.1, matchingPixels: 27, submitTime: 18000 },
          ],
          winner: { playerId: 'p1', user: demoUsers[0], pixels: DEMO_PIXELS.heart, accuracy: 95.3, matchingPixels: 61, submitTime: 12500 },
          isDraw: false,
          rematchVotes: [],
          rematchResult: null,
          hasVotedRematch: false,
        });
        startTimer(10000, Date.now() + 10000);
        break;

      case 'copycat-rematch':
        game.set({ phase: 'copycat-rematch', prompt: null, promptIndices: null, timer: null });
        copyCat.set({
          referenceImage: DEMO_PIXELS.heart,
          results: [
            { playerId: 'p1', user: demoUsers[0], pixels: DEMO_PIXELS.heart, accuracy: 95.3, matchingPixels: 61, submitTime: 12500 },
            { playerId: 'p2', user: demoUsers[1], pixels: DEMO_PIXELS.star, accuracy: 42.1, matchingPixels: 27, submitTime: 18000 },
          ],
          winner: { playerId: 'p1', user: demoUsers[0], pixels: DEMO_PIXELS.heart, accuracy: 95.3, matchingPixels: 61, submitTime: 12500 },
          isDraw: false,
          rematchVotes: [{ playerId: 'p2', wantsRematch: true }],
          rematchResult: null,
          hasVotedRematch: false,
        });
        startTimer(10000, Date.now() + 10000);
        break;

      // PixelGuesser phases
      case 'guessing':
        game.set({ phase: 'guessing', prompt: null, promptIndices: null, timer: null });
        pixelGuesser.set({
          round: 2,
          totalRounds: 5,
          artistId: 'p2',
          artistUser: demoUsers[1],
          isYouArtist: false,
          secretPrompt: null,
          secretPromptIndices: null,
          currentDrawing: DEMO_PIXELS.cat,
          guesses: ['dog', 'tiger'],
          hasGuessedCorrectly: false,
          correctGuessers: [
            { playerId: 'p3', user: demoUsers[2], points: 100, timeMs: 5000, position: 1 },
          ],
          scores: [],
          lastGuessResult: { correct: false, close: true, message: 'Close!' },
        });
        startTimer(60000, Date.now() + 60000);
        break;

      case 'reveal':
        game.set({ phase: 'reveal', prompt: null, promptIndices: null, timer: null });
        pixelGuesser.set({
          round: 2,
          totalRounds: 5,
          artistId: 'p2',
          artistUser: demoUsers[1],
          isYouArtist: false,
          secretPrompt: 'cat',
          secretPromptIndices: { prefixIdx: null, subjectIdx: 5, suffixIdx: null },
          currentDrawing: DEMO_PIXELS.cat,
          guesses: [],
          hasGuessedCorrectly: true,
          correctGuessers: [
            { playerId: 'p1', user: demoUsers[0], points: 100, timeMs: 5000, position: 1 },
            { playerId: 'p3', user: demoUsers[2], points: 80, timeMs: 8000, position: 2 },
          ],
          scores: [
            { playerId: 'p2', user: demoUsers[1], score: 150, roundScore: 50, wasArtist: true, guessedCorrectly: false },
            { playerId: 'p1', user: demoUsers[0], score: 200, roundScore: 100, wasArtist: false, guessedCorrectly: true, guessTime: 5000 },
            { playerId: 'p3', user: demoUsers[2], score: 180, roundScore: 80, wasArtist: false, guessedCorrectly: true, guessTime: 8000 },
          ],
          lastGuessResult: null,
        });
        startTimer(5000, Date.now() + 5000);
        break;

      case 'pixelguesser-results':
        game.set({ phase: 'pixelguesser-results', prompt: null, promptIndices: null, timer: null });
        pixelGuesser.set({
          round: 5,
          totalRounds: 5,
          artistId: null,
          artistUser: null,
          isYouArtist: false,
          secretPrompt: null,
          secretPromptIndices: null,
          currentDrawing: '1'.repeat(64),
          guesses: [],
          hasGuessedCorrectly: false,
          correctGuessers: [],
          scores: [
            { playerId: 'p1', user: demoUsers[0], score: 520, roundScore: 0, wasArtist: false, guessedCorrectly: false },
            { playerId: 'p2', user: demoUsers[1], score: 480, roundScore: 0, wasArtist: false, guessedCorrectly: false },
            { playerId: 'p3', user: demoUsers[2], score: 350, roundScore: 0, wasArtist: false, guessedCorrectly: false },
            { playerId: 'p4', user: demoUsers[3], score: 280, roundScore: 0, wasArtist: false, guessedCorrectly: false },
          ],
          lastGuessResult: null,
        });
        break;

      default:
        game.set({ phase, prompt: null, promptIndices: null, timer: null });
    }
  }

  // Get phases for currently selected mode
  const currentPhases = $derived(
    selectedMode === 'pixel-battle'
      ? pixelBattlePhases
      : selectedMode === 'copycat'
        ? copycatPhases
        : pixelguesserPhases
  );

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

      <!-- Tab Navigation -->
      <div class="tab-nav">
        <button
          class="tab-btn"
          class:active={activeTab === 'server'}
          onclick={() => activeTab = 'server'}
        >
          Server
        </button>
        <button
          class="tab-btn"
          class:active={activeTab === 'visual'}
          onclick={() => activeTab = 'visual'}
        >
          Visual Debug
        </button>
      </div>

      {#if error}
        <div class="error-msg">{error}</div>
      {/if}

      {#if activeTab === 'visual'}
        <!-- Visual Debug Mode -->
        <section class="section">
          <h4>Game Mode</h4>
          <div class="mode-tabs">
            <button
              class="mode-btn"
              class:active={selectedMode === 'pixel-battle'}
              onclick={() => selectedMode = 'pixel-battle'}
            >
              Pixel Battle
            </button>
            <button
              class="mode-btn"
              class:active={selectedMode === 'copycat'}
              onclick={() => selectedMode = 'copycat'}
            >
              CopyCat
            </button>
            <button
              class="mode-btn"
              class:active={selectedMode === 'pixelguesser'}
              onclick={() => selectedMode = 'pixelguesser'}
            >
              PixelGuesser
            </button>
          </div>
        </section>

        <section class="section">
          <h4>Jump to Phase</h4>
          <p class="hint">Click to set demo data & switch to phase</p>
          <div class="phase-grid">
            {#each currentPhases as { phase, label }}
              <button
                class="phase-btn"
                class:active={$game.phase === phase}
                onclick={() => setDemoPhase(phase)}
              >
                {label}
              </button>
            {/each}
          </div>
        </section>

        <section class="section">
          <h4>Current State</h4>
          <div class="state-info">
            <div class="info-row">
              <span>Phase:</span>
              <span class="phase-badge phase-{$game.phase}">{$game.phase}</span>
            </div>
            <div class="info-row">
              <span>Mode:</span>
              <span>{$lobby.gameMode || 'none'}</span>
            </div>
            <div class="info-row">
              <span>Instance:</span>
              <span>{$lobby.instanceId ? 'Active' : 'None'}</span>
            </div>
            {#if $game.timer}
              <div class="info-row">
                <span>Timer:</span>
                <span>{Math.ceil($game.timer.remaining / 1000)}s</span>
              </div>
            {/if}
          </div>
        </section>

        <section class="section">
          <h4>Quick Presets</h4>
          <div class="button-row">
            <Button size="sm" onclick={() => {
              selectedMode = 'pixel-battle';
              setDemoPhase('results');
            }}>
              Full Results
            </Button>
            <Button size="sm" onclick={() => {
              selectedMode = 'copycat';
              setDemoPhase('copycat-result');
            }}>
              CopyCat Result
            </Button>
          </div>
        </section>
      {:else}
        <!-- Server Debug Mode (original content) -->
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

  /* Tab Navigation */
  .tab-nav {
    display: flex;
    border-bottom: 1px solid var(--color-border);
  }

  .tab-btn {
    flex: 1;
    padding: var(--space-2) var(--space-3);
    background: transparent;
    border: none;
    color: var(--color-text-muted);
    font-size: var(--font-size-sm);
    font-weight: var(--font-weight-semibold);
    cursor: pointer;
    transition: all var(--transition-fast);
  }

  .tab-btn:hover {
    background: rgba(255, 255, 255, 0.05);
    color: var(--color-text-primary);
  }

  .tab-btn.active {
    background: rgba(78, 205, 196, 0.1);
    color: var(--color-accent);
    border-bottom: 2px solid var(--color-accent);
  }

  /* Mode Tabs */
  .mode-tabs {
    display: flex;
    gap: var(--space-1);
  }

  .mode-btn {
    flex: 1;
    padding: var(--space-2);
    background: rgba(0, 0, 0, 0.2);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-sm);
    color: var(--color-text-secondary);
    font-size: var(--font-size-xs);
    cursor: pointer;
    transition: all var(--transition-fast);
  }

  .mode-btn:hover {
    background: rgba(255, 255, 255, 0.05);
    border-color: var(--color-accent);
  }

  .mode-btn.active {
    background: rgba(78, 205, 196, 0.2);
    border-color: var(--color-accent);
    color: var(--color-accent);
  }

  /* Phase Grid */
  .phase-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: var(--space-2);
  }

  .phase-btn {
    padding: var(--space-2) var(--space-1);
    background: rgba(0, 0, 0, 0.3);
    border: 2px solid var(--color-border);
    border-radius: var(--radius-sm);
    color: var(--color-text-secondary);
    font-size: var(--font-size-xs);
    font-weight: var(--font-weight-semibold);
    cursor: pointer;
    transition: all var(--transition-fast);
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  .phase-btn:hover {
    background: rgba(255, 255, 255, 0.1);
    border-color: var(--color-accent);
    color: var(--color-text-primary);
    transform: translateY(-1px);
  }

  .phase-btn.active {
    background: var(--color-accent);
    border-color: var(--color-accent);
    color: white;
  }

  /* State Info */
  .state-info {
    background: rgba(0, 0, 0, 0.2);
    border-radius: var(--radius-sm);
    padding: var(--space-2);
  }

  /* Additional phase badge colors for new modes */
  .phase-idle { background: #64748b; }
  .phase-memorize { background: #f59e0b; }
  .phase-copycat-result { background: #22c55e; }
  .phase-copycat-rematch { background: #8b5cf6; }
  .phase-guessing { background: #3b82f6; }
  .phase-reveal { background: #ec4899; }
  .phase-pixelguesser-results { background: #6366f1; }

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
