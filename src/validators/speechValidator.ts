import { z } from 'zod';
import { sttLanguageCodes, sttProviderNames } from '../providers/stt/index.js';
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

export const speechSttRequestSchema = z.object({
  body: z.object({
    language: z.enum(sttLanguageCodes).optional(),
    provider: z.enum(sttProviderNames).optional(),
  }),
});

export type SpeechTtsInput = z.infer<typeof speechTtsRequestSchema>['body'];
export type SpeechSttInput = z.infer<typeof speechSttRequestSchema>['body'];
