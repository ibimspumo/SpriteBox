// apps/web/src/lib/survivor/engine.ts
// Game engine for Pixel Survivor - handles events, drawing evaluation, state transitions

import { get } from 'svelte/store';
import {
  survivorRun,
  survivorStats,
  updateRun,
  setPhase,
  endRun,
} from './store.js';
import {
  type GameEvent,
  type EventSolution,
  type DrawableCategory,
  type UpgradeData,
  type Boss,
  loadEvents,
  loadDrawableObjects,
  loadUpgrades,
  loadMonsters,
  selectRandomEvent,
  selectRandomUpgrades,
  seededRandom,
} from './data.js';
import { analyzeDrawable, checkDrawableCondition, type DrawableAnalysis } from './drawable-analysis.js';
import type { PixelSurvivorRun, DrawingAnalysis as DrawingResult, CurrentEvent, StatusEffect } from './types.js';

// XP table for leveling
const XP_TABLE = [
  0, 50, 119, 200, 279, 367, 458, 553, 650, 790,
  894, 1000, 1109, 1279, 1452, 1575, 1700, 1900, 2066, 2236,
];

// === Event Management ===

// Guard to prevent multiple simultaneous startNewDay calls
let isStartingDay = false;

/**
 * Start a new day - select event and transition to day start
 */
export async function startNewDay(): Promise<void> {
  // Prevent multiple simultaneous calls (race condition from $effect)
  if (isStartingDay) return;
  isStartingDay = true;

  try {
    const run = get(survivorRun);
    if (!run) {
      isStartingDay = false;
      return;
    }

    // Check victory condition (Day 30)
    if (run.day > 30) {
      handleVictory();
      isStartingDay = false;
      return;
    }

    // Apply daily effects (status effects, food consumption)
    applyDailyEffects();

    // Check if run was ended by applyDailyEffects (death)
    const runAfterEffects = get(survivorRun);
    if (!runAfterEffects) {
      isStartingDay = false;
      return;
    }

    // Select event for this day
    const eventsData = await loadEvents();
    const event = selectRandomEvent(eventsData.events, runAfterEffects.day, runAfterEffects.eventHistory, runAfterEffects.seed);

    if (!event) {
      console.error('No event available for day', runAfterEffects.day);
      isStartingDay = false;
      return;
    }

    // Set current event
    const currentEvent: CurrentEvent = {
      eventId: event.id,
      outcome: 'pending',
    };

    updateRun((r) => ({
      ...r,
      currentEvent,
      phase: 'survivor-day-start',
    }));
  } finally {
    isStartingDay = false;
  }
}

/**
 * Apply daily effects (status effects, food, regeneration)
 */
function applyDailyEffects(): void {
  const run = get(survivorRun);
  if (!run) return;

  let damage = 0;
  let healing = 0;
  const foodCost = 10; // Base food cost per day

  // Process status effects
  const updatedEffects: StatusEffect[] = [];
  for (const effect of run.effects) {
    if (effect.damage) {
      damage += effect.damage;
    }

    // Decrease duration
    if (effect.duration > 1) {
      updatedEffects.push({ ...effect, duration: effect.duration - 1 });
    }
  }

  // Check for regeneration upgrade
  const regenCount = run.upgrades.filter((u) => u === 'U35').length;
  if (regenCount > 0) {
    healing += 5 * regenCount;
  }

  // Apply changes
  let newHp = Math.min(run.maxHp, Math.max(0, run.hp - damage + healing));
  const newFood = Math.max(0, run.food - foodCost);

  // Check for starvation damage
  if (newFood === 0) {
    newHp = Math.max(0, newHp - 10); // Starvation damage
  }

  updateRun((r) => ({
    ...r,
    hp: newHp,
    food: newFood,
    effects: updatedEffects,
  }));

  // Check for death
  if (newHp <= 0) {
    handleDeath();
  }
}

/**
 * Proceed from day start to event/drawing phase
 */
export function proceedToEvent(): void {
  setPhase('survivor-event');
}

/**
 * Submit drawing solution for current event
 */
