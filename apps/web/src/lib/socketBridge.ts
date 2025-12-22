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
} from './socket';
import {
  connectionStatus,
  socketId,
  globalOnlineCount,
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
  startTimer,
  resetGameState,
  resetLobbyState,
  type GamePhase,
} from './stores';
import { recordGameResult, syncStatsWithServer } from './stats';

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
function saveUser(user: User): void {
  if (!browser) return;
  try {
    localStorage.setItem(USER_STORAGE_KEY, JSON.stringify({
      displayName: user.displayName,
      discriminator: user.discriminator,
    }));
  } catch (e) {
    console.error('Failed to save user:', e);
  }
}

function loadUser(): { displayName: string; discriminator: string } | null {
  if (!browser) return null;
  try {
    const stored = localStorage.getItem(USER_STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (e) {
    console.error('Failed to load user:', e);
  }
  return null;
}

/**
 * Initialisiert Socket und verbindet mit Stores
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

    // Try to restore session on reconnect (within grace period)
    const savedSession = loadSession();
    if (savedSession) {
      console.log('[Socket] Attempting to restore session...');
      socket.emit('restore-session', { sessionId: savedSession.sessionId });
    } else {
      // No active session, but try to restore saved username
      const savedUser = loadUser();
      if (savedUser) {
        console.log('[Socket] Restoring saved username:', savedUser.displayName);
        socket.emit('restore-user', {
          displayName: savedUser.displayName,
          discriminator: savedUser.discriminator,
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

  socket.on('connect_error', () => {
    connectionStatus.set('disconnected');
  });

  // === Server Events ===
  socket.on('connected', (data: { socketId: string; serverTime: number; user: User; sessionId: string }) => {
    currentUser.set(data.user);
    currentSessionId = data.sessionId;

    // Save user for persistence across reloads
    saveUser(data.user);

    // Sync stats with server on connect
    syncStatsWithServer(socket);
  });

  socket.on('error', (data: { code: string; message?: string }) => {
    lastError.set(data);
    console.error('[Socket Error]', data);
  });

  // === Online Count (global player count) ===
  socket.on('online-count', (data: { count: number }) => {
    globalOnlineCount.set(data.count);
  });

  // === Lobby Events ===
  socket.on('lobby-joined', (data: LobbyJoinedData) => {
    lobby.set({
      instanceId: data.instanceId,
      type: data.type,
      code: data.code ?? null,
      isHost: data.isHost ?? false,
      hasPassword: data.hasPassword ?? false,
      players: data.players,
      isSpectator: data.spectator,
      onlineCount: data.players.length,
    });
    // Clear any password prompt on successful join
    passwordPrompt.set({ show: false, roomCode: null, error: null });
    game.update((g) => ({ ...g, phase: 'lobby' }));
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

  socket.on('lobby-timer-started', (data: { duration: number; startsAt: number }) => {
    startTimer(data.duration, data.startsAt);
  });

  // === Phase Events ===
  socket.on('phase-changed', (data: PhaseChangedData) => {
    const phase = data.phase as GamePhase;

    game.update((g) => ({
      ...g,
      phase,
      prompt: data.prompt ?? g.prompt,
    }));

    // Timer starten wenn angegeben
    if (data.duration && data.endsAt) {
      startTimer(data.duration, data.endsAt);
    } else if (data.duration && data.startsAt) {
      startTimer(data.duration, data.startsAt);
    }

    // Phase-spezifische Resets
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
      rankings,
      totalParticipants: data.totalParticipants,
    };

    results.set(resultsData);
    game.update((g) => ({ ...g, phase: 'results' }));

    // Record stats for this player
    // Find our placement in the rankings
    let myPlacement: number | undefined;
    currentUser.subscribe((user) => {
      if (user) {
        const myResult = rankings.find((r) => r.user.fullName === user.fullName);
        if (myResult) {
          myPlacement = myResult.place;
        }
      }
    })();

    if (myPlacement !== undefined) {
      recordGameResult(myPlacement);
    }
  });

  // === User Events ===
  socket.on('name-changed', (data: { user: User }) => {
    currentUser.set(data.user);
    saveUser(data.user);
  });

  socket.on('kicked', (data: { reason: string }) => {
    lastError.set({ code: 'KICKED', message: data.reason });
    clearSession();
    currentSessionId = null;
    resetLobbyState();
  });

  // === Session Events ===
  socket.on('session-restored', (data: SessionRestoredData) => {
    console.log('[Socket] Session restored:', data);
    clearSession(); // Clear saved session after successful restore

    currentUser.set(data.user);
    lobby.set({
      instanceId: data.instanceId,
      type: 'public', // Will be updated by phase events
      code: null,
      isHost: false,
      hasPassword: false,
      players: data.players,
      isSpectator: data.isSpectator,
      onlineCount: data.players.length,
    });
    game.update((g) => ({
      ...g,
      phase: data.phase as GamePhase,
      prompt: data.prompt ?? g.prompt,
    }));
  });

  socket.on('session-restore-failed', (data: { reason: string }) => {
    console.log('[Socket] Session restore failed:', data.reason);
    clearSession();
    currentSessionId = null;
  });

  socket.on('idle-disconnect', (data: { reason: string }) => {
    console.log('[Socket] Idle disconnect:', data.reason);
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
}

// === Action Functions ===
export function joinPublicGame(): void {
  getSocket()?.emit('join-public');
}

export function createPrivateRoom(password?: string): void {
  getSocket()?.emit('create-room', password ? { password } : undefined);
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
