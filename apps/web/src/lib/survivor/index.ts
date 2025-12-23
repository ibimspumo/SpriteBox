// apps/web/src/lib/survivor/index.ts
// Barrel exports for Pixel Survivor module

// Types
export type {
  PixelSurvivorPhase,
  Element,
  Trait,
  EventCategory,
  CharacterStats,
  SurvivorCharacter,
  StatusEffect,
  DrawingRecord,
  CurrentEvent,
  DrawingAnalysis,
  Upgrade,
  UpgradeEffect,
  BossState,
  PixelSurvivorRun,
  PixelSurvivorStats,
  HighscoreEntry,
  PixelSurvivorHighscores,
  PixelSurvivorSettings,
} from './types.js';

export { DEFAULT_STATS, DEFAULT_SETTINGS, DEFAULT_HIGHSCORES } from './types.js';

// Storage
export {
  saveRun,
  loadRun,
  deleteRun,
  hasActiveRun,
  saveStats,
  loadStats,
  saveHighscores,
  loadHighscores,
  saveSettings,
  loadSettings,
  clearAllData,
  getStorageUsage,
} from './storage.js';

// Stores
export {
  survivorRun,
  survivorPhase,
  hasActiveRun as hasActiveRunStore,
  isCreatingCharacter,
  effectiveStats,
  hpPercent,
  xpPercent,
  survivorStats,
  survivorSettings,
  currentDrawing,
  survivorSelectedColor,
  analysisResult,
  showStatsScreen,
  showTutorial,
  initializeSurvivor,
  resetToMenu,
  setPhase,
  updateRun,
  endRun,
  abandonRun,
  startNewRun,
  enterCharacterCreation,
  cancelCharacterCreation,
} from './store.js';

// Analysis (Character Creation)
export type { CharacterAnalysis, ShapeAnalysis, DrawingCategory } from './analysis.js';
export {
  analyzeCharacter,
  calculateCharacterStats,
  determineElement,
  determineTrait,
  analyzeShape,
} from './analysis.js';

// Drawable Analysis (Event Drawing Detection)
export type { DrawableAnalysis } from './drawable-analysis.js';
export { analyzeDrawable, checkDrawableCondition } from './drawable-analysis.js';

// Categories
export type { CategoryMeta } from './categories.js';
export {
  CATEGORY_META,
  getCategoryIcon,
  getCategoryColor,
  getSolutionCategories,
  getCategoryMeta,
  getAllCategories,
  getCategoriesByShape,
} from './categories.js';

// Hints
export type {
  SoftHint,
  CategoryMatchExplanation,
  CategoryCondition,
  CategoryRequirement,
  ProgressReport,
} from './hints.js';
export {
  CATEGORY_REQUIREMENTS,
  generateSoftHints,
  generateHintsForSolutions,
  getBestHint,
  explainCategoryMatch,
  getTopHints,
  getPrimaryNegativeHint,
  getPrimaryPositiveHint,
  meetsMinimumRequirements,
  getCategoryConditions,
  generateProgressReport,
} from './hints.js';

// Data
export type {
  GameEvent,
  EventSolution,
  Monster,
  Boss,
  UpgradeData,
  DrawableCategory,
  EventsData,
  MonstersData,
  UpgradesData,
} from './data.js';
export {
  loadEvents,
  loadMonsters,
  loadUpgrades,
  loadDrawableObjects,
  loadAllGameData,
  selectRandomEvent,
  selectRandomUpgrades,
  getLocalizedText,
} from './data.js';

// Engine
export {
  startNewDay,
  proceedToEvent,
  submitDrawingSolution,
  resolveEvent,
  applyEventResults,
  proceedFromResult,
  advanceDay,
  getLevelUpChoices,
  selectUpgrade,
  // Boss Battle
  getRandomBoss,
  attackBoss,
  fleeBoss,
  initBossBattle,
  // Live preview detection (uses same logic as submission)
  getDetectedCategoryForPreview,
  getDetectedCategorySync,
  preloadDrawableObjects,
} from './engine.js';
