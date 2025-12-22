// apps/server/src/types.ts

// === Player ===
export interface User {
  displayName: string;
  discriminator: string;  // 4 digits: "0000" - "9999"
  fullName: string;       // "Name#0000"
}

export interface Player {
  id: string;
  sessionId: string;
  user: User;
  socketId: string;
  joinedAt: number;
  status: 'connected' | 'disconnected';
  disconnectedAt?: number;
}

// === Instanz ===
export type InstanceType = 'public' | 'private';
export type GamePhase =
  | 'lobby'
  | 'countdown'
  | 'drawing'
  | 'voting'
  | 'finale'
  | 'results';

export interface Instance {
  id: string;
  type: InstanceType;
  code?: string;          // Only for private rooms
  hostId?: string;        // Only for private rooms
  passwordHash?: string;  // Optional password for private rooms
  phase: GamePhase;
  players: Map<string, Player>;
  spectators: Map<string, Player>;
  submissions: Submission[];
  votes: Vote[];
  prompt?: Prompt;
  promptIndices?: PromptIndices;  // For client-side localization
  createdAt: number;
  lastActivity: number;
  lobbyTimer?: NodeJS.Timeout;
  lobbyTimerEndsAt?: number;  // When the lobby timer ends (for late joiners)
  phaseTimer?: NodeJS.Timeout;
}

// === Submission ===
export interface Submission {
  playerId: string;
  pixels: string;         // 64-character hex string
  timestamp: number;
}

// === Voting ===
export interface Vote {
  voterId: string;
  winnerId: string;
  loserId: string;
  round: number;
  timestamp: number;
}

export interface VotingAssignment {
  voterId: string;
  imageA: string;         // playerId
  imageB: string;         // playerId
  round: number;
}

// === Prompt ===
export interface Prompt {
  prefix: string;
  subject: string;
  suffix: string;
}

// === Prompt Indices (for localization) ===
export interface PromptIndices {
  prefixIdx: number | null;  // null if no prefix
  subjectIdx: number;
  suffixIdx: number | null;  // null if no suffix
}

// === Stats ===
export interface PlayerStats {
  gamesPlayed: number;
  placements: {
    1: number;
    2: number;
    3: number;
  };
}

// === Socket Events ===
export interface ServerToClientEvents {
  connected: (data: { socketId: string; serverTime: number; user: User; sessionId: string }) => void;
  error: (data: { code: string; message?: string; retryAfter?: number }) => void;
  'lobby-joined': (data: {
    instanceId: string;
    type: InstanceType;
    code?: string;
    isHost?: boolean;
    hasPassword?: boolean;
    players: User[];
    spectator: boolean;
    // Mid-game state (for joining in-progress games)
    phase?: GamePhase;
    prompt?: Prompt;
    promptIndices?: PromptIndices;
    timerEndsAt?: number;
    votingRound?: number;
    votingTotalRounds?: number;
  }) => void;
  'room-created': (data: { code: string; instanceId: string }) => void;
  'player-joined': (data: { user: User }) => void;
  'player-left': (data: { playerId: string; user?: User; kicked?: boolean }) => void;
  'player-updated': (data: { playerId: string; user: User }) => void;
  'name-changed': (data: { user: User }) => void;
  'left-lobby': () => void;
  'kicked': (data: { reason: string }) => void;
  'lobby-timer-started': (data: { duration: number; startsAt: number }) => void;
  'phase-changed': (data: {
    phase: GamePhase;
    prompt?: Prompt;
    promptIndices?: PromptIndices;
    duration?: number;
    startsAt?: number;
    endsAt?: number;
    message?: string;
    round?: number;
    totalRounds?: number;
  }) => void;
  'submission-received': (data: { success: boolean; submissionCount: number }) => void;
  'submission-count': (data: { count: number; total: number }) => void;
  'voting-round': (data: {
    round: number;
    totalRounds: number;
    imageA: ImageData;
    imageB: ImageData;
    timeLimit: number;
    endsAt: number;
  }) => void;
  'vote-received': (data: { success: boolean; eloChange?: { winner: number; loser: number } }) => void;
  'finale-start': (data: {
    finalists: FinalistEntry[];
    timeLimit: number;
    endsAt: number;
  }) => void;
  'finale-vote-received': (data: { success: boolean }) => void;
  'game-results': (data: { prompt?: Prompt; promptIndices?: PromptIndices; rankings: RankingEntry[]; compressedRankings?: string; totalParticipants: number }) => void;
  'idle-warning': (data: { timeLeft: number }) => void;
  'idle-disconnect': (data: { reason: string }) => void;
  'session-restored': (data: {
    instanceId: string;
    user: User;
    phase: GamePhase;
    prompt?: Prompt;
    promptIndices?: PromptIndices;
    players: User[];
    isSpectator: boolean;
    phaseState?: any;
  }) => void;
  'session-restore-failed': (data: { reason: string }) => void;
  'instance-closing': (data: { reason: string }) => void;
  'password-required': (data: { code: string }) => void;
  'password-changed': (data: { hasPassword: boolean }) => void;
  'queued': (data: { position: number; estimatedWait: number }) => void;
  'queue-update': (data: { position: number; estimatedWait: number }) => void;
  'queue-ready': (data: { message: string }) => void;
  'queue-removed': (data: { reason: 'timeout' | 'disconnect' | 'manual' }) => void;
  'server-status': (data: { status: 'ok' | 'warning' | 'critical'; currentPlayers: number; maxPlayers: number }) => void;
  'online-count': (data: { count: number }) => void;
}

export interface ClientToServerEvents {
  ping: (callback: (time: number) => void) => void;
  'join-public': () => void;
  'create-room': (data?: { password?: string }) => void;
  'join-room': (data: { code: string; password?: string }) => void;
  'leave-lobby': () => void;
  'host-start-game': () => void;
  'host-kick-player': (data: { playerId: string }) => void;
  'host-change-password': (data: { password: string | null }) => void;
  'submit-drawing': (data: { pixels: string }) => void;
  'vote': (data: { chosenId: string }) => void;
  'finale-vote': (data: { playerId: string }) => void;
  'sync-stats': (data: PlayerStats) => void;
  'change-name': (data: { name: string }) => void;
  'restore-session': (data: { sessionId: string }) => void;
  'restore-user': (data: { displayName: string; discriminator: string }) => void;
  'leave-queue': () => void;
}

// === Helper types ===
export interface ImageData {
  playerId: string;
  pixels: string;
}

export interface FinalistEntry {
  playerId: string;
  pixels: string;
  user: User;
  elo: number;
}

export interface RankingEntry {
  place: number;
  playerId: string;
  user: User;
  pixels: string;
  finalVotes: number;
  elo: number;
}
