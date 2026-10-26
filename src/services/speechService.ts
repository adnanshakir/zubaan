import { parseBuffer } from 'music-metadata';
import { env, getSttDurationLimitMessage } from '../config/env.js';
import { SpeechLog } from '../models/SpeechLog.js';
import {
  getSttProvider,
  type SttSupportedMimeType,
  resolveSttProviderName,
  type SttLanguageCode,
  type SttMode,
  type SttProviderName,
} from '../providers/stt/index.js';
import {
  getTtsProvider,
  resolveTtsProviderName,
  type TtsLanguage,
  type TtsProviderName,
} from '../providers/tts/index.js';
import { KOKORO_DEFAULT_VOICE } from '../providers/tts/kokoro.js';
import { SARVAM_MODEL } from '../providers/tts/sarvam.js';
import { ApiError } from '../utils/ApiError.js';
import { buildAudioCacheName, findCachedAudio, saveAudioAs } from '../utils/audioStorage.js';
import { logger } from '../utils/logger.js';

const SARVAM_DEFAULT_VOICE = 'shubh';

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
  durationMs: number | null;
  cached: boolean;
};

export type TranscribeSpeechInput = {
  audio: Buffer;
  mimeType: SttSupportedMimeType;
  languageCode?: SttLanguageCode;
  provider?: SttProviderName;
  mode?: SttMode;
};

