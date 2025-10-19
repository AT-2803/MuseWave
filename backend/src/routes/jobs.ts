import { Router } from 'express';
import { prisma } from '../db';

export const jobsRouter = Router();

jobsRouter.get('/:id', async (req, res) => {
  const job = await prisma.job.findUnique({ where: { id: req.params.id } });
  if (!job) {
    return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Job not found' } });
  }
  res.json({
    id: job.id,
    type: job.type,
    status: job.status,
    attempts: job.attempts,
    error: job.error,
    result: job.result ? JSON.parse(job.result) : null,
    assetId: job.assetId,
  });
});
