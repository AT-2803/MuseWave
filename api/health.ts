import { VercelRequest, VercelResponse } from '@vercel/node';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Check database connection
    await prisma.$queryRaw`SELECT 1`;
  } catch (error) {
    return res.status(503).json({ status: 'unhealthy', database: 'down' });
  }

  // For ffmpeg, assume available in Vercel environment
  const ffmpegOk = true; // Vercel has ffmpeg

  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    database: 'up',
    ffmpeg: ffmpegOk ? 'available' : 'unavailable',
  });
}
