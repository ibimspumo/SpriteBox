// apps/web/src/lib/socket.ts
import { io, type Socket } from 'socket.io-client';
import { browser } from '$app/environment';

// Re-export types from @spritebox/types for backwards compatibility
export type {
  // Core types
  User,
  Prompt,
  PromptIndices,
  GameModeStats,
  // Socket event types
  ServerToClientEvents,
  ClientToServerEvents,
  LobbyJoinedData,
  PhaseChangedData,
  VotingRoundData,
  FinaleStartData,
  FinaleStartData as FinaleData,  // Alias for backwards compatibility
  GameResultsData,
  SessionRestoredData,
  GameModeInfoData,
  GameModesData,
  // CopyCat types
  CopyCatPlayerResult,
  CopyCatResultEntry,
  CopyCatResultsData as CopyCatResultsData,
  // PixelGuesser types
  PixelGuesserScoreEntry,
  PixelGuesserRoundStartData,
  PixelGuesserCorrectGuessData,
  PixelGuesserRevealData,
  PixelGuesserFinalResultsData,
  // ZombiePixel types
  ZombiePixelPlayerData,
  ZombieItemData,
  ZombieEffectData,
  ZombieGameStateData,
  ZombieRolesAssignedData,
  ZombieInfectionData,
  ZombieHealedData,
  ZombieItemSpawnedData,
  ZombiePixelStatsData,
  ZombieGameEndData,
  ZombieLobbyUpdateData,
  // CopyCat Royale types
  RoyalePlayerRoundResult,
  RoyaleFinalRanking,
  RoyaleInitialDrawingData,
  RoyaleShowReferenceData,
  RoyaleDrawingData,
  RoyaleRoundResultsData,
  RoyalePlayerEliminatedData,
  RoyaleFinaleData,
  RoyaleWinnerData,
  RoyaleYouEliminatedData,
} from '@spritebox/types';

// Import types for internal use
import type { ServerToClientEvents, ClientToServerEvents } from '@spritebox/types';

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
