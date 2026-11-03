import { z } from 'zod';
import { levels } from '../types/content.js';

const answerSchema = z.object({
  itemId: z.string(),
  passed: z.boolean(),
  skipped: z.boolean().optional(),
});

export const placementQuerySchema = z.object({
  query: z.object({
    lang: z.string().optional(),
  }),
});

export const placementResultRequestSchema = z.object({
  body: z.object({
    answers: z.array(answerSchema).min(1).max(12),
    sample: z.string().max(1000).optional(),
  }),
});

export const placementLevelRequestSchema = z.object({
  body: z.object({
    level: z.enum(levels),
    source: z.enum(['beginner', 'manual']).default('manual'),
  }),
});

export type PlacementResultInput = z.infer<typeof placementResultRequestSchema>['body'];
export type PlacementLevelInput = z.infer<typeof placementLevelRequestSchema>['body'];
