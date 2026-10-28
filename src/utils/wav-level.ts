export function measureWav(buffer: Buffer): { durationSec: number; peak: number } | null {
  if (
    buffer.length < 12 ||
    buffer.toString('ascii', 0, 4) !== 'RIFF' ||
    buffer.toString('ascii', 8, 12) !== 'WAVE'
  ) {
    return null;
  }

  let format: { channels: number; sampleRate: number } | null = null;
  let bitsPerSample: number | null = null;
  let dataOffset: number | null = null;
  let dataSize: number | null = null;

  for (let offset = 12; offset + 8 <= buffer.length;) {
    const chunkId = buffer.toString('ascii', offset, offset + 4);
    const chunkSize = buffer.readUInt32LE(offset + 4);
    const chunkDataOffset = offset + 8;
    const chunkEnd = chunkDataOffset + chunkSize;

    if (chunkEnd > buffer.length) return null;

    if (chunkId === 'fmt ' && chunkSize >= 16) {
      if (buffer.readUInt16LE(chunkDataOffset) !== 1) return null;
      format = {
        channels: buffer.readUInt16LE(chunkDataOffset + 2),
        sampleRate: buffer.readUInt32LE(chunkDataOffset + 4),
      };
      bitsPerSample = buffer.readUInt16LE(chunkDataOffset + 14);
    } else if (chunkId === 'data') {
      dataOffset = chunkDataOffset;
      dataSize = chunkSize;
    }

    offset = chunkEnd + (chunkSize % 2);
  }

  if (
    format === null ||
    bitsPerSample !== 16 ||
    format.channels === 0 ||
    format.sampleRate === 0 ||
    dataOffset === null ||
    dataSize === null
  ) {
    return null;
  }

  const frameSize = format.channels * 2;
  const sampleCount = Math.floor(dataSize / frameSize) * format.channels;
  let peak = 0;

  for (let offset = dataOffset; offset < dataOffset + sampleCount * 2; offset += 2) {
    peak = Math.max(peak, Math.abs(buffer.readInt16LE(offset)) / 32768);
  }

  return {
    durationSec: sampleCount / format.channels / format.sampleRate,
    peak,
  };
}
