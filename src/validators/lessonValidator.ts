import { z } from 'zod';
import { lessonCategories, levels } from '../types/content.js';

export const lessonListRequestSchema = z.object({
  query: z.object({
    category: z.enum(lessonCategories).optional(),
    level: z.enum(levels).optional(),
    lang: z.string().trim().min(1).optional(),
  }),
});

export const lessonDetailRequestSchema = z.object({
  params: z.object({
    id: z.string().trim().min(1),
  }),
  query: z.object({
    lang: z.string().trim().min(1).optional(),
  }),
});

export const lessonProgressRequestSchema = z.object({
  params: z.object({
    lessonId: z.string().regex(/^[0-9a-fA-F]{24}$/),
  }),
  body: z.object({
    score: z.number().int().min(0).max(100),
    conversationId: z.string().regex(/^[0-9a-fA-F]{24}$/),
  }),
});

export type LessonListQuery = z.infer<typeof lessonListRequestSchema>['query'];
export type LessonDetailParams = z.infer<typeof lessonDetailRequestSchema>['params'] & {
  query?: z.infer<typeof lessonDetailRequestSchema>['query'];
};
export type LessonProgressParams = z.infer<typeof lessonProgressRequestSchema>['params'];
export type LessonProgressInput = z.infer<typeof lessonProgressRequestSchema>['body'];