export async function submitDrawingSolution(pixels: string): Promise<void> {
  const run = get(survivorRun);
  if (!run?.currentEvent) return;

  const eventsData = await loadEvents();
  const event = eventsData.events.find((e) => e.id === run.currentEvent?.eventId);
  if (!event) return;

  const drawableObjectsData = await loadDrawableObjects();

  // Analyze the drawing
  const analysis = evaluateDrawing(pixels, event, drawableObjectsData.categories);

  // Update current event with analysis
  updateRun((r) => ({
    ...r,
    currentEvent: {
      ...r.currentEvent!,
      drawnPixels: pixels,
      analysisResult: analysis,
    },
    phase: 'survivor-drawing',
  }));
}

/**
 * Resolve the event with the submitted drawing
 */
export async function resolveEvent(): Promise<{
  success: boolean;
  solution: EventSolution | null;
  bonusTexts: string[];
  totalEffectiveness: number;
}> {
  const run = get(survivorRun);
  if (!run?.currentEvent?.analysisResult) {
    return { success: false, solution: null, bonusTexts: [], totalEffectiveness: 0 };
  }

  const eventsData = await loadEvents();
  const event = eventsData.events.find((e) => e.id === run.currentEvent?.eventId);
  if (!event) {
    return { success: false, solution: null, bonusTexts: [], totalEffectiveness: 0 };
  }

  const analysis = run.currentEvent.analysisResult;
  const category = analysis.category;

  // Find matching solution
  const solution = event.solutions.find((s) => s.categories.includes(category));
  if (!solution) {
    // No matching solution - default failure
    return { success: false, solution: null, bonusTexts: [], totalEffectiveness: 0 };
  }

  // Calculate total effectiveness
  let totalEffectiveness = solution.effectiveness;
  const bonusTexts: string[] = [];

  // Apply drawing bonuses
  for (const bonus of analysis.bonuses) {
    bonusTexts.push(bonus);
  }

  // Apply upgrade bonuses
  const categoryBoostCount = countCategoryBoost(run.upgrades, category);
  if (categoryBoostCount > 0) {
    totalEffectiveness += categoryBoostCount * 15;
    bonusTexts.push(`+${categoryBoostCount * 15}% from upgrades`);
  }

  // Apply character stats
  const luckBonus = Math.floor(run.character.stats.luck / 10);
  totalEffectiveness += luckBonus;

  // Cap effectiveness
  totalEffectiveness = Math.min(100, totalEffectiveness);

  // Roll for success (using seeded random for deterministic results)
  const rollSeed = run.seed + run.day * 1000;
  const roll = seededRandom(rollSeed) * 100;
  const success = roll < totalEffectiveness;

  // Update event outcome
  updateRun((r) => ({
    ...r,
    currentEvent: {
      ...r.currentEvent!,
      outcome: success ? 'success' : 'failure',
    },
  }));

  return { success, solution, bonusTexts, totalEffectiveness };
}

/**
 * Apply event results (rewards or punishment)
 */
