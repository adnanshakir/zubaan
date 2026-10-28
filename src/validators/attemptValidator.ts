import { z } from 'zod';

const attemptId = z.object({ attemptId: z.string().trim().min(1) });

export const createAttemptRequestSchema = z.object({
  params: z.object({ lessonId: z.string().trim().min(1) }),
});

export const attemptResultRequestSchema = z.object({
  params: attemptId,
  body: z.object({
    exerciseId: z.string().trim().min(1),
    result: z.enum(['correct', 'wrong', 'said', 'close', 'missed', 'skipped']),
    answer: z.union([z.string(), z.array(z.string())]).optional(),
    retry: z.boolean().optional().default(false),
  }),
});

export const completeAttemptRequestSchema = z.object({
  params: attemptId,
  body: z.object({ bestStreak: z.number().int().min(0).max(200) }),
});

export const getAttemptRequestSchema = z.object({ params: attemptId });

export type CreateAttemptParams = z.infer<typeof createAttemptRequestSchema>['params'];
export type AttemptIdParams = z.infer<typeof attemptResultRequestSchema>['params'];
export type AttemptResultInput = z.infer<typeof attemptResultRequestSchema>['body'];
export type CompleteAttemptInput = z.infer<typeof completeAttemptRequestSchema>['body'];
