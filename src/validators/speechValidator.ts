import { z } from 'zod';
import { ttsLanguages, ttsProviderNames } from '../providers/tts/index.js';

export const speechTtsRequestSchema = z.object({
  body: z.object({
    text: z.string().trim().min(1).max(2500),
    language: z.enum(ttsLanguages),
    provider: z.enum(ttsProviderNames).optional(),
    voice: z.string().trim().min(1).max(120).optional(),
    pace: z.number().min(0.5).max(2).optional(),
  }),
});

export type SpeechTtsInput = z.infer<typeof speechTtsRequestSchema>['body'];
