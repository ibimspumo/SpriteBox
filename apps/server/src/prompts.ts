// apps/server/src/prompts.ts
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { randomItem } from './utils.js';
import type { Prompt } from './types.js';

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
 * Generiert einen zufälligen Prompt
 */
export function generatePrompt(): Prompt {
  const data = loadPromptData();

  // Guard against empty arrays
  if (data.prefixes.length === 0 || data.subjects.length === 0 || data.suffixes.length === 0) {
    return { prefix: 'mysterious', subject: 'thing', suffix: 'in a place' };
  }

  const prefix = randomItem(data.prefixes);
  const subject = randomItem(data.subjects);
  const suffix = randomItem(data.suffixes);

  return { prefix, subject, suffix };
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
