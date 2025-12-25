// apps/web/src/lib/survivor/index.ts
// Barrel exports for Pixel Survivor module
// Simplified: Only character creation system remains

// Types
export type {
  PixelSurvivorPhase,
  Element,
  Trait,
  CharacterStats,
  SurvivorCharacter,
  PixelSurvivorRun,
  PixelSurvivorStats,
  PixelSurvivorSettings,
} from './types.js';

export { DEFAULT_STATS, DEFAULT_SETTINGS } from './types.js';

// Storage
export {
  saveRun,
  loadRun,
  deleteRun,
  hasActiveRun,
  saveStats,
  loadStats,
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
  currentGameCharacter,
  survivorStats,
  survivorSettings,
  currentDrawing,
  survivorSelectedColor,
  showStatsScreen,
  showTutorial,
  // Engine stores
  statManager,
  currentHp,
  maxHp,
  currentMana,
  maxMana,
  currentShield,
  playerAttack,
  playerDefense,
  playerSpeed,
  playerLuck,
  playerLevel,
  playerXp,
  playerXpToNext,
  activeBuffs,
  activeDebuffs,
  currentElement,
  currentTrait,
  // Actions
  initializeSurvivor,
  resetToMenu,
  setPhase,
  updateRun,
  endRun,
  abandonRun,
  startNewRun,
  startNewRunFromPixels,
  previewCharacter,
  enterCharacterCreation,
  cancelCharacterCreation,
  enterGameplay,
  exitGameplay,
  // Combat/Resource actions
  heal,
  takeDamage,
  addXp,
  // Gameplay actions
  startCombat,
  onCombatVictory,
  onCombatDefeat,
  onCombatFled,
  proceedToNextRound,
  addGold,
} from './store.js';

// Analysis (Character Creation) - Now uses engine
export type { CharacterAnalysis, ElementDetectionResult, TraitDetectionResult } from './analysis.js';
export {
  analyzeCharacterPixels,
  detectElement,
  detectTrait,
  calculateBaseStats,
  CharacterFactory,
} from './analysis.js';

// Engine (Stats, Modifiers, Effects, Dice)
export * from './engine/index.js';

// Character Generator (Template-based random generation with high variance)
export {
  generateRandomCharacter,
  generateCharacterWithTemplate,
  generateCharacterByCategory,
  TEMPLATE_NAMES,
  TEMPLATE_CATEGORIES,
} from './character-generator.js';

// Name Generator (RPG-style random names)
export { generateRandomName, generateSimpleName, generateFullTitle } from './name-generator.js';
