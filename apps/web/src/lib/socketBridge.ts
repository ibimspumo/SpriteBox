// apps/web/src/lib/socketBridge.ts
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
} from './socket';
import {
  connectionStatus,
  socketId,
  currentUser,
  lobby,
  game,
  voting,
  finale,
  results,
  lastError,
  hasSubmitted,
  finaleVoted,
  startTimer,
  resetGameState,
  resetLobbyState,
  type GamePhase,
} from './stores';

let initialized = false;

/**
 * Initialisiert Socket und verbindet mit Stores
 */
export function initSocketBridge(): void {
  if (initialized) return;
  initialized = true;

  const socket = initSocket();
  setupEventHandlers(socket);
}

function setupEventHandlers(socket: AppSocket): void {
  // === Connection Events ===
  socket.on('connect', () => {
    connectionStatus.set('connected');
    socketId.set(socket.id ?? null);
  });

  socket.on('disconnect', () => {
    connectionStatus.set('disconnected');
    socketId.set(null);
  });

  socket.on('connect_error', () => {
    connectionStatus.set('disconnected');
  });

  // === Server Events ===
  socket.on('connected', (data: { socketId: string; serverTime: number; user: User }) => {
    currentUser.set(data.user);
  });

  socket.on('error', (data: { code: string; message?: string }) => {
    lastError.set(data);
    console.error('[Socket Error]', data);
  });

  // === Lobby Events ===
  socket.on('lobby-joined', (data: LobbyJoinedData) => {
    lobby.set({
      instanceId: data.instanceId,
      type: data.type,
      code: data.code ?? null,
      isHost: data.isHost ?? false,
      players: data.players,
      isSpectator: data.spectator,
    });
    game.update((g) => ({ ...g, phase: 'lobby' }));
  });

  socket.on('player-joined', (data: { user: User }) => {
    lobby.update((l) => ({
      ...l,
      players: [...l.players, data.user],
    }));
  });

  socket.on('player-left', (data: { playerId: string; kicked?: boolean }) => {
    lobby.update((l) => ({
      ...l,
      players: l.players.filter((p) => p.fullName !== data.playerId),
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
    results.set(data);
    game.update((g) => ({ ...g, phase: 'results' }));
  });

  // === User Events ===
  socket.on('name-changed', (data: { user: User }) => {
    currentUser.set(data.user);
  });

  socket.on('kicked', (data: { reason: string }) => {
    lastError.set({ code: 'KICKED', message: data.reason });
    resetLobbyState();
  });
}

// === Action Functions ===
export function joinPublicGame(): void {
  getSocket()?.emit('join-public');
}

export function createPrivateRoom(): void {
  getSocket()?.emit('create-room');
}

export function joinPrivateRoom(code: string): void {
  getSocket()?.emit('join-room', { code });
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
