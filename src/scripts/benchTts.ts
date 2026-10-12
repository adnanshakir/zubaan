import mongoose from 'mongoose';
import { connectDB } from '../config/db.js';
import { env } from '../config/env.js';
import type { TtsProviderName } from '../providers/tts/index.js';
import { synthesizeSpeech } from '../services/speechService.js';

type BenchSample = {
  text: string;
};

type BenchRow = {
  provider: TtsProviderName;
  chars: number;
  totalMs: number;
  audioDurationMs: number | null;
  bytes: number;
  ok: boolean;
  error: string;
};

const BENCH_SAMPLES: BenchSample[] = [
  {
    text: 'Today I want to speak clearly and confidently. I will keep my sentences short, ask one question at a time, and listen carefully before I reply.',
  },
  {
    text: 'I am preparing for a customer support interview, so I am practicing polite greetings, clear explanations, and calm problem solving. Yesterday, I introduced myself, explained my previous work, and described how I handle difficult conversations. Today, I will practice the same answers with better pace, fewer pauses, and stronger transitions. I also want to sound natural when I ask follow-up questions, confirm details, and summarize the next step for the customer.',
  },
  {
    text: 'Good morning, thank you for calling support. My name is Riya, and I will help you today. Before we begin, could you please share your order number and the phone number linked to your account? I understand this delay has been frustrating, and I appreciate your patience while we check it together. First, I can see the shipment was dispatched on Friday, then routed through two transit hubs because of heavy rain in your area. The latest update says it has reached the final delivery station and should arrive by tomorrow evening. If it does not arrive by then, I will raise a high-priority ticket immediately and keep you updated by message. In the meantime, would you like me to send a temporary replacement request so you can continue using the service without interruption? I can also email a short summary of this call with the expected timeline, ticket number, and the actions we agreed on. Please let me know if you want the summary in English only or in both English and Hindi, and I will send it right away.',
  },
];

const REPEAT_COUNT = 2;
const PROVIDERS: TtsProviderName[] = ['kokoro', 'sarvam'];

function isProviderConfigured(provider: TtsProviderName): boolean {
  if (provider === 'kokoro') {
    return Boolean(env.KOKORO_TTS_URL);
  }

  return Boolean(env.SARVAM_API_KEY);
}

function getProviderOptions(
  provider: TtsProviderName,
): Pick<Parameters<typeof synthesizeSpeech>[0], 'voice' | 'pace'> {
  if (provider === 'sarvam') {
    return {
      voice: env.SARVAM_TTS_VOICE,
      pace: env.SARVAM_TTS_PACE,
    };
  }

  return {
    voice: undefined,
    pace: undefined,
  };
}

async function runBenchmarks(): Promise<void> {
  const configuredProviders = PROVIDERS.filter(isProviderConfigured);

  const totalCharsPerProvider = BENCH_SAMPLES.reduce((sum, sample) => sum + sample.text.length, 0);
  const totalChars = totalCharsPerProvider * REPEAT_COUNT * configuredProviders.length;

  console.warn(
    `[bench:tts] Warning: this run will synthesize ${totalChars} total characters. Sarvam billing is per character.`,
  );

  if (configuredProviders.length === 0) {
    console.log('[bench:tts] No configured providers. Nothing to run.');
    return;
  }

  for (const provider of PROVIDERS) {
    if (!isProviderConfigured(provider)) {
      console.log(`[bench:tts] Skipping ${provider}: provider is not configured.`);
    }
  }

  const rows: BenchRow[] = [];

  for (const provider of configuredProviders) {
    for (const sample of BENCH_SAMPLES) {
      for (let run = 0; run < REPEAT_COUNT; run += 1) {
        const startedAt = Date.now();

        try {
          const result = await synthesizeSpeech({
            provider,
            text: sample.text,
            language: 'en-IN',
            ...getProviderOptions(provider),
          });

          rows.push({
            provider,
            chars: sample.text.length,
            totalMs: result.totalMs,
            audioDurationMs: result.durationMs ?? null,
            bytes: result.audio.length,
            ok: true,
            error: '',
          });
        } catch (error) {
          const totalMs = Date.now() - startedAt;

          rows.push({
            provider,
            chars: sample.text.length,
            totalMs,
            audioDurationMs: null,
            bytes: 0,
            ok: false,
            error: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      }
    }
  }

  console.table(rows);
}

async function main(): Promise<void> {
  await connectDB();

  try {
    await runBenchmarks();
  } finally {
    await mongoose.disconnect();
  }
}

main().catch((error: unknown) => {
  console.error('[bench:tts] Failed', error);
  process.exitCode = 1;
});
