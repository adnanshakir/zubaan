import { createHash, randomUUID } from 'node:crypto';
import { promises as fs } from 'node:fs';
import path from 'node:path';

const AUDIO_STORAGE_DIR = path.join(process.cwd(), 'storage', 'audio');
const AUDIO_CACHE_VERSION = 'v1';

export interface AudioCacheKeyInput {
  provider: string;
  model: string;
  language: string;
  voice: string;
  pace: number | null;
  text: string;
}

function audioUrlFor(fileName: string): string {
  return `/audio/${fileName}`;
}

export function buildAudioCacheName(input: AudioCacheKeyInput): string {
  const raw = JSON.stringify([
    AUDIO_CACHE_VERSION,
    input.provider,
    input.model,
    input.language,
    input.voice,
    input.pace,
    input.text,
  ]);

  return `${createHash('sha256').update(raw).digest('hex').slice(0, 40)}.wav`;
}

function isNotFound(error: unknown): boolean {
  return error instanceof Error && 'code' in error && error.code === 'ENOENT';
}

export async function findCachedAudio(fileName: string): Promise<string | null> {
  try {
    const stat = await fs.stat(path.join(AUDIO_STORAGE_DIR, fileName));
    return stat.isFile() && stat.size > 0 ? audioUrlFor(fileName) : null;
  } catch (error) {
    if (isNotFound(error)) {
      return null;
    }
    throw error;
  }
}

export async function saveAudioAs(fileName: string, audio: Buffer): Promise<string> {
  await fs.mkdir(AUDIO_STORAGE_DIR, { recursive: true });
  const finalPath = path.join(AUDIO_STORAGE_DIR, fileName);
  const tempPath = `${finalPath}.${randomUUID()}.tmp`;

  await fs.writeFile(tempPath, audio);
  await fs.rename(tempPath, finalPath);

  return audioUrlFor(fileName);
}

export function getAudioStorageDirPath(): string {
  return AUDIO_STORAGE_DIR;
}
