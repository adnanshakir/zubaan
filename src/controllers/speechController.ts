import type { RequestHandler } from 'express';
import { synthesizeSpeechToStoredAudio } from '../services/speechService.js';
import type { SpeechTtsInput } from '../validators/speechValidator.js';

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
  });
};
