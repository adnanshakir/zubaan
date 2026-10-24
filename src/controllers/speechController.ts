import type { RequestHandler } from 'express';
import { isSupportedSttMimeType } from '../providers/stt/index.js';
import { ApiError } from '../utils/ApiError.js';
import {
  synthesizeSpeechToStoredAudio,
  transcribeSpeech,
  type TranscribeSpeechInput,
} from '../services/speechService.js';
import type { SpeechSttInput, SpeechTtsInput } from '../validators/speechValidator.js';

export const synthesizeTts: RequestHandler = async (_req, res) => {
  const { body } = res.locals.validated as { body: SpeechTtsInput };
  const result = await synthesizeSpeechToStoredAudio(body);

  res.status(200).json({
    audioUrl: result.audioUrl,
    provider: result.provider,
    voice: result.voice ?? null,
    pace: result.pace ?? null,
    chars: result.chars,
    totalMs: result.totalMs,
    durationMs: result.durationMs,
    cached: result.cached,
  });
};

export const transcribeStt: RequestHandler = async (req, res) => {
  const { body } = res.locals.validated as { body: SpeechSttInput };

  if (!req.file) {
    throw new ApiError(400, 'audio file is required');
  }

  if (!isSupportedSttMimeType(req.file.mimetype)) {
    throw new ApiError(400, 'Unsupported audio format for STT');
  }

  const input: TranscribeSpeechInput = {
    audio: req.file.buffer,
    mimeType: req.file.mimetype,
    languageCode: body.language,
    provider: body.provider,
  };

  const result = await transcribeSpeech(input);

  res.status(200).json({
    text: result.text,
    languageCode: result.languageCode,
    provider: result.provider,
    totalMs: result.totalMs,
    durationSeconds: result.durationSeconds,
  });
};
