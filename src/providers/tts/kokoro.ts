import { env } from '../../config/env.js';
import { ApiError } from '../../utils/ApiError.js';
import type { TtsProvider } from './index.js';

export const KOKORO_DEFAULT_VOICE = 'af_heart';

type KokoroChunk = {
  index: number;
  audio: string;
};

type KokoroDone = {
  done: true;
};

type KokoroError = {
  error: string;
};

function isAbortError(error: unknown): boolean {
  return error instanceof Error && error.name === 'AbortError';
}

function parseChunkLine(line: string): KokoroChunk | KokoroDone | KokoroError {
  let parsed: unknown;

  try {
    parsed = JSON.parse(line) as unknown;
  } catch {
    throw new ApiError(502, 'TTS provider request failed');
  }

  if (typeof parsed !== 'object' || parsed === null) {
    throw new ApiError(502, 'TTS provider request failed');
  }

  if ('done' in parsed && parsed.done === true) {
    return { done: true };
  }

  if ('error' in parsed && typeof parsed.error === 'string') {
    return { error: parsed.error };
  }

  if (
    'index' in parsed &&
    typeof parsed.index === 'number' &&
    'audio' in parsed &&
    typeof parsed.audio === 'string'
  ) {
    return {
      index: parsed.index,
      audio: parsed.audio,
    };
  }

  throw new ApiError(502, 'TTS provider request failed');
}

function combineKokoroChunks(chunks: Buffer[]): Buffer {
  const firstChunk = chunks[0];

  if (!firstChunk || firstChunk.length <= 44) {
    throw new ApiError(502, 'TTS provider request failed');
  }

  const header = Buffer.from(firstChunk.subarray(0, 44));
  const pcmChunks = chunks.map((chunk) => chunk.subarray(44));
  const totalPcmBytes = pcmChunks.reduce((sum, chunk) => sum + chunk.length, 0);

  header.writeUInt32LE(36 + totalPcmBytes, 4);
  header.writeUInt32LE(totalPcmBytes, 40);

  return Buffer.concat([header, ...pcmChunks]);
}

async function readNdjsonWav(response: Response): Promise<Buffer> {
  if (!response.body) {
    throw new ApiError(502, 'TTS provider request failed');
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  const audioChunks: Buffer[] = [];
  let receivedDone = false;

  while (true) {
    const { done, value } = await reader.read();

    if (done) {
      break;
    }

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() ?? '';

    for (const line of lines) {
      const trimmed = line.trim();

      if (!trimmed) {
        continue;
      }

      const chunk = parseChunkLine(trimmed);

      if ('done' in chunk) {
        receivedDone = true;
        continue;
      }

      if ('error' in chunk) {
        throw new ApiError(502, 'TTS provider request failed');
      }

      const audio = Buffer.from(chunk.audio, 'base64');

      if (audio.length <= 44) {
        throw new ApiError(502, 'TTS provider request failed');
      }

      audioChunks.push(audio);
    }
  }

  const tail = buffer.trim();

  if (tail) {
    const chunk = parseChunkLine(tail);

    if ('error' in chunk) {
      throw new ApiError(502, 'TTS provider request failed');
    }

    if ('done' in chunk) {
      receivedDone = true;
    } else {
      const audio = Buffer.from(chunk.audio, 'base64');

      if (audio.length <= 44) {
        throw new ApiError(502, 'TTS provider request failed');
      }

      audioChunks.push(audio);
    }
  }

  if (audioChunks.length === 0 || !receivedDone) {
    throw new ApiError(502, 'TTS provider request failed');
  }

  return combineKokoroChunks(audioChunks);
}

export const kokoroTtsProvider: TtsProvider = {
  async synthesize(input) {
    if (input.language !== 'en-IN') {
      throw new ApiError(400, 'Kokoro supports English only');
    }

    const controller = new AbortController();
    const timeoutHandle = setTimeout(() => {
      controller.abort();
    }, env.KOKORO_TIMEOUT_MS);

    try {
      const response = await fetch(env.KOKORO_TTS_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: input.text,
          language: 'en',
          voice: input.voice ?? KOKORO_DEFAULT_VOICE,
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new ApiError(502, 'TTS provider request failed');
      }

      const audio = await readNdjsonWav(response);

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
