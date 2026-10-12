import { parseBuffer } from 'music-metadata';
import { env } from '../config/env.js';
import { SpeechLog } from '../models/SpeechLog.js';
import {
  getSttProvider,
  resolveSttProviderName,
  sarvamRestSttMimeTypes,
  type SttLanguageCode,
  type SttProviderName,
} from '../providers/stt/index.js';
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

export type TranscribeSpeechInput = {
  audio: Buffer;
  mimeType: string;
  languageCode?: SttLanguageCode;
  provider?: SttProviderName;
};

export type TranscribeSpeechResult = {
  text: string;
  languageCode: string | null;
  provider: SttProviderName;
  totalMs: number;
  durationSeconds: number;
};

function toTtsApiError(error: unknown): ApiError {
  if (error instanceof ApiError) {
    return error;
  }

  return new ApiError(502, 'TTS provider request failed');
}

function toSttApiError(error: unknown): ApiError {
  if (error instanceof ApiError) {
    return error;
  }

  return new ApiError(502, 'STT provider request failed');
}

function toShortErrorMessage(message: string): string {
  return message.length > 160 ? `${message.slice(0, 157)}...` : message;
}

async function writeTtsSpeechLog(entry: {
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
        kind: 'tts',
        provider: entry.provider,
        totalMs: entry.totalMs,
        ok: entry.ok,
      },
      'Failed to persist speech log',
    );
  }
}

async function writeSttSpeechLog(entry: {
  provider: SttProviderName;
  languageCode: string;
  mimeType: string;
  audioSeconds: number;
  audioBytes: number;
  totalMs: number;
  ok: boolean;
  error?: string;
}): Promise<void> {
  try {
    await SpeechLog.create({
      kind: 'stt',
      provider: entry.provider,
      language: entry.languageCode,
      mimeType: entry.mimeType,
      audioSeconds: entry.audioSeconds,
      audioBytes: entry.audioBytes,
      totalMs: entry.totalMs,
      ok: entry.ok,
      error: entry.error,
    });
  } catch {
    logger.warn(
      {
        kind: 'stt',
        provider: entry.provider,
        totalMs: entry.totalMs,
        ok: entry.ok,
      },
      'Failed to persist speech log',
    );
  }
}

function normalizeMimeType(mimeType: string): string {
  return mimeType.trim().toLowerCase();
}

function isSupportedSttMimeType(mimeType: string): boolean {
  return sarvamRestSttMimeTypes.includes(
    normalizeMimeType(mimeType) as (typeof sarvamRestSttMimeTypes)[number],
  );
}

async function readAudioDurationSeconds(audio: Buffer, mimeType: string): Promise<number> {
  try {
    const metadata = await parseBuffer(audio, {
      mimeType,
      size: audio.length,
    });

    const durationSeconds = metadata.format.duration;

    if (!durationSeconds || !Number.isFinite(durationSeconds) || durationSeconds <= 0) {
      throw new ApiError(400, 'Unable to determine audio duration');
    }

    return durationSeconds;
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }

    throw new ApiError(400, 'Unable to determine audio duration');
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

    await writeTtsSpeechLog({
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

    logger.info(
      {
        kind: 'tts',
        provider: providerName,
        totalMs,
        durationMs: output.durationMs ?? null,
      },
      'Speech provider call completed',
    );

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
    const apiError = toTtsApiError(error);

    await writeTtsSpeechLog({
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

    logger.warn(
      {
        kind: 'tts',
        provider: providerName,
        totalMs,
        durationMs: null,
        statusCode: apiError.statusCode,
      },
      'Speech provider call failed',
    );

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

export async function transcribeSpeech(
  input: TranscribeSpeechInput,
): Promise<TranscribeSpeechResult> {
  if (input.audio.length === 0) {
    throw new ApiError(400, 'audio file is required');
  }

  const normalizedMimeType = normalizeMimeType(input.mimeType);

  if (!isSupportedSttMimeType(normalizedMimeType)) {
    throw new ApiError(400, 'Unsupported audio format for STT');
  }

  const durationSeconds = await readAudioDurationSeconds(input.audio, normalizedMimeType);

  if (durationSeconds > env.STT_MAX_DURATION_SECONDS) {
    throw new ApiError(
      400,
      `Sarvam STT REST supports up to ${env.STT_MAX_DURATION_SECONDS} seconds per request`,
    );
  }

  const providerName = resolveSttProviderName(input.provider);
  const provider = getSttProvider(providerName);
  const startedAt = Date.now();
  const languageCode = input.languageCode ?? 'unknown';

  try {
    const output = await provider.transcribe({
      audio: input.audio,
      mimeType: normalizedMimeType,
      languageCode,
    });

    const totalMs = Date.now() - startedAt;
    const resolvedDurationSeconds = output.durationSeconds ?? durationSeconds;

    await writeSttSpeechLog({
      provider: providerName,
      languageCode,
      mimeType: normalizedMimeType,
      audioSeconds: resolvedDurationSeconds,
      audioBytes: input.audio.length,
      totalMs,
      ok: true,
    });

    logger.info(
      {
        kind: 'stt',
        provider: providerName,
        totalMs,
        durationSeconds: resolvedDurationSeconds,
      },
      'Speech provider call completed',
    );

    return {
      text: output.text,
      languageCode: output.languageCode,
      provider: providerName,
      totalMs,
      durationSeconds: resolvedDurationSeconds,
    };
  } catch (error) {
    const totalMs = Date.now() - startedAt;
    const apiError = toSttApiError(error);

    await writeSttSpeechLog({
      provider: providerName,
      languageCode,
      mimeType: normalizedMimeType,
      audioSeconds: durationSeconds,
      audioBytes: input.audio.length,
      totalMs,
      ok: false,
      error: toShortErrorMessage(apiError.message),
    });

    logger.warn(
      {
        kind: 'stt',
        provider: providerName,
        totalMs,
        durationSeconds,
        statusCode: apiError.statusCode,
      },
      'Speech provider call failed',
    );

    throw apiError;
  }
}
