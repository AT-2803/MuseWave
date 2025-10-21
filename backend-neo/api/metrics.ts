import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getMetrics } from '../lib/metrics';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  const metrics = await getMetrics();
  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  res.status(200).send(metrics);
}