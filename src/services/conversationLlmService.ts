import { getLlmProvider } from '../providers/llm/index.js';
import { ApiError } from '../utils/ApiError.js';
import { logger } from '../utils/logger.js';
import {
  conversationLlmOutputSchema,
  type ConversationLlmOutput,
} from '../validators/llmOutput.js';

type ConversationLlmInput = {
  system: string;
  messages: { role: 'user' | 'assistant'; content: string }[];
};

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
