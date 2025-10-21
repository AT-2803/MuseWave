import type { VercelRequest, VercelResponse } from '@vercel/node';
import { seedApiKeys } from '../../lib/auth';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  try {
    await seedApiKeys();
    res.status(200).json({ message: 'API keys seeded' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to seed API keys' });
  }
}