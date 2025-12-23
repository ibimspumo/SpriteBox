// apps/server/src/pixelGuesser.ts

/**
 * Pixel Guesser Game Logic
 *
 * Handles the Pixel Guesser (Pictionary-style) game mode:
 * - Artist rotation and round management
 * - Guess validation with fuzzy matching
 * - Time-based scoring system
 * - Live drawing updates
 */

import crypto from 'node:crypto';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import type {
  Instance,
  PixelGuesserState,
  PixelGuesserGuess,
  PixelGuesserScoreEntry,
  User,
  PromptIndices,
} from './types.js';
import { log } from './utils.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// ============================================================================
// SCORING CONSTANTS
// ============================================================================

/**
 * Points awarded based on guess time (in milliseconds)
 */
const SCORING = {
  // Time thresholds in ms
  FAST_THRESHOLD: 10_000, // Under 10s
  MEDIUM_THRESHOLD: 20_000, // Under 20s
  SLOW_THRESHOLD: 30_000, // Under 30s

  // Points for guessers
  FAST_POINTS: 100,
  MEDIUM_POINTS: 75,
  SLOW_POINTS: 50,
  LATE_POINTS: 25,

  // Artist bonus: percentage of total guesser points
  ARTIST_BONUS_PERCENT: 0.2,

  // Bonus for position (1st gets more than 2nd, etc.)
  POSITION_BONUS: [20, 10, 5, 0, 0, 0, 0, 0, 0, 0], // First 3 get bonus
} as const;

// ============================================================================
// PROMPT SYSTEM
// ============================================================================

interface PromptData {
  subjects: string[];
}

interface MultilingualPrompts {
  en: PromptData;
  de: PromptData;
}

let multilingualPrompts: MultilingualPrompts | null = null;

/**
 * Load prompts from both language JSON files
 */
function loadPrompts(): MultilingualPrompts {
  if (multilingualPrompts) {
    return multilingualPrompts;
  }

  const defaultSubjects = ['star', 'house', 'tree', 'sun', 'heart', 'cat', 'dog', 'fish'];
  const defaultSubjectsDe = ['Stern', 'Haus', 'Baum', 'Sonne', 'Herz', 'Katze', 'Hund', 'Fisch'];

  multilingualPrompts = {
    en: { subjects: defaultSubjects },
    de: { subjects: defaultSubjectsDe },
  };

  try {
    // Load English prompts
    const promptPathEn = join(__dirname, '../data/prompts.json');
    const dataEn = readFileSync(promptPathEn, 'utf-8');
    const parsedEn = JSON.parse(dataEn);
    multilingualPrompts.en = { subjects: parsedEn.subjects || defaultSubjects };
    log('PixelGuesser', `Loaded ${multilingualPrompts.en.subjects.length} EN subjects`);
  } catch (error) {
    log('PixelGuesser', `Failed to load EN prompts: ${error}`);
  }

  try {
    // Load German prompts
    const promptPathDe = join(__dirname, '../data/prompts_de.json');
    const dataDe = readFileSync(promptPathDe, 'utf-8');
    const parsedDe = JSON.parse(dataDe);
    multilingualPrompts.de = { subjects: parsedDe.subjects || defaultSubjectsDe };
    log('PixelGuesser', `Loaded ${multilingualPrompts.de.subjects.length} DE subjects`);
  } catch (error) {
    log('PixelGuesser', `Failed to load DE prompts: ${error}`);
  }

  return multilingualPrompts;
}

/**
 * Get a random prompt for drawing
 * Returns both English and German versions for matching
 */
export function getRandomPrompt(): {
  promptEn: string;
  promptDe: string;
  promptIndices: PromptIndices;
} {
  const data = loadPrompts();

  if (data.en.subjects.length === 0) {
    return {
      promptEn: 'star',
      promptDe: 'Stern',
      promptIndices: { prefixIdx: null, subjectIdx: 0, suffixIdx: null },
    };
  }

  const subjectIdx = crypto.randomInt(0, data.en.subjects.length);

  return {
    promptEn: data.en.subjects[subjectIdx],
    promptDe: data.de.subjects[subjectIdx] || data.en.subjects[subjectIdx],
    promptIndices: { prefixIdx: null, subjectIdx, suffixIdx: null },
  };
}

/**
 * Get both language versions of a prompt by index
 */
export function getPromptByIndex(subjectIdx: number): { en: string; de: string } {
  const data = loadPrompts();
  return {
    en: data.en.subjects[subjectIdx] || 'star',
    de: data.de.subjects[subjectIdx] || data.en.subjects[subjectIdx] || 'Stern',
  };
}