export async function applyEventResults(success: boolean): Promise<{
  xpGained: number;
  goldGained: number;
  foodGained: number;
  materialsGained: number;
  damageTaken: number;
  effectApplied: string | null;
  leveledUp: boolean;
  foodBonusReason: string | null;
}> {
  const run = get(survivorRun);
  if (!run?.currentEvent) {
    return {
      xpGained: 0,
      goldGained: 0,
      foodGained: 0,
      materialsGained: 0,
      damageTaken: 0,
      effectApplied: null,
      leveledUp: false,
      foodBonusReason: null,
    };
  }

  const eventsData = await loadEvents();
  const event = eventsData.events.find((e) => e.id === run.currentEvent?.eventId);
  if (!event) {
    return {
      xpGained: 0,
      goldGained: 0,
      foodGained: 0,
      materialsGained: 0,
      damageTaken: 0,
      effectApplied: null,
      leveledUp: false,
      foodBonusReason: null,
    };
  }

  let xpGained = 0;
  let goldGained = 0;
  let foodGained = 0;
  let materialsGained = 0;
  let damageTaken = 0;
  let effectApplied: string | null = null;
  let foodBonusReason: string | null = null;
  const newEffects: StatusEffect[] = [...run.effects];

  if (success) {
    // Apply rewards
    xpGained = event.rewards.xp;
    goldGained = event.rewards.gold ?? 0;
    foodGained = event.rewards.food ?? 0;
    materialsGained = event.rewards.materials ?? 0;

    // FOOD SYSTEM: Drawing food/fire gives bonus food (foraging/cooking)
    const drawnCategory = run.currentEvent?.analysisResult?.category;
    if (drawnCategory === 'food') {
      foodGained += 15; // Found/gathered food
      foodBonusReason = 'foraged'; // "Foraged food!"
    } else if (drawnCategory === 'fire') {
      foodGained += 10; // Cooked food
      foodBonusReason = 'cooked'; // "Cooked a meal!"
    }

    // Scavenger bonus
    const scavengerCount = run.upgrades.filter((u) => u === 'U29').length;
    if (scavengerCount > 0) {
      const bonus = 1 + scavengerCount * 0.25;
      goldGained = Math.floor(goldGained * bonus);
      foodGained = Math.floor(foodGained * bonus);
      materialsGained = Math.floor(materialsGained * bonus);
    }
  } else {
    // Apply punishment
    damageTaken = event.punishment.damage;

    // Thick Skin reduction
    const thickSkinCount = run.upgrades.filter((u) => u === 'U30').length;
    if (thickSkinCount > 0) {
      damageTaken = Math.max(0, damageTaken - 3 * thickSkinCount);
    }

    // Dodge chance
    const dodgeCount = run.upgrades.filter((u) => u === 'U36').length;
    if (dodgeCount > 0) {
      const dodgeChance = 0.15 * dodgeCount;
      // Use seeded random for deterministic dodge rolls
      const dodgeSeed = run.seed + run.day * 2000 + 1;
      if (seededRandom(dodgeSeed) < dodgeChance) {
        damageTaken = 0;
      }
    }

    // Apply effect
    if (event.punishment.effect) {
      effectApplied = event.punishment.effect;
      newEffects.push({
        id: event.punishment.effect,
        duration: 3,
        damage: event.punishment.effect === 'poison' ? 5 : 0,
      });
    }

    // Apply gold/food loss
    if (event.punishment.goldLoss) {
      goldGained = -Math.min(run.gold, event.punishment.goldLoss);
    }
    if (event.punishment.foodLoss) {
      foodGained = -Math.min(run.food, event.punishment.foodLoss);
    }
  }

  // Check for level up
  const newXp = run.xp + xpGained;
  let leveledUp = false;
  let newLevel = run.level;
  let newXpToNextLevel = run.xpToNextLevel;

  while (newLevel < 20 && newXp >= newXpToNextLevel) {
    newLevel++;
    newXpToNextLevel = XP_TABLE[newLevel] ?? Infinity;
    leveledUp = true;
  }

  // Calculate new HP with Second Wind
  let healFromSecondWind = 0;
  if (success) {
    const secondWindCount = run.upgrades.filter((u) => u === 'U28').length;
    if (secondWindCount > 0) {
      healFromSecondWind = Math.floor(run.maxHp * 0.2 * secondWindCount);
    }
  }

  let newHp = run.hp - damageTaken + healFromSecondWind;
  newHp = Math.min(run.maxHp, newHp);

  // Phoenix upgrade
  let newEventHistory = [...run.eventHistory];
  if (newHp <= 0 && run.upgrades.includes('U39')) {
    const phoenixUsed = run.eventHistory.includes('PHOENIX_USED');
    if (!phoenixUsed) {
      newHp = Math.floor(run.maxHp * 0.5);
      newEventHistory.push('PHOENIX_USED');
    }
  }

  // Record drawing
  const newDrawingHistory = [...run.drawingHistory];
  if (run.currentEvent.drawnPixels) {
    newDrawingHistory.push({
      day: run.day,
      eventId: run.currentEvent.eventId,
      pixels: run.currentEvent.drawnPixels,
      category: run.currentEvent.analysisResult?.category ?? 'unknown',
      success,
      timestamp: Date.now(),
    });
  }

  // Update run
  updateRun((r) => ({
    ...r,
    hp: Math.max(0, newHp),
    xp: newXp,
    level: newLevel,
    xpToNextLevel: newXpToNextLevel,
    gold: Math.max(0, r.gold + goldGained),
    food: Math.min(100, Math.max(0, r.food + foodGained)),
    materials: Math.min(50, Math.max(0, r.materials + materialsGained)),
    effects: newEffects,
    eventHistory: [...newEventHistory, r.currentEvent!.eventId],
    drawingHistory: newDrawingHistory,
    eventsCompleted: r.eventsCompleted + (success ? 1 : 0),
    phase: 'survivor-result' as const,
  }));

  // Update stats
  survivorStats.update((stats) => ({
    ...stats,
    totalDrawings: stats.totalDrawings + 1,
    totalEventsCompleted: stats.totalEventsCompleted + (success ? 1 : 0),
    totalDamageTaken: stats.totalDamageTaken + damageTaken,
    totalGoldEarned: stats.totalGoldEarned + Math.max(0, goldGained),
  }));

  // Check for death
  if (newHp <= 0) {
    handleDeath();
  }

  return {
    xpGained,
    goldGained,
    foodGained,
    materialsGained,
    damageTaken,
    effectApplied,
    leveledUp,
    foodBonusReason,
  };
}

