import { SpeechLog } from '../models/SpeechLog.js';
import {
  getTtsProvider,
  resolveTtsProviderName,
  type TtsLanguage,
  type TtsProviderName,
} from '../providers/tts/index.js';
import { ApiError } from '../utils/ApiError.js';
import { saveAudioToStorage } from '../utils/audioStorage.js';
import { logger } from '../utils/logger.js';

export type SynthesizeSpeechInput = {
  text: string;
  language: TtsLanguage;
  provider?: TtsProviderName;
  voice?: string;
  pace?: number;
};

export type SynthesizeSpeechResult = {
  audio: Buffer;
  format: 'wav' | 'mp3';
  durationMs?: number;
  provider: TtsProviderName;
  voice?: string;
  pace?: number;
  chars: number;
  totalMs: number;
};

export type SynthesizeSpeechStoredResult = {
  audioUrl: string;
  provider: TtsProviderName;
  voice?: string;
  pace?: number;
  chars: number;
  totalMs: number;
  durationMs?: number;
};

function toApiError(error: unknown): ApiError {
  if (error instanceof ApiError) {
    return error;
  }

  return new ApiError(502, 'TTS provider request failed');
}

function toShortErrorMessage(message: string): string {
  return message.length > 160 ? `${message.slice(0, 157)}...` : message;
}

async function writeSpeechLog(entry: {
  provider: TtsProviderName;
  voice?: string;
  pace?: number;
  language: TtsLanguage;
  chars: number;
  audioBytes: number;
  durationMs?: number;
  totalMs: number;
  ok: boolean;
  error?: string;
}): Promise<void> {
  try {
    await SpeechLog.create({
      kind: 'tts',
      provider: entry.provider,
      voice: entry.voice,
      pace: entry.pace,
      language: entry.language,
      chars: entry.chars,
      audioBytes: entry.audioBytes,
      durationMs: entry.durationMs,
      totalMs: entry.totalMs,
      ok: entry.ok,
      error: entry.error,
    });
  } catch {
    logger.warn(
      {
        provider: entry.provider,
        chars: entry.chars,
        totalMs: entry.totalMs,
        ok: entry.ok,
      },
      'Failed to persist speech log',
    );
  }
}

export async function synthesizeSpeech(
  input: SynthesizeSpeechInput,
): Promise<SynthesizeSpeechResult> {
  const providerName = resolveTtsProviderName(input.provider);
  const provider = getTtsProvider(providerName);
  const startedAt = Date.now();
  const chars = input.text.length;

  try {
    const output = await provider.synthesize({
      text: input.text,
      language: input.language,
      voice: input.voice,
      pace: input.pace,
    });

    const totalMs = Date.now() - startedAt;

    await writeSpeechLog({
      provider: providerName,
      voice: input.voice,
      pace: input.pace,
      language: input.language,
      chars,
      audioBytes: output.audio.length,
      durationMs: output.durationMs,
      totalMs,
      ok: true,
    });

    return {
      audio: output.audio,
      format: output.format,
      durationMs: output.durationMs,
      provider: providerName,
      voice: input.voice,
      pace: input.pace,
      chars,
      totalMs,
    };
  } catch (error) {
    const totalMs = Date.now() - startedAt;
    const apiError = toApiError(error);

    await writeSpeechLog({
      provider: providerName,
      voice: input.voice,
      pace: input.pace,
      language: input.language,
      chars,
      audioBytes: 0,
      totalMs,
      ok: false,
      error: toShortErrorMessage(apiError.message),
    });

    throw apiError;
  }
}

export async function synthesizeSpeechToStoredAudio(
  input: SynthesizeSpeechInput,
): Promise<SynthesizeSpeechStoredResult> {
  const result = await synthesizeSpeech(input);
  const audioUrl = await saveAudioToStorage(result.audio, result.format);

  return {
    audioUrl,
    provider: result.provider,
    voice: result.voice,
    pace: result.pace,
    chars: result.chars,
    totalMs: result.totalMs,
    durationMs: result.durationMs,
  };
}
