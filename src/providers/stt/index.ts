import { env } from '../../config/env.js';
import { sarvamSttProvider } from './sarvam.js';

export const sttProviderNames = ['sarvam'] as const;
export const sttAllowedMimeTypes = [
  'audio/mpeg',
  'audio/mp3',
  'audio/mpeg3',
  'audio/x-mpeg-3',
  'audio/x-mp3',
  'audio/wav',
  'audio/x-wav',
  'audio/wave',
  'audio/aac',
  'audio/x-aac',
  'audio/aiff',
  'audio/x-aiff',
  'audio/ogg',
  'audio/opus',
  'audio/flac',
  'audio/x-flac',
  'audio/mp4',
  'audio/x-m4a',
  'audio/amr',
  'audio/x-ms-wma',
  'audio/webm',
  'audio/pcm_s16le',
  'audio/pcm_l16',
  'audio/pcm_raw',
] as const;

export type SttSupportedMimeType = (typeof sttAllowedMimeTypes)[number];

const MIME_TYPE_PATTERN = /^[!#$%&'*+.^_`|~0-9a-z-]+\/[!#$%&'*+.^_`|~0-9a-z-]+$/;

/** Browser uploads often add codec parameters, which are not part of the media type. */
export function normalizeMimeType(raw: string | undefined): string | null {
  const mimeType = raw?.split(';', 1)[0]?.trim().toLowerCase();

  return mimeType && MIME_TYPE_PATTERN.test(mimeType) ? mimeType : null;
}

export function isSupportedSttMimeType(mimeType: string | null): mimeType is SttSupportedMimeType {
  return mimeType !== null && (sttAllowedMimeTypes as readonly string[]).includes(mimeType);
}

export const sttLanguageCodes = [
  'unknown',
  'hi-IN',
  'bn-IN',
  'kn-IN',
  'ml-IN',
  'mr-IN',
  'od-IN',
  'pa-IN',
  'ta-IN',
  'te-IN',
  'en-IN',
  'gu-IN',
  'as-IN',
  'ur-IN',
  'ne-IN',
  'kok-IN',
  'ks-IN',
  'sd-IN',
  'sa-IN',
  'sat-IN',
  'mni-IN',
  'brx-IN',
  'mai-IN',
  'doi-IN',
] as const;

export type SttProviderName = (typeof sttProviderNames)[number];
export type SttLanguageCode = (typeof sttLanguageCodes)[number];

export type SttTranscribeInput = {
  audio: Buffer;
  mimeType: SttSupportedMimeType;
  languageCode?: SttLanguageCode;
};

export type SttTranscribeResult = {
  text: string;
  languageCode: string | null;
  durationSeconds?: number;
  raw?: unknown;
};

export interface SttProvider {
  transcribe(input: SttTranscribeInput): Promise<SttTranscribeResult>;
}

export function resolveSttProviderName(name?: SttProviderName): SttProviderName {
  return name ?? env.STT_PROVIDER;
}

export function getSttProvider(name?: SttProviderName): SttProvider {
  switch (resolveSttProviderName(name)) {
    case 'sarvam':
      return sarvamSttProvider;
  }
}
