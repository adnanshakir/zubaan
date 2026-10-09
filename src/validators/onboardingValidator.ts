import { z } from 'zod';
import { goals, languages, levels } from '../types/content.js';

export const onboardingRequestSchema = z.object({
  body: z.object({
    nativeLanguage: z.enum(languages),
    goal: z.enum(goals),
    level: z.enum(levels),
    name: z.string().trim().max(50).optional(),
  }),
});

export type OnboardingInput = z.infer<typeof onboardingRequestSchema>['body'];
