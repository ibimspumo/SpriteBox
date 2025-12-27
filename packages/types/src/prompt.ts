// packages/types/src/prompt.ts
// Prompt-related types for drawing prompts

/**
 * A drawing prompt with three optional parts
 */
export interface Prompt {
  prefix: string;
  subject: string;
  suffix: string;
}

/**
 * Indices into the prompt word lists for localization
 * Server sends these, client assembles localized text
 */
export interface PromptIndices {
  prefixIdx: number | null;  // null if no prefix
  subjectIdx: number;
  suffixIdx: number | null;  // null if no suffix
}

/**
 * Prompt data structure (from JSON files)
 */
export interface PromptData {
  prefixes: string[];
  subjects: string[];
  suffixes: string[];
}
