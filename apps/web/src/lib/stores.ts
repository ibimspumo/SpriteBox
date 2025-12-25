// apps/web/src/lib/stores.ts
import { writable, derived, type Readable } from 'svelte/store';
import type { User, Prompt, PromptIndices, LobbyJoinedData, VotingRoundData, FinaleData, GameResultsData } from './socket';
import { localizePrompt } from './prompts';
import { currentLanguage } from './i18n';

// === Connection State ===
export const connectionStatus = writable<'disconnected' | 'connecting' | 'connected'>('disconnected');
export const socketId = writable<string | null>(null);
export const globalOnlineCount = writable<number>(0);
export const onlineCountByMode = writable<Record<string, number>>({});
export const sessionBlocked = writable<boolean>(false); // Too many sessions from same browser
export const idleWarning = writable<{ show: boolean; timeLeft: number }>({ show: false, timeLeft: 0 });

// === Game Mode State ===
export interface GameModeInfo {
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

export const availableGameModes = writable<GameModeInfo[]>([]);
export const selectedGameMode = writable<string>('pixel-battle');
export const defaultGameMode = writable<string>('pixel-battle');

// === User State ===
export const currentUser = writable<User | null>(null);

// === Lobby State ===
export interface LobbyState {
  instanceId: string | null;
  type: 'public' | 'private' | null;
  code: string | null;
  isHost: boolean;
  hasPassword: boolean;
  players: User[];
  isSpectator: boolean;
  onlineCount: number;
  gameMode: string;
}

export const lobby = writable<LobbyState>({
  instanceId: null,
  type: null,
  code: null,
  isHost: false,
  hasPassword: false,
  players: [],
  isSpectator: false,
  onlineCount: 0,
  gameMode: 'pixel-battle',
});

// === Password Prompt State ===
export interface PasswordPromptState {
  show: boolean;
  roomCode: string | null;
  error: string | null;
}

export const passwordPrompt = writable<PasswordPromptState>({
  show: false,
  roomCode: null,
  error: null,
});

// === Game State ===
export type GamePhase =
  | 'idle'
  | 'lobby'
  | 'countdown'
  | 'drawing'
  | 'voting'
  | 'finale'
  | 'results'
  // CopyCat mode
  | 'memorize'
  | 'copycat-result'
  | 'copycat-rematch'
  // PixelGuesser mode
  | 'guessing'
  | 'reveal'
  | 'pixelguesser-results'
  // PixelSurvivor mode (single-player roguelike)
  | 'survivor-menu'
  | 'survivor-character'
  | 'survivor-day-start'
  | 'survivor-event'
  | 'survivor-drawing'
  | 'survivor-result'
  | 'survivor-levelup'
  | 'survivor-gameover'
  | 'survivor-victory';

export interface GameState {
  phase: GamePhase;
  prompt: Prompt | null;
  promptIndices: PromptIndices | null;
  timer: {
    duration: number;
    endsAt: number;
    remaining: number;
  } | null;
}

export const game = writable<GameState>({
  phase: 'idle',
  prompt: null,
  promptIndices: null,
  timer: null,
});

// === Derived Stores ===
// Localized prompt that updates when language or promptIndices change
export const localizedPrompt = derived(
  [game, currentLanguage],
  ([$game, $lang]) => {
    if (!$game.promptIndices) return null;
    return localizePrompt($game.promptIndices);
  }
);

// === Current Game Mode Info ===
// Returns the current lobby's game mode info with player requirements
export const currentGameModeInfo = derived(
  [lobby, availableGameModes],
  ([$lobby, $modes]) => {
    const mode = $modes.find(m => m.id === $lobby.gameMode);
    // Default fallback for pixel-battle
    return mode ?? {
      id: 'pixel-battle',
      displayName: 'Pixel Battle',
      i18nKey: 'pixelBattle',
      players: { min: 5, max: 100 },
      allowPrivate: true,
    };
  }
);

// === Current Mode Online Count ===
// Returns the player count for the currently selected game mode
export const currentModeOnlineCount = derived(
  [onlineCountByMode, selectedGameMode],
  ([$byMode, $mode]) => $byMode[$mode] ?? 0
);

// === Drawing State ===
export const pixels = writable<string>('1'.repeat(64)); // White as default
export const selectedColor = writable<number>(0); // Black
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

// Localized results prompt (for the results screen)
export const localizedResultsPrompt = derived(
  [results, currentLanguage],
  ([$results, $lang]) => {
    if (!$results?.promptIndices) return $results?.prompt || null;
    return localizePrompt($results.promptIndices);
  }
);

// === Error State ===
export const lastError = writable<{ code: string; message?: string } | null>(null);

// === Other Derived Stores ===
export const isInGame: Readable<boolean> = derived(lobby, ($lobby) => $lobby.instanceId !== null);
export const isHost: Readable<boolean> = derived(lobby, ($lobby) => $lobby.isHost);
export const playerCount: Readable<number> = derived(lobby, ($lobby) => $lobby.players.length);

// === Timer Store (with Auto-Update) ===
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
  game.set({ phase: 'idle', prompt: null, promptIndices: null, timer: null });
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
    hasPassword: false,
    players: [],
    isSpectator: false,
    onlineCount: 0,
    gameMode: 'pixel-battle',
  });
  passwordPrompt.set({ show: false, roomCode: null, error: null });
  resetGameState();
  resetCopyCatState();
  resetPixelGuesserState();
}

