import { VercelRequest, VercelResponse } from '@vercel/node';
// import { PrismaClient } from '@prisma/client';

// const prisma = new PrismaClient();

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { prompt, duration, includeVideo } = req.body as any;

  if (!prompt || typeof prompt !== 'string' || prompt.length < 1) {
    return res.status(400).json({ error: 'Invalid prompt' });
  }

  if (!duration || typeof duration !== 'number' || duration < 1 || duration > 300) {
    return res.status(400).json({ error: 'Invalid duration' });
  }

  // Mock job creation for now
  const jobId = `job-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  // In real implementation, enqueue to queue
  // For now, return mock response

  res.status(200).json({
    jobId,
    status: 'pending',
  });
}
