import { randomUUID } from 'node:crypto';
import { promises as fs } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawn } from 'node:child_process';
import type { ChildProcess } from 'node:child_process';
import ffmpegPath from 'ffmpeg-static';
import { env } from '../config/env.js';
import { ApiError } from './ApiError.js';
import { logger } from './logger.js';
import { measureWav } from './wav-level.js';

const ffmpegExecutable = ffmpegPath as unknown as string | null;
const UNSUPPORTED_MESSAGE =
  'Unsupported audio format. Send WAV, M4A/AAC, MP3, OGG, WebM, FLAC, AMR or CAF.';
const UNREADABLE_MESSAGE = "We couldn't read that audio. Please record again.";

function detectAudioFormat(buffer: Buffer): string | null {
  if (
    buffer.length >= 12 &&
    buffer.toString('ascii', 0, 4) === 'RIFF' &&
    buffer.toString('ascii', 8, 12) === 'WAVE'
  ) {
    return 'wav';
  }
  if (buffer.length >= 2 && buffer[0] === 0xff && (buffer[1] === 0xf1 || buffer[1] === 0xf9)) {
    return 'aac';
  }
  if (
    (buffer.length >= 3 && buffer.toString('ascii', 0, 3) === 'ID3') ||
    (buffer.length >= 2 && buffer[0] === 0xff && (buffer[1] & 0xe0) === 0xe0)
  ) {
    return 'mp3';
  }
  if (buffer.length >= 8 && buffer.toString('ascii', 4, 8) === 'ftyp') {
    return 'mp4';
  }
  if (buffer.length >= 4 && buffer.toString('ascii', 0, 4) === 'OggS') {
    return 'ogg';
  }
  if (
    buffer.length >= 4 &&
    buffer[0] === 0x1a &&
    buffer[1] === 0x45 &&
    buffer[2] === 0xdf &&
    buffer[3] === 0xa3
  ) {
    return 'webm';
  }
  if (buffer.length >= 4 && buffer.toString('ascii', 0, 4) === 'fLaC') {
    return 'flac';
  }
  if (buffer.length >= 6 && buffer.toString('ascii', 0, 6) === '#!AMR') {
    return 'amr';
  }
  if (buffer.length >= 4 && buffer.toString('ascii', 0, 4) === 'caff') {
    return 'caf';
  }
  return null;
}

function isCanonicalWav(buffer: Buffer): boolean {
  const measured = measureWav(buffer);
  if (measured === null) {
    return false;
  }

  for (let offset = 12; offset + 8 <= buffer.length;) {
    const chunkId = buffer.toString('ascii', offset, offset + 4);
    const chunkSize = buffer.readUInt32LE(offset + 4);
    const chunkDataOffset = offset + 8;
    const chunkEnd = chunkDataOffset + chunkSize;
    if (chunkEnd > buffer.length) {
      return false;
    }

    if (chunkId === 'fmt ' && chunkSize >= 16) {
      return (
        buffer.readUInt16LE(chunkDataOffset) === 1 &&
        buffer.readUInt16LE(chunkDataOffset + 2) === 1 &&
        buffer.readUInt32LE(chunkDataOffset + 4) === 16_000 &&
        buffer.readUInt16LE(chunkDataOffset + 14) === 16
      );
    }

    offset = chunkEnd + (chunkSize % 2);
  }

  return false;
}

function runFfmpeg(inputPath: string, outputPath: string): Promise<void> {
  if (!ffmpegExecutable) {
    return Promise.reject(new Error('ffmpeg-static binary is unavailable'));
  }

  return new Promise((resolve, reject) => {
    const process: ChildProcess = spawn(
      ffmpegExecutable,
      [
        '-hide_banner',
        '-loglevel',
        'error',
        '-y',
        '-i',
        inputPath,
        '-ac',
        '1',
        '-ar',
        '16000',
        '-c:a',
        'pcm_s16le',
        '-f',
        'wav',
        outputPath,
      ],
      { shell: false },
    );
    let settled = false;
    const timeoutHandle = setTimeout(() => {
      process.kill();
      settled = true;
      reject(new Error('ffmpeg timed out'));
    }, 20_000);

    process.once('error', (error) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeoutHandle);
      reject(error);
    });
    process.once('close', (code) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeoutHandle);
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`ffmpeg exited with code ${code ?? 'unknown'}`));
      }
    });
  });
}

export async function normalizeAudio(
  buffer: Buffer,
): Promise<{ wav: Buffer; sourceFormat: string }> {
  const sourceFormat = detectAudioFormat(buffer);
  if (sourceFormat === null) {
    throw new ApiError(415, UNSUPPORTED_MESSAGE, 'UNSUPPORTED_AUDIO_FORMAT');
  }

  if (sourceFormat === 'wav' && isCanonicalWav(buffer)) {
    const measured = measureWav(buffer);
    if (measured !== null && measured.durationSec > env.STT_MAX_DURATION_SECONDS) {
      throw new ApiError(413, 'Audio exceeds the maximum duration.', 'AUDIO_TOO_LONG');
    }
    return { wav: buffer, sourceFormat };
  }

  const inputPath = join(tmpdir(), `${randomUUID()}.audio`);
  const outputPath = join(tmpdir(), `${randomUUID()}.wav`);
  const startedAt = Date.now();

  try {
    await fs.writeFile(inputPath, buffer);
    await runFfmpeg(inputPath, outputPath);
    const wav = await fs.readFile(outputPath);
    const measured = measureWav(wav);
    if (wav.length === 0 || measured === null) {
      throw new Error('ffmpeg produced an invalid WAV');
    }
    if (measured.durationSec > env.STT_MAX_DURATION_SECONDS) {
      throw new ApiError(413, 'Audio exceeds the maximum duration.', 'AUDIO_TOO_LONG');
    }
    return { wav, sourceFormat };
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    logger.warn(
      { format: sourceFormat, durationMs: Date.now() - startedAt },
      'Audio normalization failed',
    );
    throw new ApiError(422, UNREADABLE_MESSAGE, 'AUDIO_UNREADABLE');
  } finally {
    await Promise.allSettled([
      fs.rm(inputPath, { force: true }),
      fs.rm(outputPath, { force: true }),
    ]);
  }
}
