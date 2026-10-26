import { env } from '../../config/env.js';
import { mockLlmProvider } from './mock.js';
import { sarvamLlmProvider } from './sarvam.js';

export type LlmProviderInput = {
  system: string;
  messages: { role: 'user' | 'assistant'; content: string }[];
  scriptedReplies?: readonly string[];
};

export interface LlmProvider {
  generate(input: LlmProviderInput): Promise<string>;
}

export function getLlmProvider(): LlmProvider {
  switch (env.LLM_PROVIDER) {
    case 'mock':
      return mockLlmProvider;
    case 'sarvam':
      return sarvamLlmProvider;
  }
}
