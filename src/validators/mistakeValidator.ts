import { z } from 'zod';
import { MISTAKE_TYPES } from '../utils/text.js';
import { DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE } from '../services/mistakeService.js';

export const mistakeListRequestSchema = z.object({
  query: z.object({
    type: z.enum(MISTAKE_TYPES).optional(),
    limit: z.coerce.number().int().min(1).max(MAX_PAGE_SIZE).default(DEFAULT_PAGE_SIZE),
    before: z
      .string()
      .regex(/^[a-f\d]{24}$/i, 'Invalid before cursor')
      .optional(),
  }),
});

export type MistakeListQuery = z.infer<typeof mistakeListRequestSchema>['query'];