// ============================================================================
// STATE MANAGEMENT
// ============================================================================

/**
 * Initialize PixelGuesser state for an instance
 */
export function initializePixelGuesserState(instance: Instance): void {
  const playerIds = Array.from(instance.players.keys());

  // Shuffle player order using Fisher-Yates with crypto
  for (let i = playerIds.length - 1; i > 0; i--) {
    const j = crypto.randomInt(0, i + 1);
    [playerIds[i], playerIds[j]] = [playerIds[j], playerIds[i]];
  }

  const { promptEn, promptDe, promptIndices } = getRandomPrompt();

  instance.pixelGuesser = {
    currentRound: 1,
    totalRounds: playerIds.length,
    artistOrder: playerIds,
    artistId: playerIds[0],
    secretPrompt: promptEn,
    secretPromptDe: promptDe,
    secretPromptIndices: promptIndices,
    currentDrawing: '1'.repeat(64), // Empty white canvas
    guesses: new Map(),
    correctGuessers: [],
    scores: new Map(playerIds.map((id) => [id, 0])),
    roundStartTime: Date.now(),
    roundEnded: false,
  };

  log(
    'PixelGuesser',
    `Initialized: ${instance.id}, ${playerIds.length} players, first artist: ${playerIds[0]}`
  );
}

/**
 * Start a new round (or the first round)
 */
export function startNewRound(instance: Instance): void {
  const state = instance.pixelGuesser;
  if (!state) return;

  // Get next artist
  const artistId = state.artistOrder[state.currentRound - 1];

  // Get new prompt (both languages)
  const { promptEn, promptDe, promptIndices } = getRandomPrompt();

  // Reset round state
  state.artistId = artistId;
  state.secretPrompt = promptEn;
  state.secretPromptDe = promptDe;
  state.secretPromptIndices = promptIndices;
  state.currentDrawing = '1'.repeat(64);
  state.guesses = new Map();
  state.correctGuessers = [];
  state.roundStartTime = Date.now();
  state.roundEnded = false;

  log(
    'PixelGuesser',
    `Round ${state.currentRound}/${state.totalRounds}: Artist ${artistId}, Prompt: "${promptEn}" / "${promptDe}"`
  );
}

/**
 * Advance to the next round
 * Returns false if game is over
 */
export function advanceToNextRound(instance: Instance): boolean {
  const state = instance.pixelGuesser;
  if (!state) return false;

  state.currentRound++;

  if (state.currentRound > state.totalRounds) {
    log('PixelGuesser', `Game over for instance ${instance.id}`);
    return false;
  }

  startNewRound(instance);
  return true;
}

// ============================================================================
// DRAWING UPDATES
// ============================================================================

/**
 * Update the current drawing (called when artist draws)
 */
export function updateDrawing(instance: Instance, playerId: string, pixels: string): boolean {
  const state = instance.pixelGuesser;
  if (!state) return false;

  // Only artist can draw
  if (playerId !== state.artistId) {
    log('PixelGuesser', `Non-artist ${playerId} tried to draw`);
    return false;
  }

  // Validate pixel data
  if (!/^[0-9A-Fa-f]{1,64}$/.test(pixels)) {
    log('PixelGuesser', `Invalid pixel data from ${playerId}`);
    return false;
  }

  // Pad to 64 characters
  state.currentDrawing = pixels.toUpperCase().padEnd(64, '1');
  return true;
}

// ============================================================================
// GUESSING LOGIC
// ============================================================================

/**
 * Normalize text for comparison (lowercase, trim, remove special chars)
 */
function normalizeGuess(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9äöüß\s]/gi, '')
    .replace(/\s+/g, ' ');
}

/**
 * Check if a guess is correct
 */
function isCorrectGuess(guess: string, answer: string): boolean {
  const normalizedGuess = normalizeGuess(guess);
  const normalizedAnswer = normalizeGuess(answer);

  // Exact match
  if (normalizedGuess === normalizedAnswer) {
    return true;
  }

  // Check if guess contains the answer (for compound words)
  if (normalizedGuess.includes(normalizedAnswer)) {
    return true;
  }

  // Check if answer contains the guess (for partial matches like "sun" in "sunshine")
  if (normalizedAnswer.includes(normalizedGuess) && normalizedGuess.length >= 3) {
    return true;
  }

  return false;
}

/**
 * Check if a guess is close (for hints)
 */