/**
 * Proceed from result to next day or level up
 */
export function proceedFromResult(): void {
  const run = get(survivorRun);
  if (!run) return;

  // Check if dead
  if (run.hp <= 0) {
    setPhase('survivor-gameover');
    return;
  }

  // Check for level up
  if (run.phase === 'survivor-result') {
    const xpThreshold = XP_TABLE[run.level] ?? Infinity;
    if (run.xp >= xpThreshold && run.level < 20) {
      setPhase('survivor-levelup');
      return;
    }
  }

  // Advance to next day
  advanceDay();
}

/**
 * Advance to next day
 * Note: Food consumption happens in applyDailyEffects() which is called by startNewDay()
 */
export function advanceDay(): void {
  const run = get(survivorRun);
  if (!run) return;

  const newDay = run.day + 1;

  // Check for boss on day 30
  if (newDay === 30) {
    updateRun((r) => ({
      ...r,
      day: newDay,
      currentEvent: undefined,
      phase: 'survivor-boss' as const,
    }));
    return;
  }

  // Check for victory (survived past day 30)
  if (newDay > 30) {
    handleVictory();
    return;
  }

  updateRun((r) => ({
    ...r,
    day: newDay,
    currentEvent: undefined,
    phase: 'survivor-day-start' as const,
  }));

  // Start new day (which calls applyDailyEffects for food consumption)
  startNewDay();
}

// === Level Up ===

/**
 * Get upgrade choices for level up
 */
export async function getLevelUpChoices(): Promise<UpgradeData[]> {
  const run = get(survivorRun);
  if (!run) return [];

  const upgradesData = await loadUpgrades();
  return selectRandomUpgrades(upgradesData.upgrades, run.upgrades, 3, run.seed + run.level * 100);
}

/**
 * Select an upgrade at level up
 */
export function selectUpgrade(upgradeId: string): void {
  const run = get(survivorRun);
  if (!run) return;

  updateRun((r) => ({
    ...r,
    upgrades: [...r.upgrades, upgradeId],
  }));

  // Continue to next day
  advanceDay();
}

// === Drawing Evaluation ===

// Cache for drawable objects to avoid repeated loads
let cachedDrawableObjects: DrawableCategory[] | null = null;

/**
 * Get detected category for live preview during drawing.
 * Uses the same detection logic as the actual submission.
 */
export async function getDetectedCategoryForPreview(
  pixels: string
): Promise<string> {
  const analysis = analyzeDrawable(pixels);
  if (!analysis) return 'unknown';

  // Load and cache drawable objects
  if (!cachedDrawableObjects) {
    const data = await loadDrawableObjects();
    cachedDrawableObjects = data.categories;
  }

  const detectedCategory = detectDrawingCategory(analysis, cachedDrawableObjects);
  return detectedCategory.id;
}

/**
 * Synchronous version for reactive preview (uses cached data).
 * Returns null if cache not loaded yet.
 */
