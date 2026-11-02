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

export type LessonListQuery = z.infer<typeof lessonListRequestSchema>['query'];
export type LessonDetailParams = z.infer<typeof lessonDetailRequestSchema>['params'] & {
  query?: z.infer<typeof lessonDetailRequestSchema>['query'];
};
