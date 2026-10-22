/**
 * Shared text utilities and mistake type definitions.
 *
 * normalizeText strips STT artefacts (smart quotes, punctuation, casing)
 * so two strings can be compared ignoring surface differences that aren't
 * real mistakes.
 */

export const MISTAKE_TYPES = ['grammar', 'tense', 'preposition', 'word_choice', 'other'] as const;

export type MistakeType = (typeof MISTAKE_TYPES)[number];

export const normalizeText = (s: string): string =>
  s
    .replace(/['']/g, "'")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s']/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
