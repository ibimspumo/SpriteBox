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
  'lobby-timer-cancelled': () => void;
  'phase-changed': (data: PhaseChangedData) => void;
  'submission-received': (data: { success: boolean; submissionCount: number }) => void;
  'voting-round': (data: VotingRoundData) => void;
  'vote-received': (data: { success: boolean; eloChange?: { winner: number; loser: number } }) => void;
  'finale-start': (data: FinaleData) => void;
  'game-results': (data: GameResultsData) => void;
  'name-changed': (data: { user: User }) => void;
  'kicked': (data: { reason: string }) => void;
  'idle-warning': (data: { timeLeft: number }) => void;
  'idle-disconnect': (data: { reason: string }) => void;
  'session-restored': (data: SessionRestoredData) => void;
  'session-restore-failed': (data: { reason: string }) => void;
  'instance-closing': (data: { reason: string }) => void;
  'password-required': (data: { code: string }) => void;
  'password-changed': (data: { hasPassword: boolean }) => void;
  'room-created': (data: { code: string; instanceId: string }) => void;
  'online-count': (data: { count: number }) => void;
  'game-modes': (data: GameModesData) => void;
  'copycat-reference': (data: { referenceImage: string; duration: number; endsAt: number }) => void;
  'copycat-results': (data: CopyCatResultsData) => void;
  'copycat-rematch-prompt': (data: { duration: number; endsAt: number }) => void;
  'copycat-rematch-vote': (data: { playerId: string; wantsRematch: boolean }) => void;
  'copycat-rematch-result': (data: { rematch: boolean; reason: 'both-yes' | 'declined' | 'timeout' }) => void;
  // PixelGuesser mode events
  'pixelguesser-round-start': (data: PixelGuesserRoundStartData) => void;
  'pixelguesser-drawing-update': (data: { pixels: string }) => void;
  'pixelguesser-guess-result': (data: { correct: boolean; guess: string; message?: string }) => void;
  'pixelguesser-correct-guess': (data: PixelGuesserCorrectGuessData) => void;
  'pixelguesser-reveal': (data: PixelGuesserRevealData) => void;
  'pixelguesser-final-results': (data: PixelGuesserFinalResultsData) => void;
  // ZombiePixel mode events
  'zombie-game-state': (data: ZombieGameStateData) => void;
  'zombie-roles-assigned': (data: ZombieRolesAssignedData) => void;
  'zombie-infection': (data: ZombieInfectionData) => void;
  'zombie-game-end': (data: ZombieGameEndData) => void;
  'zombie-lobby-update': (data: ZombieLobbyUpdateData) => void;
}

// Persistent stats per game mode
export interface GameModeStats {
  gamesPlayed: number;
  wins: number;
  top3: number;
  currentWinStreak: number;
  bestWinStreak: number;
  bestAccuracy?: number;  // CopyCat specific
}

export interface CopyCatPlayerResult {
  playerId: string;
  user: User;
  pixels: string;
  accuracy: number;
  matchingPixels: number;
  submitTime: number;
}

export interface CopyCatResultsData {
  referenceImage: string | null;
  results: CopyCatPlayerResult[];
  winner: CopyCatPlayerResult | null;
  isDraw: boolean;
  duration: number;
  endsAt: number;
}

// PixelGuesser mode types
export interface PixelGuesserScoreEntry {
  playerId: string;
  user: User;
  score: number;
  roundScore: number;
  wasArtist: boolean;
  guessedCorrectly: boolean;
  guessTime?: number;
}

export interface PixelGuesserRoundStartData {
  round: number;
  totalRounds: number;
  artistId: string;
  artistUser: User;
  isYouArtist: boolean;
  secretPrompt?: string;
  secretPromptIndices?: PromptIndices;
  duration: number;
  endsAt: number;
}

export interface PixelGuesserCorrectGuessData {
  playerId: string;
  user: User;
  points: number;
  timeMs: number;
  position: number;
  remainingGuessers: number;
}

export interface PixelGuesserRevealData {
  secretPrompt: string;
  secretPromptIndices?: PromptIndices;
  artistId: string;
  artistUser: User;
  artistPixels: string;
  scores: PixelGuesserScoreEntry[];
  duration: number;
  endsAt: number;
}

