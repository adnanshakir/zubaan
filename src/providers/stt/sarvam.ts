import { z } from 'zod';
import { env } from '../../config/env.js';
import { ApiError } from '../../utils/ApiError.js';
import type { SttProvider } from './index.js';

const SARVAM_STT_URL = 'https://api.sarvam.ai/speech-to-text';
const SARVAM_STT_MODEL = 'saaras:v3';
const SARVAM_STT_MODE = 'verbatim';

const sarvamSttResponseSchema = z.object({
  transcript: z.string(),
  language_code: z.string().nullable().optional(),
});

function isAbortError(error: unknown): boolean {
  return error instanceof Error && error.name === 'AbortError';
}

function guessExtension(mimeType: string): string {
  if (mimeType === 'audio/wav' || mimeType === 'audio/x-wav' || mimeType === 'audio/wave') {
    return 'wav';
  }

  if (mimeType === 'audio/mpeg' || mimeType === 'audio/mp3' || mimeType === 'audio/x-mp3') {
    return 'mp3';
  }

  if (mimeType === 'audio/mp4' || mimeType === 'audio/x-m4a') {
    return 'm4a';
  }

  if (mimeType === 'audio/webm') {
    return 'webm';
  }

  if (mimeType === 'audio/flac' || mimeType === 'audio/x-flac') {
    return 'flac';
  }

  if (mimeType === 'audio/ogg' || mimeType === 'audio/opus') {
    return 'ogg';
  }

  if (mimeType === 'audio/aac' || mimeType === 'audio/x-aac') {
    return 'aac';
  }

  if (mimeType === 'audio/aiff' || mimeType === 'audio/x-aiff') {
    return 'aiff';
  }

  if (mimeType === 'audio/amr') {
    return 'amr';
  }

  if (mimeType === 'audio/x-ms-wma') {
    return 'wma';
  }

  if (
    mimeType === 'audio/pcm_s16le' ||
    mimeType === 'audio/pcm_l16' ||
    mimeType === 'audio/pcm_raw'
  ) {
    return 'pcm';
  }

  return 'audio';
}

function mapSarvamSttErrorStatus(status: number): ApiError {
  if (status === 429) {
    return new ApiError(429, 'STT provider rate limit exceeded');
  }

  if (status === 401 || status === 403) {
    return new ApiError(502, 'STT provider authentication failed');
  }

  if (status === 422) {
    return new ApiError(400, 'STT provider rejected audio input');
  }

  if (status >= 400 && status < 500) {
    return new ApiError(400, 'STT provider rejected the request');
  }

  if (status >= 500) {
    return new ApiError(502, 'STT provider request failed');
  }

  return new ApiError(502, 'STT provider request failed');
}

export const sarvamSttProvider: SttProvider = {
  async transcribe(input) {
    if (!env.SARVAM_API_KEY) {
      throw new ApiError(500, 'STT provider is not configured');
    }

    const form = new FormData();
    form.append(
      'file',
      new Blob([new Uint8Array(input.audio)], { type: input.mimeType }),
      `audio.${guessExtension(input.mimeType)}`,
    );
    form.append('model', SARVAM_STT_MODEL);
    form.append('mode', SARVAM_STT_MODE);
    form.append('language_code', input.languageCode ?? 'unknown');

    const controller = new AbortController();
    const timeoutHandle = setTimeout(() => {
      controller.abort();
    }, env.SARVAM_STT_TIMEOUT_MS);

    try {
      const response = await fetch(SARVAM_STT_URL, {
        method: 'POST',
        headers: {
          'api-subscription-key': env.SARVAM_API_KEY,
        },
        body: form,
        signal: controller.signal,
      });

      if (!response.ok) {
        throw mapSarvamSttErrorStatus(response.status);
      }

      const parsed = sarvamSttResponseSchema.safeParse(await response.json());

      if (!parsed.success) {
        throw new ApiError(502, 'STT provider request failed');
      }

      return {
        text: parsed.data.transcript,
        languageCode: parsed.data.language_code ?? null,
        raw: parsed.data,
      };
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }

      if (isAbortError(error)) {
        throw new ApiError(504, 'STT provider timed out');
      }

      throw new ApiError(502, 'STT provider request failed');
    } finally {
      clearTimeout(timeoutHandle);
    }
  },
};
