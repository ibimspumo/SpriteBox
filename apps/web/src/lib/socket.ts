// apps/web/src/lib/socket.ts
import { io, type Socket } from 'socket.io-client';
import { browser } from '$app/environment';

// Types for events (should match server)
export interface ServerToClientEvents {
  connected: (data: { socketId: string; serverTime: number; user: User; sessionId: string }) => void;
  error: (data: { code: string; message?: string }) => void;
  'lobby-joined': (data: LobbyJoinedData) => void;
  'player-joined': (data: { user: User }) => void;
  'player-left': (data: { playerId: string; kicked?: boolean }) => void;
  'lobby-timer-started': (data: { duration: number; startsAt: number }) => void;
  'phase-changed': (data: PhaseChangedData) => void;
  'submission-received': (data: { success: boolean; submissionCount: number }) => void;
  'voting-round': (data: VotingRoundData) => void;
  'vote-received': (data: { success: boolean; eloChange?: { winner: number; loser: number } }) => void;
  'finale-start': (data: FinaleData) => void;
  'game-results': (data: GameResultsData) => void;
  'name-changed': (data: { user: User }) => void;
  'kicked': (data: { reason: string }) => void;
  'idle-disconnect': (data: { reason: string }) => void;
  'session-restored': (data: SessionRestoredData) => void;
  'session-restore-failed': (data: { reason: string }) => void;
  'instance-closing': (data: { reason: string }) => void;
}

export interface ClientToServerEvents {
  ping: (callback: (time: number) => void) => void;
  'join-public': () => void;
  'create-room': () => void;
  'join-room': (data: { code: string }) => void;
  'leave-lobby': () => void;
  'change-name': (data: { name: string }) => void;
  'host-start-game': () => void;
  'host-kick-player': (data: { playerId: string }) => void;
  'submit-drawing': (data: { pixels: string }) => void;
  'vote': (data: { chosenId: string }) => void;
  'finale-vote': (data: { playerId: string }) => void;
  'sync-stats': (data: { gamesPlayed: number; placements: { 1: number; 2: number; 3: number } }) => void;
  'restore-session': (data: { sessionId: string }) => void;
  'restore-user': (data: { displayName: string; discriminator: string }) => void;
}

export interface SessionRestoredData {
  instanceId: string;
  user: User;
  phase: string;
  prompt?: string;
  players: User[];
  isSpectator: boolean;
}

// Interfaces
export interface User {
  displayName: string;
  discriminator: string;
  fullName: string;
}

export interface LobbyJoinedData {
  instanceId: string;
  type: 'public' | 'private';
  code?: string;
  isHost?: boolean;
  players: User[];
  spectator: boolean;
}

export interface PhaseChangedData {
  phase: string;
  prompt?: string;
  duration?: number;
  startsAt?: number;
  endsAt?: number;
  round?: number;
  totalRounds?: number;
}

export interface VotingRoundData {
  round: number;
  totalRounds: number;
  imageA: { playerId: string; pixels: string };
  imageB: { playerId: string; pixels: string };
  timeLimit: number;
  endsAt: number;
}

export interface FinaleData {
  finalists: Array<{
    playerId: string;
    pixels: string;
    user?: User;
    elo: number;
  }>;
  timeLimit: number;
  endsAt: number;
}

export interface GameResultsData {
  prompt: string;
  rankings: Array<{
    place: number;
    playerId: string;
    user: User;
    pixels: string;
    finalVotes: number;
    elo: number;
  }>;
  compressedRankings?: string;
  totalParticipants: number;
}

// Socket type export
export type AppSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

// Socket instance
let socket: AppSocket | null = null;

/**
 * Initializes the socket connection
 */
export function initSocket(): Socket<ServerToClientEvents, ClientToServerEvents> {
  if (!browser) {
    throw new Error('Socket can only be initialized in browser');
  }

  if (socket?.connected) {
    return socket;
  }

  const serverUrl = import.meta.env.DEV
    ? 'http://localhost:3000'
    : window.location.origin;

  socket = io(serverUrl, {
    autoConnect: true,
    reconnection: true,
    reconnectionAttempts: 10,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    timeout: 20000,
  });

  // Debug-Logging in Development
  if (import.meta.env.DEV) {
    socket.onAny((event, ...args) => {
      console.log(`[Socket] ${event}:`, args);
    });
  }

  return socket;
}

/**
 * Returns the current socket instance
 */
export function getSocket(): Socket<ServerToClientEvents, ClientToServerEvents> | null {
  return socket;
}

/**
 * Disconnects the socket
 */
export function disconnectSocket(): void {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}

/**
 * Checks if connected
 */
export function isConnected(): boolean {
  return socket?.connected ?? false;
}

/**
 * Waits for connection
 */
export function waitForConnection(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (!socket) {
      reject(new Error('Socket not initialized'));
      return;
    }

    if (socket.connected) {
      resolve();
      return;
    }

    const timeout = setTimeout(() => {
      reject(new Error('Connection timeout'));
    }, 10000);

    socket.once('connect', () => {
      clearTimeout(timeout);
      resolve();
    });

    socket.once('connect_error', (err) => {
      clearTimeout(timeout);
      reject(err);
    });
  });
}