export function getDetectedCategorySync(pixels: string): string | null {
  if (!cachedDrawableObjects) return null;

  const analysis = analyzeDrawable(pixels);
  if (!analysis) return 'unknown';

  const detectedCategory = detectDrawingCategory(analysis, cachedDrawableObjects);
  return detectedCategory.id;
}

/**
 * Preload drawable objects cache for faster preview.
 */
export async function preloadDrawableObjects(): Promise<void> {
  if (!cachedDrawableObjects) {
    const data = await loadDrawableObjects();
    cachedDrawableObjects = data.categories;
  }
}

/**
 * Evaluate a drawing against event solutions.
 */
function evaluateDrawing(
  pixels: string,
  event: GameEvent,
  categories: DrawableCategory[]
): DrawingResult {
  const analysis = analyzeDrawable(pixels);

  if (!analysis) {
    return {
      category: 'unknown',
      effectiveness: 0,
      bonuses: [],
      pixelCount: 0,
    };
  }

  const detectedCategory = detectDrawingCategory(analysis, categories);
  const solution = event.solutions.find((s) => s.categories.includes(detectedCategory.id));

  if (!solution) {
    return {
      category: detectedCategory.id,
      effectiveness: 0,
      bonuses: [],
      pixelCount: analysis.pixelCount,
    };
  }

  let effectiveness = solution.effectiveness;
  const bonusTexts: string[] = [];

  if (solution.bonuses) {
    for (const bonus of solution.bonuses) {
      if (checkDrawableCondition(bonus.condition, analysis)) {
        effectiveness += bonus.bonus;
        bonusTexts.push(bonus.text);
      }
    }
  }

  return {
    category: detectedCategory.id,
    effectiveness: Math.min(100, effectiveness),
    bonuses: bonusTexts,
    pixelCount: analysis.pixelCount,
  };
}

/**
 * Detect what category a drawing belongs to.
 * Uses DrawableAnalysis which has field names matching drawable-objects.json exactly.
 */
function detectDrawingCategory(
  analysis: DrawableAnalysis | null,
  categories: DrawableCategory[]
): DrawableCategory {
  // Fallback to default category if no analysis
  if (!analysis) {
    return categories.find((c) => c.detection.default) ?? categories[0];
  }

  // Check each category in order (order matters!)
  for (const category of categories) {
    const d = category.detection;

    // Skip default category in main loop
    if (d.default) continue;

    let matches = true;

    // === Dimension Checks ===
    if (d.aspectRatioMin !== undefined && analysis.aspectRatio < d.aspectRatioMin) matches = false;
    if (d.aspectRatioMax !== undefined && analysis.aspectRatio > d.aspectRatioMax) matches = false;
    if (d.widthMin !== undefined && analysis.width < d.widthMin) matches = false;
    if (d.widthMax !== undefined && analysis.width > d.widthMax) matches = false;
    if (d.heightMin !== undefined && analysis.height < d.heightMin) matches = false;
    if (d.heightMax !== undefined && analysis.height > d.heightMax) matches = false;

    // === Density Checks ===
    if (d.densityMin !== undefined && analysis.density < d.densityMin) matches = false;
    if (d.densityMax !== undefined && analysis.density > d.densityMax) matches = false;

    // === Shape Property Checks ===
    if (d.isHollow !== undefined && d.isHollow !== analysis.isHollow) matches = false;
    if (d.isPointy !== undefined && d.isPointy !== analysis.isPointy) matches = false;
    if (d.isFlat !== undefined && d.isFlat !== analysis.isFlat) matches = false;

    // === Position Checks ===
    if (d.centerYMin !== undefined && analysis.centerY < d.centerYMin) matches = false;

    // === Color Checks (now using correct field names!) ===
    if (d.hasWarmColors === true && !analysis.hasWarmColors) matches = false;
    if (d.hasCoolColors === true && !analysis.hasCoolColors) matches = false;
    if (d.dominantColors && !d.dominantColors.includes(analysis.dominantColor)) matches = false;
    if (d.dominantColor && analysis.dominantColor !== d.dominantColor) matches = false;
    if (d.colorCountMin !== undefined && analysis.colorCount < d.colorCountMin) matches = false;

    if (matches) return category;
  }

  // Fallback to default category
  return categories.find((c) => c.detection.default) ?? categories[0];
}