export type TranscribeSpeechResult = {
  text: string;
  languageCode: string | null;
  provider: SttProviderName;
  mode: SttMode;
  totalMs: number;
  durationSeconds: number | null;
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
  audioSeconds: number | null;
  audioBytes: number;
  mode?: SttMode;
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
      mode: entry.mode,
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

const RAW_PCM_MIME_TYPES = new Set(['audio/pcm_s16le', 'audio/pcm_l16', 'audio/pcm_raw']);

/** Sarvam requires raw PCM at 16 kHz, mono, 16-bit (signed LE). */
const PCM_SAMPLE_RATE = 16_000;
const PCM_CHANNELS = 1;
const PCM_BYTES_PER_SAMPLE = 2;

function isUsableDuration(value: number | undefined): value is number {
  return value !== undefined && Number.isFinite(value) && value > 0;
}

async function readParsedAudioDuration(
  audio: Buffer,
  mimeType: SttSupportedMimeType,
  fullScan: boolean,
): Promise<number | null> {
  try {
    const metadata = await parseBuffer(
      audio,
      { mimeType, size: audio.length },
      { duration: fullScan },
    );

    return isUsableDuration(metadata.format.duration) ? metadata.format.duration : null;
  } catch {
    return null;
  }
}

async function readAudioDurationSeconds(
  audio: Buffer,
  mimeType: SttSupportedMimeType,
): Promise<number | null> {
  if (RAW_PCM_MIME_TYPES.has(mimeType)) {
    const bytesPerSecond = PCM_SAMPLE_RATE * PCM_CHANNELS * PCM_BYTES_PER_SAMPLE;
    const durationSeconds = audio.length / bytesPerSecond;

    return isUsableDuration(durationSeconds) ? durationSeconds : null;
  }

  const durationSeconds = await readParsedAudioDuration(audio, mimeType, false);

  if (durationSeconds !== null || audio.length > env.STT_MAX_FILE_SIZE_BYTES) {
    return durationSeconds;
  }

  // MediaRecorder WebM blobs may omit header duration; scan the bounded buffer once before deferring to Sarvam.
  return readParsedAudioDuration(audio, mimeType, true);
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
  const providerName = resolveTtsProviderName(input.provider);
  const voice =
    input.voice ??
    (providerName === 'sarvam'
      ? (env.SARVAM_TTS_VOICE ?? SARVAM_DEFAULT_VOICE)
      : KOKORO_DEFAULT_VOICE);
  const pace = providerName === 'sarvam' ? (input.pace ?? env.SARVAM_TTS_PACE ?? null) : null;
  const model = providerName === 'sarvam' ? SARVAM_MODEL : 'kokoro';
  const fileName = buildAudioCacheName({
    provider: providerName,
    model,
    language: input.language,
    voice,
    pace,
    text: input.text,
  });
  const cachedAudioUrl = await findCachedAudio(fileName);
  const chars = input.text.length;

  if (cachedAudioUrl) {
    return {
      audioUrl: cachedAudioUrl,
      provider: providerName,
      voice,
      pace: pace ?? undefined,
      chars,
      totalMs: 0,
      durationMs: null,
      cached: true,
    };
  }

  const result = await synthesizeSpeech({
    ...input,
    provider: providerName,
    voice,
    pace: pace ?? undefined,
  });
  const audioUrl = await saveAudioAs(fileName, result.audio);

  return {
    audioUrl,
    provider: result.provider,
    voice,
    pace: pace ?? undefined,
    chars: result.chars,
    totalMs: result.totalMs,
    durationMs: result.durationMs ?? null,
    cached: false,
  };
}

export async function transcribeSpeech(
  input: TranscribeSpeechInput,
): Promise<TranscribeSpeechResult> {
  if (input.audio.length === 0) {
    throw new ApiError(400, 'audio file is required');
  }

  const durationSeconds = await readAudioDurationSeconds(input.audio, input.mimeType);

  if (durationSeconds !== null && durationSeconds > env.STT_MAX_DURATION_SECONDS) {
    throw new ApiError(400, getSttDurationLimitMessage());
  }

  const providerName = resolveSttProviderName(input.provider);
  const provider = getSttProvider(providerName);
  const startedAt = Date.now();
  const languageCode = input.languageCode ?? 'unknown';
  const requestedMode = input.mode ?? env.SARVAM_STT_MODE;

  try {
    const firstOutput = await provider.transcribe({
      audio: input.audio,
      mimeType: input.mimeType,
      languageCode,
      mode: requestedMode,
    });
    let output = firstOutput;
    let mode = requestedMode;

    if (
      languageCode.startsWith('en') &&
      requestedMode !== 'translit' &&
      /\p{L}/u.test(firstOutput.text) &&
      !/[A-Za-z]/.test(firstOutput.text)
    ) {
      logger.info(
        {
          kind: 'stt',
          provider: providerName,
          languageCode,
          fromMode: requestedMode,
          fallbackMode: 'translit',
        },
        'STT Latin-script fallback ran',
      );

      try {
        output = await provider.transcribe({
          audio: input.audio,
          mimeType: input.mimeType,
          languageCode,
          mode: 'translit',
        });
        mode = 'translit';
      } catch {
        output = firstOutput;
      }
    }

    const totalMs = Date.now() - startedAt;
    const resolvedDurationSeconds = isUsableDuration(output.durationSeconds)
      ? output.durationSeconds
      : durationSeconds;

    await writeSttSpeechLog({
      provider: providerName,
      languageCode,
      mimeType: input.mimeType,
      audioSeconds: resolvedDurationSeconds,
      audioBytes: input.audio.length,
      mode,
      totalMs,
      ok: true,
    });

    logger.info(
      {
        kind: 'stt',
        provider: providerName,
        languageCodeSent: languageCode,
        languageCodeReceived: output.languageCode,
        mode,
        totalMs,
        mimeType: input.mimeType,
        audioBytes: input.audio.length,
      },
      'Speech provider call completed',
    );

    return {
      text: output.text,
      languageCode: output.languageCode,
      provider: providerName,
      mode,
      totalMs,
      durationSeconds: resolvedDurationSeconds,
    };
  } catch (error) {
    const totalMs = Date.now() - startedAt;
    const apiError = toSttApiError(error);

    await writeSttSpeechLog({
      provider: providerName,
      languageCode,
      mimeType: input.mimeType,
      audioSeconds: durationSeconds,
      audioBytes: input.audio.length,
      mode: requestedMode,
      totalMs,
      ok: false,
      error: toShortErrorMessage(apiError.message),
    });

    logger.warn(
      {
        kind: 'stt',
        provider: providerName,
        totalMs,
        mimeType: input.mimeType,
        audioBytes: input.audio.length,
      },
      'Speech provider call failed',
    );

    throw apiError;
  }
}
