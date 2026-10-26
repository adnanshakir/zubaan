import 'dotenv/config';
import { z } from 'zod';

const envSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'production']),
    PORT: z.coerce.number().int().min(1).max(65535),
    MONGODB_URI: z.string().trim().min(1),
    JWT_SECRET: z.string().min(1),
    LLM_PROVIDER: z.enum(['mock', 'sarvam']),
    TTS_PROVIDER: z.enum(['kokoro', 'sarvam']).default('kokoro'),
    STT_PROVIDER: z.enum(['sarvam']).default('sarvam'),
    SARVAM_STT_MODE: z.enum(['transcribe', 'verbatim', 'codemix', 'translit']).default('codemix'),
    SARVAM_API_KEY: z
      .string()
      .trim()
      .optional()
      .transform((v) => (v ? v : undefined)),
    SARVAM_LLM_MODEL: z.enum(['sarvam-105b', 'sarvam-105b-conversations']).optional(),
    SARVAM_TTS_VOICE: z
      .string()
      .trim()
      .optional()
      .transform((v) => (v ? v : undefined)),
    SARVAM_TTS_PACE: z
      .string()
      .trim()
      .optional()
      .transform((v) => (v ? Number(v) : undefined))
      .refine((v) => v === undefined || (Number.isFinite(v) && v >= 0.5 && v <= 2), {
        message: 'Must be a number between 0.5 and 2',
      }),
    SARVAM_TTS_TIMEOUT_MS: z.coerce.number().int().min(1000).default(30000),
    SARVAM_STT_TIMEOUT_MS: z.coerce.number().int().min(1000).default(15000),
    STT_MAX_FILE_SIZE_BYTES: z.coerce
      .number()
      .int()
      .min(1)
      .default(10 * 1024 * 1024),
    STT_MAX_DURATION_SECONDS: z.coerce.number().min(1).max(30).default(30),
    KOKORO_TTS_URL: z.string().trim().url().default('https://tts-system.vercel.app/api/tts'),
    KOKORO_TIMEOUT_MS: z.coerce.number().int().min(1000).default(90000),
  })
  .superRefine((value, ctx) => {
    if (value.LLM_PROVIDER === 'sarvam' && !value.SARVAM_API_KEY) {
      ctx.addIssue({
        code: 'custom',
        path: ['SARVAM_API_KEY'],
        message: 'Required when LLM_PROVIDER=sarvam',
      });
    }

    if (value.LLM_PROVIDER === 'sarvam' && !value.SARVAM_LLM_MODEL) {
      ctx.addIssue({
        code: 'custom',
        path: ['SARVAM_LLM_MODEL'],
        message: 'Required when LLM_PROVIDER=sarvam',
      });
    }

    if (value.TTS_PROVIDER === 'sarvam' && !value.SARVAM_API_KEY) {
      ctx.addIssue({
        code: 'custom',
        path: ['SARVAM_API_KEY'],
        message: 'Required when TTS_PROVIDER=sarvam',
      });
    }

    if (value.STT_PROVIDER === 'sarvam' && !value.SARVAM_API_KEY) {
      ctx.addIssue({
        code: 'custom',
        path: ['SARVAM_API_KEY'],
        message: 'Required when STT_PROVIDER=sarvam',
      });
    }
  });

const result = envSchema.safeParse(process.env);

if (!result.success) {
  const details = result.error.issues
    .map((issue) => `${issue.path.join('.') || 'environment'}: ${issue.message}`)
    .join('; ');

  throw new Error(`Invalid environment configuration: ${details}`);
}

export const env = result.data;

export function getSttDurationLimitMessage(): string {
  return `Sarvam STT REST supports up to ${env.STT_MAX_DURATION_SECONDS} seconds per request`;
}
