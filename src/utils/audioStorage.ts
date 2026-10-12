import { randomUUID } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

const AUDIO_STORAGE_DIR = path.join(process.cwd(), 'storage', 'audio');

export function getAudioStorageDirPath(): string {
  return AUDIO_STORAGE_DIR;
}

export async function saveAudioToStorage(audio: Buffer, format: 'wav' | 'mp3'): Promise<string> {
  await mkdir(AUDIO_STORAGE_DIR, { recursive: true });

  const fileName = `${randomUUID()}.${format}`;
  const filePath = path.join(AUDIO_STORAGE_DIR, fileName);

  await writeFile(filePath, audio);

  return `/audio/${fileName}`;
}
