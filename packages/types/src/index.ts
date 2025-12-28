// packages/types/src/index.ts
// Main entry point for @spritebox/types

// === User types ===
export type { User, Player, GameModeStats, PlayerStats } from './user.js';

// === Prompt types ===
export type { Prompt, PromptIndices, PromptData } from './prompt.js';

// === Game types ===
export type {
  InstanceType,
  GamePhase,
  Instance,
  Submission,
  Vote,
  VotingAssignment,
  ImageData,
  FinalistEntry,
  RankingEntry,
} from './game.js';

// === Phase types ===
export type {
  PhaseTimer,
  VotingAssignmentData,
  FinalistData,
  PhaseState,
  PhaseStateFlat,
} from './phase.js';

// === Socket types ===
export type {
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
} from './socket.js';

// === Constants ===
export {
  MAX_PLAYERS_PER_INSTANCE,
  MIN_PLAYERS_TO_START,
  CANVAS,
  PALETTE,
} from './constants.js';
export type { PaletteIndex, HexColorIndex } from './constants.js';

// === Validation schemas ===
export {
  PixelSchema,
  RoomCodeSchema,
  UsernameSchema,
  VoteSchema,
  FinaleVoteSchema,
  StatsSchema,
  CopyCatRematchVoteSchema,
  PixelGuesserDrawSchema,
  PixelGuesserGuessSchema,
  ZombieMoveSchema,
  validateMinPixels,
  validate,
} from './validation.js';
export type {
  PixelInput,
  PixelOutput,
  RoomCodeInput,
  UsernameInput,
  VoteInput,
  ZombieMoveInput,
  ZombieMoveDirection,
} from './validation.js';

// === Mode-specific types ===
// CopyCat
export type {
  CopyCatState,
  CopyCatPlayerResult,
  CopyCatResultEntry,
  CopyCatResultsData,
} from './modes/copycat.js';

// PixelGuesser
export type {
  PixelGuesserState,
  PixelGuesserGuess,
  PixelGuesserScoreEntry,
  PixelGuesserRoundStartData,
  PixelGuesserCorrectGuessData,
  PixelGuesserRevealData,
  PixelGuesserFinalResultsData,
} from './modes/pixelGuesser.js';

// CopyCat Royale
export type {
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
} from './modes/copycatRoyale.js';

// ZombiePixel
export type {
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
} from './modes/zombiePixel.js';

// IdlePixel
export type {
  IdlePixel,
  GridSlot,
  ClickerState,
  IdlePixelStats,
  IdlePixelGameState,
  UpgradeCategory,
  UpgradeEffectType,
  UpgradeDefinition,
  PurchasedUpgrade,
  CalculatedUpgradeEffect,
  GridPosition,
  GridConfig,
  SlotPurchaseOption,
  PurchasedPrestigeUpgrade,
  PrestigeState,
  PrestigeUpgradeDefinition,
  IdlePixelSaveData,
  IdlePixelSchemaType,
  GridSlotSchemaType,
  ClickerStateSchemaType,
  IdlePixelStatsSchemaType,
  IdlePixelGameStateSchemaType,
  IdlePixelSaveDataSchemaType,
} from './modes/idle-pixel/index.js';

export {
  // Core
  IDLE_PIXEL_COLORS,
  MAX_COLOR_LEVEL,
  getProductionForLevel,
  // Upgrades
  calculateUpgradeCost,
  calculateUpgradeEffect,
  // Grid
  GridUtils,
  GRID_START_POSITIONS,
  GRID_SIZE,
  GRID_TOTAL_SLOTS,
  calculateSlotCost,
  // Prestige
  calculatePrestigeGain,
  currencyForPrisma,
  createInitialPrestigeState,
  // Storage
  IDLE_PIXEL_STORAGE_KEY,
  IDLE_PIXEL_SAVE_VERSION,
  MAX_OFFLINE_SECONDS,
  AUTO_SAVE_INTERVAL,
  OFFLINE_PRODUCTION_MULTIPLIER,
  // Balance
  BALANCE,
  // Validation Schemas
  IdlePixelSchema,
  GridSlotSchema,
  ClickerStateSchema,
  IdlePixelStatsSchema,
  PurchasedUpgradeSchema,
  PurchasedPrestigeUpgradeSchema,
  PrestigeStateSchema,
  IdlePixelGameStateSchema,
  IdlePixelSaveDataSchema,
} from './modes/idle-pixel/index.js';

export type { BalanceConfig } from './modes/idle-pixel/index.js';
