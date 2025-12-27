// apps/web/src/lib/prompts.ts
import { getLanguage } from '$lib/i18n';
import promptsEn from '../../../server/data/prompts.json';
import promptsDe from '../../../server/data/prompts_de.json';

// Re-export types from @spritebox/types
export type { Prompt, PromptIndices, PromptData } from '@spritebox/types';

// Import types for internal use
import type { Prompt, PromptIndices, PromptData } from '@spritebox/types';

/**
 * Gets the appropriate prompt data based on current language
 */
function getPromptData(): PromptData {
  return getLanguage() === 'de' ? promptsDe : promptsEn;
}

/**
 * Converts prompt indices to localized text based on current language
 */
export function localizePrompt(indices: PromptIndices): Prompt {
  const data = getPromptData();

  // Handle out-of-bounds indices gracefully with fallbacks
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
 * Assembles a prompt into a single displayable string
 */
export function assemblePrompt(prompt: Prompt): string {
  const parts: string[] = [];

  if (prompt.prefix) {
    parts.push(prompt.prefix);
  }
  parts.push(prompt.subject);
  if (prompt.suffix) {
    parts.push(prompt.suffix);
  }

  return parts.join(' ');
}

/**
 * Converts prompt indices directly to a displayable string
 */
export function localizePromptString(indices: PromptIndices): string {
  return assemblePrompt(localizePrompt(indices));
}
