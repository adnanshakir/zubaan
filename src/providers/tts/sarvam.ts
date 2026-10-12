import { env } from '../../config/env.js';
import { ApiError } from '../../utils/ApiError.js';
import type { TtsLanguage, TtsProvider } from './index.js';

/**
 * Merge independently-decoded WAV buffers by stripping headers and
 * concatenating raw PCM data under a single corrected header.
 * Mirrors the approach used in `combineKokoroChunks`.
 */
function combineWavChunks(chunks: Buffer[]): Buffer {
  const firstChunk = chunks[0];

  if (!firstChunk || firstChunk.length <= 44) {
    throw new ApiError(502, 'TTS provider returned invalid audio');
  }

  if (chunks.length === 1) {
    return firstChunk;
  }

  const header = Buffer.from(firstChunk.subarray(0, 44));
  const pcmChunks = chunks.map((chunk) => chunk.subarray(44));
  const totalPcmBytes = pcmChunks.reduce((sum, chunk) => sum + chunk.length, 0);

  // RIFF chunk size = 36 + PCM data length
  header.writeUInt32LE(36 + totalPcmBytes, 4);
  // data sub-chunk size = PCM data length
  header.writeUInt32LE(totalPcmBytes, 40);

  return Buffer.concat([header, ...pcmChunks]);
}

type SarvamTtsSuccessResponse = {
  audios: string[];
};

const SARVAM_TTS_URL = 'https://api.sarvam.ai/text-to-speech';
const SARVAM_MAX_TTS_CHARS = 2500;
const SARVAM_MODEL = 'bulbul:v3';

const SARVAM_LANGUAGE_MAP: Record<TtsLanguage, string> = {
  'en-IN': 'en-IN',
  'hi-IN': 'hi-IN',
  'ta-IN': 'ta-IN',
  'te-IN': 'te-IN',
};

function isAbortError(error: unknown): boolean {
  return error instanceof Error && error.name === 'AbortError';
}

function isSarvamTtsSuccessResponse(value: unknown): value is SarvamTtsSuccessResponse {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  if (!('audios' in value) || !Array.isArray(value.audios) || value.audios.length === 0) {
    return false;
  }

  return value.audios.every((audio) => typeof audio === 'string' && audio.length > 0);
}

function mapSarvamTtsErrorStatus(status: number): ApiError {
  if (status === 429) {
    return new ApiError(429, 'TTS provider rate limit exceeded');
  }

  if (status === 401 || status === 403) {
    return new ApiError(502, 'TTS provider authentication failed');
  }

  if (status >= 400 && status < 500) {
    return new ApiError(400, 'TTS provider rejected the request');
  }

  if (status >= 500) {
    return new ApiError(502, 'TTS provider request failed');
  }

  return new ApiError(502, 'TTS provider request failed');
}

export const sarvamTtsProvider: TtsProvider = {
  async synthesize(input) {
    if (!env.SARVAM_API_KEY) {
      throw new ApiError(500, 'TTS provider is not configured');
    }

    if (input.text.length > SARVAM_MAX_TTS_CHARS) {
      throw new ApiError(400, 'Sarvam Bulbul v3 supports up to 2500 characters per request');
    }

    const controller = new AbortController();
    const timeoutHandle = setTimeout(() => {
      controller.abort();
    }, env.SARVAM_TTS_TIMEOUT_MS);

    try {
      const response = await fetch(SARVAM_TTS_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'api-subscription-key': env.SARVAM_API_KEY,
        },
        body: JSON.stringify({
          text: input.text,
          language_code: SARVAM_LANGUAGE_MAP[input.language],
          speaker: input.voice,
          pace: input.pace,
          model: SARVAM_MODEL,
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        throw mapSarvamTtsErrorStatus(response.status);
      }

      let payload: unknown;

      try {
        payload = (await response.json()) as unknown;
      } catch {
        throw new ApiError(502, 'TTS provider request failed');
      }

      if (!isSarvamTtsSuccessResponse(payload)) {
        throw new ApiError(502, 'TTS provider request failed');
      }

      const decodedChunks = payload.audios.map((b64) => {
        const buf = Buffer.from(b64, 'base64');

        if (buf.length <= 44) {
          throw new ApiError(502, 'TTS provider returned invalid audio');
        }

        return buf;
      });

      const audio = combineWavChunks(decodedChunks);

      return {
        audio,
        format: 'wav',
      };
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }

      if (isAbortError(error)) {
        throw new ApiError(504, 'TTS provider timed out');
      }

      throw new ApiError(502, 'TTS provider request failed');
    } finally {
      clearTimeout(timeoutHandle);
    }
  },
};
