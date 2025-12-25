// apps/web/src/lib/socketBridge.ts
import { browser } from '$app/environment';
import { get } from 'svelte/store';
import LZString from 'lz-string';
import {
  initSocket,
  getSocket,
  type AppSocket,
  type User,
  type LobbyJoinedData,
  type PhaseChangedData,
  type VotingRoundData,
  type FinaleData,
  type GameResultsData,
  type SessionRestoredData,
  type GameModesData,
} from './socket';
import {
  connectionStatus,
  socketId,
  globalOnlineCount,
  onlineCountByMode,
  currentUser,
  lobby,
  game,
  voting,
  finale,
  results,
  lastError,
  hasSubmitted,
  finaleVoted,
  passwordPrompt,
  sessionBlocked,
  idleWarning,
  startTimer,
  stopTimer,
  resetGameState,
  resetLobbyState,
  availableGameModes,
  selectedGameMode,
  defaultGameMode,
  copyCat,
  pixelGuesser,
  resetPixelGuesserState,
  type GamePhase,
} from './stores';
import { recordGameResult, addGameToHistory } from './stats';

const SESSION_STORAGE_KEY = 'spritebox-session';
const USER_STORAGE_KEY = 'spritebox-user';
let initialized = false;

// Session management (for reconnects during grace period)
function saveSession(sessionId: string): void {
  if (!browser) return;
  try {
    localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify({ sessionId, savedAt: Date.now() }));
  } catch (e) {
    console.error('Failed to save session:', e);
  }
}

function loadSession(): { sessionId: string; savedAt: number } | null {
  if (!browser) return null;
  try {
    const stored = localStorage.getItem(SESSION_STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      // Session expires after 30 seconds (grace period + buffer)
      if (Date.now() - parsed.savedAt < 30_000) {
        return parsed;
      }
    }
  } catch (e) {
    console.error('Failed to load session:', e);
  }
  return null;
}

function clearSession(): void {
  if (!browser) return;
  try {
    localStorage.removeItem(SESSION_STORAGE_KEY);
  } catch (e) {
    console.error('Failed to clear session:', e);
  }
}

// User persistence (survives page reloads)
// Only save displayName - discriminator is always randomly generated
function saveUser(user: User): void {
  if (!browser) return;
  try {
    localStorage.setItem(USER_STORAGE_KEY, JSON.stringify({
      displayName: user.displayName,
      // Note: discriminator is NOT saved - it's always random per session
    }));
  } catch (e) {
    console.error('Failed to save user:', e);
  }
}

function loadUser(): { displayName: string } | null {
  if (!browser) return null;
  try {
    const stored = localStorage.getItem(USER_STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      // Return only displayName (discriminator might exist in old data, ignore it)
      return { displayName: parsed.displayName };
    }
  } catch (e) {
    console.error('Failed to load user:', e);
  }
  return null;
}

/**
 * Initializes Socket and connects with Stores
 */
export function initSocketBridge(): void {
  if (initialized) return;
  initialized = true;

  const socket = initSocket();
  setupEventHandlers(socket);
}

let currentSessionId: string | null = null;

