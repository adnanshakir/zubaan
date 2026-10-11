import 'dotenv/config';
import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']),
  PORT: z.coerce.number().int().min(1).max(65535),
  MONGODB_URI: z.string().trim().min(1),
  JWT_SECRET: z.string().min(1),
  LLM_PROVIDER: z.enum(['mock', 'sarvam']),
  SARVAM_API_KEY: z.string().trim().optional(),
  SARVAM_LLM_MODEL: z.enum(['sarvam-105b', 'sarvam-105b-conversations']).optional(),
});

const result = envSchema.safeParse(process.env);

if (!result.success) {
  const details = result.error.issues
    .map((issue) => `${issue.path.join('.') || 'environment'}: ${issue.message}`)
    .join('; ');

  throw new Error(`Invalid environment configuration: ${details}`);
}

export const env = result.data;
