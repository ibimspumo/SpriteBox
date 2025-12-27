// packages/types/src/socket.ts
// Socket.io event type definitions

import type { User } from './user.js';
import type { InstanceType, GamePhase, ImageData, FinalistEntry, RankingEntry } from './game.js';
import type { Prompt, PromptIndices } from './prompt.js';
import type { PhaseStateFlat } from './phase.js';
import type { CopyCatResultEntry } from './modes/copycat.js';
import type {
  PixelGuesserScoreEntry,
  PixelGuesserRoundStartData,
  PixelGuesserCorrectGuessData,
  PixelGuesserRevealData,
  PixelGuesserFinalResultsData,
} from './modes/pixelGuesser.js';
import type {
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
} from './modes/copycatRoyale.js';
import type {
  ZombieGameStateData,
  ZombieRolesAssignedData,
  ZombieInfectionData,
  ZombieHealedData,
  ZombieItemSpawnedData,
  ZombieGameEndData,
  ZombieLobbyUpdateData,
} from './modes/zombiePixel.js';

// === Event Data Types ===

export interface LobbyJoinedData {
  instanceId: string;
  type: InstanceType;
  code?: string;
  isHost?: boolean;
  hasPassword?: boolean;
  players: User[];
  spectator: boolean;
  gameMode: string;
  // Mid-game state (for joining in-progress games)
  phase?: GamePhase;
  prompt?: Prompt;
  promptIndices?: PromptIndices;
  timerEndsAt?: number;
  votingRound?: number;
  votingTotalRounds?: number;
}

export interface PhaseChangedData {
  phase: GamePhase;
  prompt?: Prompt;
  promptIndices?: PromptIndices;
  duration?: number;
  startsAt?: number;
  endsAt?: number;
  message?: string;
  round?: number;
  totalRounds?: number;
}

export interface VotingRoundData {
  round: number;
  totalRounds: number;
  imageA: ImageData;
  imageB: ImageData;
  timeLimit: number;
  endsAt: number;
}

export interface FinaleStartData {
  finalists: FinalistEntry[];
  timeLimit: number;
  endsAt: number;
}

export interface GameResultsData {
  prompt?: Prompt;
  promptIndices?: PromptIndices;
  rankings: RankingEntry[];
  compressedRankings?: string;
  totalParticipants: number;
}

export interface SessionRestoredData {
  instanceId: string;
  user: User;
  phase: GamePhase;
  prompt?: Prompt;
  promptIndices?: PromptIndices;
  players: User[];
  isSpectator: boolean;
  phaseState?: PhaseStateFlat;
  gameMode: string;
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
  allowPrivate?: boolean;
}

export interface GameModesData {
  available: GameModeInfoData[];
  default: string;
}

export interface CopyCatReferenceData {
  referenceImage: string;
  duration: number;
  endsAt: number;
}

export interface CopyCatResultsEventData {
  referenceImage: string | null;
  results: CopyCatResultEntry[];
  winner: CopyCatResultEntry | null;
  isDraw: boolean;
  duration: number;
  endsAt: number;
}

// === Server to Client Events ===