function setupEventHandlers(socket: AppSocket): void {
  // === Connection Events ===
  socket.on('connect', () => {
    connectionStatus.set('connected');
    socketId.set(socket.id ?? null);
    sessionBlocked.set(false); // Clear blocked state on successful connect

    // Try to restore session on reconnect (within grace period)
    const savedSession = loadSession();
    if (savedSession) {
      console.log('[Socket] Attempting to restore session...');
      socket.emit('restore-session', { sessionId: savedSession.sessionId });
    } else {
      // No active session, but try to restore saved username
      // Note: Only displayName is restored - discriminator is always new
      const savedUser = loadUser();
      if (savedUser) {
        console.log('[Socket] Restoring saved username:', savedUser.displayName);
        socket.emit('restore-user', {
          displayName: savedUser.displayName,
        });
      }
    }
  });

  socket.on('disconnect', () => {
    connectionStatus.set('disconnected');
    socketId.set(null);

    // Save session for potential reconnect
    if (currentSessionId) {
      saveSession(currentSessionId);
    }
  });

  socket.on('connect_error', (err) => {
    connectionStatus.set('disconnected');

    // Check if blocked due to too many sessions from same browser
    if (err.message === 'TOO_MANY_SESSIONS') {
      sessionBlocked.set(true);
      console.warn('[Socket] Blocked: Too many sessions from this browser');
    }
  });

  // === Server Events ===
  socket.on('connected', (data: { socketId: string; serverTime: number; user: User; sessionId: string }) => {
    currentUser.set(data.user);
    currentSessionId = data.sessionId;

    // Save user for persistence across reloads
    saveUser(data.user);

    // Note: Stats are stored client-side only in localStorage

    // Check for room code in URL and auto-join
    if (browser) {
      const urlParams = new URLSearchParams(window.location.search);
      const roomCode = urlParams.get('room');
      if (roomCode && roomCode.length === 4) {
        console.log('[Socket] Auto-joining room from URL:', roomCode);
        socket.emit('join-room', { code: roomCode.toUpperCase() });
        // Clean up URL after attempting to join
        window.history.replaceState({}, '', window.location.pathname);
      }
    }
  });

  socket.on('error', (data: { code: string; message?: string }) => {
    lastError.set(data);
    console.error('[Socket Error]', data);
  });

  // === Online Count (global + per game mode) ===
  socket.on('online-count', (data: { count: number; total?: number; byMode?: Record<string, number> }) => {
    globalOnlineCount.set(data.total ?? data.count);
    if (data.byMode) {
      onlineCountByMode.set(data.byMode);
    }
  });

  // === Game Modes ===
  socket.on('game-modes', (data: GameModesData) => {
    availableGameModes.set(data.available);
    defaultGameMode.set(data.default);
    // Only set selectedGameMode to default if current selection is not a valid mode
    // This prevents overwriting URL-based mode selection (e.g., /play/copycat)
    const currentMode = get(selectedGameMode);
    const isValidMode = data.available.some(m => m.id === currentMode);
    if (!isValidMode) {
      selectedGameMode.set(data.default);
    }
  });

  // === Lobby Events ===
  socket.on('lobby-joined', (data: LobbyJoinedData) => {
    // Set selected game mode to match joined lobby
    selectedGameMode.set(data.gameMode);
    lobby.set({
      instanceId: data.instanceId,
      type: data.type,
      code: data.code ?? null,
      isHost: data.isHost ?? false,
      hasPassword: data.hasPassword ?? false,
      players: data.players,
      isSpectator: data.spectator,
      onlineCount: data.players.length,
      gameMode: data.gameMode,
    });
    // Clear any password prompt on successful join
    passwordPrompt.set({ show: false, roomCode: null, error: null });
    game.update((g) => ({ ...g, phase: 'lobby' }));

    // Update game state with current phase (for mid-game joins)
    if (data.phase) {
      game.update((g) => ({
        ...g,
        phase: data.phase as GamePhase,
        prompt: data.prompt ?? g.prompt,
        promptIndices: data.promptIndices ?? g.promptIndices,
      }));
    }

    // Start timer if provided (for mid-game joins)
    if (data.timerEndsAt) {
      const remaining = data.timerEndsAt - Date.now();
      if (remaining > 0) {
        startTimer(remaining, data.timerEndsAt);
      }
    }

    // Update voting state if in voting phase
    if (data.phase === 'voting' && data.votingRound && data.votingTotalRounds) {
      voting.update((v) => ({
        ...v,
        round: data.votingRound!,
        totalRounds: data.votingTotalRounds!,
      }));
    }
  });

  socket.on('player-joined', (data: { user: User }) => {
    lobby.update((l) => ({
      ...l,
      players: [...l.players, data.user],
    }));
  });

  socket.on('player-left', (data: { playerId: string; user?: User; kicked?: boolean }) => {
    lobby.update((l) => ({
      ...l,
      // Filter by user.fullName if provided, otherwise try playerId as fullName fallback
      players: l.players.filter((p) => {
        if (data.user) {
          return p.fullName !== data.user.fullName;
        }
        // Fallback: playerId might be the fullName in some cases
        return p.fullName !== data.playerId;
      }),
    }));
  });

  socket.on('player-updated', (data: { playerId: string; user: User }) => {
    lobby.update((l) => ({
      ...l,
      players: l.players.map((p) => {
        // Match by discriminator since that's immutable
        if (p.discriminator === data.user.discriminator) {
          return data.user;
        }
        return p;
      }),
    }));
  });

  socket.on('player-disconnected', (data: { playerId: string; user: User; timestamp: number }) => {
    console.log('[Socket] Player temporarily disconnected:', data.user.fullName);
    // Update player status in lobby store
    lobby.update((l) => ({
      ...l,
      players: l.players.map((p) =>
        p.discriminator === data.user.discriminator
          ? { ...p, status: 'disconnected' as const }
          : p
      ),
    }));
  });

  socket.on('player-reconnected', (data: { playerId: string; user: User; timestamp: number }) => {
    console.log('[Socket] Player reconnected:', data.user.fullName);
    // Update player status in lobby store
    lobby.update((l) => ({
      ...l,
      players: l.players.map((p) =>
        p.discriminator === data.user.discriminator
          ? { ...p, status: 'connected' as const }
          : p
      ),
    }));
  });

  socket.on('lobby-timer-started', (data: { duration: number; startsAt: number }) => {
    startTimer(data.duration, data.startsAt);
  });

  socket.on('lobby-timer-cancelled', () => {
    stopTimer();
  });

  // === Phase Events ===
  socket.on('phase-changed', (data: PhaseChangedData) => {
    const phase = data.phase as GamePhase;

    game.update((g) => ({
      ...g,
      phase,
      prompt: data.prompt ?? g.prompt,
      promptIndices: data.promptIndices ?? g.promptIndices,
    }));

    // Start timer if provided
    if (data.duration && data.endsAt) {
      startTimer(data.duration, data.endsAt);
    } else if (data.duration && data.startsAt) {
      startTimer(data.duration, data.startsAt);
    }

    // Phase-specific resets
    if (phase === 'drawing') {
      hasSubmitted.set(false);
    } else if (phase === 'voting') {
      voting.update((v) => ({
        ...v,
        round: data.round ?? v.round,
        totalRounds: data.totalRounds ?? v.totalRounds,
        hasVoted: false,
      }));
    } else if (phase === 'lobby') {
      resetGameState();
    }
  });

  // === Drawing Events ===
  socket.on('submission-received', (data: { success: boolean; submissionCount: number }) => {
    if (data.success) {
      hasSubmitted.set(true);
    }
  });

  // === Voting Events ===
  socket.on('voting-round', (data: VotingRoundData) => {
    voting.set({
      round: data.round,
      totalRounds: data.totalRounds,
      imageA: data.imageA,
      imageB: data.imageB,
      hasVoted: false,
    });
    startTimer(data.timeLimit, data.endsAt);
  });

  socket.on('vote-received', () => {
    voting.update((v) => ({ ...v, hasVoted: true }));
  });

  // === Finale Events ===
  socket.on('finale-start', (data: FinaleData) => {
    finale.set(data);
    finaleVoted.set(false);
    startTimer(data.timeLimit, data.endsAt);
    game.update((g) => ({ ...g, phase: 'finale' }));
  });

  // === Results Events ===
  socket.on('game-results', (data: GameResultsData) => {
    // Handle compressed rankings
    let rankings = data.rankings;
    if (data.compressedRankings) {
      try {
        const decompressed = LZString.decompressFromUTF16(data.compressedRankings);
        if (decompressed) {
          rankings = JSON.parse(decompressed);
          console.log('[Socket] Decompressed gallery with', rankings.length, 'entries');
        }
      } catch (e) {
        console.error('[Socket] Failed to decompress rankings:', e);
      }
    }

    // Create the results data with decompressed rankings
    const resultsData: GameResultsData = {
      prompt: data.prompt,
      promptIndices: data.promptIndices,
      rankings,
      totalParticipants: data.totalParticipants,
    };

    results.set(resultsData);
    game.update((g) => ({ ...g, phase: 'results' }));

    // Record stats and history for this player
    const user = get(currentUser);
    const currentLobby = get(lobby);
    if (user && currentLobby.gameMode) {
      const myResult = rankings.find((r) => r.user.fullName === user.fullName);
      if (myResult) {
        // Update aggregate stats
        recordGameResult(currentLobby.gameMode, myResult.place);

        // Build prompt text from indices if available
        let promptText: string | undefined;
        if (data.prompt) {
          const parts = [data.prompt.prefix, data.prompt.subject, data.prompt.suffix].filter(Boolean);
          promptText = parts.join(' ');
        }

        // Save to game history with drawing
        addGameToHistory({
          gameMode: currentLobby.gameMode,
          placement: myResult.place,
          totalPlayers: data.totalParticipants,
          pixels: myResult.pixels,
          prompt: promptText,
        });
      }
    }
  });

  // === User Events ===
  socket.on('name-changed', (data: { user: User }) => {
    currentUser.set(data.user);
    saveUser(data.user);
  });

  // Note: Stats are stored client-side in localStorage only
  // No server sync needed - client is source of truth

  socket.on('kicked', (data: { reason: string }) => {
    lastError.set({ code: 'KICKED', message: data.reason });
    clearSession();
    currentSessionId = null;
    resetLobbyState();
  });

  // === Session Events ===
  socket.on('session-restored', (data: SessionRestoredData) => {
    console.log('[Socket] Session restored:', data);
    clearSession();

    currentUser.set(data.user);
    // Set selected game mode to match restored session
    selectedGameMode.set(data.gameMode);
    lobby.set({
      instanceId: data.instanceId,
      type: 'public',
      code: null,
      isHost: false,
      hasPassword: false,
      players: data.players,
      isSpectator: data.isSpectator,
      onlineCount: data.players.length,
      gameMode: data.gameMode,
    });
    game.update((g) => ({
      ...g,
      phase: data.phase as GamePhase,
      prompt: data.prompt ?? g.prompt,
      promptIndices: data.promptIndices ?? g.promptIndices,
    }));

    // Restore phase-specific state
    const ps = data.phaseState;
    if (ps) {
      // Restore timer
      if (ps.timer && ps.timer.endsAt > Date.now()) {
        startTimer(ps.timer.duration, ps.timer.endsAt);
      }

      // Drawing phase
      if (data.phase === 'drawing' && ps.hasSubmitted !== undefined) {
        hasSubmitted.set(ps.hasSubmitted);
      }

      // Voting phase
      if (data.phase === 'voting' && ps.votingAssignment) {
        voting.set({
          round: ps.currentRound ?? 1,
          totalRounds: ps.totalRounds ?? 1,
          imageA: ps.votingAssignment.imageA,
          imageB: ps.votingAssignment.imageB,
          hasVoted: ps.hasVoted ?? false,
        });
      }

      // Finale phase
      if (data.phase === 'finale' && ps.finalists) {
        finale.set({
          finalists: ps.finalists,
          timeLimit: ps.timer?.duration ?? 15000,
          endsAt: ps.timer?.endsAt ?? Date.now() + 15000,
        });
        finaleVoted.set(ps.finaleVoted ?? false);
      }
    }
  });

  socket.on('session-restore-failed', (data: { reason: string }) => {
    console.log('[Socket] Session restore failed:', data.reason);
    clearSession();
    currentSessionId = null;
  });

  socket.on('idle-warning', (data: { timeLeft: number }) => {
    console.log('[Socket] Idle warning:', data.timeLeft, 'seconds left');
    idleWarning.set({ show: true, timeLeft: data.timeLeft });
  });

  socket.on('idle-disconnect', (data: { reason: string }) => {
    console.log('[Socket] Idle disconnect:', data.reason);
    idleWarning.set({ show: false, timeLeft: 0 });
    lastError.set({ code: 'IDLE_DISCONNECT', message: data.reason });
    clearSession();
    currentSessionId = null;
    resetLobbyState();
  });

  socket.on('instance-closing', (data: { reason: string }) => {
    console.log('[Socket] Instance closing:', data.reason);
    lastError.set({ code: 'INSTANCE_CLOSED', message: `Instance closed: ${data.reason}` });
    clearSession();
    currentSessionId = null;
    resetLobbyState();
  });

  // === Password Events ===
  socket.on('password-required', (data: { code: string }) => {
    console.log('[Socket] Password required for room:', data.code);
    passwordPrompt.set({ show: true, roomCode: data.code, error: null });
  });

  socket.on('password-changed', (data: { hasPassword: boolean }) => {
    console.log('[Socket] Password changed:', data.hasPassword);
    lobby.update((l) => ({ ...l, hasPassword: data.hasPassword }));
  });

  // === CopyCat Mode Events ===
  socket.on('copycat-reference', (data: { referenceImage: string; duration: number; endsAt: number }) => {
    console.log('[Socket] CopyCat reference image received');
    copyCat.update((c) => ({ ...c, referenceImage: data.referenceImage }));
    startTimer(data.duration, data.endsAt);
    game.update((g) => ({ ...g, phase: 'memorize' }));
  });

  socket.on('copycat-results', (data: {
    referenceImage: string | null;
    results: Array<{
      playerId: string;
      user: { displayName: string; discriminator: string; fullName: string };
      pixels: string;
      accuracy: number;
      matchingPixels: number;
      submitTime: number;
    }>;
    winner: {
      playerId: string;
      user: { displayName: string; discriminator: string; fullName: string };
      pixels: string;
      accuracy: number;
      matchingPixels: number;
      submitTime: number;
    } | null;
    isDraw: boolean;
    duration: number;
    endsAt: number;
  }) => {
    console.log('[Socket] CopyCat results received');
    copyCat.set({
      referenceImage: data.referenceImage,
      results: data.results,
      winner: data.winner,
      isDraw: data.isDraw,
      rematchVotes: [],
      rematchResult: null,
      hasVotedRematch: false,
    });
    startTimer(data.duration, data.endsAt);
    game.update((g) => ({ ...g, phase: 'copycat-result' }));

    // Record stats and history for CopyCat
    const user = get(currentUser);
    if (user) {
      const myResult = data.results.find((r) => r.user.fullName === user.fullName);
      if (myResult) {
        // Determine placement (1 = winner, 2 = loser, or both 1 if draw)
        const isWinner = data.winner?.user.fullName === user.fullName;
        const placement = data.isDraw ? 1 : (isWinner ? 1 : 2);

        // Update aggregate stats with accuracy
        recordGameResult('copy-cat', placement, { accuracy: myResult.accuracy });

        // Save to game history with drawing
        addGameToHistory({
          gameMode: 'copy-cat',
          placement,
          totalPlayers: data.results.length,
          pixels: myResult.pixels,
          prompt: `Accuracy: ${myResult.accuracy.toFixed(1)}%`,
        });
      }
    }
  });

  // === CopyCat Rematch Events ===
  socket.on('copycat-rematch-prompt', (data: { duration: number; endsAt: number }) => {
    console.log('[Socket] CopyCat rematch prompt');
    copyCat.update((c) => ({
      ...c,
      rematchVotes: [],
      rematchResult: null,
      hasVotedRematch: false,
    }));
    startTimer(data.duration, data.endsAt);
    game.update((g) => ({ ...g, phase: 'copycat-rematch' }));
  });

  socket.on('copycat-rematch-vote', (data: { playerId: string; wantsRematch: boolean }) => {
    console.log('[Socket] CopyCat rematch vote:', data);
    copyCat.update((c) => ({
      ...c,
      rematchVotes: [...c.rematchVotes.filter(v => v.playerId !== data.playerId), data],
    }));
  });

  socket.on('copycat-rematch-result', (data: { rematch: boolean; reason: 'both-yes' | 'declined' | 'timeout' }) => {
    console.log('[Socket] CopyCat rematch result:', data);
    copyCat.update((c) => ({
      ...c,
      rematchResult: data,
    }));
    // Phase transition will happen via phase-changed event
  });

  // === PixelGuesser Mode Events ===
  socket.on('pixelguesser-round-start', (data: {
    round: number;
    totalRounds: number;
    artistId: string;
    artistUser: { displayName: string; discriminator: string; fullName: string };
    isYouArtist: boolean;
    secretPrompt?: string;
    secretPromptIndices?: { prefixIdx: number | null; subjectIdx: number; suffixIdx: number | null };
    duration: number;
    endsAt: number;
  }) => {
    console.log('[Socket] PixelGuesser round start:', data.round, '/', data.totalRounds, 'Artist:', data.artistUser.displayName);
    pixelGuesser.update((pg) => ({
      ...pg,
      round: data.round,
      totalRounds: data.totalRounds,
      artistId: data.artistId,
      artistUser: data.artistUser,
      isYouArtist: data.isYouArtist,
      secretPrompt: data.secretPrompt ?? null,
      secretPromptIndices: data.secretPromptIndices ?? null,
      currentDrawing: '1'.repeat(64),
      guesses: [],
      hasGuessedCorrectly: false,
      correctGuessers: [],
      lastGuessResult: null,
    }));
    startTimer(data.duration, data.endsAt);
    game.update((g) => ({ ...g, phase: 'guessing' }));
  });

  socket.on('pixelguesser-drawing-update', (data: { pixels: string }) => {
    // Update the current drawing (for guessers watching the artist draw)
    pixelGuesser.update((pg) => ({
      ...pg,
      currentDrawing: data.pixels,
    }));
  });

  socket.on('pixelguesser-guess-result', (data: { correct: boolean; guess: string; message?: string }) => {
    console.log('[Socket] PixelGuesser guess result:', data);
    pixelGuesser.update((pg) => ({
      ...pg,
      guesses: [...pg.guesses, data.guess],
      hasGuessedCorrectly: data.correct || pg.hasGuessedCorrectly,
      lastGuessResult: { correct: data.correct, close: !!data.message, message: data.message },
    }));
  });

  socket.on('pixelguesser-correct-guess', (data: {
    playerId: string;
    user: { displayName: string; discriminator: string; fullName: string };
    points: number;
    timeMs: number;
    position: number;
    remainingGuessers: number;
  }) => {
    console.log('[Socket] PixelGuesser correct guess:', data.user.displayName, '+', data.points, 'points');
    pixelGuesser.update((pg) => ({
      ...pg,
      correctGuessers: [...pg.correctGuessers, {
        playerId: data.playerId,
        user: data.user,
        points: data.points,
        timeMs: data.timeMs,
        position: data.position,
      }],
    }));
  });

  socket.on('pixelguesser-reveal', (data: {
    secretPrompt: string;
    secretPromptIndices?: { prefixIdx: number | null; subjectIdx: number; suffixIdx: number | null };
    artistId: string;
    artistUser: { displayName: string; discriminator: string; fullName: string };
    artistPixels: string;
    scores: Array<{
      playerId: string;
      user: { displayName: string; discriminator: string; fullName: string };
      score: number;
      roundScore: number;
      wasArtist: boolean;
      guessedCorrectly: boolean;
      guessTime?: number;
    }>;
    duration: number;
    endsAt: number;
  }) => {
    console.log('[Socket] PixelGuesser reveal:', data.secretPrompt);
    pixelGuesser.update((pg) => ({
      ...pg,
      secretPrompt: data.secretPrompt,
      secretPromptIndices: data.secretPromptIndices ?? null,
      currentDrawing: data.artistPixels,
      scores: data.scores,
    }));
    startTimer(data.duration, data.endsAt);
    game.update((g) => ({ ...g, phase: 'reveal' }));
  });

  socket.on('pixelguesser-final-results', (data: {
    rankings: Array<{
      playerId: string;
      user: { displayName: string; discriminator: string; fullName: string };
      score: number;
      roundScore: number;
      wasArtist: boolean;
      guessedCorrectly: boolean;
      guessTime?: number;
    }>;
    totalRounds: number;
    duration: number;
    endsAt: number;
  }) => {
    console.log('[Socket] PixelGuesser final results');
    pixelGuesser.update((pg) => ({
      ...pg,
      scores: data.rankings,
    }));
    startTimer(data.duration, data.endsAt);
    game.update((g) => ({ ...g, phase: 'pixelguesser-results' }));

    // Record stats for PixelGuesser
    const user = get(currentUser);
    if (user) {
      const myResult = data.rankings.find((r) => r.user.fullName === user.fullName);
      if (myResult) {
        const placement = data.rankings.indexOf(myResult) + 1;
        recordGameResult('pixel-guesser', placement);
        addGameToHistory({
          gameMode: 'pixel-guesser',
          placement,
          totalPlayers: data.rankings.length,
          prompt: `Score: ${myResult.score}`,
          pixels: '', // PixelGuesser doesn't have a single player drawing
        });
      }
    }

    // Reset PixelGuesser state after showing results
    setTimeout(() => {
      resetPixelGuesserState();
    }, data.duration);
  });
}

