// apps/server/src/types.ts
// Re-exports from @spritebox/types + server-specific types

// === Re-export all shared types ===
export type {
  // User types
  User,
  Player,
  GameModeStats,
  PlayerStats,
  // Prompt types
  Prompt,
  PromptIndices,
  PromptData,
  // Game types (except Instance which has server-specific fields)
  InstanceType,
  GamePhase,
  Submission,
  Vote,
  VotingAssignment,
  ImageData,
  FinalistEntry,
  RankingEntry,
  // Phase types
  PhaseTimer,
  VotingAssignmentData,
  FinalistData,
  PhaseState,
  // Socket types
  ServerToClientEvents,
  ClientToServerEvents,
  LobbyJoinedData,
  PhaseChangedData,
  VotingRoundData,
  FinaleStartData,
  GameResultsData,
  SessionRestoredData,
  GameModeInfoData,
  GameModesData,
  CopyCatReferenceData,
  CopyCatResultsEventData,
  // CopyCat mode types
  CopyCatState,
  CopyCatPlayerResult,
  CopyCatResultEntry,
  CopyCatResultsData,
  // PixelGuesser mode types
  PixelGuesserState,
  PixelGuesserGuess,
  PixelGuesserScoreEntry,
  PixelGuesserRoundStartData,
  PixelGuesserCorrectGuessData,
  PixelGuesserRevealData,
  PixelGuesserFinalResultsData,
  // CopyCat Royale mode types
  CopyCatRoyaleState,
  RoyalePoolImage,
  EliminationBracket,
  RoyalePlayerStatus,
  RoyalePlayerSubmission,
  RoyaleRoundResult,
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
  // ZombiePixel mode types
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
} from '@spritebox/types';

// === Server-specific Instance type ===
// Instance uses NodeJS.Timeout and Map which need to be defined here
import type {
  InstanceType as SharedInstanceType,
  GamePhase as SharedGamePhase,
  Player as SharedPlayer,
  Submission as SharedSubmission,
  Vote as SharedVote,
  Prompt as SharedPrompt,
  PromptIndices as SharedPromptIndices,
  CopyCatState as SharedCopyCatState,
  PixelGuesserState as SharedPixelGuesserState,
  CopyCatRoyaleState as SharedCopyCatRoyaleState,
} from '@spritebox/types';

/**
 * A game instance (room) - Server-specific version with NodeJS.Timeout
 */
export interface Instance {
  id: string;
  type: SharedInstanceType;
  gameMode: string;       // Game mode ID (e.g., 'pixel-battle')
  code?: string;          // Only for private rooms
  hostId?: string;        // Only for private rooms
  passwordHash?: string;  // Optional password for private rooms
  phase: SharedGamePhase;
  players: Map<string, SharedPlayer>;
  spectators: Map<string, SharedPlayer>;
  submissions: SharedSubmission[];
  votes: SharedVote[];
  prompt?: SharedPrompt;
  promptIndices?: SharedPromptIndices;  // For client-side localization
  createdAt: number;
  lastActivity: number;
  lobbyTimer?: NodeJS.Timeout;
  lobbyTimerEndsAt?: number;  // When the lobby timer ends (for late joiners)
  phaseTimer?: NodeJS.Timeout;
  // CopyCat mode fields
  copyCat?: SharedCopyCatState;
  // PixelGuesser mode fields
  pixelGuesser?: SharedPixelGuesserState;
  // ZombiePixel mode fields
  zombiePixel?: import('./gameModes/zombiePixel/types.js').ZombiePixelState;
  // CopyCat Royale mode fields
  copyCatRoyale?: SharedCopyCatRoyaleState;
}
