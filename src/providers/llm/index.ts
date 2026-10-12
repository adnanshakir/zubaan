import { env } from '../../config/env.js';
import { mockLlmProvider } from './mock.js';
import { sarvamLlmProvider } from './sarvam.js';

export interface LlmProvider {
  generate(input: {
    system: string;
    messages: { role: 'user' | 'assistant'; content: string }[];
  }): Promise<string>;
}

export function getLlmProvider(): LlmProvider {
  switch (env.LLM_PROVIDER) {
    case 'mock':
      return mockLlmProvider;
    case 'sarvam':
      return sarvamLlmProvider;
  }
}
