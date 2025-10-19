import fs from 'fs/promises';
import path from 'path';
import { ulid } from 'ulid';
import { prisma } from '../db';
import { env } from '../env';

function ensureExtension(mime: string, provided?: string) {
  if (provided) return provided.startsWith('.') ? provided : `.${provided}`;
  if (mime.includes('json')) return '.json';
  if (mime.includes('wav')) return '.wav';
  if (mime.includes('mp4')) return '.mp4';
  if (mime.includes('srt')) return '.srt';
  return '.bin';
}

export async function saveAssetFromBuffer(options: {
  buffer: Buffer;
  mime: string;
  jobId: string;
  type: string;
  meta?: Record<string, unknown>;
  extension?: string;
  durationSec?: number;
}): Promise<{ id: string; path: string }> {
  if (env.USE_S3) {
    throw new Error('S3 storage not implemented yet');
  }

  const now = new Date();
  const year = String(now.getUTCFullYear());
  const month = String(now.getUTCMonth() + 1).padStart(2, '0');
  const baseDir = path.resolve(env.ASSETS_DIR ?? './assets', year, month);
  await fs.mkdir(baseDir, { recursive: true });

  const id = ulid();
  const ext = ensureExtension(options.mime, options.extension);
  const filePath = path.join(baseDir, `${id}${ext}`);
  await fs.writeFile(filePath, options.buffer);

  await prisma.asset.create({
    data: {
      id,
      jobId: options.jobId,
      type: options.type,
      url: `file://${filePath}`,
      size: options.buffer.length,
    },
  });

  return { id, path: filePath };
}