/**
 * Count category boost upgrades
 */
function countCategoryBoost(upgrades: string[], category: string): number {
  const boostMap: Record<string, string[]> = {
    weapon: ['U16'],
    fire: ['U17', 'U21'],
    shelter: ['U18'],
    trap: ['U19'],
    boat: ['U20'],
    bridge: ['U20'],
  };

  const boostIds = boostMap[category] ?? [];
  let count = 0;

  for (const id of boostIds) {
    count += upgrades.filter((u) => u === id).length;
  }

  // Universal craft
  count += upgrades.filter((u) => u === 'U27').length;

  return count;
}

// === End Game ===

/**
 * Handle player death
 * Note: Only sets phase to gameover - endRun() is called when user acknowledges in GameOver component
 */
function handleDeath(): void {
  const run = get(survivorRun);
  if (!run) return;

  // Set phase to game over - the GameOver component will call endRun() when user clicks
  setPhase('survivor-gameover');
}

/**
 * Handle victory
 * Note: Only sets phase to victory - endRun() is called when user acknowledges in Victory component
 */
function handleVictory(): void {
  const run = get(survivorRun);
  if (!run) return;

  // Set phase to victory - the Victory component will call endRun() when user clicks
  setPhase('survivor-victory');
}

// === Boss Battle ===

/**
 * Get a random boss for day 30
 */
export async function getRandomBoss(): Promise<Boss | null> {
  const run = get(survivorRun);
  if (!run) return null;

  const monstersData = await loadMonsters();
  if (!monstersData.bosses || monstersData.bosses.length === 0) return null;

  // Select random boss based on seed
  const index = Math.abs(run.seed) % monstersData.bosses.length;
  return monstersData.bosses[index];
}

/**
 * Attack the boss with a drawn weapon
 */
export async function attackBoss(drawnPixels: string): Promise<{
  damage: number;
  bossAttack: number;
  bossDefeated: boolean;
  playerDied: boolean;
}> {
  const run = get(survivorRun);
  if (!run) return { damage: 0, bossAttack: 0, bossDefeated: false, playerDied: false };

  // Analyze the drawn weapon
  const analysis = analyzeDrawable(drawnPixels);

  let weaponPower = 20; // Base damage
  if (analysis) {
    // More pixels = more power
    weaponPower = 20 + Math.floor(analysis.pixelCount * 1.5);

    // Color bonuses
    if (analysis.hasWarmColors) weaponPower += 10; // Fire weapons
    if (analysis.hasCoolColors) weaponPower += 5; // Ice weapons
  }

  // Apply character attack stat
  const stats = run.character.stats;
  const totalDamage = Math.floor(weaponPower * (1 + stats.attack / 100));

  // Boss attacks back (simplified - uses base attack)
  const bossAttack = Math.max(10, 50 - Math.floor(stats.defense / 2));

  // Update HP
  const newHp = Math.max(0, run.hp - bossAttack);
  const currentBossHp = run.boss?.currentHp ?? 300;
  const bossHpRemaining = Math.max(0, currentBossHp - totalDamage);

  const bossDefeated = bossHpRemaining <= 0;
  const playerDied = newHp <= 0;

  updateRun((r) => ({
    ...r,
    hp: newHp,
    boss: r.boss ? { ...r.boss, currentHp: bossHpRemaining } : undefined,
  }));

  if (playerDied) {
    handleDeath();
  } else if (bossDefeated) {
    handleVictory();
  }

  return {
    damage: totalDamage,
    bossAttack,
    bossDefeated,
    playerDied,
  };
}

/**
 * Flee from boss (ends run as loss but preserves some progress)
 */
export function fleeBoss(): void {
  handleDeath();
}

/**
 * Initialize boss battle
 */
export async function initBossBattle(): Promise<void> {
  const boss = await getRandomBoss();
  if (!boss) {
    handleVictory(); // No boss = auto win
    return;
  }

  updateRun((r) => ({
    ...r,
    boss: {
      id: boss.id,
      currentHp: boss.baseHp,
      maxHp: boss.baseHp,
      phase: 1,
    },
  }));
}