// === Action Functions ===
export function joinPublicGame(gameMode?: string): void {
  const mode = gameMode ?? get(selectedGameMode);
  getSocket()?.emit('join-public', { gameMode: mode });
}

export function createPrivateRoom(password?: string, gameMode?: string): void {
  const mode = gameMode ?? get(selectedGameMode);
  getSocket()?.emit('create-room', { password, gameMode: mode });
}

export function joinPrivateRoom(code: string, password?: string): void {
  getSocket()?.emit('join-room', { code, password });
}

export function hostChangePassword(password: string | null): void {
  getSocket()?.emit('host-change-password', { password });
}

export function leaveLobby(): void {
  getSocket()?.emit('leave-lobby');
  resetLobbyState();
}

export function changeName(name: string): void {
  getSocket()?.emit('change-name', { name });
}

export function hostStartGame(): void {
  getSocket()?.emit('host-start-game');
}

export function submitDrawing(pixelData: string): void {
  getSocket()?.emit('submit-drawing', { pixels: pixelData });
}

export function vote(chosenId: string): void {
  getSocket()?.emit('vote', { chosenId });
}

export function finaleVote(playerId: string): void {
  getSocket()?.emit('finale-vote', { playerId });
  finaleVoted.set(true);
}

export function copyCatRematchVote(wantsRematch: boolean): void {
  getSocket()?.emit('copycat-rematch-vote', { wantsRematch });
  copyCat.update((c) => ({ ...c, hasVotedRematch: true }));
}

/**
 * Return to lobby after game ends
 * - Public game: Join new public queue
 * - Private room: Try to rejoin same room if still available
 */
export function returnToLobby(): void {
  const currentLobby = get(lobby);
  const lobbyType = currentLobby.type;
  const roomCode = currentLobby.code;

  // Reset game state first
  resetGameState();

  if (lobbyType === 'private' && roomCode) {
    // Try to rejoin the private room
    getSocket()?.emit('join-room', { code: roomCode });
  } else {
    // Join public queue (default)
    getSocket()?.emit('join-public');
  }
}

// === PixelGuesser Action Functions ===
export function pixelGuesserDraw(pixels: string): void {
  getSocket()?.emit('pixelguesser-draw', { pixels });
}

export function pixelGuesserGuess(guess: string): void {
  getSocket()?.emit('pixelguesser-guess', { guess });
}