function isCloseGuess(guess: string, answer: string): boolean {
  const normalizedGuess = normalizeGuess(guess);
  const normalizedAnswer = normalizeGuess(answer);

  // Same first letter and similar length
  if (
    normalizedGuess[0] === normalizedAnswer[0] &&
    Math.abs(normalizedGuess.length - normalizedAnswer.length) <= 2
  ) {
    return true;
  }

  // Contains 50%+ of answer characters
  const answerChars = new Set(normalizedAnswer.split(''));
  const matchingChars = normalizedGuess.split('').filter((c) => answerChars.has(c)).length;
  if (matchingChars >= normalizedAnswer.length * 0.5) {
    return true;
  }

  return false;
}

/**
 * Calculate points for a correct guess based on time
 */
function calculatePoints(timeMs: number, position: number): number {
  let basePoints: number;

  if (timeMs <= SCORING.FAST_THRESHOLD) {
    basePoints = SCORING.FAST_POINTS;
  } else if (timeMs <= SCORING.MEDIUM_THRESHOLD) {
    basePoints = SCORING.MEDIUM_POINTS;
  } else if (timeMs <= SCORING.SLOW_THRESHOLD) {
    basePoints = SCORING.SLOW_POINTS;
  } else {
    basePoints = SCORING.LATE_POINTS;
  }

  // Add position bonus
  const positionBonus = SCORING.POSITION_BONUS[position] || 0;

  return basePoints + positionBonus;
}

/**
 * Process a guess from a player
 */
export function processGuess(
  instance: Instance,
  playerId: string,
  guessText: string
): {
  success: boolean;
  correct: boolean;
  close: boolean;
  points: number;
  timeMs: number;
  position: number;
  alreadyGuessed: boolean;
} {
  const state = instance.pixelGuesser;
  if (!state) {
    return {
      success: false,
      correct: false,
      close: false,
      points: 0,
      timeMs: 0,
      position: 0,
      alreadyGuessed: false,
    };
  }

  // Artist can't guess
  if (playerId === state.artistId) {
    return {
      success: false,
      correct: false,
      close: false,
      points: 0,
      timeMs: 0,
      position: 0,
      alreadyGuessed: false,
    };
  }

  // Check if already guessed correctly
  if (state.correctGuessers.includes(playerId)) {
    return {
      success: false,
      correct: false,
      close: false,
      points: 0,
      timeMs: 0,
      position: 0,
      alreadyGuessed: true,
    };
  }

  const now = Date.now();
  const timeMs = now - state.roundStartTime;

  // Record the guess
  const guess: PixelGuesserGuess = {
    text: guessText,
    timestamp: now,
    correct: false,
  };

  if (!state.guesses.has(playerId)) {
    state.guesses.set(playerId, []);
  }
  state.guesses.get(playerId)!.push(guess);

  // Check if correct (against both English and German)
  const correctEn = isCorrectGuess(guessText, state.secretPrompt);
  const correctDe = isCorrectGuess(guessText, state.secretPromptDe);
  const correct = correctEn || correctDe;

  if (correct) {
    guess.correct = true;
    state.correctGuessers.push(playerId);

    const position = state.correctGuessers.length - 1;
    const points = calculatePoints(timeMs, position);

    // Update player's score
    const currentScore = state.scores.get(playerId) || 0;
    state.scores.set(playerId, currentScore + points);

    log(
      'PixelGuesser',
      `Player ${playerId} guessed correctly in ${timeMs}ms (position ${position + 1}): +${points} points`
    );

    return {
      success: true,
      correct: true,
      close: false,
      points,
      timeMs,
      position: position + 1,
      alreadyGuessed: false,
    };
  }

  // Check if close (against both languages)
  const close = isCloseGuess(guessText, state.secretPrompt) || isCloseGuess(guessText, state.secretPromptDe);

  return {
    success: true,
    correct: false,
    close,
    points: 0,
    timeMs,
    position: 0,
    alreadyGuessed: false,
  };
}

/**
 * Check if all possible guessers have guessed correctly
 */
export function allGuessersCorrect(instance: Instance): boolean {
  const state = instance.pixelGuesser;
  if (!state) return false;

  // Everyone except the artist should have guessed
  const guesserCount = instance.players.size - 1;
  return state.correctGuessers.length >= guesserCount;
}

/**
 * End the round and calculate artist bonus
 */
