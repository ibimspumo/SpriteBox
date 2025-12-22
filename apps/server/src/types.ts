// apps/server/src/types.ts

// === Spieler ===
export interface User {
  displayName: string;
  discriminator: string;  // 4-stellig: "0000" - "9999"
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
  code?: string;          // Nur für private Räume
  hostId?: string;        // Nur für private Räume
  phase: GamePhase;
  players: Map<string, Player>;
  spectators: Map<string, Player>;
  submissions: Submission[];
  votes: Vote[];
  prompt?: string;
  createdAt: number;
  lastActivity: number;
  lobbyTimer?: NodeJS.Timeout;
  phaseTimer?: NodeJS.Timeout;
}

// === Submission ===
export interface Submission {
  playerId: string;
  pixels: string;         // 64-Zeichen Hex-String
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
  connected: (data: { socketId: string; serverTime: number; user: User }) => void;
  error: (data: { code: string; message?: string }) => void;
  'lobby-joined': (data: {
    instanceId: string;
    type: InstanceType;
    code?: string;
    isHost?: boolean;
    players: User[];
    spectator: boolean;
  }) => void;
  'room-created': (data: { code: string; instanceId: string }) => void;
  'player-joined': (data: { user: User }) => void;
  'player-left': (data: { playerId: string; kicked?: boolean }) => void;
  'player-updated': (data: { playerId: string; user: User }) => void;
  'name-changed': (data: { user: User }) => void;
  'left-lobby': () => void;
  'kicked': (data: { reason: string }) => void;
  'lobby-timer-started': (data: { duration: number; startsAt: number }) => void;
  'phase-changed': (data: { phase: GamePhase; prompt?: string }) => void;
  'voting-round': (data: { round: number; imageA: ImageData; imageB: ImageData; timeLimit: number }) => void;
  'game-results': (data: { rankings: RankingEntry[]; totalParticipants: number }) => void;
}

export interface ClientToServerEvents {
  ping: (callback: (time: number) => void) => void;
  'join-public': () => void;
  'create-room': () => void;
  'join-room': (data: { code: string }) => void;
  'leave-lobby': () => void;
  'host-start-game': () => void;
  'host-kick-player': (data: { playerId: string }) => void;
  'submit-drawing': (data: { pixels: string }) => void;
  'vote': (data: { chosenId: string }) => void;
  'sync-stats': (data: PlayerStats) => void;
  'change-name': (data: { name: string }) => void;
}

// === Hilfstypes ===
export interface ImageData {
  playerId: string;
  pixels: string;
}

export interface RankingEntry {
  place: number;
  playerId: string;
  user: User;
  pixels: string;
  finalVotes: number;
  elo: number;
}
