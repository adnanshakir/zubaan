import { z } from 'zod';
import { env, getSttDurationLimitMessage } from '../../config/env.js';
import { ApiError } from '../../utils/ApiError.js';
import type { SttProvider, SttSupportedMimeType } from './index.js';

const SARVAM_STT_URL = 'https://api.sarvam.ai/speech-to-text';
const SARVAM_STT_MODEL = 'saaras:v3';
const sarvamSttResponseSchema = z.object({
  transcript: z.string(),
  language_code: z.string().nullable().optional(),
});

function isAbortError(error: unknown): boolean {
  return error instanceof Error && error.name === 'AbortError';
}

const fileExtensions: Record<SttSupportedMimeType, string> = {
  'audio/mpeg': 'mp3',
  'audio/mp3': 'mp3',
  'audio/mpeg3': 'mp3',
  'audio/x-mpeg-3': 'mp3',
  'audio/x-mp3': 'mp3',
  'audio/wav': 'wav',
  'audio/x-wav': 'wav',
  'audio/wave': 'wav',
  'audio/aac': 'aac',
  'audio/x-aac': 'aac',
  'audio/aiff': 'aiff',
  'audio/x-aiff': 'aiff',
  'audio/ogg': 'ogg',
  'audio/opus': 'opus',
  'audio/flac': 'flac',
  'audio/x-flac': 'flac',
  'audio/mp4': 'mp4',
  'audio/x-m4a': 'm4a',
  'audio/amr': 'amr',
  'audio/x-ms-wma': 'wma',
  'audio/webm': 'webm',
  'audio/pcm_s16le': 'pcm',
  'audio/pcm_l16': 'pcm',
  'audio/pcm_raw': 'pcm',
};

const RAW_PCM_CODEC_MAP: Partial<Record<SttSupportedMimeType, string>> = {
  'audio/pcm_s16le': 'pcm_s16le',
  'audio/pcm_l16': 'pcm_l16',
  'audio/pcm_raw': 'pcm_raw',
};

function getRawPcmCodec(mimeType: SttSupportedMimeType): string | undefined {
  return RAW_PCM_CODEC_MAP[mimeType];
}

function providerErrorText(error: unknown): string {
  if (typeof error === 'string') {
    return error;
  }

  if (error && typeof error === 'object') {
    return Object.values(error).map(providerErrorText).filter(Boolean).join(' ');
  }

  return '';
}

function mapSarvamSttErrorStatus(status: number, providerError?: unknown): ApiError {
  if (status === 429) {
    return new ApiError(429, 'STT provider rate limit exceeded');
  }

  if (status === 401 || status === 403) {
    return new ApiError(502, 'STT provider authentication failed');
  }

  if (status === 422) {
    const message = providerErrorText(providerError);
    if (
      /(duration|seconds?).*(exceed|limit|long|max|greater|over|above)|too long|longer than/i.test(
        message,
      )
    ) {
      return new ApiError(400, getSttDurationLimitMessage());
    }

    return new ApiError(400, 'Invalid audio input');
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
      `audio.${fileExtensions[input.mimeType]}`,
    );
    form.append('model', SARVAM_STT_MODEL);
    form.append('mode', input.mode);
    form.append('language_code', input.languageCode ?? 'unknown');

    const pcmCodec = getRawPcmCodec(input.mimeType);

    if (pcmCodec) {
      form.append('input_audio_codec', pcmCodec);
    }

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
        const responseBody = await response.text();
        let providerError: unknown = responseBody;
        try {
          providerError = responseBody ? JSON.parse(responseBody) : undefined;
        } catch (error) {
          if (!(error instanceof SyntaxError)) throw error;
        }
        throw mapSarvamSttErrorStatus(response.status, providerError);
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
