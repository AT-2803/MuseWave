import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import crypto from 'crypto';
import { query } from './db';

export interface Asset {
  id: string;
  kind: string;
  mime: string;
  path: string;
  duration_sec?: number;
  meta?: any;
}

export function generateAssetPath(id: string, ext: string): string {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return join('assets', String(year), month, `${id}.${ext}`);
}

export async function saveAsset(kind: string, mime: string, data: Buffer, duration_sec?: number, meta?: any, jobId?: string): Promise<Asset> {
  const id = crypto.randomUUID();
  const ext = mime.split('/')[1] || 'bin';
  const path = generateAssetPath(id, ext);
  const fullPath = join(process.cwd(), 'public', path);
  await mkdir(join(process.cwd(), 'public', 'assets', String(new Date().getFullYear()), String(new Date().getMonth() + 1).padStart(2, '0')), { recursive: true });
  await writeFile(fullPath, data);
  const res = await query('INSERT INTO assets (id, kind, mime, path, duration_sec, meta, job_id) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *', [id, kind, mime, path, duration_sec, JSON.stringify(meta), jobId]);
  return res.rows[0];
}

export async function getAsset(id: string): Promise<Asset | null> {
  const res = await query('SELECT * FROM assets WHERE id = $1', [id]);
  return res.rows[0] || null;
}