import type { LlmProvider } from './index.js';

const GOED_PATTERN = /\bgoed\b/gi;

export const mockLlmProvider: LlmProvider = {
  async generate(input): Promise<string> {
    const lastUserMessage =
      [...input.messages].reverse().find((m) => m.role === 'user')?.content ?? '';

    const hasGoed = GOED_PATTERN.test(lastUserMessage);
    // Reset the regex lastIndex since it's global
    GOED_PATTERN.lastIndex = 0;

    return JSON.stringify({
      reply: 'Nice! Can you tell me more?',
      endConversation: false,
      hasMistake: hasGoed,
      corrected: hasGoed ? lastUserMessage.replace(GOED_PATTERN, 'went') : '',
      explanation: hasGoed ? 'Use "went" as the past tense of "go".' : '',
      mistakeType: hasGoed ? 'tense' : 'other',
    });
  },
};