export interface ServerToClientEvents {
  connected: (data: { socketId: string; serverTime: number; user: User; sessionId: string }) => void;
  error: (data: { code: string; message?: string; retryAfter?: number }) => void;
  'lobby-joined': (data: LobbyJoinedData) => void;
  'room-created': (data: { code: string; instanceId: string }) => void;
  'player-joined': (data: { user: User }) => void;
  'player-left': (data: { playerId: string; user?: User; kicked?: boolean }) => void;
  'player-updated': (data: { playerId: string; user: User }) => void;
  'name-changed': (data: { user: User }) => void;
  'left-lobby': () => void;
  'kicked': (data: { reason: string }) => void;
  'lobby-timer-started': (data: { duration: number; startsAt: number }) => void;
  'lobby-timer-cancelled': (data: Record<string, never>) => void;
  'phase-changed': (data: PhaseChangedData) => void;
  'submission-received': (data: { success: boolean; submissionCount: number }) => void;
  'submission-count': (data: { count: number; total: number }) => void;
  'voting-round': (data: VotingRoundData) => void;
  'vote-received': (data: { success: boolean; eloChange?: { winner: number; loser: number } }) => void;
  'finale-start': (data: FinaleStartData) => void;
  'finale-vote-received': (data: { success: boolean }) => void;
  'game-results': (data: GameResultsData) => void;
  'idle-warning': (data: { timeLeft: number }) => void;
  'idle-disconnect': (data: { reason: string }) => void;
  'session-restored': (data: SessionRestoredData) => void;
  'session-restore-failed': (data: { reason: string }) => void;
  'instance-closing': (data: { reason: string }) => void;
  'password-required': (data: { code: string }) => void;
  'password-changed': (data: { hasPassword: boolean }) => void;
  'queued': (data: { position: number; estimatedWait: number }) => void;
  'queue-update': (data: { position: number; estimatedWait: number }) => void;
  'queue-ready': (data: { message: string }) => void;
  'queue-removed': (data: { reason: 'timeout' | 'disconnect' | 'manual' }) => void;
  'server-status': (data: { status: 'ok' | 'warning' | 'critical'; currentPlayers: number; maxPlayers: number }) => void;
  'online-count': (data: { count: number; total?: number; byMode?: Record<string, number> }) => void;
  'game-modes': (data: GameModesData) => void;
  'player-disconnected': (data: { playerId: string; user: User; timestamp: number }) => void;
  'player-reconnected': (data: { playerId: string; user: User; timestamp: number }) => void;
  // CopyCat mode events
  'copycat-reference': (data: CopyCatReferenceData) => void;
  'copycat-results': (data: CopyCatResultsEventData) => void;
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
  'zombie-healed': (data: ZombieHealedData) => void;
  'zombie-item-spawned': (data: ZombieItemSpawnedData) => void;
  'zombie-item-collected': (data: { itemId: string; playerId: string; playerName: string; itemType: string; isZombie: boolean }) => void;
  'zombie-effect-started': (data: { effectId: string; type: string; affectedId: string; expiresAt: number | null; remainingUses: number | null; sharedEffect: boolean; icon: string; color: string }) => void;
  'zombie-effect-ended': (data: { effectId: string; type: string; affectedId: string }) => void;
  'zombie-game-end': (data: ZombieGameEndData) => void;
  'zombie-lobby-update': (data: ZombieLobbyUpdateData) => void;
  // CopyCat Royale mode events
  'royale-initial-drawing': (data: RoyaleInitialDrawingData) => void;
  'royale-show-reference': (data: RoyaleShowReferenceData) => void;
  'royale-drawing': (data: RoyaleDrawingData) => void;
  'royale-round-results': (data: RoyaleRoundResultsData) => void;
  'royale-player-eliminated': (data: RoyalePlayerEliminatedData) => void;
  'royale-finale': (data: RoyaleFinaleData) => void;
  'royale-winner': (data: RoyaleWinnerData) => void;
  'royale-you-eliminated': (data: RoyaleYouEliminatedData) => void;
}

// === Client to Server Events ===

export interface ClientToServerEvents {
  ping: (callback: (time: number) => void) => void;
  'activity-ping': () => void;
  'join-public': (data?: { gameMode?: string }) => void;
  'create-room': (data?: { password?: string; gameMode?: string }) => void;
  'join-room': (data: { code: string; password?: string }) => void;
  'leave-lobby': () => void;
  'host-start-game': () => void;
  'host-kick-player': (data: { playerId: string }) => void;
  'host-change-password': (data: { password: string | null }) => void;
  'submit-drawing': (data: { pixels: string }) => void;
  'vote': (data: { chosenId: string }) => void;
  'finale-vote': (data: { playerId: string }) => void;
  'change-name': (data: { name: string }) => void;
  'restore-session': (data: { sessionId: string }) => void;
  'restore-user': (data: { displayName: string }) => void;
  'leave-queue': () => void;
  'copycat-rematch-vote': (data: { wantsRematch: boolean }) => void;
  'view-mode': (data: { gameMode: string }) => void;
  'leave-mode': () => void;
  // PixelGuesser mode events
  'pixelguesser-draw': (data: { pixels: string }) => void;
  'pixelguesser-guess': (data: { guess: string }) => void;
  // ZombiePixel mode events
  'zombie-move': (data: { direction: 'up' | 'down' | 'left' | 'right' | 'up-left' | 'up-right' | 'down-left' | 'down-right' }) => void;
  // CopyCat Royale mode events
  'royale-submit': (data: { pixels: string }) => void;
}
