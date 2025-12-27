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
  | 'results'
  // CopyCat mode phases
  | 'memorize'
  | 'copycat-result'
  | 'copycat-rematch'
  // PixelGuesser mode phases
  | 'guessing'
  | 'reveal'
  // PixelSurvivor mode phases (single-player roguelike)
  | 'survivor-menu'
  | 'survivor-character'
  | 'survivor-day-start'
  | 'survivor-event'
  | 'survivor-drawing'
  | 'survivor-result'
  | 'survivor-levelup'
  | 'survivor-gameover'
  | 'survivor-victory'
  // ZombiePixel mode phases (real-time infection)
  | 'active';

export interface Instance {
  id: string;
  type: InstanceType;
  gameMode: string;       // Game mode ID (e.g., 'pixel-battle')
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
  // CopyCat mode fields
  copyCat?: CopyCatState;
  // PixelGuesser mode fields
  pixelGuesser?: PixelGuesserState;
  // ZombiePixel mode fields
  zombiePixel?: import('./gameModes/zombiePixel/types.js').ZombiePixelState;
}

// === CopyCat Mode Types ===
export interface CopyCatState {
  referenceImage: string;   // 64-char hex string of the image to copy
  referenceImageId?: string; // Optional ID from gallery
  playerResults: Map<string, CopyCatPlayerResult>;
  drawStartTime?: number;   // When drawing phase started (for tie-breaking)
  rematchVotes: Map<string, boolean>;  // playerId -> wants rematch
}

export interface CopyCatPlayerResult {
  playerId: string;
  pixels: string;           // Player's drawing
  accuracy: number;         // 0-100 percentage
  matchingPixels: number;   // Count of matching pixels
  totalPixels: number;      // Total pixels (64)
  submitTime: number;       // Timestamp for tie-breaking
}

// === PixelGuesser Mode Types ===
export interface PixelGuesserState {
  currentRound: number;           // Current round (1-based)
  totalRounds: number;            // Total rounds (= number of players)
  artistOrder: string[];          // Player IDs in drawing order
  artistId: string;               // Current artist's player ID
  secretPrompt: string;           // The word to draw (English)
  secretPromptDe: string;         // The word to draw (German) - for multilingual matching
  secretPromptIndices?: PromptIndices; // For localization
  currentDrawing: string;         // Artist's current pixel data (streamed live)
  guesses: Map<string, PixelGuesserGuess[]>; // playerId -> their guesses
  correctGuessers: string[];      // Player IDs who guessed correctly (in order)
  scores: Map<string, number>;    // playerId -> total score
  roundStartTime: number;         // When drawing started (for time-based scoring)
  roundEnded: boolean;            // Whether round ended early (all guessed)
}

export interface PixelGuesserGuess {
  text: string;                   // The guess text
  timestamp: number;              // When guessed
  correct: boolean;               // Whether it was correct
}

