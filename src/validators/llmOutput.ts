import { z } from 'zod';

export const conversationLlmOutputSchema = z.object({
  reply: z.string().trim().min(1).max(600),
  endConversation: z.boolean(),
});

export type ConversationLlmOutput = z.infer<typeof conversationLlmOutputSchema>;
