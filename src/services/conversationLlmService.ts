import { getLlmProvider } from '../providers/llm/index.js';
import { ApiError } from '../utils/ApiError.js';
import { logger } from '../utils/logger.js';
import { normalizeText, type MistakeType } from '../utils/text.js';
import {
  conversationLlmOutputSchema,
  type ConversationLlmOutput,
} from '../validators/llmOutput.js';

type ConversationLlmInput = {
  system: string;
  messages: { role: 'user' | 'assistant'; content: string }[];
};

export interface Correction {
  corrected: string;
  explanation: string;
  type: MistakeType;
}

// A correction must be a rewrite of THIS message. Small models sometimes
// re-emit the correction for an earlier turn; that shares no words with the
// current message, so it is dropped.
const MIN_WORD_OVERLAP = 0.3;

function wordOverlap(original: string, corrected: string): number {
  const originalWords = new Set(normalizeText(original).split(' ').filter(Boolean));
  if (originalWords.size === 0) return 0;
  const correctedWords = new Set(normalizeText(corrected).split(' ').filter(Boolean));
  let shared = 0;
  for (const word of originalWords) {
    if (correctedWords.has(word)) shared += 1;
  }
  return shared / originalWords.size;
}

function stripMarkdownFences(response: string): string {
  return response
    .trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/, '')
    .trim();
}

function parseLlmOutput(response: string): ConversationLlmOutput {
  const parsed: unknown = JSON.parse(stripMarkdownFences(response));
  const result = conversationLlmOutputSchema.safeParse(parsed);

  if (!result.success) {
    throw new Error('LLM output did not match the conversation response schema');
  }

  return result.data;
}

/**
 * Extract a Correction from the LLM output, or null when there is no
 * real mistake. Guards against LLMs that flag a mistake but return the
 * original text unchanged (or differ only by case/punctuation).
 */
export function toCorrection(
  o: {
    hasMistake: boolean;
    corrected: string;
    explanation: string;
    mistakeType: MistakeType;
  },
  original: string,
): Correction | null {
  const corrected = o.corrected.trim();
  if (!o.hasMistake || !corrected) return null;

  // Guard: LLMs sometimes flag a mistake but return the input unchanged,
  // or differ only by case/punctuation (STT artifacts, not errors).
  if (normalizeText(corrected) === normalizeText(original)) return null;
  if (wordOverlap(original, corrected) < MIN_WORD_OVERLAP) return null;

  return {
    corrected,
    explanation: o.explanation.trim(),
    type: o.mistakeType,
  };
}

export async function generateConversationResponse(
  input: ConversationLlmInput,
): Promise<ConversationLlmOutput> {
  const provider = getLlmProvider();

  for (let attempt = 1; attempt <= 2; attempt += 1) {
    let response: string | undefined;

    try {
      response = await provider.generate(input);
      return parseLlmOutput(response);
    } catch {
      logger.warn(
        {
          attempt,
          responseLength: response?.length ?? 0,
        },
        'Invalid LLM response',
      );
    }
  }

  throw new ApiError(502, 'AI response was invalid');
}
