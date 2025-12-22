// apps/web/src/lib/stores.ts
import { writable, derived, type Readable } from 'svelte/store';
import type { User, LobbyJoinedData, VotingRoundData, FinaleData, GameResultsData } from './socket';

// === Connection State ===
export const connectionStatus = writable<'disconnected' | 'connecting' | 'connected'>('disconnected');
export const socketId = writable<string | null>(null);

// === User State ===
export const currentUser = writable<User | null>(null);

// === Lobby State ===
export interface LobbyState {
  instanceId: string | null;
  type: 'public' | 'private' | null;
  code: string | null;
  isHost: boolean;
  players: User[];
  isSpectator: boolean;
}

export const lobby = writable<LobbyState>({
  instanceId: null,
  type: null,
  code: null,
  isHost: false,
  players: [],
  isSpectator: false,
});

// === Game State ===
export type GamePhase = 'idle' | 'lobby' | 'countdown' | 'drawing' | 'voting' | 'finale' | 'results';

export interface GameState {
  phase: GamePhase;
  prompt: string | null;
  timer: {
    duration: number;
    endsAt: number;
    remaining: number;
  } | null;
}

export const game = writable<GameState>({
  phase: 'idle',
  prompt: null,
  timer: null,
});

// === Drawing State ===
export const pixels = writable<string>('1'.repeat(64)); // Weiß als Standard
export const selectedColor = writable<number>(0); // Schwarz
export const hasSubmitted = writable<boolean>(false);

// === Voting State ===
export interface VotingState {
  round: number;
  totalRounds: number;
  imageA: { playerId: string; pixels: string } | null;
  imageB: { playerId: string; pixels: string } | null;
  hasVoted: boolean;
}

export const voting = writable<VotingState>({
  round: 0,
  totalRounds: 0,
  imageA: null,
  imageB: null,
  hasVoted: false,
});

// === Finale State ===
export const finale = writable<FinaleData | null>(null);
export const finaleVoted = writable<boolean>(false);

// === Results State ===
export const results = writable<GameResultsData | null>(null);

// === Error State ===
export const lastError = writable<{ code: string; message?: string } | null>(null);

// === Derived Stores ===
export const isInGame: Readable<boolean> = derived(lobby, ($lobby) => $lobby.instanceId !== null);
export const isHost: Readable<boolean> = derived(lobby, ($lobby) => $lobby.isHost);
export const playerCount: Readable<number> = derived(lobby, ($lobby) => $lobby.players.length);

// === Timer Store (mit Auto-Update) ===
let timerInterval: ReturnType<typeof setInterval> | null = null;

export function startTimer(duration: number, endsAt: number): void {
  if (timerInterval) {
    clearInterval(timerInterval);
  }

  game.update((g) => ({
    ...g,
    timer: { duration, endsAt, remaining: Math.max(0, endsAt - Date.now()) },
  }));

  timerInterval = setInterval(() => {
    game.update((g) => {
      if (!g.timer) return g;
      const remaining = Math.max(0, g.timer.endsAt - Date.now());
      if (remaining <= 0) {
        clearInterval(timerInterval!);
        timerInterval = null;
      }
      return { ...g, timer: { ...g.timer, remaining } };
    });
  }, 100);
}

export function stopTimer(): void {
  if (timerInterval) {
    clearInterval(timerInterval);
    timerInterval = null;
  }
  game.update((g) => ({ ...g, timer: null }));
}

// === Reset Functions ===
export function resetGameState(): void {
  stopTimer();
  game.set({ phase: 'idle', prompt: null, timer: null });
  pixels.set('1'.repeat(64));
  hasSubmitted.set(false);
  voting.set({ round: 0, totalRounds: 0, imageA: null, imageB: null, hasVoted: false });
  finale.set(null);
  finaleVoted.set(false);
  results.set(null);
}

export function resetLobbyState(): void {
  lobby.set({
    instanceId: null,
    type: null,
    code: null,
    isHost: false,
    players: [],
    isSpectator: false,
  });
  resetGameState();
}
