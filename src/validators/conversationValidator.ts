import { z } from 'zod';

export const conversationStartRequestSchema = z.object({
  body: z.object({
    lessonId: z.string().trim().min(1),
    attemptId: z.string().trim().min(1).optional(),
  }),
});

export const conversationIdRequestSchema = z.object({
  params: z.object({
    id: z.string().trim().min(1),
  }),
});

export const conversationTurnRequestSchema = z.object({
  params: conversationIdRequestSchema.shape.params,
  body: z.object({
    text: z.string().trim().min(1).max(500),
  }),
});

export type ConversationStartInput = z.infer<typeof conversationStartRequestSchema>['body'];
export type ConversationTurnInput = z.infer<typeof conversationTurnRequestSchema>['body'];
export type ConversationIdParams = z.infer<typeof conversationIdRequestSchema>['params'];
