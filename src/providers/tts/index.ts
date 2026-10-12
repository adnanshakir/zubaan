import { env } from '../../config/env.js';
import { kokoroTtsProvider } from './kokoro.js';
import { sarvamTtsProvider } from './sarvam.js';

export const ttsLanguages = ['en-IN', 'hi-IN', 'ta-IN', 'te-IN'] as const;
export const ttsProviderNames = ['kokoro', 'sarvam'] as const;

export type TtsLanguage = (typeof ttsLanguages)[number];
export type TtsProviderName = (typeof ttsProviderNames)[number];

export type TtsSynthesizeInput = {
  text: string;
  language: TtsLanguage;
  voice?: string;
  pace?: number;
};

export type TtsSynthesizeResult = {
  audio: Buffer;
  format: 'wav' | 'mp3';
  durationMs?: number;
};

export interface TtsProvider {
  synthesize(input: TtsSynthesizeInput): Promise<TtsSynthesizeResult>;
}

export function resolveTtsProviderName(name?: TtsProviderName): TtsProviderName {
  return name ?? env.TTS_PROVIDER;
}

export function getTtsProvider(name?: TtsProviderName): TtsProvider {
  switch (resolveTtsProviderName(name)) {
    case 'kokoro':
      return kokoroTtsProvider;
    case 'sarvam':
      return sarvamTtsProvider;
  }
}
