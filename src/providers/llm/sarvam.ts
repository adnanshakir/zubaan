import { z } from 'zod';
import { env } from '../../config/env.js';
import type { LlmProvider } from './index.js';

const SARVAM_CHAT_COMPLETIONS_URL = 'https://api.sarvam.ai/v1/chat/completions';

const sarvamChatCompletionSchema = z.object({
  choices: z
    .array(
      z.object({
        message: z.object({
          content: z.string().nullable(),
        }),
      }),
    )
    .min(1),
});

const conversationResponseJsonSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    reply: {
      type: 'string',
      minLength: 1,
      maxLength: 600,
    },
    endConversation: {
      type: 'boolean',
    },
  },
  required: ['reply', 'endConversation'],
};

function getSarvamConfiguration(): { apiKey: string; model: string } {
  if (!env.SARVAM_API_KEY) {
    throw new Error('SARVAM_API_KEY is required for the Sarvam LLM provider');
  }

  if (!env.SARVAM_LLM_MODEL) {
    throw new Error('SARVAM_LLM_MODEL is required for the Sarvam LLM provider');
  }

  return {
    apiKey: env.SARVAM_API_KEY,
    model: env.SARVAM_LLM_MODEL,
  };
}

export const sarvamLlmProvider: LlmProvider = {
  async generate(input): Promise<string> {
    const { apiKey, model } = getSarvamConfiguration();
    const response = await fetch(SARVAM_CHAT_COMPLETIONS_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api-subscription-key': apiKey,
      },
      body: JSON.stringify({
        model,
        messages: [
          {
            role: 'system',
            content: input.system,
          },
          ...input.messages,
        ],
        temperature: 0.2,
        stream: false,
        response_format: {
          type: 'json_schema',
          json_schema: {
            name: 'conversation_response',
            description: 'A response for an English-speaking roleplay conversation.',
            strict: true,
            schema: conversationResponseJsonSchema,
          },
        },
      }),
    });

    if (!response.ok) {
      throw new Error(`Sarvam LLM request failed with status ${response.status}`);
    }

    const result = sarvamChatCompletionSchema.safeParse(await response.json());

    if (!result.success) {
      throw new Error('Sarvam returned an invalid chat completion response');
    }

    const content = result.data.choices[0]?.message.content;

    if (!content) {
      throw new Error('Sarvam returned an empty chat completion response');
    }

    return content;
  },
};