export interface PixelGuesserScoreEntry {
  playerId: string;
  user: User;
  score: number;
  roundScore: number;             // Points earned this round
  wasArtist: boolean;
  guessedCorrectly: boolean;
  guessTime?: number;             // Time in ms to guess (if correct)
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

// === Persistent Stats (per game mode) ===
export interface GameModeStats {
  gamesPlayed: number;
  wins: number;           // 1st place
  top3: number;           // 1st, 2nd, or 3rd place
  currentWinStreak: number;
  bestWinStreak: number;
  // CopyCat specific
  bestAccuracy?: number;  // Best accuracy percentage (0-100)
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
    gameMode: string;
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
    phaseState?: PhaseState;
    gameMode: string;
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
  'online-count': (data: { count: number; total?: number; byMode?: Record<string, number> }) => void;
  'game-modes': (data: {
    available: Array<{
      id: string;
      displayName: string;
      i18nKey: string;
      players: { min: number; max: number; privateMin?: number };
    }>;
    default: string;
  }) => void;
  // CopyCat mode events
  'copycat-reference': (data: {
    referenceImage: string;
    duration: number;
    endsAt: number;
  }) => void;
  'copycat-results': (data: {
    referenceImage: string | null;
    results: CopyCatResultEntry[];
    winner: CopyCatResultEntry | null;
    isDraw: boolean;
    duration: number;
    endsAt: number;
  }) => void;
  'copycat-rematch-prompt': (data: {
    duration: number;
    endsAt: number;
  }) => void;
  'copycat-rematch-vote': (data: {
    playerId: string;
    wantsRematch: boolean;
  }) => void;
  'copycat-rematch-result': (data: {
    rematch: boolean;
    reason: 'both-yes' | 'declined' | 'timeout';
  }) => void;
  'lobby-timer-cancelled': (data: Record<string, never>) => void;
  'player-disconnected': (data: { playerId: string; user: User; timestamp: number }) => void;
  'player-reconnected': (data: { playerId: string; user: User; timestamp: number }) => void;
  // PixelGuesser mode events
  'pixelguesser-round-start': (data: {
    round: number;
    totalRounds: number;
    artistId: string;
    artistUser: User;
    isYouArtist: boolean;
    secretPrompt?: string;           // Only sent to artist
    secretPromptIndices?: PromptIndices; // Only sent to artist
    duration: number;
    endsAt: number;
  }) => void;
  'pixelguesser-drawing-update': (data: {
    pixels: string;                   // Current canvas state
  }) => void;
  'pixelguesser-guess-result': (data: {
    correct: boolean;
    guess: string;
    message?: string;                 // "Close!" hint
  }) => void;
  'pixelguesser-correct-guess': (data: {
    playerId: string;
    user: User;
    points: number;
    timeMs: number;                   // How fast they guessed
    position: number;                 // 1st, 2nd, 3rd...
    remainingGuessers: number;
  }) => void;
  'pixelguesser-reveal': (data: {
    secretPrompt: string;
    secretPromptIndices?: PromptIndices;
    artistId: string;
    artistUser: User;
    artistPixels: string;
    scores: PixelGuesserScoreEntry[];
    duration: number;
    endsAt: number;
  }) => void;
  'pixelguesser-final-results': (data: {
    rankings: PixelGuesserScoreEntry[];
    totalRounds: number;
    duration: number;
    endsAt: number;
  }) => void;
  // ZombiePixel mode events
  'zombie-game-state': (data: {
    players: Array<{
      id: string;
      name: string;
      x: number;
      y: number;
      isZombie: boolean;
      isBot: boolean;
      hasHealingItem: boolean;
    }>;
    timeRemaining: number;
    survivorCount: number;
    zombieCount: number;
    items: Array<{
      id: string;
      type: string;
      x: number;
      y: number;
      icon: string;
      color: string;
    }>;
    effects: Array<{
      id: string;
      type: string;
      affectedId: string;
      expiresAt: number | null;
      remainingUses: number | null;
    }>;
    zombieSpeedBoostActive: boolean;
    zombieSpeedBoostRemaining: number;
    playersWithHealingTouch: string[];
  }) => void;
  'zombie-roles-assigned': (data: {
    yourId: string;
    yourRole: 'zombie' | 'survivor';
    yourPosition: { x: number; y: number };
    zombieCount: number;
    survivorCount: number;
  }) => void;
  'zombie-infection': (data: {
    victimId: string;
    victimName: string;
    zombieId: string;
    zombieName: string;
    survivorsRemaining: number;
    timerExtendedBy?: number;
  }) => void;
  'zombie-healed': (data: {
    healedId: string;
    healedName: string;
    healerId: string;
    healerName: string;
  }) => void;
  'zombie-item-spawned': (data: {
    id: string;
    type: string;
    x: number;
    y: number;
    icon: string;
    color: string;
    visibility: 'zombies' | 'survivors' | 'all';
  }) => void;
  'zombie-item-collected': (data: {
    itemId: string;
    playerId: string;
    playerName: string;
    itemType: string;
    isZombie: boolean;
  }) => void;
  'zombie-effect-started': (data: {
    effectId: string;
    type: string;
    affectedId: string;
    expiresAt: number | null;
    remainingUses: number | null;
    sharedEffect: boolean;
    icon: string;
    color: string;
  }) => void;
  'zombie-effect-ended': (data: {
    effectId: string;
    type: string;
    affectedId: string;
  }) => void;
  'zombie-game-end': (data: {
    winner: { id: string; name: string; isBot: boolean } | null;
    zombiesWin: boolean;
    duration: number;
    stats: {
      totalInfections: number;
      gameDuration: number;
      firstInfectionTime: number | null;
      mostInfections: { playerId: string; name: string; count: number } | null;
      longestSurvivor: { playerId: string; name: string; survivalTime: number } | null;
    };
  }) => void;
  'zombie-lobby-update': (data: {
    realPlayers: number;
    botCount: number;
    totalPlayers: number;
  }) => void;
}

export interface ClientToServerEvents {
  ping: (callback: (time: number) => void) => void;
  'activity-ping': () => void;  // Lightweight ping to prevent idle timeout
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
  'zombie-move': (data: { direction: 'up' | 'down' | 'left' | 'right' }) => void;
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

// === Phase State Types ===
export interface VotingAssignmentData {
  imageA: { playerId: string; pixels: string };
  imageB: { playerId: string; pixels: string };
}

export interface FinalistData {
  playerId: string;
  pixels: string;
  elo: number;
}

export interface PhaseTimer {
  duration: number;
  endsAt: number;
}

export type PhaseState =
  | { phase: 'lobby' }
  | { phase: 'countdown' }
  | { phase: 'results' }
  | {
      phase: 'drawing';
      timer?: PhaseTimer;
      hasSubmitted: boolean;
      submissionCount: number;
    }
  | {
      phase: 'voting';
      timer?: PhaseTimer;
      currentRound: number;
      totalRounds: number;
      hasVoted: boolean;
      votingAssignment?: VotingAssignmentData;
    }
  | {
      phase: 'finale';
      timer?: PhaseTimer;
      finalists: FinalistData[];
      finaleVoted: boolean;
    }
  // CopyCat mode phases
  | {
      phase: 'memorize';
      timer?: PhaseTimer;
      referenceImage: string;
    }
  | {
      phase: 'copycat-result';
      referenceImage: string;
      playerResults: CopyCatResultEntry[];
      winner?: CopyCatResultEntry;
      isDraw: boolean;
    }
  | {
      phase: 'copycat-rematch';
      timer?: PhaseTimer;
      votes: { playerId: string; wantsRematch: boolean }[];
    }
  // PixelGuesser mode phases
  | {
      phase: 'guessing';
      timer?: PhaseTimer;
      round: number;
      totalRounds: number;
      artistId: string;
      isYouArtist: boolean;
      secretPrompt?: string;          // Only for artist
      currentDrawing: string;
      hasGuessedCorrectly: boolean;
      correctGuessers: { playerId: string; user: User; position: number }[];
    }
  | {
      phase: 'reveal';
      timer?: PhaseTimer;
      secretPrompt: string;
      artistPixels: string;
      scores: PixelGuesserScoreEntry[];
    };

export interface CopyCatResultEntry {
  playerId: string;
  user: User;
  pixels: string;
  accuracy: number;
  matchingPixels: number;
  submitTime: number;
}
