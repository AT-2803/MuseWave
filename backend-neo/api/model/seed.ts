import type { VercelRequest, VercelResponse } from '@vercel/node';
import { seedNgramModel } from '../../lib/model/markov';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  try {
    await seedNgramModel();
    res.status(200).json({ message: 'Model seeded' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to seed model' });
  }
}