export function endRound(instance: Instance): void {
  const state = instance.pixelGuesser;
  if (!state || state.roundEnded) return;

  state.roundEnded = true;

  // Calculate total points earned by guessers this round
  let totalGuesserPoints = 0;
  for (const guesserId of state.correctGuessers) {
    const guesses = state.guesses.get(guesserId);
    if (!guesses) continue;

    const correctGuess = guesses.find((g) => g.correct);
    if (!correctGuess) continue;

    const timeMs = correctGuess.timestamp - state.roundStartTime;
    const position = state.correctGuessers.indexOf(guesserId);
    totalGuesserPoints += calculatePoints(timeMs, position);
  }

  // Award artist bonus
  const artistBonus = Math.round(totalGuesserPoints * SCORING.ARTIST_BONUS_PERCENT);
  if (artistBonus > 0) {
    const currentArtistScore = state.scores.get(state.artistId) || 0;
    state.scores.set(state.artistId, currentArtistScore + artistBonus);

    log('PixelGuesser', `Artist ${state.artistId} earned ${artistBonus} bonus points`);
  }
}

// ============================================================================
// RESULTS
// ============================================================================

/**
 * Get round scores for display
 */
export function getRoundScores(instance: Instance): PixelGuesserScoreEntry[] {
  const state = instance.pixelGuesser;
  if (!state) return [];

  const entries: PixelGuesserScoreEntry[] = [];

  for (const [playerId, totalScore] of state.scores) {
    const player = instance.players.get(playerId);
    if (!player) continue;

    const isArtist = playerId === state.artistId;
    const guessedCorrectly = state.correctGuessers.includes(playerId);

    // Calculate round score
    let roundScore = 0;
    if (guessedCorrectly) {
      const guesses = state.guesses.get(playerId);
      const correctGuess = guesses?.find((g) => g.correct);
      if (correctGuess) {
        const timeMs = correctGuess.timestamp - state.roundStartTime;
        const position = state.correctGuessers.indexOf(playerId);
        roundScore = calculatePoints(timeMs, position);
      }
    } else if (isArtist) {
      // Artist bonus (calculated in endRound)
      let totalGuesserPoints = 0;
      for (const guesserId of state.correctGuessers) {
        const guesses = state.guesses.get(guesserId);
        const correctGuess = guesses?.find((g) => g.correct);
        if (correctGuess) {
          const timeMs = correctGuess.timestamp - state.roundStartTime;
          const position = state.correctGuessers.indexOf(guesserId);
          totalGuesserPoints += calculatePoints(timeMs, position);
        }
      }
      roundScore = Math.round(totalGuesserPoints * SCORING.ARTIST_BONUS_PERCENT);
    }

    let guessTime: number | undefined;
    if (guessedCorrectly) {
      const guesses = state.guesses.get(playerId);
      const correctGuess = guesses?.find((g) => g.correct);
      if (correctGuess) {
        guessTime = correctGuess.timestamp - state.roundStartTime;
      }
    }

    entries.push({
      playerId,
      user: player.user,
      score: totalScore,
      roundScore,
      wasArtist: isArtist,
      guessedCorrectly,
      guessTime,
    });
  }

  // Sort by total score (highest first)
  entries.sort((a, b) => b.score - a.score);

  return entries;
}

/**
 * Get final rankings
 */
export function getFinalRankings(instance: Instance): PixelGuesserScoreEntry[] {
  return getRoundScores(instance);
}

/**
 * Get current game state info
 */
export function getGameState(instance: Instance): {
  currentRound: number;
  totalRounds: number;
  artistId: string;
  artistUser: User | undefined;
  secretPrompt: string;
  secretPromptIndices?: PromptIndices;
  correctGuessersCount: number;
  totalGuessers: number;
} | null {
  const state = instance.pixelGuesser;
  if (!state) return null;

  const artist = instance.players.get(state.artistId);

  return {
    currentRound: state.currentRound,
    totalRounds: state.totalRounds,
    artistId: state.artistId,
    artistUser: artist?.user,
    secretPrompt: state.secretPrompt,
    secretPromptIndices: state.secretPromptIndices,
    correctGuessersCount: state.correctGuessers.length,
    totalGuessers: instance.players.size - 1,
  };
}

/**
 * Get the current drawing for live updates
 */
export function getCurrentDrawing(instance: Instance): string | null {
  return instance.pixelGuesser?.currentDrawing ?? null;
}

/**
 * Clean up PixelGuesser state after game ends
 */
export function cleanupPixelGuesserState(instance: Instance): void {
  instance.pixelGuesser = undefined;
}

/**
 * Check if instance is in PixelGuesser mode
 */
export function isPixelGuesserMode(instance: Instance): boolean {
  return instance.gameMode === 'pixel-guesser';
}
