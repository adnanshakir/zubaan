import type { LlmProvider } from './index.js';
import type { MistakeType } from '../../utils/text.js';

interface MockRule {
  pattern: RegExp;
  replacement: string;
  explanation: string;
  type: MistakeType;
}

const MOCK_RULES: readonly MockRule[] = [
  {
    pattern: /\bgoed\b/i,
    replacement: 'went',
    explanation: 'Use "went" as the past tense of "go".',
    type: 'tense',
  },
  {
    pattern: /\bbuyed\b/i,
    replacement: 'bought',
    explanation: 'Use "bought" as the past tense of "buy".',
    type: 'tense',
  },
  {
    pattern: /\bhaved\b/i,
    replacement: 'had',
    explanation: 'Use "had" as the past tense of "have".',
    type: 'tense',
  },
  {
    pattern: /\b(he|she|it) don't\b/i,
    replacement: "$1 doesn't",
    explanation: 'Use "doesn\'t" after he, she and it.',
    type: 'grammar',
  },
  {
    pattern: /\b(he|she|it) go\b/i,
    replacement: '$1 goes',
    explanation: 'Add "-es" to the verb after he, she and it.',
    type: 'grammar',
  },
  {
    pattern: /\bi am agree\b/i,
    replacement: 'I agree',
    explanation: 'Say "I agree", without "am".',
    type: 'grammar',
  },
  {
    pattern: /\bi am knowing\b/i,
    replacement: 'I know',
    explanation: 'Use "know" without "-ing".',
    type: 'grammar',
  },
  {
    pattern: /\bmore better\b/i,
    replacement: 'better',
    explanation: '"Better" already means "more good".',
    type: 'word_choice',
  },
  {
    pattern: /\bdiscuss about\b/i,
    replacement: 'discuss',
    explanation: '"Discuss" does not need "about".',
    type: 'preposition',
  },
  {
    pattern: /\bi have (\d+) years old\b/i,
    replacement: 'I am $1 years old',
    explanation: 'Use "I am" to say your age.',
    type: 'grammar',
  },
];

const MOCK_REPLIES = [
  'Nice! Can you tell me more?',
  'That sounds good. What happened next?',
  'I see. Why do you think so?',
  'Great. Can you give me an example?',
  'Interesting! How do you feel about it?',
];

export const mockLlmProvider: LlmProvider = {
  async generate(input): Promise<string> {
    const lastUserMessage =
      [...input.messages].reverse().find((m) => m.role === 'user')?.content ?? '';
    const rule = MOCK_RULES.find((candidate) => candidate.pattern.test(lastUserMessage));
    const corrected = rule ? lastUserMessage.replace(rule.pattern, rule.replacement) : '';
    return JSON.stringify({
      reply: MOCK_REPLIES[lastUserMessage.length % MOCK_REPLIES.length],
      endConversation: false,
      hasMistake: Boolean(rule) && corrected !== lastUserMessage,
      corrected: rule && corrected !== lastUserMessage ? corrected : '',
      explanation: rule && corrected !== lastUserMessage ? rule.explanation : '',
      mistakeType: rule && corrected !== lastUserMessage ? rule.type : 'other',
    });
  },
};
