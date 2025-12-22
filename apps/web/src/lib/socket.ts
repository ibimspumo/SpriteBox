// apps/web/src/lib/socket.ts
import { io, type Socket } from 'socket.io-client';
import { browser } from '$app/environment';

// Types for events (should match server)
export interface ServerToClientEvents {
  connected: (data: { socketId: string; serverTime: number; user: User; sessionId: string }) => void;
  error: (data: { code: string; message?: string; retryAfter?: number }) => void;
  'lobby-joined': (data: LobbyJoinedData) => void;
  'player-joined': (data: { user: User }) => void;
  'player-left': (data: { playerId: string; kicked?: boolean }) => void;
  'player-updated': (data: { playerId: string; user: User }) => void;
  'player-disconnected': (data: { playerId: string; user: User; timestamp: number }) => void;
  'player-reconnected': (data: { playerId: string; user: User; timestamp: number }) => void;
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
  'password-required': (data: { code: string }) => void;
  'password-changed': (data: { hasPassword: boolean }) => void;
  'room-created': (data: { code: string; instanceId: string }) => void;
  'online-count': (data: { count: number }) => void;
}

export interface ClientToServerEvents {
  ping: (callback: (time: number) => void) => void;
  'join-public': () => void;
  'create-room': (data?: { password?: string }) => void;
  'join-room': (data: { code: string; password?: string }) => void;
  'leave-lobby': () => void;
  'change-name': (data: { name: string }) => void;
  'host-start-game': () => void;
  'host-kick-player': (data: { playerId: string }) => void;
  'host-change-password': (data: { password: string | null }) => void;
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
  prompt?: Prompt;
  players: User[];
  isSpectator: boolean;
  phaseState?: {
    timer?: {
      duration: number;
      endsAt: number;
    };
    hasSubmitted?: boolean;
    currentRound?: number;
    totalRounds?: number;
    votingAssignment?: {
      imageA: { playerId: string; pixels: string };
      imageB: { playerId: string; pixels: string };
    };
    hasVoted?: boolean;
    finalists?: Array<{
      playerId: string;
      pixels: string;
      user?: User;
      elo: number;
    }>;
    finaleVoted?: boolean;
  };
}

// Interfaces
export interface Prompt {
  prefix: string;
  subject: string;
  suffix: string;
}

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
  hasPassword?: boolean;
  players: User[];
  spectator: boolean;
  phase?: string;
  prompt?: Prompt;
  timerEndsAt?: number;
  votingRound?: number;
  votingTotalRounds?: number;
}

export interface PhaseChangedData {
  phase: string;
  prompt?: Prompt;
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
  prompt?: Prompt;
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

// Browser fingerprint key
const BROWSER_FINGERPRINT_KEY = 'spritebox-browser-id';

/**
 * Gets or creates a unique browser fingerprint (persisted in localStorage)
 * This identifies a specific browser, not a user or IP
 */
function getBrowserFingerprint(): string {
  if (!browser) return 'server';

  let fingerprint = localStorage.getItem(BROWSER_FINGERPRINT_KEY);
  if (!fingerprint) {
    // Generate a unique ID for this browser
    fingerprint = crypto.randomUUID();
    localStorage.setItem(BROWSER_FINGERPRINT_KEY, fingerprint);
  }
  return fingerprint;
}

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
    transports: ['websocket'],  // Skip polling, use WebSocket directly
    auth: {
      browserId: getBrowserFingerprint(),
    },
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
