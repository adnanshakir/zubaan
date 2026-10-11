import type { LlmProvider } from './index.js';

export const mockLlmProvider: LlmProvider = {
  async generate(): Promise<string> {
    return JSON.stringify({
      reply: 'Nice! Can you tell me more?',
      endConversation: false,
    });
  },
};
