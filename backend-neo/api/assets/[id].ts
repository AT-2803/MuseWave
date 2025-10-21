import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getAsset } from '../../lib/assets';
import { readFile } from 'fs/promises';
import { join } from 'path';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  const { id } = req.query;
  if (typeof id !== 'string') {
    return res.status(400).json({ error: 'Invalid asset ID' });
  }
  try {
    const asset = await getAsset(id);
    if (!asset) {
      return res.status(404).json({ error: 'Asset not found' });
    }
    const filePath = join(process.cwd(), 'public', asset.path);
    const data = await readFile(filePath);
    res.setHeader('Content-Type', asset.mime);
    res.status(200).send(data);
  } catch (error) {
    res.status(500).json({ error: 'Failed to get asset' });
  }
}