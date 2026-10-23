import { z } from 'zod';
import { MISTAKE_TYPES } from '../utils/text.js';

export const conversationLlmOutputSchema = z.object({
  reply: z.string().trim().min(1).max(600),
  endConversation: z.boolean(),
  hasMistake: z.boolean(),
  corrected: z.string().trim().max(500),
  explanation: z.string().trim().max(160),
  mistakeType: z.enum(MISTAKE_TYPES),
});

export type ConversationLlmOutput = z.infer<typeof conversationLlmOutputSchema>;
