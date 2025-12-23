// apps/server/src/prompts.ts
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { randomInt } from 'crypto';
import { randomItem } from './utils.js';
import type { Prompt, PromptIndices } from './types.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

interface PromptData {
  prefixes: string[];
  subjects: string[];
  suffixes: string[];
}

let promptData: PromptData | null = null;

/**
 * Lädt die Prompt-Daten aus der JSON-Datei
 */
function loadPromptData(): PromptData {
  if (promptData) return promptData;

  try {
    const filePath = join(__dirname, '..', 'data', 'prompts.json');
    const content = readFileSync(filePath, 'utf-8');
    const parsed = JSON.parse(content);

    // Validate structure
    if (
      !Array.isArray(parsed.prefixes) ||
      !Array.isArray(parsed.subjects) ||
      !Array.isArray(parsed.suffixes)
    ) {
      throw new Error('Invalid prompts.json structure');
    }

    promptData = parsed as PromptData;
    return promptData;
  } catch (error) {
    console.error('Failed to load prompts.json, using fallback:', error instanceof Error ? error.message : 'Unknown error');
    // Fallback-Daten
    promptData = {
      prefixes: ['happy', 'sad', 'angry', 'sleepy', 'tiny'],
      subjects: ['cat', 'dog', 'house', 'tree', 'pizza'],
      suffixes: ['in space', 'on fire', 'at night', 'underwater'],
    };
    return promptData;
  }
}

/**
 * Helper to get random index from array length
 */
function randomIndex(length: number): number {
  return randomInt(0, length);
}

/**
 * Generates random prompt indices for client-side localization
 */
export function generatePromptIndices(): PromptIndices {
  const data = loadPromptData();

  // Guard against empty arrays
  if (data.prefixes.length === 0 || data.subjects.length === 0 || data.suffixes.length === 0) {
    return { prefixIdx: 0, subjectIdx: 0, suffixIdx: 0 };
  }

  // 50% chance for prefix and suffix each (more variance)
  const hasPrefix = randomInt(0, 100) > 50;
  const hasSuffix = randomInt(0, 100) > 50;

  return {
    prefixIdx: hasPrefix ? randomIndex(data.prefixes.length) : null,
    subjectIdx: randomIndex(data.subjects.length),
    suffixIdx: hasSuffix ? randomIndex(data.suffixes.length) : null,
  };
}

/**
 * Converts prompt indices to assembled prompt text (for backwards compatibility)
 */
export function assemblePromptFromIndices(indices: PromptIndices): Prompt {
  const data = loadPromptData();

  // Guard against out of bounds indices
  const prefix = indices.prefixIdx !== null && indices.prefixIdx < data.prefixes.length
    ? data.prefixes[indices.prefixIdx]
    : '';
  const subject = indices.subjectIdx < data.subjects.length
    ? data.subjects[indices.subjectIdx]
    : 'thing';
  const suffix = indices.suffixIdx !== null && indices.suffixIdx < data.suffixes.length
    ? data.suffixes[indices.suffixIdx]
    : '';

  return { prefix, subject, suffix };
}

/**
 * Generiert einen zufälligen Prompt (uses new indices system internally)
 */
export function generatePrompt(): Prompt {
  const indices = generatePromptIndices();
  return assemblePromptFromIndices(indices);
}

/**
 * Gibt alle möglichen Kombinationen zurück (für Debugging)
 */
export function getPromptStats(): {
  prefixes: number;
  subjects: number;
  suffixes: number;
  totalCombinations: number;
} {
  const data = loadPromptData();
  return {
    prefixes: data.prefixes.length,
    subjects: data.subjects.length,
    suffixes: data.suffixes.length,
    totalCombinations: data.prefixes.length * data.subjects.length * data.suffixes.length,
  };
}