// === CopyCat Mode State ===
export interface CopyCatResultEntry {
  playerId: string;
  user: User;
  pixels: string;
  accuracy: number;
  matchingPixels: number;
  submitTime: number;
}

export interface CopyCatRematchVote {
  playerId: string;
  wantsRematch: boolean;
}

export interface CopyCatState {
  referenceImage: string | null;
  results: CopyCatResultEntry[];
  winner: CopyCatResultEntry | null;
  isDraw: boolean;
  // Rematch state
  rematchVotes: CopyCatRematchVote[];
  rematchResult: { rematch: boolean; reason: 'both-yes' | 'declined' | 'timeout' } | null;
  hasVotedRematch: boolean;
}

export const copyCat = writable<CopyCatState>({
  referenceImage: null,
  results: [],
  winner: null,
  isDraw: false,
  rematchVotes: [],
  rematchResult: null,
  hasVotedRematch: false,
});

export function resetCopyCatState(): void {
  copyCat.set({
    referenceImage: null,
    results: [],
    winner: null,
    isDraw: false,
    rematchVotes: [],
    rematchResult: null,
    hasVotedRematch: false,
  });
}

// === PixelGuesser Mode State ===
export interface PixelGuesserScoreEntry {
  playerId: string;
  user: User;
  score: number;
  roundScore: number;
  wasArtist: boolean;
  guessedCorrectly: boolean;
  guessTime?: number;
}

export interface PixelGuesserCorrectGuess {
  playerId: string;
  user: User;
  points: number;
  timeMs: number;
  position: number;
}

export interface PixelGuesserState {
  round: number;
  totalRounds: number;
  artistId: string | null;
  artistUser: User | null;
  isYouArtist: boolean;
  secretPrompt: string | null;
  secretPromptIndices: PromptIndices | null;
  currentDrawing: string;
  guesses: string[];
  hasGuessedCorrectly: boolean;
  correctGuessers: PixelGuesserCorrectGuess[];
  scores: PixelGuesserScoreEntry[];
  lastGuessResult: { correct: boolean; close: boolean; message?: string } | null;
}

export const pixelGuesser = writable<PixelGuesserState>({
  round: 0,
  totalRounds: 0,
  artistId: null,
  artistUser: null,
  isYouArtist: false,
  secretPrompt: null,
  secretPromptIndices: null,
  currentDrawing: '1'.repeat(64),
  guesses: [],
  hasGuessedCorrectly: false,
  correctGuessers: [],
  scores: [],
  lastGuessResult: null,
});

export function resetPixelGuesserState(): void {
  pixelGuesser.set({
    round: 0,
    totalRounds: 0,
    artistId: null,
    artistUser: null,
    isYouArtist: false,
    secretPrompt: null,
    secretPromptIndices: null,
    currentDrawing: '1'.repeat(64),
    guesses: [],
    hasGuessedCorrectly: false,
    correctGuessers: [],
    scores: [],
    lastGuessResult: null,
  });
}
