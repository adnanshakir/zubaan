import { env } from '../../config/env.js';
import { ApiError } from '../../utils/ApiError.js';
import type { TtsLanguage, TtsProvider } from './index.js';

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

function isSarvamTtsSuccessResponse(value: unknown): value is SarvamTtsSuccessResponse {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  if (!('audios' in value) || !Array.isArray(value.audios) || value.audios.length === 0) {
    return false;
  }

  return value.audios.every((audio) => typeof audio === 'string' && audio.length > 0);
}

export const sarvamTtsProvider: TtsProvider = {
  async synthesize(input) {
    if (!env.SARVAM_API_KEY) {
      throw new ApiError(500, 'TTS provider is not configured');
    }

    if (input.text.length > SARVAM_MAX_TTS_CHARS) {
      throw new ApiError(400, 'Sarvam Bulbul v3 supports up to 2500 characters per request');
    }

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
    });

    if (!response.ok) {
      if (response.status === 429) {
        throw new ApiError(429, 'TTS provider rate limit exceeded');
      }

      if (response.status === 401 || response.status === 403) {
        throw new ApiError(502, 'TTS provider authentication failed');
      }

      throw new ApiError(502, 'TTS provider request failed');
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

    const audio = Buffer.from(payload.audios.join(''), 'base64');

    if (audio.length === 0) {
      throw new ApiError(502, 'TTS provider request failed');
    }

    return {
      audio,
      format: 'wav',
    };
  },
};