export interface PixelGuesserFinalResultsData {
  rankings: PixelGuesserScoreEntry[];
  totalRounds: number;
  duration: number;
  endsAt: number;
}

// ZombiePixel mode types
export interface ZombiePixelPlayerData {
  id: string;
  name: string;
  x: number;
  y: number;
  isZombie: boolean;
  isBot: boolean;
}

export interface ZombieGameStateData {
  players: ZombiePixelPlayerData[];
  timeRemaining: number;
  survivorCount: number;
  zombieCount: number;
}

export interface ZombieRolesAssignedData {
  yourId: string;
  yourRole: 'zombie' | 'survivor';
  yourPosition: { x: number; y: number };
  survivorCount: number;
  zombieCount: number;
}

export interface ZombieInfectionData {
  victimName: string;
  zombieName: string;
  survivorsRemaining: number;
}

export interface ZombiePixelStatsData {
  totalInfections: number;
  gameDuration: number;
  firstInfectionTime: number | null;
  mostInfections: { playerId: string; name: string; count: number } | null;
  longestSurvivor: { playerId: string; name: string; survivalTime: number } | null;
}

export interface ZombieGameEndData {
  winner: { id: string; name: string; isBot: boolean } | null;
  zombiesWin: boolean;
  stats: ZombiePixelStatsData;
}

export interface ZombieLobbyUpdateData {
  playerCount: number;
  readyCount: number;
}

export interface ClientToServerEvents {
  ping: (callback: (time: number) => void) => void;
  'activity-ping': () => void;  // Lightweight ping to prevent idle timeout
  'join-public': (data?: { gameMode?: string }) => void;
  'create-room': (data?: { password?: string; gameMode?: string }) => void;
  'join-room': (data: { code: string; password?: string }) => void;
  'leave-lobby': () => void;
  'change-name': (data: { name: string }) => void;
  'host-start-game': () => void;
  'host-kick-player': (data: { playerId: string }) => void;
  'host-change-password': (data: { password: string | null }) => void;
  'submit-drawing': (data: { pixels: string }) => void;
  'vote': (data: { chosenId: string }) => void;
  'finale-vote': (data: { playerId: string }) => void;
  'restore-session': (data: { sessionId: string }) => void;
  'restore-user': (data: { displayName: string }) => void;
  'copycat-rematch-vote': (data: { wantsRematch: boolean }) => void;
  'view-mode': (data: { gameMode: string }) => void;
  'leave-mode': () => void;
  // PixelGuesser mode events
  'pixelguesser-draw': (data: { pixels: string }) => void;
  'pixelguesser-guess': (data: { guess: string }) => void;
  // ZombiePixel mode events
  'zombie-move': (data: { direction: 'up' | 'down' | 'left' | 'right' | 'up-left' | 'up-right' | 'down-left' | 'down-right' }) => void;
}

export interface SessionRestoredData {
  instanceId: string;
  user: User;
  phase: string;
  prompt?: Prompt;
  promptIndices?: PromptIndices;
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
  gameMode: string;
}

// Interfaces
export interface Prompt {
  prefix: string;
  subject: string;
  suffix: string;
}

export interface PromptIndices {
  prefixIdx: number | null;
  subjectIdx: number;
  suffixIdx: number | null;
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
  gameMode: string;
  phase?: string;
  prompt?: Prompt;
  promptIndices?: PromptIndices;
  timerEndsAt?: number;
  votingRound?: number;
  votingTotalRounds?: number;
}

export interface GameModeInfoData {
  id: string;
  displayName: string;
  i18nKey: string;
  players: {
    min: number;
    max: number;
    privateMin?: number;
  };
  allowPrivate: boolean;
}

export interface GameModesData {
  available: GameModeInfoData[];
  default: string;
}

export interface PhaseChangedData {
  phase: string;
  prompt?: Prompt;
  promptIndices?: PromptIndices;
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
  promptIndices?: PromptIndices;
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

/**
 * Emits view-mode event to track mode page viewing
 */
export function emitViewMode(gameMode: string): void {
  if (socket?.connected) {
    socket.emit('view-mode', { gameMode });
  }
}

/**
 * Emits leave-mode event when leaving a mode page
 */
export function emitLeaveMode(): void {
  if (socket?.connected) {
    socket.emit('leave-mode');
  }
}
