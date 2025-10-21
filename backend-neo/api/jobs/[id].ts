import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getJob } from '../../lib/jobs';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  const { id } = req.query;
  if (typeof id !== 'string') {
    return res.status(400).json({ error: 'Invalid job ID' });
  }
  try {
    const job = await getJob(id);
    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }
    res.status(200).json(job);
  } catch (error) {
    res.status(500).json({ error: 'Failed to get job' });
  }
}